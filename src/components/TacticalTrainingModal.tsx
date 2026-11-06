import React, { useState } from 'react';
import { X, Target, Sword, Shield, Heart, User, Users, CheckCircle, Lock, Sparkles, Award, ArrowUpRight, Flame, Zap, Compass, Star } from 'lucide-react';
import { Character, Companion, BattleRole, SecondaryBattleRole, TrainerBranch } from '../types';
import { INITIAL_BASE } from '../constants';
import { getEffectiveBattleRole, getEffectiveSecondaryBattleRole, getTrainerBranchMultiplier, addTrainerExpToAssignedTrainers } from '../utils';
import { advanceGameTime } from '../services/gameTimeService';
import {
  SECONDARY_ROLE_INFOS,
  SECONDARY_ROLES_BY_PARENT,
  isAllRounderUnlocked,
  canTrainSecondaryRole,
  isSecondaryRoleUnlocked,
  getSecondaryRoleProficiency,
  getPrimaryRoleProficiency
} from '../services/roleBonusService';

import { ActivityProgressModal } from './ActivityProgressModal';

interface TacticalTrainingModalProps {
  character: Character;
  onClose: () => void;
  onUpdateCharacter: (updated: Character, logMessage?: string, dailyReport?: any) => void;
}

export const TacticalTrainingModal: React.FC<TacticalTrainingModalProps> = ({
  character,
  onClose,
  onUpdateCharacter,
}) => {
  // 후보 목록: 플레이어 + 동료
  const members = [
    { id: 'player', name: character.name, isPlayer: true, entity: character },
    ...character.companions.map(c => ({ id: c.id, name: c.name, isPlayer: false, entity: c }))
  ];

  const [selectedMemberId, setSelectedMemberId] = useState<string>('player');
  const [activeTab, setActiveTab] = useState<'primary' | 'secondary'>('primary');
  const [selectedParentRoleForSecondary, setSelectedParentRoleForSecondary] = useState<BattleRole>(BattleRole.DEALER);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // 로딩바 진행 모달 상태
  const [progressData, setProgressData] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    totalHours: number;
    activityType: 'tactical' | 'espionage' | 'patrol' | 'general';
    onComplete: () => void;
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 현재 선택된 멤버
  const currentMember = members.find(m => m.id === selectedMemberId) || members[0];
  const memberEntity = currentMember.entity;

  // 전술 훈련소 시설 레벨
  const tacticalFacilityLevel = character.base?.facilityLevels?.['tactical_training'] || 1;
  const efficiencyBonus = (tacticalFacilityLevel - 1) * 2; // 시설 레벨당 +2% 효율

  // 보유 자원
  const currentGold = character.money || 0;
  const currentFood = character.base?.resources?.food || 0;
  const currentManaCrystal = character.base?.resources?.manaCrystal || 0;

  // 훈련 과정 옵션
  const trainingOptions = [
    {
      id: 'basic',
      name: '기초 전술 훈련',
      reqLevel: 1,
      baseGain: 4,
      goldCost: 3000,
      foodCost: 15,
      manaCost: 0,
      timeHours: 2,
      color: 'from-amber-600/20 to-amber-950/40 border-amber-500/40'
    },
    {
      id: 'advanced',
      name: '심화 전술 훈련',
      reqLevel: 2,
      baseGain: 8,
      goldCost: 7000,
      foodCost: 25,
      manaCost: 1,
      timeHours: 4,
      color: 'from-blue-600/20 to-blue-950/40 border-blue-500/40'
    },
    {
      id: 'combat',
      name: '실전 몰입 훈련',
      reqLevel: 3,
      baseGain: 15,
      goldCost: 15000,
      foodCost: 40,
      manaCost: 3,
      timeHours: 6,
      color: 'from-purple-600/20 to-purple-950/40 border-purple-500/40'
    },
    {
      id: 'research',
      name: '전술 연구 특훈',
      reqLevel: 4,
      baseGain: 22,
      goldCost: 28000,
      foodCost: 60,
      manaCost: 5,
      timeHours: 8,
      color: 'from-indigo-600/20 to-indigo-950/40 border-indigo-500/40'
    },
    {
      id: 'master',
      name: '전술 마스터 아카데미',
      reqLevel: 5,
      baseGain: 30,
      goldCost: 45000,
      foodCost: 80,
      manaCost: 8,
      timeHours: 12,
      color: 'from-emerald-600/20 to-emerald-950/40 border-emerald-500/40'
    }
  ];

  // 1차 역할 메타데이터
  const roleInfos: { role: BattleRole; title: string; icon: any; color: string; bgBadge: string; desc: string; effectBadge: string }[] = [
    {
      role: BattleRole.DEALER,
      title: '딜러',
      icon: Sword,
      color: 'text-red-400 border-red-500/50',
      bgBadge: 'bg-red-950/60 text-red-300 border-red-700/50',
      desc: '주요 데미지 딜러 역할. 공격 타겟팅 확률 기본(3배 가중치).',
      effectBadge: '공격력 +8%, 명중률 +8%'
    },
    {
      role: BattleRole.TANKER,
      title: '탱커',
      icon: Shield,
      color: 'text-blue-400 border-blue-500/50',
      bgBadge: 'bg-blue-950/60 text-blue-300 border-blue-700/50',
      desc: '전열 도발 및 방어 역할. 적 공격 최우선 피격(6배 가중치).',
      effectBadge: '물리/마법 방어력 +10%'
    },
    {
      role: BattleRole.SUPPORTER,
      title: '서포터',
      icon: Heart,
      color: 'text-emerald-400 border-emerald-500/50',
      bgBadge: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50',
      desc: '아군 치료 및 보조 역할. 적 공격 후순위 타겟(1배 가중치).',
      effectBadge: '라운드당 MP 1% 회복'
    }
  ];

  // 1인당 하루 1회 전술 훈련 여부 체크
  const isMemberTrainedToday = (memberId: string) => {
    return (character.base?.dailyCounts?.[`tactical_train_${memberId}`] || 0) >= 1;
  };

  const hasCurrentMemberTrainedToday = isMemberTrainedToday(currentMember.id);

  // 올라운더 해금 여부
  const allRounderUnlocked = isAllRounderUnlocked(memberEntity);

  // 1차 전투역할 훈련 실행
  const executeTrainPrimary = (role: BattleRole, option: typeof trainingOptions[0]) => {
    const currentProf = getPrimaryRoleProficiency(memberEntity, role);
    const tacticalMult = getTrainerBranchMultiplier(character, TrainerBranch.TACTICAL);
    const gainBonus = Math.floor(option.baseGain * (1 + efficiencyBonus / 100) * tacticalMult);
    const newProf = Math.min(100, currentProf + gainBonus);
    const isUnlockedNow = currentProf < 100 && newProf >= 100;

    const updatedChar: Character = JSON.parse(JSON.stringify(character));
    if (!updatedChar.base) updatedChar.base = JSON.parse(JSON.stringify(INITIAL_BASE));
    if (!updatedChar.base.dailyCounts) updatedChar.base.dailyCounts = {};
    updatedChar.base.dailyCounts[`tactical_train_${currentMember.id}`] = (updatedChar.base.dailyCounts[`tactical_train_${currentMember.id}`] || 0) + 1;

    updatedChar.money -= option.goldCost;
    if (updatedChar.base?.resources) {
      updatedChar.base.resources.food = Math.max(0, (updatedChar.base.resources.food || 0) - option.foodCost);
      updatedChar.base.resources.manaCrystal = Math.max(0, (updatedChar.base.resources.manaCrystal || 0) - option.manaCost);
    }

    if (currentMember.isPlayer) {
      if (!updatedChar.roleProficiency) updatedChar.roleProficiency = {};
      updatedChar.roleProficiency[role] = newProf;
      if (!updatedChar.roleInactivityDays) updatedChar.roleInactivityDays = {};
      updatedChar.roleInactivityDays[role] = 0;
    } else {
      const idx = updatedChar.companions.findIndex(c => c.id === currentMember.id);
      if (idx !== -1) {
        if (!updatedChar.companions[idx].roleProficiency) updatedChar.companions[idx].roleProficiency = {};
        updatedChar.companions[idx].roleProficiency![role] = newProf;
        if (!updatedChar.companions[idx].roleInactivityDays) updatedChar.companions[idx].roleInactivityDays = {};
        updatedChar.companions[idx].roleInactivityDays![role] = 0;
      }
    }

    let finalChar = addTrainerExpToAssignedTrainers(updatedChar, 'tactical_training', 10);
    const trainMinutes = (option.timeHours || 2) * 60;
    const timeRes = advanceGameTime(finalChar, trainMinutes, { activityName: "전술 훈련" });
    finalChar = timeRes.updatedCharacter;

    const logMsg = `[전술 훈련소] ${currentMember.name}의 [${role}] 역할 숙련도 훈련 (+${option.timeHours || 2}시간 소요, ${currentProf} ➔ ${newProf}/100)${tacticalMult > 1 ? ' (전술 트레이너 보너스 적용)' : ''}`;
    onUpdateCharacter(finalChar, logMsg, timeRes.dailyReport);

    if (isUnlockedNow) {
      showToast(`🎉 ${currentMember.name}의 [${role}] 숙련도 100 달성! 이제 2차 세부 역할을 훈련할 수 있습니다.`, 'success');
    } else {
      showToast(`${currentMember.name}의 [${role}] 숙련도 +${newProf - currentProf} 증가! (+${option.timeHours || 2}시간 소요)`, 'info');
    }
  };

  const handleTrainPrimary = (role: BattleRole, option: typeof trainingOptions[0]) => {
    if (hasCurrentMemberTrainedToday) {
      showToast(`${currentMember.name}은(는) 오늘 이미 전술 훈련을 완료했습니다. (하루 1회 제한)`, 'error');
      return;
    }
    if (tacticalFacilityLevel < option.reqLevel) {
      showToast(`이 훈련 과정은 전술 훈련소 Lv.${option.reqLevel} 이상이 필요합니다. (현재: Lv.${tacticalFacilityLevel})`, 'error');
      return;
    }
    if (currentGold < option.goldCost) {
      showToast(`골드가 부족합니다! (필요: ${option.goldCost.toLocaleString()}G)`, 'error');
      return;
    }
    if (currentFood < option.foodCost) {
      showToast(`식량이 부족합니다! (필요: ${option.foodCost})`, 'error');
      return;
    }
    if (currentManaCrystal < option.manaCost) {
      showToast(`마정석이 부족합니다! (필요: ${option.manaCost})`, 'error');
      return;
    }

    const currentProf = getPrimaryRoleProficiency(memberEntity, role);
    if (currentProf >= 100) {
      showToast('이미 이 1차 역할의 숙련도가 100(최대치)입니다.', 'info');
      return;
    }

    setProgressData({
      isOpen: true,
      title: `${currentMember.name} [${role}] 전술 훈련`,
      subtitle: `${option.name} (${option.timeHours}시간 과정) 수행 중입니다.`,
      totalHours: option.timeHours,
      activityType: 'tactical',
      onComplete: () => {
        setProgressData(null);
        executeTrainPrimary(role, option);
      }
    });
  };

  // 2차 전투역할 훈련 실행
  const executeTrainSecondary = (secondaryRole: SecondaryBattleRole, option: typeof trainingOptions[0]) => {
    const info = SECONDARY_ROLE_INFOS[secondaryRole];
    if (!info) return;

    const currentProf = getSecondaryRoleProficiency(memberEntity, secondaryRole);
    const tacticalMult = getTrainerBranchMultiplier(character, TrainerBranch.TACTICAL);
    const gainBonus = Math.max(1, Math.floor(option.baseGain * 0.5 * (1 + efficiencyBonus / 100) * tacticalMult));
    const newProf = Math.min(100, currentProf + gainBonus);
    const isUnlockedNow = currentProf < 100 && newProf >= 100;

    const updatedChar: Character = JSON.parse(JSON.stringify(character));
    if (!updatedChar.base) updatedChar.base = JSON.parse(JSON.stringify(INITIAL_BASE));
    if (!updatedChar.base.dailyCounts) updatedChar.base.dailyCounts = {};
    updatedChar.base.dailyCounts[`tactical_train_${currentMember.id}`] = (updatedChar.base.dailyCounts[`tactical_train_${currentMember.id}`] || 0) + 1;

    updatedChar.money -= option.goldCost;
    if (updatedChar.base?.resources) {
      updatedChar.base.resources.food = Math.max(0, (updatedChar.base.resources.food || 0) - option.foodCost);
      updatedChar.base.resources.manaCrystal = Math.max(0, (updatedChar.base.resources.manaCrystal || 0) - option.manaCost);
    }

    if (currentMember.isPlayer) {
      if (!updatedChar.secondaryRoleProficiency) updatedChar.secondaryRoleProficiency = {};
      updatedChar.secondaryRoleProficiency[secondaryRole] = newProf;
    } else {
      const idx = updatedChar.companions.findIndex(c => c.id === currentMember.id);
      if (idx !== -1) {
        if (!updatedChar.companions[idx].secondaryRoleProficiency) updatedChar.companions[idx].secondaryRoleProficiency = {};
        updatedChar.companions[idx].secondaryRoleProficiency![secondaryRole] = newProf;
      }
    }

    let finalChar = addTrainerExpToAssignedTrainers(updatedChar, 'tactical_training', 12);
    const trainMinutes = (option.timeHours || 2) * 60;
    const timeRes = advanceGameTime(finalChar, trainMinutes, { activityName: "2차 전술 훈련" });
    finalChar = timeRes.updatedCharacter;

    const logMsg = `[전술 훈련소] ${currentMember.name}의 2차 역할 [${info.title}] 숙련도 훈련 (+${option.timeHours || 2}시간 소요, ${currentProf} ➔ ${newProf}/100)`;
    onUpdateCharacter(finalChar, logMsg, timeRes.dailyReport);

    if (isUnlockedNow) {
      showToast(`🎉 ${currentMember.name}의 2차 역할 [${info.title}] 숙련도 100 달성! 전술 모달에서 장착할 수 있습니다.`, 'success');
    } else {
      showToast(`${currentMember.name}의 [${info.title}] 숙련도 +${newProf - currentProf} 증가! (+${option.timeHours || 2}시간 소요)`, 'info');
    }
  };

  const handleTrainSecondary = (secondaryRole: SecondaryBattleRole, option: typeof trainingOptions[0]) => {
    if (hasCurrentMemberTrainedToday) {
      showToast(`${currentMember.name}은(는) 오늘 이미 전술 훈련을 완료했습니다. (하루 1회 제한)`, 'error');
      return;
    }
    const info = SECONDARY_ROLE_INFOS[secondaryRole];
    if (!info) return;

    if (!canTrainSecondaryRole(memberEntity, secondaryRole)) {
      showToast(`2차 역할 [${info.title}]을(를) 훈련하려면 상위 1차 역할 [${info.parentRole}] 숙련도 100이 필요합니다.`, 'error');
      return;
    }

    if (tacticalFacilityLevel < option.reqLevel) {
      showToast(`이 훈련 과정은 전술 훈련소 Lv.${option.reqLevel} 이상이 필요합니다. (현재: Lv.${tacticalFacilityLevel})`, 'error');
      return;
    }
    if (currentGold < option.goldCost) {
      showToast(`골드가 부족합니다! (필요: ${option.goldCost.toLocaleString()}G)`, 'error');
      return;
    }
    if (currentFood < option.foodCost) {
      showToast(`식량이 부족합니다! (필요: ${option.foodCost})`, 'error');
      return;
    }
    if (currentManaCrystal < option.manaCost) {
      showToast(`마정석이 부족합니다! (필요: ${option.manaCost})`, 'error');
      return;
    }

    const currentProf = getSecondaryRoleProficiency(memberEntity, secondaryRole);
    if (currentProf >= 100) {
      showToast('이미 이 2차 역할의 숙련도가 100(최대치)입니다.', 'info');
      return;
    }

    setProgressData({
      isOpen: true,
      title: `${currentMember.name} [${info.title}] 2차 전술 훈련`,
      subtitle: `${option.name} (${option.timeHours}시간 과정) 수행 중입니다.`,
      totalHours: option.timeHours,
      activityType: 'tactical',
      onComplete: () => {
        setProgressData(null);
        executeTrainSecondary(secondaryRole, option);
      }
    });
  };

  // 1차 역할 직접 지정
  const handleSetRoleDirectly = (role: BattleRole) => {
    const updatedChar: Character = JSON.parse(JSON.stringify(character));
    if (currentMember.isPlayer) {
      updatedChar.battleRole = role;
      if (!updatedChar.roleInactivityDays) updatedChar.roleInactivityDays = {};
      updatedChar.roleInactivityDays[role] = 0;
      // 1차 역할과 호환되지 않는 2차 역할이면 리셋
      if (updatedChar.secondaryBattleRole) {
        const secInfo = SECONDARY_ROLE_INFOS[updatedChar.secondaryBattleRole];
        if (secInfo && secInfo.parentRole !== role && role !== BattleRole.ALLROUNDER) {
          updatedChar.secondaryBattleRole = SecondaryBattleRole.NONE;
        }
      }
    } else {
      const idx = updatedChar.companions.findIndex(c => c.id === currentMember.id);
      if (idx !== -1) {
        updatedChar.companions[idx].battleRole = role;
        if (!updatedChar.companions[idx].roleInactivityDays) {
          updatedChar.companions[idx].roleInactivityDays = {};
        }
        updatedChar.companions[idx].roleInactivityDays![role] = 0;
        if (updatedChar.companions[idx].secondaryBattleRole) {
          const secInfo = SECONDARY_ROLE_INFOS[updatedChar.companions[idx].secondaryBattleRole!];
          if (secInfo && secInfo.parentRole !== role && role !== BattleRole.ALLROUNDER) {
            updatedChar.companions[idx].secondaryBattleRole = SecondaryBattleRole.NONE;
          }
        }
      }
    }
    onUpdateCharacter(updatedChar, `[전술 훈련소] ${currentMember.name}의 전투 역할을 [${role}]로 설정하였습니다.`);
    showToast(`${currentMember.name}의 전투 역할이 [${role}]로 지정되었습니다!`, 'success');
  };

  // 2차 역할 직접 지정
  const handleSetSecondaryRoleDirectly = (secondaryRole: SecondaryBattleRole) => {
    const info = SECONDARY_ROLE_INFOS[secondaryRole];
    if (!info) return;

    if (secondaryRole !== SecondaryBattleRole.NONE && !isSecondaryRoleUnlocked(memberEntity, secondaryRole)) {
      showToast(`[${info.title}] 역할을 지정하려면 숙련도 100을 달성해야 합니다.`, 'error');
      return;
    }

    const updatedChar: Character = JSON.parse(JSON.stringify(character));
    if (currentMember.isPlayer) {
      updatedChar.secondaryBattleRole = secondaryRole;
      if (info.parentRole !== BattleRole.NONE) {
        updatedChar.battleRole = info.parentRole;
        if (!updatedChar.roleInactivityDays) updatedChar.roleInactivityDays = {};
        updatedChar.roleInactivityDays[info.parentRole] = 0;
      }
    } else {
      const idx = updatedChar.companions.findIndex(c => c.id === currentMember.id);
      if (idx !== -1) {
        updatedChar.companions[idx].secondaryBattleRole = secondaryRole;
        if (info.parentRole !== BattleRole.NONE) {
          updatedChar.companions[idx].battleRole = info.parentRole;
          if (!updatedChar.companions[idx].roleInactivityDays) {
            updatedChar.companions[idx].roleInactivityDays = {};
          }
          updatedChar.companions[idx].roleInactivityDays![info.parentRole] = 0;
        }
      }
    }

    const nameTxt = secondaryRole === SecondaryBattleRole.NONE ? '해제' : `[${info.title}] 지정`;
    onUpdateCharacter(updatedChar, `[전술 훈련소] ${currentMember.name}의 2차 전투 역할을 ${nameTxt}하였습니다.`);
    showToast(`${currentMember.name}의 2차 전투 역할이 [${info.title}]로 지정되었습니다!`, 'success');
  };

  // 올라운더 직접 지정
  const handleSetAllRounderDirectly = () => {
    if (!allRounderUnlocked) {
      showToast('올라운더는 딜러, 탱커, 서포터 숙련도가 모두 100이어야 설정할 수 있습니다.', 'error');
      return;
    }

    const updatedChar: Character = JSON.parse(JSON.stringify(character));
    if (currentMember.isPlayer) {
      updatedChar.battleRole = BattleRole.ALLROUNDER;
      updatedChar.secondaryBattleRole = SecondaryBattleRole.ALLROUNDER;
      if (!updatedChar.roleInactivityDays) updatedChar.roleInactivityDays = {};
      updatedChar.roleInactivityDays[BattleRole.DEALER] = 0;
      updatedChar.roleInactivityDays[BattleRole.TANKER] = 0;
      updatedChar.roleInactivityDays[BattleRole.SUPPORTER] = 0;
    } else {
      const idx = updatedChar.companions.findIndex(c => c.id === currentMember.id);
      if (idx !== -1) {
        updatedChar.companions[idx].battleRole = BattleRole.ALLROUNDER;
        updatedChar.companions[idx].secondaryBattleRole = SecondaryBattleRole.ALLROUNDER;
        if (!updatedChar.companions[idx].roleInactivityDays) {
          updatedChar.companions[idx].roleInactivityDays = {};
        }
        updatedChar.companions[idx].roleInactivityDays![BattleRole.DEALER] = 0;
        updatedChar.companions[idx].roleInactivityDays![BattleRole.TANKER] = 0;
        updatedChar.companions[idx].roleInactivityDays![BattleRole.SUPPORTER] = 0;
      }
    }
    onUpdateCharacter(updatedChar, `[전술 훈련소] ${currentMember.name}의 전투 역할을 [올라운더]로 설정하였습니다.`);
    showToast(`🌟 ${currentMember.name}의 전투 역할이 [올라운더]로 지정되었습니다!`, 'success');
  };

  const effectivePrimaryRole = getEffectiveBattleRole(memberEntity);
  const effectiveSecondaryRole = getEffectiveSecondaryBattleRole(memberEntity);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative text-slate-100 my-auto">
        
        {/* 토스트 알림 */}
        {toastMessage && (
          <div className={`absolute top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs sm:text-sm font-bold animate-in fade-in slide-in-from-top-2 backdrop-blur-md border ${
            toastMessage.type === 'success' ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500' :
            toastMessage.type === 'error' ? 'bg-red-950/90 text-red-200 border-red-500' :
            'bg-indigo-950/90 text-indigo-200 border-indigo-500'
          }`}>
            <Sparkles size={16} className="shrink-0 animate-spin" />
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* 헤더 */}
        <div className="p-3 sm:p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/40 text-amber-400">
              <Target size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-xl text-white">전술 훈련소</h3>
                <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded-full font-bold">
                  시설 Lv.{tacticalFacilityLevel}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                1차 전투 역할 및 세부 2차 역할을 100까지 연마하여 특화 효과를 획득합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 자원 및 상태 바 */}
        <div className="bg-slate-950 border-b border-slate-800/80 px-3 py-2 sm:px-5 sm:py-2.5 flex items-center justify-between text-xs text-slate-300 overflow-x-auto custom-scrollbar shrink-0 gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase flex items-center gap-1">
              <Flame size={12} className="text-amber-400" /> 보유 자원:
            </span>
            <span className="text-amber-300 font-bold">💰 {currentGold.toLocaleString()}G</span>
            <span className="text-emerald-400 font-bold">🌾 식량 {currentFood}</span>
            <span className="text-purple-400 font-bold">💎 마정석 {currentManaCrystal}</span>
          </div>
          {efficiencyBonus > 0 && (
            <span className="text-[10px] text-amber-400 bg-amber-950/50 border border-amber-800/60 px-2 py-0.5 rounded font-medium shrink-0">
              ⚡ 시설 효과: 훈련 효율 +{efficiencyBonus}%
            </span>
          )}
        </div>

        {/* 메인 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 custom-scrollbar bg-slate-950/40">
          
          {/* 캐릭터 선택 탭 */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 mb-2 uppercase flex items-center justify-between">
              <span>훈련 대상 파티원 선택</span>
              <span className="text-[10px] text-slate-500">클릭하여 전환</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {members.map((m) => {
                const isSelected = m.id === selectedMemberId;
                const trainedToday = isMemberTrainedToday(m.id);
                const role = getEffectiveBattleRole(m.entity);
                const secRole = getEffectiveSecondaryBattleRole(m.entity);
                const dealerProf = getPrimaryRoleProficiency(m.entity, BattleRole.DEALER);
                const tankerProf = getPrimaryRoleProficiency(m.entity, BattleRole.TANKER);
                const suppProf = getPrimaryRoleProficiency(m.entity, BattleRole.SUPPORTER);
                const isAllRound = isAllRounderUnlocked(m.entity);

                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMemberId(m.id)}
                    className={`flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl border min-w-[155px] sm:min-w-[185px] shrink-0 text-left transition-all relative ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-950/30'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${m.isPlayer ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                      {m.isPlayer ? <User size={16} /> : <Users size={16} />}
                    </div>
                    <div className="overflow-hidden min-w-0 flex-1">
                      <div className="font-bold text-xs text-white truncate flex items-center justify-between gap-1">
                        <span className="truncate">{m.name}</span>
                        {trainedToday ? (
                          <span className="text-[8px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-1 py-0.2 rounded shrink-0 font-bold">
                            ✓ 완료
                          </span>
                        ) : (
                          <span className="text-[8px] bg-slate-800 text-slate-400 border border-slate-700 px-1 py-0.2 rounded shrink-0 font-mono">
                            0/1회
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5 truncate flex items-center gap-1">
                        <span>역할:</span>
                        <span className={`font-bold ${
                          secRole !== SecondaryBattleRole.NONE ? 'text-amber-300' :
                          role === BattleRole.TANKER ? 'text-blue-400' :
                          role === BattleRole.DEALER ? 'text-red-400' :
                          role === BattleRole.SUPPORTER ? 'text-emerald-400' :
                          role === BattleRole.ALLROUNDER ? 'text-yellow-400' : 'text-slate-400'
                        }`}>
                          {secRole !== SecondaryBattleRole.NONE ? secRole : role}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[8px] font-mono text-slate-500 mt-0.5">
                        <span className={dealerProf >= 100 ? 'text-red-400 font-bold' : ''}>D:{dealerProf}</span>
                        <span className={tankerProf >= 100 ? 'text-blue-400 font-bold' : ''}>T:{tankerProf}</span>
                        <span className={suppProf >= 100 ? 'text-emerald-400 font-bold' : ''}>S:{suppProf}</span>
                        {isAllRound && <span className="text-yellow-400 font-bold">★올라운더</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 선택된 캐릭터 카드 및 역할 훈련 탭 전환 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">선택된 캐릭터</span>
                <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  {currentMember.name}
                  <span className="text-xs text-slate-400 font-mono">Lv.{(currentMember.entity as any).level || 1}</span>
                </h4>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400">현재 역할:</span>
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${
                    effectivePrimaryRole === BattleRole.ALLROUNDER ? 'bg-yellow-950 border-yellow-600 text-yellow-300' :
                    effectivePrimaryRole === BattleRole.TANKER ? 'bg-blue-950 border-blue-600 text-blue-300' :
                    effectivePrimaryRole === BattleRole.DEALER ? 'bg-red-950 border-red-600 text-red-300' :
                    effectivePrimaryRole === BattleRole.SUPPORTER ? 'bg-emerald-950 border-emerald-600 text-emerald-300' :
                    'bg-slate-950 border-slate-800 text-slate-400'
                  }`}>
                    {effectivePrimaryRole}
                  </span>
                  {effectiveSecondaryRole !== SecondaryBattleRole.NONE && (
                    <span className="px-2 py-0.5 rounded-lg text-xs font-bold border bg-purple-950 border-purple-600 text-purple-200">
                      2차: {effectiveSecondaryRole}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 올라운더 달성 특별 배너 */}
            {allRounderUnlocked && (
              <div className="mb-4 p-3 bg-gradient-to-r from-yellow-950/60 via-amber-900/40 to-yellow-950/60 border border-yellow-500/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-yellow-500/20 border border-yellow-500/40 rounded-lg text-yellow-300">
                    <Star size={20} className="animate-spin" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base text-yellow-200">올라운더 (모든 역할 숙련도 100 달성 완료)</span>
                      <span className="text-[10px] bg-yellow-950 text-yellow-300 border border-yellow-600 px-2 py-0.5 rounded-full font-bold">
                        만능 전투체제
                      </span>
                    </div>
                    <p className="text-xs text-yellow-300/80 mt-0.5">
                      공격력 +4%, 방어력 +4%, 명중률 +4%, 매 라운드 마나 0.5% 회복
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSetAllRounderDirectly}
                  className="px-3.5 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-md active:scale-95 shrink-0"
                >
                  {effectivePrimaryRole === BattleRole.ALLROUNDER ? '✓ 현재 지정됨' : '올라운더 지정하기'}
                </button>
              </div>
            )}

            {/* 훈련 단계 탭 (1차 기본 역할 / 2차 세부 특화 역할) */}
            <div className="flex border-b border-slate-800 mb-4 gap-2">
              <button
                onClick={() => setActiveTab('primary')}
                className={`pb-2 px-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                  activeTab === 'primary'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Compass size={14} />
                <span>1차 전투역할 훈련</span>
              </button>
              <button
                onClick={() => setActiveTab('secondary')}
                className={`pb-2 px-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                  activeTab === 'secondary'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap size={14} />
                <span>2차 세부역할 훈련</span>
              </button>
            </div>

            {/* 1차 전투역할 훈련 탭 */}
            {activeTab === 'primary' && (
              <div className="space-y-4">
                {roleInfos.map((info) => {
                  const IconComponent = info.icon;
                  const currentProf = getPrimaryRoleProficiency(memberEntity, info.role);
                  const isUnlocked = currentProf >= 100;
                  const isAssigned = (memberEntity as any).battleRole === info.role;
                  const inactiveDays = memberEntity.roleInactivityDays?.[info.role] || 0;

                  return (
                    <div key={info.role} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 sm:p-4 hover:border-slate-700 transition-all">
                      
                      {/* 카드 헤더 */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg border ${info.color} bg-slate-900`}>
                            <IconComponent size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm sm:text-base text-white">{info.title}</span>
                              <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-mono">
                                {info.effectBadge}
                              </span>
                              {isUnlocked ? (
                                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                  <CheckCircle size={10} /> 100 달성 완료 (2차 역할 해금)
                                </span>
                              ) : (
                                <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                  <Lock size={10} /> 훈련 필요 ({currentProf}/100)
                                </span>
                              )}
                              {inactiveDays >= 30 ? (
                                <span className="text-[10px] bg-red-950 text-red-300 border border-red-700 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                  ⚠️ 숙련도 감소 중 ({inactiveDays}일 미수행)
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{info.desc}</p>
                          </div>
                        </div>

                        {/* 해금 시 직접 지정 버튼 */}
                        {isUnlocked && (
                          <button
                            onClick={() => handleSetRoleDirectly(info.role)}
                            disabled={isAssigned}
                            className={`self-start sm:self-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              isAssigned
                                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-900/30 active:scale-95'
                            }`}
                          >
                            {isAssigned ? (
                              <span>현재 지정됨</span>
                            ) : (
                              <><ArrowUpRight size={14} /><span>이 역할 지정하기</span></>
                            )}
                          </button>
                        )}
                      </div>

                      {/* 숙련도 바 */}
                      <div className="my-2.5">
                        <div className="flex justify-between text-[11px] font-bold mb-1">
                          <span className="text-slate-400">1차 역할 숙련도</span>
                          <span className={isUnlocked ? 'text-emerald-400' : 'text-amber-400'}>
                            {currentProf} / 100 ({Math.min(100, currentProf)}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden p-0.5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isUnlocked
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                                : 'bg-gradient-to-r from-amber-500 to-orange-400'
                            }`}
                            style={{ width: `${Math.min(100, currentProf)}%` }}
                          />
                        </div>
                      </div>

                      {/* 훈련 과정 버튼 그리드 */}
                      {!isUnlocked ? (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">훈련 과정 선택</span>
                            <span className="text-[10px] text-amber-400 font-mono">
                              {hasCurrentMemberTrainedToday ? (
                                <span className="text-red-400 font-bold">오늘 훈련 완료 (하루 1회 제한)</span>
                              ) : (
                                '시설 레벨에 따라 훈련 해금 (하루 1회)'
                              )}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                            {trainingOptions.map((opt) => {
                              const isFacilityUnlocked = tacticalFacilityLevel >= opt.reqLevel;
                              const gainValue = Math.floor(opt.baseGain * (1 + efficiencyBonus / 100));
                              const canAfford = currentGold >= opt.goldCost && currentFood >= opt.foodCost && currentManaCrystal >= opt.manaCost;
                              const isUsable = isFacilityUnlocked && canAfford && !hasCurrentMemberTrainedToday;

                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => handleTrainPrimary(info.role, opt)}
                                  disabled={!isUsable}
                                  className={`flex flex-col justify-between min-h-[90px] p-2.5 rounded-xl border text-left transition-all ${
                                    hasCurrentMemberTrainedToday
                                      ? 'bg-slate-950/90 border-slate-800/80 opacity-50 cursor-not-allowed'
                                      : !isFacilityUnlocked
                                      ? 'bg-slate-950/90 border-slate-800/80 opacity-60 cursor-not-allowed'
                                      : canAfford
                                      ? `bg-gradient-to-br ${opt.color} hover:brightness-125 cursor-pointer shadow-sm active:scale-[0.98]`
                                      : 'bg-slate-900/60 border-slate-800/80 opacity-60 cursor-not-allowed'
                                  }`}
                                >
                                  <div>
                                    <div className="font-bold text-xs text-white flex items-center justify-between gap-1">
                                      <span className="truncate">{opt.name}</span>
                                      {isFacilityUnlocked ? (
                                        <span className="text-[10px] text-amber-300 font-mono shrink-0 font-bold">+{gainValue}</span>
                                      ) : (
                                        <span className="text-[9px] bg-slate-800 text-amber-400 border border-amber-800/50 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                                          <Lock size={9} /> Lv.{opt.reqLevel}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {isFacilityUnlocked ? (
                                    <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] space-y-0.5 font-mono">
                                      <div className={currentGold >= opt.goldCost ? 'text-amber-300' : 'text-red-400 font-bold'}>
                                        💰 {opt.goldCost.toLocaleString()}G
                                      </div>
                                      <div className="flex items-center justify-between text-[10px]">
                                        <div className="flex items-center gap-2">
                                          <span className={currentFood >= opt.foodCost ? 'text-emerald-400' : 'text-red-400 font-bold'}>
                                            🌾 {opt.foodCost}
                                          </span>
                                          {opt.manaCost > 0 && (
                                            <span className={currentManaCrystal >= opt.manaCost ? 'text-purple-400' : 'text-red-400 font-bold'}>
                                              💎 {opt.manaCost}
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-slate-400 font-medium">⏳ {opt.timeHours}시간</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-2 pt-2 border-t border-slate-800/60 text-[9px] text-slate-500 font-medium flex items-center gap-1">
                                      <Lock size={10} className="text-amber-500 shrink-0" />
                                      <span>시설 Lv.{opt.reqLevel} 필요</span>
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 p-2.5 bg-emerald-950/30 border border-emerald-900/40 rounded-xl text-xs text-emerald-300/90 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Award size={16} className="text-emerald-400 shrink-0" />
                            <span>1차 숙련도 100 달성 완료! 상단의 '2차 세부역할 훈련' 탭에서 특화 역할을 연마할 수 있습니다.</span>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedParentRoleForSecondary(info.role);
                              setActiveTab('secondary');
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs shrink-0 transition-all ml-2"
                          >
                            2차 훈련 이동
                          </button>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

            {/* 2차 세부역할 훈련 탭 */}
            {activeTab === 'secondary' && (
              <div className="space-y-4">
                <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-xl p-2.5 text-xs text-indigo-300/90 flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-400 shrink-0" />
                  <span>2차 세부 역할 훈련은 고난도 심화 수련이므로 숙련도 올리기에 더 많은 노력(획득량 50% 보정)과 시간(2~12시간)이 소요됩니다.</span>
                </div>
                
                {/* 상위 계열 선택 버튼 */}
                <div className="flex items-center gap-2 pb-2 overflow-x-auto custom-scrollbar">
                  {[BattleRole.DEALER, BattleRole.TANKER, BattleRole.SUPPORTER].map((pRole) => {
                    const prof = getPrimaryRoleProficiency(memberEntity, pRole);
                    const isParentUnlocked = prof >= 100;
                    const isSelected = selectedParentRoleForSecondary === pRole;

                    return (
                      <button
                        key={pRole}
                        onClick={() => setSelectedParentRoleForSecondary(pRole)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-900/80 border-indigo-400 text-white shadow-md'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{pRole} 계열</span>
                        {isParentUnlocked ? (
                          <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-700">해금됨</span>
                        ) : (
                          <span className="text-[9px] bg-amber-950 text-amber-400 px-1.5 py-0.2 rounded border border-amber-800 flex items-center gap-0.5">
                            <Lock size={8} /> {prof}/100
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 선택된 계열의 2차 역할 카드 목록 */}
                {(() => {
                  const parentProf = getPrimaryRoleProficiency(memberEntity, selectedParentRoleForSecondary);
                  const isParentUnlocked = parentProf >= 100;
                  const secRoles = SECONDARY_ROLES_BY_PARENT[selectedParentRoleForSecondary] || [];

                  if (!isParentUnlocked) {
                    return (
                      <div className="p-6 bg-slate-950/80 border border-amber-900/50 rounded-2xl text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-amber-950/80 border border-amber-700 flex items-center justify-center mx-auto text-amber-400">
                          <Lock size={24} />
                        </div>
                        <h5 className="font-bold text-white text-base">
                          {selectedParentRoleForSecondary} 1차 숙련도 100 달성 필요
                        </h5>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          2차 세부 전투역할은 상위 1차 역할의 기초가 완전히 확립(숙련도 100)되어야만 훈련을 개시할 수 있습니다.
                          (현재 숙련도: <span className="text-amber-400 font-bold">{parentProf}/100</span>)
                        </p>
                        <button
                          onClick={() => setActiveTab('primary')}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-all shadow-md inline-flex items-center gap-1.5"
                        >
                          1차 역할 훈련하러 가기
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {secRoles.map((secRole) => {
                        const info = SECONDARY_ROLE_INFOS[secRole];
                        const currentProf = getSecondaryRoleProficiency(memberEntity, secRole);
                        const isUnlocked = currentProf >= 100;
                        const isAssigned = (memberEntity as any).secondaryBattleRole === secRole;

                        return (
                          <div key={secRole} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 sm:p-4 hover:border-slate-700 transition-all">
                            
                            {/* 카드 상단 */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm sm:text-base text-white">{info.title}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${info.badgeBg}`}>
                                    {info.effects.join(' · ')}
                                  </span>
                                  {isUnlocked ? (
                                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                      <CheckCircle size={10} /> 마스터 (100/100)
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                      훈련 중 ({currentProf}/100)
                                    </span>
                                  )}
                                  {isAssigned && (
                                    <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-700 px-2 py-0.5 rounded-full font-bold">
                                      ★ 현재 장착 중
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">{info.desc}</p>
                              </div>

                              {/* 장착 버튼 */}
                              {isUnlocked && (
                                <button
                                  onClick={() => handleSetSecondaryRoleDirectly(secRole)}
                                  disabled={isAssigned}
                                  className={`self-start sm:self-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    isAssigned
                                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/30 active:scale-95'
                                  }`}
                                >
                                  {isAssigned ? (
                                    <span>현재 지정됨</span>
                                  ) : (
                                    <><ArrowUpRight size={14} /><span>이 2차 역할 지정</span></>
                                  )}
                                </button>
                              )}
                            </div>

                            {/* 숙련도 바 */}
                            <div className="my-2.5">
                              <div className="flex justify-between text-[11px] font-bold mb-1">
                                <span className="text-slate-400">2차 특화 숙련도</span>
                                <span className={isUnlocked ? 'text-emerald-400' : 'text-indigo-400'}>
                                  {currentProf} / 100 ({Math.min(100, currentProf)}%)
                                </span>
                              </div>
                              <div className="w-full h-2.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden p-0.5">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isUnlocked
                                      ? 'bg-gradient-to-r from-emerald-500 to-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                                      : 'bg-gradient-to-r from-indigo-500 to-purple-400'
                                  }`}
                                  style={{ width: `${Math.min(100, currentProf)}%` }}
                                />
                              </div>
                            </div>

                            {/* 훈련 과정 버튼 그리드 */}
                            {!isUnlocked ? (
                              <div className="mt-3">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">2차 특화 훈련 과정</span>
                                  <span className="text-[10px] text-amber-400 font-mono">
                                    {hasCurrentMemberTrainedToday ? (
                                      <span className="text-red-400 font-bold">오늘 훈련 완료 (하루 1회 제한)</span>
                                    ) : (
                                      '시설 레벨에 따라 해금 (하루 1회)'
                                    )}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                                  {trainingOptions.map((opt) => {
                                    const isFacilityUnlocked = tacticalFacilityLevel >= opt.reqLevel;
                                    const gainValue = Math.floor(opt.baseGain * (1 + efficiencyBonus / 100));
                                    const canAfford = currentGold >= opt.goldCost && currentFood >= opt.foodCost && currentManaCrystal >= opt.manaCost;
                                    const isUsable = isFacilityUnlocked && canAfford && !hasCurrentMemberTrainedToday;

                                    return (
                                      <button
                                        key={opt.id}
                                        onClick={() => handleTrainSecondary(secRole, opt)}
                                        disabled={!isUsable}
                                        className={`flex flex-col justify-between min-h-[90px] p-2.5 rounded-xl border text-left transition-all ${
                                          hasCurrentMemberTrainedToday
                                            ? 'bg-slate-950/90 border-slate-800/80 opacity-50 cursor-not-allowed'
                                            : !isFacilityUnlocked
                                            ? 'bg-slate-950/90 border-slate-800/80 opacity-60 cursor-not-allowed'
                                            : canAfford
                                            ? `bg-gradient-to-br ${opt.color} hover:brightness-125 cursor-pointer shadow-sm active:scale-[0.98]`
                                            : 'bg-slate-900/60 border-slate-800/80 opacity-60 cursor-not-allowed'
                                        }`}
                                      >
                                        <div>
                                          <div className="font-bold text-xs text-white flex items-center justify-between gap-1">
                                            <span className="truncate">{opt.name}</span>
                                            {isFacilityUnlocked ? (
                                              <span className="text-[10px] text-amber-300 font-mono shrink-0 font-bold">+{gainValue}</span>
                                            ) : (
                                              <span className="text-[9px] bg-slate-800 text-amber-400 border border-amber-800/50 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                                                <Lock size={9} /> Lv.{opt.reqLevel}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {isFacilityUnlocked ? (
                                          <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] space-y-0.5 font-mono">
                                            <div className={currentGold >= opt.goldCost ? 'text-amber-300' : 'text-red-400 font-bold'}>
                                              💰 {opt.goldCost.toLocaleString()}G
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className={currentFood >= opt.foodCost ? 'text-emerald-400' : 'text-red-400 font-bold'}>
                                                🌾 {opt.foodCost}
                                              </span>
                                              {opt.manaCost > 0 && (
                                                <span className={currentManaCrystal >= opt.manaCost ? 'text-purple-400' : 'text-red-400 font-bold'}>
                                                  💎 {opt.manaCost}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="mt-2 pt-2 border-t border-slate-800/60 text-[9px] text-slate-500 font-medium flex items-center gap-1">
                                            <Lock size={10} className="text-amber-500 shrink-0" />
                                            <span>시설 Lv.{opt.reqLevel} 필요</span>
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 p-2 bg-indigo-950/30 border border-indigo-900/40 rounded-xl text-xs text-indigo-300/90 flex items-center gap-2">
                                <Award size={16} className="text-indigo-400 shrink-0" />
                                <span>2차 세부 역할 숙련도가 100에 도달하여 마스터되었습니다. 전술 모달에서도 상시 지정 가능합니다.</span>
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

              </div>
            )}

          </div>

        </div>

        {/* 푸터 */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs shrink-0">
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div className="flex items-center gap-1.5 text-amber-300 font-medium">
              <Sparkles size={14} className="text-amber-400 shrink-0" />
              <span>1차 역할 숙련도 100 달성 시 2차 세부 역할 훈련이 해금되며, 전술 모달에서도 즉시 지정할 수 있습니다.</span>
            </div>
            <div className="text-[10px] text-slate-500 pl-5">
              ※ 모든 역할(딜러, 탱커, 서포터) 숙련도 100 달성 시 [올라운더] 역할이 해금됩니다.
            </div>
          </div>
        </div>

        {/* 진행 상황 로딩 모달 */}
        {progressData && (
          <ActivityProgressModal
            isOpen={progressData.isOpen}
            title={progressData.title}
            subtitle={progressData.subtitle}
            totalHours={progressData.totalHours}
            activityType={progressData.activityType}
            onComplete={progressData.onComplete}
          />
        )}

      </div>
    </div>
  );
};
