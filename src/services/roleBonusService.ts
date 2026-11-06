import { BattleRole, SecondaryBattleRole, Character, Companion, DerivedStats } from '../types';

export interface SecondaryRoleInfo {
  role: SecondaryBattleRole;
  parentRole: BattleRole;
  title: string;
  desc: string;
  effects: string[];
  color: string;
  badgeBg: string;
}

export const SECONDARY_ROLE_INFOS: Record<SecondaryBattleRole, SecondaryRoleInfo> = {
  [SecondaryBattleRole.NONE]: {
    role: SecondaryBattleRole.NONE,
    parentRole: BattleRole.NONE,
    title: '없음',
    desc: '특화된 2차 전투 역할이 없습니다.',
    effects: ['추가 효과 없음'],
    color: 'text-slate-400 border-slate-700',
    badgeBg: 'bg-slate-800/80 text-slate-300 border-slate-700',
  },
  [SecondaryBattleRole.PHYSICAL_DEALER]: {
    role: SecondaryBattleRole.PHYSICAL_DEALER,
    parentRole: BattleRole.DEALER,
    title: '물리 딜러',
    desc: '물리 타격과 검기, 무술을 극한까지 연마한 정통 공격수입니다.',
    effects: ['물리 공격력 +10%', '물리 명중률 +10%'],
    color: 'text-rose-400 border-rose-500/50',
    badgeBg: 'bg-rose-950/70 text-rose-300 border-rose-700/60',
  },
  [SecondaryBattleRole.MAGIC_DEALER]: {
    role: SecondaryBattleRole.MAGIC_DEALER,
    parentRole: BattleRole.DEALER,
    title: '마법 딜러',
    desc: '원소 마법과 마도학을 전장에 쏟아붓는 마도 폭격수입니다.',
    effects: ['마법 공격력 +10%', '마법 명중률 +10%'],
    color: 'text-violet-400 border-violet-500/50',
    badgeBg: 'bg-violet-950/70 text-violet-300 border-violet-700/60',
  },
  [SecondaryBattleRole.PURE_TANKER]: {
    role: SecondaryBattleRole.PURE_TANKER,
    parentRole: BattleRole.TANKER,
    title: '퓨어 탱커',
    desc: '철벽의 방패와 육체로 적의 모든 맹공을 온몸으로 받아내는 방어의 화신입니다.',
    effects: ['물리 방어력 +12%', '마법 방어력 +12%'],
    color: 'text-blue-400 border-blue-500/50',
    badgeBg: 'bg-blue-950/70 text-blue-300 border-blue-700/60',
  },
  [SecondaryBattleRole.DEALING_TANKER]: {
    role: SecondaryBattleRole.DEALING_TANKER,
    parentRole: BattleRole.TANKER,
    title: '딜링 탱커',
    desc: '전열에서 적의 공격을 버텨내며 동시에 묵직한 반격을 꽂아넣는 돌격형 전사입니다.',
    effects: ['물리/마법 방어력 +6%', '물리 공격력 +6%', '물리 명중률 +6%'],
    color: 'text-amber-400 border-amber-500/50',
    badgeBg: 'bg-amber-950/70 text-amber-300 border-amber-700/60',
  },
  [SecondaryBattleRole.SAVE_TANKER]: {
    role: SecondaryBattleRole.SAVE_TANKER,
    parentRole: BattleRole.TANKER,
    title: '세이브 탱커',
    desc: '아군을 엄호하고 각종 디버프와 군중제어기를 견뎌내는 수호자입니다.',
    effects: ['물리/마법 방어력 +8%', '상태이상 저항 +8%'],
    color: 'text-cyan-400 border-cyan-500/50',
    badgeBg: 'bg-cyan-950/70 text-cyan-300 border-cyan-700/60',
  },
  [SecondaryBattleRole.HEALER]: {
    role: SecondaryBattleRole.HEALER,
    parentRole: BattleRole.SUPPORTER,
    title: '힐러',
    desc: '성스러운 기운과 치유 마법으로 아군의 생명력을 책임지는 지원자입니다.',
    effects: ['매 라운드 마나 1.5% 회복', '회복 효과 +8%'],
    color: 'text-emerald-400 border-emerald-500/50',
    badgeBg: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60',
  },
  [SecondaryBattleRole.BUFFER]: {
    role: SecondaryBattleRole.BUFFER,
    parentRole: BattleRole.SUPPORTER,
    title: '버퍼',
    desc: '전황을 읽고 아군 동료들에게 강력한 물공/마공 강화 축복을 부여하는 사기 진작자입니다.',
    effects: ['매 라운드 마나 1.5% 회복', '동료 물공/마공 +2% 지원'],
    color: 'text-teal-400 border-teal-500/50',
    badgeBg: 'bg-teal-950/70 text-teal-300 border-teal-700/60',
  },
  [SecondaryBattleRole.DEBUFFER]: {
    role: SecondaryBattleRole.DEBUFFER,
    parentRole: BattleRole.SUPPORTER,
    title: '디버퍼',
    desc: '적의 약점을 파고들어 능력치를 깎고 전술을 마비시키는 저주와 제어의 전문가입니다.',
    effects: ['매 라운드 마나 1.5% 회복', '제어력 및 상태이상 적중 +8%'],
    color: 'text-purple-400 border-purple-500/50',
    badgeBg: 'bg-purple-950/70 text-purple-300 border-purple-700/60',
  },
  [SecondaryBattleRole.ALLROUNDER]: {
    role: SecondaryBattleRole.ALLROUNDER,
    parentRole: BattleRole.ALLROUNDER,
    title: '올라운더',
    desc: '공격, 방어, 보조 모든 영역에서 활약할 수 있는 만능 전투 전문가입니다.',
    effects: ['공격력(물리/마법) +4%', '방어력(물리/마법) +4%', '명중률(물리/마법) +4%', '매 라운드 마나 0.5% 회복'],
    color: 'text-yellow-400 border-yellow-500/50',
    badgeBg: 'bg-yellow-950/70 text-yellow-300 border-yellow-700/60',
  },
};

