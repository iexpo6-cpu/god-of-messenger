import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Character, Companion, ItemRarity, MythicOptionType, ClassTier, Item, Stats, ActiveStatus, JobType, MilitaryRank, WantedRank, CombatStyle, WeaponType, BattleRole, SecondaryBattleRole } from '../types';
import { Shield, Sword, Zap, Brain, Activity, User, Users, Heart, BookOpen, Coins, Backpack, Info, Box, Trash2, DollarSign, UserMinus, UserPlus, Skull, Flame, Snowflake, Droplets, Mountain, Moon, Sun, Hammer, Wind, Eclipse, EyeOff, Link, Ghost, HelpCircle, MicOff, AlertCircle, Filter, LogOut, CheckCircle, BarChart2, Star, Target, Briefcase, GraduationCap, Medal, Award, Clock, X, Lock, Gavel, Award as TitleIcon, Play, Sparkles, ChevronRight, GitBranch, ArrowUpRight, Leaf, Scroll, HeartHandshake, Wrench, Edit2 } from 'lucide-react';
import { STAT_DESCRIPTIONS, SELL_PRICES, WEAPON_TYPE_KOREAN, SHINRYOKU_UI_CONFIG, INFAMY_CONFIG, MAX_PARTY_SIZE, COMBAT_STYLE_CONFIG } from '../constants';
import { calculateTotalStats, calculateItemPrice, getEnhancedStatValue, calculateFinalStats, calculateDerivedStats, getWeaponTypeFromItem, getYear, generateDefaultVisualUrl, calculateInventorySize, getBondBonus, getSpecialOptionDescription, getCombatStyleBonusPercent, getCombatStyleBonusDetails, calculateCombatPower, calculateItemCombatPowerContribution } from '../utils';
import { SECONDARY_ROLE_INFOS } from '../services/roleBonusService';
import { TITLES } from '../titles';
import DetailedStatsModal from './DetailedStatsModal';
import ConfirmModal from './ConfirmModal';
import { PromotionMasteryProgressBar } from './PromotionMasteryProgressBar';
import { getVisualUrlByJob } from '../services/visualManager';
import StatsModal from './StatsModal';
import EquipmentModal from './EquipmentModal';
import InventoryModal from './InventoryModal';
import CompanionModal from './CompanionModal';
import ShinryokuInfoModal from './ShinryokuInfoModal';
import RenameModal from './RenameModal';
import CombatPowerDetailModal from './CombatPowerDetailModal';
import { isRealTimeElixir } from '../services/elixirService';
import { useRealtimeElixirDuration } from '../hooks/useElixirTimer';
import { isMessengerJob } from '../messengerofgodvisual';

interface Props {
  character: Character;
  onOpenSkillBook: () => void;
  onOpenWeaponMastery: () => void;
  onOpenProfessionMastery: () => void;
  onIncreaseStat: (statKey: string, label: string, amount: number) => void;
  onUseItem: (item: Item, index: number | number[]) => void;
  onUnequipItem: (slot: string) => void;
  onSellItem: (item: Item, index: number | number[], isAll?: boolean) => void; 
  onDiscardItem: (item: Item, index: number | number[]) => void;
  onSelectCompanion: (index: number) => void;
  inactiveCompanions?: Companion[];
  onRejoinCompanion?: (index: number) => void;
  onPermanentlyDismissCompanion?: (index: number) => void;
  onEquipItem?: (itemIndex: number) => void; 
  onToggleItemLock?: (itemIndex: number | number[]) => void;
  onToggleItemFavorite?: (itemIndex: number | number[]) => void;
  onAutoSellItems?: (maxRarity: ItemRarity, categories: string[]) => void;
  onToggleFavoriteCompanion?: (companionId: string) => void;
  onDismissCompanion?: (index: number) => void;
  onPartWaysCompanion?: (id: string, mode: 'temporary' | 'permanent') => void;
  onUpdateCharacter?: (character: Character) => void;
  onOpenSocial?: () => void;
  onOpenChronicles?: () => void;
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

import { getItemImage as getRpgItemImage } from '../services/rpgIconService';

// [HELPER] Get Item Image with dynamic RPG artwork placeholder
export const getItemImage = (item: Item) => getRpgItemImage(item);

// Item Tooltip Component - Improved Visibility with Portal & Comparison
export const ItemTooltip: React.FC<{ item: Item; character?: Character }> = ({ item, character }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;

    // Use closest card container if parent is an inner wrapper
    const targetElement = parent.closest('.group') || parent;

    const handleMouseEnter = () => {
      const rect = targetElement.getBoundingClientRect();
      let x = rect.left;
      let y = rect.bottom + 5;

      if (x + 310 > window.innerWidth) x = Math.max(10, window.innerWidth - 320);
      if (y + 420 > window.innerHeight) y = Math.max(10, rect.top - 425);
      if (x < 10) x = 10;
      if (y < 10) y = 10;

      setPosition({ x, y });
      setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);

    targetElement.addEventListener('mouseenter', handleMouseEnter);
    targetElement.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      targetElement.removeEventListener('mouseenter', handleMouseEnter);
      targetElement.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [item]);

  if (!isVisible) return <div ref={ref} className="hidden" />;

  const price = calculateItemPrice(item);

  const getEquippedItemForSlot = (targetItem: Item, eq?: Record<string, Item | undefined>): Item | null => {
    if (!eq) return null;
    const type = targetItem.type;
    if (['무기', 'Weapon'].includes(type)) return eq.weapon || null;
    if (['보조무기', 'SubWeapon'].includes(type)) return eq.subWeapon || null;
    if (['머리', 'Head', '투구', '모자'].includes(type)) return eq.head || null;
    if (['상의/하의', 'Body', '갑옷', '상의', '하의'].includes(type)) return eq.body || null;
    if (['장갑', 'Hand'].includes(type)) return eq.hand || null;
    if (['신발', 'Feet'].includes(type)) return eq.feet || null;
    if (['장신구', 'Accessory', '반지', '목걸이'].includes(type)) return eq.accessory || null;
    return null;
  };

  const equippedItem = getEquippedItemForSlot(item, character?.equipment);
  const isEquippedSlot = ['Weapon', 'SubWeapon', 'Head', 'Body', 'Feet', 'Hand', 'Accessory', '무기', '보조무기', '투구', '모자', '갑옷', '상의', '하의', '장갑', '신발', '장신구', '반지', '목걸이'].includes(item.type);
  const isCurrentlyEquipped = equippedItem && (equippedItem === item || (equippedItem.name === item.name && equippedItem.enhancement === item.enhancement && equippedItem.rarity === item.rarity));

  const getAccurateImpact = (targetItem: Item) => {
    if (!character) return null;
    
    const getWeaponInfo = (eq: any) => {
      if (!eq.weapon) return undefined;
      const wType = getWeaponTypeFromItem(eq.weapon);
      if (!wType) return undefined;
      return { level: character.weaponMastery?.[wType]?.level || 0, type: wType };
    };

    const currentFinal = calculateFinalStats(character).finalStats;
    const currentDerived = calculateDerivedStats(
      currentFinal,
      character.statusEffects || [],
      getWeaponInfo(character.equipment),
      undefined,
      false,
      character.skills || [],
      character.equipment,
      character.shinryokuType,
      undefined,
      getBondBonus(character),
      character.base?.elementalDamageBoosts,
      character.base?.elementalResistanceBoosts
    );

    const type = targetItem.type;
    const newEquipment = { ...character.equipment };
    if (['무기', 'Weapon'].includes(type)) newEquipment.weapon = targetItem;
    else if (['보조무기', 'SubWeapon'].includes(type)) newEquipment.subWeapon = targetItem;
    else if (['머리', 'Head', '투구', '모자'].includes(type)) newEquipment.head = targetItem;
    else if (['상의/하의', 'Body', '갑옷', '상의', '하의'].includes(type)) newEquipment.body = targetItem;
    else if (['장갑', 'Hand'].includes(type)) newEquipment.hand = targetItem;
    else if (['신발', 'Feet'].includes(type)) newEquipment.feet = targetItem;
    else if (['장신구', 'Accessory', '반지', '목걸이'].includes(type)) newEquipment.accessory = targetItem;

    const newChar = { ...character, equipment: newEquipment };
    const newFinal = calculateFinalStats(newChar).finalStats;
    const newDerived = calculateDerivedStats(
      newFinal,
      character.statusEffects || [],
      getWeaponInfo(newEquipment),
      undefined,
      false,
      character.skills || [],
      newEquipment,
      character.shinryokuType,
      undefined,
      getBondBonus(character),
      character.base?.elementalDamageBoosts,
      character.base?.elementalResistanceBoosts
    );

    return {
      pAtk: newDerived.pAtk,
      mAtk: newDerived.mAtk,
      pDef: newDerived.pDef,
      mDef: newDerived.mDef,
      crit: newDerived.critChance,
      diffPAtk: newDerived.pAtk - currentDerived.pAtk,
      diffMAtk: newDerived.mAtk - currentDerived.mAtk,
      diffPDef: newDerived.pDef - currentDerived.pDef,
      diffMDef: newDerived.mDef - currentDerived.mDef,
      diffCrit: newDerived.critChance - currentDerived.critChance
    };
  };

  const accurateImpact = getAccurateImpact(item);

