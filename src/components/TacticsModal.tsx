import React, { useState, useEffect, memo } from 'react';
import { X, ChevronDown, ChevronUp, Shield, Sword, Heart, Grid3X3, Users, User, AlertTriangle, Lock, Ban, Save, Download, Edit2, Zap, BarChart2 } from 'lucide-react';
import { Character, Companion, BattleRole, SecondaryBattleRole, BattlePosition, TacticalPreset, SkillType } from '../types';
import { getEffectiveBattleRole, getEffectiveSecondaryBattleRole, getEntityAllCombatSkills } from '../utils';
import { ensurePartyBattlePositions } from '../services/tacticsPositionService';
import { SECONDARY_ROLE_INFOS, SECONDARY_ROLES_BY_PARENT, isAllRounderUnlocked, getSecondaryRoleProficiency, getPrimaryRoleProficiency } from '../services/roleBonusService';
import { CombatEstimateModal } from './CombatEstimateModal';

interface TacticsModalProps {
  character: Character;
  onUpdateCharacter: (updated: Character) => void;
  onClose: () => void;
}

const TACTICS_SKILL_FOCUS_OPTIONS = [
  { id: 'POWER', label: '최고 위력 우선', icon: '⚡', desc: '파괴력이 가장 강력한 대표 스킬 발동' },
  { id: 'AOE', label: '광역 범위 우선', icon: '💥', desc: '적 전체 및 다수 타격 스킬 최우선 사용' },
  { id: 'SINGLE', label: '단일 일격 우선', icon: '🎯', desc: '보스 및 주요 적 집중 타격용 단일 스킬' },
  { id: 'BUFF_DEBUFF', label: '버프/디버프 우선', icon: '🛡️', desc: '아군 강화 및 적 약화 보조 스킬 우선' },
  { id: 'LOW_MP', label: 'MP 절약 (저코스트)', icon: '💧', desc: '마력 소모가 적은 저코스트 스킬 우선' },
  { id: 'SPECIFIC', label: '특정 지정 스킬', icon: '⭐', desc: '보유 스킬 중 원하는 단일 스킬 고정' },
];

