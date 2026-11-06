import React, { useState, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { Character, Item, ItemRarity } from '../types';
import { calculateItemPrice, calculateInventorySize, getEnhancedStatValue, getEntityAllCombatSkills } from '../utils';
import { SHINRYOKU_UI_CONFIG, WEAPON_TYPE_KOREAN } from '../constants';
import { ItemTooltip } from './CharacterSheet';
import { X, Backpack, Search, Box, Trash2, Coins, Shield, Sparkles, Filter, CheckCircle2, Lock, Unlock, Star, BarChart2, User, Zap, Sword, Info } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import ShortcutAssignModal from './ShortcutAssignModal';

interface Props {
  character: Character;
  onClose: () => void;
  onUseItem: (item: Item, indices: number | number[]) => void;
  onEquipItem?: (itemIndex: number) => void;
  onSellClick: (item: Item, indices: number[], isAll?: boolean) => void;
  onDiscardClick: (item: Item, indices: number[]) => void;
  onToggleLock?: (itemIndex: number | number[]) => void;
  onToggleFavorite?: (itemIndex: number | number[]) => void;
  onAutoSell?: (maxRarity: ItemRarity, categories: string[]) => void;
  onChangeModal?: (modal: 'stats' | 'equip' | 'inventory' | 'companion') => void;
  onUpdateCharacter?: (character: Character) => void;
}

type InvTabType = 'all' | 'equip' | 'consumable' | 'etc' | 'favorite';

const RARITY_COLORS: Record<string, string> = {
  [ItemRarity.NORMAL]: 'text-slate-300 border-slate-700/80 bg-slate-900/60',
  [ItemRarity.MAGIC]: 'text-blue-400 border-blue-500/50 bg-blue-950/25',
  [ItemRarity.RARE]: 'text-yellow-400 border-yellow-500/50 bg-yellow-950/25',
  [ItemRarity.EPIC]: 'text-purple-400 border-purple-500/50 bg-purple-950/25',
  [ItemRarity.UNIQUE]: 'text-pink-400 border-pink-500/50 bg-pink-950/25',
  [ItemRarity.LEGENDARY]: 'text-amber-400 border-amber-500/70 bg-amber-950/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
  [ItemRarity.MYTHTIC]: 'text-red-400 border-red-600/70 bg-red-950/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]',
};

import { getItemImage } from '../services/rpgIconService';

interface GroupedItem {
  item: Item;
  count: number;
  indices: number[];
}

export const InventoryModal: React.FC<Props> = memo(({
  character,
  onClose,
  onUseItem,
  onEquipItem,
  onSellClick,
  onDiscardClick,
  onToggleLock,
  onToggleFavorite,
  onAutoSell,
  onChangeModal,
  onUpdateCharacter
}) => {
  const [activeTab, setActiveTab] = useState<InvTabType>('all');
  const [equipSlotFilter, setEquipSlotFilter] = useState<'all' | 'Weapon' | 'SubWeapon' | 'Body' | 'Accessory' | 'Feets' | 'Head' | 'Hand'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileDetailItem, setMobileDetailItem] = useState<{ item: Item; indices: number[]; count: number } | null>(null);
  const [selectedItemInfo, setSelectedItemInfo] = useState<{ item: Item; indices: number[]; count: number } | null>(null);
  const [useConfirmTarget, setUseConfirmTarget] = useState<{ item: Item; indices: number | number[] } | null>(null);

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
    return { x: 150, y: 100 };
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

  // 숏컷 번호 지정 모달 상태
  const [shortcutTarget, setShortcutTarget] = useState<{
    name: string;
    displayName: string;
    type: 'skill' | 'item';
    icon?: string;
    imageUrl?: string;
  } | null>(null);

  const handleOpenItemShortcutModal = (item: Item) => {
    setShortcutTarget({
      name: `[ITEM] ${item.name}`,
      displayName: item.name,
      type: 'item',
      imageUrl: item.imageUrl
    });
  };

  const handleAssignSlot = (slotIndex: number) => {
    if (!shortcutTarget || !onUpdateCharacter) return;
    const current = Array.from({ length: 10 }, (_, i) => (character.skillShortcuts || [])[i] || '');
    
    // 이미 다른 슬롯에 등록되어 있다면 비우기 (포맷된 이름 및 일반 이름 검사)
    const prevIdx = current.findIndex(s => s === shortcutTarget.name || s === shortcutTarget.displayName);
    if (prevIdx !== -1) {
      current[prevIdx] = '';
    }
    
    // 선택한 번호 슬롯에 등록
    current[slotIndex] = shortcutTarget.name;
    
    onUpdateCharacter({
      ...character,
      skillShortcuts: current
    });
  };

  const handleRemoveShortcut = (nameToRemove?: string) => {
    if (!onUpdateCharacter) return;
    const target = nameToRemove || shortcutTarget?.name;
    if (!target) return;
    const rawTarget = target.replace(/^\[ITEM\]\s*/, '');
    
    const current = Array.from({ length: 10 }, (_, i) => (character.skillShortcuts || [])[i] || '');
    const prevIdx = current.findIndex(s => s === target || s === rawTarget);
    if (prevIdx !== -1) {
      current[prevIdx] = '';
    }
    
    onUpdateCharacter({
      ...character,
      skillShortcuts: current
    });
  };

  const handleToggleShortcut = (itemName: string) => {
    const foundItem = (character.inventory || []).find(i => i.name === itemName);
    if (foundItem) {
      handleOpenItemShortcutModal(foundItem);
    } else {
      setShortcutTarget({
        name: `[ITEM] ${itemName}`,
        displayName: itemName,
        type: 'item'
      });
    }
  };

  const handleRemoveShortcutAtIndex = (slotIdx: number) => {
    if (!onUpdateCharacter) return;
    const current = Array.from({ length: 10 }, (_, i) => (character.skillShortcuts || [])[i] || '');
    current[slotIdx] = '';
    onUpdateCharacter({
      ...character,
      skillShortcuts: current
    });
  };

  // Auto-sell states
  const [autoSellRarity, setAutoSellRarity] = useState<ItemRarity>(ItemRarity.NORMAL);
  const [autoSellCategories, setAutoSellCategories] = useState<string[]>(['equip', 'consumable', 'etc']);
  const [autoSellConfirmState, setAutoSellConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isAlert: boolean;
  } | null>(null);

  const handleAutoSellCategoryToggle = (category: string) => {
    setAutoSellCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  const equipTypes = ['Weapon', 'SubWeapon', 'Head', 'Body', 'Feet', 'Hand', 'Accessory', '무기', '보조무기', '투구', '모자', '갑옷', '상의', '하의', '장갑', '신발', '장신구', '반지', '목걸이'];
  const consumTypes = ['Consumable', '소비', '물약', '음식', '소모품'];

  const handleAutoSellClick = () => {
    const rarityPriority: Record<ItemRarity, number> = {
      [ItemRarity.NORMAL]: 1,
      [ItemRarity.MAGIC]: 2,
      [ItemRarity.RARE]: 3,
      [ItemRarity.EPIC]: 4,
      [ItemRarity.UNIQUE]: 5,
      [ItemRarity.LEGENDARY]: 6,
      [ItemRarity.MYTHTIC]: 7,
    };

    const maxPriority = rarityPriority[autoSellRarity] || 1;

    let soldCount = 0;
    let totalEarned = 0;
    const indicesToSell: number[] = [];

    character.inventory.forEach((item, index) => {
      if (item.locked) return;

      const itemPriority = rarityPriority[item.rarity] || 1;
      if (itemPriority > maxPriority) return;

      let matchesCategory = false;
      if (autoSellCategories.includes('equip') && equipTypes.includes(item.type)) {
        matchesCategory = true;
      }
      if (autoSellCategories.includes('consumable') && consumTypes.includes(item.type)) {
        matchesCategory = true;
      }
      if (autoSellCategories.includes('etc') && !equipTypes.includes(item.type) && !consumTypes.includes(item.type)) {
        matchesCategory = true;
      }

      if (matchesCategory) {
        soldCount++;
        totalEarned += calculateItemPrice(item);
        indicesToSell.push(index);
      }
    });

    if (soldCount === 0) {
      setAutoSellConfirmState({
        isOpen: true,
        title: '자동 판매 알림',
        message: '설정한 조건에 부합하는 판매 대상 아이템이 인벤토리에 없습니다. (잠긴 아이템 제외)',
        onConfirm: () => setAutoSellConfirmState(null),
        isAlert: true,
      });
      return;
    }

    setAutoSellConfirmState({
      isOpen: true,
      title: '조건 자동 판매 확인',
      message: `설정한 조건(${autoSellRarity} 이하, 선택된 카테고리)에 해당하는 아이템 총 ${soldCount}개를 일괄 판매하시겠습니까?\n예상 획득 골드: ${totalEarned.toLocaleString()} G\n(※ 잠긴 아이템은 보호됩니다.)`,
      onConfirm: () => {
        if (onAutoSell) {
          onAutoSell(autoSellRarity, autoSellCategories);
        } else {
          indicesToSell.sort((a, b) => b - a).forEach(idx => {
            const it = character.inventory[idx];
            if (it) onSellClick(it, [idx], false);
          });
        }
        setAutoSellConfirmState(null);
      },
      isAlert: false,
    });
  };

  const groupedItems = useMemo((): GroupedItem[] => {
    const grouped: Record<string, GroupedItem> = {};

    (character.inventory || []).forEach((rawItem, originalIndex) => {
      const itemName = rawItem.name || (rawItem as any).item || '알 수 없는 아이템';
      const item: Item = rawItem.name ? rawItem : ({ ...rawItem, name: itemName } as Item);

      if (activeTab === 'equip') {
        if (!equipTypes.includes(item.type)) return;
        const t = (item.type || '').toLowerCase();
        if (equipSlotFilter === 'Weapon' && (t.includes('subweapon') || t.includes('보조무기') || !(t.includes('weapon') || t.includes('무기')))) return;
        if (equipSlotFilter === 'SubWeapon' && !(t.includes('subweapon') || t.includes('보조무기') || t.includes('방패'))) return;
        if (equipSlotFilter === 'Body' && !(t.includes('body') || t.includes('갑옷') || t.includes('상의') || t.includes('하의') || t.includes('의복'))) return;
        if (equipSlotFilter === 'Accessory' && !(t.includes('accessory') || t.includes('장신구') || t.includes('반지') || t.includes('목걸이') || t.includes('귀걸이'))) return;
        if (equipSlotFilter === 'Feets' && !(t.includes('feet') || t.includes('feets') || t.includes('신발') || t.includes('발'))) return;
        if (equipSlotFilter === 'Head' && !(t.includes('head') || t.includes('투구') || t.includes('모자') || t.includes('머리'))) return;
        if (equipSlotFilter === 'Hand' && !(t.includes('hand') || t.includes('장갑') || t.includes('손'))) return;
      }
      if (activeTab === 'consumable' && !consumTypes.includes(item.type)) return;
      if (activeTab === 'etc' && (equipTypes.includes(item.type) || consumTypes.includes(item.type))) return;
      if (activeTab === 'favorite' && !item.favorite) return;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesType = item.type.toLowerCase().includes(q);
        const matchesDesc = (item.description || '').toLowerCase().includes(q);
        if (!matchesName && !matchesType && !matchesDesc) return;
      }

      const isStackable = !equipTypes.includes(item.type);

      if (isStackable) {
        const groupKey = `${item.name}-${item.rarity}-${item.type}-${!!item.locked}-${!!item.favorite}`;
        if (grouped[groupKey]) {
          grouped[groupKey].count += 1;
          grouped[groupKey].indices.push(originalIndex);
        } else {
          grouped[groupKey] = {
            item,
            count: 1,
            indices: [originalIndex]
          };
        }
      } else {
        const uniqueKey = `${item.name}-${originalIndex}`;
        grouped[uniqueKey] = {
          item,
          count: 1,
          indices: [originalIndex]
        };
      }
    });

    return Object.values(grouped);
  }, [character.inventory, activeTab, searchQuery, equipSlotFilter]);

  const maxCapacity = useMemo(() => calculateInventorySize(character.stats), [character.stats]);
  const isFull = character.inventory.length >= maxCapacity;

  return createPortal(
    <div className="fixed inset-0 z-[120] pointer-events-none animate-in fade-in duration-200">
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
          isMobile ? 'border-none rounded-none' : 'border border-emerald-500/40 rounded-2xl'
        }`}
      >
        
        {/* Header */}
        <div 
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="cursor-move bg-slate-950 px-3 py-2 sm:px-4 sm:py-3 border-b border-slate-800 flex items-center justify-between shrink-0 gap-2 select-none"
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
              <Backpack size={16} className="sm:w-[18px] sm:h-[18px]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <h2 className="text-xs sm:text-sm font-bold text-emerald-400 truncate">
                  가방
                </h2>
                <span className={`text-[8px] sm:text-[10px] px-1.5 py-0.2 rounded-full border font-mono font-bold shrink-0 ${
                  isFull ? 'bg-red-950 text-red-400 border-red-700 animate-pulse' : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {character.inventory.length}/{maxCapacity}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 flex items-center gap-1 text-amber-400 font-mono text-[9px] sm:text-[10px] font-bold shadow-inner">
              <Coins size={10} className="text-amber-500 shrink-0" />
              <span>{character.money.toLocaleString()} G</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors shrink-0"
              aria-label="닫기"
            >
              <X size={13} className="sm:w-[15px] sm:h-[15px]" />
            </button>
          </div>
        </div>

        {/* Quick Navigation Tab Bar */}
        {onChangeModal && (
          <div className="bg-slate-950 px-3 py-1.5 sm:px-6 sm:py-2 border-b border-slate-800/80 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth shrink-0">
            {[
              { key: 'stats', label: '스탯 상태', color: 'text-amber-400 hover:bg-amber-500/10 border-amber-500/20' },
              { key: 'equip', label: '장착 장비', color: 'text-cyan-400 hover:bg-cyan-500/10 border-cyan-500/20' },
              { key: 'inventory', label: '인벤토리', color: 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20' },
              { key: 'companion', label: '동료 관리', color: 'text-indigo-400 hover:bg-indigo-500/10 border-indigo-500/20' },
            ].map((m) => {
              const isActive = m.key === 'inventory';
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => onChangeModal(m.key as any)}
                  className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-black border transition-all flex items-center gap-1 shrink-0 ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                      : `bg-slate-900 border-slate-800 ${m.color}`
                  }`}
                >
                  {m.key === 'stats' && <BarChart2 size={10} className="sm:w-[12px] sm:h-[12px]" />}
                  {m.key === 'equip' && <Shield size={10} className="sm:w-[12px] sm:h-[12px]" />}
                  {m.key === 'inventory' && <Backpack size={10} className="sm:w-[12px] sm:h-[12px]" />}
                  {m.key === 'companion' && <User size={10} className="sm:w-[12px] sm:h-[12px]" />}
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* 전투 퀵 숏컷 바 (인벤토리 모달 연동 - 터치 최적화) */}
        {onUpdateCharacter && (
          <div className="bg-slate-950/95 px-2.5 py-1.5 sm:px-4 border-b border-slate-800/80 shrink-0 flex items-center justify-between gap-2 overflow-hidden">
            <div className="flex items-center gap-1 shrink-0 select-none">
              <Zap size={9} className="text-amber-400 fill-amber-400 animate-pulse shrink-0" />
              <span className="text-[8.5px] sm:text-[9px] font-bold text-slate-300">퀵 숏컷</span>
              <span className="text-[7.5px] sm:text-[8px] text-amber-300 bg-amber-950 px-1 py-0.2 rounded border border-amber-900/60 font-mono font-bold leading-none">
                {(character.skillShortcuts || []).filter(Boolean).length}
              </span>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((slotIdx) => {
                const shortcutName = (character.skillShortcuts || [])[slotIdx];
                const allAvailableSkills = getEntityAllCombatSkills(character as any);
                const rawName = shortcutName ? shortcutName.replace(/^\[ITEM\]\s*/, '') : '';
                const isItem = shortcutName ? (shortcutName.startsWith('[ITEM]') || (character.inventory || []).some(i => i.name === shortcutName && !allAvailableSkills.some(s => s.name === shortcutName))) : false;
                const matchingSkill = !isItem && shortcutName
                  ? allAvailableSkills.find(s => s.name === shortcutName || s.id === shortcutName)
                  : null;
                const matchingItem = isItem
                  ? (character.inventory || []).find(i => i.name === rawName || i.name === shortcutName)
                  : null;

                const hasValue = matchingSkill || matchingItem;
                const displayName = matchingItem ? `[아이템] ${matchingItem.name}` : matchingSkill ? `[스킬] ${matchingSkill.name}` : '빈 슬롯';

                return (
                  <button
                    key={slotIdx}
                    type="button"
                    onClick={() => {
                      if (matchingItem) {
                        handleOpenItemShortcutModal(matchingItem);
                      } else if (matchingSkill) {
                        setShortcutTarget({
                          name: matchingSkill.name,
                          displayName: matchingSkill.name,
                          type: 'skill',
                          icon: matchingSkill.icon,
                          imageUrl: matchingSkill.imageUrl
                        });
                      }
                    }}
                    title={hasValue ? `${displayName} (클릭 시 번호 변경 및 해제)` : `빈 슬롯 #${slotIdx + 1}`}
                    className={`relative rounded flex items-center justify-center transition-all w-[24px] h-[24px] sm:w-[26px] sm:h-[26px] shrink-0 border ${
                      hasValue
                        ? isItem 
                          ? 'bg-gradient-to-b from-emerald-950/80 to-slate-900 border-emerald-500/40 hover:border-emerald-400 active:scale-95 text-slate-100 cursor-pointer'
                          : 'bg-gradient-to-b from-indigo-950/80 to-slate-900 border-indigo-500/40 hover:border-indigo-400 active:scale-95 text-slate-100 cursor-pointer'
                        : 'bg-slate-950/30 border-slate-800/60 text-slate-700 border-dashed'
                    }`}
                  >
                    <span className="absolute bottom-0 right-0.5 text-[5px] font-mono text-slate-500 select-none pointer-events-none leading-none">
                      {slotIdx + 1}
                    </span>

                    {hasValue ? (
                      <div className="w-full h-full rounded overflow-hidden flex items-center justify-center p-0.5 relative group">
                        {isItem ? (
                          matchingItem?.imageUrl ? (
                            <img src={matchingItem.imageUrl} alt={matchingItem.name} className="w-full h-full object-cover rounded-[1px]" referrerPolicy="no-referrer" />
                          ) : (
                            <Box size={9} className="text-emerald-400" />
                          )
                        ) : matchingSkill?.imageUrl ? (
                          <img src={matchingSkill.imageUrl} alt={matchingSkill.name} className="w-full h-full object-cover rounded-[1px]" referrerPolicy="no-referrer" />
                        ) : (
                          <Sword size={9} className="text-indigo-400" />
                        )}
                        <div className="absolute inset-0 bg-red-950/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-[1px]">
                          <X size={8} className="text-red-400" />
                        </div>
                      </div>
                    ) : (
                      <span className="text-[7px] text-slate-800 font-bold select-none leading-none">+</span>
                    )}
                  </button>
                );
              })}
            </div>
            <span className="text-[7.5px] text-slate-500 hidden md:inline shrink-0 select-none">
              클릭 시 해제
            </span>
          </div>
        )}

        {/* Filters & Search Toolbar */}
        <div className="bg-slate-950/80 px-2.5 py-2 sm:px-6 sm:py-2.5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 shrink-0">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2 py-1 sm:px-3 sm:py-1.5 text-[9px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all border shrink-0 ${
                activeTab === 'all'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              전체 ({character.inventory.length})
            </button>
            <button
              onClick={() => setActiveTab('equip')}
              className={`px-2 py-1 sm:px-3 sm:py-1.5 text-[9px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all border shrink-0 ${
                activeTab === 'equip'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              장비
            </button>
            <button
              onClick={() => setActiveTab('consumable')}
              className={`px-2 py-1 sm:px-3 sm:py-1.5 text-[9px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all border shrink-0 ${
                activeTab === 'consumable'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              소비
            </button>
            <button
              onClick={() => setActiveTab('etc')}
              className={`px-2 py-1 sm:px-3 sm:py-1.5 text-[9px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all border shrink-0 ${
                activeTab === 'etc'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              기타
            </button>
            <button
              onClick={() => setActiveTab('favorite')}
              className={`px-2 py-1 sm:px-3 sm:py-1.5 text-[9px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition-all border flex items-center gap-1 shrink-0 ${
                activeTab === 'favorite'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-500/60 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Star size={9} className="text-amber-400 fill-amber-400" />
              <span>즐겨찾기 ({character.inventory.filter(i => i.favorite).length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-auto md:min-w-[180px]">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="아이템 이름/종류 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 text-slate-200 text-[10px] sm:text-xs pl-7 pr-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Equipment Slot Sub-filter Bar */}
        {activeTab === 'equip' && (
          <div className="bg-slate-950/90 px-2.5 py-1.5 sm:px-6 border-b border-slate-800/80 flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth shrink-0">
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400 shrink-0 mr-1">부위 정렬:</span>
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
                onClick={() => setEquipSlotFilter(slot.key as any)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[11px] font-bold rounded-md sm:rounded-lg transition-all border shrink-0 ${
                  equipSlotFilter === slot.key
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        )}

        {/* Auto Sell Area (Responsive, Mobile Compact) */}
        {onAutoSell && (
          <div className="bg-slate-950/60 px-2.5 py-1.5 sm:px-6 sm:py-2.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-1.5 text-xs shrink-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-slate-400 flex items-center gap-1 text-[9.5px] sm:text-xs shrink-0">
                <Sparkles size={10} className="text-amber-400 shrink-0" /> 자동판매:
              </span>
              
              {/* 등급 선택 */}
              <div className="flex items-center bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded-lg shrink-0">
                <select 
                  value={autoSellRarity} 
                  onChange={(e) => setAutoSellRarity(e.target.value as ItemRarity)}
                  className="bg-transparent text-amber-400 font-bold focus:outline-none cursor-pointer text-[10px] sm:text-[11px]"
                >
                  <option value={ItemRarity.NORMAL}>일반 이하</option>
                  <option value={ItemRarity.MAGIC}>매직 이하</option>
                  <option value={ItemRarity.RARE}>희귀 이하</option>
                  <option value={ItemRarity.EPIC}>에픽 이하</option>
                  <option value={ItemRarity.UNIQUE}>유니크 이하</option>
                </select>
              </div>

              {/* 카테고리 다중 선택 */}
              <div className="flex items-center gap-1 shrink-0">
                {[
                  { key: 'equip', label: '장비' },
                  { key: 'consumable', label: '소비' },
                  { key: 'etc', label: '기타' }
                ].map((cat) => (
                  <label key={cat.key} className="flex items-center gap-0.5 cursor-pointer bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] select-none">
                    <input 
                      type="checkbox" 
                      checked={autoSellCategories.includes(cat.key)} 
                      onChange={() => handleAutoSellCategoryToggle(cat.key)}
                      className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-0 focus:ring-offset-0 w-2.5 h-2.5"
                    />
                    <span className={autoSellCategories.includes(cat.key) ? 'text-emerald-400 font-bold' : 'text-slate-400'}>{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleAutoSellClick}
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-slate-950 font-black rounded-lg shadow transition-all flex items-center justify-center gap-1 text-[9.5px] sm:text-[11px] shrink-0 ml-auto md:ml-0"
            >
              <Coins size={10} /> 조건 자동 판매
            </button>
          </div>
        )}

        {/* Body Content (MapleStory-style 바둑판 격자) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 custom-scrollbar flex flex-col gap-4 bg-slate-950/40">
          
          {/* 가방 바둑판 격자 영역 (메이플스토리 감성) */}
          <div className="bg-slate-950 p-3.5 rounded-xl border-2 border-amber-900/50 shadow-inner flex justify-center">
            <div className="flex flex-wrap gap-1.5 justify-center max-h-[320px] sm:max-h-[380px] overflow-y-auto pr-1 custom-scrollbar w-full">
              {(() => {
                const rendered = groupedItems.map((grouped, slotIdx) => {
                  const { item, count, indices } = grouped;
                  const isEquippable = equipTypes.includes(item.type);
                  const isConsumable = consumTypes.includes(item.type);
                  const primaryIndex = indices[0];
                  const rarityStyle = RARITY_COLORS[item.rarity] || 'text-slate-300 border-slate-700 bg-slate-900/50';
                  const isSelected = selectedItemInfo && selectedItemInfo.item.name === item.name && selectedItemInfo.item.rarity === item.rarity;

                  return (
                    <div
                      key={`item-${slotIdx}`}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (isEquippable && onEquipItem) {
                          onEquipItem(primaryIndex);
                          setSelectedItemInfo({ item, indices, count });
                        } else if (isConsumable) {
                          setUseConfirmTarget({ item, indices });
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItemInfo({ item, indices, count });
                      }}
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded border relative p-1 transition-all flex items-center justify-center cursor-pointer select-none group/slot ${rarityStyle} ${
                        isSelected 
                          ? 'ring-2 ring-emerald-400 border-emerald-400 scale-[1.03] bg-slate-900 shadow-[0_0_12px_rgba(52,211,153,0.4)]' 
                          : 'hover:border-slate-400 hover:scale-[1.01]'
                      }`}
                    >
                      <img 
                        src={getItemImage(item)} 
                        alt={item.name} 
                        className="w-full h-full object-contain p-0.5 rounded transition-transform group-hover/slot:scale-105" 
                        referrerPolicy="no-referrer"
                      />

                      {item.locked && (
                        <div className="absolute top-0.5 left-0.5 bg-slate-950/90 p-0.5 rounded text-red-500 border border-red-900/30 z-10 scale-75 origin-top-left">
                          <Lock size={9} />
                        </div>
                      )}

                      {!item.locked && item.favorite && (
                        <div className="absolute top-0.5 left-0.5 bg-slate-950/90 p-0.5 rounded text-amber-400 border border-amber-900/30 z-10 scale-75 origin-top-left">
                          <Star size={9} fill="currentColor" />
                        </div>
                      )}

                      {count > 1 && (
                        <div className="absolute bottom-0.5 right-0.5 bg-slate-950/90 text-slate-100 text-[8px] font-bold font-mono px-1 rounded border border-slate-700/60 leading-none z-10">
                          {count}
                        </div>
                      )}

                      {item.divineLevel && item.divineLevel > 0 && (
                        <div className="absolute top-0.5 right-0.5 bg-amber-500 text-slate-950 text-[7px] font-black px-0.5 rounded leading-none z-10 scale-75 origin-top-right">
                          ★{item.divineLevel}
                        </div>
                      )}

                      <ItemTooltip item={item} character={character} />
                    </div>
                  );
                });

                // Render optimized empty slots at the end (e.g. 24 or enough to fill rows nicely)
                const emptyCount = Math.max(16, 24 - (groupedItems.length % 8));
                for (let i = 0; i < emptyCount; i++) {
                  const slotIdx = groupedItems.length + i;
                  if (slotIdx >= maxCapacity) break; // Don't exceed maximum capacity
                  rendered.push(
                    <div 
                      key={`empty-${slotIdx}`}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded border border-slate-800/80 bg-slate-950/70 hover:bg-slate-900/20 transition-colors flex items-center justify-center text-slate-800/40 font-mono text-[9px] select-none"
                    >
                      {slotIdx + 1}
                    </div>
                  );
                }

                return rendered;
              })()}
            </div>
          </div>

          {/* 선택한 아이템 전용 조작 패널 */}
          <div className="bg-slate-950/90 rounded-2xl border border-slate-800/80 p-3.5 sm:p-4 shadow-lg shrink-0">
            {selectedItemInfo ? (() => {
              const { item, indices, count } = selectedItemInfo;
              const sellPrice = calculateItemPrice(item);
              const isEquippable = equipTypes.includes(item.type);
              const isConsumable = consumTypes.includes(item.type);
              const primaryIndex = indices[0];
              const uiConfig = item.elementalType ? (SHINRYOKU_UI_CONFIG[item.elementalType] || SHINRYOKU_UI_CONFIG.default) : null;
              
              const shortcutIdx = (character.skillShortcuts || []).findIndex(s => s === `[ITEM] ${item.name}` || s === item.name);
              const isShortcutEquipped = shortcutIdx !== -1;

              return (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700/80 overflow-hidden flex items-center justify-center p-1 shrink-0 relative">
                      <img src={getItemImage(item)} className="w-full h-full object-contain" alt="" referrerPolicy="no-referrer" />
                      {count > 1 && (
                        <div className="absolute bottom-1 right-1 bg-slate-950 text-slate-100 text-[8px] font-mono font-bold px-1 rounded border border-slate-800">
                          {count}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-extrabold text-slate-100">
                          {item.name || (item as any).item || '알 수 없는 아이템'} {item.enhancement ? `+${item.enhancement}` : ''}
                        </span>
                        <span className="text-[10px] text-amber-400 font-mono bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-900/60">
                          {sellPrice.toLocaleString()} G
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                        <span className="font-bold text-[9px] uppercase px-1 py-0.2 rounded bg-slate-900 border border-slate-800">{item.rarity}</span>
                        <span>|</span>
                        <span className="text-slate-300 font-bold">{item.type}</span>
                        {item.elementalType && uiConfig && (
                          <>
                            <span>|</span>
                            <span className={`font-bold px-1.5 py-0.2 rounded border text-[9px] ${uiConfig.text} ${uiConfig.bg} ${uiConfig.border}`}>
                              {item.elementalType}
                            </span>
                          </>
                        )}
                        <span className="text-[9px] text-slate-500 italic hidden sm:inline">(더블클릭 시 즉시 사용/장착)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap md:ml-auto">
                    {isConsumable && (
                      <button
                        type="button"
                        onClick={() => setUseConfirmTarget({ item, indices })}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        사용하기
                      </button>
                    )}
                    {isEquippable && onEquipItem && (
                      <button
                        type="button"
                        onClick={() => {
                          onEquipItem(primaryIndex);
                          setSelectedItemInfo(null);
                        }}
                        className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        장비장착
                      </button>
                    )}

                    {onToggleLock && (
                      <button
                        type="button"
                        onClick={() => {
                          onToggleLock(indices);
                          setSelectedItemInfo({ item: { ...item, locked: !item.locked }, indices, count });
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                          item.locked 
                            ? 'bg-red-950/80 text-red-400 border-red-800/60' 
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {item.locked ? <Lock size={12} className="text-red-400" /> : <Unlock size={12} />}
                        <span>{item.locked ? '잠금해제' : '잠금'}</span>
                      </button>
                    )}

                    {onToggleFavorite && (
                      <button
                        type="button"
                        onClick={() => {
                          onToggleFavorite(indices);
                          setSelectedItemInfo({ item: { ...item, favorite: !item.favorite }, indices, count });
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                          item.favorite 
                            ? 'bg-amber-950/80 text-amber-300 border-amber-600/60' 
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <Star size={12} className={item.favorite ? "text-amber-400 fill-amber-400" : ""} />
                        <span>즐겨찾기</span>
                      </button>
                    )}

                    {isConsumable && onUpdateCharacter && (
                      <button
                        type="button"
                        onClick={() => handleOpenItemShortcutModal(item)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                          isShortcutEquipped
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <Zap size={12} className={isShortcutEquipped ? 'fill-current text-slate-950' : 'text-amber-400'} />
                        <span>{isShortcutEquipped ? `숏컷 #${shortcutIdx + 1}` : '숏컷 등록'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (item.locked) return;
                        onSellClick(item, indices, false);
                        setSelectedItemInfo(null);
                      }}
                      disabled={!!item.locked}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        item.locked 
                          ? 'bg-slate-950/50 text-slate-600 border-slate-900 cursor-not-allowed opacity-50'
                          : 'bg-blue-950/60 hover:bg-blue-900 text-blue-300 border-blue-800'
                      }`}
                    >
                      판매
                    </button>

                    {count > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (item.locked) return;
                          onSellClick(item, indices, true);
                          setSelectedItemInfo(null);
                        }}
                        disabled={!!item.locked}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          item.locked 
                            ? 'bg-slate-950/50 text-slate-600 border-slate-900 cursor-not-allowed opacity-50'
                            : 'bg-blue-900/80 hover:bg-blue-800 text-blue-100 border-blue-700'
                        }`}
                      >
                        전체판매
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (item.locked) return;
                        onDiscardClick(item, indices);
                        setSelectedItemInfo(null);
                      }}
                      disabled={!!item.locked}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                        item.locked 
                          ? 'bg-slate-950/50 text-slate-600 border-slate-900 cursor-not-allowed opacity-50'
                          : 'bg-red-950/60 hover:bg-red-900 text-red-400 border-red-900'
                      }`}
                    >
                      <Trash2 size={12} />
                      <span>버리기</span>
                    </button>
                  </div>
                </div>
              );
            })() : (
              <div className="text-center py-6 text-slate-500 text-xs sm:text-sm font-medium flex items-center justify-center gap-2">
                <Info size={16} className="text-slate-600" />
                <span>가방에서 아이템 슬롯을 클릭하시면 상세 조작 패널이 열립니다. (더블클릭 시 즉시 사용/장착)</span>
              </div>
            )}
          </div>

        </div>








        {/* Mobile Detail Modal / Bottom Sheet */}
        {mobileDetailItem && (
          <div 
            className="sm:hidden fixed inset-0 z-[130] bg-slate-950/80 backdrop-blur-sm flex flex-col justify-end p-0"
            onClick={() => setMobileDetailItem(null)}
          >
            <div 
              className="bg-slate-900 border-t border-emerald-500/50 rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto space-y-3 shadow-[0_-10px_30px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0">
                    <img src={getItemImage(mobileDetailItem.item)} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      <span>{mobileDetailItem.item.name || (mobileDetailItem.item as any).item || '알 수 없는 아이템'}</span>
                      {mobileDetailItem.item.enhancement ? <span className="text-amber-400 font-mono">+{mobileDetailItem.item.enhancement}</span> : null}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                      <span className="font-mono px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800">{mobileDetailItem.item.rarity}</span>
                      <span className="px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800 text-slate-300">{mobileDetailItem.item.type}</span>
                      {mobileDetailItem.item.elementalType && (
                        <span className="px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800 text-emerald-400">{mobileDetailItem.item.elementalType}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setMobileDetailItem(null)}
                  className="p-1 bg-slate-800 text-slate-300 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Description & Effect */}
              {mobileDetailItem.item.description && (
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                  {mobileDetailItem.item.description}
                </div>
              )}

              {/* Stats Breakdown */}
              {mobileDetailItem.item.stats && Object.keys(mobileDetailItem.item.stats).length > 0 && (
                <div className="space-y-1.5">
                  <h5 className="text-[11px] font-bold text-slate-400">능력치 정보</h5>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(mobileDetailItem.item.stats).map(([k, v]) => {
                      const enhancedVal = getEnhancedStatValue(Number(v), mobileDetailItem.item.enhancement, k);
                      return (
                        <div key={k} className="bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 font-mono">{k.toUpperCase()}</span>
                          <span className="text-amber-300 font-bold font-mono">+{enhancedVal}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Equipped Item Comparison (Mobile) */}
              {(() => {
                const type = mobileDetailItem.item.type;
                let equipped: Item | undefined = undefined;
                if (['무기', 'Weapon'].includes(type)) equipped = character.equipment?.weapon;
                else if (['보조무기', 'SubWeapon'].includes(type)) equipped = character.equipment?.subWeapon;
                else if (['머리', 'Head', '투구', '모자'].includes(type)) equipped = character.equipment?.head;
                else if (['상의/하의', 'Body', '갑옷', '상의', '하의'].includes(type)) equipped = character.equipment?.body;
                else if (['장갑', 'Hand'].includes(type)) equipped = character.equipment?.hand;
                else if (['신발', 'Feet'].includes(type)) equipped = character.equipment?.feet;
                else if (['장신구', 'Accessory', '반지', '목걸이'].includes(type)) equipped = character.equipment?.accessory;

                if (!equipped) return null;
                const isSame = equipped === mobileDetailItem.item || (equipped.name === mobileDetailItem.item.name && equipped.enhancement === mobileDetailItem.item.enhancement && equipped.rarity === mobileDetailItem.item.rarity);

                return (
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-500/30 text-xs">
                    <div className="text-[10px] text-amber-400 font-bold mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1"><Shield size={11} /> 현재 착용 중인 장비</span>
                      <span className="text-[9px] font-mono text-slate-400">{equipped.rarity}</span>
                    </div>
                    <div className="text-amber-200 font-bold">
                      {equipped.name} {equipped.enhancement ? `+${equipped.enhancement}` : ''}
                      {isSame && <span className="ml-1.5 text-[10px] text-emerald-400 bg-emerald-950 px-1 py-0.2 rounded border border-emerald-500/40">★ 현 장착중</span>}
                    </div>
                  </div>
                );
              })()}

              {/* Price & Count */}
              <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">판매 가격 (개당)</span>
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Coins size={12} className="text-amber-500" />
                  {calculateItemPrice(mobileDetailItem.item).toLocaleString()} G
                </span>
              </div>

              {/* Action Buttons in Mobile Sheet */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {consumTypes.includes(mobileDetailItem.item.type) && (
                  <>
                    <button
                      onClick={() => {
                        setUseConfirmTarget({ item: mobileDetailItem.item, indices: mobileDetailItem.indices });
                        setMobileDetailItem(null);
                      }}
                      className="py-2.5 bg-emerald-600 active:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1 shadow"
                    >
                      아이템 사용
                    </button>
                    {onUpdateCharacter && (
                      <button
                        onClick={() => {
                          const item = mobileDetailItem.item;
                          setMobileDetailItem(null);
                          handleOpenItemShortcutModal(item);
                        }}
                        className="py-2.5 bg-amber-600 active:bg-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1 shadow"
                      >
                        <Zap size={14} className="text-slate-950 fill-current" />
                        퀵 숏컷 번호 지정
                      </button>
                    )}
                  </>
                )}
                {equipTypes.includes(mobileDetailItem.item.type) && onEquipItem && (
                  <button
                    onClick={() => {
                      onEquipItem(mobileDetailItem.indices[0]);
                      setMobileDetailItem(null);
                    }}
                    className="py-2.5 bg-amber-500 active:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1 shadow"
                  >
                    장비 장착
                  </button>
                )}
                <button
                  onClick={() => {
                    if (mobileDetailItem.item.locked) return;
                    onSellClick(mobileDetailItem.item, mobileDetailItem.indices, false);
                    setMobileDetailItem(null);
                  }}
                  disabled={!!mobileDetailItem.item.locked}
                  className="py-2.5 bg-blue-900 active:bg-blue-800 disabled:opacity-50 text-blue-100 font-bold rounded-xl text-xs border border-blue-700 flex items-center justify-center gap-1"
                >
                  개별 판매
                </button>
                {mobileDetailItem.count > 1 && (
                  <button
                    onClick={() => {
                      if (mobileDetailItem.item.locked) return;
                      onSellClick(mobileDetailItem.item, mobileDetailItem.indices, true);
                      setMobileDetailItem(null);
                    }}
                    disabled={!!mobileDetailItem.item.locked}
                    className="py-2.5 bg-blue-800 active:bg-blue-700 disabled:opacity-50 text-blue-100 font-bold rounded-xl text-xs border border-blue-600 flex items-center justify-center gap-1"
                  >
                    전체 판매 ({mobileDetailItem.count}개)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-950 px-3 py-2.5 sm:px-6 sm:py-3.5 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto text-center justify-center px-5 py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
          >
            확인 및 닫기
          </button>
        </div>

        {/* Auto Sell Confirmation Modal */}
        {autoSellConfirmState && autoSellConfirmState.isOpen && (
          <ConfirmModal
            isOpen={autoSellConfirmState.isOpen}
            title={autoSellConfirmState.title}
            message={autoSellConfirmState.message}
            onConfirm={autoSellConfirmState.onConfirm}
            onClose={() => setAutoSellConfirmState(null)}
            type="sell"
            isAlert={autoSellConfirmState.isAlert}
          />
        )}

        {/* 소비 아이템 사용 확인 모달 (갯수가 1개여도 사용 여부 재확인) */}
        {useConfirmTarget && (
          <ConfirmModal
            isOpen={Boolean(useConfirmTarget)}
            title="아이템 사용 확인"
            message={`정말 [${useConfirmTarget.item.name}] 아이템을 사용하시겠습니까?`}
            onConfirm={() => {
              onUseItem(useConfirmTarget.item, useConfirmTarget.indices);
              setUseConfirmTarget(null);
              setSelectedItemInfo(null);
            }}
            onClose={() => setUseConfirmTarget(null)}
            type="sell"
            isAlert={false}
          />
        )}

        {/* 숏컷 번호 지정 모달 */}
        {shortcutTarget && (
          <ShortcutAssignModal
            isOpen={Boolean(shortcutTarget)}
            onClose={() => setShortcutTarget(null)}
            targetName={shortcutTarget.name}
            targetDisplayName={shortcutTarget.displayName}
            targetType={shortcutTarget.type}
            targetIcon={shortcutTarget.icon}
            targetImageUrl={shortcutTarget.imageUrl}
            character={character}
            onAssignSlot={handleAssignSlot}
            onRemoveShortcut={() => handleRemoveShortcut(shortcutTarget.name)}
          />
        )}

        {/* 우측 하단 크기 조절 손잡이 */}
        {!isMobile && (
          <div 
            onMouseDown={handleResizeMouseDown}
            onTouchStart={handleResizeTouchStart}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50 flex items-end justify-end pointer-events-auto"
            title="드래그하여 크기 조절"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" className="text-emerald-500/60 fill-current m-0.5 pointer-events-none">
              <path d="M10,0 L0,10 L10,10 Z" />
            </svg>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
});

export default InventoryModal;