  const getStatsIncrease = (targetItem: Item) => {
    if (!targetItem.stats) return { pAtkInc: 0, mAtkInc: 0, pDefInc: 0, mDefInc: 0, critInc: 0 };
    let pAtkInc = 0;
    let mAtkInc = 0;
    let pDefInc = 0;
    let mDefInc = 0;
    let critInc = 0;

    Object.entries(targetItem.stats).forEach(([key, val]) => {
      const numVal = Number(val);
      const enhancedVal = getEnhancedStatValue(numVal, targetItem.enhancement, key);
      if (key === 'str') pAtkInc += enhancedVal * 1.0;
      if (key === 'agi') { pAtkInc += enhancedVal * 0.3; critInc += enhancedVal * 0.1; }
      if (key === 'int') mAtkInc += enhancedVal * 1.3;
      if (key === 'wis') { mAtkInc += enhancedVal * 0.2; mDefInc += enhancedVal * 0.4; }
      if (key === 'def') { pDefInc += enhancedVal * 0.8; mDefInc += enhancedVal * 0.4; }
      if (key === 'ctrl') critInc += enhancedVal * 0.1;
    });

    return { pAtkInc, mAtkInc, pDefInc, mDefInc, critInc };
  };

  const impact = accurateImpact ? {
    pAtkInc: accurateImpact.pAtk,
    mAtkInc: accurateImpact.mAtk,
    pDefInc: accurateImpact.pDef,
    mDefInc: accurateImpact.mDef,
    critInc: accurateImpact.crit
  } : getStatsIncrease(item);

  const diffPAtk = accurateImpact ? accurateImpact.diffPAtk : 0;
  const diffMAtk = accurateImpact ? accurateImpact.diffMAtk : 0;
  const diffPDef = accurateImpact ? accurateImpact.diffPDef : 0;
  const diffMDef = accurateImpact ? accurateImpact.diffMDef : 0;
  const diffCrit = accurateImpact ? accurateImpact.diffCrit : 0;

  const cpInfo = calculateItemCombatPowerContribution(item, character);

  const uiConfig = item.elementalType ? (SHINRYOKU_UI_CONFIG[item.elementalType] || SHINRYOKU_UI_CONFIG.default) : null;

