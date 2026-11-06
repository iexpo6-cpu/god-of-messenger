import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Character, Companion, ItemRarity, BattleRole, SecondaryBattleRole, CombatStyle, SkillType, ClassTier, MonsterStage, RelationType } from '../types';
import { calculateFinalStats, getYear, generateDefaultVisualUrl, calculateCombatPower } from '../utils';
import { SECONDARY_ROLE_INFOS } from '../services/roleBonusService';
import { getCompanionRoutine } from '../services/npcRoutineService';
import { MAX_PARTY_SIZE, COMBAT_STYLE_CONFIG } from '../constants';
import { TITLES } from '../titles';
import { getVisualUrlByJob } from '../services/visualManager';
import { returnMonsterToFarm } from '../services/monsterManager';
import { areSiblings, isHalfSibling } from '../services/siblingService';
import { X, Users, Heart, Shield, Skull, Clock, UserPlus, Trash2, LogOut, Sparkles, AlertCircle, Star, Filter, BarChart2, Backpack, User } from 'lucide-react';
import CombatPowerDetailModal from './CombatPowerDetailModal';

interface Props {
  character: Character;
  inactiveCompanions?: Companion[];
  onClose: () => void;
  onSelectCompanion: (index: number) => void;
  onRejoinCompanion?: (index: number) => void;
  onPermanentlyDismissCompanion?: (index: number) => void;
  onDismissCompanion?: (index: number) => void;
  onReturnMonsterToFarm?: (companionId: string) => void;
  onUpdateCharacter?: (character: Character) => void;
  onZoom: (url: string) => void;
  onToggleFavoriteCompanion?: (companionId: string) => void;
  onChangeModal?: (modal: 'stats' | 'equip' | 'inventory' | 'companion') => void;
}

const RARITY_COLORS: Record<string, string> = {
  [ItemRarity.NORMAL]: 'text-slate-400 border-slate-600',
  [ItemRarity.MAGIC]: 'text-blue-400 border-blue-500',
  [ItemRarity.RARE]: 'text-yellow-400 border-yellow-500',
  [ItemRarity.EPIC]: 'text-purple-400 border-purple-500',
  [ItemRarity.UNIQUE]: 'text-pink-400 border-pink-500',
  [ItemRarity.LEGENDARY]: 'text-amber-500 border-amber-500 shadow-amber-500/20',
  [ItemRarity.MYTHTIC]: 'text-red-700 border-red-700 shadow-red-700/20',
};

export const getCompanionClassInfo = (comp: Companion) => {
  const isMonster = !!(comp?.isMonster || comp?.monsterData || comp?.race === '몬스터' || comp?.race?.includes('Monster'));

  if (isMonster) {
    let stageLabel = comp?.monsterData?.stage as string | undefined;
    if (!stageLabel && comp?.classType && comp.classType !== '미해방' && comp.classType !== '없음' && comp.classType !== '몬스터' && comp.classType !== '동료') {
      stageLabel = comp.classType;
    }
    if (!stageLabel || stageLabel === '미해방' || stageLabel === '없음') {
      const lvl = comp?.level || 1;
      if (lvl >= 500) stageLabel = '궁극체';
      else if (lvl >= 200) stageLabel = '완전체';
      else if (lvl >= 100) stageLabel = '성숙기';
      else stageLabel = '성장기';
    }

    return {
      tier: ClassTier.NONE,
      tierLabel: stageLabel,
      className: "",
      badgeColor: "bg-emerald-950/80 border-emerald-600/70 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
      isLiberated: true,
    };
  }

  const tier = comp?.classTier;

  if (!tier || tier === ClassTier.NONE || tier === ClassTier.F) {
    return {
      tier: tier || ClassTier.NONE,
      tierLabel: "미해방",
      className: "",
      badgeColor: "bg-slate-900/80 border-slate-800 text-slate-400",
      isLiberated: false,
    };
  }

  let className = "";
  let tierLabel = "퍼스트 클래스";
  let badgeColor = "bg-indigo-950/80 border-indigo-500/70 text-indigo-300";

  if (tier === ClassTier.FINAL) {
    tierLabel = "파이널 클래스";
    className = comp?.finalClassName || comp?.job || comp?.classType || "파이널 마스터";
    badgeColor = "bg-amber-950/80 border-amber-500/70 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]";
  } else if (tier === ClassTier.LAST) {
    tierLabel = "라스트 클래스";
    className = comp?.lastClassName || comp?.job || comp?.classType || "라스트 챔피언";
    badgeColor = "bg-purple-950/80 border-purple-500/70 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]";
  } else if (tier === ClassTier.SECOND) {
    tierLabel = "세컨드 클래스";
    className = comp?.secondClassName || comp?.job || comp?.classType || "세컨드 익스퍼트";
    badgeColor = "bg-cyan-950/80 border-cyan-500/70 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]";
  } else if (tier === ClassTier.FIRST) {
    tierLabel = "퍼스트 클래스";
    className = comp?.firstClassName || comp?.job || comp?.classType || "퍼스트 로키";
    badgeColor = "bg-indigo-950/80 border-indigo-500/70 text-indigo-300";
  } else if (tier === ClassTier.BOND) {
    tierLabel = "본드 클래스";
    className = comp?.job || comp?.classType || "인연의 기사";
    badgeColor = "bg-rose-950/80 border-rose-500/70 text-rose-300";
  } else {
    tierLabel = "미해방";
    className = "";
    badgeColor = "bg-slate-900/80 border-slate-800 text-slate-400";
  }

  return { tier, tierLabel, className, badgeColor, isLiberated: true };
};

const HealthBar = ({ current, max, color = "bg-red-600", shield = 0 }: { current: number, max: number, color?: string, shield?: number }) => {
  const safeMax = max > 0 ? max : 100;
  const safeCurrent = isNaN(current) ? 0 : Math.max(0, current);
  const percent = Math.max(0, Math.min(100, (safeCurrent / safeMax) * 100));
  const shieldPercent = Math.max(0, Math.min(100, (shield / safeMax) * 100));
  
  return (
    <div className="h-2.5 sm:h-3.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative shadow-inner">
      <div className={`h-full ${color} transition-all duration-300 ease-out`} style={{ width: `${percent}%` }}></div>
      {shield > 0 && (
        <div 
          className="h-full bg-slate-400 transition-all duration-300 ease-out absolute top-0 left-0 opacity-80 border-r border-slate-200" 
          style={{ width: `${shieldPercent}%` }}
        ></div>
      )}
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)] leading-none z-10">
        {Math.floor(safeCurrent).toLocaleString()} {shield > 0 ? `(+${Math.floor(shield).toLocaleString()})` : ''} / {safeMax.toLocaleString()}
      </span>
    </div>
  );
};


export type CombatRole = '역할없음' | '딜러' | '탱커' | '서포터' | '올라운더';

export const getCompanionCombatRole = (c: Companion): CombatRole => {
  if (!c) return '역할없음';

  // 1. 명시적으로 지정된 battleRole이 유효한 경우 최우선 반환
  if (c.battleRole) {
    if (c.battleRole === BattleRole.ALLROUNDER || c.battleRole === '올라운더' as any) return '올라운더';
    if (c.battleRole === BattleRole.TANKER || c.battleRole === '탱커' as any) return '탱커';
    if (c.battleRole === BattleRole.SUPPORTER || c.battleRole === '서포터' as any) return '서포터';
    if (c.battleRole === BattleRole.DEALER || c.battleRole === '딜러' as any) return '딜러';
    if (c.battleRole === BattleRole.NONE || c.battleRole === '역할없음' as any || c.battleRole === 'NONE' as any) return '역할없음';
  }
  return '역할없음';
};

