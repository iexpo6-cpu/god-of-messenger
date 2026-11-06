import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Character, Item, ItemRarity } from '../types';
import { calculateTotalStats, getEnhancedStatValue } from '../utils';
import { WEAPON_TYPE_KOREAN, SHINRYOKU_UI_CONFIG } from '../constants';
import { TITLES } from '../titles';
import { ItemTooltip } from './CharacterSheet';
import { X, Shield, Sword, Sparkles, Trash2, Play, Award, BarChart2, Backpack, User, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  character: Character;
  onClose: () => void;
  onUnequipItem: (slot: string) => void;
  onChangeModal?: (modal: 'stats' | 'equip' | 'inventory' | 'companion') => void;
  onEquipTitle?: (titleId: string | undefined) => void;
  onUpdateCharacter?: (character: Character) => void;
}

const RARITY_COLORS: Record<string, string> = {
  [ItemRarity.NORMAL]: 'text-slate-400 border-slate-700 bg-slate-900/40',
  [ItemRarity.MAGIC]: 'text-blue-400 border-blue-600/50 bg-blue-950/20',
  [ItemRarity.RARE]: 'text-yellow-400 border-yellow-600/50 bg-yellow-950/20',
  [ItemRarity.EPIC]: 'text-purple-400 border-purple-600/50 bg-purple-950/20',
  [ItemRarity.UNIQUE]: 'text-pink-400 border-pink-600/50 bg-pink-950/20',
  [ItemRarity.LEGENDARY]: 'text-amber-400 border-amber-500/50 bg-amber-950/30 shadow-[0_0_10px_rgba(245,158,11,0.12)]',
  [ItemRarity.MYTHTIC]: 'text-red-500 border-red-600/50 bg-red-950/30 shadow-[0_0_10px_rgba(239,68,68,0.15)]',
};

import { getItemImage } from '../services/rpgIconService';

