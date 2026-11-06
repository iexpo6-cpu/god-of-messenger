
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Companion, ClassTier, Item, ActiveStatus, Character, JobType, MilitaryRank, Stats, BlacksmithRank, AlchemistRank, RelationType, SkillType, ItemRarity, MonsterStage, CombatStyle, HousekeeperRank, HOUSEKEEPER_RANK_CONFIG, Enemy, CombatState, BattleRole, SecondaryBattleRole } from '../types';
import { X, Heart, MessageCircle, Moon, Coffee, Home, Sparkles, Send, LogOut, Baby, Shield, Smile, GitBranch, UserPlus, Zap, Trash2,Edit, Box, BookOpen, Crown, Loader2, Flame, Snowflake, Droplets, Eclipse, Sun, Hammer, FlaskConical, Leaf, Activity, User, AlertCircle, BarChart2, Target, PawPrint, Gem, HeartCrack, MapPin, Globe, Sword, Brain, Briefcase, GraduationCap, Medal, Award, UserCheck, Landmark, TrendingUp, Lock, Unlock, Gavel, Award as TitleIcon, Check, Play, User as UserIcon, Users as UsersIcon, Skull, Waves, Wind, Crosshair, Gift, Handshake } from 'lucide-react';
import { calculateFinalStats, calculateTotalStats, getWeaponTypeFromItem, generateDefaultVisualUrl, getBondBonus, getCombatStyleBonusPercent, assignRandomCombatStyle, getCombatStyleBonusDetails, getCombatStyleActiveSkill, getUnlockedCombatStylesList, getEntityAllCombatSkills, addDays, diffDays, getYear } from '../utils';
import { SECONDARY_ROLE_INFOS } from '../services/roleBonusService';
import { getCombatStyleSkillSet, COMBAT_STYLE_SKILL_DATA } from '../combatStyleSkills';
import { getTierBuffScale } from '../services/skillBuffScaleService';
import { TITLES } from '../titles';
import DetailedStatsModal from './DetailedStatsModal';
import { MarriageModal, DivorceModal } from './MarriageSystem';
import { persuadeCompanionJob } from '../services/geminiService';
import { ItemTooltip, ElixirDurationText } from './CharacterSheet';
import { getVisualUrlByJob, getDivineOrDemonJobVisualUrl } from '../services/visualManager';
import { isMessengerJob } from '../messengerofgodvisual';
import AppearanceChoiceModal from './AppearanceChoiceModal';
import { BS_RANK_CONFIG } from './BlacksmithModal';
import { ALCHEMIST_RANK_CONFIG } from './AlchemyCraftModal';
import { INFAMY_CONFIG, MAX_PARTY_SIZE, COMBAT_STYLE_CONFIG } from '../constants';
import CompanionFamilyTreeModal from './CompanionFamilyTreeModal';
import { CompanionGrowthTab } from './CompanionGrowthTab';
import { processAutomaticGrowth, getCompanionCP, checkAndInitializeLiberationEligibility, isMonsterCompanion } from '../services/companionGrowthService';
import { PromotionMasteryProgressBar } from './PromotionMasteryProgressBar';
import { areSiblings, isHalfSibling } from '../services/siblingService';
import { getTrialMessengerForShinryoku, getTrialEnemyForTier } from './PotentialBreakthroughModal';
import ShortcutAssignModal from './ShortcutAssignModal';
import { returnMonsterToFarm } from '../services/monsterManager';
import { removeBondSkillsBetween, cleanInvalidBondSkills } from '../services/relationService';
import { isRealTimeElixir } from '../services/elixirService';
import { checkAndTriggerJealousyEvent } from '../services/relationshipEventService';
import { isCompanionEligibleForSwitch, switchPlayerAndCompanion } from '../services/playerCompanionSwitchService';
import { CombatEstimateModal } from './CombatEstimateModal';
import { getCleanseAilments, getBuffEffectSummaries } from './combat/SkillSelector';
import { canStartRomance } from '../services/romanceEthicsService';

import { RPG_SKILL_ICONS as BASE_ICONS, getItemImage, getSkillIconComponent } from '../services/rpgIconService';

// [HELPER] Format title stat bonuses into clean 1-line string
const formatTitleStats = (title: any) => {
  const STAT_MAP: Record<string, string> = {
    str: '힘', int: '지력', wis: '지능', def: '방어', agi: '민첩', ctrl: '제어',
    maxHp: '최대 HP', maxMp: '최대 MP', pAtk: '물공', mAtk: '마공', pDef: '물방', mDef: '마방',
    critChance: '치명타율', accuracy: '명중률', evasion: '회피율', statusResist: '상태저항'
  };
  
  if (!title.stats || Object.keys(title.stats).length === 0) return '효과 없음';
  return Object.entries(title.stats)
    .map(([stat, value]) => `${STAT_MAP[stat] || stat} +${value}`)
    .join(' · ');
};

interface Props {
  character?: Character; 
  companion: Companion;
  playerInventory?: Item[];
  onClose: () => void;
  onIncreaseStat: (statKey: string, amount: number) => void;
  onOpenSkillBook: () => void;
  onOpenWeaponMastery: () => void;
  onEvolveClass: () => void;
  onEquipItem: (index: number) => void;
  onUnequipItem: (slot: string) => void;
  onUseItem: (item: Item, index: number | number[]) => void; 
  onChat: (message: string) => Promise<string>;
  onPartWays: (mode: 'temporary' | 'permanent' | 'beautiful') => void;
  onOrderDispatch?: (questId: string) => void;
  onGiftItem: (index: number, count?: number) => void;
  onConfess: () => Promise<string | undefined>;
  onClearChat: () => void;
  onDate: () => void;
  onBreakUp: () => void;
  onDivorce?: () => void; 
  onReturnToFarm?: () => void;
  onMount?: () => void; // [NEW]
  onBattle?: (enemy: Enemy | Enemy[], combatType?: CombatState['type'], defenseSource?: string) => void;
  onUpdateCharacter?: (newChar: Character, logMsg?: string) => void; 
  onEquipTitle?: (companionId: string, titleId: string | undefined) => void; // [NEW]
  setResultModalData?: (data: any) => void;
}

const ATTACK_SCALING: Record<string, number> = {
    [ClassTier.NONE]: 0.5,
    [ClassTier.FIRST]: 1.0,
    [ClassTier.SECOND]: 5.0,
    [ClassTier.LAST]: 20.0,
    [ClassTier.FINAL]: 100.0,
};

const BUFF_SCALING: Record<string, number> = {
    [ClassTier.NONE]: 0.1,
    [ClassTier.FIRST]: 0.1,
    [ClassTier.SECOND]: 0.2,
    [ClassTier.LAST]: 0.5,
    [ClassTier.FINAL]: 1.0,
};

// getItemImage is now imported from rpgIconService

// Helper for stacking items in the modal
interface GroupedItem {
    item: Item;
    count: number;
    indices: number[];
}

const groupItemsInModal = (inventory: Item[]): GroupedItem[] => {
    const grouped: Record<string, GroupedItem> = {};
    inventory.forEach((item, index) => {
        const isStackable = ['Consumable', 'Etc', '소비', '물약', '음식', '소모품', '기타'].includes(item.type);
        if (isStackable) {
            const key = `${item.name}-${item.rarity}`;
            if (!grouped[key]) {
                grouped[key] = { item, count: 0, indices: [] };
            }
            grouped[key].count++;
            grouped[key].indices.push(index);
        } else {
            const key = `${item.name}-${index}`;
            grouped[key] = { item, count: 1, indices: [index] };
        }
    });
    return Object.values(grouped);
};

const StatusBadge: React.FC<{ status: ActiveStatus; companionId?: string }> = ({ status, companionId }) => {
    const [showDetail, setShowDetail] = useState(false);
    
    if (!status || !status.name || status.name === 'None') return null;
    const isHiddenSystemRest = ['휴식', '완전 회복', '수면', '잠'].includes(status.name);
    if (isHiddenSystemRest) return null;

    const isDiminished = Boolean(
        status.isDiminished || 
        status.effect?.includes('반감') || 
        status.name?.includes('반감')
    );

    const isElixir = isRealTimeElixir(status);
    const durationDisplay = !isElixir && status.duration && status.duration > 0
        ? `(${status.duration}턴)`
        : '';
    return (
        <div className="relative inline-block mr-1 mb-1 z-30">
            <button 
                onClick={(e) => { e.stopPropagation(); setShowDetail(!showDetail); }} 
                className={`text-[10px] border px-1.5 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                    isDiminished 
                        ? 'text-amber-300 border-amber-600/70 bg-amber-950/40 hover:bg-amber-900/50' 
                        : 'text-amber-500 border-amber-900/50 bg-amber-950/20 hover:bg-amber-900/40'
                }`}
            >
                <span>
                    {status.name}
                    {isElixir ? <ElixirDurationText status={status} entityId={companionId || 'companion'} /> : durationDisplay}
                </span>
                {isDiminished && (
                    <span className="px-1 py-0.2 bg-amber-600 text-white text-[7px] rounded font-bold leading-none">
                        반감
                    </span>
                )}
            </button>
            {showDetail && ( 
                <div className={`absolute top-full left-0 mt-1 w-48 p-2 bg-black/95 border ${isDiminished ? 'border-amber-500' : 'border-amber-500/50'} rounded text-slate-200 text-xs shadow-xl animate-in fade-in zoom-in-95 z-[100]`}>
                    <div className="font-bold text-amber-500 mb-1 flex items-center justify-between gap-1">
                        <span>{status.name}</span>
                        {isDiminished ? (
                            <span className="px-1 py-0.2 text-[8px] bg-amber-900/80 text-amber-300 border border-amber-500/60 rounded font-bold">
                                {status.diminishedRate || 50}% 반감
                            </span>
                        ) : status.rank === 1 ? (
                            <span className="px-1 py-0.2 text-[8px] bg-blue-900/80 text-blue-300 border border-blue-500/60 rounded font-bold">
                                최고 수치
                            </span>
                        ) : null}
                    </div>
                    <div className="leading-tight">{status.effect}</div>
                    {isDiminished ? (
                        <div className="mt-1 text-[9px] text-amber-300 bg-amber-950/70 p-1 rounded border border-amber-600/40 font-medium">
                            동일 스탯 중첩으로 {status.diminishedRate || 50}% 반감 적용 중 (가장 수치가 높은 버프가 100% 우선 적용)
                        </div>
                    ) : status.rank === 1 ? (
                        <div className="mt-1 text-[9px] text-blue-300 bg-blue-950/70 p-1 rounded border border-blue-600/40 font-medium">
                            동일 스탯 계열 중 최고 수치로 100% 온전 적용 중
                        </div>
                    ) : null}
                    <div className="text-[9px] text-slate-500 mt-1">클릭하여 닫기</div>
                </div> 
            )}
        </div>
    );
};