export const SECONDARY_ROLES_BY_PARENT: Record<BattleRole, SecondaryBattleRole[]> = {
  [BattleRole.NONE]: [],
  [BattleRole.DEALER]: [SecondaryBattleRole.PHYSICAL_DEALER, SecondaryBattleRole.MAGIC_DEALER],
  [BattleRole.TANKER]: [SecondaryBattleRole.PURE_TANKER, SecondaryBattleRole.DEALING_TANKER, SecondaryBattleRole.SAVE_TANKER],
  [BattleRole.SUPPORTER]: [SecondaryBattleRole.HEALER, SecondaryBattleRole.BUFFER, SecondaryBattleRole.DEBUFFER],
  [BattleRole.ALLROUNDER]: [SecondaryBattleRole.ALLROUNDER],
};

// 1차 역할 숙련도 가져오기
export const getPrimaryRoleProficiency = (entity: Character | Companion | undefined | null, role: BattleRole): number => {
  if (!entity || !entity.roleProficiency) return 0;
  return entity.roleProficiency[role] || 0;
};

// 2차 역할 숙련도 가져오기
export const getSecondaryRoleProficiency = (entity: Character | Companion | undefined | null, role: SecondaryBattleRole): number => {
  if (!entity) return 0;
  if (role === SecondaryBattleRole.ALLROUNDER) {
    const isAllMastered = isAllRounderUnlocked(entity);
    return isAllMastered ? 100 : Math.min(
      getPrimaryRoleProficiency(entity, BattleRole.DEALER),
      getPrimaryRoleProficiency(entity, BattleRole.TANKER),
      getPrimaryRoleProficiency(entity, BattleRole.SUPPORTER)
    );
  }
  return entity.secondaryRoleProficiency?.[role] || 0;
};

// 올라운더 해금 조건: 딜러, 탱커, 서포터 숙련도가 모두 100
export const isAllRounderUnlocked = (entity: Character | Companion | undefined | null): boolean => {
  if (!entity) return false;
  const dealerProf = getPrimaryRoleProficiency(entity, BattleRole.DEALER);
  const tankerProf = getPrimaryRoleProficiency(entity, BattleRole.TANKER);
  const supporterProf = getPrimaryRoleProficiency(entity, BattleRole.SUPPORTER);
  return dealerProf >= 100 && tankerProf >= 100 && supporterProf >= 100;
};

// 2차 전투역할 훈련 가능 여부 (해당 1차 전투역할 숙련도 100 달성 시 훈련 가능)
export const canTrainSecondaryRole = (entity: Character | Companion | undefined | null, secondaryRole: SecondaryBattleRole): boolean => {
  if (!entity || secondaryRole === SecondaryBattleRole.NONE) return false;
  if (secondaryRole === SecondaryBattleRole.ALLROUNDER) {
    return isAllRounderUnlocked(entity);
  }
  const info = SECONDARY_ROLE_INFOS[secondaryRole];
  if (!info || info.parentRole === BattleRole.NONE) return false;
  return getPrimaryRoleProficiency(entity, info.parentRole) >= 100;
};