export const renderCombatRoleBadge = (c: Companion) => {
  const role = getCompanionCombatRole(c);
  const colorCls = role === '올라운더' ? 'bg-yellow-950/50 border-yellow-700/70 text-yellow-300' :
    role === '탱커' ? 'bg-blue-950/50 border-blue-800/60 text-blue-300' :
    role === '서포터' ? 'bg-green-950/50 border-green-800/60 text-green-300' :
    role === '딜러' ? 'bg-red-950/50 border-red-800/60 text-red-300' :
    'bg-slate-900 border-slate-800 text-slate-500';

  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${colorCls}`}>
      {role}
    </span>
  );
};

export const renderSecondaryRoleBadge = (c: Companion) => {
  if (!c || !c.secondaryBattleRole || c.secondaryBattleRole === SecondaryBattleRole.NONE) return null;
  const sInfo = SECONDARY_ROLE_INFOS[c.secondaryBattleRole];
  const title = sInfo ? sInfo.title : c.secondaryBattleRole;
  const effects = sInfo ? sInfo.effects.join(', ') : '';

  return (
    <span 
      className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-purple-950/60 border-purple-600/70 text-purple-200 shadow-sm flex items-center gap-1"
      title={`2차 특화 역할: ${title} (${effects})`}
    >
      <Sparkles size={9} className="text-purple-400 shrink-0" />
      <span>2차: {title}</span>
    </span>
  );
};

export const CompanionModal: React.FC<Props> = ({
  character,
  inactiveCompanions = [],
  onClose,
  onSelectCompanion,
  onRejoinCompanion,
  onPermanentlyDismissCompanion,
  onDismissCompanion,
  onReturnMonsterToFarm,
  onUpdateCharacter,
  onZoom,
  onToggleFavoriteCompanion,
  onChangeModal
}) => {
  const [tab, setTab] = useState<'active' | 'inactive' | 'favorite'>('active');
  const [isProcessing, setIsProcessing] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [position, setPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      const x = Math.max(10, Math.floor((window.innerWidth - 840) / 2));
      const y = Math.max(10, Math.floor((window.innerHeight - 600) / 2));
      return { x, y };
    }
    return { x: 200, y: 150 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = React.useRef({ x: 0, y: 0 });
  const startPos = React.useRef({ x: 0, y: 0 });

  const [size, setSize] = useState({ width: 840, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStart = React.useRef({ x: 0, y: 0 });
  const startSize = React.useRef({ width: 0, height: 0 });

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStart.current = { x: e.clientX, y: e.clientY };
    startSize.current = { ...size };
  };

  const handleResizeTouchStart = (e: React.TouchEvent) => {
    if (isMobile) return;
    e.stopPropagation();
    setIsResizing(true);
    const touch = e.touches[0];
    resizeStart.current = { x: touch.clientX, y: touch.clientY };
    startSize.current = { ...size };
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      setSize({
        width: Math.max(340, Math.min(1000, startSize.current.width + dx)),
        height: Math.max(400, Math.min(900, startSize.current.height + dy))
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isResizing) return;
      const touch = e.touches[0];
      const dx = touch.clientX - resizeStart.current.x;
      const dy = touch.clientY - resizeStart.current.y;
      setSize({
        width: Math.max(340, Math.min(1000, startSize.current.width + dx)),
        height: Math.max(400, Math.min(900, startSize.current.height + dy))
      });
    };

    const handleTouchEnd = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isResizing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('a')) {
      return;
    }
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    startPos.current = { ...position };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isMobile) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('a')) {
      return;
    }
    setIsDragging(true);
    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX, y: touch.clientY };
    startPos.current = { ...position };
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPosition({
        x: startPos.current.x + dx,
        y: startPos.current.y + dy
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragStart.current.x;
      const dy = touch.clientY - dragStart.current.y;
      setPosition({
        x: startPos.current.x + dx,
        y: startPos.current.y + dy
      });
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  const handleReturnMonsterToFarm = (comp: Companion, idx: number) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 500);

    if (onReturnMonsterToFarm) {
      onReturnMonsterToFarm(comp.id);
      return;
    }

    if (onUpdateCharacter) {
      const res = returnMonsterToFarm(character, comp.id, 'party');
      if (res.success) {
        onUpdateCharacter(res.newCharacter);
        return;
      }
    }

    if (onDismissCompanion) {
      onDismissCompanion(idx);
    }
  };
  const [dismissConfirmIdx, setDismissConfirmIdx] = useState<number | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [classFilter, setClassFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'level' | 'combatPower' | 'shinryoku' | 'job' | 'combatStyle' | 'combatRole' | 'custom' | 'default'>('default');
  const [customFilter, setCustomFilter] = useState<'all' | 'custom' | 'normal'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [shinryokuFilter, setShinryokuFilter] = useState<string>('all');
  const [combatStyleFilter, setCombatStyleFilter] = useState<string>('all');
  const [combatRoleFilter, setCombatRoleFilter] = useState<string>('all');
  const [favoriteSortBy, setFavoriteSortBy] = useState<'combatPower' | 'level' | 'default'>('combatPower');
  const [selectedCpDetailCompanion, setSelectedCpDetailCompanion] = useState<Companion | null>(null);

  const getCompanionCP = (c: Companion) => {
    if (!c) return 0;
    return calculateCombatPower(c);
  };

  // 플레이어 또는 동료 간의 연인, 배우자, 자식(가족) 특별 관계 배지 렌더링
  const renderRelationBadge = (comp: Companion) => {
    const isChild = comp.classType?.includes('자녀') || comp.classType?.includes('Child') || comp.childData !== undefined || (comp.childData?.parentNames && comp.childData.parentNames.length > 0);
    const isPregnant = comp.pregnancy?.isPregnant;
    
    // 플레이어와의 연인/배우자 관계 여부
    const isPlayerPartner = !comp.partnerId || comp.partnerId === 'player' || comp.partnerName === character?.name || comp.partnerName === '나' || comp.partnerName === 'Player';
    const isLoverWithPlayer = (comp.isLover || comp.isSpouse) && isPlayerPartner;
    const isLoverWithOther = (comp.isLover || comp.isSpouse) && !isPlayerPartner;
    const partnerName = comp.partnerName || '동료';

    const isSiblingWithPlayer = comp.relation === RelationType.SIBLING || (character && areSiblings(character, comp, character));
    const isHalfWithPlayer = isSiblingWithPlayer && character && isHalfSibling(character, comp, character);

    if (!comp.isSpouse && !comp.isLover && !isChild && !isPregnant && !isSiblingWithPlayer) return null;

    return (
      <div className="flex items-center gap-1 shrink-0 flex-wrap">
        {/* 1. 플레이어와의 배우자 관계 */}
        {comp.isSpouse && isLoverWithPlayer && (
          <span 
            className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1 shadow-[0_0_10px_rgba(244,63,94,0.25)] animate-pulse"
            title="플레이어의 반려 배우자"
          >
            💍 배우자
          </span>
        )}

        {/* 2. 플레이어와의 연인 관계 */}
        {comp.isLover && !comp.isSpouse && isLoverWithPlayer && (
          <span 
            className="px-2 py-0.5 rounded-full text-[9px] font-black bg-pink-500/20 text-pink-300 border border-pink-500/50 flex items-center gap-1 shadow-[0_0_10px_rgba(236,72,153,0.25)] animate-pulse"
            title="플레이어와 연애 중인 연인 관계"
          >
            💖 연인
          </span>
        )}

        {/* 3. 다른 동료와 결혼한 경우 */}
        {comp.isSpouse && isLoverWithOther && (
          <span 
            className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1"
            title={`${partnerName}와(과) 결혼한 기혼 상태`}
          >
            💍 {partnerName}와(과) 결혼
          </span>
        )}

        {/* 4. 다른 동료와 연애 중인 경우 */}
        {comp.isLover && !comp.isSpouse && isLoverWithOther && (
          <span 
            className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-pink-950/40 text-pink-300/90 border border-pink-500/30 flex items-center gap-1"
            title={`${partnerName}와(과) 연애 중`}
          >
            💕 {partnerName}와(과) 연애 중
          </span>
        )}

        {/* 5. 자녀 */}
        {isChild && (
          <span 
            className="px-2 py-0.5 rounded-full text-[9px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 flex items-center gap-1 shadow-[0_0_10px_rgba(6,182,212,0.25)]"
            title="플레이어의 소중한 혈육 자녀"
          >
            👶 자녀
          </span>
        )}

        {/* 6. 임신 중 */}
        {isPregnant && (
          <span 
            className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.25)]"
            title="현재 새 생명을 잉태 중인 상태"
          >
            🤰 임신 중
          </span>
        )}

        {/* 7. 플레이어와의 형제자매 관계 */}
        {isSiblingWithPlayer && (
          <span 
            className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.25)]"
            title={isHalfWithPlayer ? "플레이어와 이복/이부 형제자매 관계" : "플레이어와 친형제자매 관계"}
          >
            👥 {isHalfWithPlayer ? '이복/이부 형제' : '형제자매'}
          </span>
        )}
      </div>
    );
  };

  // 대기소 동료 고유 직업 목록 자동 추출 (사망자 제외)
  const jobOptions = React.useMemo(() => {
    const jobs = new Set<string>();
    (inactiveCompanions || []).filter(c => !c.isDead).forEach(c => {
      if (c.job) jobs.add(c.job);
    });
    return Array.from(jobs);
  }, [inactiveCompanions]);

  // 대기소 동료 고유 신력 계통 목록 자동 추출 (사망자 제외)
  const shinryokuOptions = React.useMemo(() => {
    const types = new Set<string>();
    (inactiveCompanions || []).filter(c => !c.isDead).forEach(c => {
      if (c.shinryokuType) types.add(c.shinryokuType);
    });
    return Array.from(types);
  }, [inactiveCompanions]);

  // 대기소 동료 고유 전투계열 목록 자동 추출 (사망자 제외)
  const combatStyleOptions = React.useMemo(() => {
    const styles = new Set<string>();
    (inactiveCompanions || []).filter(c => !c.isDead).forEach(c => {
      if (c.combatStyle) styles.add(c.combatStyle);
    });
    return Array.from(styles);
  }, [inactiveCompanions]);

  // 대기 명단 필터링 및 정렬 연산 (사망자 제외)
  const processedInactiveCompanions = React.useMemo(() => {
    let result = (inactiveCompanions || [])
      .map((comp, originalIdx) => ({ comp, originalIdx }))
      .filter(item => !item.comp.isDead);

    // 1. 분류 및 필터링 적용
    if (sortBy === 'job' && classFilter !== 'all') {
      // 직업 분류 필터
      result = result.filter(item => (item.comp.job || '기타') === classFilter);
    } else if (sortBy === 'shinryoku' && shinryokuFilter !== 'all') {
      // 신력 계통 필터
      result = result.filter(item => item.comp.shinryokuType === shinryokuFilter);
    } else if (sortBy === 'combatStyle' && combatStyleFilter !== 'all') {
      // 전투 계열 필터
      result = result.filter(item => item.comp.combatStyle === combatStyleFilter);
    } else if (sortBy === 'combatRole' && combatRoleFilter !== 'all') {
      // 전투 역할 필터
      result = result.filter(item => getCompanionCombatRole(item.comp) === combatRoleFilter);
    } else if (sortBy === 'custom' && customFilter !== 'all') {
      // 커스텀 동료 필터
      if (customFilter === 'custom') {
        result = result.filter(item => Boolean(item.comp.isCustom));
      } else if (customFilter === 'normal') {
        result = result.filter(item => !item.comp.isCustom);
      }
    }

    // 2. 정렬
    if (sortBy === 'level') {
      result.sort((a, b) => {
        return sortOrder === 'desc' ? b.comp.level - a.comp.level : a.comp.level - b.comp.level;
      });
    } else if (sortBy === 'combatPower') {
      result.sort((a, b) => {
        const cpA = getCompanionCP(a.comp);
        const cpB = getCompanionCP(b.comp);
        return sortOrder === 'desc' ? cpB - cpA : cpA - cpB;
      });
    } else if (sortBy === 'shinryoku') {
      result.sort((a, b) => {
        const typeA = a.comp.shinryokuType || '없음';
        const typeB = b.comp.shinryokuType || '없음';
        return typeA.localeCompare(typeB);
      });
    } else if (sortBy === 'job') {
      result.sort((a, b) => {
        const jobA = a.comp.job || '기타';
        const jobB = b.comp.job || '기타';
        return jobA.localeCompare(jobB);
      });
    } else if (sortBy === 'combatStyle') {
      result.sort((a, b) => {
        const styleA = a.comp.combatStyle || '';
        const styleB = b.comp.combatStyle || '';
        return styleA.localeCompare(styleB);
      });
    } else if (sortBy === 'combatRole') {
      result.sort((a, b) => {
        const roleA = getCompanionCombatRole(a.comp);
        const roleB = getCompanionCombatRole(b.comp);
        return roleA.localeCompare(roleB);
      });
    } else if (sortBy === 'custom') {
      result.sort((a, b) => {
        const customA = a.comp.isCustom ? 1 : 0;
        const customB = b.comp.isCustom ? 1 : 0;
        return sortOrder === 'desc' ? customB - customA : customA - customB;
      });
    }

    return result;
  }, [inactiveCompanions, classFilter, sortBy, sortOrder, shinryokuFilter, combatStyleFilter, combatRoleFilter, customFilter]);

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const currentYear = getYear(character.currentDate || '2000-01-01');
  const isPartyFull = character.companions.length >= MAX_PARTY_SIZE;

  const isCompanionDispatched = (compId: string) => {
    const isBaseDispatched = character.base?.dispatched?.some(m => m.companionId === compId);
    const isWarDispatched = character.base?.dispatched?.some(m => 
      m.missionType === 'WarInvasion' && (m as any).participants?.includes(compId)
    );
    const isGroupDispatched = character.mercenaryData?.groupMissions?.some(m => m.memberIds.includes(compId));
    const isAssigned = Object.values(character.base?.assignments || {}).includes(compId);
    const isMultiAssigned = Object.values(character.base?.multiAssignments || {}).flat().includes(compId);
    const isCombatTrainee = Object.values(character.base?.combatTraining || {}).some(ct => (ct.trainees || []).some(t => t.companionId === compId));
    const isHouseChef = (character.base?.houses || []).some(h => h.assignedChefId === compId);
    const isHouseHK = (character.base?.houses || []).some(h => h.assignedHousekeeperId === compId);
    return isBaseDispatched || isWarDispatched || isGroupDispatched || isAssigned || isMultiAssigned || isCombatTrainee || isHouseChef || isHouseHK;
  };

  const getCompanionWorkStatus = (compId: string): string | null => {
    // 1. 기지 일반/특수 파견 미션
    const baseDispatched = character.base?.dispatched?.find(m => 
      m.companionId === compId || ((m as any).participants && (m as any).participants.includes(compId))
    );
    if (baseDispatched) {
      const type = baseDispatched.missionType || '';
      const dest = baseDispatched.destination?.city || baseDispatched.destination?.nation || '외곽';
      
      if (type === 'PersonalLeave') return '개인 휴가 / 외출';
      if (type === 'RecruitTravel') return '동료 영입 여정';
      if (type === 'WarInvasion' || baseDispatched.id?.startsWith('war_inv_') || baseDispatched.id?.startsWith('war_disp_')) return `전쟁 침공 파견: ${dest}`;
      if (type === 'TempleProtection' || baseDispatched.id?.startsWith('temple_prot_') || baseDispatched.id?.startsWith('temple_')) return `신전 수호 파견 (${dest})`;
      if (type === 'Blacksmithing' || baseDispatched.id?.startsWith('bs_')) return '대장간 연마/제련 작업';
      if (type === 'AlchemyCrafting' || type === 'Alchemy' || baseDispatched.id?.startsWith('alc_')) return '연금술 비약 조제 작업';
      if (type === 'Patrol' || type === 'Suppression' || type === 'Infiltration' || type === 'Escort' || baseDispatched.id?.startsWith('mil_disp_') || baseDispatched.id?.startsWith('mil_spec_disp_')) {
        const opName = type === 'Patrol' ? '순찰' : type === 'Suppression' ? '토벌' : type === 'Infiltration' ? '잠입' : type === 'Escort' ? '호위' : '작전';
        return `군대 파견: ${dest} (${opName})`;
      }
      if (type === 'RegionalSecurity' || type === 'RegionalSentiment' || baseDispatched.id?.startsWith('reg_disp_') || baseDispatched.id?.startsWith('reg_manage_')) {
        const regName = type === 'RegionalSecurity' ? '치안 유지' : '민심 안정';
        return `영지 통치: ${dest} (${regName})`;
      }
      if (type === 'ScoutDispatch') return `스카우트 파견: ${dest}`;
      if (type === 'Expedition') return `원정대 파견: ${dest}`;
      return `파견: ${dest}`;
    }

    // 2. 용병단 단체 의뢰
    const groupDispatched = character.mercenaryData?.groupMissions?.find(m => m.memberIds?.includes(compId));
    if (groupDispatched) {
      return `용병단 의뢰: ${groupDispatched.title || '단체 의뢰'}`;
    }

    // 3. 기지 시설 단일 배정 (assignments)
    const assignmentEntry = Object.entries(character.base?.assignments || {}).find(([_, v]) => v === compId);
    if (assignmentEntry) {
      const key = assignmentEntry[0];
      const targetInst = character.base?.layout?.find(inst => inst.id === key);
      const facType = targetInst?.type || key;

      if (key.startsWith('temple_protection_')) {
        const nation = key.replace('temple_protection_', '');
        return `${nation} 수호 기사`;
      }
      if (facType === 'farm') return '농장 관리인';
      if (facType === 'mine') return '광산 관리자';
      if (facType === 'training_exp') return '경험 훈련소 조교';
      if (facType === 'training_stat') return '스탯 훈련소 트레이너';
      if (facType === 'training_mastery') return '무기숙련 훈련장 사범';
      if (facType === 'training_style') return '전투스타일 훈련소 교관';
      if (facType === 'tactical_training') return '전술 훈련소 트레이너';
      if (facType === 'combat_training') return '전투 훈련소 총괄 조교';
      if (facType === 'sparring_arena') return '모의 대련장 대련 사범';
      if (facType === 'training') return '훈련소 담당 트레이너';
      if (facType === 'blacksmith' || facType === 'workshop') return '대장간/제작소 대장장이';
      if (facType === 'alchemy') return '연금술실 연금술사';
      if (facType === 'lab') return '연구소 수석 연구원';
      if (facType === 'monster_farm') return '몬스터 사육소 사육사';
      if (facType === 'cooking') return '요리 시설 쉐프';
      if (facType === 'dispatch') return '파견소 총괄 관리자';
      if (facType === 'housing') return '숙소 총괄 하우스키퍼';
      if (facType === 'storage') return '창고 관리자';
      if (facType === 'defense') return '기지 방어소 경비 대장';
      if (facType === 'back_alley') return '뒷골목 정보원';
      if (facType === 'club') return '클럽 관리인';
      if (facType === 'trade_exchange') return '물자 교류소 상인';
      return '기지 시설 담당자';
    }

    // 4. 기지 시설 다중 배정 (multiAssignments)
    if (character.base?.multiAssignments) {
      for (const [facilityId, idList] of Object.entries(character.base.multiAssignments)) {
        if (Array.isArray(idList) && idList.includes(compId)) {
          const targetInst = character.base?.layout?.find(inst => inst.id === facilityId);
          const facType = targetInst?.type || facilityId;
          
          if (facType.startsWith('farm')) return '농장 농부 (경작 중)';
          if (facType.startsWith('mine')) return '광산 광부 (채굴 중)';
          if (facType.startsWith('blacksmith') || facType.startsWith('workshop')) return '제작소 대장장이 (근무 중)';
          if (facType.startsWith('alchemy')) return '연금술실 연금술사 (근무 중)';
          if (facType.startsWith('cooking')) return '요리 시설 쉐프 (조리 중)';
          if (facType.startsWith('monster_farm')) return '사육소 사육사 (사육 중)';
          if (facType.startsWith('lab')) return '연구소 연구원 (연구 중)';
          if (facType.startsWith('training')) return '훈련소 트레이너 (지도 중)';
          if (facType.startsWith('housing') || facType === 'housing') return '숙소 하우스키퍼 (관리 중)';
          return '기지 시설 현장 근무 중';
        }
      }
    }

    // 5. 전투 훈련소 훈련생
    if (character.base?.combatTraining) {
      for (const [instId, cTraining] of Object.entries(character.base.combatTraining)) {
        if (cTraining.trainees?.some(t => t.companionId === compId)) {
          return '전투 훈련소 훈련생 (수련 중)';
        }
      }
    }

    // 6. 숙소 / 개인 주택 전담 하우스키퍼 및 요리사
    if (character.base?.houses) {
      const houseWithHK = character.base.houses.find(h => h.assignedHousekeeperId === compId);
      if (houseWithHK) {
        return `숙소(${houseWithHK.name || '주택'}) 전담 하우스키퍼`;
      }
      const houseWithChef = character.base.houses.find(h => h.assignedChefId === compId);
      if (houseWithChef) {
        return `주택(${houseWithChef.name || '개인 숙소'}) 전담 요리사`;
      }
    }

    return null;
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] pointer-events-none animate-in fade-in duration-200">
      
      {/* Dismiss Confirmation Modal */}
      {dismissConfirmIdx !== null && (
        <div className="fixed inset-0 z-[200] pointer-events-auto flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-red-500/50 rounded-2xl p-6 max-w-[340px] w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-500 mb-3">
              <AlertCircle size={24} />
              <h3 className="text-base font-bold">동료 영구 제외</h3>
            </div>
            <p className="text-slate-300 text-xs mb-5 leading-relaxed">
              <span className="text-amber-400 font-bold">
                {inactiveCompanions?.[dismissConfirmIdx]?.name}
              </span> 대원을 정말로 영구 제외하시겠습니까?
              <br />
              <span className="text-red-400 text-[10px] mt-2 block font-bold leading-tight">
                * 이 작업은 되돌릴 수 없으며, 대원의 모든 데이터가 영구 삭제됩니다.
              </span>
            </p>
            <div className="flex gap-2.5">
              <button 
                onClick={() => setDismissConfirmIdx(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs border border-slate-700 transition-colors"
              >
                취소
              </button>
              <button 
                onClick={() => {
                  if (onPermanentlyDismissCompanion && dismissConfirmIdx !== null) {
                    onPermanentlyDismissCompanion(dismissConfirmIdx);
                  }
                  setDismissConfirmIdx(null);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs shadow-md transition-colors"
              >
                제외하기
              </button>
            </div>
          </div>
        </div>
      )}

      <div 
        style={isMobile ? {
          position: 'fixed',
          left: 0,
          top: 0,
          width: '100vw',
          height: '100vh',
          borderRadius: 0,
          border: 'none'
        } : { 
          position: 'fixed', 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: `${size.height}px`
        }}
        className={`bg-slate-900 flex flex-col shadow-2xl overflow-hidden pointer-events-auto select-none relative ${
          isMobile ? 'border-none rounded-none' : 'border border-indigo-500/40 rounded-2xl'
        }`}
      >
        
        {/* Header */}
        <div 
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="cursor-move bg-slate-950 px-3 sm:px-4 py-2 sm:py-3 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 select-none"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Users size={16} />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-indigo-400 flex flex-wrap items-center gap-1 sm:gap-1.5">
                <span>동료 관리</span>
                <span className="text-[9px] bg-slate-800 text-slate-300 font-normal px-2 py-0.2 rounded-full border border-slate-700">
                  {character.companions.length} / {MAX_PARTY_SIZE}명
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors shrink-0 ml-auto"
          >
            <X size={15} />
          </button>
        </div>

        {/* Quick Navigation Tab Bar */}
        {onChangeModal && (
          <div className="bg-slate-950 px-3 sm:px-6 py-2 sm:py-2.5 border-b border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            {[
              { key: 'stats', label: '스탯 상태', color: 'text-amber-400 hover:bg-amber-500/10 border-amber-500/20' },
              { key: 'equip', label: '장착 장비', color: 'text-cyan-400 hover:bg-cyan-500/10 border-cyan-500/20' },
              { key: 'inventory', label: '인벤토리', color: 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20' },
              { key: 'companion', label: '동료 관리', color: 'text-indigo-400 hover:bg-indigo-500/10 border-indigo-500/20' },
            ].map((m) => {
              const isActive = m.key === 'companion';
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => onChangeModal(m.key as any)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black border transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                    isActive
                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                      : `bg-slate-900 border-slate-800 ${m.color}`
                  }`}
                >
                  {m.key === 'stats' && <BarChart2 size={13} />}
                  {m.key === 'equip' && <Shield size={13} />}
                  {m.key === 'inventory' && <Backpack size={13} />}
                  {m.key === 'companion' && <User size={13} />}
                  {m.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Tab Selector */}
        <div className="bg-slate-950/80 px-3 sm:px-6 py-2 sm:py-3 border-b border-slate-800 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setTab('active')}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all border flex items-center gap-1.5 sm:gap-2 shrink-0 ${
              tab === 'active'
                ? 'bg-indigo-950 text-indigo-300 border-indigo-500/60 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Users size={14} />
            <span>현재 파티원 ({character.companions.filter(c => !c.isDead).length}명)</span>
          </button>
          <button
            onClick={() => setTab('inactive')}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all border flex items-center gap-1.5 sm:gap-2 shrink-0 ${
              tab === 'inactive'
                ? 'bg-indigo-950 text-indigo-300 border-indigo-500/60 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <LogOut size={14} />
            <span>대기 명단 ({(inactiveCompanions || []).filter(c => !c.isDead).length}명)</span>
          </button>
          <button
            onClick={() => setTab('favorite')}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all border flex items-center gap-1.5 sm:gap-2 shrink-0 ${
              tab === 'favorite'
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/60 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Star size={14} className={tab === 'favorite' ? "text-amber-400 fill-amber-400" : "text-amber-500"} />
            <span>즐겨찾기 ({character.companions.filter(c => !c.isDead && c.favorite).length + (inactiveCompanions || []).filter(c => !c.isDead && c.favorite).length}명)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-6 custom-scrollbar">
          
          {tab === 'active' && (() => {
            const alivePartyCompanions = character.companions
              .map((comp, idx) => ({ comp, idx }))
              .filter(item => !item.comp.isDead);

            return (
              <div>
                {alivePartyCompanions.length > 0 ? (
                  <div className={`grid gap-3.5 sm:gap-4 ${isMobile || size.width < 580 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {alivePartyCompanions.map(({ comp, idx }) => {
                    const isMonster = !!(comp.isMonster || comp.monsterData || comp.race === '몬스터' || comp.race?.includes('Monster'));
                    const { finalStats } = calculateFinalStats(comp);
                    const classInfo = getCompanionClassInfo(comp);
                    const displayAge = (currentYear !== undefined && comp.birthYear !== undefined) 
                      ? (currentYear - comp.birthYear) + "세" 
                      : comp.age;

                    const defaultVisualUrl = comp.defaultVisualUrl || generateDefaultVisualUrl(comp.name, comp.nation || '기타', comp.race, comp.gender);
                    const displayVisualUrl = getVisualUrlByJob(comp.job, comp.gender, comp.visualUrl || comp.monsterData?.visualUrl || defaultVisualUrl);
                    const expPercent = comp.maxExp > 0 ? (comp.currentExp / comp.maxExp) * 100 : 0;

                    return (
                      <div
                        key={`active-${comp.id || idx}`}
                        className="bg-slate-950/70 border border-slate-800 hover:border-indigo-500/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 transition-all shadow-md flex flex-col justify-between space-y-2 sm:space-y-3 group"
                      >
                        {/* Top Info */}
                        <div className="flex items-start justify-between gap-2 sm:gap-3">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div 
                              onClick={() => displayVisualUrl && onZoom(displayVisualUrl)}
                              className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl border-2 border-indigo-500/30 overflow-hidden shrink-0 cursor-zoom-in hover:border-indigo-400 transition-all shadow-inner"
                            >
                              <img src={displayVisualUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <h3 className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                                  {comp.name}
                                </h3>
                                {comp.isCustom && (
                                  <span className="text-[9px] sm:text-[10px] font-black bg-purple-950/90 text-purple-300 border border-purple-500/60 px-1.5 py-0.2 sm:py-0.5 rounded shadow-sm shrink-0 flex items-center gap-0.5" title="커스텀 동료">
                                    ✨ 커스텀
                                  </span>
                                )}
                                {((comp.statPoints || 0) > 0) && (
                                  <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full animate-bounce shadow" title={`미사용 스탯포인트 ${comp.statPoints}P`}>
                                    +
                                  </span>
                                )}
                                {renderRelationBadge(comp)}
                                {onToggleFavoriteCompanion && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleFavoriteCompanion(comp.id);
                                    }}
                                    className="p-1 hover:bg-slate-800 rounded text-amber-400 hover:text-amber-300 transition-colors"
                                    title="즐겨찾기 토글"
                                  >
                                    <Star size={14} className={comp.favorite ? "fill-amber-400 text-amber-400" : "text-slate-500 hover:text-amber-400"} />
                                  </button>
                                )}
                                <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-md border border-slate-800 font-mono">
                                  Lv.{comp.level}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCompare(comp.id);
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border transition-all ${
                                    compareIds.includes(comp.id)
                                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-indigo-400 hover:border-indigo-900'
                                  }`}
                                >
                                  {compareIds.includes(comp.id) ? '비교 중' : '비교'}
                                </button>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 mt-1 flex-wrap">
                                <span className={`font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${classInfo.badgeColor}`}>
                                  <Sparkles size={10} className="shrink-0" />
                                  <span>{classInfo.tierLabel}</span>
                                  {classInfo.className ? (
                                    <span className="opacity-90 border-l border-current/30 pl-1 font-extrabold">{classInfo.className}</span>
                                  ) : null}
                                </span>
                                <span>•</span>
                                <span>{comp.race}</span>
                                {!isMonster && (
                                  <>
                                    <span>•</span>
                                    <span>{comp.gender}</span>
                                    <span>•</span>
                                    <span>{displayAge}</span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCpDetailCompanion(comp);
                                  }}
                                  className="text-[10px] bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-300 font-mono font-bold px-1.5 py-0.5 rounded cursor-pointer hover:border-indigo-400 transition-all flex items-center gap-1"
                                  title="자세한 전투력 계산 및 순수 전투력 보기"
                                >
                                  <span>전투력: {getCompanionCP(comp).toLocaleString()}</span>
                                  <span className="text-[9px] text-amber-400 bg-amber-950/60 px-1 rounded border border-amber-500/40 font-sans">상세</span>
                                </span>
                                {comp.shinryokuType && (
                                  <span className="text-[10px] bg-slate-900 border border-indigo-950 text-indigo-400 font-bold px-1.5 py-0.5 rounded">
                                    신력: {comp.shinryokuType}
                                  </span>
                                )}
                                {renderCombatRoleBadge(comp)}
                                {renderSecondaryRoleBadge(comp)}
                              </div>
                              {comp.combatStyle && COMBAT_STYLE_CONFIG[comp.combatStyle] && (
                                <span className={`inline-block mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded border ${COMBAT_STYLE_CONFIG[comp.combatStyle].bgColor} ${COMBAT_STYLE_CONFIG[comp.combatStyle].borderColor} ${COMBAT_STYLE_CONFIG[comp.combatStyle].color}`}>
                                  {COMBAT_STYLE_CONFIG[comp.combatStyle].label}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 text-xs">
                            <div className="flex items-center gap-1 text-pink-400 font-mono font-bold bg-pink-950/30 px-2 py-0.5 rounded-lg border border-pink-900/40">
                              <Heart size={12} className="fill-current" /> {comp.affection}
                            </div>
                            <div className="flex items-center gap-1 text-blue-400 font-mono font-bold bg-blue-950/30 px-2 py-0.5 rounded-lg border border-blue-900/40">
                              <Shield size={12} /> {comp.loyalty}
                            </div>
                          </div>
                        </div>

                        {/* Bars */}
                        <div className="space-y-1.5">
                          <HealthBar 
                            current={comp.stats.hp} 
                            max={finalStats.maxHp} 
                            shield={comp.statusEffects?.find(s => s.name === '마나 쉴드')?.val || 0}
                          />
                          <HealthBar current={comp.stats.mp} max={finalStats.maxMp} color="bg-blue-600" />
                          <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                            <div className="h-full bg-amber-600 transition-all" style={{ width: `${Math.min(100, expPercent)}%` }}></div>
                          </div>
                          
                          {/* 루틴 표시 */}
                          {(() => {
                            const isPartyMember = (character.companions || []).some(c => c.id === comp.id);
                            if (isPartyMember) {
                              return (
                                <div className="text-[10px] sm:text-[11px] px-2.5 py-1.5 rounded-lg border font-medium flex items-center justify-between bg-indigo-950/40 border-indigo-800 text-indigo-300">
                                  <span>일과: <strong>파티 동행</strong></span>
                                  <span>플레이어와 함께 모험 진행 중</span>
                                </div>
                              );
                            }
                            const routine = getCompanionRoutine(character, comp.id);
                            return (
                              <div className={`text-[10px] sm:text-[11px] px-2.5 py-1.5 rounded-lg border font-medium flex items-center justify-between ${routine.colorClass}`}>
                                <span>일과: <strong>{routine.statusText}</strong></span>
                                <span>{routine.locationText} ({routine.activityText})</span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Action */}
                        <div className="pt-2 border-t border-slate-800/80 flex gap-1.5">
                          <button
                            onClick={() => onSelectCompanion(idx)}
                            className="flex-1 py-2 bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 hover:text-white rounded-xl text-xs font-bold border border-indigo-700/50 transition-all flex items-center justify-center gap-1.5 active:scale-98 shadow-sm"
                          >
                            <span>상세 정보 및 관리</span>
                          </button>
                          {(onDismissCompanion || onReturnMonsterToFarm || onUpdateCharacter) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isMonster) {
                                  handleReturnMonsterToFarm(comp, idx);
                                } else if (onDismissCompanion) {
                                  onDismissCompanion(idx);
                                }
                              }}
                              className={isMonster ? "px-3 py-2 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 hover:text-amber-100 rounded-xl text-xs font-bold border border-amber-800/80 hover:border-amber-600 transition-all flex items-center justify-center gap-1 shadow-sm" : "px-3 py-2 bg-slate-900/50 hover:bg-red-950/40 text-slate-400 hover:text-red-400 rounded-xl text-xs font-bold border border-slate-800 hover:border-red-900/40 transition-all flex items-center justify-center gap-1"}
                              title={isMonster ? "몬스터 사육소로 복귀" : "잠시 대기명단으로 보내기"}
                            >
                              <LogOut size={13} />
                              <span className="text-[11px]">{isMonster ? '사육소 복귀' : '헤어지기'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500 space-y-3 bg-slate-950/30 rounded-2xl border border-dashed border-slate-800">
                  <Users size={36} className="mx-auto opacity-30 text-indigo-400" />
                  <p className="text-sm font-medium">현재 파티에 배속된 동료가 없습니다.</p>
                  <p className="text-xs text-slate-600">대기 명단에서 동료를 파티에 합류시키거나 주점/이벤트를 통해 영입하세요.</p>
                </div>
              )}
            </div>
            );
          })()}

          {tab === 'inactive' && (() => {
            const uniqueJobs = Array.from(new Set((inactiveCompanions || []).filter(c => !c.isDead).map(c => c.job || '기타')));
            
            return (
              <div>
                {/* 분류 및 정렬 컨트롤러 바 */}
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 mb-4 flex flex-col gap-3.5 shrink-0 animate-in fade-in duration-150">
                  {/* 정렬 방식 바 (최상위 배치) */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles size={12} className="text-amber-500" />
                      <span>정렬 방식 선택</span>
                    </div>
                    <div className="flex flex-wrap sm:flex-nowrap gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
                      {[
                        { key: 'default', label: '기본' },
                        { key: 'level', label: '레벨순' },
                        { key: 'combatPower', label: '전투력순' },
                        { key: 'shinryoku', label: '신력계통' },
                        { key: 'job', label: '직업순' },
                        { key: 'combatStyle', label: '전투계열' },
                        { key: 'combatRole', label: '전투역할' },
                        { key: 'custom', label: '커스텀순' },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setSortBy(opt.key as any)}
                          className={`flex-1 sm:flex-initial px-2 py-1.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-black transition-all text-center whitespace-nowrap ${
                            sortBy === opt.key
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 정렬 방식에 따라 하단에 다이내믹 노출되는 세부 제어기 */}
                  
                  {/* (1) 레벨순 또는 전투력순 선택 시: 오름차순/내림차순 토글 노출 */}
                  {(sortBy === 'level' || sortBy === 'combatPower' || sortBy === 'custom') && (
                    <div className="flex items-center justify-between bg-slate-900/40 border border-slate-850 p-2.5 rounded-xl gap-3 animate-in slide-in-from-top-1 duration-200">
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Filter size={12} className="text-indigo-400" />
                        정렬 방향 설정
                      </span>
                      <div className="flex gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => setSortOrder('desc')}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                            sortOrder === 'desc'
                              ? 'bg-indigo-600/90 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          내림차순 ↓ (높은순)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSortOrder('asc')}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                            sortOrder === 'asc'
                              ? 'bg-indigo-600/90 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          오름차순 ↑ (낮은순)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* (2) 신력계통 정렬 선택 시: 어떤 계통만 필터링할 것인지 칩 리스트 노출 */}
                  {sortBy === 'shinryoku' && (
                    <div className="w-full animate-in slide-in-from-top-1 duration-200">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Filter size={12} className="text-indigo-400" />
                        <span>어떤 계통만 볼 것인지 선택 (신력 필터)</span>
                      </div>
                      <div className="flex gap-1.5 overflow-x-auto pb-1.5 whitespace-nowrap max-w-full no-scrollbar">
                        <button
                          type="button"
                          onClick={() => setShinryokuFilter('all')}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            shinryokuFilter === 'all'
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                              : 'bg-slate-900 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          전체 신력 ({inactiveCompanions.length}명)
                        </button>
                        {shinryokuOptions.map(shType => {
                          const count = inactiveCompanions.filter(c => c.shinryokuType === shType).length;
                          return (
                            <button
                              key={shType}
                              type="button"
                              onClick={() => setShinryokuFilter(shType)}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                shinryokuFilter === shType
                                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                                  : 'bg-slate-900 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
                              }`}
                            >
                              {shType} ({count}명)
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* (3) 직업순 정렬 선택 시: 현재 분류처럼 직업별 기준분류 생겨서 직업별 조회 지원 */}
                  {sortBy === 'job' && (
                    <div className="w-full animate-in slide-in-from-top-1 duration-200">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Filter size={12} className="text-indigo-400" />
                        <span>직업군 기준 분류 (클릭하여 필터링)</span>
                      </div>
                      <div className="flex gap-1.5 overflow-x-auto pb-1.5 whitespace-nowrap max-w-full no-scrollbar">
                        <button
                          type="button"
                          onClick={() => setClassFilter('all')}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            classFilter === 'all'
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                              : 'bg-slate-900 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          전체 직업 ({inactiveCompanions.length}명)
                        </button>
                        {uniqueJobs.map(jobName => {
                          const count = inactiveCompanions.filter(c => (c.job || '기타') === jobName).length;
                          return (
                            <button
                              key={jobName}
                              type="button"
                              onClick={() => setClassFilter(jobName)}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                classFilter === jobName
                                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                                  : 'bg-slate-900 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
                              }`}
                            >
                              {jobName} ({count}명)
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  
                  {/* (5) 커스텀 동료 정렬 선택 시 필터링 */}
                  {sortBy === 'custom' && (
                    <div className="w-full animate-in slide-in-from-top-1 duration-200">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Filter size={12} className="text-purple-400" />
                        <span>커스텀 여부 기준 필터</span>
                      </div>
                      <div className="flex gap-1.5 overflow-x-auto pb-1.5 whitespace-nowrap max-w-full no-scrollbar">
                        <button
                          type="button"
                          onClick={() => setCustomFilter('all')}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            customFilter === 'all'
                              ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20'
                              : 'bg-slate-900 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          전체 동료 ({inactiveCompanions.length}명)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomFilter('custom')}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            customFilter === 'custom'
                              ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20'
                              : 'bg-slate-900 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          ✨ 커스텀 동료 ({inactiveCompanions.filter(c => c.isCustom).length}명)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomFilter('normal')}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            customFilter === 'normal'
                              ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20'
                              : 'bg-slate-900 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          👤 일반 동료 ({inactiveCompanions.filter(c => !c.isCustom).length}명)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* (4) 전투계열 정렬 선택 시: 전투계열별 기준분류 및 조회 지원 */}
                  {sortBy === 'combatStyle' && (
                    <div className="w-full animate-in slide-in-from-top-1 duration-200">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Filter size={12} className="text-indigo-400" />
                        <span>전투 계열 기준 분류 (클릭하여 필터링)</span>
                      </div>
                      <div className="flex gap-1.5 overflow-x-auto pb-1.5 whitespace-nowrap max-w-full no-scrollbar">
                        <button
                          type="button"
                          onClick={() => setCombatStyleFilter('all')}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            combatStyleFilter === 'all'
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                              : 'bg-slate-900 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          전체 계열 ({inactiveCompanions.length}명)
                        </button>
                        {combatStyleOptions.map(styleKey => {
                          const label = COMBAT_STYLE_CONFIG[styleKey as any]?.label || styleKey;
                          const count = inactiveCompanions.filter(c => c.combatStyle === styleKey).length;
                          return (
                            <button
                              key={styleKey}
                              type="button"
                              onClick={() => setCombatStyleFilter(styleKey)}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                combatStyleFilter === styleKey
                                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                                  : 'bg-slate-900 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
                              }`}
                            >
                              {label} ({count}명)
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* (5) 전투역할 정렬 선택 시: 역할별 기준분류 및 조회 지원 */}
                  {sortBy === 'combatRole' && (
                    <div className="w-full animate-in slide-in-from-top-1 duration-200">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Filter size={12} className="text-indigo-400" />
                        <span>전투 역할 기준 분류 (클릭하여 필터링)</span>
                      </div>
                      <div className="flex gap-1.5 overflow-x-auto pb-1.5 whitespace-nowrap max-w-full no-scrollbar">
                        <button
                          type="button"
                          onClick={() => setCombatRoleFilter('all')}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            combatRoleFilter === 'all'
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                              : 'bg-slate-900 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          전체 역할 ({inactiveCompanions.length}명)
                        </button>
                        {[
                          { key: '역할없음', label: '역할없음' },
                          { key: '딜러', label: '딜러' },
                          { key: '탱커', label: '탱커' },
                          { key: '서포터', label: '서포터' },
                          { key: '올라운더', label: '올라운더' }
                        ].map(role => {
                          const count = inactiveCompanions.filter(c => getCompanionCombatRole(c) === role.key).length;
                          return (
                            <button
                              key={role.key}
                              type="button"
                              onClick={() => setCombatRoleFilter(role.key)}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                combatRoleFilter === role.key
                                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                                  : 'bg-slate-900 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
                              }`}
                            >
                              {role.label} ({count}명)
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {processedInactiveCompanions.length > 0 ? (
                  <div className={`grid gap-3.5 sm:gap-4 ${isMobile || size.width < 580 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {processedInactiveCompanions.map(({ comp, originalIdx }) => {
                      const isMonster = !!(comp.isMonster || comp.monsterData || comp.race === '몬스터' || comp.race?.includes('Monster'));
                      const { finalStats } = calculateFinalStats(comp);
                      const classInfo = getCompanionClassInfo(comp);
                      const displayAge = (currentYear !== undefined && comp.birthYear !== undefined) 
                        ? (currentYear - comp.birthYear) + "세" 
                        : comp.age;

                      const defaultVisualUrl = comp.defaultVisualUrl || generateDefaultVisualUrl(comp.name, comp.nation || '기타', comp.race, comp.gender);
                      const displayVisualUrl = getVisualUrlByJob(comp.job, comp.gender, comp.visualUrl || comp.monsterData?.visualUrl || defaultVisualUrl);
                      const isDispatched = isCompanionDispatched(comp.id);
                      const age = parseInt(displayAge.replace(/[^0-9]/g, '')) || 0;
                      const isChild = comp.classType?.includes('자녀') || comp.classType?.includes('Child');
                      const routine = getCompanionRoutine(character, comp.id);
                      const canRecruit = (!isChild || age >= 11) && !isDispatched && !comp.isDead && !isPartyFull && routine.canJoin;
                      const combatPower = getCompanionCP(comp);

                      return (
                        <div
                          key={`inactive-${comp.id || originalIdx}`}
                          className="bg-slate-950/70 border border-dashed border-slate-700 hover:border-slate-500 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 transition-all flex flex-col justify-between space-y-2 sm:space-y-3 group"
                        >
                          {/* Top Info */}
                          <div className="flex items-start justify-between gap-2 sm:gap-3">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div 
                                onClick={() => displayVisualUrl && onZoom(displayVisualUrl)}
                                className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl border border-slate-700 overflow-hidden shrink-0 cursor-zoom-in hover:border-indigo-400 transition-all"
                              >
                                <img src={displayVisualUrl} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                  <h3 className="text-xs sm:text-sm font-bold text-slate-300">
                                    {comp.name}
                                  </h3>
                                  {comp.isCustom && (
                                    <span className="text-[9px] sm:text-[10px] font-black bg-purple-950/90 text-purple-300 border border-purple-500/60 px-1.5 py-0.2 sm:py-0.5 rounded shadow-sm shrink-0 flex items-center gap-0.5" title="커스텀 동료">
                                      ✨ 커스텀
                                    </span>
                                  )}
                                  {((comp.statPoints || 0) > 0) && (
                                    <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full animate-bounce shadow" title={`미사용 스탯포인트 ${comp.statPoints}P`}>
                                      +
                                    </span>
                                  )}
                                  {renderRelationBadge(comp)}
                                  {onToggleFavoriteCompanion && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleFavoriteCompanion(comp.id);
                                      }}
                                      className="p-1 hover:bg-slate-800 rounded text-amber-400 hover:text-amber-300 transition-colors"
                                      title="즐겨찾기 토글"
                                    >
                                      <Star size={14} className={comp.favorite ? "fill-amber-400 text-amber-400" : "text-slate-500 hover:text-amber-400"} />
                                    </button>
                                  )}
                                  <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-md border border-slate-800 font-mono">
                                    Lv.{comp.level}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleCompare(comp.id);
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border transition-all ${
                                      compareIds.includes(comp.id)
                                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-indigo-400 hover:border-indigo-900'
                                    }`}
                                  >
                                    {compareIds.includes(comp.id) ? '비교 중' : '비교'}
                                  </button>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 mt-1 flex-wrap">
                                  <span className={`font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${classInfo.badgeColor}`}>
                                    <Sparkles size={10} className="shrink-0" />
                                    <span>{classInfo.tierLabel}</span>
                                    <span className="opacity-90 border-l border-current/30 pl-1 font-extrabold">{classInfo.className}</span>
                                  </span>
                                  <span>•</span>
                                  <span>{comp.race}</span>
                                  {!isMonster && (
                                    <>
                                      <span>•</span>
                                      <span>{comp.gender}</span>
                                      <span>•</span>
                                      <span>{displayAge}</span>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCpDetailCompanion(comp);
                                    }}
                                    className="text-[10px] bg-slate-900 hover:bg-amber-950/50 border border-slate-700 hover:border-amber-500/50 text-amber-400 font-mono font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all flex items-center gap-1"
                                    title="자세한 전투력 계산 및 순수 전투력 보기"
                                  >
                                    <span>전투력: {combatPower.toLocaleString()}</span>
                                    <span className="text-[9px] text-amber-400 bg-amber-950/60 px-1 rounded border border-amber-500/40 font-sans">상세</span>
                                  </span>
                                  {comp.shinryokuType && (
                                    <span className="text-[10px] bg-slate-900 border border-indigo-950 text-indigo-400 font-bold px-1.5 py-0.5 rounded">
                                      신력: {comp.shinryokuType}
                                    </span>
                                  )}
                                  {renderCombatRoleBadge(comp)}
                                  {renderSecondaryRoleBadge(comp)}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1.5 text-xs shrink-0">
                              <div className="flex items-center gap-1 text-pink-400 font-mono font-bold bg-pink-950/30 px-2 py-0.5 rounded-lg border border-pink-900/40">
                                <Heart size={12} className="fill-current" /> {comp.affection}
                              </div>
                              <div className="flex items-center gap-1 text-blue-400 font-mono font-bold bg-blue-950/30 px-2 py-0.5 rounded-lg border border-blue-900/40">
                                <Shield size={12} /> {comp.loyalty}
                              </div>
                              {comp.isDead ? (
                                <span className="text-[10px] text-red-400 bg-red-950/50 px-2 py-0.5 rounded-lg border border-red-800 font-bold mt-0.5">
                                  사망
                                </span>
                              ) : isDispatched ? (
                                <div className="flex flex-col items-end gap-0.5 mt-0.5">
                                  <span className="text-[10px] text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded-lg border border-amber-800 font-bold flex items-center gap-1">
                                    <Clock size={11} /> 업무 중
                                  </span>
                                  {getCompanionWorkStatus(comp.id) && (
                                    <span className="text-[9px] text-amber-300 font-medium">
                                      {getCompanionWorkStatus(comp.id)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 mt-0.5">
                                  대기 중
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 루틴 표시 */}
                          {(() => {
                            const isPartyMember = (character.companions || []).some(c => c.id === comp.id);
                            if (isPartyMember) {
                              return (
                                <div className="text-[10px] sm:text-[11px] px-2.5 py-1.5 rounded-lg border font-medium flex items-center justify-between bg-indigo-950/40 border-indigo-800 text-indigo-300">
                                  <span>일과: <strong>파티 동행</strong></span>
                                  <span>플레이어와 함께 모험 진행 중</span>
                                </div>
                              );
                            }
                            return (
                              <div className={`text-[10px] sm:text-[11px] px-2.5 py-1.5 rounded-lg border font-medium flex items-center justify-between ${routine.colorClass}`}>
                                <span>일과: <strong>{routine.statusText}</strong></span>
                                <span>{routine.locationText} ({routine.activityText})</span>
                              </div>
                            );
                          })()}

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                            {onRejoinCompanion && (
                              <button
                                onClick={() => onRejoinCompanion(originalIdx)}
                                disabled={!canRecruit}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                                  canRecruit
                                    ? 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border-emerald-700/60 shadow-sm active:scale-98'
                                    : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                                }`}
                              >
                                <UserPlus size={13} />
                                <span>{isDispatched ? '업무 중 불가' : !routine.canJoin ? '취침 중 합류 불가' : isPartyFull ? '파티 가득 참' : comp.isDead ? '사망' : '파티 합류'}</span>
                              </button>
                            )}
                            {onPermanentlyDismissCompanion && (
                              <button
                                onClick={() => setDismissConfirmIdx(originalIdx)}
                                className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-xl text-xs font-bold border border-red-900/50 transition-colors flex items-center gap-1"
                                title="대원에서 영구 삭제"
                              >
                                <Trash2 size={13} />
                                <span>제외</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-500 space-y-3 bg-slate-950/30 rounded-2xl border border-dashed border-slate-800">
                    <LogOut size={36} className="mx-auto opacity-30 text-indigo-400" />
                    <p className="text-sm font-medium">조건에 만족하는 대기 동료가 없습니다.</p>
                  </div>
                )}
              </div>
            );
          })()}

          {tab === 'favorite' && (() => {
            let favoriteCompanions = [
              ...character.companions.map((comp, idx) => ({ comp, idx, isActive: true })),
              ...(inactiveCompanions || []).map((comp, idx) => ({ comp, idx, isActive: false }))
            ].filter(item => item.comp.favorite && !item.comp.isDead);

            if (favoriteSortBy === 'combatPower') {
              favoriteCompanions.sort((a, b) => getCompanionCP(b.comp) - getCompanionCP(a.comp));
            } else if (favoriteSortBy === 'level') {
              favoriteCompanions.sort((a, b) => b.comp.level - a.comp.level);
            }

            return (
              <div>
                {/* 즐겨찾기 정렬 헤더 바 */}
                {favoriteCompanions.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-3.5 bg-slate-950/60 p-2.5 sm:p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                      <Star size={14} className="fill-amber-400 text-amber-400" />
                      <span>즐겨찾기 동료 ({favoriteCompanions.length}명)</span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setFavoriteSortBy('combatPower')}
                        className={`flex-1 sm:flex-initial px-2.5 py-1 rounded text-[11px] font-bold transition-all text-center ${
                          favoriteSortBy === 'combatPower'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        전투력순
                      </button>
                      <button
                        type="button"
                        onClick={() => setFavoriteSortBy('level')}
                        className={`flex-1 sm:flex-initial px-2.5 py-1 rounded text-[11px] font-bold transition-all text-center ${
                          favoriteSortBy === 'level'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        레벨순
                      </button>
                      <button
                        type="button"
                        onClick={() => setFavoriteSortBy('default')}
                        className={`flex-1 sm:flex-initial px-2.5 py-1 rounded text-[11px] font-bold transition-all text-center ${
                          favoriteSortBy === 'default'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        기본순
                      </button>
                    </div>
                  </div>
                )}

                {favoriteCompanions.length > 0 ? (
                  <div className={`grid gap-3.5 sm:gap-4 ${isMobile || size.width < 580 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {favoriteCompanions.map(({ comp, idx: originalIdx, isActive }) => {
                      const isMonster = !!(comp.isMonster || comp.monsterData || comp.race === '몬스터' || comp.race?.includes('Monster'));
                      const { finalStats } = calculateFinalStats(comp);
                      const classInfo = getCompanionClassInfo(comp);
                      const displayAge = (currentYear !== undefined && comp.birthYear !== undefined) 
                        ? (currentYear - comp.birthYear) + "세" 
                        : comp.age;

                      const defaultVisualUrl = comp.defaultVisualUrl || generateDefaultVisualUrl(comp.name, comp.nation || '기타', comp.race, comp.gender);
                      const displayVisualUrl = getVisualUrlByJob(comp.job, comp.gender, comp.visualUrl || comp.monsterData?.visualUrl || defaultVisualUrl);
                      const expPercent = comp.maxExp > 0 ? (comp.currentExp / comp.maxExp) * 100 : 0;
                      
                      const isDispatched = !isActive && isCompanionDispatched(comp.id);
                      const age = parseInt(displayAge.replace(/[^0-9]/g, '')) || 0;
                      const isChild = comp.classType?.includes('자녀') || comp.classType?.includes('Child');
                      const routine = getCompanionRoutine(character, comp.id);
                      const canRecruit = !isActive && (!isChild || age >= 11) && !isDispatched && !comp.isDead && !isPartyFull && routine.canJoin;

                      return (
                        <div
                          key={`favorite-${comp.id || originalIdx}-${isActive ? 'active' : 'inactive'}`}
                          className={`bg-slate-950/70 border rounded-xl sm:rounded-2xl p-2.5 sm:p-4 transition-all shadow-md flex flex-col justify-between space-y-2 sm:space-y-3 group ${
                            isActive ? 'border-indigo-500/30 hover:border-indigo-500/50' : 'border-dashed border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          {/* Top Info */}
                          <div className="flex items-start justify-between gap-2 sm:gap-3">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div 
                                onClick={() => displayVisualUrl && onZoom(displayVisualUrl)}
                                className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl overflow-hidden shrink-0 cursor-zoom-in transition-all ${
                                  isActive ? 'border-2 border-indigo-500/30 hover:border-indigo-400 shadow-inner' : 'border border-slate-700 hover:border-indigo-400'
                                }`}
                              >
                                <img src={displayVisualUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                  <h3 className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                                    {comp.name}
                                  </h3>
                                  {comp.isCustom && (
                                    <span className="text-[9px] sm:text-[10px] font-black bg-purple-950/90 text-purple-300 border border-purple-500/60 px-1.5 py-0.2 sm:py-0.5 rounded shadow-sm shrink-0 flex items-center gap-0.5" title="커스텀 동료">
                                      ✨ 커스텀
                                    </span>
                                  )}
                                  {((comp.statPoints || 0) > 0) && (
                                    <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full animate-bounce shadow" title={`미사용 스탯포인트 ${comp.statPoints}P`}>
                                      +
                                    </span>
                                  )}
                                  {renderRelationBadge(comp)}
                                  {onToggleFavoriteCompanion && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleFavoriteCompanion(comp.id);
                                      }}
                                      className="p-1 hover:bg-slate-800 rounded text-amber-400 hover:text-amber-300 transition-colors"
                                      title="즐겨찾기 토글"
                                    >
                                      <Star size={14} className="fill-amber-400 text-amber-400" />
                                    </button>
                                  )}
                                  <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-md border border-slate-800 font-mono">
                                    Lv.{comp.level}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleCompare(comp.id);
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border transition-all ${
                                      compareIds.includes(comp.id)
                                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-indigo-400 hover:border-indigo-900'
                                    }`}
                                  >
                                    {compareIds.includes(comp.id) ? '비교 중' : '비교'}
                                  </button>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 mt-1 flex-wrap">
                                  <span className={`font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${classInfo.badgeColor}`}>
                                    <Sparkles size={10} className="shrink-0" />
                                    <span>{classInfo.tierLabel}</span>
                                    <span className="opacity-90 border-l border-current/30 pl-1 font-extrabold">{classInfo.className}</span>
                                  </span>
                                  <span>•</span>
                                  <span>{comp.race}</span>
                                  {!isMonster && (
                                    <>
                                      <span>•</span>
                                      <span>{comp.gender}</span>
                                      <span>•</span>
                                      <span>{displayAge}</span>
                                    </>
                                  )}
                                </div>
                                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                  <span 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCpDetailCompanion(comp);
                                    }}
                                    className="text-[10px] bg-slate-900 hover:bg-amber-950/50 border border-slate-700 hover:border-amber-500/50 text-amber-400 font-mono font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all flex items-center gap-1"
                                    title="자세한 전투력 계산 및 순수 전투력 보기"
                                  >
                                    <span>전투력: {getCompanionCP(comp).toLocaleString()}</span>
                                    <span className="text-[9px] text-amber-400 bg-amber-950/60 px-1 rounded border border-amber-500/40 font-sans">상세</span>
                                  </span>
                                  {comp.shinryokuType && (
                                    <span className="text-[10px] bg-slate-900 border border-indigo-950 text-indigo-400 font-bold px-1.5 py-0.5 rounded">
                                      신력: {comp.shinryokuType}
                                    </span>
                                  )}
                                  {renderCombatRoleBadge(comp)}
                                  {renderSecondaryRoleBadge(comp)}
                                  {isActive ? (
                                    <span className="text-[9px] text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-800 font-bold">
                                      파티 배속 중
                                    </span>
                                  ) : comp.isDead ? (
                                    <span className="text-[9px] text-red-400 bg-red-950/50 px-2 py-0.5 rounded border border-red-800 font-bold">
                                      사망
                                    </span>
                                  ) : isDispatched ? (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[9px] text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800 font-bold flex items-center gap-1">
                                        <Clock size={10} /> 업무 중
                                      </span>
                                      {getCompanionWorkStatus(comp.id) && (
                                        <span className="text-[9px] text-amber-300 font-semibold bg-slate-900/60 px-1.5 py-0.5 rounded border border-amber-950/50">
                                          {getCompanionWorkStatus(comp.id)}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[9px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                      대기 중
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1.5 text-xs">
                              <div className="flex items-center gap-1 text-pink-400 font-mono font-bold bg-pink-950/30 px-2 py-0.5 rounded-lg border border-pink-900/40">
                                <Heart size={12} className="fill-current" /> {comp.affection}
                              </div>
                              <div className="flex items-center gap-1 text-blue-400 font-mono font-bold bg-blue-950/30 px-2 py-0.5 rounded-lg border border-blue-900/40">
                                <Shield size={12} /> {comp.loyalty}
                              </div>
                            </div>
                          </div>

                          {/* Bars */}
                          <div className="space-y-1.5">
                            <HealthBar 
                              current={comp.stats.hp} 
                              max={finalStats.maxHp} 
                              shield={comp.statusEffects?.find(s => s.name === '마나 쉴드')?.val || 0}
                            />
                            <HealthBar current={comp.stats.mp} max={finalStats.maxMp} color="bg-blue-600" />
                            <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                              <div className="h-full bg-amber-600 transition-all" style={{ width: `${Math.min(100, expPercent)}%` }}></div>
                            </div>
                          </div>

                          {/* 루틴 표시 */}
                          {(() => {
                            const isPartyMember = (character.companions || []).some(c => c.id === comp.id);
                            if (isPartyMember) {
                              return (
                                <div className="text-[10px] sm:text-[11px] px-2.5 py-1.5 rounded-lg border font-medium flex items-center justify-between bg-indigo-950/40 border-indigo-800 text-indigo-300">
                                  <span>일과: <strong>파티 동행</strong></span>
                                  <span>플레이어와 함께 모험 진행 중</span>
                                </div>
                              );
                            }
                            return (
                              <div className={`text-[10px] sm:text-[11px] px-2.5 py-1.5 rounded-lg border font-medium flex items-center justify-between ${routine.colorClass}`}>
                                <span>일과: <strong>{routine.statusText}</strong></span>
                                <span>{routine.locationText} ({routine.activityText})</span>
                              </div>
                            );
                          })()}

                          {/* Actions */}
                          <div className="pt-2 border-t border-slate-800/80">
                            {isActive ? (
                              <button
                                onClick={() => onSelectCompanion(originalIdx)}
                                className="w-full py-2 bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 hover:text-white rounded-xl text-xs font-bold border border-indigo-700/50 transition-all flex items-center justify-center gap-1.5 active:scale-98 shadow-sm"
                              >
                                <span>상세 정보 및 관리</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                {onRejoinCompanion && (
                                  <button
                                    onClick={() => onRejoinCompanion(originalIdx)}
                                    disabled={!canRecruit}
                                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                                      canRecruit
                                        ? 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border-emerald-700/60 shadow-sm active:scale-98'
                                        : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                                    }`}
                                  >
                                    <UserPlus size={13} />
                                    <span>{isDispatched ? '업무 중 불가' : !routine.canJoin ? '취침 중 합류 불가' : isPartyFull ? '파티 가득 참' : comp.isDead ? '사망' : '파티 합류'}</span>
                                  </button>
                                )}
                                {onPermanentlyDismissCompanion && (
                                  <button
                                    onClick={() => setDismissConfirmIdx(originalIdx)}
                                    className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-xl text-xs font-bold border border-red-900/50 transition-colors flex items-center gap-1"
                                    title="대원에서 영구 삭제"
                                  >
                                    <Trash2 size={13} />
                                    <span>제외</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-500 space-y-3 bg-slate-950/30 rounded-2xl border border-dashed border-slate-800">
                    <Star size={36} className="mx-auto opacity-30 text-amber-400 animate-pulse" />
                    <p className="text-sm font-medium">즐겨찾기한 동료가 없습니다.</p>
                    <p className="text-xs text-slate-600">동료 카드의 별표(<Star size={11} className="inline fill-current text-amber-500" />)를 클릭하여 즐겨찾기에 등록해 보세요.</p>
                  </div>
                )}
              </div>
            );
          })()}

        </div>

        {/* Floating Bottom Comparison Bar */}
        {compareIds.length > 0 && (
          <div className="bg-indigo-950/95 border-t border-b border-indigo-500/40 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-500/30">
                <Sparkles size={16} className="animate-pulse" />
              </div>
              <div className="text-xs text-slate-200 flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-indigo-400">동료 스탯 비교기</span>
                <span className="text-slate-500">|</span>
                {compareIds.map((id, index) => {
                  const comp = character.companions.find(c => c.id === id) || inactiveCompanions.find(c => c.id === id);
                  return (
                    <span key={id} className="flex items-center gap-1">
                      {index > 0 && <span className="text-indigo-500 font-extrabold mx-1">VS</span>}
                      <span className="text-white font-semibold bg-slate-900 px-2 py-0.5 rounded border border-indigo-500/20">{comp?.name || '동료'}</span>
                    </span>
                  );
                })}
                {compareIds.length < 2 && (
                  <span className="text-indigo-300/80 ml-2 animate-pulse">(한 명 더 선택하세요)</span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setCompareIds([])}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-xl border border-slate-800 transition-colors"
              >
                선택 해제
              </button>
              <button
                type="button"
                onClick={() => setShowCompareModal(true)}
                disabled={compareIds.length < 2}
                className={`flex-1 sm:flex-none px-5 py-1.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md transition-all ${
                  compareIds.length === 2
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 cursor-pointer active:scale-95'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <span>📊 스탯 비교하기</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
          >
            확인 및 닫기
          </button>
        </div>
        {/* 우측 하단 크기 조절 손잡이 */}
        {!isMobile && (
          <div 
            onMouseDown={handleResizeMouseDown}
            onTouchStart={handleResizeTouchStart}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50 flex items-end justify-end pointer-events-auto"
            title="드래그하여 크기 조절"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" className="text-indigo-500/60 fill-current m-0.5 pointer-events-none">
              <path d="M10,0 L0,10 L10,10 Z" />
            </svg>
          </div>
        )}

      </div>

      {/* 📊 동료 스탯 정밀 비교 모달 (모바일 최적화) */}
      {showCompareModal && (() => {
        const comp1 = compareIds[0] ? (character.companions.find(c => c.id === compareIds[0]) || inactiveCompanions.find(c => c.id === compareIds[0])) : null;
        const comp2 = compareIds[1] ? (character.companions.find(c => c.id === compareIds[1]) || inactiveCompanions.find(c => c.id === compareIds[1])) : null;

        if (!comp1 || !comp2) return null;

        const { finalStats: fStats1 } = calculateFinalStats(comp1, { excludeTemporaryBuffs: true });
        const { finalStats: fStats2 } = calculateFinalStats(comp2, { excludeTemporaryBuffs: true });

        const getCombatPower = (c: Companion, fs: any) => {
          const hp = fs.maxHp || c.stats.hp || 100;
          const mp = fs.maxMp || c.stats.mp || 50;
          const str = fs.str || c.stats.str || 10;
          const agi = fs.agi || c.stats.agi || 10;
          const int = fs.int || c.stats.int || 10;
          const wis = fs.wis || c.stats.wis || 10;
          const def = fs.def || c.stats.def || 10;
          const ctrl = fs.ctrl || c.stats.ctrl || 10;
          return Math.floor(hp * 0.1 + mp * 0.1 + (str + agi + int + wis + def + ctrl) * 5);
        };

        const cp1 = getCombatPower(comp1, fStats1);
        const cp2 = getCombatPower(comp2, fStats2);
        const cpDiff = cp1 - cp2;
        const cpMax = Math.max(cp1, cp2, 1);

        const statsList = [
          { key: 'level', label: '레벨' },
          { key: 'maxHp', label: '최대 체력' },
          { key: 'maxMp', label: '최대 마나' },
          { key: 'str', label: '근력' },
          { key: 'agi', label: '민첩' },
          { key: 'int', label: '지능' },
          { key: 'wis', label: '지혜' },
          { key: 'def', label: '방어력' },
          { key: 'ctrl', label: '제어력' },
          { key: 'affection', label: '호감도' },
          { key: 'loyalty', label: '충성도' },
        ];

        const defaultVisualUrl1 = comp1.defaultVisualUrl || generateDefaultVisualUrl(comp1.name, comp1.nation || '기타', comp1.race, comp1.gender);
        const displayVisualUrl1 = getVisualUrlByJob(comp1.job, comp1.gender, comp1.visualUrl || comp1.monsterData?.visualUrl || defaultVisualUrl1);

        const defaultVisualUrl2 = comp2.defaultVisualUrl || generateDefaultVisualUrl(comp2.name, comp2.nation || '기타', comp2.race, comp2.gender);
        const displayVisualUrl2 = getVisualUrlByJob(comp2.job, comp2.gender, comp2.visualUrl || comp2.monsterData?.visualUrl || defaultVisualUrl2);

        return (
          <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/95 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-slate-950 border border-indigo-500/50 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              
              {/* Header */}
              <div className="bg-slate-900/90 px-4 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/40 font-black">
                    COMPARE
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-100">동료 능력치 정밀 비교</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCompareModal(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                
                {/* 1. 두 동료 프로필 헤더 */}
                <div className="grid grid-cols-7 items-center bg-slate-900/50 border border-slate-800 rounded-2xl p-3.5">
                  
                  {/* Companion 1 (Left, Blue) */}
                  <div className="col-span-3 flex flex-col items-center text-center space-y-1">
                    <div className="w-14 h-14 rounded-full border-2 border-sky-500 overflow-hidden shadow-md">
                      <img src={displayVisualUrl1} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs font-bold text-sky-400 truncate max-w-[90px] block">{comp1.name}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{comp1.classType || '동료'}</span>
                  </div>

                  {/* VS center badge */}
                  <div className="col-span-1 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-black text-indigo-400 bg-indigo-950/60 w-8 h-8 rounded-full border border-indigo-500/30 flex items-center justify-center shadow-inner">
                      VS
                    </span>
                  </div>

                  {/* Companion 2 (Right, Amber) */}
                  <div className="col-span-3 flex flex-col items-center text-center space-y-1">
                    <div className="w-14 h-14 rounded-full border-2 border-amber-500 overflow-hidden shadow-md">
                      <img src={displayVisualUrl2} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs font-bold text-amber-400 truncate max-w-[90px] block">{comp2.name}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{comp2.classType || '동료'}</span>
                  </div>

                </div>

                {/* 2. 종합 전투력 (Combat Power) */}
                <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 shadow-md">
                  <div className="text-center text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">Estimated Combat Power</div>
                  <div className="flex justify-between items-center mb-2.5">
                    <span className={`text-sm font-black font-mono ${cpDiff > 0 ? 'text-sky-400' : 'text-slate-400'}`}>
                      CP {cp1.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-indigo-300">종합 전투력</span>
                    <span className={`text-sm font-black font-mono ${cpDiff < 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      CP {cp2.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden relative">
                      <div 
                        className="h-full bg-gradient-to-r from-sky-600 to-sky-400 rounded-full transition-all duration-500" 
                        style={{ width: `${(cp1 / cpMax) * 100}%` }}
                      />
                    </div>
                    <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden relative">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500" 
                        style={{ width: `${(cp2 / cpMax) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-center text-[10px] text-slate-300 mt-2 leading-relaxed">
                    {cpDiff > 0 ? (
                      <span><strong className="text-sky-400 font-bold">{comp1.name}</strong>이(가) 전투력이 <strong className="text-green-400 font-bold">{cpDiff.toLocaleString()}</strong> 더 높습니다.</span>
                    ) : cpDiff < 0 ? (
                      <span><strong className="text-amber-400 font-bold">{comp2.name}</strong>이(가) 전투력이 <strong className="text-green-400 font-bold">{Math.abs(cpDiff).toLocaleString()}</strong> 더 높습니다.</span>
                    ) : (
                      <span>두 동료의 종합 전투력이 완벽하게 대등합니다.</span>
                    )}
                  </div>
                </div>

                {/* 3. 스탯별 리스트 (각 스탯 카드) */}
                <div className="space-y-2.5">
                  {statsList.map((stat) => {
                    const val1 = stat.key === 'level' 
                      ? comp1.level 
                      : stat.key === 'affection' 
                        ? comp1.affection 
                        : stat.key === 'loyalty' 
                          ? comp1.loyalty 
                          : fStats1[stat.key] || 0;

                    const val2 = stat.key === 'level' 
                      ? comp2.level 
                      : stat.key === 'affection' 
                        ? comp2.affection 
                        : stat.key === 'loyalty' 
                          ? comp2.loyalty 
                          : fStats2[stat.key] || 0;

                    const diff = val1 - val2;
                    const maxVal = Math.max(val1, val2, 1);

                    return (
                      <div key={stat.key} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
                          <div className="flex items-center gap-1 min-w-[70px]">
                            <span className={diff > 0 ? 'text-sky-400 font-extrabold font-mono' : 'text-slate-400 font-mono'}>
                              {val1.toLocaleString()}
                            </span>
                            {diff > 0 && (
                              <span className="text-[9px] text-green-400 font-bold bg-green-950/40 px-1.5 py-0.2 rounded border border-green-900/30 font-mono">
                                {`+${diff}`}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold tracking-wide">{stat.label}</span>
                          <div className="flex items-center gap-1 min-w-[70px] justify-end">
                            {diff < 0 && (
                              <span className="text-[9px] text-green-400 font-bold bg-green-950/40 px-1.5 py-0.2 rounded border border-green-900/30 font-mono">
                                {`+${Math.abs(diff)}`}
                              </span>
                            )}
                            <span className={diff < 0 ? 'text-amber-400 font-extrabold font-mono' : 'text-slate-400 font-mono'}>
                              {val2.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        
                        {/* Stacked Comparative Bars */}
                        <div className="space-y-1">
                          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden relative">
                            <div 
                              className="h-full bg-sky-500 rounded-full transition-all duration-500" 
                              style={{ width: `${(val1 / maxVal) * 100}%` }}
                            />
                          </div>
                          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden relative">
                            <div 
                              className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                              style={{ width: `${(val2 / maxVal) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>

              {/* Footer */}
              <div className="bg-slate-900/90 px-4 py-3 border-t border-slate-800 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCompareModal(false)}
                  className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl border border-indigo-500/30 transition-colors shadow-md"
                >
                  비교 완료 (확인)
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {selectedCpDetailCompanion && (
        <CombatPowerDetailModal
          entity={selectedCpDetailCompanion}
          onClose={() => setSelectedCpDetailCompanion(null)}
        />
      )}
    </div>,
    document.body
  );
};

export default CompanionModal;