  const tooltipContent = (
    <div 
      style={{ 
        position: 'fixed', 
        left: position.x, 
        top: position.y, 
        zIndex: 9999,
        pointerEvents: 'none' 
      }}
      className="w-72 bg-slate-950 border border-slate-600 rounded-xl p-3 shadow-2xl animate-in fade-in zoom-in-95 text-slate-200"
    >
      <div className="flex gap-3 border-b border-slate-800 pb-2 mb-2">
        <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-700 flex-shrink-0 overflow-hidden relative">
          <img src={getItemImage(item)} alt="" className="w-full h-full object-cover" />
          {isCurrentlyEquipped && (
            <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-[7px] font-black px-1 rounded-bl">
              착용중
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className={`font-bold text-xs sm:text-sm truncate block ${RARITY_COLORS[item.rarity] ? RARITY_COLORS[item.rarity].split(' ')[0] : 'text-slate-400'}`}>
              {item.name || (item as any).item || '알 수 없는 아이템'} {item.enhancement ? `+${item.enhancement}` : ''}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 flex-wrap">
            <span className="font-mono">{item.rarity}</span>
            <span>|</span>
            <span>{item.type}</span>
            {item.weaponType && <span className="text-amber-400">({WEAPON_TYPE_KOREAN[item.weaponType] || item.weaponType})</span>}
          </div>
          {cpInfo.itemCP > 0 && (
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300 flex items-center gap-1 shadow-sm">
                <Zap size={10} className="fill-amber-400 text-amber-400" />
                {cpInfo.itemCP.toLocaleString()} CP
              </span>
              {cpInfo.isEquipped && cpInfo.contributionCP !== undefined && cpInfo.contributionCP > 0 && (
                <span className="text-[9px] font-bold text-emerald-400 font-mono">
                  (기여 +{cpInfo.contributionCP.toLocaleString()})
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {item.elementalType && uiConfig && (
            <span className={`text-[10px] h-fit ${uiConfig.text} ${uiConfig.bg} px-1.5 py-0.5 rounded border ${uiConfig.border} font-bold shadow-sm ${uiConfig.glow}`}>
              {item.elementalType}
            </span>
          )}
          {item.divineLevel && item.divineLevel > 0 && (
            <div className="relative flex items-center justify-center">
              <Star size={24} className={`${uiConfig?.text || 'text-amber-400'} fill-current opacity-80`} />
              <span className="absolute text-[10px] font-bold text-slate-900 drop-shadow-sm">{item.divineLevel}</span>
            </div>
          )}
        </div>
      </div>
      
      {item.description && (
        <p className="text-xs text-slate-300 italic mb-2.5 opacity-80 leading-relaxed">"{item.description}"</p>
      )}
      
      {item.stats && Object.keys(item.stats).length > 0 && (
        <div className="bg-slate-900/50 p-2 rounded-lg mb-2 border border-slate-800">
          <div className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-tight">아이템 부여 능력치</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {Object.entries(item.stats).map(([key, val]) => {
              const enhancedVal = getEnhancedStatValue(Number(val), item.enhancement, key);
              const bonus = enhancedVal - Number(val);
              return (
                <div key={key} className="text-xs text-slate-300 flex justify-between items-center">
                  <span className="uppercase font-mono text-[11px] text-slate-400">{key}</span>
                  <div className="flex items-center">
                    <span className="font-bold font-mono">{enhancedVal}</span>
                    {bonus > 0 && <span className="text-[9px] text-green-400 ml-1 font-mono">(+{bonus})</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Equipment Comparison Block */}
      {isEquippedSlot && equippedItem && !isCurrentlyEquipped && (
        <div className="bg-slate-900/90 p-2.5 rounded-lg mb-2 border border-amber-500/30 shadow-md">
          <div className="text-[10px] text-amber-400 font-bold mb-1 uppercase flex items-center justify-between">
            <span className="flex items-center gap-1"><Shield size={11} className="text-amber-400" /> 착용 중인 장비 비교</span>
            <span className="text-[9px] text-slate-400 font-mono">VS 현 장착</span>
          </div>
          
          <div className="flex items-center justify-between text-xs bg-slate-950 px-2 py-1 rounded border border-slate-800 mb-1.5">
            <span className="font-bold text-amber-200 truncate max-w-[170px]">
              {equippedItem.name} {equippedItem.enhancement ? `+${equippedItem.enhancement}` : ''}
            </span>
            <span className="text-[9px] font-mono text-slate-400">
              {equippedItem.rarity}
            </span>
          </div>

          {/* COMBAT POWER COMPARISON ROW */}
          {cpInfo.diffCP !== undefined && (
            <div className="flex items-center justify-between bg-slate-950 px-2 py-1.5 rounded border border-amber-500/40 mb-2">
              <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                <Zap size={11} className="text-amber-400 fill-amber-400 animate-pulse" />
                전투력 변동
              </span>
              <span className={`font-mono font-bold text-[11px] ${cpInfo.diffCP > 0 ? 'text-emerald-400' : cpInfo.diffCP < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                {cpInfo.diffCP > 0 ? `+${cpInfo.diffCP.toLocaleString()} CP ▲` : cpInfo.diffCP < 0 ? `${cpInfo.diffCP.toLocaleString()} CP ▼` : '0 CP (변동 없음)'}
              </span>
            </div>
          )}

          {accurateImpact && (
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
              <div className="flex justify-between items-center text-slate-300">
                <span>물리공격력</span>
                <span className={`font-mono font-bold ${diffPAtk > 0 ? 'text-emerald-400' : diffPAtk < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                  {diffPAtk > 0 ? `+${diffPAtk.toFixed(1)} ▲` : diffPAtk < 0 ? `${diffPAtk.toFixed(1)} ▼` : '0'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>마법공격력</span>
                <span className={`font-mono font-bold ${diffMAtk > 0 ? 'text-emerald-400' : diffMAtk < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                  {diffMAtk > 0 ? `+${diffMAtk.toFixed(1)} ▲` : diffMAtk < 0 ? `${diffMAtk.toFixed(1)} ▼` : '0'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>물리방어력</span>
                <span className={`font-mono font-bold ${diffPDef > 0 ? 'text-emerald-400' : diffPDef < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                  {diffPDef > 0 ? `+${diffPDef.toFixed(1)} ▲` : diffPDef < 0 ? `${diffPDef.toFixed(1)} ▼` : '0'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>마법방어력</span>
                <span className={`font-mono font-bold ${diffMDef > 0 ? 'text-emerald-400' : diffMDef < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                  {diffMDef > 0 ? `+${diffMDef.toFixed(1)} ▲` : diffMDef < 0 ? `${diffMDef.toFixed(1)} ▼` : '0'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300 col-span-2">
                <span>치명타율</span>
                <span className={`font-mono font-bold ${diffCrit > 0 ? 'text-emerald-400' : diffCrit < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                  {diffCrit > 0 ? `+${diffCrit.toFixed(1)}% ▲` : diffCrit < 0 ? `${diffCrit.toFixed(1)}% ▼` : '0%'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Basic spec measurement if no comparative equipped item */}
      {(!equippedItem || isCurrentlyEquipped) && impact && (impact.pAtkInc > 0 || impact.mAtkInc > 0 || impact.pDefInc > 0 || (cpInfo.diffCP !== undefined && cpInfo.diffCP !== 0) || (cpInfo.contributionCP !== undefined && cpInfo.contributionCP > 0)) && (
        <div className="bg-slate-900/50 p-2 rounded-lg mb-2 border border-slate-800">
          <div className="text-[10px] text-slate-400 font-bold mb-1 uppercase flex items-center"><Activity size={10} className="mr-1"/>스펙 측정</div>
          
          {/* Un-equipped item equipping CP boost */}
          {!equippedItem && isEquippedSlot && character && cpInfo.diffCP !== undefined && cpInfo.diffCP !== 0 && (
            <div className="flex justify-between items-center bg-slate-950/80 px-2 py-1 rounded border border-emerald-500/40 mb-1.5">
              <span className="text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                <Zap size={11} className="fill-emerald-400 text-emerald-400" /> 착용 시 전투력 상승
              </span>
              <span className="font-bold text-emerald-400 font-mono text-xs">+{cpInfo.diffCP.toLocaleString()} CP ▲</span>
            </div>
          )}

          {/* Currently equipped item contribution CP */}
          {isCurrentlyEquipped && cpInfo.contributionCP !== undefined && cpInfo.contributionCP > 0 && (
            <div className="flex justify-between items-center bg-slate-950/80 px-2 py-1 rounded border border-indigo-500/40 mb-1.5">
              <span className="text-indigo-300 font-bold text-[10px] flex items-center gap-1">
                <Zap size={11} className="fill-indigo-400 text-indigo-400" /> 현재 장비 기여 전투력
              </span>
              <span className="font-bold text-indigo-300 font-mono text-xs">+{cpInfo.contributionCP.toLocaleString()} CP</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
            {accurateImpact ? (
              <>
                {diffPAtk !== 0 && (
                  <div className="flex justify-between text-red-300">
                    <span>물리공격력</span>
                    <span className={`font-bold ${diffPAtk > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {diffPAtk > 0 ? '+' : ''}{diffPAtk.toFixed(1)}
                    </span>
                  </div>
                )}
                {diffMAtk !== 0 && (
                  <div className="flex justify-between text-purple-300">
                    <span>마법공격력</span>
                    <span className={`font-bold ${diffMAtk > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {diffMAtk > 0 ? '+' : ''}{diffMAtk.toFixed(1)}
                    </span>
                  </div>
                )}
                {diffPDef !== 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>물리방어력</span>
                    <span className={`font-bold ${diffPDef > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {diffPDef > 0 ? '+' : ''}{diffPDef.toFixed(1)}
                    </span>
                  </div>
                )}
                {diffMDef !== 0 && (
                  <div className="flex justify-between text-blue-300">
                    <span>마법방어력</span>
                    <span className={`font-bold ${diffMDef > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {diffMDef > 0 ? '+' : ''}{diffMDef.toFixed(1)}
                    </span>
                  </div>
                )}
                {diffCrit !== 0 && (
                  <div className="flex justify-between text-yellow-300">
                    <span>치명타율</span>
                    <span className={`font-bold ${diffCrit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {diffCrit > 0 ? '+' : ''}{diffCrit.toFixed(1)}%
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                {impact.pAtkInc > 0 && (
                  <div className="flex justify-between text-red-300">
                    <span>물리공격력</span>
                    <span>+{impact.pAtkInc.toFixed(1)}</span>
                  </div>
                )}
                {impact.mAtkInc > 0 && (
                  <div className="flex justify-between text-purple-300">
                    <span>마법공격력</span>
                    <span>+{impact.mAtkInc.toFixed(1)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {item.mythicOption && (
        <div className="mt-2 p-2 bg-amber-950/30 border border-amber-500/30 rounded-lg">
          <div className="text-[10px] text-amber-500 font-black mb-1 uppercase flex items-center">
            <Star size={10} className="mr-1 fill-current"/> 신화 특별 옵션
          </div>
          <div className="text-xs text-amber-200 font-bold">{item.mythicOption}</div>
        </div>
      )}

      {item.secondaryOptions && item.secondaryOptions.length > 0 && (
        <div className="bg-indigo-900/20 p-2 rounded-lg mb-2 border border-indigo-500/30">
          <div className="text-[10px] text-indigo-400 font-bold mb-1 uppercase flex items-center"><Star size={10} className="mr-1"/>추가 옵션</div>
          <ul className="list-disc list-inside space-y-0.5">
            {item.secondaryOptions.map((opt, idx) => (
              <li key={idx} className="text-[10px] text-indigo-200">{opt}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end items-center text-[10px] text-slate-500 border-t border-slate-800 pt-1 mt-1">
        <span>판매가: {price.toLocaleString()} G</span>
      </div>
    </div>
  );

  return (
    <>
      <div ref={ref} className="hidden" />
      {createPortal(tooltipContent, document.body)}
    </>
  );
};

/**
 * 실시간 영약 남은 시간 전용 렌더링 컴포넌트
 * - StatusBadge 본체의 훅 개수와 완전 격리되어 훅 불일치 오류를 100% 방지합니다.
 * - 매초 독립적으로 실시간 남은 초를 구독하여 부드럽게 카운트다운을 표시합니다.
 */
export const ElixirDurationText: React.FC<{ status: ActiveStatus; entityId?: string }> = ({ status, entityId = 'player' }) => {
  const realtimeSecs = useRealtimeElixirDuration(entityId, status);
  if (realtimeSecs <= 0) return null;
  const mins = Math.floor(realtimeSecs / 60);
  const secs = realtimeSecs % 60;
  return <span>({mins}분{secs > 0 ? ` ${secs}초` : ''})</span>;
};

export const StatusBadge: React.FC<{ status: ActiveStatus }> = ({ status }) => {
  const [showDetail, setShowDetail] = useState(false);

  if (!status || !status.name || status.name === 'None') return null;

  // 시스템 내부의 단순 '휴식', '완전 회복', '수면', '잠' 상태만 숨기고, 여관 버프(일반 휴식, 상급 휴식, 귀빈 휴식 등)는 온전히 표시
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
          {isElixir ? <ElixirDurationText status={status} entityId="player" /> : durationDisplay}
        </span>
        {isDiminished && (
          <span className="px-1 py-0.2 bg-amber-600 text-white text-[7px] rounded font-bold leading-none">
            반감
          </span>
        )}
      </button>

      {showDetail && (
        <div 
          className={`absolute top-full left-0 mt-1 w-48 p-2 bg-black/95 border ${isDiminished ? 'border-amber-500' : 'border-amber-500/50'} rounded text-slate-200 text-xs shadow-xl animate-in fade-in zoom-in-95 z-[100]`}
          onClick={(e) => { e.stopPropagation(); setShowDetail(false); }}
        >
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

export const HealthBar = ({ current, max, color = 'bg-red-600', shield = 0 }: { current: number, max: number, color?: string, shield?: number }) => {
  const safeMax = max > 0 ? max : 100;
  const safeCurrent = isNaN(current) ? 0 : Math.max(0, current);
  const percent = Math.max(0, Math.min(100, (safeCurrent / safeMax) * 100));
  const shieldPercent = Math.max(0, Math.min(100, (shield / safeMax) * 100));
  
  return (
    <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative shadow-inner">
      <div className={`h-full ${color} transition-all duration-300 ease-out`} style={{ width: `${percent}%` }}></div>
      {shield > 0 && (
        <div 
          className="h-full bg-slate-400 transition-all duration-300 ease-out absolute top-0 left-0 opacity-80 border-r border-slate-200" 
          style={{ width: `${shieldPercent}%` }}
        ></div>
      )}
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)] leading-none z-10">
        {Math.floor(safeCurrent).toLocaleString()} {shield > 0 ? `(+${Math.floor(shield).toLocaleString()})` : ''} / {safeMax.toLocaleString()}
      </span>
    </div>
  );
};

const CharacterSheet: React.FC<Props> = ({ 
  character, 
  onOpenSkillBook, 
  onOpenWeaponMastery, 
  onOpenProfessionMastery, 
  onIncreaseStat, 
  onUseItem, 
  onUnequipItem, 
  onSellItem, 
  onDiscardItem, 
  onSelectCompanion, 
  inactiveCompanions = [], 
  onRejoinCompanion, 
  onPermanentlyDismissCompanion, 
  onEquipItem,
  onToggleItemLock,
  onToggleItemFavorite,
  onAutoSellItems,
  onToggleFavoriteCompanion,
  onDismissCompanion,
  onPartWaysCompanion,
  onUpdateCharacter,
  onOpenSocial,
  onOpenChronicles
}) => {
  // Dedicated Modal State: 'stats' | 'equip' | 'inventory' | 'companion' | null
  const [activeModal, setActiveModal] = useState<'stats' | 'equip' | 'inventory' | 'companion' | null>(null);

  // 독립 멀티 윈도우 모달 활성화 상태 (스탯, 장착장비, 인벤토리, 동료 관리)
  const [showStats, setShowStats] = useState(false);
  const [showEquip, setShowEquip] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showCompanion, setShowCompanion] = useState(false);

  useEffect(() => {
    if (activeModal === 'stats') {
      setShowStats(true);
      setActiveModal(null);
    } else if (activeModal === 'equip') {
      setShowEquip(true);
      setActiveModal(null);
    } else if (activeModal === 'inventory') {
      setShowInventory(true);
      setActiveModal(null);
    } else if (activeModal === 'companion') {
      setShowCompanion(true);
      setActiveModal(null);
    }
  }, [activeModal]);
  const [showCombatStyleModal, setShowCombatStyleModal] = useState(false);
  const [showShinryokuModal, setShowShinryokuModal] = useState(false);
  const [showPotentialModal, setShowPotentialModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showCpDetailModal, setShowCpDetailModal] = useState(false);
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{item: Item, indices: number[], type: 'sell' | 'discard', isAll?: boolean} | null>(null);

  const { finalStats, buffBonus, equipPercentBonus, mountBonus, combatStyleBonus } = useMemo(() => {
    return calculateFinalStats(character);
  }, [character]);

  const { bonus: equipBonus } = useMemo(() => {
    return calculateTotalStats(character);
  }, [character]);

  const combatPower = useMemo(() => {
    return calculateCombatPower(character);
  }, [character]);

  const displayedHp = character.stats.hp;
  const displayedMp = character.stats.mp;
  const currentYear = getYear(character.currentDate || '2000-01-01');
  const finalPlayerVisualUrl = character.visualUrl;

  // Shinryoku Color Theme & Styling Config based on SHINRYOKU_UI_CONFIG
  const getShinryokuTheme = (type: string = '미개방') => {
    const baseConfig = SHINRYOKU_UI_CONFIG[type] || SHINRYOKU_UI_CONFIG['default'];
    switch (type) {
      case '태양계':
        return {
          ...baseConfig,
          nameColor: 'text-amber-400',
          headerGrad: 'from-orange-950/40 via-slate-950 to-slate-950',
          topBar: 'from-amber-600 via-orange-500 to-amber-600',
          avatarBorder: 'border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.3)]',
          badgeBg: 'bg-gradient-to-r from-orange-950/90 to-amber-950/90 text-orange-300 border-orange-500/60 shadow-[0_0_10px_rgba(249,115,22,0.2)]',
          icon: Sun,
        };
      case '월광계':
        return {
          ...baseConfig,
          nameColor: 'text-indigo-300',
          headerGrad: 'from-indigo-950/40 via-slate-950 to-slate-950',
          topBar: 'from-indigo-600 via-purple-500 to-indigo-600',
          avatarBorder: 'border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.3)]',
          badgeBg: 'bg-gradient-to-r from-indigo-950/90 to-purple-950/90 text-indigo-200 border-indigo-500/60 shadow-[0_0_10px_rgba(99,102,241,0.2)]',
          icon: Moon,
        };
      case '광휘계':
        return {
          ...baseConfig,
          nameColor: 'text-yellow-200',
          headerGrad: 'from-yellow-950/30 via-slate-950 to-slate-950',
          topBar: 'from-yellow-400 via-amber-300 to-yellow-400',
          avatarBorder: 'border-yellow-400/60 shadow-[0_0_15px_rgba(250,204,21,0.3)]',
          badgeBg: 'bg-gradient-to-r from-yellow-950/90 to-amber-950/90 text-yellow-100 border-yellow-400/60 shadow-[0_0_10px_rgba(250,204,21,0.2)]',
          icon: Sparkles,
        };
      case '화염계':
        return {
          ...baseConfig,
          nameColor: 'text-red-400',
          headerGrad: 'from-red-950/40 via-slate-950 to-slate-950',
          topBar: 'from-red-600 via-rose-500 to-red-600',
          avatarBorder: 'border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.3)]',
          badgeBg: 'bg-gradient-to-r from-red-950/90 to-rose-950/90 text-red-300 border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
          icon: Flame,
        };
      case '빙결계':
        return {
          ...baseConfig,
          nameColor: 'text-cyan-300',
          headerGrad: 'from-cyan-950/40 via-slate-950 to-slate-950',
          topBar: 'from-cyan-500 via-sky-400 to-cyan-500',
          avatarBorder: 'border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.3)]',
          badgeBg: 'bg-gradient-to-r from-cyan-950/90 to-sky-950/90 text-cyan-200 border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]',
          icon: Snowflake,
        };
      case '전격계':
        return {
          ...baseConfig,
          nameColor: 'text-yellow-400',
          headerGrad: 'from-yellow-950/30 via-slate-950 to-slate-950',
          topBar: 'from-yellow-500 via-amber-400 to-yellow-500',
          avatarBorder: 'border-yellow-500/60 shadow-[0_0_15px_rgba(234,179,8,0.3)]',
          badgeBg: 'bg-gradient-to-r from-yellow-950/90 to-amber-950/90 text-yellow-300 border-yellow-500/60 shadow-[0_0_10px_rgba(234,179,8,0.2)]',
          icon: Zap,
        };
      case '초화계':
        return {
          ...baseConfig,
          nameColor: 'text-lime-400',
          headerGrad: 'from-green-950/40 via-slate-950 to-slate-950',
          topBar: 'from-green-600 via-emerald-500 to-green-600',
          avatarBorder: 'border-green-500/60 shadow-[0_0_15px_rgba(34,197,94,0.3)]',
          badgeBg: 'bg-gradient-to-r from-green-950/90 to-emerald-950/90 text-green-300 border-green-500/60 shadow-[0_0_10px_rgba(34,197,94,0.2)]',
          icon: Leaf,
        };
      case '질풍계':
        return {
          ...baseConfig,
          nameColor: 'text-emerald-300',
          headerGrad: 'from-emerald-950/40 via-slate-950 to-slate-950',
          topBar: 'from-emerald-500 via-teal-400 to-emerald-500',
          avatarBorder: 'border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.3)]',
          badgeBg: 'bg-gradient-to-r from-emerald-950/90 to-teal-950/90 text-emerald-200 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
          icon: Wind,
        };
      case '대지계':
        return {
          ...baseConfig,
          nameColor: 'text-amber-500',
          headerGrad: 'from-amber-950/40 via-slate-950 to-slate-950',
          topBar: 'from-amber-700 via-yellow-600 to-amber-700',
          avatarBorder: 'border-amber-700/60 shadow-[0_0_15px_rgba(217,119,6,0.3)]',
          badgeBg: 'bg-gradient-to-r from-amber-950/90 to-stone-950/90 text-amber-400 border-amber-700/60 shadow-[0_0_10px_rgba(217,119,6,0.2)]',
          icon: Mountain,
        };
      case '암흑계':
        return {
          ...baseConfig,
          nameColor: 'text-purple-400',
          headerGrad: 'from-purple-950/40 via-slate-950 to-slate-950',
          topBar: 'from-purple-700 via-indigo-600 to-purple-700',
          avatarBorder: 'border-purple-600/60 shadow-[0_0_15px_rgba(168,85,247,0.3)]',
          badgeBg: 'bg-gradient-to-r from-purple-950/90 to-slate-950/90 text-purple-300 border-purple-600/60 shadow-[0_0_10px_rgba(168,85,247,0.2)]',
          icon: Eclipse,
        };
      case '해수계':
        return {
          ...baseConfig,
          nameColor: 'text-blue-400',
          headerGrad: 'from-blue-950/40 via-slate-950 to-slate-950',
          topBar: 'from-blue-600 via-sky-500 to-blue-600',
          avatarBorder: 'border-blue-600/60 shadow-[0_0_15px_rgba(59,130,246,0.3)]',
          badgeBg: 'bg-gradient-to-r from-blue-950/90 to-sky-950/90 text-blue-300 border-blue-600/60 shadow-[0_0_10px_rgba(59,130,246,0.2)]',
          icon: Droplets,
        };
      case '무기강화계':
        return {
          ...baseConfig,
          nameColor: 'text-slate-300',
          headerGrad: 'from-slate-900/40 via-slate-950 to-slate-950',
          topBar: 'from-slate-600 via-slate-400 to-slate-600',
          avatarBorder: 'border-slate-500/60 shadow-[0_0_15px_rgba(148,163,184,0.2)]',
          badgeBg: 'bg-gradient-to-r from-slate-900/90 to-slate-800/90 text-slate-200 border-slate-600/60 shadow-[0_0_10px_rgba(148,163,184,0.1)]',
          icon: Hammer,
        };
      case '신체강화계':
        return {
          ...baseConfig,
          nameColor: 'text-rose-400',
          headerGrad: 'from-rose-950/40 via-slate-950 to-slate-950',
          topBar: 'from-rose-600 via-red-500 to-rose-600',
          avatarBorder: 'border-rose-600/60 shadow-[0_0_15px_rgba(244,63,94,0.3)]',
          badgeBg: 'bg-gradient-to-r from-rose-950/90 to-red-950/90 text-rose-300 border-rose-600/60 shadow-[0_0_10px_rgba(244,63,94,0.2)]',
          icon: Activity,
        };
      case '강철계':
        return {
          ...baseConfig,
          nameColor: 'text-zinc-300',
          headerGrad: 'from-zinc-900/40 via-slate-950 to-slate-950',
          topBar: 'from-zinc-500 via-slate-400 to-zinc-500',
          avatarBorder: 'border-zinc-500/60 shadow-[0_0_15px_rgba(161,161,170,0.2)]',
          badgeBg: 'bg-gradient-to-r from-zinc-900/90 to-stone-900/90 text-zinc-200 border-zinc-600/60 shadow-[0_0_10px_rgba(161,161,170,0.1)]',
          icon: Shield,
        };
      default:
        return {
          ...baseConfig,
          nameColor: 'text-amber-400',
          headerGrad: 'from-slate-950 via-slate-950 to-slate-950',
          topBar: 'from-amber-600 via-orange-500 to-amber-600',
          avatarBorder: 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
          badgeBg: 'bg-slate-900 text-slate-400 border-slate-800',
          icon: HelpCircle,
        };
    }
  };

  const shinryokuTheme = getShinryokuTheme(character.shinryokuType);

  // Class title & color
  let currentClassLabel = "퍼스트 클래스";
  let currentClassName = character.firstClassName || character.classType || "모험가";
  let tierColor = "text-amber-400";
  let tierBadgeBg = "bg-amber-950/50 border-amber-500/40";

  if (character.classTier === ClassTier.FINAL) {
    currentClassLabel = "파이널 클래스";
    currentClassName = character.finalClassName || character.lastClassName || character.secondClassName || character.firstClassName || character.classType || "미정";
    tierColor = "text-rose-400";
    tierBadgeBg = "bg-rose-950/50 border-rose-500/40";
  } else if (character.classTier === ClassTier.LAST) {
    currentClassLabel = "라스트 클래스";
    currentClassName = character.lastClassName || character.secondClassName || character.firstClassName || character.classType || "미정";
    tierColor = "text-purple-400";
    tierBadgeBg = "bg-purple-950/50 border-purple-500/40";
  } else if (character.classTier === ClassTier.SECOND) {
    currentClassLabel = "세컨드 클래스";
    currentClassName = character.secondClassName || character.firstClassName || character.classType || "미정";
    tierColor = "text-cyan-400";
    tierBadgeBg = "bg-cyan-950/50 border-cyan-500/40";
  } else if (character.classTier === ClassTier.FIRST) {
    currentClassLabel = "퍼스트 클래스";
    currentClassName = character.firstClassName || character.classType || "모험가";
    tierColor = "text-amber-400";
    tierBadgeBg = "bg-amber-950/50 border-amber-500/40";
  } else {
    currentClassLabel = "미해방";
    currentClassName = character.firstClassName || character.classType || "모험가";
    tierColor = "text-slate-400";
    tierBadgeBg = "bg-slate-900 border-slate-700";
  }

  // Job Display Helper
  const getJobDisplayInfo = () => {
    if (character.job === JobType.STUDENT && character.schoolData) {
      return { label: `${character.schoolData.schoolName} (${character.schoolData.grade}학년)`, icon: GraduationCap, color: 'text-cyan-400' };
    }
    if (character.job === JobType.MERCENARY && character.mercenaryData) {
      return { label: `${character.mercenaryData.rank}급 용병`, icon: Sword, color: 'text-red-400' };
    }
    if (character.job === JobType.SOLDIER) {
      return { label: `${character.militaryRank || MilitaryRank.PVT} (군인)`, icon: Medal, color: 'text-slate-300' };
    }
    if (character.job === JobType.BLACKSMITH) {
      return { label: '대장장이', icon: Hammer, color: 'text-orange-400' };
    }
    if (character.job === JobType.SLAVE) {
      return { label: '노예', icon: Lock, color: 'text-red-500' };
    }
    return { label: character.job === JobType.UNEMPLOYED ? '무직' : character.job, icon: Briefcase, color: 'text-slate-500' };
  };

  const jobInfo = getJobDisplayInfo();

  // Infamy
  const getInfamyStage = (val: number = 0) => {
    const { STAGES } = INFAMY_CONFIG;
    if (val >= STAGES.CALAMITY.threshold) return STAGES.CALAMITY;
    if (val >= STAGES.DISASTER.threshold) return STAGES.DISASTER;
    if (val >= STAGES.WANTED.threshold) return STAGES.WANTED;
    if (val >= STAGES.CRIMINAL.threshold) return STAGES.CRIMINAL;
    if (val >= STAGES.SUSPECT.threshold) return STAGES.SUSPECT;
    return STAGES.NONE;
  };

  const infamyStage = getInfamyStage(character.infamy || 0);
  const isWanted = infamyStage.rank !== WantedRank.NONE;
  const equippedTitle = character.equippedTitleId ? TITLES[character.equippedTitleId] : null;

  // Derived stats for quick matrix overview
  const activeMasteryInfo = useMemo((): { level: number, type: WeaponType } | undefined => {
    if (character.equipment?.weapon) {
      const wType = getWeaponTypeFromItem(character.equipment.weapon);
      if (wType && character.weaponMastery?.[wType]) {
        return { level: character.weaponMastery[wType]!.level, type: wType };
      }
    }
    return undefined;
  }, [character.equipment?.weapon, character.weaponMastery]);

  const derived = useMemo(() => {
    return calculateDerivedStats(
      finalStats,
      character.statusEffects || [],
      activeMasteryInfo,
      undefined,
      false,
      character.skills || [],
      character.equipment,
      character.shinryokuType,
      undefined,
      getBondBonus(character),
      character.base?.elementalDamageBoosts,
      character.base?.elementalResistanceBoosts,
      undefined,
      character.combatStyle
    );
  }, [finalStats, character.statusEffects, character.equipment, character.skills, character.shinryokuType, character.companions, character.base?.elementalDamageBoosts, character.base?.elementalResistanceBoosts, character.combatStyle, activeMasteryInfo]);

  const equippedSlotsCount = Object.values(character.equipment || {}).filter(Boolean).length + (character.mountedMonsterId ? 1 : 0);
  const maxInventorySize = calculateInventorySize(character.stats);

  return (
    <div 
      className="h-full flex flex-col bg-slate-900 border-r border-slate-700 text-slate-200 shadow-2xl relative overflow-hidden"
      style={{ contain: 'layout paint' }}
    >
      
      {/* Zoom Overlay */}
      {zoomedImg && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-300"
          onClick={() => setZoomedImg(null)}
        >
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <img src={zoomedImg} alt="Zoomed" className="w-full h-auto max-h-[85vh] rounded-2xl border border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.4)] animate-in zoom-in duration-300" />
            <button 
              onClick={() => setZoomedImg(null)}
              className="absolute -top-4 -right-4 bg-slate-800 text-white p-2 rounded-full border border-slate-600 hover:bg-slate-700 shadow-xl transition-all"
            >
              <X size={24} />
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Item Action Confirmation Modal */}
      {confirmAction && (
        <ConfirmModal
          isOpen={!!confirmAction}
          title={confirmAction.type === 'sell' ? '아이템 판매' : '아이템 삭제'}
          message={confirmAction.type === 'sell' 
            ? `"${confirmAction.item.name}"${confirmAction.isAll ? ' (전체)' : ''}을(를) 판매하시겠습니까?`
            : `"${confirmAction.item.name}"을(를) 삭제하시겠습니까? 삭제된 아이템은 복구할 수 없습니다.`
          }
          onConfirm={() => {
            if (confirmAction.type === 'sell') {
              onSellItem(confirmAction.item, confirmAction.indices, confirmAction.isAll);
            } else {
              if (confirmAction.indices.length > 1) {
                onDiscardItem(confirmAction.item, confirmAction.indices);
              } else {
                onDiscardItem(confirmAction.item, confirmAction.indices[0] as any);
              }
            }
          }}
          onClose={() => setConfirmAction(null)}
          type={confirmAction.type}
        />
      )}

      {/* Dedicated Full Modals for 4 Major Panels (독립 멀티 윈도우 스타일) */}
      {showStats && (
        <StatsModal
          character={character}
          onClose={() => setShowStats(false)}
          onIncreaseStat={onIncreaseStat}
          onChangeModal={(m) => {
            if (m === 'stats') setShowStats(true);
            else if (m === 'equip') setShowEquip(true);
            else if (m === 'inventory') setShowInventory(true);
            else if (m === 'companion') setShowCompanion(true);
          }}
        />
      )}

      {showEquip && (
        <EquipmentModal
          character={character}
          onClose={() => setShowEquip(false)}
          onUnequipItem={onUnequipItem}
          onChangeModal={(m) => {
            if (m === 'stats') setShowStats(true);
            else if (m === 'equip') setShowEquip(true);
            else if (m === 'inventory') setShowInventory(true);
            else if (m === 'companion') setShowCompanion(true);
          }}
          onUpdateCharacter={onUpdateCharacter}
          onEquipTitle={(titleId) => onUpdateCharacter?.({ ...character, equippedTitleId: titleId })}
        />
      )}

      {showInventory && (
        <InventoryModal
          character={character}
          onClose={() => setShowInventory(false)}
          onUseItem={onUseItem}
          onEquipItem={onEquipItem}
          onSellClick={(item, indices, isAll) => setConfirmAction({ item, indices, type: 'sell', isAll })}
          onDiscardClick={(item, indices) => setConfirmAction({ item, indices, type: 'discard' })}
          onToggleLock={onToggleItemLock}
          onToggleFavorite={onToggleItemFavorite}
          onAutoSell={onAutoSellItems}
          onChangeModal={(m) => {
            if (m === 'stats') setShowStats(true);
            else if (m === 'equip') setShowEquip(true);
            else if (m === 'inventory') setShowInventory(true);
            else if (m === 'companion') setShowCompanion(true);
          }}
          onUpdateCharacter={onUpdateCharacter}
        />
      )}

      {showCompanion && (
        <CompanionModal
          character={character}
          inactiveCompanions={inactiveCompanions}
          onClose={() => setShowCompanion(false)}
          onSelectCompanion={onSelectCompanion}
          onRejoinCompanion={onRejoinCompanion}
          onPermanentlyDismissCompanion={onPermanentlyDismissCompanion}
          onDismissCompanion={onDismissCompanion}
          onUpdateCharacter={onUpdateCharacter}
          onZoom={setZoomedImg}
          onToggleFavoriteCompanion={onToggleFavoriteCompanion}
          onChangeModal={(m) => {
            if (m === 'stats') setShowStats(true);
            else if (m === 'equip') setShowEquip(true);
            else if (m === 'inventory') setShowInventory(true);
            else if (m === 'companion') setShowCompanion(true);
          }}
        />
      )}

      {showShinryokuModal && (
        <ShinryokuInfoModal
          currentType={character.shinryokuType || '미개방'}
          onClose={() => setShowShinryokuModal(false)}
        />
      )}

      <RenameModal
        isOpen={showRenameModal}
        currentName={character.name}
        onClose={() => setShowRenameModal(false)}
        onConfirm={(newName) => onUpdateCharacter?.({ ...character, name: newName })}
      />

      {showCpDetailModal && (
        <CombatPowerDetailModal
          entity={character}
          onClose={() => setShowCpDetailModal(false)}
        />
      )}

      {/* Combat Style Genealogy Fullscreen Modal */}
      {showCombatStyleModal && createPortal(
        <div className="fixed inset-0 z-[150] flex flex-col bg-slate-950/95 backdrop-blur-md text-slate-100 animate-fadeIn overflow-y-auto custom-scrollbar">
          <div className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md border-b border-amber-500/30 px-6 py-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                <Sword size={24} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-amber-400 flex items-center gap-2">
                  {character.name}의 전투 계열 & 전직 정보
                </h3>
                <p className="text-xs text-slate-400">
                  현재 전투 계열 고유 능력치 보너스 및 차세대 전직 계보도
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCombatStyleModal(false)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-600 transition-all shadow-md active:scale-95"
            >
              <X size={18} />
              <span>닫기 (Close)</span>
            </button>
          </div>

          <div className="max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6 my-auto">
            <PromotionMasteryProgressBar target={character} />
            {/* Style summary info */}
            {character.combatStyle && COMBAT_STYLE_CONFIG[character.combatStyle] ? (
              <div className="bg-slate-900/90 rounded-2xl p-5 border border-amber-900/50 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-400" />
                    현재 장착 중인 전투 계열
                  </span>
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-lg border ${COMBAT_STYLE_CONFIG[character.combatStyle].bgColor} ${COMBAT_STYLE_CONFIG[character.combatStyle].borderColor} ${COMBAT_STYLE_CONFIG[character.combatStyle].color}`}>
                    {COMBAT_STYLE_CONFIG[character.combatStyle].label} ({COMBAT_STYLE_CONFIG[character.combatStyle].tier}차 전직)
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                  {COMBAT_STYLE_CONFIG[character.combatStyle].description}
                </p>
                <div className="text-xs sm:text-sm text-amber-300 font-semibold bg-amber-950/50 p-3 rounded-xl border border-amber-900/50 flex flex-wrap items-center justify-between gap-2">
                  <span>🎯 특화 무기: <strong className="text-amber-200">{COMBAT_STYLE_CONFIG[character.combatStyle].specialtyText}</strong></span>
                  <span className="text-xs font-bold text-amber-400 bg-amber-900/60 px-2.5 py-1 rounded border border-amber-500/40">
                    기본 공격력/마법력 +{getCombatStyleBonusPercent(COMBAT_STYLE_CONFIG[character.combatStyle].tier)}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 shadow-xl text-center space-y-2">
                <p className="text-sm font-bold text-slate-300">현재 지정된 전투 계열이 없습니다.</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  영지 내 <strong className="text-amber-300">[전투 스타일 훈련소]</strong>에서 1차 전투 계열(검사, 창술사, 버서커, 권사, 궁수, 도적, 거너, 마법사, 에너지술사 등)을 수련하여 전직할 수 있습니다.
                </p>
              </div>
            )}
            <div className="text-center pt-2">
              <button
                onClick={() => setShowCombatStyleModal(false)}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Potential Detail Modal (플레이어 잠재력 확인 모달) */}
      {showPotentialModal && createPortal(
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm text-slate-100 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-amber-300">
                    플레이어 잠재력 현황
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    영혼의 직관으로 자각한 잠재력 한계치입니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPotentialModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Current Status Card */}
            <div className="bg-slate-950/70 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">현재 잠재력 한계</span>
                <span className="text-base sm:text-lg font-black text-amber-400">
                  {character.liberationPotential || ClassTier.FIRST}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  현재 해방: {currentClassLabel} (Lv.{character.level})
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">최후의 시련</span>
                <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md inline-block mt-0.5 ${
                  character.hasClearedFinalTrial || character.finalTrialCleared
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/60'
                    : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                }`}>
                  {character.hasClearedFinalTrial || character.finalTrialCleared ? '통과 완료' : '미통과'}
                </span>
              </div>
            </div>

            {/* Potential Tiers List */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-300 block">단계별 돌파 상태</span>

              {/* 1. 퍼스트 */}
              <div className="bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center justify-center border border-amber-500/30">
                    1
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-200">퍼스트 클래스</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">Lv.30 전직</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-700/40">
                  기본 부여
                </span>
              </div>

              {/* 2. 세컨드 */}
              {(() => {
                const isCleared = character.liberationPotential === ClassTier.SECOND || character.liberationPotential === ClassTier.LAST || character.liberationPotential === ClassTier.FINAL;
                return (
                  <div className="bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 text-[10px] font-bold flex items-center justify-center border border-blue-500/30">
                        2
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-200">세컨드 클래스</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">Lv.100 해방</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      isCleared
                        ? 'text-emerald-400 bg-emerald-950/70 border-emerald-700/40'
                        : 'text-slate-500 bg-slate-900 border-slate-700'
                    }`}>
                      {isCleared ? '돌파 완료' : '돌파 필요'}
                    </span>
                  </div>
                );
              })()}

              {/* 3. 라스트 */}
              {(() => {
                const isCleared = character.liberationPotential === ClassTier.LAST || character.liberationPotential === ClassTier.FINAL;
                return (
                  <div className="bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-400 text-[10px] font-bold flex items-center justify-center border border-purple-500/30">
                        3
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-200">라스트 클래스</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">Lv.300 해방</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      isCleared
                        ? 'text-emerald-400 bg-emerald-950/70 border-emerald-700/40'
                        : 'text-slate-500 bg-slate-900 border-slate-700'
                    }`}>
                      {isCleared ? '돌파 완료' : '돌파 필요'}
                    </span>
                  </div>
                );
              })()}

              {/* 4. 파이널 */}
              {(() => {
                const isCleared = character.liberationPotential === ClassTier.FINAL;
                return (
                  <div className="bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-rose-500/20 text-rose-400 text-[10px] font-bold flex items-center justify-center border border-rose-500/30">
                        4
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-200">파이널 클래스</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">Lv.1000 해방</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      isCleared
                        ? 'text-emerald-400 bg-emerald-950/70 border-emerald-700/40'
                        : 'text-slate-500 bg-slate-900 border-slate-700'
                    }`}>
                      {isCleared ? '돌파 완료' : '돌파 필요'}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Guide Footer */}
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-[10px] text-slate-400 text-center leading-relaxed">
              기지 [잠재력 돌파소]에서 한계를 돌파한 후, 목표 레벨 달성 시 클래스 전직이 가능합니다.
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setShowPotentialModal(false)}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-all active:scale-98"
              >
                확인
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Top Header */}
      <div className={`p-5 bg-gradient-to-b ${shinryokuTheme.headerGrad} border-b border-slate-800 relative shrink-0 overflow-hidden`}>
        {/* Top Shinryoku Accent Bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${shinryokuTheme.topBar}`} />



        <div className="flex justify-between items-start mb-2 relative z-10">
          <div className="flex items-start gap-3.5">
            {finalPlayerVisualUrl && (
              <div 
                onClick={() => setZoomedImg(finalPlayerVisualUrl)}
                className={`w-14 h-14 rounded-2xl border-2 ${shinryokuTheme.avatarBorder} overflow-hidden shrink-0 cursor-zoom-in hover:brightness-125 transition-all group`}
              >
                <img src={finalPlayerVisualUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="Avatar" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-lg font-bold ${shinryokuTheme.nameColor} font-cinzel tracking-wider flex items-center gap-1.5`}>
                  <span>{character.name}</span>
                  <button
                    type="button"
                    onClick={() => setShowRenameModal(true)}
                    className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 rounded-lg transition-all border border-transparent hover:border-amber-500/30"
                    title="이름 변경"
                  >
                    <Edit2 size={13} />
                  </button>
                  <span className="ml-1 text-xs font-sans bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono">Lv.{character.level}</span>
                </h2>
                {/* Class Name Badge */}
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg border ${tierBadgeBg} ${tierColor} shadow-sm`}>
                  <Sparkles size={11} className="shrink-0" />
                  <span>{currentClassName}</span>
                  <span className="text-[10px] opacity-80 font-normal">[{currentClassLabel}]</span>
                </div>
              </div>
              <div className="flex space-x-2 text-xs text-slate-500 mt-0.5">
                <span>{character.race} / {character.gender}</span>
                <span>{character.age}</span>
              </div>
              <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>{character.nation}</span>
                {equippedTitle && (
                  <span className={`font-bold ${RARITY_COLORS[equippedTitle.rarity]?.split(' ')[0] || 'text-amber-500'}`}>
                    [{equippedTitle.name}]
                  </span>
                )}
                {getBondBonus(character) > 0 && (
                  <span className="text-pink-400 font-bold flex items-center gap-1 bg-pink-950/20 px-1.5 rounded border border-pink-900/30">
                    <Heart size={10} className="fill-current"/> +{Math.round(getBondBonus(character) * 100)}%
                  </span>
                )}
              </div>
              
              {/* Job & Combat Style Badges */}
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <div className={`flex items-center gap-1 text-[10px] font-bold ${jobInfo.color} bg-black/40 px-2 py-0.5 rounded border border-slate-800`}>
                  <jobInfo.icon size={11} />
                  {jobInfo.label}
                </div>
                {character.combatStyle && COMBAT_STYLE_CONFIG[character.combatStyle] ? (
                  <button 
                    type="button"
                    onClick={() => setShowCombatStyleModal(true)}
                    className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${COMBAT_STYLE_CONFIG[character.combatStyle].bgColor} ${COMBAT_STYLE_CONFIG[character.combatStyle].borderColor} ${COMBAT_STYLE_CONFIG[character.combatStyle].color} hover:brightness-125 transition-all`} 
                  >
                    <Sword size={11} />
                    {COMBAT_STYLE_CONFIG[character.combatStyle].label}
                    <ChevronRight size={10} />
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={() => setShowCombatStyleModal(true)}
                    className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-black/40 hover:bg-slate-800 px-2 py-0.5 rounded border border-slate-700" 
                  >
                    <Sword size={11} />
                    계열 미지정
                  </button>
                )}
                {/* 1차 전투역할 배지 */}
                {character.battleRole && character.battleRole !== BattleRole.NONE && (
                  <div 
                    className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                      character.battleRole === BattleRole.ALLROUNDER
                        ? 'text-amber-300 bg-gradient-to-r from-purple-900/50 to-amber-900/50 border-amber-500/60 shadow-sm shadow-amber-500/20'
                        : character.battleRole === BattleRole.DEALER
                        ? 'text-rose-300 bg-rose-950/50 border-rose-800'
                        : character.battleRole === BattleRole.TANKER
                        ? 'text-sky-300 bg-sky-950/50 border-sky-800'
                        : 'text-emerald-300 bg-emerald-950/50 border-emerald-800'
                    }`}
                    title={`1차 전투역할: ${character.battleRole}`}
                  >
                    <Target size={11} />
                    <span>{character.battleRole}</span>
                  </div>
                )}
                {/* 2차 전투역할 배지 */}
                {character.secondaryBattleRole && character.secondaryBattleRole !== SecondaryBattleRole.NONE && SECONDARY_ROLE_INFOS[character.secondaryBattleRole] && (
                  <div 
                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border bg-purple-950/60 border-purple-600/70 text-purple-200 shadow-sm"
                    title={`2차 전투역할: ${SECONDARY_ROLE_INFOS[character.secondaryBattleRole].title}\n효과: ${SECONDARY_ROLE_INFOS[character.secondaryBattleRole].effects.join(', ')}`}
                  >
                    <Sparkles size={11} className="text-purple-300" />
                    <span>2차: {SECONDARY_ROLE_INFOS[character.secondaryBattleRole].title}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Wealth & Status Row */}
        <div className="mt-3 flex items-center justify-between text-xs bg-black/40 p-2 rounded-xl border border-slate-800">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center text-amber-400 font-mono text-xs font-bold">
              <Coins size={12} className="mr-1.5 text-amber-500" />
              {character.money.toLocaleString()} G
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              {character.job === JobType.SOLDIER ? (
                <div className="flex items-center text-blue-300 font-mono font-bold" title="군인 공적">
                  <Award size={11} className="mr-1 text-blue-400" />
                  공적 {(character.militaryData?.merit || 0).toLocaleString()}
                </div>
              ) : character.job === JobType.MERCENARY ? (
                <div className="flex items-center text-red-300 font-mono font-bold" title="용병 명성">
                  <Award size={11} className="mr-1 text-red-400" />
                  명성 {(character.mercenaryData?.reputation || character.fame || 0).toLocaleString()}
                </div>
              ) : (
                <div className="flex items-center text-amber-300 font-mono font-bold" title="명성">
                  <Award size={11} className="mr-1 text-amber-400" />
                  명성 {(character.fame || 0).toLocaleString()}
                </div>
              )}
              <div className={`flex items-center ${infamyStage.color} font-mono font-bold`}>
                <Gavel size={11} className="mr-1" />
                {character.infamy || 0} ({infamyStage.label})
              </div>
            </div>
          </div>
          {/* Shinryoku Type Badge as Interactive Button */}
          <button
            type="button"
            onClick={() => setShowShinryokuModal(true)}
            className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${shinryokuTheme.badgeBg} shadow-sm cursor-pointer hover:scale-[1.03] hover:brightness-110 active:scale-95 transition-all select-none`}
            title="신력 계통 정보 및 상성표 보기"
          >
            <shinryokuTheme.icon size={12} className="shrink-0 text-amber-300" />
            <span className="truncate">{character.shinryokuType !== "미개방" ? character.shinryokuType : "신력 미개방"}</span>
            <Info size={10} className="ml-0.5 text-slate-300 opacity-70 shrink-0" />
          </button>
        </div>

        {character.statusEffects && character.statusEffects.length > 0 && (
          <div className="mt-2.5 flex flex-wrap relative z-20">
            {character.statusEffects.map((status, idx) => (<StatusBadge key={`${status.name}_${idx}`} status={status} />))}
          </div>
        )}

        {/* HP / MP / EXP Progress */}
        <div className="mt-3 space-y-1.5">
          <HealthBar 
            current={displayedHp} 
            max={finalStats.maxHp} 
            shield={character.statusEffects?.find(s => s.name === '마나 쉴드')?.val || 0}
          />
          <HealthBar 
            current={displayedMp} 
            max={finalStats.maxMp} 
            color="bg-blue-600"
          />
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
            <div className="h-full bg-amber-600" style={{ width: `${Math.min(100, (character.currentExp / character.maxExp) * 100)}%` }}></div>
          </div>
          <div className="text-center text-[9px] text-slate-500 font-mono">
            EXP {character.currentExp} / {character.maxExp} ({(character.currentExp / character.maxExp * 100).toFixed(1)}%)
          </div>

          {/* 피로도 (Fatigue) Progress Bar */}
          {(() => {
            const fatigue = Math.min(100, Math.max(0, character.fatigue || 0));
            const isOverworked = fatigue >= 100;
            const barColor = isOverworked 
              ? 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse' 
              : fatigue >= 80 
              ? 'bg-gradient-to-r from-amber-600 to-orange-500' 
              : fatigue >= 50 
              ? 'bg-gradient-to-r from-yellow-600 to-amber-500' 
              : 'bg-gradient-to-r from-emerald-600 to-teal-500';
            const penaltyPercent = fatigue >= 80 ? Math.round(((Math.min(100, fatigue) - 80) / 20) * 50) : 0;
            const statusLabel = isOverworked 
              ? '과로 (모든 능력치 50% 감소)' 
              : fatigue >= 80 
              ? `극심한 피로 (능력치 ${penaltyPercent}% 감소)` 
              : fatigue >= 50 
              ? '피로함' 
              : fatigue >= 20 
              ? '다소 피로' 
              : '상쾌함';
            const labelColor = isOverworked 
              ? 'text-red-400 font-bold animate-pulse' 
              : fatigue >= 80 
              ? 'text-orange-400' 
              : fatigue >= 50 
              ? 'text-yellow-400' 
              : 'text-emerald-400';

            return (
              <div className={`pt-1.5 pb-1 px-2 rounded-lg border ${isOverworked ? 'bg-red-950/40 border-red-800/80 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-slate-950/60 border-slate-800/80'} space-y-1`}>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1 text-slate-400 font-medium">
                    <Activity size={11} className={isOverworked ? 'text-red-400 animate-bounce' : 'text-slate-400'} />
                    피로도
                  </span>
                  <span className={`text-[10px] font-medium ${labelColor}`}>
                    {fatigue} / 100 ({statusLabel})
                  </span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${barColor}`} 
                    style={{ width: `${fatigue}%` }}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Main Hub Body - Fills the CharacterSheet completely */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 custom-scrollbar bg-slate-900/90 space-y-3.5">
        
        {/* 10 Major Interactive Hub Tile Grid (2-Column) */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          
          {/* 1. 스탯 */}
          <button
            type="button"
            onClick={() => setActiveModal('stats')}
            className="group relative p-2.5 sm:p-3 bg-slate-950/80 hover:bg-slate-950 border border-amber-500/30 hover:border-amber-400 rounded-xl sm:rounded-2xl transition-all shadow-md text-left flex flex-col justify-between active:scale-95 cursor-pointer min-h-[76px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-1.5 rounded-lg sm:rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 group-hover:scale-110 transition-transform">
                <BarChart2 size={16} />
              </div>
              <div className="flex items-center gap-1">
                {character.statPoints > 0 ? (
                  <span className="text-[9px] sm:text-[10px] font-bold text-amber-400 bg-amber-950/90 px-1.5 py-0.5 rounded-md border border-amber-500/50 animate-pulse font-mono">
                    +{character.statPoints} P
                  </span>
                ) : (
                  <ArrowUpRight size={13} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
                )}
              </div>
            </div>
            <div className="mt-2 min-w-0">
              <div className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-amber-400 flex items-center gap-1 transition-colors">
                <span>스탯</span>
                {character.statPoints > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                )}
              </div>
              <div className="text-[10px] text-amber-300/80 font-mono mt-0.5 truncate flex items-center justify-between">
                <span>전투력 {combatPower.toLocaleString()}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCpDetailModal(true);
                  }}
                  className="p-1 text-amber-400 hover:text-amber-200 bg-amber-950/60 hover:bg-amber-900/80 rounded border border-amber-500/40 text-[9px] font-sans font-bold flex items-center gap-0.5 cursor-pointer ml-1"
                  title="자세한 전투력 계산 및 순수 전투력 보기"
                >
                  <Info size={10} /> 상세
                </span>
              </div>
            </div>
          </button>

          {/* 2. 장비 */}
          <button
            type="button"
            onClick={() => setActiveModal('equip')}
            className="group relative p-2.5 sm:p-3 bg-slate-950/80 hover:bg-slate-950 border border-cyan-500/30 hover:border-cyan-400 rounded-xl sm:rounded-2xl transition-all shadow-md text-left flex flex-col justify-between active:scale-95 cursor-pointer min-h-[76px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-1.5 rounded-lg sm:rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 group-hover:scale-110 transition-transform">
                <Shield size={16} />
              </div>
              <ArrowUpRight size={13} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </div>
            <div className="mt-2 min-w-0">
              <div className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-cyan-400 transition-colors">
                장비
              </div>
              <div className="text-[10px] text-cyan-300/80 font-mono mt-0.5 truncate">
                {equippedSlotsCount} / 8 슬롯
              </div>
            </div>
          </button>

          {/* 3. 가방 */}
          <button
            type="button"
            onClick={() => setActiveModal('inventory')}
            className="group relative p-2.5 sm:p-3 bg-slate-950/80 hover:bg-slate-950 border border-emerald-500/30 hover:border-emerald-400 rounded-xl sm:rounded-2xl transition-all shadow-md text-left flex flex-col justify-between active:scale-95 cursor-pointer min-h-[76px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-1.5 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                <Backpack size={16} />
              </div>
              <ArrowUpRight size={13} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </div>
            <div className="mt-2 min-w-0">
              <div className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                가방
              </div>
              <div className={`text-[10px] font-mono mt-0.5 truncate ${
                character.inventory.length >= maxInventorySize ? 'text-red-400 font-bold' : 'text-emerald-300/80'
              }`}>
                {character.inventory.length} / {maxInventorySize}
              </div>
            </div>
          </button>

          {/* 4. 동료 */}
          {(() => {
            const companionsWithPoints = character.companions.filter(c => (c.statPoints || 0) > 0);
            const totalCompanionPoints = companionsWithPoints.reduce((sum, c) => sum + (c.statPoints || 0), 0);
            return (
              <button
                type="button"
                onClick={() => setActiveModal('companion')}
                className="group relative p-2.5 sm:p-3 bg-slate-950/80 hover:bg-slate-950 border border-indigo-500/30 hover:border-indigo-400 rounded-xl sm:rounded-2xl transition-all shadow-md text-left flex flex-col justify-between active:scale-95 cursor-pointer min-h-[76px]"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-1.5 rounded-lg sm:rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 group-hover:scale-110 transition-transform">
                    <Users size={16} />
                  </div>
                  <div className="flex items-center gap-1">
                    {totalCompanionPoints > 0 ? (
                      <span className="text-[9px] sm:text-[10px] font-bold text-amber-400 bg-amber-950/90 px-1.5 py-0.5 rounded-md border border-amber-500/50 animate-pulse font-mono">
                        +{totalCompanionPoints} P
                      </span>
                    ) : (
                      <ArrowUpRight size={13} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
                    )}
                  </div>
                </div>
                <div className="mt-2 min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-indigo-400 flex items-center gap-1 transition-colors">
                    <span>동료</span>
                    {companionsWithPoints.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    )}
                  </div>
                  <div className="text-[10px] text-indigo-300/80 font-mono mt-0.5 truncate">
                    {character.companions.length} / {MAX_PARTY_SIZE}명
                  </div>
                </div>
              </button>
            );
          })()}

          {/* 5. 잠재력 */}
          <button
            type="button"
            onClick={() => setShowPotentialModal(true)}
            className="group relative p-2.5 sm:p-3 bg-slate-950/80 hover:bg-slate-950 border border-purple-500/30 hover:border-purple-400 rounded-xl sm:rounded-2xl transition-all shadow-md text-left flex flex-col justify-between active:scale-95 cursor-pointer min-h-[76px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-1.5 rounded-lg sm:rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 group-hover:scale-110 transition-transform">
                <Sparkles size={16} className="text-purple-400" />
              </div>
              <ArrowUpRight size={13} className="text-slate-500 group-hover:text-purple-400 transition-colors" />
            </div>
            <div className="mt-2 min-w-0">
              <div className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-purple-400 transition-colors">
                잠재력
              </div>
              <div className="text-[10px] text-purple-300/80 font-mono mt-0.5 truncate">
                {character.liberationPotential || ClassTier.FIRST}
              </div>
            </div>
          </button>

          {/* 6. 관계망 */}
          <button
            type="button"
            onClick={onOpenSocial}
            disabled={!onOpenSocial}
            className="group relative p-2.5 sm:p-3 bg-slate-950/80 hover:bg-slate-950 border border-pink-500/30 hover:border-pink-400 rounded-xl sm:rounded-2xl transition-all shadow-md text-left flex flex-col justify-between active:scale-95 cursor-pointer min-h-[76px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-1.5 rounded-lg sm:rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/30 group-hover:scale-110 transition-transform">
                <HeartHandshake size={16} />
              </div>
              <ArrowUpRight size={13} className="text-slate-500 group-hover:text-pink-400 transition-colors" />
            </div>
            <div className="mt-2 min-w-0">
              <div className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-pink-400 transition-colors">
                관계망
              </div>
              <div className="text-[10px] text-pink-300/80 font-mono mt-0.5 truncate">
                관계 도감
              </div>
            </div>
          </button>

          {/* 7. 가문연대기 */}
          <button
            type="button"
            onClick={onOpenChronicles}
            disabled={!onOpenChronicles}
            className="group relative p-2.5 sm:p-3 bg-slate-950/80 hover:bg-slate-950 border border-amber-500/30 hover:border-amber-400 rounded-xl sm:rounded-2xl transition-all shadow-md text-left flex flex-col justify-between active:scale-95 cursor-pointer min-h-[76px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-1.5 rounded-lg sm:rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 group-hover:scale-110 transition-transform">
                <Scroll size={16} />
              </div>
              <ArrowUpRight size={13} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
            </div>
            <div className="mt-2 min-w-0">
              <div className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                가문연대기
              </div>
              <div className="text-[10px] text-amber-300/80 font-mono mt-0.5 truncate">
                연대기 기록
              </div>
            </div>
          </button>

          {/* 8. 스킬북 */}
          <button
            type="button"
            onClick={onOpenSkillBook}
            className="group relative p-2.5 sm:p-3 bg-slate-950/80 hover:bg-slate-950 border border-yellow-500/30 hover:border-yellow-400 rounded-xl sm:rounded-2xl transition-all shadow-md text-left flex flex-col justify-between active:scale-95 cursor-pointer min-h-[76px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-1.5 rounded-lg sm:rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 group-hover:scale-110 transition-transform">
                <BookOpen size={16} />
              </div>
              <ArrowUpRight size={13} className="text-slate-500 group-hover:text-yellow-400 transition-colors" />
            </div>
            <div className="mt-2 min-w-0">
              <div className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-yellow-400 transition-colors">
                스킬북
              </div>
              <div className="text-[10px] text-yellow-300/80 font-mono mt-0.5 truncate">
                {character.skills?.length || 0}개 습득
              </div>
            </div>
          </button>

          {/* 9. 무기숙련 */}
          <button
            type="button"
            onClick={onOpenWeaponMastery}
            className="group relative p-2.5 sm:p-3 bg-slate-950/80 hover:bg-slate-950 border border-sky-500/30 hover:border-sky-400 rounded-xl sm:rounded-2xl transition-all shadow-md text-left flex flex-col justify-between active:scale-95 cursor-pointer min-h-[76px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-1.5 rounded-lg sm:rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30 group-hover:scale-110 transition-transform">
                <Target size={16} />
              </div>
              <ArrowUpRight size={13} className="text-slate-500 group-hover:text-sky-400 transition-colors" />
            </div>
            <div className="mt-2 min-w-0">
              <div className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-sky-400 transition-colors">
                무기숙련
              </div>
              <div className="text-[10px] text-sky-300/80 font-mono mt-0.5 truncate">
                {activeMasteryInfo ? `${WEAPON_TYPE_KOREAN[activeMasteryInfo.type] || activeMasteryInfo.type} Lv.${activeMasteryInfo.level}` : '숙련도 현황'}
              </div>
            </div>
          </button>

          {/* 10. 전문기술 */}
          <button
            type="button"
            onClick={onOpenProfessionMastery}
            className="group relative p-2.5 sm:p-3 bg-slate-950/80 hover:bg-slate-950 border border-teal-500/30 hover:border-teal-400 rounded-xl sm:rounded-2xl transition-all shadow-md text-left flex flex-col justify-between active:scale-95 cursor-pointer min-h-[76px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-1.5 rounded-lg sm:rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/30 group-hover:scale-110 transition-transform">
                <Award size={16} />
              </div>
              <ArrowUpRight size={13} className="text-slate-500 group-hover:text-teal-400 transition-colors" />
            </div>
            <div className="mt-2 min-w-0">
              <div className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-teal-400 transition-colors">
                전문기술
              </div>
              <div className="text-[10px] text-teal-300/80 font-mono mt-0.5 truncate">
                기술 숙련
              </div>
            </div>
          </button>

        </div>
        <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <Activity size={13} className="text-amber-400" /> 핵심 전투 지표
            </span>
            <span className="text-[10px] text-slate-500 font-mono">치명타 {derived.critChance.toFixed(1)}%</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
            <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-red-400 block font-medium">STR</span>
              <span className="font-bold text-slate-100 font-mono">{finalStats.str}</span>
            </div>
            <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-purple-400 block font-medium">INT</span>
              <span className="font-bold text-slate-100 font-mono">{finalStats.int}</span>
            </div>
            <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-blue-400 block font-medium">WIS</span>
              <span className="font-bold text-slate-100 font-mono">{finalStats.wis}</span>
            </div>
            <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-emerald-400 block font-medium">DEF</span>
              <span className="font-bold text-slate-100 font-mono">{finalStats.def}</span>
            </div>
            <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-amber-400 block font-medium">AGI</span>
              <span className="font-bold text-slate-100 font-mono">{finalStats.agi}</span>
            </div>
            <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-cyan-400 block font-medium">CTRL</span>
              <span className="font-bold text-slate-100 font-mono">{finalStats.ctrl}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1 border-t border-slate-800/80">
            <div className="flex justify-between items-center bg-slate-900/50 px-2 py-1 rounded-lg">
              <span className="text-red-400">P.ATK</span>
              <span className="font-bold font-mono text-slate-200">{derived.pAtk.toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-900/50 px-2 py-1 rounded-lg">
              <span className="text-purple-400">M.ATK</span>
              <span className="font-bold font-mono text-slate-200">{derived.mAtk.toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-900/50 px-2 py-1 rounded-lg">
              <span className="text-emerald-400">P.DEF</span>
              <span className="font-bold font-mono text-slate-200">{derived.pDef.toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-900/50 px-2 py-1 rounded-lg">
              <span className="text-blue-400">M.DEF</span>
              <span className="font-bold font-mono text-slate-200">{derived.mDef.toFixed(1)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default React.memo(CharacterSheet);