const StatRow: React.FC<{ 
    label: string; 
    finalValue: number; 
    equipBonus?: number;
    buffBonus?: number;
    mountBonus?: number;
    combatStyleBonus?: number;
    statKey: string; 
    icon: any; 
    color: string; 
    pointsAvailable: number; 
    onIncrease: (key: string, amount: number) => void; 
}> = ({ label, finalValue, equipBonus = 0, buffBonus = 0, mountBonus = 0, combatStyleBonus = 0, statKey, icon: Icon, color, pointsAvailable, onIncrease }) => {
    return (
        <div className="flex justify-between items-center py-2 border-b border-slate-800/50 last:border-0">
            <div className="flex items-center text-slate-400 text-xs">
                <Icon size={12} className={`mr-2 ${color}`} />
                <span>{label}</span>
            </div>
            <div className="flex items-center space-x-2">
                <div className="flex flex-col items-end leading-none">
                    <span className="font-bold font-mono text-slate-200 text-sm">{finalValue}</span>
                    <div className="flex flex-wrap justify-end gap-1 mt-0.5 max-w-[120px]">
                        {equipBonus > 0 && (
                            <span className="text-[9px] text-green-400 font-bold">(+{equipBonus})</span>
                        )}
                        {combatStyleBonus > 0 && (
                            <span className="text-[9px] text-purple-400 font-bold">(+{combatStyleBonus} 계열)</span>
                        )}
                        {buffBonus !== 0 && (
                            <span className={`text-[9px] font-bold ${buffBonus > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                ({buffBonus > 0 ? '+' : ''}{buffBonus} Buff)
                            </span>
                        )}
                        {mountBonus > 0 && (
                            <span className="text-[9px] text-amber-400 font-bold">(+{mountBonus} Mount)</span>
                        )}
                    </div>
                </div>
                {pointsAvailable > 0 && (
                    <div className="flex space-x-1 ml-2">
                        {pointsAvailable >= 50 && (
                            <button onClick={() => onIncrease(statKey, 50)} className="text-[9px] bg-amber-900/90 text-amber-100 px-1.5 py-0.5 rounded border border-amber-600 hover:bg-amber-700 font-bold">+50</button>
                        )}
                        {pointsAvailable >= 20 && (
                            <button onClick={() => onIncrease(statKey, 20)} className="text-[9px] bg-amber-900/80 text-amber-200 px-1.5 py-0.5 rounded border border-amber-700 hover:bg-amber-700 font-bold">+20</button>
                        )}
                        {pointsAvailable >= 10 && (
                            <button onClick={() => onIncrease(statKey, 10)} className="text-[9px] bg-amber-900/70 text-amber-100 px-1.5 py-0.5 rounded border border-amber-700 hover:bg-amber-700 font-bold">+10</button>
                        )}
                        {pointsAvailable >= 5 && (
                            <button onClick={() => onIncrease(statKey, 5)} className="text-[9px] bg-amber-900/50 text-amber-200 px-1.5 py-0.5 rounded border border-amber-800 hover:bg-amber-800">+5</button>
                        )}
                        <button onClick={() => onIncrease(statKey, 1)} className="text-[9px] bg-amber-900 text-amber-200 px-2 py-0.5 rounded border border-amber-800 hover:bg-amber-700">+1</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const EquipmentSlot: React.FC<{ 
    label: string, 
    item?: Item, 
    slotKey: string, 
    onUnequip: (slot: string) => void, 
    companion: Companion,
    isSelected?: boolean,
    onSelect?: () => void
}> = ({ label, item, slotKey, onUnequip, companion, isSelected, onSelect }) => (
    <div 
        onClick={() => { if (item && onSelect) onSelect(); }}
        className={`flex justify-between items-center text-xs py-2 px-2.5 rounded-lg border cursor-pointer transition-all ${
            isSelected 
                ? 'bg-amber-950/60 border-amber-500 shadow-md ring-1 ring-amber-500/50' 
                : 'border-slate-800/30 bg-slate-900/40 hover:bg-slate-800/50 hover:border-slate-700'
        }`}
    >
        <span className="text-slate-500 w-16 shrink-0">{label}</span>
        <div className="w-8 h-8 rounded bg-slate-950 border border-slate-800 shrink-0 mx-2 overflow-hidden flex items-center justify-center">
            {item ? (
                <img src={getItemImage(item)} alt="" className="w-full h-full object-cover" />
            ) : (
                <div className="opacity-20"><Shield size={14}/></div>
            )}
        </div>
        <div className="flex-1 px-2 overflow-visible group/item relative min-w-0">
            <span className={`truncate block font-bold ${item ? "text-amber-100" : "text-slate-700 italic"}`}>
                {item ? item.name : "-"}
            </span>
            {item && item.elementalType && (
                <span className="text-[8px] text-cyan-300 bg-cyan-950/30 px-1 rounded block w-fit font-bold">{item.elementalType}</span>
            )}
            {item && <ItemTooltip item={item} character={companion as any} />}
        </div>
        {item && (
            <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onUnequip(slotKey); }} 
                className="text-red-500 hover:text-red-400 p-1 transition-colors" 
                title="해제"
            >
                <Trash2 size={12} />
            </button>
        )}
    </div>
);

export const CompanionStatusModal: React.FC<Props> = ({ character, companion, playerInventory = [], onClose, onIncreaseStat, onOpenSkillBook, onOpenWeaponMastery, onEvolveClass, onBattle, onEquipItem, onUnequipItem, onUseItem, onChat, onPartWays, onGiftItem, onConfess, onClearChat, onDate, onBreakUp, onDivorce, onReturnToFarm, onMount, onUpdateCharacter, onEquipTitle, setResultModalData }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'equipment' | 'skills' | 'chat' | 'titles' | 'growth' | 'liberation'>('info');
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [showPartWaysOptions, setShowPartWaysOptions] = useState(false);
  const [showReturnToFarmModal, setShowReturnToFarmModal] = useState(false);
  const [showMarriageModal, setShowMarriageModal] = useState(false);
  const [showDivorceModal, setShowDivorceModal] = useState(false);
  const [showConfessModal, setShowConfessModal] = useState(false);
  const [showSwornSiblingModal, setShowSwornSiblingModal] = useState(false);
  const [showBreakSwornSiblingModal, setShowBreakSwornSiblingModal] = useState(false);
  const [isSwornSiblingProcessing, setIsSwornSiblingProcessing] = useState(false);
  const [isFamilyTreeOpen, setIsFamilyTreeOpen] = useState(false);
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);
  // [NEW] 개명 관련 상태
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [isActionProcessing, setIsActionProcessing] = useState(false);
  const [showSwitchPlayerModal, setShowSwitchPlayerModal] = useState(false);
  const [isCombatEstimateOpen, setIsCombatEstimateOpen] = useState(false);

  
  const [showJobPersuasion, setShowJobPersuasion] = useState(false);
  const [persuadeJobTarget, setPersuadeJobTarget] = useState<JobType | null>(null);
  const [isPersuading, setIsPersuading] = useState(false);
  
  // [NEW] 스킬 탭 필터링 상태
  const isMonsterCompanionCheck = Boolean(companion.isMonster || companion.monsterData || companion.race === '몬스터' || companion.race?.includes('Monster') || (companion.job as any) === '마수' || (companion.job as any) === '몬스터' || companion.classType === '마수/몬스터' || companion.classType === '몬스터');
  const [selectedTier, setSelectedTier] = useState<string>(() => companion.combatStyle ? '전투 계열' : (isMonsterCompanionCheck ? '유아기' : '미해방'));

  // [NEW] 숏컷 지정 모달 대상 상태
  const [shortcutTarget, setShortcutTarget] = useState<{
    name: string;
    displayName: string;
    type: 'skill' | 'item';
    icon?: string;
    imageUrl?: string;
  } | null>(null);

  // [NEW] 선물 수량 지정 모달 상태
  const [giftModalData, setGiftModalData] = useState<{
    item: Item;
    count: number;
    primaryIndex: number;
  } | null>(null);
  const [giftAmount, setGiftAmount] = useState<number>(1);

  // [NEW] 장비/가방 탭 세부 설정 상태 (선물 탭 / 장착 탭 분리, 분류 및 정렬)
  const [equipSubTab, setEquipSubTab] = useState<'equip' | 'gift'>('equip');
  const [equipCategoryFilter, setEquipCategoryFilter] = useState<'all' | 'equipment' | 'consumable'>('all');
  const [companionEquipSlotFilter, setCompanionEquipSlotFilter] = useState<'all' | 'Weapon' | 'SubWeapon' | 'Body' | 'Accessory' | 'Feets' | 'Head' | 'Hand'>('all');
  const [equipSortBy, setEquipSortBy] = useState<'default' | 'rarityDesc' | 'rarityAsc' | 'name'>('rarityDesc');
  const [selectedCompanionItem, setSelectedCompanionItem] = useState<{
    item: Item;
    isEquipped?: boolean;
    slotKey?: string;
    indices?: number[];
    count?: number;
  } | null>(null);

  const handleAssignShortcutSlot = (slotIndex: number) => {
    if (!shortcutTarget) return;
    const current = Array.from({ length: 10 }, (_, i) => (companion.skillShortcuts || [])[i] || '');
    const prevIdx = current.findIndex(s => s === shortcutTarget.name);
    if (prevIdx !== -1) {
        current[prevIdx] = '';
    }
    current[slotIndex] = shortcutTarget.name;
    const updatedCompanion = {
        ...companion,
        skillShortcuts: current
    };
    handleUpdateCompanion(updatedCompanion);
  };

  const handleRemoveShortcut = (skillName?: string) => {
    const target = skillName || shortcutTarget?.name;
    if (!target) return;
    const current = Array.from({ length: 10 }, (_, i) => (companion.skillShortcuts || [])[i] || '');
    const prevIdx = current.findIndex(s => s === target);
    if (prevIdx !== -1) {
        current[prevIdx] = '';
    }
    const updatedCompanion = {
        ...companion,
        skillShortcuts: current
    };
    handleUpdateCompanion(updatedCompanion);
  };

  const handleUpdateCompanion = (updatedCompanion: Companion) => {
    if (character && onUpdateCharacter) {
        const updatedCompanions = character.companions.map(c => c.id === updatedCompanion.id ? updatedCompanion : c);
        onUpdateCharacter({ ...character, companions: updatedCompanions }, `${updatedCompanion.name}의 능력/스킬이 갱신되었습니다.`);
    }
  };

  useEffect(() => {
    const isCustomComp = Boolean(companion.isCustom || (companion as any).isCustomMonster || companion.monsterData?.isCustomMonster || isMonsterCompanion(companion));
    const isAuto = !isCustomComp || 
                   companion.growthSettings?.statAutoMode === 'auto' || 
                   companion.growthSettings?.classAutoMode === 'auto' || 
                   companion.growthSettings?.skillAutoMode === 'auto';
    
    if (isAuto) {
        const updatedCompanion = processAutomaticGrowth(companion);
        if (updatedCompanion !== companion) {
            handleUpdateCompanion(updatedCompanion);
        }
    }
  }, [companion.statPoints, companion.level, companion.classTier, companion.shinryokuType, companion.isCustom, (companion as any).isCustomMonster, companion.growthSettings?.statAutoMode, companion.growthSettings?.classAutoMode, companion.growthSettings?.skillAutoMode]);

  const [showMountTargetSelection, setShowMountTargetSelection] = useState(false);
  const [showBreakUpConfirm, setShowBreakUpConfirm] = useState(false);
  const [resultData, setResultData] = useState<any | null>(null);

  const chatHistory = companion.chatHistory || [];

  useEffect(() => {
      if (activeTab === 'chat') {
          setTimeout(() => {
              chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }, 100);
      }
  }, [chatHistory, activeTab]);

  if (!companion || !companion.stats) {
      return createPortal(<div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 font-sans text-slate-400">데이터 로딩 중...</div>, document.body);
  }
  
  const { finalStats, baseTotal, buffBonus, equipPercentBonus, mountBonus, combatStyleBonus } = calculateFinalStats(companion);
  const { bonus: flatEquipBonus } = calculateTotalStats(companion);
  const RARITY_COLORS: Record<string, string> = {
    [ItemRarity.NORMAL]: 'text-slate-400 border-slate-600',
    [ItemRarity.MAGIC]: 'text-blue-400 border-blue-500',
    [ItemRarity.RARE]: 'text-yellow-400 border-yellow-500',
    [ItemRarity.EPIC]: 'text-purple-400 border-purple-500',
    [ItemRarity.UNIQUE]: 'text-pink-400 border-pink-500',
    [ItemRarity.LEGENDARY]: 'text-amber-500 border-amber-500 shadow-amber-500/20',
    [ItemRarity.MYTHTIC]: 'text-red-700 border-red-700 shadow-red-700/20',
  };

const handleRenameSubmit = () => {
    if (!renameInput.trim() || !character || !onUpdateCharacter) return;

    const roll = Math.random();
    const success = roll < 0.5; // 50% 성공 확률

    if (success) {
        const newChar = { ...character };
        const oldName = companion.name;
        const newName = renameInput.trim();

        const updateName = (c: Companion) => {
            if (c.id === companion.id) {
                return { ...c, name: newName };
            }
            return c;
        };

        newChar.companions = newChar.companions.map(updateName);
        if (newChar.inactiveCompanions) {
            newChar.inactiveCompanions = newChar.inactiveCompanions.map(updateName);
        }

        onUpdateCharacter(newChar, `[개명 성공] 동료 '${oldName}'의 이름을 '${newName}'(으)로 변경했습니다.`);
        setResultData({
            type: 'success',
            title: '개명 성공!',
            message: `${oldName}은(는) 이제부터 '${newName}'(이)라는 이름으로 불리길 원합니다.`,
            items: [{ label: '이전 이름', before: oldName, after: newName }]
        });
    } else {
        setResultData({
            type: 'failure',
            title: '개명 실패',
            message: `${companion.name}은(는) 당신이 제안한 '${renameInput}'이라는 이름이 마음에 들지 않는 모양입니다. 기존의 이름을 유지하기로 했습니다.`,
            items: [{ label: '결과', after: '변경 실패' }]
        });
        onUpdateCharacter(character, `[개명 실패] ${companion.name}이(가) 새로운 이름을 거부했습니다.`);
    }
    
    setShowRenameModal(false);
    setRenameInput('');
  };

  // [NEW] Passive Skill Effect Summary Logic
  const activePassiveEffects = (() => {
    const list: { name: string, effect: string }[] = [];
    let equippedWeaponType: string | undefined;
    if (companion.equipment?.weapon) {
        equippedWeaponType = getWeaponTypeFromItem(companion.equipment.weapon);
    }

    companion.skills.forEach(skill => {
        if (skill.type === SkillType.PASSIVE && skill.effectFormula) {
            const regex = /PASSIVE: \[([\s\w가-힣:]+)\] \+(\d+(?:\.\d+)?)% \(\+(\d+(?:\.\d+)?)% per Lv\)(?: \[COND: (.+)\])?/;
            const match = skill.effectFormula.match(regex);

            if (match) {
                const target = match[1]; 
                const basePercent = parseFloat(match[2]);
                const scalePercent = parseFloat(match[3]);
                const condition = match[4];

                let isConditionMet = true;
                if (condition && condition !== equippedWeaponType) {
                    isConditionMet = false;
                }

                if (isConditionMet) {
                    const level = skill.level || 1;
                    const totalPercent = (basePercent + (scalePercent * level)).toFixed(1);
                    list.push({
                        name: skill.name,
                        effect: `${target} +${totalPercent}%`
                    });
                } else if (condition) {
                    list.push({
                        name: skill.name,
                        effect: `비활성 (필요: ${condition})`
                    });
                }
            } else if (skill.effectFormula.includes('HEAT') || skill.effectFormula.includes('REGEN') || skill.effectFormula.includes('SYNTH')) {
                 // Special predefined passives
                 list.push({ name: skill.name, effect: "특수 능력 활성화 중" });
            }
        }
    });
    return list;
  })();

  // Initialize liberation potential and eligibility consistently across all tabs of this companion
  const initializedCompanion = useMemo(() => {
    const cp = getCompanionCP(companion);
    const cloned = { ...companion };
    return checkAndInitializeLiberationEligibility(cloned, cp);
  }, [companion]);

  // 클래스 해방 가능 여부: 커스텀 동료(isCustom === true)만 수동 해방 가능 (일반 동료는 불가능)
  // 해방 포텐셜 한계치(liberationPotential)에 맞게 클래스해방버튼 활성화 여부를 필터링합니다.
  let canEvolve = false;
  if (companion.isCustom === true) {
    const cTier = companion.classTier || ClassTier.NONE;
    const cLevel = companion.level;
    const potential = initializedCompanion.liberationPotential || ClassTier.NONE;

    const TIER_RANK_MAP: Record<ClassTier, number> = {
      [ClassTier.NONE]: 0,
      [ClassTier.F]: 0,
      [ClassTier.FIRST]: 1,
      [ClassTier.SECOND]: 2,
      [ClassTier.LAST]: 3,
      [ClassTier.FINAL]: 4,
      [ClassTier.BOND]: 5
    };

    const potentialRank = TIER_RANK_MAP[potential] || 0;

    let targetTier: ClassTier | null = null;
    if (cTier === ClassTier.NONE && cLevel >= 30) targetTier = ClassTier.FIRST;
    else if (cTier === ClassTier.FIRST && cLevel >= 100) targetTier = ClassTier.SECOND;
    else if (cTier === ClassTier.SECOND && cLevel >= 300) targetTier = ClassTier.LAST;
    else if (cTier === ClassTier.LAST && cLevel >= 1000) targetTier = ClassTier.FINAL;

    if (targetTier) {
      const targetRank = TIER_RANK_MAP[targetTier] || 0;
      // Target rank must be <= potential rank to allow evolution!
      if (targetRank <= potentialRank) {
        const isTrialMet = companion.isCustom
          ? (
              targetTier === ClassTier.FIRST ? Boolean(companion.hasClearedFirstTrial || companion.firstTrialCleared || companion.hasClearedSecondTrial || companion.secondTrialCleared || companion.hasClearedLastTrial || companion.lastTrialCleared || companion.hasClearedFinalTrial || companion.finalTrialCleared) :
              targetTier === ClassTier.SECOND ? Boolean(companion.hasClearedSecondTrial || companion.secondTrialCleared || companion.hasClearedLastTrial || companion.lastTrialCleared || companion.hasClearedFinalTrial || companion.finalTrialCleared) :
              targetTier === ClassTier.LAST ? Boolean(companion.hasClearedLastTrial || companion.lastTrialCleared || companion.hasClearedFinalTrial || companion.finalTrialCleared) :
              Boolean(companion.hasClearedFinalTrial || companion.finalTrialCleared)
            )
          : (targetTier !== ClassTier.FINAL || Boolean(companion.hasClearedFinalTrial || companion.finalTrialCleared));
        let reqCpVal = 0;
        if (targetTier === ClassTier.FIRST) reqCpVal = 8000;
        else if (targetTier === ClassTier.SECOND) reqCpVal = 30000;
        else if (targetTier === ClassTier.LAST) reqCpVal = 100000;
        else if (targetTier === ClassTier.FINAL) reqCpVal = 1000000;
        // 커스텀 동료는 1:1 시련 통과 및 전투력 CP 기준 달성이 필수 조건
        const companionCP = getCompanionCP(companion);
        if (isTrialMet && companionCP >= reqCpVal) {
          canEvolve = true;
        }
      }
    }
  }

  const isMonster = !!(companion.isMonster || companion.monsterData || companion.race === '몬스터' || companion.race.includes('Monster'));
  const isCustom = Boolean(companion.isCustom || (companion as any).isCustomMonster || companion.monsterData?.isCustomMonster);
  const isGuardian = companion.classType === "성전 수호자"; 
  
  const getMonsterStageLabel = (comp: Companion) => {
    if (comp.monsterData?.stage && (comp.monsterData.stage as string) !== '미해방' && (comp.monsterData.stage as string) !== '없음') {
      return comp.monsterData.stage;
    }
    if (comp.classType && comp.classType !== '미해방' && comp.classType !== '없음' && comp.classType !== '몬스터' && comp.classType !== '동료') {
      return comp.classType;
    }
    const lvl = comp.level || 1;
    if (lvl >= 1000) return '초궁극체';
    if (lvl >= 500) return '궁극체';
    if (lvl >= 200) return '완전체';
    if (lvl >= 70) return '성숙기';
    if (lvl >= 30) return '성장기';
    return '유아기';
  };

  const tierDisplay = isMonster ? getMonsterStageLabel(companion) : (companion.classTier === ClassTier.NONE ? '미해방' : companion.classTier);
  
  const rawBaseClass = companion.finalClassName || companion.lastClassName || companion.secondClassName || companion.firstClassName;
  let currentClassName = companion.classType;
  if (!isMonster && rawBaseClass && rawBaseClass !== '미정') {
      currentClassName = rawBaseClass;
  }

  const monsterVisualUrl = companion.monsterData?.visualUrl;
  const defaultVisualUrl = companion.defaultVisualUrl || generateDefaultVisualUrl(companion.name, companion.nation || '기타', companion.race, companion.gender);
  const displayVisualUrl = getVisualUrlByJob(companion.job, companion.gender, companion.visualUrl || monsterVisualUrl || defaultVisualUrl);

  const isChild = companion.classType?.includes('자녀') || companion.classType?.includes('Child');

  const isLoverWithPlayer = companion.isLover && companion.partnerId === 'player';

  const handleMount = () => {
    if (!character || !onUpdateCharacter) return;
    
    // Check if this companion is already mounted somewhere
    const isMountedOnPlayer = character.mountedMonsterId === companion.id;
    const mountedOnCompanion = character.companions.find(c => c.mountedMonsterId === companion.id);
    
    if (isMountedOnPlayer || mountedOnCompanion) {
      // Unmount logic
      const newChar = { ...character };
      
      let unmountedMonster: Companion | undefined;

      if (isMountedOnPlayer) {
        unmountedMonster = newChar.mountedMonster;
        newChar.mountedMonsterId = undefined;
        newChar.mountedMonster = undefined;
        if (unmountedMonster) {
            unmountedMonster.isMountedAsMount = false;
        }
      } else if (mountedOnCompanion) {
        newChar.companions = newChar.companions.map(c => {
          if (c.id === mountedOnCompanion.id) {
            unmountedMonster = c.mountedMonster;
            return { ...c, mountedMonsterId: undefined, mountedMonster: undefined };
          }
          return c;
        });
        if (unmountedMonster) {
            unmountedMonster.isMountedAsMount = false;
        }
      }

      if (unmountedMonster) {
          if (newChar.companions.length >= 5) { // MAX_PARTY_SIZE = 5
              if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
              newChar.inactiveCompanions.push(unmountedMonster);
              if (setResultModalData) {
                  setResultModalData({ type: 'success', title: '탈것 해제', message: `${isMountedOnPlayer ? '플레이어' : mountedOnCompanion?.name}이(가) ${companion.name}에서 내렸습니다. 파티가 가득 차서 대기실로 이동했습니다.`, items: [{ label: '상태', after: '대기실로 복귀' }] });
              }
          } else {
              newChar.companions.push(unmountedMonster);
              if (setResultModalData) {
                  setResultModalData({ type: 'success', title: '탈것 해제', message: `${isMountedOnPlayer ? '플레이어' : mountedOnCompanion?.name}이(가) ${companion.name}에서 내렸습니다.`, items: [{ label: '상태', after: '동료 목록으로 복귀' }] });
              }
          }
          onUpdateCharacter(newChar, `[시스템] ${isMountedOnPlayer ? '플레이어' : mountedOnCompanion?.name}이(가) ${companion.name}에서 내렸습니다.`);
      }

      onClose();
    } else {
      // Mount logic
      const mountableStages = [MonsterStage.PERFECT, MonsterStage.ULTIMATE, MonsterStage.SUPER_ULTIMATE];
      const currentStage = (companion as any).monsterData?.stage || (companion as any).stage;
      if (!currentStage || !mountableStages.includes(currentStage)) {
        if (setResultModalData) {
            setResultModalData({ type: 'warning', title: '탑승 불가', message: '탈것으로 이용하려면 최소 완전체 단계 이상이어야 합니다.', items: [{ label: '현재 단계', after: currentStage || '알 수 없음' }] });
        }
        return;
      }
      setShowMountTargetSelection(true);
    }
  };

  const handleMountTargetSelect = (targetId: string | 'player') => {
    if (!character || !onUpdateCharacter) return;
    
    const newChar = { ...character };
    const companionToMount = { ...companion, isMountedAsMount: true };
    
    // 1. Handle the previous mount of the target to prevent data loss
    let oldMount: Companion | undefined;
    if (targetId === 'player') {
      if (newChar.mountedMonster) {
        oldMount = { ...newChar.mountedMonster, isMountedAsMount: false };
        newChar.mountedMonster = undefined;
        newChar.mountedMonsterId = undefined;
      }
    } else {
      newChar.companions = newChar.companions.map(c => {
        if (c.id === targetId) {
          if (c.mountedMonster) {
            oldMount = { ...c.mountedMonster, isMountedAsMount: false };
          }
          return { ...c, mountedMonsterId: undefined, mountedMonster: undefined };
        }
        return c;
      });
    }

    // 2. Remove the NEW mount from the companions list
    newChar.companions = newChar.companions.filter(c => c.id !== companion.id);
    
    // 3. If there was an old mount, add it back to companions (respecting party size)
    if (oldMount) {
      if (newChar.companions.length >= MAX_PARTY_SIZE) {
        if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
        newChar.inactiveCompanions.push(oldMount);
      } else {
        newChar.companions.push(oldMount);
      }
    }

    // 4. Set the new mount
    if (targetId === 'player') {
      newChar.mountedMonsterId = companion.id;
      newChar.mountedMonster = companionToMount;
      onUpdateCharacter(newChar, `[시스템] ${companion.name}에 탑승했습니다! (능력치 10% 보너스 적용)`);
      if (setResultModalData) setResultModalData({ type: 'success', title: '탈것 장착', message: `${companion.name}에 탑승했습니다!`, items: [{ label: '능력치', after: '+10% 보너스' }] });
    } else {
      newChar.companions = newChar.companions.map(c => {
        if (c.id === targetId) {
          return { ...c, mountedMonsterId: companion.id, mountedMonster: companionToMount };
        }
        return c;
      });
      const targetName = character.companions.find(c => c.id === targetId)?.name || "동료";
      onUpdateCharacter(newChar, `[시스템] ${targetName}이(가) ${companion.name}에 탑승했습니다!`);
      if (setResultModalData) setResultModalData({ type: 'success', title: '탈것 장착', message: `${targetName}이(가) ${companion.name}에 탑승했습니다!`, items: [{ label: '능력치', after: '+10% 보너스' }] });
    }
    
    setShowMountTargetSelection(false);
    onClose();
  };

  const handleUnmountFromCompanion = () => {
    if (!character || !onUpdateCharacter || !companion.mountedMonster) return;
    
    const newChar = { ...character };
    const unmountedMonster = companion.mountedMonster;
    
    newChar.companions = newChar.companions.map(c => {
      if (c.id === companion.id) {
        return { ...c, mountedMonsterId: undefined, mountedMonster: undefined };
      }
      return c;
    });
    
    unmountedMonster.isMountedAsMount = false;

    if (newChar.companions.length >= 5) { // MAX_PARTY_SIZE = 5
      if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
      newChar.inactiveCompanions.push(unmountedMonster);
      if (setResultModalData) {
          setResultModalData({ type: 'success', title: '탈것 해제', message: `${companion.name}에서 ${unmountedMonster.name}이(가) 내렸습니다. 파티가 가득 차서 대기실로 이동했습니다.`, items: [{ label: '상태', after: '대기실로 복귀' }] });
      }
    } else {
      newChar.companions.push(unmountedMonster);
      if (setResultModalData) {
          setResultModalData({ type: 'success', title: '탈것 해제', message: `${companion.name}에서 ${unmountedMonster.name}이(가) 내렸습니다.`, items: [{ label: '상태', after: '동료 목록으로 복귀' }] });
      }
    }
    
    onUpdateCharacter(newChar, `[시스템] ${companion.name}에서 ${unmountedMonster.name}이(가) 내렸습니다.`);
  };

  const getRelationLabel = () => {
      if (companion.job === JobType.SLAVE) {
          return <span className="text-red-500 font-bold flex items-center"><Lock size={12} className="mr-1"/> 주종관계</span>;
      }

      if (isChild) {
          const pGender = character?.gender?.toLowerCase() || '';
          const cGender = companion.gender?.toLowerCase() || '';
          const isPlayerMale = pGender.includes('남') || pGender.includes('male') || pGender.includes('man');
          const isChildMale = cGender.includes('남') || cGender.includes('male') || cGender.includes('man');
          
          let specificRelation = "";
          if (isPlayerMale && isChildMale) specificRelation = "부자";
          else if (isPlayerMale && !isChildMale) specificRelation = "부녀";
          else if (!isPlayerMale && isChildMale) specificRelation = "모자";
          else specificRelation = "모녀";

          return <span className="text-green-400 font-bold">가족 (자녀, {specificRelation})</span>;
      }

      const isSiblingWithPlayer = companion.relation === RelationType.SIBLING || (character && areSiblings(character, companion, character));
      if (isSiblingWithPlayer) {
          const isHalf = character && isHalfSibling(character, companion, character);
          return (
              <span className="text-emerald-400 font-bold flex flex-col items-end">
                  <span>{isHalf ? '이복/이부 형제' : '형제자매'}</span>
                  <span className="text-[10px] opacity-80">플레이어와 형제자매</span>
              </span>
          );
      }

      const siblingCompanion = character?.companions?.find(c => c.id !== companion.id && (areSiblings(companion, c, character) || companion.relations?.[c.id]?.type === RelationType.SIBLING));
      if (siblingCompanion) {
          const isHalf = character && isHalfSibling(companion, siblingCompanion, character);
          return (
              <span className="text-emerald-400 font-bold flex flex-col items-end">
                  <span>{isHalf ? '이복/이부 형제' : '형제자매'}</span>
                  <span className="text-[10px] opacity-80">{siblingCompanion.name}와 형제자매</span>
              </span>
          );
      }

      if (isLoverWithPlayer) {
          return (
              <span className='text-pink-400 flex flex-col items-end'>
                  <span className="flex items-center">
                    <Heart size={12} className="mr-1 fill-pink-500" />
                    {companion.isSpouse ? '부부' : '연인'}
                  </span>
                  <span className="text-[10px] opacity-80">플레이어와 {companion.isSpouse ? '부부' : '연인'}</span>
              </span>
          );
      }

      if (companion.isLover && companion.partnerId !== 'player') {
          return (
              <span className='text-pink-400 flex flex-col items-end'>
                  <span className="flex items-center">
                    <Heart size={12} className="mr-1 fill-pink-500/50" />
                    {companion.isSpouse ? '부부' : '연인'}
                  </span>
                  <span className="text-[10px] opacity-80">{companion.partnerName}와 {companion.isSpouse ? '부부' : '연인'}</span>
              </span>
          );
      }

      return <span className="text-slate-300">동료</span>;
  };

  const normalizeGender = (g: string) => {
      if (!g) return 'U';
      const lower = g.toLowerCase().trim();
      if (['남성','남자','male','man','boy'].some(k => lower.includes(k))) return 'M';
      if (['여성','여자','female','woman','girl'].some(k => lower.includes(k))) return 'F';
      return 'U';
  };
  
  const pGender = normalizeGender(character?.gender || '');
  const cGender = normalizeGender(companion.gender);
  const isDifferentGender = pGender !== 'U' && cGender !== 'U' && pGender !== cGender;
  
  const currentYear = getYear(character?.currentDate || '2000-01-01');
  const ethicsAllowed = canStartRomance(character, companion, currentYear);
  const canConfess = !isMonster && !companion.isLover && !companion.isSpouse && !isChild && isDifferentGender && companion.affection >= 70;

  const handleBreakUpConfirm = () => {
      if (!character || !onUpdateCharacter) return;
      
      const newChar = { ...character };
      let compIndex = newChar.companions.findIndex(c => c.id === companion.id);
      let isInactive = false;
      
      if (compIndex === -1 && newChar.inactiveCompanions) {
          compIndex = newChar.inactiveCompanions.findIndex(c => c.id === companion.id);
          isInactive = true;
      }
      
      if (compIndex === -1) return;

      const targetArray = isInactive ? newChar.inactiveCompanions! : newChar.companions;
      
      const oldPartnerId = targetArray[compIndex].partnerId || 'player';
      targetArray[compIndex] = {
          ...targetArray[compIndex],
          isLover: false,
          isSpouse: false,
          partnerId: undefined,
          partnerName: undefined,
          affection: Math.max(-100, targetArray[compIndex].affection - 30) 
      };
      
      // 상대방이 동료인 경우 상대방 관계도 함께 해제
      if (oldPartnerId && oldPartnerId !== 'player') {
          const pIdx = newChar.companions.findIndex(c => c.id === oldPartnerId);
          if (pIdx !== -1) {
              newChar.companions[pIdx] = {
                  ...newChar.companions[pIdx],
                  isLover: false,
                  isSpouse: false,
                  partnerId: undefined,
                  partnerName: undefined
              };
          } else if (newChar.inactiveCompanions) {
              const inactIdx = newChar.inactiveCompanions.findIndex(c => c.id === oldPartnerId);
              if (inactIdx !== -1) {
                  newChar.inactiveCompanions[inactIdx] = {
                      ...newChar.inactiveCompanions[inactIdx],
                      isLover: false,
                      isSpouse: false,
                      partnerId: undefined,
                      partnerName: undefined
                  };
              }
          }
      }
      
      // Remove bond skills associated with this companion pair
      let updatedChar = removeBondSkillsBetween(newChar, companion.id, oldPartnerId);
      updatedChar = cleanInvalidBondSkills(updatedChar);
      
      onUpdateCharacter(updatedChar, `[시스템] ${companion.name}와(과) 연인 관계를 정리했습니다.`);
      
      setShowBreakUpConfirm(false);
      
      setResultData({
          type: 'failure',
          title: '이별',
          message: `${companion.name}와(과) 헤어졌습니다.\n서로 남남이 되었습니다.`,
          items: [{ label: '관계', after: '동료' }, { label: '호감도', after: '-30' }]
      });
  };

  const handleConfessionConfirm = () => {
      if (!character || !onUpdateCharacter) return;
      
      const isCrossAge = !ethicsAllowed;
      const baseChance = isCrossAge ? 15 : 50;
      const bonus = isCrossAge 
          ? Math.floor(Math.max(0, companion.affection - 70) * 0.5) 
          : Math.max(0, companion.affection - 70);
      const chance = isCrossAge ? Math.min(35, baseChance + bonus) : Math.min(100, baseChance + bonus);
      
      const roll = Math.random() * 100;
      const success = roll < chance;
      
      const newChar = { ...character };
      
      let compIndex = newChar.companions.findIndex(c => c.id === companion.id);
      let isInactive = false;
      if (compIndex === -1 && newChar.inactiveCompanions) {
          compIndex = newChar.inactiveCompanions.findIndex(c => c.id === companion.id);
          isInactive = true;
      }
      
      if (compIndex === -1) {
          alert("오류: 동료를 찾을 수 없습니다.");
          setShowConfessModal(false);
          return;
      }

      // 미성년자와 성인 간의 고백인 경우 성공과 실패 여부에 상관없이 악명도 15 상승
      if (isCrossAge) {
          newChar.infamy = (newChar.infamy || 0) + 15;
      }
      
      if (success) {
          const targetArray = isInactive ? newChar.inactiveCompanions! : newChar.companions;
          targetArray[compIndex] = {
              ...targetArray[compIndex],
              isLover: true,
              partnerId: "player",
              partnerName: character.name,
              loverStartDate: character.currentDate || '2000-01-01',
              affection: Math.min(100, targetArray[compIndex].affection + 10) 
          };
          
          if (Math.random() < 0.05) {
              const jealousyEv = checkAndTriggerJealousyEvent(newChar, companion.id);
              if (jealousyEv) {
                  newChar.pendingChoiceEvent = jealousyEv;
              }
          }

          const infamyLog = isCrossAge ? ' 세간의 따가운 눈총으로 악명도가 15 상승했습니다.' : '';
          onUpdateCharacter(newChar, `[시스템] 고백 성공! ${companion.name}와(과) 연인이 되었습니다.${infamyLog}`);
          setResultData({
              type: 'success',
              title: '고백 성공!',
              message: `${companion.name}: "저도... 당신을 좋아해요."\n연인이 되었습니다!${isCrossAge ? '\n(세간의 비난으로 악명도가 15 상승했습니다)' : ''}`,
              items: [
                  { label: '관계', after: '연인' }, 
                  { label: '호감도', after: '+10' },
                  ...(isCrossAge ? [{ label: '악명도', after: '+15' }] : [])
              ]
          });
      } else {
          const targetArray = isInactive ? newChar.inactiveCompanions! : newChar.companions;
          targetArray[compIndex] = {
              ...targetArray[compIndex],
              affection: Math.max(-100, targetArray[compIndex].affection - 10) 
          };
          
          const infamyLog = isCrossAge ? ' 부적절한 고백 시도로 세간에 구설수가 돌아 악명도가 15 상승했습니다.' : '';
          onUpdateCharacter(newChar, `[시스템] 고백 실패... ${companion.name}와(과) 어색한 사이가 되었습니다.${infamyLog}`);
          setResultData({
              type: 'failure',
              title: '고백 실패...',
              message: `${companion.name}: "${isCrossAge ? '미안해요... 나이 차이도 있고 아직은 받아들이기 어려워요.' : '미안해요... 아직은 준비가 안 됐어요.'}"\n(거절당했습니다${isCrossAge ? ', 악명도가 15 상승했습니다' : ''})`,
              items: [
                  { label: '호감도', after: '-10' },
                  ...(isCrossAge ? [{ label: '악명도', after: '+15' }] : [])
              ]
          });
      }
      
      setShowConfessModal(false);
  };

  const handleSwornSiblingConfirm = () => {
      if (!character || !onUpdateCharacter) return;
      setIsSwornSiblingProcessing(true);

      const isSister = character.gender === '여성';
      const siblingTitle = isSister ? '의자매' : '의형제';
      const yearsKnown = Math.max(0, (character.currentDate ? parseInt(character.currentDate.split('-')[0]) : 2000) - (companion.metYear || 2000));
      
      // 수락 확률 계산 (기본 60% + 충성도 보너스 + 인연 기간 보너스 + 성향)
      let acceptChance = 60;
      acceptChance += Math.min(25, Math.floor((companion.loyalty || 50) * 0.25));
      acceptChance += Math.min(15, Math.max(0, yearsKnown - 10) * 2);
      
      const pers = companion.personality || '';
      if (pers.includes('충직') || pers.includes('의리') || pers.includes('용감') || pers.includes('다정') || pers.includes('성실')) {
          acceptChance += 10;
      } else if (pers.includes('냉혹') || pers.includes('이기') || pers.includes('오만') || pers.includes('의심')) {
          acceptChance -= 15;
      }
      acceptChance = Math.max(20, Math.min(95, acceptChance));

      const isAccepted = Math.random() * 100 < acceptChance;

      const newChar = { ...character };
      let compIndex = newChar.companions.findIndex(c => c.id === companion.id);
      let isInactive = false;
      if (compIndex === -1 && newChar.inactiveCompanions) {
          compIndex = newChar.inactiveCompanions.findIndex(c => c.id === companion.id);
          isInactive = true;
      }

      if (compIndex === -1) {
          setShowSwornSiblingModal(false);
          setIsSwornSiblingProcessing(false);
          return;
      }

      if (isAccepted) {
          const targetArray = isInactive ? newChar.inactiveCompanions! : newChar.companions;
          targetArray[compIndex] = {
              ...targetArray[compIndex],
              relation: RelationType.SWORN_SIBLING,
              affection: Math.min(100, (targetArray[compIndex].affection || 0) + 10),
              loyalty: Math.min(100, (targetArray[compIndex].loyalty || 0) + 15),
              relations: {
                  ...(targetArray[compIndex].relations || {}),
                  player: {
                      targetId: 'player',
                      type: RelationType.SWORN_SIBLING,
                      affinity: 100,
                      startDate: character.currentDate || '2000-01-01'
                  } as any
              }
          };

          const acceptDialogue = isSister
              ? `"${companion.name}: '오랜 세월 동안 서로를 믿고 의지해왔으니, 이제 피보다 진한 자매로서 생사를 함께해요! 평생 잊지 않겠습니다.'"`
              : `"${companion.name}: '태어난 날은 달라도, 뜻을 같이하고 생사를 함께할 형제가 생겨 든든합니다. 하늘을 우러러 맹세하건대 끝까지 함께하겠습니다!'"` ;

          onUpdateCharacter(newChar, `[관계] ${companion.name}님이 결의 제의를 흔쾌히 수락하여 맹세의 ${siblingTitle}가 되었습니다!`);
          setResultData({
              type: 'success',
              title: `${siblingTitle} 결의 성립!`,
              message: `${acceptDialogue}\n\n상대가 제의를 기쁘게 수락하여 피를 나눈 결의를 맺었습니다!`,
              items: [
                  { label: '관계', after: `${siblingTitle} 결의` },
                  { label: '호감도', after: '+10' },
                  { label: '충성도', after: '+15' }
              ]
          });
      } else {
          const targetArray = isInactive ? newChar.inactiveCompanions! : newChar.companions;
          targetArray[compIndex] = {
              ...targetArray[compIndex],
              affection: Math.max(0, (targetArray[compIndex].affection || 0) - 5)
          };

          const rejectDialogue = `"${companion.name}: '마음과 제의는 정말 고맙고 영광스럽습니다... 하지만 생사를 함께하는 맹세는 결코 가볍지 않은 법입니다. 아직 스스로 부족함이 느껴지니, 조금만 더 신뢰와 시간을 쌓아갑시다.'"` ;

          onUpdateCharacter(newChar, `[관계] ${companion.name}님이 아직 마음의 준비가 되지 않았다며 결의 제의를 완곡히 거절했습니다.`);
          setResultData({
              type: 'failure',
              title: `${siblingTitle} 제의 거절`,
              message: `${rejectDialogue}\n\n상대가 아직 때가 아니라고 느껴 제의를 정중히 거절했습니다.`,
              items: [
                  { label: '호감도', after: '-5' }
              ]
          });
      }

      setIsSwornSiblingProcessing(false);
      setShowSwornSiblingModal(false);
  };

  const handleBreakSwornSiblingConfirm = () => {
      if (!character || !onUpdateCharacter) return;
      const isSister = character.gender === '여성';
      const siblingTitle = isSister ? '의자매' : '의형제';

      const newChar = { ...character };
      let compIndex = newChar.companions.findIndex(c => c.id === companion.id);
      let isInactive = false;
      if (compIndex === -1 && newChar.inactiveCompanions) {
          compIndex = newChar.inactiveCompanions.findIndex(c => c.id === companion.id);
          isInactive = true;
      }

      if (compIndex !== -1) {
          const targetArray = isInactive ? newChar.inactiveCompanions! : newChar.companions;
          targetArray[compIndex] = {
              ...targetArray[compIndex],
              relation: RelationType.FRIEND,
              affection: Math.max(0, (targetArray[compIndex].affection || 0) - 20),
              loyalty: Math.max(0, (targetArray[compIndex].loyalty || 0) - 20)
          };
          if (targetArray[compIndex].relations?.['player']) {
              delete targetArray[compIndex].relations!['player'];
          }
      }

      onUpdateCharacter(newChar, `[관계] ${companion.name}님과의 ${siblingTitle} 결의를 파기했습니다.`);
      setResultData({
          type: 'warning',
          title: `${siblingTitle} 파기`,
          message: `${companion.name}님과의 ${siblingTitle} 결의를 정리하고 일반적인 동료 관계로 돌아갔습니다.`,
          items: [
              { label: '관계', after: '동료' },
              { label: '호감도', after: '-20' },
              { label: '충성도', after: '-20' }
          ]
      });
      setShowBreakSwornSiblingModal(false);
  };

  const handlePersuadeJob = async () => {
      if (!persuadeJobTarget || !character || !onUpdateCharacter) return;
      
      const compAgeNum = companion.birthYear && character.currentDate
          ? Math.max(0, parseInt(character.currentDate.split('년')[0] || '2000') - companion.birthYear)
          : parseInt(String(companion.age || '20').replace(/[^0-9]/g, '')) || 20;
      if (compAgeNum < 20) {
          alert("미성년자 동료에게는 다른 직업을 제안할 수 없습니다.");
          setShowJobPersuasion(false);
          setPersuadeJobTarget(null);
          return;
      }

      if (companion.jobPersuadeCooldownDate && character.currentDate) {
          const daysLeft = diffDays(character.currentDate, companion.jobPersuadeCooldownDate);
          if (daysLeft > 0) {
              setResultData({
                  type: "warning",
                  title: "직업 권유 불가",
                  message: `${companion.name}은(는) 최근 직업 권유를 거절하여 마음에 부담을 느끼고 있습니다.\n${daysLeft}일 후(${companion.jobPersuadeCooldownDate})에 다시 권유할 수 있습니다.`,
                  items: [{ label: "대기 기간", after: `${daysLeft}일 남음` }]
              });
              setShowJobPersuasion(false);
              setPersuadeJobTarget(null);
              return;
          }
      }

      setIsPersuading(true);
      
      let baseChance = (companion.affection / 2) + (companion.loyalty / 2);
      const p = companion.personality || "";
      if (persuadeJobTarget === JobType.CHEF && (p.includes("손재주") || p.includes("성실"))) baseChance += 15;
      if (persuadeJobTarget === JobType.SOLDIER && (p.includes("호전") || p.includes("성실"))) baseChance += 15;
      if (persuadeJobTarget === JobType.MERCENARY && (p.includes("욕심") || p.includes("모험"))) baseChance += 15;
      if (persuadeJobTarget === JobType.BLACKSMITH && (p.includes("근면") || p.includes("기술"))) baseChance += 15;
      if (persuadeJobTarget === JobType.FARMER && (p.includes("성실") || p.includes("자연"))) baseChance += 15;
      if (persuadeJobTarget === JobType.MINER && (p.includes("강인") || p.includes("성실"))) baseChance += 15;
      if (persuadeJobTarget === JobType.BREEDER && (p.includes("성실") || p.includes("자연") || p.includes("애정"))) baseChance += 15;
      if (persuadeJobTarget === JobType.HOUSEKEEPER && (p.includes("청결") || p.includes("성실") || p.includes("근면"))) baseChance += 15;
      if (persuadeJobTarget === JobType.RESEARCHER && (p.includes("지혜") || p.includes("신중") || p.includes("학구"))) baseChance += 15;
      if (persuadeJobTarget === JobType.UNEMPLOYED && p.includes("나태")) baseChance += 20;

      const successChance = Math.min(95, Math.max(5, baseChance));
      const roll = Math.random() * 100;
      const success = roll < successChance;

      const aiReply = await persuadeCompanionJob(companion, persuadeJobTarget, character);
      
      const newChar = { ...character };
      let compIndex = newChar.companions.findIndex(c => c.id === companion.id);
      let isInactive = false;
      if (compIndex === -1 && newChar.inactiveCompanions) {
          compIndex = newChar.inactiveCompanions.findIndex(c => c.id === companion.id);
          isInactive = true;
      }

      if (success && compIndex !== -1) {
          const targetArray = isInactive ? newChar.inactiveCompanions! : newChar.companions;
          const oldJob = targetArray[compIndex].job || JobType.UNEMPLOYED;
          const targetComp = targetArray[compIndex];
          
          const baseClass = targetComp.finalClassName || targetComp.lastClassName || targetComp.secondClassName || targetComp.firstClassName;
          let jobTitle = "모험가";
          if (persuadeJobTarget === JobType.SOLDIER) jobTitle = "군인";
          else if (persuadeJobTarget === JobType.MERCENARY) jobTitle = "용병";
          else if (persuadeJobTarget === JobType.BLACKSMITH) jobTitle = "대장장이";
          else if (persuadeJobTarget === JobType.FARMER) {
              const level = targetComp.professions?.farming?.level || 1;
              if (level >= 100) jobTitle = '전설 농부';
              else if (level >= 80) jobTitle = '명인 농부';
              else if (level >= 50) jobTitle = '장인 농부';
              else if (level >= 20) jobTitle = '숙련 농부';
              else if (level >= 10) jobTitle = '일반 농부';
              else jobTitle = '견습 농부';
          }
          else if (persuadeJobTarget === JobType.CHEF) {
              const level = targetComp.professions?.cooking?.level || 1;
              if (level >= 100) jobTitle = '전설 요리사';
              else if (level >= 80) jobTitle = '명인 요리사';
              else if (level >= 60) jobTitle = '장인 요리사';
              else if (level >= 40) jobTitle = '숙련 요리사';
              else if (level >= 20) jobTitle = '일반 요리사';
              else jobTitle = '견습 요리사';
          }
          else if (persuadeJobTarget === JobType.MINER) {
              const level = targetComp.professions?.mining?.level || 1;
              if (level >= 100) jobTitle = '전설 광부';
              else if (level >= 80) jobTitle = '명인 광부';
              else if (level >= 50) jobTitle = '장인 광부';
              else if (level >= 20) jobTitle = '숙련 광부';
              else if (level >= 10) jobTitle = '일반 광부';
              else jobTitle = '견습 광부';
          }
          else if (persuadeJobTarget === JobType.BREEDER) {
              const level = targetComp.professions?.breeding?.level || 1;
              if (level >= 100) jobTitle = '전설 사육사';
              else if (level >= 80) jobTitle = '명인 사육사';
              else if (level >= 60) jobTitle = '장인 사육사';
              else if (level >= 40) jobTitle = '숙련 사육사';
              else if (level >= 20) jobTitle = '일반 사육사';
              else jobTitle = '견습 사육사';
          }
          else if (persuadeJobTarget === JobType.HOUSEKEEPER) {
              const hkRank = targetComp.housekeeperRank || HousekeeperRank.BEGINNER;
              jobTitle = hkRank;
          }
          else if (persuadeJobTarget === JobType.RESEARCHER) {
              jobTitle = "연구원";
          }

          const newClassType = (baseClass && baseClass !== '미정') ? `${jobTitle} (${baseClass})` : jobTitle;

          targetArray[compIndex] = {
              ...targetComp,
              job: persuadeJobTarget,
              classType: newClassType,
              housekeeperRank: targetComp.housekeeperRank || HousekeeperRank.BEGINNER,
              housekeeperExp: targetComp.housekeeperExp || 0,
              loyalty: Math.min(100, targetComp.loyalty + 5),
              jobPersuadeCooldownDate: undefined
          };
          onUpdateCharacter(newChar, `[시스템] 직업 권유 성공! ${companion.name}의 직업이 ${persuadeJobTarget}(으)로 변경되었습니다.`);
          setResultData({
              type: 'success',
              title: '설득 성공!',
              message: `${companion.name}: ${aiReply}`,
              items: [{ label: '직업', before: oldJob, after: persuadeJobTarget }]
          });
      } else {
          const cooldownDate = addDays(character.currentDate || "2000-01-01", 7);
          if (compIndex !== -1) {
              const targetArray = isInactive ? newChar.inactiveCompanions! : newChar.companions;
              targetArray[compIndex] = {
                  ...targetArray[compIndex],
                  jobPersuadeCooldownDate: cooldownDate
              };
          }
          setResultData({
              type: "failure",
              title: "설득 실패",
              message: `${companion.name}: ${aiReply}\n\n(마음의 정리가 필요하여 7일 동안은 다시 직업을 권유할 수 없습니다)`,
              items: [
                  { label: "결과", after: "거절당함" },
                  { label: "재시도 가능일", after: cooldownDate }
              ]
          });
          onUpdateCharacter(newChar, `[시스템] 직업 권유 실패... ${companion.name}은(는) 현재 상태를 유지하고 싶어 합니다. (7일간 권유 제한)`);
      }

      setIsPersuading(false);
      setShowJobPersuasion(false);
      setPersuadeJobTarget(null);
  };

  const handleLiberateSlave = () => {
    if (!character || !onUpdateCharacter || companion.job !== JobType.SLAVE) return;

    const newChar = { ...character };
    let compIndex = newChar.companions.findIndex(c => c.id === companion.id);
    let isInactive = false;
    
    if (compIndex === -1 && newChar.inactiveCompanions) {
        compIndex = newChar.inactiveCompanions.findIndex(c => c.id === companion.id);
        isInactive = true;
    }
    
    if (compIndex === -1) return;

    const targetArray = isInactive ? newChar.inactiveCompanions! : newChar.companions;
    const targetComp = targetArray[compIndex];

    targetArray[compIndex] = {
        ...targetComp,
        job: JobType.UNEMPLOYED,
        isLover: false,
        partnerId: undefined,
        partnerName: undefined,
        isSpouse: false,
        affection: Math.min(100, targetComp.affection + 30),
        classType: targetComp.classType.replace(/노예|Slave/g, '').replace(/\s*\(\s*\)/g, '').trim() || "해방된 모험가"
    };

    // Remove bond skills associated with this companion
    if (newChar.bondSkills) {
        newChar.bondSkills = newChar.bondSkills.filter(bs => 
            !(bs.companionId === companion.id && bs.sourceId === undefined) && 
            !(bs.sourceId === companion.id && bs.companionId === undefined)
        );
    }

    onUpdateCharacter(newChar, `[노예 해방] ${companion.name}을(를) 속박에서 해방시켰습니다. 이제 그녀는 자유로운 동료입니다.`);
    
    setResultData({
        type: 'levelup',
        title: '노예 해방',
        message: `${companion.name}이(가) 자유를 되찾았습니다!\n"감사합니다... 이 은혜는 평생 잊지 않겠습니다."\n호감도가 크게 상승하고 관계가 일반 동료로 재편되었습니다.`,
        items: [
            { label: '직업 변경', before: '노예', after: '무직(자유인)' },
            { label: '호감도', after: '+30' },
            { label: '관계', after: '동료' }
        ]
    });
  };

  const handleSendMessage = async () => {
      if (!chatInput.trim() || isSending) return;
      setIsSending(true);
      const msg = chatInput;
      setChatInput('');
      try { await onChat(msg); } finally { setIsSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } };

  const getCompanionJobInfo = () => {
      if (isChild && companion.childData?.school?.isEnrolled) {
          return {
              label: `${companion.childData.school.name} (${companion.childData.school.grade || 1}학년)`,
              icon: GraduationCap,
              color: 'text-cyan-400'
          };
      }
      if (companion.job === JobType.MERCENARY || (companion.classType && (companion.classType.includes('용병') || companion.classType.includes('Mercenary')))) {
          return {
              label: `${companion.mercenaryRank || 'F'}급 용병`,
              icon: Sword,
              color: 'text-red-400'
          };
      }
      if (companion.job === JobType.SOLDIER || (companion.classType && (companion.classType.includes('군인') || companion.classType.includes('Soldier')))) {
          return {
              label: `${companion.militaryRank || MilitaryRank.PVT} (군인)`,
              icon: Medal,
              color: 'text-slate-300'
          };
      }
      if (companion.job === JobType.BLACKSMITH || (companion.classType && (companion.classType.includes('대장장이') || companion.classType.includes('Blacksmith')))) {
          const rank = companion.blacksmithRank || BlacksmithRank.BEGINNER;
          return {
              label: `${rank} 대장장이`,
              icon: Hammer,
              color: 'text-orange-400'
          };
      }
      if (companion.job === JobType.ALCHEMIST || companion.job === '연금술사' as any || (companion.classType && companion.classType.includes('연금술사'))) {
          const rank = companion.alchemistRank || AlchemistRank.BEGINNER;
          return {
              label: `${rank} 연금술사`,
              icon: FlaskConical,
              color: 'text-purple-400'
          };
      }
      if (companion.job === JobType.HOUSEKEEPER || companion.job === '하우스 키퍼' as any || companion.job === '하우스키퍼' as any) {
          const rank = companion.housekeeperRank || HousekeeperRank.BEGINNER;
          return {
              label: `${rank}`,
              icon: Home,
              color: 'text-amber-400'
          };
      }
      if (companion.job === JobType.SLAVE) {
          return {
              label: '노예',
              icon: Lock,
              color: 'text-red-500'
          };
      }
      return {
          label: companion.job || JobType.UNEMPLOYED,
          icon: Briefcase,
          color: 'text-slate-500'
      };
  };

  const jobInfo = getCompanionJobInfo();

  const getInfamyStage = (val: number = 0) => {
      const { STAGES } = INFAMY_CONFIG;
      if (val >= STAGES.CALAMITY.threshold) return STAGES.CALAMITY;
      if (val >= STAGES.WANTED.threshold) return STAGES.WANTED;
      if (val >= STAGES.CRIMINAL.threshold) return STAGES.CRIMINAL;
      if (val >= STAGES.SUSPECT.threshold) return STAGES.SUSPECT;
      return STAGES.NONE;
  };

  const infamyStage = getInfamyStage(companion.infamy || 0);



const groupedPlayerInventory = groupItemsInModal(playerInventory);

  return createPortal(
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
        
        {resultData && (
             <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/80 p-4">
                <div className={`w-full max-w-sm bg-slate-900 border-2 rounded-xl shadow-2xl overflow-hidden ${resultData.type === 'success' || resultData.type === 'levelup' ? 'border-green-500' : 'border-red-500'}`}>
                    <div className="p-6 text-center">
                        <h3 className={`text-2xl font-bold mb-2 ${resultData.type === 'success' || resultData.type === 'levelup' ? 'text-green-400' : 'text-red-400'}`}>{resultData.title}</h3>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap mb-4">{resultData.message}</p>
                        <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2 mb-4">
                            {resultData.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-xs">
                                    <span className="text-slate-500">{item.label}</span>
                                    <span className="text-white font-bold">{item.after}</span>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setResultData(null)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold">확인</button>
                    </div>
                </div>
             </div>
        )}

        {/* [NEW] 개명 모달 오버레이 */}
        {showRenameModal && (
            <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/95 p-4 animate-in fade-in">
                <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                    <div className="text-center mb-6">
                        <Edit size={40} className="mx-auto text-amber-500 mb-2"/>
                        <h3 className="text-xl font-bold text-white">동료 개명</h3>
                        <p className="text-xs text-slate-400 mt-1">동료에게 새로운 이름을 지어줍니다.<br/>성공 확률은 50%입니다.</p>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6">
                        <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">New Name</label>
                        <input 
                            type="text" 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white font-bold focus:border-amber-500 outline-none"
                            placeholder="새로운 이름 입력"
                            value={renameInput}
                            onChange={(e) => setRenameInput(e.target.value)}
                            maxLength={12}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowRenameModal(false)} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-lg font-bold hover:bg-slate-700 transition-colors">취소</button>
                        <button onClick={handleRenameSubmit} disabled={!renameInput.trim()} className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg font-bold shadow-lg transition-all transform active:scale-95">개명 시도</button>
                    </div>
                </div>
            </div>
        )}

        {zoomedImg && (
            <div 
                className="fixed inset-0 z-[220] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-300"
                onClick={() => setZoomedImg(null)}
            >
                <div className="relative max-w-4xl max-h-full">
                    <img src={zoomedImg} alt="Zoomed" className="w-full h-auto max-h-[85vh] rounded-2xl border border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.4)] animate-in zoom-in duration-300" />
                    <button className="absolute -top-4 -right-4 bg-slate-800 text-white p-2 rounded-full border border-slate-600 hover:bg-slate-700 shadow-xl transition-all">
                        <X size={24} />
                    </button>
                    <div className="mt-4 text-center">
                        <p className="text-amber-500 font-cinzel text-lg font-bold tracking-widest uppercase">Divine Messenger Visual</p>
                        <p className="text-slate-500 text-xs mt-1">클릭하여 닫기</p>
                    </div>
                </div>
            </div>
        )}

        {showJobPersuasion && (
            <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/90 p-4 animate-in fade-in zoom-in-95">
                <div className="bg-slate-900 border border-indigo-500 rounded-xl p-6 w-full max-w-sm shadow-2xl">
                    <div className="text-center mb-6">
                        <Briefcase size={40} className="mx-auto text-indigo-400 mb-2"/>
                        <h3 className="text-xl font-bold text-white">직업 권유</h3>
                        <p className="text-xs text-slate-400 mt-1">동료에게 새로운 삶의 길을 제안합니다.</p>
                    </div>

                    <div className="space-y-2 mb-6">
                        <label className="text-[10px] text-slate-500 font-bold uppercase">목표 직업 선택</label>
                        {[JobType.SOLDIER, JobType.MERCENARY, JobType.BLACKSMITH, JobType.FARMER, JobType.MINER, JobType.CHEF, JobType.ALCHEMIST, JobType.BREEDER, JobType.HOUSEKEEPER, JobType.RESEARCHER, JobType.UNEMPLOYED].map(job => (
                            <button 
                                key={job}
                                onClick={() => setPersuadeJobTarget(job)}
                                className={`w-full p-3 rounded-lg border text-left flex justify-between items-center transition-all ${persuadeJobTarget === job ? 'bg-indigo-900/40 border-indigo-500' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:border-slate-600'}`}
                            >
                                <span className="font-bold text-sm">{job}</span>
                                {persuadeJobTarget === job && <UserCheck size={16} className="text-indigo-400"/>}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => { setShowJobPersuasion(false); setPersuadeJobTarget(null); }} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded font-bold hover:bg-slate-700">취소</button>
                        <button 
                            onClick={handlePersuadeJob} 
                            disabled={!persuadeJobTarget || isPersuading}
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded font-bold shadow-lg transition-all flex items-center justify-center"
                        >
                            {isPersuading ? <Loader2 size={18} className="animate-spin" /> : "설득 시작"}
                        </button>
                    </div>
                </div>
            </div>
        )}
        {showMarriageModal && character && onUpdateCharacter && (
            <MarriageModal 
                character={character}
                targetCompanion={companion}
                onClose={() => setShowMarriageModal(false)}
                onUpdateCharacter={onUpdateCharacter}
            />
        )}

        {showDivorceModal && (
            <DivorceModal
                companion={companion}
                onClose={() => setShowDivorceModal(false)}
                onConfirm={() => {
                    if (onDivorce) onDivorce();
                    setShowDivorceModal(false);
                }}
            />
        )}
        
        {showBreakUpConfirm && (
            <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/90 p-4 animate-in fade-in">
                <div className="bg-slate-900 border border-slate-600 rounded-xl p-6 w-full max-w-sm text-center shadow-2xl">
                    <HeartCrack size={48} className="mx-auto text-slate-500 mb-4"/>
                    <h3 className="text-xl font-bold text-white mb-2">이별하시겠습니까?</h3>
                    <p className="text-sm text-slate-400 mb-6">
                        {companion.name}와(과)의 연인 관계를 끝냅니다.<br/>
                        호감도가 크게 하락하며, 관계가 서먹해질 수 있습니다.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowBreakUpConfirm(false)} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded font-bold hover:bg-slate-700">취소</button>
                        <button onClick={handleBreakUpConfirm} className="flex-1 py-3 bg-red-800 text-white rounded font-bold hover:bg-red-700 shadow-lg">이별 확정</button>
                    </div>
                </div>
            </div>
        )}

        {showConfessModal && (() => {
            const isCrossAge = !ethicsAllowed;
            const estChance = isCrossAge 
                ? Math.min(35, 15 + Math.floor(Math.max(0, companion.affection - 70) * 0.5))
                : Math.min(100, 50 + Math.max(0, companion.affection - 70));

            return (
                <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/90 p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-pink-500 rounded-xl p-5 sm:p-6 w-full max-w-sm text-center shadow-2xl">
                        <Heart size={44} className="mx-auto text-pink-500 mb-3 animate-pulse"/>
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5">고백하시겠습니까?</h3>
                        <p className="text-xs sm:text-sm text-pink-200 mb-3 leading-relaxed">
                            {companion.name}에게 마음을 전합니다.<br/>
                            성공하면 연인이 되지만, 실패하면 관계가 어색해질 수 있습니다.
                        </p>

                        {isCrossAge && (
                            <div className="bg-rose-950/60 border border-rose-600/70 p-2.5 rounded-lg mb-3 text-left">
                                <div className="flex items-center gap-1.5 text-rose-300 font-bold text-xs mb-1">
                                    <AlertCircle size={14} className="shrink-0 text-rose-400" />
                                    <span>세간의 따가운 시선 (미성년자 성인 관계)</span>
                                </div>
                                <p className="text-[11px] text-rose-200/90 leading-tight">
                                    미성년자와 성인 간의 교제 시도로 인해 성공 확률이 대폭 낮아지며, 고백의 성공 및 실패 여부와 무관하게 <strong>악명도가 15 상승</strong>합니다.
                                </p>
                            </div>
                        )}

                        <div className="bg-slate-800 p-3 rounded border border-slate-700 mb-4 sm:mb-5 text-left space-y-1">
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>현재 호감도</span>
                                <span className="text-pink-400 font-bold">{companion.affection}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>성공 확률 (예상)</span>
                                <span className={isCrossAge ? "text-amber-400 font-bold" : "text-green-400 font-bold"}>
                                    {estChance}%{isCrossAge ? ' (패널티 적용)' : ''}
                                </span>
                            </div>
                            {isCrossAge && (
                                <div className="flex justify-between text-xs text-rose-300 pt-1 border-t border-slate-700/60">
                                    <span>악명도 변동</span>
                                    <span className="font-bold text-rose-400">+15 (고백 즉시 적용)</span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 sm:gap-3">
                            <button onClick={() => setShowConfessModal(false)} className="flex-1 py-2.5 sm:py-3 bg-slate-800 text-slate-300 rounded font-bold hover:bg-slate-700 text-xs sm:text-sm">취소</button>
                            <button onClick={handleConfessionConfirm} className="flex-1 py-2.5 sm:py-3 bg-pink-600 text-white rounded font-bold hover:bg-pink-500 shadow-lg text-xs sm:text-sm">고백하기</button>
                        </div>
                    </div>
                </div>
            );
        })()}

        {showSwornSiblingModal && (() => {
            const isSister = character?.gender === '여성';
            const siblingTitle = isSister ? '의자매' : '의형제';
            const yearsKnown = Math.max(0, (character?.currentDate ? parseInt(character.currentDate.split('-')[0]) : 2000) - (companion.metYear || 2000));
            
            let estChance = 60;
            estChance += Math.min(25, Math.floor((companion.loyalty || 50) * 0.25));
            estChance += Math.min(15, Math.max(0, yearsKnown - 10) * 2);
            const pers = companion.personality || '';
            if (pers.includes('충직') || pers.includes('의리') || pers.includes('용감') || pers.includes('다정') || pers.includes('성실')) {
                estChance += 10;
            } else if (pers.includes('냉혹') || pers.includes('이기') || pers.includes('오만') || pers.includes('의심')) {
                estChance -= 15;
            }
            estChance = Math.max(20, Math.min(95, estChance));

            return (
                <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/90 p-3 sm:p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-indigo-500/80 rounded-2xl p-5 sm:p-6 w-full max-w-sm text-center shadow-2xl shadow-indigo-950/50">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-indigo-950/80 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
                            <Handshake size={32} className="animate-pulse" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{siblingTitle} 결의를 제의하시겠습니까?</h3>
                        <p className="text-xs sm:text-sm text-indigo-200/90 mb-4 leading-relaxed">
                            {companion.name}에게 생사를 함께할 {siblingTitle} 결의를 제의합니다.<br/>
                            <span className="text-slate-400 text-xs">상대의 심경과 인연에 따라 승낙하거나 거절할 수 있습니다.</span>
                        </p>

                        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2 mb-5 text-left text-xs">
                            <div className="flex justify-between items-center text-slate-400">
                                <span>함께한 인연</span>
                                <span className="text-indigo-300 font-bold">{yearsKnown}년 (10년 이상 충족)</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400">
                                <span>호감도</span>
                                <span className="text-pink-400 font-bold">{companion.affection} / 100</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400">
                                <span>충성도</span>
                                <span className="text-emerald-400 font-bold">{companion.loyalty || 50} / 100</span>
                            </div>
                            {companion.personality && (
                                <div className="flex justify-between items-center text-slate-400">
                                    <span>상대 성향</span>
                                    <span className="text-amber-300 font-bold">{companion.personality}</span>
                                </div>
                            )}
                            <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center">
                                <span className="text-slate-300 font-medium">상대 승낙 예상 확률</span>
                                <span className={`font-extrabold ${estChance >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{estChance}%</span>
                            </div>
                        </div>

                        <div className="flex gap-2.5">
                            <button 
                                onClick={() => setShowSwornSiblingModal(false)} 
                                disabled={isSwornSiblingProcessing}
                                className="flex-1 py-2.5 sm:py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs sm:text-sm font-bold transition-colors"
                            >
                                취소
                            </button>
                            <button 
                                onClick={handleSwornSiblingConfirm} 
                                disabled={isSwornSiblingProcessing}
                                className="flex-1 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-1.5"
                            >
                                {isSwornSiblingProcessing ? <Loader2 size={16} className="animate-spin" /> : <Handshake size={16} />}
                                <span>결의 제의하기</span>
                            </button>
                        </div>
                    </div>
                </div>
            );
        })()}

        {showBreakSwornSiblingModal && (() => {
            const isSister = character?.gender === '여성';
            const siblingTitle = isSister ? '의자매' : '의형제';

            return (
                <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/90 p-3 sm:p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-rose-900/60 rounded-2xl p-5 sm:p-6 w-full max-w-sm text-center shadow-2xl shadow-rose-950/40">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-rose-950/80 border border-rose-600/50 flex items-center justify-center text-rose-400">
                            <LogOut size={28} />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{siblingTitle} 결의를 파기하시겠습니까?</h3>
                        <p className="text-xs sm:text-sm text-slate-300 mb-5 leading-relaxed">
                            {companion.name}님과의 {siblingTitle} 결의를 종료합니다.<br/>
                            <span className="text-rose-400 text-xs">호감도와 충성도가 크게 하락하며 일반 동료 관계로 전환됩니다.</span>
                        </p>
                        <div className="flex gap-2.5">
                            <button 
                                onClick={() => setShowBreakSwornSiblingModal(false)} 
                                className="flex-1 py-2.5 sm:py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs sm:text-sm font-bold transition-colors"
                            >
                                취소
                            </button>
                            <button 
                                onClick={handleBreakSwornSiblingConfirm} 
                                className="flex-1 py-2.5 sm:py-3 bg-rose-800 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-lg shadow-rose-950/50"
                            >
                                파기 확정
                            </button>
                        </div>
                    </div>
                </div>
            );
        })()}

        {showDetailedStats && (
            <DetailedStatsModal 
                stats={finalStats} 
                bonusStats={flatEquipBonus} 
                equipment={companion.equipment as Record<string, Item | undefined>} 
                statusEffects={companion.statusEffects}
                name={companion.name} 
                shinryokuType={companion.shinryokuType} 
                weaponMastery={companion.weaponMastery} 
                skills={companion.skills}
                affection={companion.affection} // [NEW]
                bondBonus={character ? getBondBonus(character, companion) : undefined}
                elementalDamageBoosts={companion.base?.elementalDamageBoosts}
                elementalResistanceBoosts={companion.base?.elementalResistanceBoosts}
                combatStyle={companion.combatStyle}
                onClose={() => setShowDetailedStats(false)} 
            />
        )}

        {isFamilyTreeOpen && character && (
            <CompanionFamilyTreeModal 
                character={character}
                companion={companion}
                onClose={() => setIsFamilyTreeOpen(false)}
            />
        )}

        <div className={`bg-slate-950 w-full max-w-6xl w-[98vw] sm:w-[95vw] h-[95vh] sm:h-[85vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col relative transition-all ${isLoverWithPlayer ? 'border-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.3)]' : 'border-slate-700'}`}>
            <div className="bg-slate-900 border-b border-slate-800 shrink-0 flex flex-col">
                <div className="p-3 sm:p-4 flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
                    <div className="flex items-center space-x-3 w-full md:w-auto">
                        <div 
                            onClick={() => displayVisualUrl && setZoomedImg(displayVisualUrl)}
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center border relative shrink-0 overflow-hidden ${displayVisualUrl ? 'cursor-zoom-in' : ''} ${isLoverWithPlayer ? 'bg-pink-950/30 border-pink-500' : 'bg-slate-800 border-slate-700'}`}
                        >
                            {displayVisualUrl ? (
                                <img src={displayVisualUrl} className="w-full h-full object-cover" alt="Avatar" />
                            ) : isMonster ? (
                                <PawPrint size={24} className="text-slate-400"/>
                            ) : (
                                <User size={24} className={isLoverWithPlayer ? 'text-pink-300' : 'text-slate-400'} />
                            )}
                            {!isMonster && canEvolve && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span></span>}
                            {isLoverWithPlayer && <Heart size={14} className="absolute -bottom-1 -right-1 text-pink-500 fill-pink-500 drop-shadow animate-pulse" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <h2 className="text-xl sm:text-2xl font-black text-amber-500 leading-tight truncate" title={companion.name}>
                                    {companion.name}
                                </h2>
                                {/* [NEW] 개명 아이콘 */}
                                <button 
                                    onClick={() => {
                                        if (isCustom) {
                                            setShowRenameModal(true);
                                        } else {
                                            setResultData({
                                                type: 'failure',
                                                title: '이름 변경 불가',
                                                message: `${isMonster ? '일반 몬스터는' : '일반 동료는'} 이름을 변경할 수 없습니다.\n연금술실험소의 [커스텀 전환] 탭에서 커스텀으로 전환한 후 이용해주세요.`,
                                                items: [{ label: '현재 상태', after: isMonster ? '일반 몬스터' : '일반 동료' }, { label: '요구 조건', after: '커스텀 전환' }]
                                            });
                                        }
                                    }}
                                    className={`p-1 rounded transition-all shrink-0 ${isCustom ? 'hover:bg-slate-800 text-slate-400 hover:text-amber-500' : 'text-slate-600 hover:text-slate-400'}`}
                                    title={isCustom ? "이름 변경" : `${isMonster ? '일반 몬스터' : '일반 동료'}는 개명 불가 (연금술실험소에서 커스텀 전환 필요)`}
                                >
                                    {isCustom ? <Edit size={14}/> : <Lock size={14}/>}
                                </button>
                                {getDivineOrDemonJobVisualUrl(companion.job, companion.gender) && (
                                    <button 
                                        type="button"
                                        onClick={() => setShowAppearanceModal(true)}
                                        className="px-2 py-0.5 text-[11px] font-bold text-amber-300 hover:text-white bg-amber-950/60 hover:bg-amber-900 border border-amber-500/40 rounded-lg flex items-center gap-1 transition-all active:scale-95 shrink-0"
                                        title="외형 변경"
                                    >
                                        <Sparkles size={11} className="text-amber-400" />
                                        <span>외형 선택</span>
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {isCustom ? (
                                    <span className="text-[10px] bg-purple-900/60 border border-purple-500/60 text-purple-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-bold shrink-0">
                                        <Sparkles size={10} className="text-purple-400"/> {isMonster ? '커스텀 몬스터' : '커스텀 동료'}
                                    </span>
                                ) : (
                                    <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0" title={isMonster ? "연금술실험소에서 커스텀 몬스터로 전환 가능" : "연금술실험소에서 커스텀 동료로 전환 가능"}>
                                        <User size={10} className="text-slate-500"/> {isMonster ? '일반 몬스터' : '일반 동료'}
                                    </span>
                                )}
                                {companion.isSpouse ? (
                                    <span className="text-[10px] bg-rose-600 text-white px-2.5 py-0.5 rounded-full flex items-center shadow-md animate-pulse shrink-0 font-bold border border-rose-400">
                                        <Heart size={10} className="fill-white mr-1" /> 💍 배우자 (부부)
                                    </span>
                                ) : isLoverWithPlayer ? (
                                    <span className="text-[10px] bg-pink-600 text-white px-2.5 py-0.5 rounded-full flex items-center shadow-md animate-pulse shrink-0 font-bold border border-pink-400">
                                        <Heart size={10} className="fill-white mr-1" /> 💖 연인
                                    </span>
                                ) : null}
                                {isChild && (
                                    <span className="text-[10px] bg-cyan-700 text-white px-2.5 py-0.5 rounded-full flex items-center shadow-md shrink-0 font-bold border border-cyan-400">
                                        👶 플레이어의 자녀
                                    </span>
                                )}
                                {(companion.relation === RelationType.SIBLING || (character && areSiblings(character, companion, character))) && (
                                    <span className="text-[10px] bg-emerald-700 text-white px-2.5 py-0.5 rounded-full flex items-center shadow-md shrink-0 font-bold border border-emerald-400" title={character && isHalfSibling(character, companion, character) ? "이복/이부 형제자매 관계" : "친형제자매 관계"}>
                                        👥 {character && isHalfSibling(character, companion, character) ? '플레이어의 이복/이부 형제' : '플레이어의 형제자매'}
                                    </span>
                                )}
                                {(companion.relation === RelationType.SWORN_SIBLING || companion.relations?.['player']?.type === RelationType.SWORN_SIBLING) && (
                                    <span className="text-[10px] bg-indigo-700 text-white px-2.5 py-0.5 rounded-full flex items-center shadow-md shrink-0 font-bold border border-indigo-400">
                                        🤝 {character?.gender === '여성' ? '의자매' : '의형제'} 관계
                                    </span>
                                )}
                                {companion.pregnancy?.isPregnant && (
                                    <span className="text-[10px] bg-amber-600 text-white px-2.5 py-0.5 rounded-full flex items-center shadow-md shrink-0 font-bold border border-amber-400">
                                        🤰 임신 중 (출산예정: {companion.pregnancy.dueDate})
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1 flex-wrap gap-y-1">
                                <span>Lv.{companion.level}</span><span>•</span><span>{companion.race}</span><span>•</span>
                                {!isMonster && <span>{companion.age} •</span>}
                                <span className={`font-bold border px-1 rounded ${isMonster ? 'text-green-400 border-green-900/50 bg-green-950/30' : 'text-amber-600 border-amber-900/50 bg-amber-950/30'}`}>{tierDisplay}</span>
                                {companion.combatStyle && COMBAT_STYLE_CONFIG[companion.combatStyle] && (
                                    <>
                                        <span>•</span>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${COMBAT_STYLE_CONFIG[companion.combatStyle].bgColor} ${COMBAT_STYLE_CONFIG[companion.combatStyle].borderColor} ${COMBAT_STYLE_CONFIG[companion.combatStyle].color}`} title={`특화 무기: ${COMBAT_STYLE_CONFIG[companion.combatStyle].specialtyText} (공격력 +${getCombatStyleBonusPercent(COMBAT_STYLE_CONFIG[companion.combatStyle].tier)}%)`}>
                                            {COMBAT_STYLE_CONFIG[companion.combatStyle].label}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
                         {isMonster && onMount && (
                             <button onClick={onMount} className="px-3 py-1 bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-500 text-indigo-200 rounded text-xs transition-colors flex items-center mr-2 shrink-0">
                                 <Sword size={12} className="mr-1"/> 탈것 장착
                             </button>
                         )}

                         {isMonster ? (
                             <button onClick={() => setShowReturnToFarmModal(true)} className="px-3 py-1 bg-amber-900/30 hover:bg-amber-800/50 text-amber-200 border border-amber-700/50 rounded text-xs transition-colors flex items-center mr-2 shrink-0 animate-pulse">
                                 {isGuardian ? <Landmark size={12} className="mr-1"/> : <Home size={12} className="mr-1"/>}
                                 {isGuardian ? '성전 복귀' : '사육소 복귀'}
                             </button>
                         ) : (
                             <button onClick={() => setShowPartWaysOptions(true)} className="px-3 py-1 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 border border-slate-700 rounded text-xs transition-colors flex items-center mr-2 shrink-0"><LogOut size={12} className="mr-1"/> 헤어지기</button>
                         )}

                         <button 
                             onClick={() => setIsFamilyTreeOpen(true)}
                             className="px-3 py-1 bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-500 text-indigo-100 rounded text-xs transition-colors flex items-center mr-2 shrink-0"
                         >
                             <GitBranch size={12} className="mr-1"/> 가계도
                         </button>

                         {!isMonster && (() => {
                             const isSameGender = Boolean(companion.gender && character?.gender && companion.gender === character.gender);
                             const isSwornSib = companion.relation === RelationType.SWORN_SIBLING || companion.relations?.['player']?.type === RelationType.SWORN_SIBLING;
                             const yearsKnown = Math.max(0, (character?.currentDate ? parseInt(character.currentDate.split('-')[0]) : 2000) - (companion.metYear || 2000));
                             const canFormSwornSibling = isSameGender && yearsKnown >= 10 && companion.affection >= 100 && !isSwornSib;

                             if (!isSameGender) return null;

                             if (isSwornSib) {
                                 return (
                                     <button 
                                         onClick={() => setShowBreakSwornSiblingModal(true)}
                                         className="px-3 py-1 bg-slate-800 hover:bg-rose-950 text-rose-300 border border-rose-800 rounded text-xs transition-colors flex items-center mr-2 shrink-0"
                                     >
                                         🤝 {character?.gender === '여성' ? '의자매' : '의형제'} 파기
                                     </button>
                                 );
                             }

                             if (canFormSwornSibling) {
                                 return (
                                     <button 
                                         onClick={() => setShowSwornSiblingModal(true)}
                                         className="px-3 py-1 bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-500 text-indigo-200 rounded text-xs transition-colors flex items-center mr-2 shrink-0 animate-pulse font-bold"
                                     >
                                         🤝 {character?.gender === '여성' ? '의자매' : '의형제'} 맺기
                                     </button>
                                 );
                             }

                             return (
                                 <div 
                                     className="px-3 py-1 bg-slate-900 border border-slate-800 text-slate-600 rounded text-xs flex items-center mr-2 shrink-0 cursor-not-allowed"
                                     title={`조건: 같은 성별, 인연 10년 이상(현재: ${yearsKnown}년), 호감도 100(현재: ${companion.affection})`}
                                 >
                                     🤝 {character?.gender === '여성' ? '의자매' : '의형제'} 불가
                                 </div>
                             );
                         })()}
                         
                         {canConfess && (
                             <button 
                                 onClick={() => setShowConfessModal(true)} 
                                 className={`px-3 py-1 border rounded text-xs transition-colors flex items-center mr-2 shrink-0 animate-pulse ${
                                     !ethicsAllowed 
                                         ? 'bg-rose-950/60 hover:bg-rose-900 border-rose-500 text-rose-300' 
                                         : 'bg-pink-900/40 hover:bg-pink-800/60 border border-pink-500 text-pink-300'
                                 }`}
                                 title={!ethicsAllowed ? '미성년자와 성인 간의 교제 시도: 성공 확률 감소 및 악명도 상승 주의' : undefined}
                             >
                                 <Heart size={12} className="mr-1"/> 고백{!ethicsAllowed ? ' (악명도 주의)' : ''}
                             </button>
                         )}
                         
                         {!isMonster && isLoverWithPlayer && !companion.isSpouse && (
                             <button onClick={() => setShowBreakUpConfirm(true)} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-400 hover:text-white rounded text-xs transition-colors flex items-center mr-2 shrink-0"><HeartCrack size={12} className="mr-1"/> 이별</button>
                         )}

                         {!isMonster && isLoverWithPlayer && !companion.isSpouse && character && (
                             companion.affection >= 100 && companion.loyalty >= 100 ? (
                                <button onClick={() => setShowMarriageModal(true)} className="px-3 py-1 bg-gradient-to-r from-pink-900 to-rose-900 border border-pink-500 text-pink-200 rounded text-xs transition-colors flex items-center mr-2 shrink-0 hover:brightness-110"><Gem size={12} className="mr-1"/> 청혼</button>
                             ) : (
                                 <div className="px-3 py-1 bg-slate-900 border border-slate-700 text-slate-600 rounded text-xs flex items-center mr-2 shrink-0 cursor-not-allowed" title="조건: 호감도 100, 충성도 100"><Gem size={12} className="mr-1"/> 청혼 불가</div>
                             )
                         )}

                         {!isMonster && companion.isSpouse && isLoverWithPlayer && onDivorce && (
                             <button onClick={() => setShowDivorceModal(true)} className="px-3 py-1 bg-red-955 hover:bg-red-900 border border-red-700 text-red-300 rounded text-xs transition-colors flex items-center mr-2 shrink-0"><HeartCrack size={12} className="mr-1"/> 이혼</button>
                         )}

                         {!isMonster && isCompanionEligibleForSwitch(companion) && character && onUpdateCharacter && (
                             <button 
                                 onClick={() => setShowSwitchPlayerModal(true)} 
                                 className="px-3 py-1 bg-gradient-to-r from-amber-900/80 to-yellow-900/80 hover:from-amber-800 hover:to-yellow-800 border border-amber-500/80 text-amber-200 font-bold rounded text-xs transition-all flex items-center mr-2 shrink-0 shadow-md hover:brightness-110"
                                 title="커스텀 동료와 주인공(플레이어) 역할을 서로 스위칭합니다."
                             >
                                 <Crown size={12} className="mr-1 text-amber-400" /> 주인공 전환
                             </button>
                         )}

                         <div className="w-px h-4 bg-slate-700 mx-2 shrink-0"></div>
                         <button onClick={() => setActiveTab('info')} className={`px-3 py-1 rounded text-xs font-bold transition-colors shrink-0 ${activeTab === 'info' ? 'bg-slate-800 text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>정보</button>
                         <button onClick={() => setActiveTab('growth')} className={`px-3 py-1 rounded text-xs font-bold transition-colors shrink-0 ${activeTab === 'growth' ? 'bg-slate-800 text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>성장</button>
                         <button onClick={() => setActiveTab('equipment')} className={`px-3 py-1 rounded text-xs font-bold transition-colors shrink-0 ${activeTab === 'equipment' ? 'bg-slate-800 text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>장비</button>
                         {!isMonster && (
                             <button onClick={() => setActiveTab('titles')} className={`px-3 py-1 rounded text-xs font-bold transition-colors shrink-0 ${activeTab === 'titles' ? 'bg-slate-800 text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>칭호</button>
                         )}
                         <button onClick={() => setActiveTab('skills')} className={`px-3 py-1 rounded text-xs font-bold transition-colors shrink-0 ${activeTab === 'skills' ? 'bg-slate-800 text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>스킬</button>
                         {!isMonster && (
                             <button onClick={() => setActiveTab('liberation')} className={`px-3 py-1 rounded text-xs font-bold transition-colors shrink-0 ${activeTab === 'liberation' ? 'bg-slate-800 text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>해방</button>
                         )}
                         <button onClick={() => setActiveTab('chat')} className={`px-3 py-1 rounded text-xs font-bold transition-colors shrink-0 flex items-center ${activeTab === 'chat' ? 'bg-slate-800 text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>대화{isLoverWithPlayer && <Heart size={8} className="ml-1 fill-pink-500 text-pink-500"/>}</button>
                         <div className="w-px h-4 bg-slate-700 mx-2 shrink-0"></div>
                         <button onClick={onClose} className="text-slate-500 hover:text-white p-1 shrink-0"><X size={20}/></button>
                    </div>
                </div>
                {companion.statusEffects && companion.statusEffects.length > 0 && (<div className="px-4 pb-2 flex wrap">{companion.statusEffects.map((status, idx) => (<StatusBadge key={`${status.name}_${idx}`} status={status} companionId={companion.id} />))}</div>)}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900 p-3 sm:p-6 relative">
                 {activeTab === 'info' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-6">
                            <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50 text-sm space-y-2 text-slate-300">
                                <div className="flex justify-between"><span className="text-slate-500">종족</span> <span>{companion.race}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">성격</span> <span>{companion.personality || '중립'}</span></div>
                                {!isMonster && (
                                  <div className="flex justify-between"><span className="text-slate-500">성별</span> <span>{companion.gender}</span></div>
                                )}
                                <div className="flex justify-between"><span className="text-slate-500">국적</span> <span>{companion.nation}</span></div>
                                <div className="flex justify-between border-t border-slate-700/50 pt-2"><span className="text-slate-500">신력 계통</span> <span>{companion.shinryokuType || '미개방'}</span></div>
                                
                                <div className="flex justify-between border-t border-slate-700/50 pt-2"><span className="text-slate-500 font-bold">{isMonster ? '성장 단계' : '클래스'}</span> <span className="text-amber-300 font-bold">{isMonster ? tierDisplay : currentClassName}</span></div>
                                
                                {!isMonster && (() => {
                                    const POTENTIAL_STYLES: Partial<Record<ClassTier, { label: string; percentLabel: string; badge: string; text: string; bg: string; desc: string }>> = {
                                        [ClassTier.NONE]: {
                                            label: '해방 불가',
                                            percentLabel: '',
                                            badge: 'bg-slate-950 border-slate-800 text-slate-500 font-bold',
                                            text: 'text-slate-500',
                                            bg: 'bg-slate-950/20 border-slate-900',
                                            desc: '태생적인 그릇의 깊이가 얕아 자발적인 클래스 해방이 불가능합니다.'
                                        },
                                        [ClassTier.FIRST]: {
                                            label: '퍼스트 클래스',
                                            percentLabel: '',
                                            badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-black shadow-sm ring-1 ring-emerald-500/20',
                                            text: 'text-emerald-400',
                                            bg: 'bg-emerald-950/10 border-emerald-950/40',
                                            desc: '최대 퍼스트 클래스까지 자발적으로 각성하여 돌파할 수 있는 기량을 가집니다.'
                                        },
                                        [ClassTier.SECOND]: {
                                            label: '세컨드 클래스',
                                            percentLabel: '',
                                            badge: 'bg-sky-500/10 border-sky-500/30 text-sky-400 font-black shadow-md ring-1 ring-sky-500/20',
                                            text: 'text-sky-400',
                                            bg: 'bg-sky-950/10 border-sky-950/40',
                                            desc: '뛰어난 재능으로 최대 세컨드 클래스까지 자발적으로 각성하여 영달할 수 있습니다.'
                                        },
                                        [ClassTier.LAST]: {
                                            label: '라스트 클래스',
                                            percentLabel: '',
                                            badge: 'bg-purple-500/10 border-purple-500/30 text-purple-400 font-black shadow-lg ring-1 ring-purple-500/20',
                                            text: 'text-purple-400',
                                            bg: 'bg-violet-950/10 border-violet-950/40',
                                            desc: '세상에 드문 영재로 최대 라스트 클래스까지 스스로의 힘으로 한계를 돌파합니다.'
                                        },
                                        [ClassTier.FINAL]: {
                                            label: '파이널 클래스',
                                            percentLabel: '',
                                            badge: 'bg-gradient-to-r from-teal-500/15 via-cyan-500/10 to-emerald-500/15 border-teal-500 text-teal-300 font-black shadow-xl shadow-teal-950/40 animate-pulse ring-1 ring-teal-400/30',
                                            text: 'text-teal-300',
                                            bg: 'bg-teal-950/20 border-teal-950/50',
                                            desc: '대륙 역사에 길이 남을 희세의 신화적 천재로, 파이널 클래스까지 도달이 약속되어 있습니다.'
                                        }
                                    };

                                    const TIER_RANK_MAP: Partial<Record<ClassTier, number>> = {
                                        [ClassTier.NONE]: 0,
                                        [ClassTier.FIRST]: 1,
                                        [ClassTier.SECOND]: 2,
                                        [ClassTier.LAST]: 3,
                                        [ClassTier.FINAL]: 4
                                    };

                                    const cp = getCompanionCP(companion);
                                    const initialized = initializedCompanion;
                                    const potential = initializedCompanion.liberationPotential || ClassTier.NONE;
                                    const potStyle = POTENTIAL_STYLES[potential] || POTENTIAL_STYLES[ClassTier.NONE]!;

                                    const currentTier = companion.classTier || ClassTier.NONE;
                                    const level = companion.level;

                                    let targetTier: ClassTier | null = null;
                                    let nextTierLevel = 30;
                                    let baseChance = 0;
                                    let eligibilityKey: 'first' | 'second' | 'last' | 'final' | null = null;
                                    let tierName = '';

                                    if (currentTier === ClassTier.NONE && level >= 30) {
                                      targetTier = ClassTier.FIRST;
                                      nextTierLevel = 30;
                                      baseChance = 1.0; // 1%
                                      eligibilityKey = 'first';
                                      tierName = '퍼스트 클래스';
                                    } else if (currentTier === ClassTier.FIRST && level >= 100) {
                                      targetTier = ClassTier.SECOND;
                                      nextTierLevel = 100;
                                      baseChance = 0.4; // 0.4%
                                      eligibilityKey = 'second';
                                      tierName = '세컨드 클래스';
                                    } else if (currentTier === ClassTier.SECOND && level >= 500) {
                                      targetTier = ClassTier.LAST;
                                      nextTierLevel = 500;
                                      baseChance = 0.1; // 0.1%
                                      eligibilityKey = 'last';
                                      tierName = '라스트 클래스';
                                    } else if (currentTier === ClassTier.LAST && level >= 1000) {
                                      targetTier = ClassTier.FINAL;
                                      nextTierLevel = 1000;
                                      baseChance = 0.01; // 0.01%
                                      eligibilityKey = 'final';
                                      tierName = '파이널 클래스';
                                    }

                                    const renderPotentialBlock = () => {
                                        if (companion.potentialAppraised !== true) {
                                            return (
                                                <div className="mt-2 p-2.5 rounded border bg-slate-950/60 border-slate-800 space-y-1">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] text-slate-400 font-bold flex items-center">
                                                            <Sparkles size={11} className="text-slate-500 mr-1" />
                                                            클래스 해방 한계 포텐셜
                                                        </span>
                                                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded border shadow-sm bg-slate-900 border-slate-700 text-slate-400">
                                                            알 수 없음 (감정 필요)
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 leading-normal font-normal">
                                                        마을 거주구역의 예언가 사바스를 방문하여 골드와 마정석을 지불하고 감정받아야 한계 포텐셜을 알 수 있습니다.
                                                     </p>
                                                </div>
                                            );
                                        }
                                        if (!potStyle) return null;
                                        return (
                                            <div className={`mt-2 p-2.5 rounded border ${potStyle.bg} space-y-1`}>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] text-slate-400 font-bold flex items-center">
                                                        <Sparkles size={11} className="text-indigo-400 mr-1 animate-pulse" />
                                                        클래스 해방 한계 포텐셜
                                                    </span>
                                                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border shadow-sm ${potStyle.badge}`}>
                                                        {potStyle.label}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 leading-normal font-normal">
                                                    {potStyle.desc}
                                                </p>
                                            </div>
                                        );
                                    };

                                    if (companion.isCustom === true) {
                                        return (
                                            <div className="border-t border-slate-700/50 pt-2">
                                                {renderPotentialBlock()}
                                            </div>
                                        );
                                    }

                                    // 1. 레벨 미달인 경우 가이드 정보 표시
                                    if (!targetTier || !eligibilityKey) {
                                        let futureTierName = '';
                                        let reqLvl = 30;
                                        let baseChanceStr = '';
                                        let targetRank = 0;
                                        if (currentTier === ClassTier.NONE && level < 30) {
                                            futureTierName = '퍼스트 클래스'; reqLvl = 30; baseChanceStr = '퍼스트 클래스 포텐셜 이상 필요'; targetRank = 1;
                                        } else if (currentTier === ClassTier.FIRST && level < 100) {
                                            futureTierName = '세컨드 클래스'; reqLvl = 100; baseChanceStr = '세컨드 클래스 이상 포텐셜 필요'; targetRank = 2;
                                        } else if (currentTier === ClassTier.SECOND && level < 300) {
                                            futureTierName = '라스트 클래스'; reqLvl = 300; baseChanceStr = '라스트 클래스 이상 포텐셜 필요'; targetRank = 3;
                                        } else if (currentTier === ClassTier.LAST && level < 1000) {
                                            futureTierName = '파이널 클래스'; reqLvl = 1000; baseChanceStr = '파이널 클래스 포텐셜 필요'; targetRank = 4;
                                        }

                                        if (futureTierName) {
                                            const limitRank = TIER_RANK_MAP[potential] || 0;
                                            const isNeverPossible = targetRank > limitRank;

                                            return (
                                                <div className="border-t border-slate-700/50 pt-2 space-y-2">
                                                    {renderPotentialBlock()}
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-500">다음 해방 조건</span>
                                                            <span className="text-slate-400 font-semibold">Lv.{reqLvl} 도달 시 자질 판별</span>
                                                        </div>
                                                        {companion.potentialAppraised !== true ? (
                                                            <div className="bg-slate-950/40 p-2 rounded text-[11px] text-slate-400 flex justify-between items-center border border-slate-900/60">
                                                                <span>각성 자질 판별 여부:</span>
                                                                <span className="text-indigo-400 font-bold">감정 시 확인 가능</span>
                                                            </div>
                                                        ) : isNeverPossible ? (
                                                            <div className="bg-red-950/20 p-2 rounded text-[11px] text-red-400 border border-red-950/40">
                                                                이 동료는 영혼의 한계 포텐셜이 낮아, {reqLvl}레벨에 도달해도 {futureTierName} 해방이 원천적으로 불가능합니다.
                                                            </div>
                                                        ) : (
                                                            <div className="bg-slate-950/40 p-2 rounded text-[11px] text-slate-400 flex justify-between items-center border border-slate-900/60">
                                                                <span>각성 자질 판별 여부:</span>
                                                                <span className="text-emerald-400 font-bold">도달 시 100% 해방 자질 획득</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="border-t border-slate-700/50 pt-2">
                                                {renderPotentialBlock()}
                                            </div>
                                        );
                                    }

                                    if (companion.potentialAppraised !== true) {
                                        return (
                                            <div className="border-t border-slate-700/50 pt-2 space-y-2">
                                                {renderPotentialBlock()}
                                                <div className="bg-slate-950/40 p-3 rounded text-[11px] text-slate-400 border border-slate-900/60 leading-normal text-center">
                                                    <AlertCircle size={14} className="inline text-indigo-400 mr-1.5 mb-0.5" />
                                                    예언가 사바스에게 감정 받기 전에는 각성 자질 및 일일 자동해방 확률을 파악할 수 없습니다.
                                                </div>
                                            </div>
                                        );
                                    }

                                    const hasEligibility = !!initialized.liberationEligibility?.[eligibilityKey];

                                    // 전투력 보너스 계산
                                    const refCp = nextTierLevel * 100;
                                    const cpBonusMultiplier = 1.0 + Math.min(1.5, cp / refCp);
                                    const dailyChancePercent = hasEligibility ? (baseChance * cpBonusMultiplier).toFixed(3) : '0';

                                    return (
                                        <div className="border-t border-slate-700/50 pt-2 space-y-2">
                                            {renderPotentialBlock()}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-500 font-bold text-xs flex items-center">
                                                        <Sparkles size={12} className="text-amber-400 mr-1 animate-pulse" />
                                                        다음 단계 각성 자질
                                                    </span>
                                                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${hasEligibility ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-900'}`}>
                                                        {hasEligibility ? `${tierName} 자질 보유` : `${tierName} 각성 불가`}
                                                    </span>
                                                </div>
                                                {companion.isCustom ? (
                                                    <div className="bg-indigo-950/40 p-2.5 rounded border border-indigo-800/60 space-y-1 text-[11px]">
                                                        <div className="text-indigo-300 font-bold flex items-center gap-1">
                                                            <Sparkles size={12} className="text-amber-400" /> 커스텀 동료 해방 방식
                                                        </div>
                                                        <p className="text-slate-300 text-[10px] leading-relaxed">
                                                            커스텀 동료는 잠재력 돌파 후 <strong>기지 1:1 최후의 시련 전투</strong>를 통과하여 수동으로 클래스를 해방합니다.
                                                        </p>
                                                    </div>
                                                ) : hasEligibility ? (
                                                    <div className="bg-slate-950/60 p-2.5 rounded border border-indigo-950/50 space-y-1 text-[11px]">
                                                        <div className="flex justify-between text-slate-400">
                                                            <span>일일 자동해방 확률:</span>
                                                            <span className="text-amber-300 font-bold">{dailyChancePercent}%</span>
                                                        </div>
                                                        <div className="flex justify-between text-slate-400">
                                                            <span>전투력 보너스 비율:</span>
                                                            <span className="text-emerald-400 font-bold">x{cpBonusMultiplier.toFixed(2)} (전투력: {cp.toLocaleString()})</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="bg-red-950/20 p-2 rounded text-[11px] text-red-300 border border-red-950/30">
                                                        이 동료는 이번 단계에서 한계 포텐셜에 도달하였거나 자질이 없어 자발적인 클래스 해방이 불가능합니다.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                                
                                <div className="flex justify-between items-center bg-black/20 p-2 rounded border border-slate-800/50 mt-2">
                                    <span className="text-slate-400 flex items-center font-bold">
                                        <jobInfo.icon size={14} className={`mr-1.5 ${jobInfo.color}`} />
                                        직업
                                    </span> 
                                    <span className={`font-bold ${jobInfo.color}`}>{jobInfo.label}</span>
                                </div>

                                {/* 전투 역할 및 2차 특화 역할 */}
                                <div className="flex justify-between items-center bg-black/20 p-2 rounded border border-slate-800/50 mt-2">
                                    <span className="text-slate-400 flex items-center font-bold">
                                        <Target size={14} className="mr-1.5 text-indigo-400" />
                                        전투 역할
                                    </span>
                                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                        {companion.battleRole && companion.battleRole !== BattleRole.NONE ? (
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                                                companion.battleRole === BattleRole.ALLROUNDER
                                                    ? 'text-amber-300 bg-gradient-to-r from-purple-900/50 to-amber-900/50 border-amber-500/60 shadow-sm'
                                                    : companion.battleRole === BattleRole.DEALER
                                                    ? 'text-rose-300 bg-rose-950/50 border-rose-800'
                                                    : companion.battleRole === BattleRole.TANKER
                                                    ? 'text-sky-300 bg-sky-950/50 border-sky-800'
                                                    : 'text-emerald-300 bg-emerald-950/50 border-emerald-800'
                                            }`}>
                                                {companion.battleRole}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-500">역할 미지정</span>
                                        )}
                                        {companion.secondaryBattleRole && companion.secondaryBattleRole !== SecondaryBattleRole.NONE && SECONDARY_ROLE_INFOS[companion.secondaryBattleRole] && (
                                            <span 
                                                className="text-[11px] font-bold px-2 py-0.5 rounded border bg-purple-950/60 border-purple-600/70 text-purple-200 shadow-sm flex items-center gap-1"
                                                title={`2차 특화 역할: ${SECONDARY_ROLE_INFOS[companion.secondaryBattleRole].title} (${SECONDARY_ROLE_INFOS[companion.secondaryBattleRole].effects.join(', ')})`}
                                            >
                                                <Sparkles size={11} className="text-purple-300" />
                                                2차: {SECONDARY_ROLE_INFOS[companion.secondaryBattleRole].title}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {(() => {
                                    const styleInfo = companion.combatStyle ? COMBAT_STYLE_CONFIG[companion.combatStyle] : null;
                                    
                                    return (
                                        <div className="bg-slate-950 p-3 rounded-xl border border-indigo-900/40 space-y-2 mt-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-300 font-bold text-xs flex items-center">
                                                    <Sword size={14} className={`mr-1.5 ${styleInfo ? styleInfo.color : 'text-amber-400'}`} />
                                                    전투 계열
                                                </span>
                                                {styleInfo ? (
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${styleInfo.bgColor} ${styleInfo.borderColor} ${styleInfo.color}`}>
                                                        {styleInfo.label} ({styleInfo.tier}차)
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-500 font-normal">미지정</span>
                                                )}
                                            </div>
                                            {styleInfo && (
                                                <>
                                                    <div className="text-[11px] text-slate-300 flex justify-between">
                                                        <span className="text-slate-400 font-semibold">특화 무기:</span>
                                                        <span className="text-amber-300 font-bold">{styleInfo.specialtyText} ({styleInfo.weapons.join(', ')})</span>
                                                    </div>
                                                    {(() => {
                                                        const details = getCombatStyleBonusDetails(styleInfo.style);
                                                        return (
                                                            <div className="text-[11px] text-emerald-400 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-800/40 space-y-1.5">
                                                                <span className="font-bold text-emerald-300 flex items-center gap-1">
                                                                    <Sparkles size={12} className="text-amber-400 animate-pulse" />
                                                                    전투계열 고유 능력치 보너스 (구체적 적용 효과)
                                                                </span>
                                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                                    {details.bonusTextList.map((bonusTxt, idx) => (
                                                                        <span key={idx} className="text-[10px] font-bold bg-emerald-900/60 text-emerald-200 px-2 py-0.5 rounded border border-emerald-700/50 shadow-sm">
                                                                            {bonusTxt}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                    <div className="pt-1">
                                                        <PromotionMasteryProgressBar target={companion} compact />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })()}

                                <div className="flex justify-between items-center border-t border-slate-700/50 pt-2 mt-2">
                                    <span className="text-slate-500">관계</span> 
                                    <span className="font-bold">{getRelationLabel()}</span>
                                </div>

                                <div className="flex justify-between items-center border-t border-slate-700/50 pt-2 mt-2">
                                    <span className="text-slate-500 flex items-center"><Gavel size={14} className="mr-1.5"/> 악명도</span> 
                                    <span className={`font-bold ${infamyStage.color}`} title={infamyStage.desc}>
                                        {companion.infamy || 0} ({infamyStage.label})
                                    </span>
                                </div>

                                {companion.appearance && (
                                    <div className="bg-black/20 p-2 rounded text-xs italic text-slate-400 mt-2 border border-slate-800/50">
                                        "{companion.appearance}"
                                    </div>
                                )}
                            </div>

                            {companion.job === JobType.BLACKSMITH && (
                                <div className="bg-slate-950 p-4 rounded-xl border border-orange-900/30 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-bold text-orange-400 uppercase tracking-widest flex items-center">
                                            <Hammer size={12} className="mr-1.5"/> 대장장이 숙련
                                        </h4>
                                        <span className="text-[10px] text-slate-500 font-mono">Rank: {companion.blacksmithRank || BlacksmithRank.BEGINNER}</span>
                                    </div>
                                    
                                    {(() => {
                                        const rank = companion.blacksmithRank || BlacksmithRank.BEGINNER;
                                        const config = BS_RANK_CONFIG[rank];
                                        const mastery = companion.blacksmithMastery || 0;
                                        const nextReq = config.reqMastery;
                                        const progress = nextReq > 0 ? Math.min(100, (mastery / nextReq) * 100) : 100;

                                        return (
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                                                    <span>{mastery.toLocaleString()} Pts</span>
                                                    <span>{nextReq > 0 ? `${nextReq.toLocaleString()} Pts` : 'MAX'}</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-orange-700 to-orange-400 transition-all duration-1000" 
                                                        style={{ width: `${progress}%` }}
                                                    ></div>
                                                </div>
                                                {nextReq > 0 && (
                                                    <p className="text-[9px] text-slate-600 text-center italic">승급까지 {Math.max(0, nextReq - mastery)} 포인트 남음</p>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {(companion.job === JobType.ALCHEMIST || companion.job === '연금술사' as any || (companion.classType && companion.classType.includes('연금술사'))) && (
                                <div className="bg-slate-950 p-4 rounded-xl border border-purple-900/30 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center">
                                            <FlaskConical size={12} className="mr-1.5"/> 연금술사 숙련
                                        </h4>
                                        <span className="text-[10px] text-slate-500 font-mono">Rank: {companion.alchemistRank || AlchemistRank.BEGINNER}</span>
                                    </div>
                                    
                                    {(() => {
                                        const rank = companion.alchemistRank || AlchemistRank.BEGINNER;
                                        const config = ALCHEMIST_RANK_CONFIG[rank];
                                        const mastery = companion.alchemistMastery || 0;
                                        const nextReq = config.reqMastery;
                                        const progress = nextReq > 0 ? Math.min(100, (mastery / nextReq) * 100) : 100;

                                        return (
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                                                    <span>{mastery.toLocaleString()} Pts</span>
                                                    <span>{nextReq > 0 ? `${nextReq.toLocaleString()} Pts` : 'MAX'}</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-purple-700 to-purple-400 transition-all duration-1000" 
                                                        style={{ width: `${progress}%` }}
                                                    ></div>
                                                </div>
                                                {nextReq > 0 && (
                                                    <p className="text-[9px] text-slate-600 text-center italic">승급까지 {Math.max(0, nextReq - mastery)} 포인트 남음</p>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}


                            {!isMonster && !isChild && (
                                <div className="space-y-2">
                                    {companion.job === JobType.SLAVE ? (
                                        <button 
                                            onClick={handleLiberateSlave}
                                            className="w-full py-3 bg-amber-600 hover:bg-amber-500 border border-amber-400/50 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 animate-pulse shadow-lg"
                                        >
                                            <Unlock size={14}/> 노예 해방
                                        </button>
                                    ) : (() => {
                                        const compAgeNum = companion.birthYear && character?.currentDate
                                            ? Math.max(0, parseInt(character.currentDate.split('년')[0] || '2000') - companion.birthYear)
                                            : parseInt(String(companion.age || '20').replace(/[^0-9]/g, '')) || 20;
                                        const isMinor = compAgeNum < 20;

                                        if (isMinor) {
                                            return (
                                                <button 
                                                    disabled
                                                    className="w-full py-3 bg-slate-900/40 border border-slate-800 text-slate-500 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
                                                    title="미성년자 동료는 직업을 변경할 수 없습니다. (20세 이상 가능)"
                                                >
                                                    <Lock size={14}/> 직업 제안 불가 (미성년자)
                                                </button>
                                            );
                                        }

                                        const isCooldown = companion.jobPersuadeCooldownDate && character?.currentDate
                                            ? diffDays(character.currentDate, companion.jobPersuadeCooldownDate) > 0
                                            : false;
                                        const daysLeft = isCooldown && companion.jobPersuadeCooldownDate && character?.currentDate
                                            ? diffDays(character.currentDate, companion.jobPersuadeCooldownDate)
                                            : 0;

                                        if (isCooldown) {
                                            return (
                                                <button 
                                                    disabled
                                                    className="w-full py-3 bg-slate-900/40 border border-slate-800 text-slate-500 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
                                                    title={`최근 직업 권유를 거절당했습니다. ${daysLeft}일 후(${companion.jobPersuadeCooldownDate})에 다시 권유할 수 있습니다.`}
                                                >
                                                    <Lock size={14}/> 직업 권유 불가 ({daysLeft}일 후 가능)
                                                </button>
                                            );
                                        }

                                        return (
                                            <button 
                                                onClick={() => setShowJobPersuasion(true)}
                                                className="w-full py-3 bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-500/50 text-indigo-300 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
                                            >
                                                <Briefcase size={14}/> 직업 권유
                                            </button>
                                        );
                                    })()}
                                </div>
                            )}

                            {isMonster && (
                                <div className="space-y-2">
                                    <button 
                                        onClick={handleMount}
                                        className={`w-full py-3 rounded-lg border flex items-center justify-center gap-2 transition-all shadow-lg ${character?.mountedMonsterId === companion.id ? 'bg-indigo-900/40 border-indigo-500 text-indigo-100' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-indigo-500/50 hover:text-indigo-300'}`}
                                    >
                                        <Play size={18} className={character?.mountedMonsterId === companion.id ? 'text-indigo-300' : 'text-indigo-400'}/>
                                        <span className="text-xs font-bold">{character?.mountedMonsterId === companion.id ? '탈것 해제' : '탈것으로 장착'}</span>
                                    </button>
                                </div>
                            )}
                            
                            <div className={`flex flex-col bg-slate-900 p-3 rounded border space-y-3 ${isLoverWithPlayer ? 'border-pink-500/30 bg-pink-950/10' : 'border-slate-800'}`}>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center text-xs mb-1"><Heart size={10} className={`${isLoverWithPlayer ? 'text-pink-400' : 'text-slate-400'} mr-1`}/><span className="text-slate-400">호감도</span></div>
                                        <span className={`${isLoverWithPlayer ? 'text-pink-200' : 'text-slate-200'} font-bold text-lg`}>{companion.affection}</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center text-xs mb-1"><Shield size={10} className="text-blue-400 mr-1"/><span className="text-slate-400">충성도</span></div>
                                        <span className="text-blue-200 font-bold text-lg">{companion.loyalty}</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center text-xs mb-1"><Award size={10} className="text-red-400 mr-1"/><span className="text-slate-400">명성치</span></div>
                                        <span className="text-red-200 font-bold text-lg">{companion.reputation || 0}</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center text-xs mb-1"><Medal size={10} className="text-cyan-400 mr-1"/><span className="text-slate-400">공적치</span></div>
                                        <span className="text-cyan-200 font-bold text-lg">{(companion as any).merit || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                             <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
                                 <div className="mb-4 space-y-3">
                                    {(() => {
                                        const shield = companion.statusEffects?.find(s => s.name === '마나 쉴드')?.val || 0;
                                        const safeHpMax = finalStats.maxHp > 0 ? finalStats.maxHp : 100;
                                        const hpPercent = Math.min(100, Math.max(0, (companion.stats.hp / safeHpMax) * 100));
                                        const shieldPercent = Math.min(100, Math.max(0, (shield / safeHpMax) * 100));

                                        return (
                                            <div>
                                                <div className="flex justify-between text-[10px] text-red-400 font-bold mb-1 px-0.5">
                                                    <span>HP {Math.floor(companion.stats.hp).toLocaleString()} {shield > 0 ? `(+${Math.floor(shield).toLocaleString()})` : ''} / {safeHpMax.toLocaleString()}</span>
                                                    <span>{hpPercent.toFixed(1)}%</span>
                                                </div>
                                                <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative shadow-inner">
                                                    <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${hpPercent}%` }}></div>
                                                    {shield > 0 && (
                                                        <div 
                                                            className="h-full bg-slate-400 transition-all duration-300 ease-out absolute top-0 left-0 opacity-80 border-r border-slate-200" 
                                                            style={{ width: `${shieldPercent}%` }}
                                                        ></div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div>
                                        <div className="flex justify-between text-[10px] text-blue-400 font-bold mb-1 px-0.5">
                                            <span>MP {Math.floor(companion.stats.mp).toLocaleString()} / {finalStats.maxMp.toLocaleString()}</span>
                                            <span>{((companion.stats.mp / (finalStats.maxMp || 1)) * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                                            <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${Math.min(100, (companion.stats.mp / (finalStats.maxMp || 1)) * 100)}%` }}></div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-[10px] text-amber-500 font-bold mb-1 px-0.5">
                                            <span>EXP {companion.currentExp} / {companion.maxExp}</span>
                                            <span>{((companion.currentExp / companion.maxExp) * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                            <div className="h-full bg-amber-600 transition-all duration-300" style={{ width: `${Math.min(100, (companion.currentExp / companion.maxExp) * 100)}%` }}></div>
                                        </div>
                                    </div>

                                </div>

                                {companion.statPoints > 0 && (
                                    <div className="flex flex-col gap-1 mb-4 px-3 py-2 bg-amber-950/40 border border-amber-800/50 rounded-lg">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-bold text-amber-300">성장 포인트 (스탯)</h4>
                                            <span className="text-xs text-amber-300 font-bold animate-pulse bg-amber-900/80 px-2.5 py-0.5 rounded border border-amber-600">
                                                남은 포인트: {companion.statPoints}
                                            </span>
                                        </div>
                                        {isCustom ? (
                                            <p className="text-[10px] text-amber-200/80 mt-0.5">
                                                각 스탯 우측의 <strong>+1, +5, +10</strong> 버튼을 눌러 {isMonster ? '몬스터' : '동료'}의 능력치를 직접 강화하세요!
                                            </p>
                                        ) : (
                                            <div className="text-[9px] text-slate-400 bg-slate-900/80 border border-slate-800 p-2 rounded flex items-center gap-1.5 mt-1">
                                                <Lock size={12} className="text-amber-500 shrink-0"/>
                                                <span>{isMonster ? '일반 몬스터는 자동 스탯 배분이 적용됩니다. (연금술실험소에서 커스텀 전환 시 수동 배분 가능)' : '일반 동료는 자동 스탯 배분이 적용됩니다. (연금술실험소에서 커스텀 동료로 전환 시 수동 배분 가능)'}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {companion.pregnancy?.isPregnant && (
                                    <div className="bg-rose-950/40 border border-rose-900/50 rounded-lg p-2 flex items-center justify-center text-[11px] sm:text-xs text-rose-400 font-bold mb-4 shadow-sm">
                                       ⚠️ 임신 디버프 적용 중 (모든 스탯 30% 감소)
                                    </div>
                                )}
                                <StatRow label="생명력 (HP)" finalValue={finalStats.maxHp} equipBonus={flatEquipBonus.maxHp + (equipPercentBonus.maxHp || 0)} buffBonus={buffBonus.maxHp} mountBonus={mountBonus.maxHp} combatStyleBonus={combatStyleBonus.maxHp} statKey="maxHp" icon={Heart} color="text-red-500" pointsAvailable={isCustom ? companion.statPoints : 0} onIncrease={onIncreaseStat} />
                                <StatRow label="마나 (MP)" finalValue={finalStats.maxMp} equipBonus={flatEquipBonus.maxMp + (equipPercentBonus.maxMp || 0)} buffBonus={buffBonus.maxMp} mountBonus={mountBonus.maxMp} combatStyleBonus={combatStyleBonus.maxMp} statKey="maxMp" icon={Zap} color="text-blue-500" pointsAvailable={isCustom ? companion.statPoints : 0} onIncrease={onIncreaseStat} />
                                <StatRow label="힘 (STR)" finalValue={finalStats.str} equipBonus={flatEquipBonus.str + (equipPercentBonus.str || 0)} buffBonus={buffBonus.str} mountBonus={mountBonus.str} combatStyleBonus={combatStyleBonus.str} statKey="str" icon={Sword} color="text-red-500" pointsAvailable={isCustom ? companion.statPoints : 0} onIncrease={onIncreaseStat} />
                                <StatRow label="지력 (INT)" finalValue={finalStats.int} equipBonus={flatEquipBonus.int + (equipPercentBonus.int || 0)} buffBonus={buffBonus.int} mountBonus={mountBonus.int} combatStyleBonus={combatStyleBonus.int} statKey="int" icon={Zap} color="text-purple-500" pointsAvailable={isCustom ? companion.statPoints : 0} onIncrease={onIncreaseStat} />
                                <StatRow label="지능 (WIS)" finalValue={finalStats.wis} equipBonus={flatEquipBonus.wis + (equipPercentBonus.wis || 0)} buffBonus={buffBonus.wis} mountBonus={mountBonus.wis} combatStyleBonus={combatStyleBonus.wis} statKey="wis" icon={Brain} color="text-blue-500" pointsAvailable={isCustom ? companion.statPoints : 0} onIncrease={onIncreaseStat} />
                                <StatRow label="방어 (DEF)" finalValue={finalStats.def} equipBonus={flatEquipBonus.def + (equipPercentBonus.def || 0)} buffBonus={buffBonus.def} mountBonus={mountBonus.def} combatStyleBonus={combatStyleBonus.def} statKey="def" icon={Shield} color="text-green-500" pointsAvailable={isCustom ? companion.statPoints : 0} onIncrease={onIncreaseStat} />
                                <StatRow label="민첩 (AGI)" finalValue={finalStats.agi} equipBonus={flatEquipBonus.agi + (equipPercentBonus.agi || 0)} buffBonus={buffBonus.agi} mountBonus={mountBonus.agi} combatStyleBonus={combatStyleBonus.agi} statKey="agi" icon={Activity} color="text-yellow-500" pointsAvailable={isCustom ? companion.statPoints : 0} onIncrease={onIncreaseStat} />
                                <StatRow label="제어 (CTRL)" finalValue={finalStats.ctrl} equipBonus={flatEquipBonus.ctrl + (equipPercentBonus.ctrl || 0)} buffBonus={buffBonus.ctrl} mountBonus={mountBonus.ctrl} combatStyleBonus={combatStyleBonus.ctrl} statKey="ctrl" icon={User} color="text-cyan-500" pointsAvailable={isCustom ? companion.statPoints : 0} onIncrease={onIncreaseStat} />
                                <div className="pt-4 mt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <button onClick={() => setShowDetailedStats(true)} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-xs border border-slate-600 hover:border-slate-500 flex items-center justify-center transition-colors"><BarChart2 size={16} className="mr-2" /> 상세 스탯 확인</button>
                                    <button onClick={() => setIsCombatEstimateOpen(true)} className="w-full py-2 bg-gradient-to-r from-rose-700 to-amber-700 hover:from-rose-600 hover:to-amber-600 text-white rounded-lg font-bold text-xs border border-rose-500/50 flex items-center justify-center transition-all shadow-md"><Activity size={16} className="mr-2" /> 전투 예상 분석</button>
                                </div>
                            </div>
                        </div>
                    </div>
                 )}
                 {activeTab === 'equipment' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 min-h-0 md:h-full overflow-y-auto md:overflow-hidden">
                         <div className="bg-slate-800/30 p-3 sm:p-4 rounded-lg border border-slate-700/50 flex flex-col max-h-[30vh] sm:max-h-[35vh] md:max-h-none overflow-y-auto md:overflow-visible shrink-0 md:shrink">
                             <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">착용 장비</h3>
                             <div className="space-y-1">
                                <EquipmentSlot label="무기" item={companion.equipment.weapon} slotKey="weapon" onUnequip={onUnequipItem} companion={companion} isSelected={selectedCompanionItem?.isEquipped && selectedCompanionItem?.slotKey === 'weapon'} onSelect={() => companion.equipment.weapon && setSelectedCompanionItem({ item: companion.equipment.weapon, isEquipped: true, slotKey: 'weapon' })} />
                                <EquipmentSlot label="보조무기" item={companion.equipment.subWeapon} slotKey="subWeapon" onUnequip={onUnequipItem} companion={companion} isSelected={selectedCompanionItem?.isEquipped && selectedCompanionItem?.slotKey === 'subWeapon'} onSelect={() => companion.equipment.subWeapon && setSelectedCompanionItem({ item: companion.equipment.subWeapon, isEquipped: true, slotKey: 'subWeapon' })} />
                                <EquipmentSlot label="머리" item={companion.equipment.head} slotKey="head" onUnequip={onUnequipItem} companion={companion} isSelected={selectedCompanionItem?.isEquipped && selectedCompanionItem?.slotKey === 'head'} onSelect={() => companion.equipment.head && setSelectedCompanionItem({ item: companion.equipment.head, isEquipped: true, slotKey: 'head' })} />
                                <EquipmentSlot label="상의/하의" item={companion.equipment.body} slotKey="body" onUnequip={onUnequipItem} companion={companion} isSelected={selectedCompanionItem?.isEquipped && selectedCompanionItem?.slotKey === 'body'} onSelect={() => companion.equipment.body && setSelectedCompanionItem({ item: companion.equipment.body, isEquipped: true, slotKey: 'body' })} />
                                <EquipmentSlot label="신발" item={companion.equipment.feet} slotKey="feet" onUnequip={onUnequipItem} companion={companion} isSelected={selectedCompanionItem?.isEquipped && selectedCompanionItem?.slotKey === 'feet'} onSelect={() => companion.equipment.feet && setSelectedCompanionItem({ item: companion.equipment.feet, isEquipped: true, slotKey: 'feet' })} />
                                <EquipmentSlot label="장갑" item={companion.equipment.hand} slotKey="hand" onUnequip={onUnequipItem} companion={companion} isSelected={selectedCompanionItem?.isEquipped && selectedCompanionItem?.slotKey === 'hand'} onSelect={() => companion.equipment.hand && setSelectedCompanionItem({ item: companion.equipment.hand, isEquipped: true, slotKey: 'hand' })} />
                                <EquipmentSlot label="장신구" item={companion.equipment.accessory} slotKey="accessory" onUnequip={onUnequipItem} companion={companion} isSelected={selectedCompanionItem?.isEquipped && selectedCompanionItem?.slotKey === 'accessory'} onSelect={() => companion.equipment.accessory && setSelectedCompanionItem({ item: companion.equipment.accessory, isEquipped: true, slotKey: 'accessory' })} />
                                <div className="flex justify-between items-center text-xs py-2 border-t border-slate-800/30 mt-2">
                                    <span className="text-slate-500 w-16 shrink-0">탈것</span>
                                    <div className="w-8 h-8 rounded bg-slate-950 border border-slate-800 shrink-0 mx-2 overflow-hidden flex items-center justify-center">
                                        {companion.mountedMonster ? (
                                            <img src={companion.mountedMonster.monsterData?.visualUrl || companion.mountedMonster.appearance} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="opacity-20"><Play size={14}/></div>
                                        )}
                                    </div>
                                    <div className="flex-1 px-2 overflow-visible group/item relative">
                                        <span className={`truncate block font-bold ${companion.mountedMonster ? "text-amber-100" : "text-slate-700 italic"}`}>
                                            {companion.mountedMonster ? companion.mountedMonster.name : "장착 안 함"}
                                        </span>
                                    </div>
                                    {companion.mountedMonster && (
                                        <button onClick={handleUnmountFromCompanion} className="text-red-500 hover:text-red-400 p-1 transition-colors" title="해제">
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                             </div>
                         </div>
                         <div className="bg-slate-800/30 p-3 sm:p-4 rounded-lg border border-slate-700/50 flex flex-col min-h-[380px] sm:min-h-[420px] md:h-full md:min-h-0 overflow-hidden flex-1">
                             {/* 가방 탭 상단: 장착 탭 / 선물 탭 분리 */}
                             <div className="flex flex-col gap-2 mb-3 pb-2 border-b border-slate-700/60">
                                 <div className="flex items-center justify-between">
                                     <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                                         <button
                                             type="button"
                                             onClick={() => setEquipSubTab('equip')}
                                             className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                                                 equipSubTab === 'equip'
                                                     ? 'bg-amber-600 text-white shadow-sm'
                                                     : 'text-slate-400 hover:text-slate-200'
                                             }`}
                                         >
                                             <Shield size={13} />
                                             <span>장착</span>
                                         </button>
                                         <button
                                             type="button"
                                             onClick={() => setEquipSubTab('gift')}
                                             className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                                                 equipSubTab === 'gift'
                                                     ? 'bg-pink-600 text-white shadow-sm'
                                                     : 'text-slate-400 hover:text-slate-200'
                                             }`}
                                         >
                                             <Gift size={13} />
                                             <span>선물</span>
                                         </button>
                                     </div>
                                     <span className="text-[10px] text-slate-500 font-normal">소비 아이템 묶음 표시</span>
                                 </div>

                                 {/* 장착 탭 전용: 분류(장비/소비/전체) 및 정렬 옵션 */}
                                 {equipSubTab === 'equip' && (
                                     <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                         <div className="flex gap-1 text-[11px]">
                                             <button
                                                 type="button"
                                                 onClick={() => setEquipCategoryFilter('all')}
                                                 className={`px-2 py-0.5 rounded border font-medium transition-colors ${
                                                     equipCategoryFilter === 'all'
                                                         ? 'bg-slate-700 border-amber-500/60 text-amber-300 font-bold'
                                                         : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                                 }`}
                                             >
                                                 전체
                                             </button>
                                             <button
                                                 type="button"
                                                 onClick={() => setEquipCategoryFilter('equipment')}
                                                 className={`px-2 py-0.5 rounded border font-medium transition-colors ${
                                                     equipCategoryFilter === 'equipment'
                                                         ? 'bg-slate-700 border-amber-500/60 text-amber-300 font-bold'
                                                         : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                                 }`}
                                             >
                                                 장비 아이템
                                             </button>
                                             <button
                                                 type="button"
                                                 onClick={() => setEquipCategoryFilter('consumable')}
                                                 className={`px-2 py-0.5 rounded border font-medium transition-colors ${
                                                     equipCategoryFilter === 'consumable'
                                                         ? 'bg-slate-700 border-amber-500/60 text-amber-300 font-bold'
                                                         : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                                 }`}
                                             >
                                                 소비 아이템
                                             </button>
                                         </div>

                                         <div className="flex items-center gap-1 text-[11px]">
                                             <span className="text-slate-500">정렬:</span>
                                             <select
                                                 value={equipSortBy}
                                                 onChange={(e) => setEquipSortBy(e.target.value as any)}
                                                 className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-1.5 py-0.5 text-[11px] outline-none cursor-pointer focus:border-amber-500"
                                             >
                                                 <option value="rarityDesc">등급 높은순</option>
                                                 <option value="rarityAsc">등급 낮은순</option>
                                                 <option value="name">이름순</option>
                                                 <option value="default">기본 순서</option>
                                             </select>
                                         </div>

                                         {/* 장비 부위 세부 정렬 필터 */}
                                         {(equipCategoryFilter === 'all' || equipCategoryFilter === 'equipment') && (
                                             <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1.5 text-[10px] sm:text-[11px] w-full border-t border-slate-800/40 mt-1">
                                                 <span className="text-amber-400 font-bold shrink-0 mr-1">부위:</span>
                                                 {[
                                                     { key: 'all', label: '전체' },
                                                     { key: 'Weapon', label: '무기' },
                                                     { key: 'SubWeapon', label: '보조무기' },
                                                     { key: 'Body', label: '갑옷' },
                                                     { key: 'Accessory', label: '장신구' },
                                                     { key: 'Feets', label: '신발' },
                                                     { key: 'Head', label: '투구' },
                                                     { key: 'Hand', label: '장갑' },
                                                 ].map((slot) => (
                                                     <button
                                                         key={slot.key}
                                                         type="button"
                                                         onClick={() => setCompanionEquipSlotFilter(slot.key as any)}
                                                         className={`px-2 py-0.5 rounded font-bold transition-all border shrink-0 ${
                                                             companionEquipSlotFilter === slot.key
                                                                 ? 'bg-amber-600 border-amber-400 text-white shadow-sm'
                                                                 : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                                         }`}
                                                     >
                                                         {slot.label}
                                                     </button>
                                                 ))}
                                             </div>
                                         )}
                                     </div>
                                 )}

                                 {/* 선물 탭일 경우 정렬 옵션만 표시 */}
                                 {equipSubTab === 'gift' && (
                                     <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                                         <span className="text-pink-300/80 text-[11px]">동료에게 전달할 선물을 선택하세요</span>
                                         <div className="flex items-center gap-1">
                                             <span className="text-slate-500">정렬:</span>
                                             <select
                                                 value={equipSortBy}
                                                 onChange={(e) => setEquipSortBy(e.target.value as any)}
                                                 className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-1.5 py-0.5 text-[11px] outline-none cursor-pointer focus:border-pink-500"
                                             >
                                                 <option value="rarityDesc">등급 높은순</option>
                                                 <option value="rarityAsc">등급 낮은순</option>
                                                 <option value="name">이름순</option>
                                                 <option value="default">기본 순서</option>
                                             </select>
                                         </div>
                                     </div>
                                 )}
                             </div>
                             <div className="flex-1 min-h-[220px] max-h-[40vh] sm:max-h-[50vh] md:max-h-none overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                 {(() => {
                                     const RARITY_WEIGHT: Record<string, number> = {
                                         [ItemRarity.MYTHTIC]: 7,
                                         [ItemRarity.LEGENDARY]: 6,
                                         [ItemRarity.UNIQUE]: 5,
                                         [ItemRarity.EPIC]: 4,
                                         [ItemRarity.RARE]: 3,
                                         [ItemRarity.MAGIC]: 2,
                                         [ItemRarity.NORMAL]: 1
                                     };

                                     // 1. 분류 필터링
                                     let itemsToDisplay = groupedPlayerInventory.filter(group => {
                                         const { item } = group;
                                         const isEquippable = ['Weapon', 'SubWeapon', 'Head', 'Body', 'Feet', 'Hand', 'Accessory'].some(t => item.type.includes(t));
                                         const isConsumable = ['Consumable', '소비', '물약', '음식', '소모품'].some(t => item.type.includes(t));

                                         if (equipSubTab === 'equip') {
                                             if (equipCategoryFilter === 'equipment' && !isEquippable) return false;
                                             if (equipCategoryFilter === 'consumable' && !isConsumable) return false;

                                             if (companionEquipSlotFilter !== 'all') {
                                                 if (!isEquippable) return false;
                                                 const t = (item.type || '').toLowerCase();
                                                 if (companionEquipSlotFilter === 'Weapon' && (t.includes('subweapon') || t.includes('보조무기') || !(t.includes('weapon') || t.includes('무기')))) return false;
                                                 if (companionEquipSlotFilter === 'SubWeapon' && !(t.includes('subweapon') || t.includes('보조무기') || t.includes('방패'))) return false;
                                                 if (companionEquipSlotFilter === 'Body' && !(t.includes('body') || t.includes('갑옷') || t.includes('상의') || t.includes('하의') || t.includes('의복'))) return false;
                                                 if (companionEquipSlotFilter === 'Accessory' && !(t.includes('accessory') || t.includes('장신구') || t.includes('반지') || t.includes('목걸이') || t.includes('귀걸이'))) return false;
                                                 if (companionEquipSlotFilter === 'Feets' && !(t.includes('feet') || t.includes('feets') || t.includes('신발') || t.includes('발'))) return false;
                                                 if (companionEquipSlotFilter === 'Head' && !(t.includes('head') || t.includes('투구') || t.includes('모자') || t.includes('머리'))) return false;
                                                 if (companionEquipSlotFilter === 'Hand' && !(t.includes('hand') || t.includes('장갑') || t.includes('손'))) return false;
                                             }

                                             return true;
                                         }
                                         // 선물 탭에서는 가방 아이템 모두 표시
                                         return true;
                                     });

                                     // 2. 정렬 적용
                                     if (equipSortBy === 'rarityDesc') {
                                         itemsToDisplay = [...itemsToDisplay].sort((a, b) => {
                                             const weightA = RARITY_WEIGHT[a.item.rarity] || 0;
                                             const weightB = RARITY_WEIGHT[b.item.rarity] || 0;
                                             if (weightB !== weightA) return weightB - weightA;
                                             return a.item.name.localeCompare(b.item.name, 'ko');
                                         });
                                     } else if (equipSortBy === 'rarityAsc') {
                                         itemsToDisplay = [...itemsToDisplay].sort((a, b) => {
                                             const weightA = RARITY_WEIGHT[a.item.rarity] || 0;
                                             const weightB = RARITY_WEIGHT[b.item.rarity] || 0;
                                             if (weightA !== weightB) return weightA - weightB;
                                             return a.item.name.localeCompare(b.item.name, 'ko');
                                         });
                                     } else if (equipSortBy === 'name') {
                                         itemsToDisplay = [...itemsToDisplay].sort((a, b) => a.item.name.localeCompare(b.item.name, 'ko'));
                                     }

                                     if (itemsToDisplay.length === 0) {
                                         return (
                                             <div className="text-center py-10 text-slate-600">
                                                 <Box size={24} className="mx-auto mb-2 opacity-30" />
                                                 <p className="text-xs">
                                                     {equipSubTab === 'equip' && equipCategoryFilter === 'equipment' ? '가방에 장비 아이템이 없습니다.' :
                                                      equipSubTab === 'equip' && equipCategoryFilter === 'consumable' ? '가방에 소비 아이템이 없습니다.' :
                                                      '표시할 아이템이 없습니다.'}
                                                 </p>
                                             </div>
                                         );
                                     }

                                     return itemsToDisplay.map((group, groupIdx) => {
                                         const { item, count, indices } = group;
                                         const isEquippable = ['Weapon', 'SubWeapon', 'Head', 'Body', 'Feet', 'Hand', 'Accessory'].some(t => item.type.includes(t));
                                         const isConsumable = ['Consumable', '소비', '물약', '음식', '소모품'].some(t => item.type.includes(t));
                                         const primaryIndex = indices[0];

                                         return (
                                             <div key={groupIdx} className={`bg-slate-900/50 p-2 rounded border flex justify-between items-center group relative overflow-visible ${
                                                 equipSubTab === 'gift' ? 'border-pink-900/40 hover:border-pink-500/50' : 'border-slate-700 hover:border-amber-500/50'
                                             }`}>
                                                 <div className="w-10 h-10 rounded bg-slate-950 border border-slate-800 shrink-0 mr-3 overflow-hidden flex items-center justify-center relative">
                                                     <img src={getItemImage(item)} alt="" className="w-full h-full object-cover" />
                                                     {count > 1 && (
                                                         <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[8px] px-1 rounded font-bold">x{count}</span>
                                                     )}
                                                 </div>
                                                 <div className="flex-1 overflow-visible mr-2 group/item relative min-w-0">
                                                     <div className="flex items-center gap-1">
                                                         <span className={`text-xs font-bold truncate block ${equipSubTab === 'gift' ? 'text-pink-100 group-hover:text-pink-300' : 'text-slate-300 group-hover:text-amber-400'}`}>
                                                             {item.name}
                                                         </span>
                                                         {count > 1 && <span className="text-[9px] text-slate-500">({count})</span>}
                                                     </div>
                                                     <span className="text-[10px] text-slate-500">{item.type} | {item.rarity}</span>
                                                     <ItemTooltip item={item} character={companion as any} />
                                                 </div>
                                                 <div className="flex space-x-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                     {/* 장착 탭: 사용 및 장착 버튼 */}
                                                     {equipSubTab === 'equip' && isConsumable && (
                                                         <button 
                                                             onClick={() => onUseItem(item, indices)} 
                                                             className="text-[10px] bg-green-900/40 border border-green-700/50 text-green-300 px-2 py-1 rounded font-bold hover:bg-green-800"
                                                         >
                                                             사용
                                                         </button>
                                                     )}
                                                     {equipSubTab === 'equip' && isEquippable && (
                                                         <button 
                                                             onClick={() => onEquipItem(primaryIndex)} 
                                                             className="text-[10px] bg-slate-800 border border-slate-600 text-slate-300 px-2 py-1 rounded font-bold hover:bg-amber-900/30 transition-colors"
                                                         >
                                                             장착
                                                         </button>
                                                     )}

                                                     {/* 선물 탭: 선물 버튼 */}
                                                     {equipSubTab === 'gift' && (
                                                         <button 
                                                             onClick={() => {
                                                                 if (count > 1) {
                                                                     setGiftModalData({ item, count, primaryIndex });
                                                                     setGiftAmount(1);
                                                                 } else {
                                                                     onGiftItem(primaryIndex, 1);
                                                                 }
                                                             }} 
                                                             className="text-[10px] bg-pink-950/60 border border-pink-700 text-pink-300 px-2.5 py-1 rounded font-bold hover:bg-pink-900/60 transition-colors flex items-center gap-1 shadow-sm"
                                                         >
                                                             <Gift size={11} />
                                                             <span>선물</span>
                                                         </button>
                                                     )}
                                                 </div>
                                             </div>
                                         );
                                     });
                                 })()}
                             </div>
                         </div>
                      </div>
                 )}
                  {activeTab === 'skills' && (
                     <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-400 uppercase">보유 스킬</h3>
                            <div className="flex space-x-2">
                                <button onClick={onOpenWeaponMastery} className="text-xs bg-blue-900/30 hover:bg-blue-900/50 text-blue-200 px-3 py-1.5 rounded border border-blue-800/50 flex items-center transition-colors">
                                    <Target size={14} className="mr-1" /> 무기 숙련도
                                </button>
                                <button 
                                    onClick={() => {
                                        if (isMonster || companion.isCustom) {
                                            onOpenSkillBook();
                                        } else {
                                            setResultData({
                                                type: 'failure',
                                                title: '스킬북 열람 불가',
                                                message: `일반 동료는 스킬북을 통한 직접 스킬 습득 및 설정이 불가능합니다.\n연금술실험소의 [커스텀 전환] 탭에서 커스텀 동료로 전환한 후 이용해주세요.`,
                                                items: [{ label: '현재 상태', after: '일반 동료' }, { label: '요구 조건', after: '커스텀 동료 전환' }]
                                            });
                                        }
                                    }} 
                                    className={`text-xs px-3 py-1.5 rounded border flex items-center transition-colors ${
                                        isMonster 
                                            ? 'bg-red-900/30 hover:bg-red-900/50 text-red-200 border-red-800/50' 
                                            : companion.isCustom 
                                                ? 'bg-purple-900/30 hover:bg-purple-900/50 text-purple-200 border-purple-800/50' 
                                                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-400'
                                    }`}
                                    title={!isMonster && !companion.isCustom ? "커스텀 동료만 스킬북 이용 가능" : undefined}
                                >
                                    {isMonster ? <PawPrint size={14} className="mr-1" /> : companion.isCustom ? <BookOpen size={14} className="mr-1" /> : <Lock size={14} className="mr-1" />}
                                    {isMonster ? '야생의 본능' : '스킬북 열기'}
                                </button>
                            </div>
                        </div>
                        {!isMonster && !companion.isCustom && (
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center gap-2 text-xs text-slate-400">
                                <Lock size={14} className="text-amber-500 shrink-0"/>
                                <span>일반 동료는 자율 스킬 습득이 제한됩니다. 연금술실험소에서 <strong>커스텀 동료</strong>로 전환하면 스킬북 열람 및 자유로운 스킬 설정이 가능합니다.</span>
                            </div>
                        )}

                        
                        {/* [MODIFIED] 스킬 탭 분류 및 필터링 로직 */}
                        {(() => {
                            const isMonster = Boolean(
                                companion.isMonster ||
                                companion.monsterData ||
                                companion.race === '몬스터' ||
                                (typeof companion.race === 'string' && companion.race.includes('Monster')) ||
                                (companion.job as any) === '마수' ||
                                (companion.job as any) === '몬스터' ||
                                companion.classType === '마수/몬스터' ||
                                companion.classType === '몬스터' ||
                                (companion as any).stage !== undefined
                            );

                            const tiers = isMonster 
                                ? ['전투 계열', '유아기', '성장기', '성숙기', '완전체', '궁극체', '초궁극체']
                                : ['전투 계열', '미해방', '퍼스트 클래스', '세컨드 클래스', '라스트 클래스', '파이널 클래스', '인연 스킬'];
                            
                            const activeTier = tiers.includes(selectedTier) ? selectedTier : (companion.combatStyle ? '전투 계열' : (isMonster ? '유아기' : '미해방'));

                            const filteredSkills = (() => {
                                if (activeTier === '전투 계열') return [];
                                if (!isMonster) {
                                    if (activeTier === '인연 스킬') {
                                        const fromSkills = (companion.skills || []).filter(skill => (skill.tier as any) === '인연' || (skill.tier as any) === ClassTier.BOND || (skill as any).isBondSkill);
                                        const fromCompanionBond = ((companion as any).bondSkills || []);
                                        const fromPlayerBond = ((character as any)?.bondSkills || []).filter((skill: any) => skill.companionId === companion.id || skill.companionName === companion.name || skill.sourceName === companion.name || skill.partnerName === companion.name);
                                        const combined = [...fromSkills, ...fromCompanionBond, ...fromPlayerBond];
                                        const map = new Map<string, any>();
                                        combined.forEach(s => {
                                            if (s) {
                                                const key = s.id || s.name;
                                                if (!map.has(key)) map.set(key, s);
                                            }
                                        });
                                        return Array.from(map.values());
                                    }
                                    if (activeTier === '미해방') return (companion.skills || []).filter(skill => (skill.tier as any) === ClassTier.NONE || (skill.tier as any) === '없음' || (skill.tier as any) === '미해방' || !skill.tier);
                                    return (companion.skills || []).filter(skill => skill.tier === activeTier);
                                } else {
                                    // 몬스터 전용 단계별 스킬 필터링
                                    return (companion.skills || []).filter(skill => {
                                        const t = (skill.tier as string) || '';
                                        if (activeTier === '유아기') {
                                            return t === '유아기' || t === '유년기' || t === 'BABY' || (t as any) === ClassTier.NONE || t === '없음' || t === '미해방' || !t;
                                        }
                                        if (activeTier === '성장기') {
                                            return t === '성장기' || t === 'CHILD' || (t as any) === ClassTier.FIRST || t === '퍼스트 클래스' || t === '퍼스트';
                                        }
                                        if (activeTier === '성숙기') {
                                            return t === '성숙기' || t === 'ADULT' || (t as any) === ClassTier.SECOND || t === '세컨드 클래스' || t === '세컨드';
                                        }
                                        if (activeTier === '완전체') {
                                            return t === '완전체' || t === 'PERFECT' || (t as any) === ClassTier.LAST || (t as any) === '라스트 클래스' || (t as any) === '라스트' || (t as any) === '서드 클래스';
                                        }
                                        if (activeTier === '궁극체') {
                                            return t === '궁극체' || t === 'ULTIMATE' || (t as any) === ClassTier.FINAL || t === '파이널 클래스' || t === '파이널';
                                        }
                                        if (activeTier === '초궁극체') {
                                            return t === '초궁극체' || t === 'SUPER_ULTIMATE';
                                        }
                                        return false;
                                    });
                                }
                            })();

                            // 전투 계열 관련 데이터 준비
                            const styleKey = companion.combatStyle as CombatStyle | undefined;
                            const styleConfig = styleKey && COMBAT_STYLE_CONFIG[styleKey] ? COMBAT_STYLE_CONFIG[styleKey] : null;
                            const styleSkillSet = styleKey ? getCombatStyleSkillSet(styleKey, styleConfig?.tier || 1) : null;
                            const activeCombatSkill = getCombatStyleActiveSkill(companion);
                            const unlockedStyles = getUnlockedCombatStylesList(companion);
                            const styleBonusDetails = styleKey ? getCombatStyleBonusDetails(styleKey) : null;
                            const styleBonusPercent = styleConfig ? getCombatStyleBonusPercent(styleConfig.tier) : 0;

                            return (
                                <>
                                    <div className="flex space-x-1 border-b border-slate-700 pb-1 overflow-x-auto no-scrollbar">
                                        {tiers.map(tier => {
                                            const isSelected = activeTier === tier;
                                            const isCombatTab = tier === '전투 계열';
                                            return (
                                                <button 
                                                    key={tier} 
                                                    onClick={() => setSelectedTier(tier)} 
                                                    className={`px-3 py-1.5 text-xs font-bold rounded-t transition-all flex items-center gap-1 shrink-0 ${
                                                        isSelected 
                                                            ? (isCombatTab ? 'bg-amber-500/20 text-amber-300 border-b-2 border-amber-400' : 'bg-slate-700 text-white') 
                                                            : (isCombatTab ? 'text-amber-400/70 hover:text-amber-300' : 'text-slate-400 hover:text-slate-200')
                                                    }`}
                                                >
                                                    {isCombatTab && <Crosshair size={12} className={isSelected ? 'text-amber-400 animate-spin' : 'text-amber-500/70'} />}
                                                    <span>{tier}</span>
                                                    {isCombatTab && styleConfig && (
                                                        <span className="text-[9px] bg-amber-950/80 text-amber-300 px-1 py-0.2 rounded border border-amber-600/50">
                                                            {styleConfig.tier}차
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* 일반 탭일 때: 전투 계열 전용 스킬이 자동 장착되어 있음을 알리는 미니 배너 */}
                                    {activeTier !== '전투 계열' && styleConfig && styleSkillSet && (
                                        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 p-2.5 rounded-xl flex items-center justify-between gap-2 shadow-sm animate-in fade-in">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-600/50 text-amber-300 shrink-0">
                                                    <Crosshair size={14} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-[10px] font-extrabold text-amber-400 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-600/40">
                                                            전투계열 오의 자동장착
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-100 truncate">
                                                            {styleSkillSet.equippedActive.name}
                                                        </span>
                                                        <span className="text-[10px] text-blue-400 font-mono">
                                                            (MP {styleSkillSet.equippedActive.mpCost} / 위력 {styleSkillSet.equippedActive.powerRatio}%)
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 truncate">
                                                        {companion.combatStyle} 계열 전용 오의가 동료 전투 시 자동 장착되어 즉시 발동됩니다.
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedTier('전투 계열')}
                                                className="px-2.5 py-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 text-[11px] font-bold rounded-lg transition-all shrink-0 active:scale-95"
                                            >
                                                계열 스킬 보기
                                            </button>
                                        </div>
                                    )}

                                    {/* ========================================================================= */}
                                    {/* 1. 전투 계열 탭 상세 화면 */}
                                    {/* ========================================================================= */}
                                    {activeTier === '전투 계열' && (
                                        <div className="space-y-4">
                                            {styleConfig && styleSkillSet ? (
                                                <>
                                                    {/* 상단: 현재 장착 전투 계열 상세 안내 카드 */}
                                                    <div className={`p-4 rounded-2xl border bg-gradient-to-r ${styleConfig.bgColor} ${styleConfig.borderColor} shadow-lg relative overflow-hidden`}>
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-slate-950/80 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                                                                    <Crosshair size={22} />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold px-2 py-0.5 rounded border border-amber-500/40">
                                                                            동료 장착 전투 계열
                                                                        </span>
                                                                        <span className="text-[10px] bg-slate-900 text-slate-200 px-2 py-0.5 rounded border border-slate-700 font-mono font-bold">
                                                                            {styleConfig.tier}차 전직 ({styleConfig.rootStyle || companion.combatStyle})
                                                                        </span>
                                                                        <span className="text-[10px] bg-emerald-950 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-700/60 flex items-center gap-1">
                                                                            <Check size={11} /> 전용 스킬 자동 장착됨
                                                                        </span>
                                                                    </div>
                                                                    <h3 className="text-lg sm:text-xl font-black text-white mt-1 flex items-center gap-2">
                                                                        <span>{styleConfig.label}</span>
                                                                        <span className="text-xs text-amber-400 font-normal">
                                                                            (기본 공/마 +{styleBonusPercent}%)
                                                                        </span>
                                                                    </h3>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* 세부 스펙 안내 */}
                                                        <div className="mt-3 space-y-2">
                                                            <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
                                                                "{styleConfig.description}"
                                                            </p>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                                                                    <span className="text-slate-400 flex items-center gap-1">
                                                                        <Target size={13} className="text-amber-400" /> 특화 무기:
                                                                    </span>
                                                                    <span className="font-bold text-amber-200">
                                                                        {styleConfig.specialtyText}
                                                                    </span>
                                                                </div>
                                                                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                                                                    <span className="text-slate-400 flex items-center gap-1">
                                                                        <Sparkles size={13} className="text-cyan-400" /> 특화 무기 장착 시:
                                                                    </span>
                                                                    <span className="font-bold text-cyan-300 truncate max-w-[160px]" title={styleBonusDetails?.fullDesc}>
                                                                        {styleBonusDetails?.fullDesc || '특화 효과 활성화'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="bg-emerald-950/30 border border-emerald-500/30 px-3 py-2 rounded-xl text-[11px] text-emerald-300 flex items-center gap-2">
                                                                <Check size={14} className="text-emerald-400 shrink-0" />
                                                                <span>전투 계열 전용 오의 및 패시브는 동료에게 <strong>자동 장착</strong>되어, 전투 시 별도 설정 없이도 자율 발동 및 아군 명령 슬롯에 자동 등록됩니다.</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* 전투 계열 고유 스킬 카드 그리드 */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        
                                                        {/* 1. [계열 장착 고유 액티브 오의 스킬] */}
                                                        <div className="bg-slate-900/90 border border-amber-500/40 hover:border-amber-400 rounded-2xl p-4 flex flex-col justify-between shadow-md transition-all">
                                                            <div>
                                                                <div className="flex items-start justify-between gap-2 mb-2.5">
                                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                                        <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-600/60 text-amber-300 shrink-0 shadow-inner">
                                                                            <Sword size={18} />
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                                <h4 className="font-black text-sm sm:text-base text-amber-300 truncate">
                                                                                    {styleSkillSet.equippedActive.name}
                                                                                </h4>
                                                                                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-red-950/80 text-red-300 border border-red-800/60">
                                                                                    {styleSkillSet.equippedActive.type === SkillType.PHYSICAL ? '물리 공격' : '마법 공격'}
                                                                                </span>
                                                                                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60">
                                                                                    {styleSkillSet.equippedActive.targetType === 'aoe' ? '전체 적군' : '단일 대상'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                                <span className="text-[10px] text-amber-400/90 font-bold">
                                                                                    [계열 장착 고유 액티브 오의]
                                                                                </span>
                                                                                <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded font-bold border border-emerald-600/40">
                                                                                    자동 장착됨
                                                                                </span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setShortcutTarget({
                                                                                        name: styleSkillSet.equippedActive.name,
                                                                                        displayName: styleSkillSet.equippedActive.name,
                                                                                        type: 'skill',
                                                                                        icon: styleSkillSet.equippedActive.icon,
                                                                                        imageUrl: (styleSkillSet.equippedActive as any).imageUrl
                                                                                    })}
                                                                                    className={`text-[10px] px-2 py-0.5 rounded font-bold border transition-colors flex items-center gap-1 ${
                                                                                        (companion.skillShortcuts || []).includes(styleSkillSet.equippedActive.name)
                                                                                            ? 'bg-amber-950 text-amber-300 border-amber-700/80 hover:bg-amber-900/80'
                                                                                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                                                                                    }`}
                                                                                    title="숏컷 번호 지정 및 해제"
                                                                                >
                                                                                    <Zap size={10} className={(companion.skillShortcuts || []).includes(styleSkillSet.equippedActive.name) ? 'text-amber-400 fill-amber-400' : ''} />
                                                                                    <span>
                                                                                        {(companion.skillShortcuts || []).includes(styleSkillSet.equippedActive.name)
                                                                                            ? `숏컷 #${(companion.skillShortcuts || []).indexOf(styleSkillSet.equippedActive.name) + 1}`
                                                                                            : '숏컷 등록'}
                                                                                    </span>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 mb-3">
                                                                    {styleSkillSet.equippedActive.description}
                                                                </p>
                                                            </div>

                                                             <div className="space-y-2 pt-2 border-t border-slate-800/80">
                                                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                                                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex flex-col justify-center">
                                                                        <span className="text-[10px] text-slate-400 block font-medium whitespace-nowrap">소모 MP</span>
                                                                        <span className="font-mono font-bold text-blue-400 whitespace-nowrap">{styleSkillSet.equippedActive.mpCost} MP</span>
                                                                    </div>
                                                                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex flex-col justify-center">
                                                                        <span className="text-[10px] text-slate-400 block font-medium whitespace-nowrap">위력 계수</span>
                                                                        <span className="font-mono font-bold text-amber-400 whitespace-nowrap">{styleSkillSet.equippedActive.powerRatio}%</span>
                                                                    </div>
                                                                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex flex-col justify-center">
                                                                        <span className="text-[10px] text-slate-400 block font-medium whitespace-nowrap">스킬 등급</span>
                                                                        <span className="font-mono font-bold text-purple-300 text-xs truncate whitespace-nowrap">{styleSkillSet.equippedActive.tier || '전투계열'}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="text-[10px] text-slate-400 bg-slate-950/80 p-2 rounded-xl border border-slate-800/60 flex items-center justify-between">
                                                                    <span className="text-slate-500 font-medium">전투 발동 조건:</span>
                                                                    <span className="text-amber-300 font-mono">MP {styleSkillSet.equippedActive.mpCost} 이상 보유 시 자율/명령 발동</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* 2. [계열 장착 고유 패시브 스킬] */}
                                                        <div className="bg-slate-900/90 border border-cyan-500/40 hover:border-cyan-400 rounded-2xl p-4 flex flex-col justify-between shadow-md transition-all">
                                                            <div>
                                                                <div className="flex items-start justify-between gap-2 mb-2.5">
                                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                                        <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-600/60 text-cyan-300 shrink-0 shadow-inner">
                                                                            <Shield size={18} />
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                                <h4 className="font-black text-sm sm:text-base text-cyan-300 truncate">
                                                                                    {styleSkillSet.equippedPassive.name}
                                                                                </h4>
                                                                                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-blue-950/80 text-blue-300 border border-blue-800/60">
                                                                                    상시 패시브
                                                                                </span>
                                                                            </div>
                                                                            <span className="text-[10px] text-cyan-400/90 font-bold block mt-0.5">
                                                                                [계열 장착 시 상시 활성화되는 전용 패시브]
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 mb-3">
                                                                    {styleSkillSet.equippedPassive.description}
                                                                </p>
                                                            </div>

                                                            <div className="pt-2 border-t border-slate-800/80 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/60">
                                                                <span className="text-[10px] text-slate-400 block font-medium mb-1">상시 효과:</span>
                                                                <span className="text-xs font-bold text-cyan-200">
                                                                    {styleSkillSet.equippedPassive.description}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* 3. [계열 습득 기초 연마 패시브] */}
                                                        <div className="bg-slate-900/90 border border-indigo-500/40 hover:border-indigo-400 rounded-2xl p-4 flex flex-col justify-between shadow-md transition-all md:col-span-2">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-600/60 text-indigo-300 shrink-0 shadow-inner">
                                                                        <BookOpen size={18} />
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <h4 className="font-black text-sm sm:text-base text-indigo-300">
                                                                                {styleSkillSet.learnedPassive.name}
                                                                            </h4>
                                                                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                                                                                영구 패시브
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-[10px] text-indigo-400/90 font-bold block mt-0.5">
                                                                            [계열을 습득한 모든 동료에게 영구 누적 적용되는 기초 연마 패시브]
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 my-2.5">
                                                                {styleSkillSet.learnedPassive.description}
                                                            </p>

                                                            {styleSkillSet.learnedPassive.statBonus && (
                                                                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80">
                                                                    {Object.entries(styleSkillSet.learnedPassive.statBonus).map(([key, val]) => (
                                                                        <span key={key} className="text-[10px] font-mono font-bold bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 text-amber-300">
                                                                            {key.toUpperCase()} +{val}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                    </div>

                                                    {/* 해금/연계된 전투 계열 경로 이력 */}
                                                    {unlockedStyles.length > 0 && (
                                                        <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                                                                    <GitBranch size={13} className="text-amber-400" />
                                                                    <span>해금된 계열 연계 이력 ({unlockedStyles.length}개)</span>
                                                                </span>
                                                                <span className="text-[10px] text-slate-500">기초 연마 패시브 상시 누적</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {unlockedStyles.map(st => {
                                                                    const cfg = COMBAT_STYLE_CONFIG[st];
                                                                    const isCur = st === companion.combatStyle;
                                                                    return (
                                                                        <span 
                                                                            key={st}
                                                                            className={`text-xs px-2.5 py-1 rounded-xl border font-bold flex items-center gap-1 ${
                                                                                isCur 
                                                                                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/80 shadow-sm' 
                                                                                    : 'bg-slate-900 text-slate-400 border-slate-800'
                                                                            }`}
                                                                        >
                                                                            {isCur && <Check size={12} className="text-amber-400" />}
                                                                            <span>{cfg ? cfg.label : st}</span>
                                                                            <span className="text-[9px] font-mono text-slate-500">
                                                                                ({cfg?.tier || 1}차)
                                                                            </span>
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                /* 전투 계열 미장착 상태 안내 카드 */
                                                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-lg">
                                                    <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                                                        <Crosshair size={28} />
                                                    </div>
                                                    <div className="space-y-1.5 max-w-md mx-auto">
                                                        <h4 className="text-base font-bold text-slate-200">
                                                            장착된 전투 계열이 없습니다
                                                        </h4>
                                                        <p className="text-xs text-slate-400 leading-relaxed">
                                                            거점의 <strong>[훈련소]</strong>에서 동료에게 9대 전투 계열(검사, 창술사, 버서커, 권투사, 궁수, 도적, 총잡이, 마법사, 기공사)을 전수할 수 있습니다.
                                                        </p>
                                                    </div>
                                                    <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 max-w-md mx-auto text-left text-xs text-slate-300 space-y-1.5">
                                                        <div className="font-bold text-amber-400 flex items-center gap-1">
                                                            <Sparkles size={13} /> 전투 계열 전수 혜택:
                                                        </div>
                                                        <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-1">
                                                            <li>계열 고유 액티브 오의 스킬 동료 자동 장착 및 전투 시 자동 발동</li>
                                                            <li>계열 고유 패시브 및 기초 연마 영구 패시브 스탯 보너스 부여</li>
                                                            <li>차수별(1차~4차) 상위 전투 계열로 승급 전직 가능</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ========================================================================= */}
                                    {/* 2. 일반 클래스 스킬 목록 화면 */}
                                    {/* ========================================================================= */}
                                    {activeTier !== '전투 계열' && (
                                        <div className="grid grid-cols-1 gap-2.5">
                                            {filteredSkills.length > 0 ? (
                                                filteredSkills.map((skill, i) => {
                                                    const isAttack = skill.type === SkillType.PHYSICAL || skill.type === SkillType.MAGIC;
                                                    const isBuff = skill.type === SkillType.BUFF;
                                                    const isDebuff = skill.type === SkillType.DEBUFF;
                                                    const isPassive = skill.type === SkillType.PASSIVE;
                                                    const requiredMastery = 20 * (skill.level + 4);
                                                    const masteryPercent = skill.maxLevel ? Math.min(100, (skill.currentMastery / requiredMastery) * 100) : 0;

                                                    // Calculate passive vs active power ratio details
                                                    let passiveInfo: { target: string, base: number, scale: number, cond?: string, currentPercent: number, isSpecial?: boolean, rawDesc?: string } | null = null;
                                                    let baseRatio = skill.powerRatio || (isAttack ? 100 : 30);
                                                    const effectiveTier = (skill.isBondSkill || skill.tier === ClassTier.BOND || (skill.tier as any) === '인연' || (skill.tier as any) === '인연스킬')
                                                        ? ((skill as any).baseTier || (skill as any).minClassTier || ClassTier.FIRST)
                                                        : skill.tier;
                                                    const attackScale = effectiveTier ? (ATTACK_SCALING[effectiveTier] || 1.0) : 1.0;
                                                    let currentRatio = isAttack 
                                                        ? Math.round(baseRatio + ((skill.level || 1) * attackScale))
                                                        : +(baseRatio + Math.max(0, (skill.level || 1) - 1) * (effectiveTier ? (BUFF_SCALING[effectiveTier] || 0.1) : 0.1)).toFixed(2);

                                                    if (isPassive && skill.effectFormula) {
                                                        const regex = /PASSIVE: \[([\s\w가-힣:]+)\] \+(\d+(?:\.\d+)?)% \(\+(\d+(?:\.\d+)?)% per Lv\)(?: \[COND: (.+)\])?/;
                                                        const match = skill.effectFormula.match(regex);
                                                        if (match) {
                                                            const target = match[1];
                                                            const base = parseFloat(match[2]);
                                                            const scale = parseFloat(match[3]);
                                                            const cond = match[4];
                                                            const currentPercent = +(base + scale * (skill.level || 1)).toFixed(2);
                                                            passiveInfo = { target, base, scale, cond, currentPercent };
                                                        } else if (skill.effectFormula.includes('MANA_SHIELD')) {
                                                            const msMatch = skill.effectFormula.match(/MANA_SHIELD\] (\d+(?:\.\d+)?)% \(\+(\d+(?:\.\d+)?)% per Lv\)/);
                                                            if (msMatch) {
                                                                const base = parseFloat(msMatch[1]);
                                                                const scale = parseFloat(msMatch[2]);
                                                                const currentPercent = +(base + scale * (skill.level || 1)).toFixed(2);
                                                                passiveInfo = { target: '마나 실드 (피해 마나 흡수)', base, scale, currentPercent };
                                                            }
                                                        } else if (skill.effectFormula.includes('SPECIAL:')) {
                                                            const specCode = skill.effectFormula.replace(/.*SPECIAL:([^\]]+).*/, '$1');
                                                            passiveInfo = { target: specCode, base: 0, scale: 0, currentPercent: 0, isSpecial: true, rawDesc: skill.effectFormula };
                                                        } else {
                                                            // Generic percentage extraction if any
                                                            const percentMatch = skill.effectFormula.match(/(\d+(\.\d+)?)%/);
                                                            if (percentMatch) {
                                                                const base = parseFloat(percentMatch[1]);
                                                                passiveInfo = { target: '상시 효과', base, scale: 0.1, currentPercent: +(base + 0.1 * (skill.level || 1)).toFixed(1) };
                                                            }
                                                        }
                                                    } else if (!isPassive && !skill.powerRatio && skill.effectFormula) {
                                                        const percentMatch = skill.effectFormula.match(/(\d+(\.\d+)?)%/);
                                                        if (percentMatch) {
                                                            baseRatio = parseFloat(percentMatch[1]);
                                                            currentRatio = isAttack 
                                                                ? Math.round(baseRatio + ((skill.level || 1) * attackScale))
                                                                : +(baseRatio + Math.max(0, (skill.level || 1) - 1) * (effectiveTier ? (BUFF_SCALING[effectiveTier] || 0.1) : 0.1)).toFixed(2);
                                                        }
                                                    }

                                                    return (
                                                        <div key={`${skill.id || skill.name}-${i}`} className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col shadow-sm">
                                                            {/* Header: Skill Name, Tier, Type, MP */}
                                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                                                    {/* 스킬 썸네일 */}
                                                                    <div className="shrink-0 relative">
                                                                        {skill.imageUrl ? (
                                                                            <div className="w-9 h-9 rounded-lg border border-slate-700 bg-slate-950 overflow-hidden shadow-inner flex items-center justify-center">
                                                                                <img src={skill.imageUrl} alt={skill.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                                            </div>
                                                                        ) : (
                                                                            <div className={`p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 shadow-inner flex items-center justify-center w-9 h-9`}>
                                                                                {(() => {
                                                                                    const IconComp = getSkillIconComponent(skill);
                                                                                    return <IconComp size={16} />;
                                                                                })()}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex flex-col min-w-0 flex-1">
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <span className="text-sm font-bold text-slate-100 break-keep">{skill.name}</span>
                                                                            {((skill as any).companionName || (skill as any).sourceName || (skill as any).partnerName || (skill.tier as any) === ClassTier.BOND || (skill.tier as any) === '인연' || selectedTier === '인연 스킬') && (
                                                                                <span className="text-[10px] bg-pink-950/80 text-pink-300 font-bold px-2 py-0.5 rounded border border-pink-600/60 flex items-center gap-1 shadow-sm shrink-0">
                                                                                    <Heart size={10} className="text-pink-400 fill-pink-400 shrink-0" />
                                                                                    <span>인연: {(skill as any).companionName || (skill as any).sourceName || (skill as any).partnerName || character?.name || '동료'}</span>
                                                                                </span>
                                                                            )}
                                                                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border shrink-0 ${
                                                                                isAttack ? 'bg-red-950/60 text-red-400 border-red-800/60' :
                                                                                isBuff ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' :
                                                                                isDebuff ? 'bg-purple-950/60 text-purple-400 border-purple-800/60' :
                                                                                'bg-blue-950/60 text-blue-400 border-blue-800/60'
                                                                            }`}>
                                                                                {skill.type}
                                                                            </span>
                                                                            {skill.targetType && (
                                                                                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                                                                                    [{skill.targetType === 'aoe' ? '광역' : '단일'}]
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShortcutTarget({
                                                                            name: skill.name,
                                                                            displayName: skill.name,
                                                                            type: 'skill',
                                                                            icon: skill.icon,
                                                                            imageUrl: skill.imageUrl
                                                                        })}
                                                                        className={`text-[10px] px-2 py-0.5 rounded font-bold border transition-colors flex items-center gap-1 ${
                                                                            (companion.skillShortcuts || []).includes(skill.name)
                                                                                ? 'bg-amber-950 text-amber-300 border-amber-700/80 hover:bg-amber-900/80'
                                                                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                                                                        }`}
                                                                        title="숏컷 번호 지정 및 해제"
                                                                    >
                                                                        <Zap size={10} className={(companion.skillShortcuts || []).includes(skill.name) ? 'text-amber-400 fill-amber-400' : ''} />
                                                                        <span>
                                                                            {(companion.skillShortcuts || []).includes(skill.name)
                                                                                ? `숏컷 #${(companion.skillShortcuts || []).indexOf(skill.name) + 1}`
                                                                                : '숏컷'}
                                                                        </span>
                                                                    </button>
                                                                    <span className="text-xs text-blue-400 font-mono font-bold bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/40">
                                                                        MP {isPassive ? 0 : skill.mpCost}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                                                        {isMonster ? '몬스터' : ((skill.tier as any) === ClassTier.NONE || (skill.tier as any) === '없음' || !skill.tier) ? '미해방' : ((skill.tier as any) === ClassTier.BOND ? '인연' : skill.tier)}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Mastery Progress Bar */}
                                                            <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2.5 overflow-hidden border border-slate-800/80">
                                                                <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300" style={{ width: `${masteryPercent}%` }}></div>
                                                            </div>
                                                            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                                                                <span>Lv.{skill.level}/{skill.maxLevel}</span>
                                                                <span>Exp: {skill.currentMastery}/{requiredMastery} ({masteryPercent.toFixed(0)}%)</span>
                                                            </div>

                                                            {/* Skill Detail Specs: Attack, Buff, Debuff, Passive */}
                                                            <div className="mt-2.5 pt-2 border-t border-slate-800/70 grid grid-cols-1 gap-2">
                                                                {/* 1. Attack / Buff / Debuff: Power Ratio & Scaled Ratio */}
                                                                {!isPassive && (
                                                                    <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs ${
                                                                        isAttack ? 'bg-red-950/20 border-red-900/30' :
                                                                        isBuff ? 'bg-emerald-950/20 border-emerald-900/30' :
                                                                        'bg-purple-950/20 border-purple-900/30'
                                                                    }`}>
                                                                        <span className="text-slate-400 flex items-center gap-1.5">
                                                                            {isAttack && <Sword size={12} className="text-red-400" />}
                                                                            {isBuff && <Shield size={12} className="text-emerald-400" />}
                                                                            {isDebuff && <Zap size={12} className="text-purple-400" />}
                                                                            <span>
                                                                                {isAttack ? '위력 계수 (Power Ratio):' :
                                                                                 isBuff ? '버프 계수 (Power Ratio):' :
                                                                                 '디버프 계수 (Power Ratio):'}
                                                                            </span>
                                                                        </span>
                                                                        <div className="font-mono font-bold">
                                                                            <span className={
                                                                                isAttack ? 'text-red-300' :
                                                                                isBuff ? 'text-emerald-300' :
                                                                                'text-purple-300'
                                                                            }>
                                                                                기본 {baseRatio}%
                                                                            </span>
                                                                            <span className="text-[10px] text-amber-400 ml-1.5 font-semibold">
                                                                                (Lv적용 {currentRatio}%)
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* 2. Passive Skill: Specific Constant Passive Scaling & Details */}
                                                                {isPassive && (
                                                                    <div className="bg-blue-950/20 border border-blue-900/30 px-2.5 py-1.5 rounded-lg text-xs flex flex-col gap-1">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                                                                                <BookOpen size={12} className="text-blue-400" />
                                                                                <span>패시브 상시 보정:</span>
                                                                            </span>
                                                                            <div className="font-mono font-bold">
                                                                                {passiveInfo && !passiveInfo.isSpecial ? (
                                                                                    <>
                                                                                        <span className="text-blue-300">
                                                                                            기본 +{passiveInfo.base}%
                                                                                        </span>
                                                                                        <span className="text-[10px] text-amber-400 ml-1.5 font-semibold">
                                                                                            (Lv적용 +{passiveInfo.currentPercent}%)
                                                                                        </span>
                                                                                    </>
                                                                                ) : (
                                                                                    <span className="text-blue-300">
                                                                                        {passiveInfo?.rawDesc || '특수 패시브 상시 적용'}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        {passiveInfo && !passiveInfo.isSpecial && (
                                                                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-blue-900/20 font-mono">
                                                                                <span className="text-blue-300/90 font-sans">
                                                                                    대상: [{passiveInfo.target}]{passiveInfo.cond ? ` (착용: ${passiveInfo.cond})` : ''}
                                                                                </span>
                                                                                <span className="text-slate-400 text-[10px]">
                                                                                    (성장: Lv당 +{passiveInfo.scale}%)
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Detailed Effect description per skill type */}
                                                                {isBuff && (() => {
                                                                    const cleanseAilments = getCleanseAilments(skill);
                                                                    const buffSummaries = getBuffEffectSummaries(skill);
                                                                    return (
                                                                        <div className="space-y-1">
                                                                            <div className="bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-emerald-900/30 flex items-start justify-between gap-2 text-xs">
                                                                                <span className="text-slate-400 shrink-0 font-medium">강화 효과:</span>
                                                                                <span className="text-emerald-300 font-mono text-right font-medium">
                                                                                    {skill.effectFormula || `아군 능력치 +${currentRatio}% 강화`}
                                                                                </span>
                                                                            </div>
                                                                            {cleanseAilments.length > 0 && (
                                                                                <div className="bg-teal-950/70 border border-teal-500/50 px-2.5 py-1 rounded-lg flex items-center gap-1.5 flex-wrap text-xs">
                                                                                    <Sparkles size={11} className="text-teal-400 shrink-0" />
                                                                                    <span className="text-teal-300 font-bold shrink-0">해제 상태이상:</span>
                                                                                    <span className="text-teal-100 font-bold">
                                                                                        {cleanseAilments.map(a => `[${a}]`).join(' ')}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            {buffSummaries.length > 0 && (
                                                                                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                                                                    {buffSummaries.map((sum, sIdx) => (
                                                                                        <span key={sIdx} className="text-[10px] font-medium text-emerald-300 bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-500/40">
                                                                                            {sum}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}

                                                                {isDebuff && (
                                                                    <div className="bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-purple-900/30 flex items-start justify-between gap-2 text-xs">
                                                                        <span className="text-slate-400 shrink-0 font-medium">약화 효과:</span>
                                                                        <span className="text-purple-300 font-mono text-right font-medium">
                                                                            {skill.effectFormula || `적 대상 능력치 -${currentRatio}% 약화`}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {isAttack && skill.effectFormula && (
                                                                    <div className="bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-red-900/30 flex items-start justify-between gap-2 text-xs">
                                                                        <span className="text-slate-400 shrink-0 font-medium">연산/부가효과:</span>
                                                                        <span className="text-amber-400/90 font-mono text-right font-medium">
                                                                            {skill.effectFormula}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Description */}
                                                            {skill.description && (
                                                                <p className="text-xs text-slate-400 mt-2 italic bg-slate-950/40 px-2.5 py-1.5 rounded border border-slate-800/50">
                                                                    "{skill.description}"
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            ) : (<div className="text-center py-8 text-slate-600"><p className="text-xs">해당 분류의 스킬이 없습니다.</p></div>)}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                 )} 
                  {activeTab === 'titles' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        {/* Header Banner */}
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                              <TitleIcon size={22} />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                                칭호 보관함
                                <span className="text-xs font-normal text-slate-400">
                                  (보유: <span className="text-amber-400 font-bold">{companion.availableTitles?.length || 0}</span> / {Object.keys(TITLES).length}개)
                                </span>
                              </h3>
                              <p className="text-xs text-slate-400">달성한 과업의 칭호를 장착하여 추가 능력치를 얻으세요.</p>
                            </div>
                          </div>

                          {/* Currently Equipped Title Display */}
                          <div className="flex items-center gap-2 bg-slate-900/90 px-3.5 py-2 rounded-xl border border-slate-800 text-xs">
                            <span className="text-slate-400 font-medium">착용 중인 칭호:</span>
                            {(() => {
                              const equippedTitle = companion.equippedTitleId ? TITLES[companion.equippedTitleId] : null;
                              if (equippedTitle) {
                                return (
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-amber-300">[{equippedTitle.name}]</span>
                                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-900/40">
                                      {formatTitleStats(equippedTitle)}
                                    </span>
                                    <button
                                       onClick={() => onEquipTitle?.(companion.id, undefined)}
                                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded border border-slate-700 transition-colors ml-1"
                                    >
                                      해제
                                    </button>
                                  </div>
                                );
                              }
                              return <span className="text-slate-500 italic">없음</span>;
                            })()}
                          </div>
                        </div>

                        {/* Compact Titles Grid (~1/6 Size of previous cards) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
                            {Object.values(TITLES).map(title => {
                                const isUnlocked = companion.availableTitles?.includes(title.id);
                                const isEquipped = companion.equippedTitleId === title.id;
                                const statSummary = formatTitleStats(title);
                                return (
                                    <div 
                                        key={title.id} 
                                        className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-1.5 relative group ${
                                          isEquipped ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/40' : 
                                          isUnlocked ? 'bg-slate-950 hover:bg-slate-900 border-slate-800 hover:border-amber-500/40' : 
                                          'bg-slate-950/50 border-slate-900/80 opacity-40 grayscale'
                                        }`}
                                    >
                                        {/* Title Header & Status */}
                                        <div className="flex items-center justify-between gap-1.5">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 uppercase font-mono ${RARITY_COLORS[title.rarity] || 'text-slate-400 border-slate-700'}`}>
                                              {title.rarity}
                                            </span>
                                            <h4 className={`text-xs font-bold truncate ${isUnlocked ? (isEquipped ? 'text-amber-200' : 'text-slate-100') : 'text-slate-400'}`} title={title.name}>
                                              {title.name}
                                            </h4>
                                          </div>
                                          {isEquipped && (
                                            <span className="text-[9px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40 shrink-0 flex items-center gap-0.5">
                                              <Check size={10} /> 착용중
                                            </span>
                                          )}
                                        </div>

                                        {/* Stats Summary Line */}
                                        <div className="text-[10px] font-medium text-emerald-400 truncate bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800/80" title={statSummary}>
                                          {statSummary}
                                        </div>

                                        {/* Requirement & Button */}
                                        <div className="flex items-center justify-between gap-1 text-[9px] pt-1 border-t border-slate-900">
                                          <span className="text-slate-400 truncate max-w-[130px]" title={title.requirementText}>
                                            {title.requirementText}
                                          </span>
                                          <div className="shrink-0">
                                            {isEquipped ? (
                                              <button 
                                                 onClick={() => onEquipTitle?.(companion.id, undefined)}
                                                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold transition-colors"
                                              >
                                                해제
                                              </button>
                                            ) : isUnlocked ? (
                                              <button 
                                                onClick={() => onEquipTitle?.(companion.id, title.id)}
                                                className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold shadow-md transition-colors"
                                              >
                                                장착
                                              </button>
                                            ) : (
                                              <span className="text-slate-600 bg-black/20 px-2 py-0.5 rounded border border-slate-800">
                                                잠금
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                 )}
                 {activeTab === 'growth' && (
                      <CompanionGrowthTab companion={companion} onUpdateCompanion={handleUpdateCompanion} />
                  )}
                  {activeTab === 'liberation' && (
                      <div className="space-y-6 max-w-2xl mx-auto py-4">
                          <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
                              <div className="flex items-center gap-3">
                                  <div className="p-3 bg-amber-900/20 border border-amber-500/20 rounded-lg text-amber-500">
                                      <Crown size={24} className="animate-pulse" />
                                  </div>
                                  <div>
                                      <h3 className="text-lg font-bold text-amber-500">클래스 해방 (Class Liberation)</h3>
                                      <p className="text-xs text-slate-400">동료의 내재된 잠재력을 각성시켜 새로운 차원의 능력을 개방합니다.</p>
                                  </div>
                              </div>

                              {/* 현재 상태 정보 카드 */}
                              <div className="grid grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                                  <div>
                                      <span className="text-[10px] text-slate-500 font-bold block mb-1">현재 클래스 (Current Class)</span>
                                      <span className="text-sm font-black text-amber-300">{companion.classTier === ClassTier.NONE ? '미해방' : companion.classTier}</span>
                                  </div>
                                  <div>
                                      <span className="text-[10px] text-slate-500 font-bold block mb-1">한계 포텐셜 (Liberation Potential)</span>
                                      {(() => {
                                          if (companion.potentialAppraised !== true) {
                                              return (
                                                  <span className="text-xs font-bold px-2 py-0.5 rounded border inline-block bg-slate-900 border-slate-700 text-slate-400">
                                                      알 수 없음 (감정 필요)
                                                  </span>
                                              );
                                          }
                                          const POTENTIAL_STYLES: Partial<Record<ClassTier, { label: string; badge: string }>> = {
                                              [ClassTier.NONE]: { label: '해방 불가', badge: 'bg-slate-950 border-slate-800 text-slate-500 font-bold' },
                                              [ClassTier.FIRST]: { label: '퍼스트 클래스', badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-black shadow-sm ring-1 ring-emerald-500/20' },
                                              [ClassTier.SECOND]: { label: '세컨드 클래스', badge: 'bg-sky-500/10 border-sky-500/30 text-sky-400 font-black shadow-md ring-1 ring-sky-500/20' },
                                              [ClassTier.LAST]: { label: '라스트 클래스', badge: 'bg-purple-500/10 border-purple-500/30 text-purple-400 font-black shadow-lg ring-1 ring-purple-500/20' },
                                              [ClassTier.FINAL]: { label: '파이널 클래스', badge: 'bg-gradient-to-r from-teal-500/15 via-cyan-500/10 to-emerald-500/15 border-teal-500 text-teal-300 font-black shadow-xl shadow-teal-950/40 animate-pulse ring-1 ring-teal-400/30' }
                                          };
                                          const style = POTENTIAL_STYLES[initializedCompanion.liberationPotential || ClassTier.NONE] || POTENTIAL_STYLES[ClassTier.NONE]!;
                                          return (
                                              <span className={`text-xs font-bold px-2 py-0.5 rounded border inline-block ${style.badge}`}>
                                                  {style.label}
                                              </span>
                                          );
                                      })()}
                                  </div>
                              </div>

                              {/* 각 단계별 요구 레벨 및 상태 */}
                              <div className="space-y-2">
                                  <h4 className="text-xs font-bold text-slate-400 uppercase">클래스별 해방 요구 조건 및 도달 여부</h4>
                                  <div className="space-y-2">
                                      {(() => {
                                          const currentTier = companion.classTier || ClassTier.NONE;
                                          const level = companion.level;
                                          const potential = initializedCompanion.liberationPotential || ClassTier.NONE;

                                          const TIER_RANK_MAP: Record<ClassTier, number> = {
                                              [ClassTier.NONE]: 0,
                                              [ClassTier.F]: 0,
                                              [ClassTier.FIRST]: 1,
                                              [ClassTier.SECOND]: 2,
                                              [ClassTier.LAST]: 3,
                                              [ClassTier.FINAL]: 4,
                                              [ClassTier.BOND]: 5
                                          };

                                          const potentialRank = TIER_RANK_MAP[potential] || 0;

                                          const steps = [
                                               { target: ClassTier.FIRST, name: '퍼스트 클래스', reqLvl: 30, reqCp: 8000, prev: ClassTier.NONE },
                                               { target: ClassTier.SECOND, name: '세컨드 클래스', reqLvl: 100, reqCp: 30000, prev: ClassTier.FIRST },
                                               { target: ClassTier.LAST, name: '라스트 클래스', reqLvl: 300, reqCp: 100000, prev: ClassTier.SECOND },
                                               { target: ClassTier.FINAL, name: '파이널 클래스', reqLvl: 1000, reqCp: 1000000, prev: ClassTier.LAST }
                                           ];

                                          return steps.map((step) => {
                                              const targetRank = TIER_RANK_MAP[step.target];
                                              const isCurrentOrHigher = TIER_RANK_MAP[currentTier] >= targetRank;
                                              const isNext = TIER_RANK_MAP[currentTier] === TIER_RANK_MAP[step.prev];
                                              const levelMet = level >= step.reqLvl;
                                               const hasAppraised = companion.potentialAppraised === true;
                                               const potentialMet = hasAppraised && (targetRank <= potentialRank);
                                              const isFinalStep = step.target === ClassTier.FINAL;
                                              const compCP = getCompanionCP(companion);
                                              const cpMet = compCP >= (step as any).reqCp;
                                              const trialMet = companion.isCustom
                                                  ? (
                                                      step.target === ClassTier.FIRST ? Boolean(companion.hasClearedFirstTrial || companion.firstTrialCleared || companion.hasClearedSecondTrial || companion.secondTrialCleared || companion.hasClearedLastTrial || companion.lastTrialCleared || companion.hasClearedFinalTrial || companion.finalTrialCleared) :
                                                      step.target === ClassTier.SECOND ? Boolean(companion.hasClearedSecondTrial || companion.secondTrialCleared || companion.hasClearedLastTrial || companion.lastTrialCleared || companion.hasClearedFinalTrial || companion.finalTrialCleared) :
                                                      step.target === ClassTier.LAST ? Boolean(companion.hasClearedLastTrial || companion.lastTrialCleared || companion.hasClearedFinalTrial || companion.finalTrialCleared) :
                                                      Boolean(companion.hasClearedFinalTrial || companion.finalTrialCleared)
                                                  )
                                                  : (!isFinalStep || Boolean(companion.hasClearedFinalTrial || companion.finalTrialCleared));
                                              const allMet = hasAppraised && levelMet && potentialMet && trialMet;

                                              let statusBg = "bg-slate-900/40 border-slate-800/80 text-slate-500";
                                              let statusBadge = <span className="text-[10px] text-slate-600 font-bold">대기 중</span>;

                                              if (isCurrentOrHigher) {
                                                  statusBg = "bg-emerald-950/10 border-emerald-900/30 text-emerald-400";
                                                  statusBadge = <span className="text-[10px] bg-emerald-900/30 border border-emerald-800 text-emerald-400 px-2 py-0.5 rounded font-bold">해방 완료</span>;
                                              } else if (isNext) {
                                                   if (!hasAppraised) {
                                                      statusBg = "bg-amber-950/20 border-amber-900/30 text-amber-400";
                                                      statusBadge = <span className="text-[10px] bg-amber-900/30 border border-amber-700 text-amber-400 px-2 py-0.5 rounded font-bold">미감정 (감정 필요)</span>;
                                                   } else if (!potentialMet) {
                                                     statusBg = "bg-red-950/20 border-red-900/30 text-red-400";
                                                     statusBadge = <span className="text-[10px] bg-red-900/30 border border-red-800 text-red-400 px-2 py-0.5 rounded font-bold">한계 도달 (돌파 필요)</span>;
                                                  } else if (!levelMet) {
                                                     statusBg = "bg-slate-900 border-slate-800 text-slate-300";
                                                     statusBadge = <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded font-bold">Lv.{step.reqLvl} 요구 ({level}/{step.reqLvl})</span>;
                                                  } else if (!trialMet) {
                                                     statusBg = "bg-rose-950/20 border-rose-900/40 text-rose-300";
                                                     statusBadge = <span className="text-[10px] bg-rose-900/40 border border-rose-600 text-rose-300 px-2 py-0.5 rounded font-bold">1:1 시련 미통과 (결투 필요)</span>;
                                                  } else if (allMet) {
                                                     statusBg = "bg-amber-950/20 border-amber-900/40 text-amber-300 animate-pulse";
                                                     statusBadge = <span className="text-[10px] bg-amber-900/40 border border-amber-600 text-amber-300 px-2 py-0.5 rounded font-bold animate-pulse">해방 가능</span>;
                                                  } else {
                                                     statusBg = "bg-slate-900 border-slate-800 text-slate-300";
                                                     statusBadge = <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded font-bold">대기 중</span>;
                                                  }
                                              }

                                              return (
                                                  <div key={step.target} className={`p-3 rounded-lg border flex items-center justify-between text-xs transition-colors ${statusBg}`}>
                                                      <div className="flex items-center gap-2">
                                                          {isCurrentOrHigher ? (
                                                              <Check size={14} className="text-emerald-500" />
                                                          ) : isNext && !potentialMet ? (
                                                              <AlertCircle size={14} className="text-red-500" />
                                                          ) : isNext && levelMet ? (
                                                              <Sparkles size={14} className="text-amber-400 animate-pulse" />
                                                          ) : (
                                                              <Lock size={14} className="text-slate-600" />
                                                          )}
                                                          <span className="font-bold">{step.name}</span>
                                                      </div>
                                                      <div className="flex items-center gap-3">
                                                          {!isCurrentOrHigher && isNext && (
                                                              <div className="text-[10px] text-right">
                                                                  <div className={levelMet ? "text-emerald-400 font-bold" : "text-slate-500"}>레벨 조건: {levelMet ? "충족" : "미달"} (Lv.{step.reqLvl})</div>
                                                                  <div className={!hasAppraised ? "text-amber-400 font-bold" : potentialMet ? "text-emerald-400 font-bold" : "text-red-400 font-extrabold"}>포텐셜 조건: {!hasAppraised ? "알 수 없음 (감정 필요)" : potentialMet ? "충족" : "제한됨"}</div>
                                                              </div>
                                                          )}
                                                          {statusBadge}
                                                      </div>
                                                  </div>
                                              );
                                          });
                                      })()}
                                  </div>
                              </div>

                              {/* 해방 액션 카드 */}
                              <div className="pt-4 border-t border-slate-800/60">
                                  {(() => {
                                      if (!companion.isCustom) {
                                          return (
                                              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
                                                  <Lock size={18} className="text-amber-500 shrink-0" />
                                                  <div>
                                                      <div className="font-bold text-slate-300">일반 동료 해방 제한</div>
                                                      <div>일반 동료는 자발적인 클래스 해방이 제한됩니다. 연금술실험소에서 <strong>커스텀 동료</strong>로 전환하면 해방 버튼이 개방됩니다.</div>
                                                  </div>
                                              </div>
                                          );
                                      }

                                      if (companion.classTier === ClassTier.FINAL) {
                                          return (
                                              <div className="bg-emerald-950/10 p-4 rounded-lg border border-emerald-950/40 text-center space-y-1">
                                                  <Crown size={24} className="mx-auto text-amber-400 animate-bounce" />
                                                  <div className="text-sm font-bold text-emerald-300">궁극의 경지 도달</div>
                                                  <div className="text-xs text-slate-400">이 동료는 이미 최상의 계급인 궁극 클래스에 도달하여 더 이상의 해방이 필요 없습니다.</div>
                                              </div>
                                          );
                                      }

                                      const currentTier = companion.classTier || ClassTier.NONE;
                                      const level = companion.level;
                                      const potential = initializedCompanion.liberationPotential || ClassTier.NONE;

                                      const TIER_RANK_MAP: Record<ClassTier, number> = {
                                          [ClassTier.NONE]: 0,
                                          [ClassTier.F]: 0,
                                          [ClassTier.FIRST]: 1,
                                          [ClassTier.SECOND]: 2,
                                          [ClassTier.LAST]: 3,
                                          [ClassTier.FINAL]: 4,
                                          [ClassTier.BOND]: 5
                                      };

                                      let targetTier: ClassTier | null = null;
                                      let reqLvl = 0;
                                      let reqCp = 0;
                                      let reqTierName = "";

                                      if (currentTier === ClassTier.NONE) { targetTier = ClassTier.FIRST; reqLvl = 30; reqCp = 8000; reqTierName = "퍼스트 클래스"; }
                                      else if (currentTier === ClassTier.FIRST) { targetTier = ClassTier.SECOND; reqLvl = 100; reqCp = 30000; reqTierName = "세컨드 클래스"; }
                                      else if (currentTier === ClassTier.SECOND) { targetTier = ClassTier.LAST; reqLvl = 300; reqCp = 100000; reqTierName = "라스트 클래스"; }
                                      else if (currentTier === ClassTier.LAST) { targetTier = ClassTier.FINAL; reqLvl = 1000; reqCp = 1000000; reqTierName = "파이널 클래스"; }

                                      if (targetTier) {
                                          const targetRank = TIER_RANK_MAP[targetTier] || 0;
                                          const potentialRank = TIER_RANK_MAP[potential] || 0;
                                          const isLevelMet = level >= reqLvl;
                                           const hasAppraised = companion.potentialAppraised === true;
                                           const isPotentialMet = hasAppraised && (targetRank <= potentialRank);
                                          const isFinalStep = targetTier === ClassTier.FINAL;
                                          const currentCP = getCompanionCP(companion);
                                          const isCpMet = currentCP >= reqCp;
                                          const isTrialMet = companion.isCustom
                                              ? (
                                                  targetTier === ClassTier.FIRST ? Boolean(companion.hasClearedFirstTrial || companion.firstTrialCleared || companion.hasClearedSecondTrial || companion.secondTrialCleared || companion.hasClearedLastTrial || companion.lastTrialCleared || companion.hasClearedFinalTrial || companion.finalTrialCleared) :
                                                  targetTier === ClassTier.SECOND ? Boolean(companion.hasClearedSecondTrial || companion.secondTrialCleared || companion.hasClearedLastTrial || companion.lastTrialCleared || companion.hasClearedFinalTrial || companion.finalTrialCleared) :
                                                  targetTier === ClassTier.LAST ? Boolean(companion.hasClearedLastTrial || companion.lastTrialCleared || companion.hasClearedFinalTrial || companion.finalTrialCleared) :
                                                  Boolean(companion.hasClearedFinalTrial || companion.finalTrialCleared)
                                              )
                                              : (!isFinalStep || Boolean(companion.hasClearedFinalTrial || companion.finalTrialCleared));

                                          if (isLevelMet && isPotentialMet && isTrialMet && isCpMet) {
                                              return (
                                                  <div className="bg-gradient-to-r from-amber-900/20 to-purple-900/20 p-5 rounded-lg border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                                                      <div className="text-center sm:text-left">
                                                          <div className="flex items-center gap-2">
                                                              <h4 className="text-amber-200 font-bold text-sm flex items-center justify-center sm:justify-start gap-1">
                                                                  <Crown size={16} className="text-amber-400 animate-bounce" />
                                                                  {reqTierName} 해방 자질 확인됨
                                                              </h4>
                                                              <span className="text-[10px] bg-emerald-900/50 border border-emerald-500/60 text-emerald-300 px-2 py-0.5 rounded font-bold">
                                                                  1:1 시련 통과 완료
                                                              </span>
                                                          </div>
                                                          <p className="text-xs text-slate-400 mt-0.5">
                                                              1:1 시련 결투를 통과하여 클래스를 즉시 각성할 수 있습니다.
                                                          </p>
                                                     </div>
                                                     <button 
                                                         onClick={onEvolveClass} 
                                                         className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-extrabold text-sm rounded shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-1.5"
                                                     >
                                                         <Sparkles size={16} className="text-amber-200" />
                                                         <span>클래스 해방하기</span>
                                                     </button>
                                                 </div>
                                             );
                                         } else if (isLevelMet && isPotentialMet && (!isTrialMet || !isCpMet)) {
                                              const handleLaunchTrial = () => {
                                                  if (companion.potentialAppraised !== true) {
                                                      alert("이 동료의 한계 잠재력이 아직 감정되지 않았습니다. 먼저 마을 거주구역의 예언가 사바스에게 감정받으십시오.");
                                                      return;
                                                  }
                                                  if (!onBattle) {
                                                      alert("전투 시스템에 접근할 수 없습니다.");
                                                      return;
                                                  }
                                                  const messengerInfo = getTrialMessengerForShinryoku(companion.shinryokuType || '무');
                                                  const trialEnemy = getTrialEnemyForTier(targetTier, messengerInfo, false, companion.id);
                                                  onClose();
                                                  onBattle(trialEnemy, 'final_trial_battle', companion.id);
                                              };

                                              return (
                                                  <div className="bg-rose-950/25 p-4 rounded-lg border border-rose-900/50 text-xs text-rose-300 space-y-3">
                                                      <div className="flex items-center justify-between flex-wrap gap-2">
                                                          <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
                                                              <AlertCircle size={16} className="text-rose-500 shrink-0" />
                                                              {reqTierName} 해방 자격 미달성 (1:1 결투 필요)
                                                          </div>
                                                          {onBattle && (
                                                              <button
                                                                  onClick={handleLaunchTrial}
                                                                  disabled={companion.potentialAppraised !== true}
                                                                  className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition-all shadow-md flex items-center gap-1.5 active:scale-95 ${
                                                                      companion.potentialAppraised !== true
                                                                          ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed shadow-none'
                                                                          : 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-950/50'
                                                                  }`}
                                                              >
                                                                  {companion.potentialAppraised !== true ? <AlertCircle size={13} className="text-rose-500 animate-pulse" /> : <Flame size={13} />}
                                                                  <span>
                                                                      {companion.potentialAppraised !== true
                                                                          ? '잠재력 감정 필요 (시련 불가)'
                                                                          : `1:1 ${reqTierName} 시련 즉시 도전`
                                                                      }
                                                                  </span>
                                                              </button>
                                                          )}
                                                      </div>
                                                      <div className="space-y-1 text-slate-300 leading-relaxed">
                                                          {companion.potentialAppraised !== true && (
                                                              <p className="text-amber-400 font-bold animate-pulse">
                                                                  • 예언가 사바스에게 이 동료의 한계 잠재력을 아직 감정받지 않았습니다. 잠재력 감정 후 시련 도전이 활성화됩니다.
                                                              </p>
                                                          )}
                                                          {!isCpMet && (
                                                              <p className="text-amber-300 font-semibold">
                                                                  • {reqTierName} 해방을 위해서는 전투력 {reqCp.toLocaleString()} 이상이 필요합니다. (현재: {currentCP.toLocaleString()})
                                                              </p>
                                                          )}
                                                          {!isTrialMet && (
                                                              <p className="text-rose-300 font-semibold">
                                                                  • {reqTierName} 해방을 위해서는 1:1 시련에서 [{companion.name}]이(가) 플레이어 없이 홀로 신의 사자 모형을 격파해야 합니다.
                                                              </p>
                                                          )}
                                                      </div>
                                                  </div>
                                              );
                                          } else if (isLevelMet && !isPotentialMet) {
                                             return (
                                                 <div className="bg-red-950/20 p-4 rounded-lg border border-red-950/40 text-xs text-red-300 space-y-2">
                                                     <div className="flex items-center gap-2 font-bold text-red-400 text-sm">
                                                         <AlertCircle size={16} className="text-red-500" />
                                                         {companion.potentialAppraised !== true ? '미감정 포텐셜 한계 도달 우려' : '해방 한계 포텐셜 도달 (성전 돌파 필요)'}
                                                     </div>
                                                     <p className="leading-relaxed">
                                                         {companion.potentialAppraised !== true ? (
                                                             <span>이 동료의 한계 포텐셜이 아직 감정되지 않았습니다. 먼저 마을 거주구역의 예언가 사바스에게 감정받으십시오.</span>
                                                         ) : (
                                                             <span>
                                                                 이 동료의 해방 한계 포텐셜은 현재 <strong>
                                                                     {potential === ClassTier.FIRST ? "퍼스트 클래스" : 
                                                                      potential === ClassTier.SECOND ? "세컨드 클래스" : 
                                                                      potential === ClassTier.LAST ? "라스트 클래스" : potential === ClassTier.FINAL ? "파이널 클래스" : "NONE (해방 불가)"}
                                                                 </strong> 상태입니다.<br />
                                                                 다음 등급인 <strong>{reqTierName}</strong>으로 승급하기 위해서는 성전관리 모달에서 이 신력계통에 맞는 잔재 재료를 소모하여 <strong>포텐셜 증대(한계 돌파)</strong>를 먼저 마쳐야 합니다.
                                                             </span>
                                                         )}
                                                     </p>
                                                 </div>
                                             );
                                         } else {
                                             return (
                                                 <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-800/80 text-center text-xs text-slate-400 space-y-1">
                                                     <Lock size={18} className="mx-auto text-slate-600" />
                                                     <div className="font-bold text-slate-300">해방 요구 레벨 미달</div>
                                                     <p>다음 단계 해방 요구 조건인 <strong>Lv.{reqLvl}</strong>에 아직 미치지 못했습니다. (현재 레벨: Lv.{level})</p>
                                                 </div>
                                             );
                                         }
                                     }

                                     return null;
                                 })()}
                             </div>
                         </div>
                     </div>
                  )}
                 {activeTab === 'chat' && (
                     <div className="flex flex-col h-full bg-slate-950 rounded-lg border border-slate-800 overflow-hidden relative">
                         <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
                            {chatHistory.length === 0 ? (<div className="text-center text-slate-600 py-10 mt-auto mb-auto"><MessageCircle size={32} className="mx-auto mb-2 opacity-20" /><p className="text-xs">대화 기록이 없습니다. 먼저 말을 걸어보세요.</p></div>) : (chatHistory.map((msg, i) => (<div key={i} className={`flex flex-col shrink-0 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}><div className={`max-w-[80%] p-3 rounded-lg text-sm border shadow-sm ${msg.role === 'user' ? 'bg-slate-800 text-slate-200 border-slate-700 rounded-br-none' : `bg-slate-900 border border-slate-800 rounded-bl-none ${isLoverWithPlayer ? 'text-pink-100 border-pink-900/30' : 'text-amber-100/90'}`}`}>{msg.text}</div><span className="text-[9px] text-slate-600 mt-1 px-1">{msg.role === 'user' ? '나' : companion.name}</span></div>)))}
                            <div ref={chatEndRef} />
                         </div>
                         <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0">
                             <div className="relative">
                                 <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-full pl-4 pr-12 py-3 text-sm focus:border-amber-500 focus:outline-none text-slate-200 shadow-inner" placeholder={isSending ? "답변을 기다리는 중..." : "메시지를 입력하세요... (엔터로 전송)"} value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleKeyDown} disabled={isSending} />
                                 <button onClick={handleSendMessage} disabled={!chatInput.trim() || isSending} className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2.5 ${isLoverWithPlayer ? 'bg-pink-600 hover:bg-pink-500' : 'bg-amber-700 hover:bg-amber-600'} text-white rounded-full disabled:opacity-50 transition-all shadow-md`}>{isSending ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}</button>
                             </div>
                             <div className="flex justify-between items-center mt-2 px-2">
                                <span className="text-[10px] text-slate-600">{isLoverWithPlayer ? "Tip: '헤어지자'라고 말하면 이별할 수 있습니다." : "Tip: '좋아해', '사귀자' 등으로 마음을 전해보세요."}</span>
                                <button onClick={onClearChat} className="text-[10px] text-slate-600 hover:text-red-400 transition-colors">기록 삭제</button>
                             </div>
                         </div>
                    </div>
                 )}
            </div>

            
  {showPartWaysOptions && (
                <div className="absolute inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-6 animate-in fade-in">
                    <h3 className="text-xl font-bold text-slate-200 mb-2">작별하기</h3>
                    <p className="text-sm text-slate-400 mb-8 text-center max-w-sm">{companion.name}와(과) 헤어지시겠습니까?<br/>영원히 떠나보내거나, 아름다운 추억으로 남길 수 있습니다.</p>
                    <div className="flex flex-col space-y-3 w-full max-w-xs">
                        <button 
                            onClick={() => onPartWays('temporary')} 
                            className={`w-full py-3 rounded font-bold transition-colors border ${!character?.base ? 'bg-slate-900 border-slate-700 text-slate-500' : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'}`}
                        >
                            {!character?.base ? '잠시 헤어지기 (기지 미건설 - 대기불가)' : '잠시 헤어지기 (나중에 재영입 가능)'}
                        </button>
                        <button onClick={() => onPartWays('beautiful')} className="w-full py-3 bg-indigo-900/50 hover:bg-indigo-800 text-indigo-100 border border-indigo-500 rounded font-bold transition-all shadow-lg flex items-center justify-center gap-2 group">
                            <Sparkles size={18} className="group-hover:animate-pulse text-amber-400"/> 아름다운 이별 (과거 인연 기록)
                        </button>
                        <button onClick={() => onPartWays('permanent')} className="w-full py-3 bg-red-955/50 hover:bg-red-900/50 border border-red-900/50 text-red-400 rounded font-bold transition-colors">영원히 작별하기 (삭제)</button>
                        <button onClick={() => setShowPartWaysOptions(false)} className="w-full py-3 text-slate-500 hover:text-slate-300 transition-colors text-sm">취소</button>
                    </div>
                </div>
            )}
            {showMountTargetSelection && (
                <div className="absolute inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-6 animate-in fade-in">
                    <h3 className="text-xl font-bold text-slate-200 mb-2">탈것 장착 대상 선택</h3>
                    <p className="text-sm text-slate-400 mb-8 text-center max-w-sm">{companion.name}을(를) 누구의 탈것으로 장착하시겠습니까?</p>
                    <div className="flex flex-col space-y-3 w-full max-w-xs overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
                        <button 
                            onClick={() => handleMountTargetSelect('player')}
                            className="w-full py-3 bg-amber-900/40 hover:bg-amber-800/60 border border-amber-500/50 text-amber-100 rounded-lg font-bold transition-all flex items-center justify-between px-4"
                        >
                            <span>나 (Player)</span>
                            <User size={16} className="text-amber-500"/>
                        </button>
                        
                        {character?.companions.filter(c => c.id !== companion.id && !c.mountedMonsterId).map(c => (
                            <button 
                                key={c.id}
                                onClick={() => handleMountTargetSelect(c.id)}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-lg font-bold transition-all flex items-center justify-between px-4"
                            >
                                <span>{c.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-500">{c.classType}</span>
                                    <Shield size={16} className="text-blue-400"/>
                                </div>
                            </button>
                        ))}
                        
                        <button onClick={() => setShowMountTargetSelection(false)} className="w-full py-3 text-slate-500 hover:text-slate-300 transition-colors text-sm">취소</button>
                    </div>
                </div>
            )}
            {showReturnToFarmModal && (
                <div className="absolute inset-0 z-[200] bg-black/95 flex items-center justify-center p-6 animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-md shadow-2xl text-center">
                        <h3 className={`text-xl font-bold mb-2 flex items-center justify-center ${isGuardian ? 'text-indigo-400' : 'text-amber-500'}`}>
                            {isGuardian ? <Landmark size={24} className="mr-2"/> : <Home size={24} className="mr-2"/>} 
                            {isGuardian ? '성전 복귀' : '사육소 복귀'}
                        </h3>
                        <p className="text-sm text-slate-400 mb-8 max-w-sm mx-auto">
                            <span className="text-slate-200 font-bold">{companion.name}</span>을(를) {isGuardian ? '해당 지역의 성전' : '몬스터 사육소'}으로 돌려보내시겠습니까?
                            <br/><span className="text-xs text-slate-500 mt-2 block">(착용 중인 장비는 자동으로 해제됩니다)</span>
                        </p>
                        <div className="flex flex-col space-y-3 w-full max-w-xs mx-auto">
                            <button 
                              disabled={isActionProcessing}
                              onClick={() => { 
                                if (isActionProcessing) return;
                                setIsActionProcessing(true);
                                setTimeout(() => setIsActionProcessing(false), 500);

                                if (onReturnToFarm) { 
                                    onReturnToFarm(); 
                                } else if (isMonster && onUpdateCharacter && character) {
                                    const res = returnMonsterToFarm(character, companion.id, 'party');
                                    if (res.success) {
                                        onUpdateCharacter(res.newCharacter, res.message);
                                        onClose();
                                    } else {
                                        onPartWays('temporary');
                                    }
                                } else { 
                                    onPartWays('temporary'); 
                                } 
                                setShowReturnToFarmModal(false); 
                            }} className={`w-full py-3 text-white rounded font-bold transition-colors shadow-lg border disabled:opacity-50 ${isGuardian ? 'bg-indigo-700 hover:bg-indigo-600 border-indigo-500' : 'bg-amber-900 hover:bg-amber-800 border-amber-700'}`}>
                                네 ({isGuardian ? '성전 복귀' : '사육소 복귀'})
                            </button>
                            <button onClick={() => setShowReturnToFarmModal(false)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold transition-colors border border-slate-600">아니오 (취소)</button>
                        </div>
                    </div>
                </div>
            )}

            {/* [NEW] 선물 수량 지정 모달 */}
            {giftModalData && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-slate-950 border border-slate-800 w-full max-w-sm rounded-2xl p-5 flex flex-col shadow-2xl gap-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-pink-950/80 border border-pink-700/60 rounded-xl text-pink-400">
                                    <Gift size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-100">{giftModalData.item.name} 선물</h3>
                                    <p className="text-[11px] text-slate-400">보유 수량: <span className="text-amber-400 font-bold">{giftModalData.count}개</span></p>
                                </div>
                            </div>
                            <button onClick={() => setGiftModalData(null)} className="text-slate-400 hover:text-white p-1">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-300 font-bold">선물 개수</span>
                                <span className="text-sm font-mono font-bold text-pink-400">{giftAmount}개</span>
                            </div>

                            <input 
                                type="range" 
                                min={1} 
                                max={giftModalData.count} 
                                value={giftAmount} 
                                onChange={(e) => setGiftAmount(Math.max(1, Math.min(giftModalData.count, Number(e.target.value))))}
                                className="w-full accent-pink-500 cursor-pointer"
                            />

                            <div className="flex gap-1.5 justify-center">
                                {[1, 5, 10, giftModalData.count].filter((val, idx, self) => val <= giftModalData.count && self.indexOf(val) === idx).map((qty) => (
                                    <button
                                        key={qty}
                                        type="button"
                                        onClick={() => setGiftAmount(qty)}
                                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                                            giftAmount === qty 
                                                ? 'bg-pink-600 text-white border-pink-500' 
                                                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                                        }`}
                                    >
                                        {qty === giftModalData.count ? `최대 (${qty})` : `${qty}개`}
                                    </button>
                                ))}
                            </div>

                            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                                <div className="flex justify-between text-slate-400">
                                    <span>아이템 등급</span>
                                    <span className="font-bold text-slate-200">{giftModalData.item.rarity}</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                    <span>예상 호감도 증가</span>
                                    <span className="font-bold text-pink-400">
                                        +{(({ [ItemRarity.NORMAL]: 1, [ItemRarity.MAGIC]: 2, [ItemRarity.RARE]: 5, [ItemRarity.EPIC]: 10, [ItemRarity.UNIQUE]: 20, [ItemRarity.LEGENDARY]: 30, [ItemRarity.MYTHTIC]: 50 }[giftModalData.item.rarity] || 1) * giftAmount)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => setGiftModalData(null)}
                                className="flex-1 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-800 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onGiftItem(giftModalData.primaryIndex, giftAmount);
                                    setGiftModalData(null);
                                }}
                                className="flex-1 py-2 rounded-xl bg-pink-600 border border-pink-500 text-white text-xs font-bold hover:bg-pink-500 transition-colors flex items-center justify-center gap-1"
                            >
                                <Gift size={14} />
                                <span>선물하기 ({giftAmount}개)</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* [NEW] 숏컷 지정 모달 */}
            {shortcutTarget && (
                <ShortcutAssignModal
                    isOpen={Boolean(shortcutTarget)}
                    onClose={() => setShortcutTarget(null)}
                    targetName={shortcutTarget.name}
                    targetDisplayName={shortcutTarget.displayName}
                    targetType={shortcutTarget.type}
                    targetIcon={shortcutTarget.icon}
                    targetImageUrl={shortcutTarget.imageUrl}
                    character={companion as any}
                    onAssignSlot={handleAssignShortcutSlot}
                    onRemoveShortcut={() => handleRemoveShortcut(shortcutTarget.name)}
                />
            )}

            {/* [NEW] 주인공(플레이어) 전환 확인 모달 */}
            {showSwitchPlayerModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-amber-500/50 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4 text-left">
                        <div className="flex items-center space-x-2 text-amber-400 font-bold text-lg border-b border-slate-800 pb-3">
                            <Crown size={22} className="text-amber-400 shrink-0" />
                            <span>주인공 전환</span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            정말로 <strong className="text-amber-400">{companion.name}</strong>을(를) 현재 <strong className="text-amber-300">주인공(플레이어)</strong>으로 전환하시겠습니까?
                        </p>
                        <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700/60 text-xs text-slate-300 space-y-2">
                            <p className="text-amber-400 font-semibold flex items-center">
                                <span>⚠️ 전환 처리 사항</span>
                            </p>
                            <p>• {companion.name}의 능력치, 외형, 비주얼 URL, 잠재력, 스킬, 장비, 인간관계가 플레이어로 전환됩니다.</p>
                            <p>• 기존 주인공({character?.name})은 동료로 전환되어 파티 및 동료 목록에 보관됩니다.</p>
                        </div>
                        <div className="flex space-x-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowSwitchPlayerModal(false)}
                                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-semibold transition-colors border border-slate-700"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!character || !onUpdateCharacter) return;
                                    const { newPlayer, logMsg } = switchPlayerAndCompanion(character, companion);
                                    setShowSwitchPlayerModal(false);
                                    onClose();
                                    onUpdateCharacter(newPlayer, logMsg);
                                }}
                                className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg text-sm font-bold shadow-lg transition-all flex items-center justify-center space-x-1"
                            >
                                <Crown size={16} />
                                <span>전환하기</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAppearanceModal && getDivineOrDemonJobVisualUrl(companion.job, companion.gender) && (
                <AppearanceChoiceModal
                    isOpen={true}
                    onClose={() => setShowAppearanceModal(false)}
                    targetName={companion.name}
                    jobTitle={companion.job === JobType.DEMON_GOD ? '마신' : (companion.job || '신의 사자')}
                    isDemonGod={companion.job === JobType.DEMON_GOD}
                    currentVisualUrl={companion.originalVisualUrl || companion.visualUrl || companion.defaultVisualUrl || ''}
                    newVisualUrl={getDivineOrDemonJobVisualUrl(companion.job, companion.gender)!}
                    onConfirm={(selectedVisual) => {
                        if (character && onUpdateCharacter) {
                            const newChar = JSON.parse(JSON.stringify(character)) as Character;
                            const activeIdx = newChar.companions.findIndex(c => c.id === companion.id);
                            const inactiveIdx = newChar.inactiveCompanions?.findIndex(c => c.id === companion.id) ?? -1;
                            const targetComp = activeIdx !== -1 ? newChar.companions[activeIdx] : (newChar.inactiveCompanions ? newChar.inactiveCompanions[inactiveIdx] : null);
                            if (targetComp) {
                                targetComp.visualUrl = selectedVisual;
                                targetComp.originalVisualUrl = targetComp.originalVisualUrl || companion.originalVisualUrl || companion.visualUrl || companion.defaultVisualUrl || '';
                            }
                            onUpdateCharacter(newChar, `[외형 변경] ${companion.name}의 외형이 변경되었습니다.`);
                        }
                        setShowAppearanceModal(false);
                    }}
                />
            )}

            {/* 전투 예상 분석 모달 */}
            {isCombatEstimateOpen && (
                <CombatEstimateModal 
                    character={character} 
                    onClose={() => setIsCombatEstimateOpen(false)} 
                />
            )}
        </div>
         </div>,
        document.body
    );
};
export default CompanionStatusModal;