const TacticsModal: React.FC<TacticsModalProps> = memo(({ character, onUpdateCharacter, onClose }) => {
  const [localCharacter, setLocalCharacter] = useState<Character>(() => ensurePartyBattlePositions(character));
  const [collapsedMembers, setCollapsedMembers] = useState<Record<string, boolean>>({});
  const [isEstimateModalOpen, setIsEstimateModalOpen] = useState<boolean>(false);
  
  const toggleCollapse = (id: string) => {
    setCollapsedMembers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('1');
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [tempRenameValue, setTempRenameValue] = useState<string>('');

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showWarning = (msg: string) => setToast({ message: msg, type: 'warning' });
  const showSuccess = (msg: string) => setToast({ message: msg, type: 'success' });

  const party = [
    { 
      id: 'player', 
      name: localCharacter.name + ' (자신)', 
      role: getEffectiveBattleRole(localCharacter), 
      secondaryRole: getEffectiveSecondaryBattleRole(localCharacter),
      rawRole: localCharacter.battleRole || BattleRole.NONE,
      rawSecondaryRole: localCharacter.secondaryBattleRole || SecondaryBattleRole.NONE,
      position: localCharacter.battlePosition || { row: 1, col: 1 }, 
      isPlayer: true,
      entity: localCharacter
    },
    ...localCharacter.companions.map((c, i) => ({
      id: c.id,
      name: c.name,
      role: getEffectiveBattleRole(c),
      secondaryRole: getEffectiveSecondaryBattleRole(c),
      rawRole: c.battleRole || BattleRole.NONE,
      rawSecondaryRole: c.secondaryBattleRole || SecondaryBattleRole.NONE,
      position: c.battlePosition || { row: 1, col: 1 },
      isPlayer: false,
      index: i,
      entity: c
    }))
  ];

  const updateRole = (memberId: string, role: BattleRole) => {
    const memberObj = party.find(m => m.id === memberId);
    const entity = memberObj?.entity;

    if (role !== BattleRole.NONE) {
      if (role === BattleRole.ALLROUNDER) {
        if (!isAllRounderUnlocked(entity)) {
          showWarning('올라운더를 설정하려면 모든 역할(딜러, 탱커, 서포터) 숙련도가 100이어야 합니다.');
          return;
        }
      } else {
        const prof = entity?.roleProficiency?.[role] || 0;
        if (prof < 100) {
          showWarning(`'${role}' 역할을 설정하려면 역할 숙련도 100을 달성해야 합니다. (현재: ${prof}/100) 기지 시설 '전술 훈련소'에서 훈련해 주세요.`);
          return;
        }
      }
    }

    if (memberId === 'player') {
      const updatedInactivity = { ...(localCharacter.roleInactivityDays || {}) };
      if (role !== BattleRole.NONE) {
        if (role === BattleRole.ALLROUNDER) {
          updatedInactivity[BattleRole.DEALER] = 0;
          updatedInactivity[BattleRole.TANKER] = 0;
          updatedInactivity[BattleRole.SUPPORTER] = 0;
        } else {
          updatedInactivity[role] = 0;
        }
      }
      let secRole = localCharacter.secondaryBattleRole;
      if (role === BattleRole.ALLROUNDER) {
        secRole = SecondaryBattleRole.ALLROUNDER;
      } else if (secRole && secRole !== SecondaryBattleRole.NONE) {
        const sInfo = SECONDARY_ROLE_INFOS[secRole];
        if (sInfo && sInfo.parentRole !== role) {
          secRole = SecondaryBattleRole.NONE;
        }
      }
      setLocalCharacter({ ...localCharacter, battleRole: role, secondaryBattleRole: secRole, roleInactivityDays: updatedInactivity });
      showSuccess(`[${role}] 역할로 지정되었습니다.`);
    } else {
      const newCompanions = [...localCharacter.companions];
      const idx = newCompanions.findIndex(c => c.id === memberId);
      if (idx !== -1) {
        const updatedInactivity = { ...(newCompanions[idx].roleInactivityDays || {}) };
        if (role !== BattleRole.NONE) {
          if (role === BattleRole.ALLROUNDER) {
            updatedInactivity[BattleRole.DEALER] = 0;
            updatedInactivity[BattleRole.TANKER] = 0;
            updatedInactivity[BattleRole.SUPPORTER] = 0;
          } else {
            updatedInactivity[role] = 0;
          }
        }
        let secRole = newCompanions[idx].secondaryBattleRole;
        if (role === BattleRole.ALLROUNDER) {
          secRole = SecondaryBattleRole.ALLROUNDER;
        } else if (secRole && secRole !== SecondaryBattleRole.NONE) {
          const sInfo = SECONDARY_ROLE_INFOS[secRole];
          if (sInfo && sInfo.parentRole !== role) {
            secRole = SecondaryBattleRole.NONE;
          }
        }
        newCompanions[idx].battleRole = role;
        newCompanions[idx].secondaryBattleRole = secRole;
        newCompanions[idx].roleInactivityDays = updatedInactivity;
        setLocalCharacter({ ...localCharacter, companions: newCompanions });
        showSuccess(`[${role}] 역할로 지정되었습니다.`);
      }
    }
  };

  const updateSecondaryRole = (memberId: string, secRole: SecondaryBattleRole) => {
    const memberObj = party.find(m => m.id === memberId);
    const entity = memberObj?.entity;

    if (secRole !== SecondaryBattleRole.NONE) {
      if (secRole === SecondaryBattleRole.ALLROUNDER) {
        if (!isAllRounderUnlocked(entity)) {
          showWarning('올라운더를 설정하려면 모든 역할(딜러, 탱커, 서포터) 숙련도가 100이어야 합니다.');
          return;
        }
      } else {
        const prof = entity?.secondaryRoleProficiency?.[secRole] || 0;
        if (prof < 100) {
          showWarning(`2차 역할 '${secRole}'을(를) 설정하려면 2차 숙련도 100을 달성해야 합니다. (현재: ${prof}/100) 전술 훈련소에서 연마해 주세요.`);
          return;
        }
      }
    }

    const sInfo = SECONDARY_ROLE_INFOS[secRole];
    if (memberId === 'player') {
      const updatedInactivity = { ...(localCharacter.roleInactivityDays || {}) };
      let newPrimary = localCharacter.battleRole;
      if (sInfo && sInfo.parentRole !== BattleRole.NONE) {
        newPrimary = sInfo.parentRole;
        updatedInactivity[newPrimary] = 0;
      }
      setLocalCharacter({
        ...localCharacter,
        battleRole: newPrimary,
        secondaryBattleRole: secRole,
        roleInactivityDays: updatedInactivity
      });
      showSuccess(secRole === SecondaryBattleRole.NONE ? '2차 역할이 해제되었습니다.' : `2차 역할이 [${sInfo.title}]로 지정되었습니다.`);
    } else {
      const newCompanions = [...localCharacter.companions];
      const idx = newCompanions.findIndex(c => c.id === memberId);
      if (idx !== -1) {
        const updatedInactivity = { ...(newCompanions[idx].roleInactivityDays || {}) };
        let newPrimary = newCompanions[idx].battleRole;
        if (sInfo && sInfo.parentRole !== BattleRole.NONE) {
          newPrimary = sInfo.parentRole;
          updatedInactivity[newPrimary] = 0;
        }
        newCompanions[idx].battleRole = newPrimary;
        newCompanions[idx].secondaryBattleRole = secRole;
        newCompanions[idx].roleInactivityDays = updatedInactivity;
        setLocalCharacter({ ...localCharacter, companions: newCompanions });
        showSuccess(secRole === SecondaryBattleRole.NONE ? '2차 역할이 해제되었습니다.' : `2차 역할이 [${sInfo.title}]로 지정되었습니다.`);
      }
    }
  };

  const updateTactics = (memberId: string, tactic: string) => {
    if (memberId === 'player') {
      setLocalCharacter({ ...localCharacter, currentTactics: tactic });
    } else {
      const newCompanions = [...localCharacter.companions];
      const idx = newCompanions.findIndex(c => c.id === memberId);
      if (idx !== -1) {
        newCompanions[idx].currentTactics = tactic;
        setLocalCharacter({ ...localCharacter, companions: newCompanions });
      }
    }
  };

  const updateSkillFocus = (memberId: string, focusMode: string) => {
    if (memberId === 'player') {
      setLocalCharacter({ ...localCharacter, tacticsSkillFocus: focusMode });
    } else {
      const newCompanions = [...localCharacter.companions];
      const idx = newCompanions.findIndex(c => c.id === memberId);
      if (idx !== -1) {
        newCompanions[idx].tacticsSkillFocus = focusMode;
        setLocalCharacter({ ...localCharacter, companions: newCompanions });
      }
    }
  };

  const updatePreferredSkill = (memberId: string, skillName: string) => {
    if (memberId === 'player') {
      setLocalCharacter({ ...localCharacter, preferredSkillName: skillName });
    } else {
      const newCompanions = [...localCharacter.companions];
      const idx = newCompanions.findIndex(c => c.id === memberId);
      if (idx !== -1) {
        newCompanions[idx].preferredSkillName = skillName;
        setLocalCharacter({ ...localCharacter, companions: newCompanions });
      }
    }
  };

  const updateTacticsThresholds = (memberId: string, hpThreshold?: number, mpThreshold?: number) => {
    if (memberId === 'player') {
      const updated: Character = { ...localCharacter };
      if (hpThreshold !== undefined) updated.tacticsHpThreshold = hpThreshold;
      if (mpThreshold !== undefined) updated.tacticsMpThreshold = mpThreshold;
      setLocalCharacter(updated);
    } else {
      const newCompanions = [...localCharacter.companions];
      const idx = newCompanions.findIndex(c => c.id === memberId);
      if (idx !== -1) {
        if (hpThreshold !== undefined) newCompanions[idx].tacticsHpThreshold = hpThreshold;
        if (mpThreshold !== undefined) newCompanions[idx].tacticsMpThreshold = mpThreshold;
        setLocalCharacter({ ...localCharacter, companions: newCompanions });
      }
    }
  };

  const updatePosition = (memberId: string, row: number, col: number) => {
    const targetPos: BattlePosition = { row, col };
    
    // 이미 해당 위치에 다른 파티원이 배치되어 있는지 확인
    const occupant = party.find(m => m.position.row === row && m.position.col === col);
    
    if (occupant) {
      if (occupant.id === memberId) {
        // 이미 본인이 배치된 자리
        return;
      }
      // 다른 파티원과 위치가 겹치는 경우 경고문구 출력 및 배치 차단
      showWarning("동일한 위치에 배치할수없습니다.");
      return;
    }

    // 빈 위치로 정상 이동
    setToast(null);
    if (memberId === 'player') {
      setLocalCharacter({ ...localCharacter, battlePosition: targetPos });
    } else {
      const newCompanions = [...localCharacter.companions];
      const idx = newCompanions.findIndex(c => c.id === memberId);
      if (idx !== -1) {
        newCompanions[idx].battlePosition = targetPos;
        setLocalCharacter({ ...localCharacter, companions: newCompanions });
      }
    }
  };

  const savePreset = (slotId: string, customName?: string) => {
    const playerSetup = {
      battleRole: localCharacter.battleRole || BattleRole.NONE,
      secondaryBattleRole: localCharacter.secondaryBattleRole || SecondaryBattleRole.NONE,
      battlePosition: localCharacter.battlePosition || { row: 1, col: 1 },
      currentTactics: localCharacter.currentTactics || "자유 행동",
      tacticsSkillFocus: localCharacter.tacticsSkillFocus || "POWER",
      preferredSkillName: localCharacter.preferredSkillName || "",
      tacticsHpThreshold: localCharacter.tacticsHpThreshold ?? 80,
      tacticsMpThreshold: localCharacter.tacticsMpThreshold ?? 50
    };

    const companionSetups = localCharacter.companions.map(c => ({
      id: c.id,
      name: c.name,
      battleRole: c.battleRole || BattleRole.NONE,
      secondaryBattleRole: c.secondaryBattleRole || SecondaryBattleRole.NONE,
      battlePosition: c.battlePosition || { row: 1, col: 1 },
      currentTactics: c.currentTactics || "자유 행동",
      tacticsSkillFocus: c.tacticsSkillFocus || "POWER",
      preferredSkillName: c.preferredSkillName || "",
      tacticsHpThreshold: c.tacticsHpThreshold ?? 80,
      tacticsMpThreshold: c.tacticsMpThreshold ?? 50
    }));

    const defaultName = `${slotId}전술`;
    const finalName = customName || localCharacter.tacticalPresets?.find(p => p.id === slotId)?.name || defaultName;

    const newPreset: TacticalPreset = {
      id: slotId,
      name: finalName,
      player: playerSetup,
      companions: companionSetups
    };

    const currentPresets = localCharacter.tacticalPresets ? [...localCharacter.tacticalPresets] : [];
    const existingIdx = currentPresets.findIndex(p => p.id === slotId);

    if (existingIdx !== -1) {
      currentPresets[existingIdx] = newPreset;
    } else {
      currentPresets.push(newPreset);
    }

    setLocalCharacter({
      ...localCharacter,
      tacticalPresets: currentPresets
    });

    showSuccess(`'${finalName}' 슬롯에 현재 전술 설정을 저장했습니다!`);
  };

  const loadPreset = (slotId: string) => {
    const preset = localCharacter.tacticalPresets?.find(p => p.id === slotId);
    if (!preset) {
      showWarning(`${slotId}전술 슬롯에 저장된 데이터가 없습니다.`);
      return;
    }

    // 1. 현재 고용 상태인 전체 동료 풀 확보 (현재 파티 참여 동료 + 대기 상태 동료)
    const currentPartyCompanions = localCharacter.companions || [];
    const currentInactiveCompanions = localCharacter.inactiveCompanions || [];
    const allMyCompanions = [...currentPartyCompanions, ...currentInactiveCompanions];

    // 2. 프리셋에 수록된 동료들 검증 및 배치 처리
    const presetCompanionSetups = preset.companions || [];
    const newCompanions: Companion[] = [];

    for (const pComp of presetCompanionSetups) {
      // 내 전체 대원 중에서 해당 아이디를 지닌 대원이 있는지 탐색
      const companionObj = allMyCompanions.find(c => c.id === pComp.id);
      if (!companionObj) {
        showWarning(`[${pComp.name}] 동료가 현재 고용 상태가 아니거나 존재하지 않아 전술을 불러올 수 없습니다.`);
        return;
      }

      // 업무(파견, 시설 임명 등)를 수행 중인지 정밀 체크
      const isDispatched = localCharacter.base?.dispatched?.some(d => d.companionId === pComp.id);
      const isAssigned = Object.values(localCharacter.base?.assignments || {}).includes(pComp.id);
      const isMultiAssigned = Object.values(localCharacter.base?.multiAssignments || {}).flat().includes(pComp.id);

      if (isDispatched || isAssigned || isMultiAssigned) {
        showWarning(`[${pComp.name}] 동료가 현재 파견 미션 또는 기지 시설 관리 업무 중이므로 배치할 수 없습니다.`);
        return;
      }

      // 전술 프리셋 정보에 맞추어 보강된 복제본을 생성하여 새 파티 리스트에 추가
      newCompanions.push({
        ...companionObj,
        battleRole: pComp.battleRole || BattleRole.NONE,
        secondaryBattleRole: pComp.secondaryBattleRole || SecondaryBattleRole.NONE,
        battlePosition: pComp.battlePosition || { row: 1, col: 1 },
        currentTactics: pComp.currentTactics || "자유 행동",
        tacticsSkillFocus: pComp.tacticsSkillFocus || "POWER",
        preferredSkillName: pComp.preferredSkillName || "",
        tacticsHpThreshold: pComp.tacticsHpThreshold ?? 80,
        tacticsMpThreshold: pComp.tacticsMpThreshold ?? 50
      });
    }

    // 3. 프리셋 목록에 포함되지 않은 기존 모든 동료들은 전부 대기 리스트(inactiveCompanions)로 교체 전입
    const presetCompanionIds = new Set(presetCompanionSetups.map(p => p.id));
    const newInactiveCompanions = allMyCompanions.filter(c => !presetCompanionIds.has(c.id));

    // 4. 최종 캐릭터의 프로퍼티 갱신
    let updatedCharacter = { ...localCharacter };
    
    if (preset.player) {
      updatedCharacter.battleRole = preset.player.battleRole || BattleRole.NONE;
      updatedCharacter.secondaryBattleRole = preset.player.secondaryBattleRole || SecondaryBattleRole.NONE;
      updatedCharacter.battlePosition = preset.player.battlePosition || { row: 1, col: 1 };
      updatedCharacter.currentTactics = preset.player.currentTactics || "자유 행동";
      updatedCharacter.tacticsSkillFocus = preset.player.tacticsSkillFocus || "POWER";
      updatedCharacter.preferredSkillName = preset.player.preferredSkillName || "";
      updatedCharacter.tacticsHpThreshold = preset.player.tacticsHpThreshold ?? 80;
      updatedCharacter.tacticsMpThreshold = preset.player.tacticsMpThreshold ?? 50;
    }

    updatedCharacter.companions = newCompanions;
    updatedCharacter.inactiveCompanions = newInactiveCompanions;

    setLocalCharacter(updatedCharacter);
    showSuccess(`'${preset.name}' 전술 및 파티 구성을 성공적으로 반영했습니다!`);
  };

  const renamePreset = (slotId: string, newName: string) => {
    if (!newName.trim()) return;
    const currentPresets = localCharacter.tacticalPresets ? [...localCharacter.tacticalPresets] : [];
    const existingIdx = currentPresets.findIndex(p => p.id === slotId);

    if (existingIdx !== -1) {
      currentPresets[existingIdx].name = newName;
      setLocalCharacter({
        ...localCharacter,
        tacticalPresets: currentPresets
      });
      showSuccess(`슬롯 이름을 '${newName}'(으)로 변경했습니다.`);
    } else {
      const emptyPreset: TacticalPreset = {
        id: slotId,
        name: newName,
        player: {
          battleRole: localCharacter.battleRole || BattleRole.NONE,
          secondaryBattleRole: localCharacter.secondaryBattleRole || SecondaryBattleRole.NONE,
          battlePosition: localCharacter.battlePosition || { row: 1, col: 1 },
          currentTactics: localCharacter.currentTactics || "자유 행동",
          tacticsSkillFocus: localCharacter.tacticsSkillFocus || "POWER",
          preferredSkillName: localCharacter.preferredSkillName || "",
          tacticsHpThreshold: localCharacter.tacticsHpThreshold ?? 80,
          tacticsMpThreshold: localCharacter.tacticsMpThreshold ?? 50
        },
        companions: localCharacter.companions.map(c => ({
          id: c.id,
          name: c.name,
          battleRole: c.battleRole || BattleRole.NONE,
          secondaryBattleRole: c.secondaryBattleRole || SecondaryBattleRole.NONE,
          battlePosition: c.battlePosition || { row: 1, col: 1 },
          currentTactics: c.currentTactics || "자유 행동",
          tacticsSkillFocus: c.tacticsSkillFocus || "POWER",
          preferredSkillName: c.preferredSkillName || "",
          tacticsHpThreshold: c.tacticsHpThreshold ?? 80,
          tacticsMpThreshold: c.tacticsMpThreshold ?? 50
        }))
      };
      currentPresets.push(emptyPreset);
      setLocalCharacter({
        ...localCharacter,
        tacticalPresets: currentPresets
      });
      showSuccess(`신규 슬롯을 생성하고 이름을 '${newName}'(으)로 설정했습니다.`);
    }
  };

  const tacticalOptions = ["공격 집중", "방어 유지", "힐/지원 집중", "스킬 제한", "스킬 위주", "자유 행동"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Toast Banner */}
        {toast && (
          <div className={`absolute top-16 left-1/2 -translate-x-1/2 z-50 border px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs sm:text-sm font-bold animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-md ${
            toast.type === 'success' 
              ? 'bg-emerald-950/95 border-emerald-500 text-emerald-200' 
              : 'bg-red-950/95 border-red-500 text-red-200'
          }`}>
            {toast.type === 'success' ? (
              <Shield size={18} className="text-emerald-400 shrink-0 animate-pulse" />
            ) : (
              <AlertTriangle size={18} className="text-red-400 shrink-0 animate-bounce" />
            )}
            <span>{toast.message}</span>
            <button 
              onClick={() => setToast(null)}
              className={`ml-2 p-0.5 rounded ${
                toast.type === 'success' ? 'hover:bg-emerald-900/50 text-emerald-400 hover:text-emerald-200' : 'hover:bg-red-900/50 text-red-400 hover:text-red-200'
              }`}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-indigo-500/20 rounded-lg">
              <Grid3X3 className="text-indigo-400" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-xl text-slate-100">전술 및 진형 설정</h3>
              <p className="text-[10px] sm:text-xs text-slate-400">파티원의 역할, 위치, 상세 전술을 구성합니다.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEstimateModalOpen(true)}
              className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md shadow-rose-950/40 transition-all border border-rose-400/40 active:scale-95"
              title="파티 및 스킬별 전투 피해량/회복량/버프 예상 분석"
            >
              <BarChart2 size={16} />
              <span>전투 예상 분석</span>
            </button>
            <button 
              onClick={onClose} 
              className="p-1.5 sm:p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 전술 슬롯 바 */}
        <div className="bg-slate-950/80 border-b border-slate-800/80 p-3 sm:px-6 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
              <Sword size={14} className="text-indigo-400" /> 전술 슬롯:
            </span>
            {['1', '2', '3', '4', '5'].map(slotId => {
              const preset = localCharacter.tacticalPresets?.find(p => p.id === slotId);
              const isSelected = selectedSlotId === slotId;
              const slotName = preset ? preset.name : `${slotId}전술`;
              const isSaved = !!preset;

              return (
                <button
                  key={slotId}
                  onClick={() => {
                    setSelectedSlotId(slotId);
                    setIsRenaming(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-b-2 border-indigo-400 shadow-md shadow-indigo-900/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{slotName}</span>
                  {isSaved && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-400 animate-pulse'}`} />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {isRenaming ? (
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700 w-full sm:w-auto">
                <input
                  type="text"
                  value={tempRenameValue}
                  onChange={(e) => setTempRenameValue(e.target.value)}
                  placeholder="슬롯 이름"
                  className="bg-transparent border-none text-slate-100 px-2 py-1 text-xs focus:ring-0 focus:outline-none w-28 font-semibold"
                  maxLength={10}
                />
                <button
                  onClick={() => {
                    renamePreset(selectedSlotId, tempRenameValue);
                    setIsRenaming(false);
                  }}
                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded"
                >
                  확인
                </button>
                <button
                  onClick={() => setIsRenaming(false)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] rounded"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  const preset = localCharacter.tacticalPresets?.find(p => p.id === selectedSlotId);
                  setTempRenameValue(preset ? preset.name : `${selectedSlotId}전술`);
                  setIsRenaming(true);
                }}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all"
              >
                <Edit2 size={12} />
                <span>이름 변경</span>
              </button>
            )}

            <button
              onClick={() => savePreset(selectedSlotId)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all shadow-md shadow-amber-950/20"
            >
              <Save size={12} />
              <span>현재 전술 저장</span>
            </button>

            <button
              onClick={() => loadPreset(selectedSlotId)}
              disabled={!localCharacter.tacticalPresets?.some(p => p.id === selectedSlotId)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all shadow-md shadow-emerald-950/20 disabled:shadow-none"
            >
              <Download size={12} />
              <span>전술 불러오기</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar bg-slate-950/30">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
            {/* Left: Member List */}
            <div className="space-y-4 sm:space-y-6">
              <h4 className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Users size={16} /> 파티 구성원 상세 설정
              </h4>
              <div className="space-y-4 sm:space-y-6">
                {party.map((member) => {
                  const compObj = localCharacter.companions.find(c => c.id === member.id);
                  const memberEntity = member.isPlayer ? localCharacter : compObj;
                  const currentTactic = member.isPlayer ? (localCharacter.currentTactics || "자유 행동") : (compObj?.currentTactics || "자유 행동");
                  const currentFocus = member.isPlayer ? (localCharacter.tacticsSkillFocus || "POWER") : (compObj?.tacticsSkillFocus || "POWER");
                  const currentPreferredSkill = member.isPlayer ? (localCharacter.preferredSkillName || "") : (compObj?.preferredSkillName || "");
                  const currentHpThreshold = member.isPlayer ? (localCharacter.tacticsHpThreshold ?? 80) : (compObj?.tacticsHpThreshold ?? 80);
                  const currentMpThreshold = member.isPlayer ? (localCharacter.tacticsMpThreshold ?? 50) : (compObj?.tacticsMpThreshold ?? 50);
                  const availableSkills = memberEntity ? getEntityAllCombatSkills(memberEntity).filter(s => s.type !== SkillType.PASSIVE) : [];

                  return (
                    <div key={member.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-5 transition-all hover:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`p-1.5 sm:p-2 rounded-lg ${member.isPlayer ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
                          {member.isPlayer ? <User size={18} /> : <Users size={18} />}
                        </div>
                        <span className="font-bold text-slate-100 text-sm sm:text-lg">{member.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono">POSITION</span>
                          <span className="text-[11px] sm:text-xs font-bold text-indigo-400">
                            {member.position.row === 0 ? '전열' : member.position.row === 1 ? '중열' : '후열'} - {member.position.col + 1}번 구역
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCollapse(member.id)}
                          className="p-1.5 text-slate-400 hover:text-white transition-colors bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-600"
                        >
                          {collapsedMembers[member.id] ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </button>
                      </div>
                    </div>

                    {!collapsedMembers[member.id] && (
                    <div className="space-y-4 sm:space-y-5">
                      {/* Battle Role */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block">전투 역할 (Role)</label>
                          <span className="text-[10px] text-amber-400 font-medium">※ 숙련도 100 달성 시 설정 가능</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2">
                          {(Object.values(BattleRole) as BattleRole[]).map((role) => {
                            const isNone = role === BattleRole.NONE;
                            const isAllRounder = role === BattleRole.ALLROUNDER;
                            const prof = isAllRounder 
                              ? (isAllRounderUnlocked(member.entity) ? 100 : Math.min(
                                  getPrimaryRoleProficiency(member.entity, BattleRole.DEALER),
                                  getPrimaryRoleProficiency(member.entity, BattleRole.TANKER),
                                  getPrimaryRoleProficiency(member.entity, BattleRole.SUPPORTER)
                                ))
                              : (member.entity?.roleProficiency?.[role] || 0);
                            const isUnlocked = isNone ? true : isAllRounder ? isAllRounderUnlocked(member.entity) : prof >= 100;
                            const isSelected = member.role === role;
                            const inactiveDays = member.entity?.roleInactivityDays?.[role] || 0;

                            return (
                              <button
                                key={role}
                                onClick={() => updateRole(member.id, role)}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-[10px] sm:text-xs font-medium transition-all relative ${
                                  isSelected
                                    ? role === BattleRole.TANKER ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/30' :
                                      role === BattleRole.DEALER ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-900/30' :
                                      role === BattleRole.SUPPORTER ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-900/30' :
                                      role === BattleRole.ALLROUNDER ? 'bg-yellow-600 border-yellow-400 text-white shadow-lg shadow-yellow-900/30' :
                                      'bg-slate-700 border-slate-500 text-slate-100 shadow-lg'
                                    : !isUnlocked
                                    ? 'bg-slate-950/80 border-slate-800/80 text-slate-600 hover:border-amber-500/50 hover:text-slate-400'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-1 font-bold">
                                  {role === BattleRole.TANKER && <Shield size={12} />}
                                  {role === BattleRole.DEALER && <Sword size={12} />}
                                  {role === BattleRole.SUPPORTER && <Heart size={12} />}
                                  {role === BattleRole.ALLROUNDER && <Zap size={12} />}
                                  {role === BattleRole.NONE && <Ban size={12} />}
                                  <span>{role}</span>
                                </div>
                                {!isNone && (
                                  <div className="mt-0.5 text-[8px] font-mono flex items-center gap-0.5">
                                    {isUnlocked ? (
                                      <span className={isSelected ? 'text-white/90 font-bold' : 'text-emerald-400'}>
                                        {isAllRounder ? '★해금완료' : `${prof}/100 🔓`}
                                        {inactiveDays >= 30 ? (
                                          <span className="text-red-400 ml-1 font-bold">⚠️하락중</span>
                                        ) : null}
                                      </span>
                                    ) : (
                                      <span className="text-amber-500 flex items-center gap-0.5">
                                        <Lock size={8} /> {isAllRounder ? '3종100필요' : `${prof}/100`}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2차 세부 특화 역할 선택 (해당 1차 역할이 선택된 경우) */}
                      {member.role !== BattleRole.NONE && (
                        <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                              <span>2차 세부 특화 역할</span>
                              <span className="text-[9px] text-indigo-400 font-normal">※ 2차 숙련도 100 달성 시 설정 가능</span>
                            </label>
                            {member.secondaryRole !== SecondaryBattleRole.NONE && (
                              <button
                                type="button"
                                onClick={() => updateSecondaryRole(member.id, SecondaryBattleRole.NONE)}
                                className="text-[9px] text-slate-400 hover:text-rose-400 underline"
                              >
                                2차 역할 해제
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {(SECONDARY_ROLES_BY_PARENT[member.role] || []).map((secRole) => {
                              const sInfo = SECONDARY_ROLE_INFOS[secRole];
                              const secProf = getSecondaryRoleProficiency(member.entity, secRole);
                              const isSecUnlocked = secRole === SecondaryBattleRole.ALLROUNDER 
                                ? isAllRounderUnlocked(member.entity) 
                                : secProf >= 100;
                              const isSecSelected = member.secondaryRole === secRole;

                              return (
                                <button
                                  key={secRole}
                                  type="button"
                                  onClick={() => updateSecondaryRole(member.id, secRole)}
                                  className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                                    isSecSelected
                                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-950/50'
                                      : !isSecUnlocked
                                      ? 'bg-slate-950/90 border-slate-900 text-slate-600 hover:border-slate-800'
                                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-[11px] truncate">{sInfo.title}</span>
                                    {isSecUnlocked ? (
                                      <span className={`text-[8px] font-mono px-1 rounded ${isSecSelected ? 'bg-indigo-800 text-white' : 'bg-emerald-950 text-emerald-300'}`}>
                                        100/100
                                      </span>
                                    ) : (
                                      <span className="text-[8px] font-mono text-amber-500 flex items-center gap-0.5">
                                        <Lock size={7} /> {secProf}/100
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9px] mt-1 text-slate-400 truncate">
                                    {sInfo.effects.join(', ')}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Tactical Instructions */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block">개별 전술 명령 (Tactics)</label>
                          {currentTactic === "스킬 위주" && (
                            <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                              <Zap size={12} className="animate-pulse" /> 세부 스킬 모드 활성화
                            </span>
                          )}
                          {currentTactic === "힐/지원 집중" && (
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                              <Heart size={12} className="animate-pulse" /> 회복 발동 임계치 설정됨
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                          {tacticalOptions.map(tactic => {
                            const isSelected = currentTactic === tactic || (tactic === "자유 행동" && !currentTactic);
                            return (
                              <button
                                key={tactic}
                                onClick={() => updateTactics(member.id, tactic)}
                                className={`text-[9px] sm:text-[10px] py-1.5 sm:py-2 rounded-lg border transition-all font-bold ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-900/20'
                                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-slate-200'
                                }`}
                              >
                                {tactic}
                              </button>
                            );
                          })}
                        </div>

                        {/* 힐/지원 집중 세부 설정 서브 패널 */}
                        {currentTactic === "힐/지원 집중" && (
                          <div className="mt-3 p-3 bg-emerald-950/40 border border-emerald-700/50 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-emerald-200 flex items-center gap-1.5">
                                <Heart size={14} className="text-emerald-400" /> 회복 스킬 발동 기준 설정
                              </span>
                              <span className="text-[9px] text-slate-400">아군 HP/MP 감소 시 자동 발동</span>
                            </div>

                            {/* HP 회복 임계치 */}
                            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-2">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-rose-300 flex items-center gap-1">
                                  <span>❤️</span> HP 회복 스킬 사용 기준
                                </span>
                                <span className="font-mono font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60">
                                  아군 HP {currentHpThreshold}% 이하 시
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min="10"
                                  max="95"
                                  step="5"
                                  value={currentHpThreshold}
                                  onChange={(e) => updateTacticsThresholds(member.id, parseInt(e.target.value), undefined)}
                                  className="flex-1 accent-rose-500 h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex gap-1 flex-wrap">
                                  {[30, 50, 70, 80, 90].map(val => (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => updateTacticsThresholds(member.id, val, undefined)}
                                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded border transition-all ${
                                        currentHpThreshold === val
                                          ? 'bg-rose-600 border-rose-400 text-white'
                                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                      }`}
                                    >
                                      {val}%
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <p className="text-[8.5px] text-slate-400">
                                자신 또는 아군 중 1명이라도 체력이 <span className="text-rose-300 font-bold">{currentHpThreshold}%</span> 이하로 떨어지면 HP 회복 스킬을 최우선으로 시전합니다.
                              </p>
                            </div>

                            {/* MP 회복 임계치 */}
                            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-2">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-sky-300 flex items-center gap-1">
                                  <span>💧</span> MP 회복 스킬 사용 기준
                                </span>
                                <span className="font-mono font-bold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60">
                                  아군 MP {currentMpThreshold}% 이하 시
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min="10"
                                  max="95"
                                  step="5"
                                  value={currentMpThreshold}
                                  onChange={(e) => updateTacticsThresholds(member.id, undefined, parseInt(e.target.value))}
                                  className="flex-1 accent-sky-500 h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex gap-1 flex-wrap">
                                  {[20, 30, 50, 70, 80].map(val => (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => updateTacticsThresholds(member.id, undefined, val)}
                                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded border transition-all ${
                                        currentMpThreshold === val
                                          ? 'bg-sky-600 border-sky-400 text-white'
                                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                      }`}
                                    >
                                      {val}%
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <p className="text-[8.5px] text-slate-400">
                                자신 또는 아군의 마나가 <span className="text-sky-300 font-bold">{currentMpThreshold}%</span> 이하로 떨어지면 MP 회복 스킬을 시전합니다.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* 스킬 위주 세부 설정 서브 패널 */}
                        {currentTactic === "스킬 위주" && (
                          <div className="mt-3 p-3 bg-indigo-950/40 border border-indigo-700/50 rounded-xl space-y-2.5 animate-in fade-in slide-in-from-top-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-indigo-200 flex items-center gap-1">
                                <Zap size={14} className="text-amber-400 animate-pulse" /> 스킬 활용 상황별 우선순위 설정
                              </span>
                              <span className="text-[9px] text-slate-400">전투 시 주력으로 사용할 스킬 성향</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                              {TACTICS_SKILL_FOCUS_OPTIONS.map((opt) => {
                                const isFocusSelected = (currentFocus || 'POWER') === opt.id;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => updateSkillFocus(member.id, opt.id)}
                                    className={`p-2 rounded-lg border text-left transition-all ${
                                      isFocusSelected
                                        ? 'bg-indigo-600 border-indigo-300 text-white shadow-md shadow-indigo-950/50 ring-1 ring-indigo-400/50'
                                        : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1 font-bold text-[10px] sm:text-[11px]">
                                      <span>{opt.icon}</span>
                                      <span>{opt.label}</span>
                                    </div>
                                    <p className="text-[8px] sm:text-[9px] text-slate-300/80 mt-0.5 leading-tight">{opt.desc}</p>
                                  </button>
                                );
                              })}
                            </div>

                            {/* SPECIFIC 지정 스킬 선택 서브 블록 */}
                            {currentFocus === 'SPECIFIC' && (
                              <div className="pt-2 border-t border-indigo-800/40 space-y-1.5">
                                <label className="text-[10px] font-bold text-amber-300 block">
                                  ⭐ 최우선 발동 지정 스킬 선택 (MP 충족 시 우선 발동)
                                </label>
                                {availableSkills.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1.5 bg-slate-900/80 rounded-lg border border-slate-800">
                                    {availableSkills.map((sk) => {
                                      const isChosen = currentPreferredSkill === sk.name;
                                      return (
                                        <button
                                          key={sk.name}
                                          type="button"
                                          onClick={() => updatePreferredSkill(member.id, sk.name)}
                                          className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 ${
                                            isChosen
                                              ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-md shadow-amber-950/40'
                                              : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-amber-400/80 hover:text-white'
                                          }`}
                                        >
                                          <span>{sk.name}</span>
                                          <span className="text-[8px] opacity-75 font-mono">({(sk.type === SkillType.PASSIVE || (sk.type as string) === '패시브') ? 0 : (sk.mpCost || 0)} MP)</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-amber-400/80 italic">사용 가능한 액티브 스킬이 없습니다.</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Position Selection (Mini) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">진형 위치 변경 (빈 칸 선택)</label>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-fit mx-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
                          {[0, 1, 2].map(r => (
                            [0, 1, 2].map(c => {
                              const isCurrent = member.position.row === r && member.position.col === c;
                              const otherOccupant = party.find(m => m.position.row === r && m.position.col === c && m.id !== member.id);

                              return (
                                <button
                                  key={`${r}-${c}`}
                                  onClick={() => updatePosition(member.id, r, c)}
                                  title={otherOccupant ? `${otherOccupant.name} 배치됨` : isCurrent ? '현재 위치' : '배치 가능'}
                                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg border-2 transition-all flex flex-col items-center justify-center relative ${
                                    isCurrent
                                      ? 'bg-indigo-500 border-indigo-300 shadow-lg shadow-indigo-900/40 scale-105 z-10 text-white'
                                      : otherOccupant
                                      ? 'bg-slate-900/90 border-slate-700/60 text-slate-500 opacity-60'
                                      : 'bg-slate-900 border-slate-800 hover:border-slate-500 text-slate-600 hover:text-slate-300'
                                  }`}
                                >
                                  <span className="text-[8px] font-bold">{r === 0 ? '전' : r === 1 ? '중' : '후'}{c + 1}</span>
                                  {otherOccupant && (
                                    <span className="text-[6px] text-amber-500 font-bold leading-none truncate max-w-[28px]">
                                      {otherOccupant.name.slice(0, 2)}
                                    </span>
                                  )}
                                </button>
                              );
                            })
                          ))}
                        </div>
                      </div>
                    </div>
                    )}
                  </div>
                );
              })}
              </div>
            </div>

            {/* Right: Formation Preview & Buff Info */}
            <div className="flex flex-col">
              <h4 className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 sm:mb-6 flex items-center gap-2">
                <Grid3X3 size={16} /> 파티 진형 프리뷰
              </h4>
              <div className="flex items-center justify-center mb-4 sm:mb-8">
                <div className="bg-slate-900/50 p-4 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-slate-800/50 shadow-inner relative max-w-full">
                  {/* Grid Labels */}
                  <div className="absolute -left-6 sm:-left-8 top-6 sm:top-10 bottom-6 sm:bottom-10 flex flex-col justify-between text-[9px] sm:text-[10px] font-bold text-slate-600">
                    <span className="bg-slate-800 px-1 py-0.5 rounded text-blue-400">전열</span>
                    <span className="bg-slate-800 px-1 py-0.5 rounded text-amber-400">중열</span>
                    <span className="bg-slate-800 px-1 py-0.5 rounded text-emerald-400">후열</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 sm:gap-5 w-60 h-60 sm:w-72 sm:h-72">
                    {[0, 1, 2].map(r => (
                      [0, 1, 2].map(c => {
                        const membersHere = party.filter(m => m.position.row === r && m.position.col === c);
                        return (
                          <div 
                            key={`${r}-${c}`} 
                            className={`rounded-xl sm:rounded-2xl border-2 flex flex-col items-center justify-center relative overflow-hidden group transition-all ${
                              r === 0 ? 'bg-blue-900/5 border-blue-900/20' :
                              r === 1 ? 'bg-amber-900/5 border-amber-900/20' :
                              'bg-emerald-900/5 border-emerald-900/20'
                            } hover:border-slate-500`}
                          >
                            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 p-1 sm:p-2">
                              {membersHere.map(m => (
                                <div 
                                  key={m.id}
                                  title={`${m.name} (${m.role})`}
                                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center shadow-xl transition-transform hover:scale-110 relative ${
                                    m.role === BattleRole.TANKER ? 'bg-blue-600/30 border-blue-500 text-blue-400' :
                                    m.role === BattleRole.DEALER ? 'bg-red-600/30 border-red-500 text-red-400' :
                                    'bg-emerald-600/30 border-emerald-500 text-emerald-400'
                                  }`}
                                >
                                  {m.isPlayer ? <User size={16} /> : <Users size={16} />}
                                  {/* Small indicator for tactical command */}
                                  {!m.isPlayer && (
                                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-slate-900 rounded-full border border-slate-700 flex items-center justify-center">
                                      <div className={`w-1.5 h-1.5 rounded-full ${
                                        m.role === BattleRole.TANKER ? 'bg-blue-500' :
                                        m.role === BattleRole.DEALER ? 'bg-red-500' : 'bg-emerald-500'
                                      }`} />
                                    </div>
                                  )}
                                </div>
                              ))}
                              {membersHere.length === 0 && (
                                <div className="text-[9px] sm:text-[10px] text-slate-800 font-bold opacity-20 uppercase">Empty</div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Buff & Targeting Info */}
              <div className="space-y-3 sm:space-y-4">
                <div className="p-3 sm:p-5 bg-slate-900/60 rounded-xl sm:rounded-2xl border border-slate-800">
                  <h5 className="text-[11px] sm:text-xs font-bold text-slate-300 mb-2 sm:mb-4 flex items-center gap-2">
                    <Shield size={14} className="text-indigo-400" /> 전투 역할별 특수 효과 (Role Buffs)
                  </h5>
                  <div className="grid grid-cols-1 gap-2 sm:gap-3">
                    <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 bg-red-900/10 rounded-xl border border-red-900/20">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 shrink-0 font-bold text-xs">딜러</div>
                      <div className="text-[10px] sm:text-[11px]">
                        <p className="text-red-300 font-bold mb-0.5">화력 및 명중 집중</p>
                        <p className="text-slate-400">보너스: <span className="text-red-400 font-bold">공격력 및 명중률 +8%</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 bg-blue-900/10 rounded-xl border border-blue-900/20">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 font-bold text-xs">탱커</div>
                      <div className="text-[10px] sm:text-[11px]">
                        <p className="text-blue-300 font-bold mb-0.5">방어 및 최전방 도발</p>
                        <p className="text-slate-400">보너스: <span className="text-blue-400 font-bold">물리방어력 및 마법방어력 +10%</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 bg-emerald-900/10 rounded-xl border border-emerald-900/20">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 font-bold text-xs">서포터</div>
                      <div className="text-[10px] sm:text-[11px]">
                        <p className="text-emerald-300 font-bold mb-0.5">아군 보조 및 마력 순환</p>
                        <p className="text-slate-400">보너스: <span className="text-emerald-400 font-bold">턴당 MP 회복 1%</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 sm:p-4 bg-indigo-900/10 rounded-xl border border-indigo-900/20 flex gap-2.5 sm:gap-3">
                   <div className="p-1.5 sm:p-2 bg-indigo-500/20 rounded-lg shrink-0 h-fit">
                     <Sword size={16} className="text-indigo-400" />
                   </div>
                   <div className="text-[9px] sm:text-[10px] text-slate-400 leading-relaxed">
                     <strong className="text-indigo-300 block mb-0.5 underline">타겟팅 시스템 안내</strong>
                     적들은 <span className="text-slate-200">역할(탱커 우선)</span>과 <span className="text-slate-200">위치(전열 우선)</span>를 종합적으로 판단하여 공격 대상을 결정합니다. 전략적인 배치가 파티의 생존력을 결정합니다.
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-3 sm:p-5 bg-slate-900 border-t border-slate-800 flex justify-end gap-3 shrink-0">
          <button 
            onClick={() => {
              onUpdateCharacter(localCharacter);
              onClose();
            }}
            className="w-full sm:w-auto px-6 sm:px-10 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm sm:text-base font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/30 active:scale-95 text-center"
          >
            변경 사항 적용 및 닫기
          </button>
        </div>
      </div>

      {/* 전투 예상 분석 모달 */}
      {isEstimateModalOpen && (
        <CombatEstimateModal 
          character={localCharacter} 
          onClose={() => setIsEstimateModalOpen(false)} 
        />
      )}
    </div>
  );
});

export default TacticsModal;