export const EquipmentModal: React.FC<Props> = ({ 
  character, 
  onClose, 
  onUnequipItem, 
  onChangeModal,
  onEquipTitle,
  onUpdateCharacter
}) => {
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
    return { x: 100, y: 100 };
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
  const [showTitlePicker, setShowTitlePicker] = useState(false);
  const { bonus: equipBonus } = calculateTotalStats(character);

  const equippedTitle = character.equippedTitleId ? TITLES[character.equippedTitleId] : null;

  const handleTitleChange = (titleId: string | undefined) => {
    if (onEquipTitle) {
      onEquipTitle(titleId);
    } else if (onUpdateCharacter) {
      onUpdateCharacter({
        ...character,
        equippedTitleId: titleId,
      });
    }
  };

  const availableTitlesList = Object.values(TITLES).filter(t => 
    character.availableTitles?.includes(t.id) || character.equippedTitleId === t.id
  );

  const slots = [
    { key: 'weapon', label: '주무기', item: character.equipment.weapon, icon: Sword },
    { key: 'subWeapon', label: '보조무기', item: character.equipment.subWeapon, icon: Shield },
    { key: 'head', label: '머리 / 투구', item: character.equipment.head, icon: Shield },
    { key: 'body', label: '갑옷 / 의복', item: character.equipment.body, icon: Shield },
    { key: 'hand', label: '장갑', item: character.equipment.hand, icon: Shield },
    { key: 'feet', label: '신발', item: character.equipment.feet, icon: Shield },
    { key: 'accessory', label: '장신구', item: character.equipment.accessory, icon: Sparkles },
  ];

  const equippedCount = slots.filter(s => !!s.item).length + (character.mountedMonsterId ? 1 : 0);

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
          isMobile ? 'border-none rounded-none' : 'border border-cyan-500/40 rounded-2xl'
        }`}
      >
        {/* Header */}
        <div 
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="cursor-move bg-slate-950 px-3 sm:px-4 py-2 sm:py-3 border-b border-slate-800 flex items-center justify-between shrink-0 select-none"
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/30 shrink-0">
              <Shield size={16} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-cyan-400 flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="truncate">장착 장비</span>
                <span className="text-[9px] bg-slate-800 text-slate-300 font-normal px-1.5 py-0.2 rounded border border-slate-700">
                  {equippedCount} / 8 슬롯
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors shrink-0 ml-2"
          >
            <X size={15} />
          </button>
        </div>

        {/* Quick Navigation Tab Bar */}
        {onChangeModal && (
          <div className="bg-slate-950 px-3 sm:px-5 py-2 border-b border-slate-800 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar shrink-0">
            {[
              { key: 'stats', label: '스탯 상태', color: 'text-amber-400 hover:bg-amber-500/10 border-amber-500/20' },
              { key: 'equip', label: '장착 장비', color: 'text-cyan-400 hover:bg-cyan-500/10 border-cyan-500/20' },
              { key: 'inventory', label: '인벤토리', color: 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20' },
              { key: 'companion', label: '동료 관리', color: 'text-indigo-400 hover:bg-indigo-500/10 border-indigo-500/20' },
            ].map((m) => {
              const isActive = m.key === 'equip';
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => onChangeModal(m.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-black border transition-all flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.12)]'
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

        {/* Bonus Summary Bar */}
        <div className="bg-slate-950/90 px-3 sm:px-5 py-2 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 text-slate-400">
            <span className="font-bold text-cyan-300">🛡️ 장비 스탯:</span>
            {equipBonus.maxHp > 0 && <span className="text-red-400 font-mono font-bold">HP+{equipBonus.maxHp}</span>}
            {equipBonus.maxMp > 0 && <span className="text-blue-400 font-mono font-bold">MP+{equipBonus.maxMp}</span>}
            {equipBonus.str > 0 && <span className="text-red-400 font-mono font-bold">STR+{equipBonus.str}</span>}
            {equipBonus.int > 0 && <span className="text-purple-400 font-mono font-bold">INT+{equipBonus.int}</span>}
            {equipBonus.wis > 0 && <span className="text-blue-400 font-mono font-bold">WIS+{equipBonus.wis}</span>}
            {equipBonus.def > 0 && <span className="text-emerald-400 font-mono font-bold">DEF+{equipBonus.def}</span>}
            {equipBonus.agi > 0 && <span className="text-amber-400 font-mono font-bold">AGI+{equipBonus.agi}</span>}
            {equipBonus.ctrl > 0 && <span className="text-cyan-400 font-mono font-bold">CTRL+{equipBonus.ctrl}</span>}
          </div>

          {equippedTitle?.stats && Object.keys(equippedTitle.stats).length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-slate-400">
              <span className="font-bold text-amber-300">🎖️ 칭호 스탯:</span>
              {Object.entries(equippedTitle.stats).map(([k, v]) => (
                <span key={k} className="text-amber-400 font-mono font-bold">
                  {k.toUpperCase()}+{v}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar space-y-3">
          
          {/* [NEW] Compact Title (칭호) Section */}
          <div className="bg-slate-950/70 p-2.5 sm:p-3 rounded-xl border border-slate-800 transition-all">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/30 shrink-0">
                  <Award size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">장착 칭호 (Title)</span>
                    {equippedTitle && (
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${RARITY_COLORS[equippedTitle.rarity] || 'text-amber-400 border-amber-500/40'}`}>
                        {equippedTitle.rarity}
                      </span>
                    )}
                  </div>

                  {equippedTitle ? (
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-xs sm:text-sm font-bold text-amber-300 truncate">
                        [{equippedTitle.name}]
                      </span>
                      <span className="text-[10px] text-slate-400 hidden sm:inline truncate">
                        "{equippedTitle.description}"
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic mt-0.5">
                      장착된 칭호가 없습니다.
                    </div>
                  )}
                </div>
              </div>

              {/* Title Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {equippedTitle && (
                  <button
                    type="button"
                    onClick={() => handleTitleChange(undefined)}
                    className="px-2 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-white rounded-lg text-[11px] font-bold border border-red-800/50 transition-all flex items-center gap-1"
                    title="칭호 해제"
                  >
                    <Trash2 size={12} />
                    <span>해제</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowTitlePicker(!showTitlePicker)}
                  className="px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 hover:text-amber-200 rounded-lg text-[11px] font-bold border border-amber-600/50 transition-all flex items-center gap-1"
                >
                  <Award size={12} />
                  <span>칭호 변경</span>
                  <span className="text-[10px] opacity-75 font-mono">({availableTitlesList.length})</span>
                  {showTitlePicker ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>
            </div>

            {/* Title Bonus Stats Preview */}
            {equippedTitle && (
              <div className="mt-2 pt-2 border-t border-slate-900 flex flex-wrap items-center gap-1.5 text-[9px]">
                {equippedTitle.stats && Object.entries(equippedTitle.stats).map(([k, v]) => (
                  <span key={k} className="bg-slate-900 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-900/30 font-mono font-bold">
                    {k.toUpperCase()} +{v}
                  </span>
                ))}
                {equippedTitle.statMultipliers && Object.entries(equippedTitle.statMultipliers).map(([k, v]) => (
                  <span key={k} className="bg-slate-900 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-900/30 font-mono font-bold">
                    {k.toUpperCase()} +{Math.round(Number(v) * 100)}%
                  </span>
                ))}
                {equippedTitle.requirementText && (
                  <span className="text-slate-500 ml-auto hidden md:inline">
                    달성 조건: {equippedTitle.requirementText}
                  </span>
                )}
              </div>
            )}

            {/* Collapsible Simple Title Selector */}
            {showTitlePicker && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 animate-in fade-in duration-150">
                <div className="text-[10px] font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>보유 중인 칭호 목록</span>
                  <span className="text-[9px] text-slate-500 font-normal">원하는 칭호를 클릭하여 바로 장착하세요.</span>
                </div>

                {availableTitlesList.length === 0 ? (
                  <div className="p-3 text-center bg-slate-900/60 rounded-lg border border-slate-800/60 text-xs text-slate-500">
                    보유 중인 칭호가 없습니다. (퀘스트, 토너먼트, 승급 과업 등을 달성하여 칭호를 획득할 수 있습니다)
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar p-1">
                    {availableTitlesList.map((t) => {
                      const isEquipped = character.equippedTitleId === t.id;
                      return (
                        <div
                          key={t.id}
                          className={`p-2 rounded-lg border text-left transition-all flex items-center justify-between gap-2 ${
                            isEquipped
                              ? 'bg-amber-950/40 border-amber-500 shadow-sm'
                              : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[8px] font-bold px-1 py-0.2 rounded border ${RARITY_COLORS[t.rarity] || 'text-slate-400 border-slate-700'}`}>
                                {t.rarity}
                              </span>
                              <span className={`text-xs font-bold truncate ${isEquipped ? 'text-amber-300' : 'text-slate-200'}`}>
                                {t.name}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1 text-[8px]">
                              {t.stats && Object.entries(t.stats).map(([k, v]) => (
                                <span key={k} className="text-emerald-400 font-mono">
                                  {k.toUpperCase()}+{v}
                                </span>
                              ))}
                              {t.statMultipliers && Object.entries(t.statMultipliers).map(([k, v]) => (
                                <span key={k} className="text-cyan-400 font-mono">
                                  {k.toUpperCase()}+{Math.round(Number(v) * 100)}%
                                </span>
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleTitleChange(isEquipped ? undefined : t.id)}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all shrink-0 ${
                              isEquipped
                                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                : 'bg-amber-600 hover:bg-amber-500 text-white shadow'
                            }`}
                          >
                            {isEquipped ? '해제' : '장착'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* [MODIFIED] Equipment Slots: Compact 2-Column Grid */}
          <div className="grid grid-cols-2 gap-2">
            
            {/* Standard 7 Equipment Slots */}
            {slots.map(({ key, label, item, icon: Icon }) => {
              const uiConfig = item?.elementalType ? (SHINRYOKU_UI_CONFIG[item.elementalType] || SHINRYOKU_UI_CONFIG.default) : null;
              const rarityStyle = item ? (RARITY_COLORS[item.rarity] || 'text-slate-300 border-slate-700 bg-slate-900/40') : '';

              return (
                <div 
                  key={key}
                  className={`p-2.5 sm:p-3 rounded-xl border transition-all relative group flex flex-col justify-between min-h-[96px] sm:min-h-[105px] ${
                    item ? `${rarityStyle} shadow-sm` : 'border-dashed border-slate-800 bg-slate-950/40'
                  }`}
                >
                  {/* Top: Slot Label & Unequip */}
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate">
                      {label}
                    </span>
                    {item && (
                      <button
                        onClick={() => onUnequipItem(key)}
                        className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors"
                        title="장비 해제"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                  {/* Middle: Thumbnail & Title/Info */}
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
                      {item ? (
                        <img src={getItemImage(item)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <Icon size={18} className="text-slate-700 opacity-40" />
                      )}
                      {item && item.divineLevel && item.divineLevel > 0 && (
                        <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-[8px] font-black px-0.5 rounded-bl leading-tight">
                          ★{item.divineLevel}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      {item ? (
                        <div>
                          <h4 className="text-[11px] sm:text-xs font-bold truncate text-slate-100 flex items-center gap-1">
                            <span className="truncate">{item.name}</span>
                            {item.enhancement ? <span className="text-amber-400 font-mono text-[10px] shrink-0">+{item.enhancement}</span> : null}
                          </h4>
                          <div className="flex items-center gap-1 text-[8px] sm:text-[9px] text-slate-400 mt-1 flex-wrap">
                            <span className="bg-slate-950/80 px-1 py-0.2 rounded border border-slate-800 font-mono">
                              {item.rarity}
                            </span>
                            {item.weaponType && (
                              <span className="bg-slate-950/80 px-1 py-0.2 rounded border border-slate-800 text-slate-300">
                                {WEAPON_TYPE_KOREAN[item.weaponType] || item.weaponType}
                              </span>
                            )}
                            {item.elementalType && uiConfig && (
                              <span className={`font-bold px-1 py-0.2 rounded border ${uiConfig.text} ${uiConfig.bg} ${uiConfig.border}`}>
                                {item.elementalType}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-600 italic py-1">
                          장착 없음
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Stats & Tooltip */}
                  {item && (
                    <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex flex-wrap gap-1 text-[8px] sm:text-[9px]">
                      {item.stats && Object.entries(item.stats).slice(0, 3).map(([k, v]) => {
                        const enhancedVal = getEnhancedStatValue(Number(v), item.enhancement, k);
                        return (
                          <span key={k} className="bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800 font-mono font-bold text-slate-300">
                            {k.toUpperCase()} +{enhancedVal}
                          </span>
                        );
                      })}
                      {item.mythicOption && (
                        <span className="bg-amber-950/80 text-amber-300 px-1.5 py-0.2 rounded border border-amber-600/50 font-bold">
                          ★ {item.mythicOption}
                        </span>
                      )}
                      <ItemTooltip item={item} character={character} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Mount Slot Card (8th slot in the grid) */}
            <div className={`p-2.5 sm:p-3 rounded-xl border transition-all relative group flex flex-col justify-between min-h-[96px] sm:min-h-[105px] ${
              character.mountedMonsterId 
                ? 'text-amber-400 border-amber-500/50 bg-amber-950/20 shadow-sm' 
                : 'border-dashed border-slate-800 bg-slate-950/40'
            }`}>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate">
                  탑승 탈것
                </span>
                {character.mountedMonsterId && (
                  <button
                    onClick={() => onUnequipItem('mount')}
                    className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors"
                    title="탈것 해제"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-start gap-2 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
                  {character.mountedMonsterId && character.mountedMonster ? (
                    <img 
                      src={character.mountedMonster.monsterData?.visualUrl || character.mountedMonster.visualUrl || character.mountedMonster.appearance || ''} 
                      alt={character.mountedMonster.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                    />
                  ) : (
                    <Play size={18} className="text-slate-700 opacity-40" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {character.mountedMonsterId && character.mountedMonster ? (
                    <div>
                      <h4 className="text-[11px] sm:text-xs font-bold truncate text-amber-200">
                        {character.mountedMonster.name}
                      </h4>
                      <div className="flex items-center gap-1 text-[8px] sm:text-[9px] text-slate-400 mt-1">
                        <span className="bg-slate-950/80 px-1 py-0.2 rounded border border-slate-800 text-amber-400 font-mono font-bold">
                          Lv.{character.mountedMonster.level}
                        </span>
                        <span className="text-slate-400 truncate">
                          {character.mountedMonster.race || '수호수'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-600 italic py-1">
                      탑승 없음
                    </div>
                  )}
                </div>
              </div>

              {character.mountedMonsterId && character.mountedMonster && (
                <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[8px] sm:text-[9px] text-amber-300/90 flex items-center gap-1 truncate">
                  <span>🐎 이동 및 전투 보너스 적용 중</span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-4 sm:px-6 py-2.5 sm:py-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
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
            <svg width="10" height="10" viewBox="0 0 10 10" className="text-cyan-500/60 fill-current m-0.5 pointer-events-none">
              <path d="M10,0 L0,10 L10,10 Z" />
            </svg>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default EquipmentModal;