// 2차 전투역할 장착 가능 여부: 숙련도 100 달성 시
export const isSecondaryRoleUnlocked = (entity: Character | Companion | undefined | null, secondaryRole: SecondaryBattleRole): boolean => {
  if (!entity || secondaryRole === SecondaryBattleRole.NONE) return true;
  if (secondaryRole === SecondaryBattleRole.ALLROUNDER) {
    return isAllRounderUnlocked(entity);
  }
  const prof = getSecondaryRoleProficiency(entity, secondaryRole);
  return prof >= 100;
};

// 2차 역할에 따른 스탯 보정치 적용
export const applySecondaryRoleStatBonuses = (
  stats: DerivedStats,
  role?: BattleRole,
  secondaryRole?: SecondaryBattleRole
): DerivedStats => {
  if (!secondaryRole || secondaryRole === SecondaryBattleRole.NONE) {
    return stats;
  }

  const updated: DerivedStats = { ...stats };

  switch (secondaryRole) {
    case SecondaryBattleRole.PHYSICAL_DEALER:
      updated.pAtk = Math.floor(updated.pAtk * 1.10);
      updated.accuracy = Math.round(updated.accuracy + 10);
      break;

    case SecondaryBattleRole.MAGIC_DEALER:
      updated.mAtk = Math.floor(updated.mAtk * 1.10);
      updated.mAccuracy = Math.round(updated.mAccuracy + 10);
      break;

    case SecondaryBattleRole.PURE_TANKER:
      updated.pDef = Math.floor(updated.pDef * 1.12);
      updated.mDef = Math.floor(updated.mDef * 1.12);
      break;

    case SecondaryBattleRole.DEALING_TANKER:
      updated.pDef = Math.floor(updated.pDef * 1.06);
      updated.mDef = Math.floor(updated.mDef * 1.06);
      updated.pAtk = Math.floor(updated.pAtk * 1.06);
      updated.accuracy = Math.round(updated.accuracy + 6);
      break;

    case SecondaryBattleRole.SAVE_TANKER:
      updated.pDef = Math.floor(updated.pDef * 1.08);
      updated.mDef = Math.floor(updated.mDef * 1.08);
      updated.statusResist = Math.round(updated.statusResist + 8);
      break;

    case SecondaryBattleRole.HEALER:
      // 라운드당 MP 1.5% 회복은 전투 루프에서 별도 적용
      break;

    case SecondaryBattleRole.BUFFER:
      // 라운드당 MP 1.5% 회복 및 동료 물공/마공 +2% 지원
      updated.pAtk = Math.floor(updated.pAtk * 1.02);
      updated.mAtk = Math.floor(updated.mAtk * 1.02);
      break;

    case SecondaryBattleRole.DEBUFFER:
      // 라운드당 MP 1.5% 회복 및 제어 관통력/마법 명중률 보정
      if (updated.ctrlPenetration !== undefined) {
        updated.ctrlPenetration = Math.round(updated.ctrlPenetration + 8);
      }
      updated.mAccuracy = Math.round(updated.mAccuracy + 8);
      break;

    case SecondaryBattleRole.ALLROUNDER:
      updated.pAtk = Math.floor(updated.pAtk * 1.04);
      updated.mAtk = Math.floor(updated.mAtk * 1.04);
      updated.pDef = Math.floor(updated.pDef * 1.04);
      updated.mDef = Math.floor(updated.mDef * 1.04);
      updated.accuracy = Math.round(updated.accuracy + 4);
      updated.mAccuracy = Math.round(updated.mAccuracy + 4);
      break;
  }

  return updated;
};

// 매 턴 MP 회복 비율 (%)
export const getRoleTurnManaRegenRate = (
  role?: BattleRole,
  secondaryRole?: SecondaryBattleRole
): number => {
  if (secondaryRole) {
    if (
      secondaryRole === SecondaryBattleRole.HEALER ||
      secondaryRole === SecondaryBattleRole.BUFFER ||
      secondaryRole === SecondaryBattleRole.DEBUFFER
    ) {
      return 1.5;
    }
    if (secondaryRole === SecondaryBattleRole.ALLROUNDER) {
      return 0.5;
    }
  }

  if (role === BattleRole.SUPPORTER) {
    return 1.0;
  }

  return 0;
};
