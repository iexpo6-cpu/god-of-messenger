import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Character, Stats, ActiveStatus, WeaponType, WeaponMastery, Skill, BondSkill, CombatStyle } from '../types';
import { calculateFinalStats, calculateTotalStats, calculateDerivedStats, getWeaponTypeFromItem, getBondBonus, extractElementalType } from '../utils';
import { STAT_DESCRIPTIONS } from '../constants';
import { X, Activity, Heart, Zap, Sword, Brain, Shield, User, BarChart2, Info, Sparkles, Flame, Backpack } from 'lucide-react';
import DetailedStatsModal from './DetailedStatsModal';

interface Props {
  character: Character;
  onClose: () => void;
  onIncreaseStat: (statKey: string, label: string, amount: number) => void;
  onChangeModal?: (modal: 'stats' | 'equip' | 'inventory' | 'companion') => void;
}

export const StatsModal: React.FC<Props> = ({ character, onClose, onIncreaseStat, onChangeModal }) => {
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [activeStatDesc, setActiveStatDesc] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const [position, setPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      const x = Math.max(10, Math.floor((window.innerWidth - 840) / 2));
      const y = Math.max(10, Math.floor((window.innerHeight - 600) / 2));
      return { x, y };
    }
    return { x: 50, y: 50 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = React.useRef({ x: 0, y: 0 });
  const startPos = React.useRef({ x: 0, y: 0 });

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

  const { finalStats, buffBonus, equipPercentBonus, mountBonus, combatStyleBonus, equipBonus, derived } = useMemo(() => {
    const { finalStats, buffBonus, equipPercentBonus, mountBonus, combatStyleBonus } = calculateFinalStats(character);
    const { bonus: equipBonus } = calculateTotalStats(character);

    // Derived stats calculation for overview (Identical with DetailedStatsModal)
    let elementalSynergy = false;
    let activeMasteryInfo: { level: number, type: WeaponType } | undefined = undefined;
    let activeSubMasteryInfo: { level: number, type: WeaponType } | undefined = undefined;

    if (character.equipment) {
      if (character.equipment.weapon) {
        const actualWeaponElement = character.equipment.weapon.elementalType || extractElementalType(character.equipment.weapon.secondaryOptions || []);
        
        if (character.shinryokuType && actualWeaponElement === character.shinryokuType) {
          elementalSynergy = true;
        }
        
        const wType = getWeaponTypeFromItem(character.equipment.weapon);
        if (wType && character.weaponMastery?.[wType]) {
          activeMasteryInfo = { level: character.weaponMastery[wType]!.level, type: wType };
        }
      }
      
      if (character.equipment.subWeapon) {
        const subType = getWeaponTypeFromItem(character.equipment.subWeapon);
        if (subType && character.weaponMastery?.[subType]) {
          activeSubMasteryInfo = { level: character.weaponMastery[subType]!.level, type: subType };
        }
      }
    }

    // 중복 적용 방지 필터링
    const filteredStatusEffects = character.statusEffects?.map(effect => {
      if (!effect.effect) return effect;
      const cleanedEffect = effect.effect.replace(/(STR|INT|WIS|DEF|AGI|CTRL)\s*[+-]\d+(\.\d+)?%/gi, '').trim();
      return { ...effect, effect: cleanedEffect };
    }) || [];

    const derived = calculateDerivedStats(
      finalStats,
      filteredStatusEffects,
      activeMasteryInfo,
      activeSubMasteryInfo,
      elementalSynergy,
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

    return { finalStats, buffBonus, equipPercentBonus, mountBonus, combatStyleBonus, equipBonus, derived };
  }, [character]);

  const statList = [
    { key: 'maxHp', label: '생명력 (HP)', icon: Heart, color: 'text-red-400', val: finalStats.maxHp, equip: equipBonus.maxHp + (equipPercentBonus.maxHp || 0), buff: buffBonus.maxHp, mount: mountBonus.maxHp, style: combatStyleBonus.maxHp },
    { key: 'maxMp', label: '마나 (MP)', icon: Zap, color: 'text-blue-400', val: finalStats.maxMp, equip: equipBonus.maxMp + (equipPercentBonus.maxMp || 0), buff: buffBonus.maxMp, mount: mountBonus.maxMp, style: combatStyleBonus.maxMp },
    { key: 'str', label: '힘 (STR)', icon: Sword, color: 'text-red-500', val: finalStats.str, equip: equipBonus.str + (equipPercentBonus.str || 0), buff: buffBonus.str, mount: mountBonus.str, style: combatStyleBonus.str },
    { key: 'int', label: '지력 (INT)', icon: Zap, color: 'text-purple-400', val: finalStats.int, equip: equipBonus.int + (equipPercentBonus.int || 0), buff: buffBonus.int, mount: mountBonus.int, style: combatStyleBonus.int },
    { key: 'wis', label: '지능 (WIS)', icon: Brain, color: 'text-blue-400', val: finalStats.wis, equip: equipBonus.wis + (equipPercentBonus.wis || 0), buff: buffBonus.wis, mount: mountBonus.wis, style: combatStyleBonus.wis },
    { key: 'def', label: '방어 (DEF)', icon: Shield, color: 'text-emerald-400', val: finalStats.def, equip: equipBonus.def + (equipPercentBonus.def || 0), buff: buffBonus.def, mount: mountBonus.def, style: combatStyleBonus.def },
    { key: 'agi', label: '민첩 (AGI)', icon: Activity, color: 'text-amber-400', val: finalStats.agi, equip: equipBonus.agi + (equipPercentBonus.agi || 0), buff: buffBonus.agi, mount: mountBonus.agi, style: combatStyleBonus.agi },
    { key: 'ctrl', label: '제어 (CTRL)', icon: User, color: 'text-cyan-400', val: finalStats.ctrl, equip: equipBonus.ctrl + (equipPercentBonus.ctrl || 0), buff: buffBonus.ctrl, mount: mountBonus.ctrl, style: combatStyleBonus.ctrl },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[120] pointer-events-none animate-in fade-in duration-200">
      {showDetailedStats && (
        <DetailedStatsModal 
          stats={finalStats} 
          bonusStats={equipBonus} 
          equipment={character.equipment as Record<string, any>} 
          statusEffects={character.statusEffects} 
          name={character.name} 
          shinryokuType={character.shinryokuType} 
          weaponMastery={character.weaponMastery} 
          skills={character.skills}
          bondSkills={(character.bondSkills || []).filter(bs => !bs.sourceId || bs.sourceId === 'player')}
          bondBonus={getBondBonus(character)}
          elementalDamageBoosts={character.base?.elementalDamageBoosts}
          elementalResistanceBoosts={character.base?.elementalResistanceBoosts}
          combatStyle={character.combatStyle}
          onClose={() => setShowDetailedStats(false)} 
        />
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
          isMobile ? 'border-none rounded-none' : 'border border-amber-500/40 rounded-2xl'
        }`}
      >
        {/* Header */}
        <div 
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="cursor-move bg-slate-950 px-3 sm:px-4 py-2 sm:py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 select-none"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30">
              <BarChart2 size={16} className="sm:w-4 sm:h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-amber-400 flex items-center gap-1 flex-wrap">
                <span>능력치</span>
                <span className="text-[9px] bg-slate-800 text-slate-300 font-normal px-1.5 py-0.2 rounded border border-slate-700">Lv.{character.level}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {character.statPoints > 0 ? (
              <span className="text-[11px] sm:text-xs font-bold text-amber-400 bg-amber-950/80 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-amber-500/40 animate-pulse flex items-center gap-1 shadow-md">
                <Sparkles size={13} /> 스탯 포인트: {character.statPoints}
              </span>
            ) : (
              <span className="text-[10px] sm:text-xs text-slate-500 bg-slate-950 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-slate-800">
                보유: 0
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
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
              const isActive = m.key === 'stats';
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => onChangeModal(m.key as any)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black border transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
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

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-4">
            
            {/* Left: Base Stats Allocation */}
            <div className="bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Activity size={14} /> 기본 능력치 배분
                </h3>
                <span className="text-[11px] text-slate-500">항목 클릭 시 설명 확인</span>
              </div>

              {character.pregnancy?.isPregnant && (
                <div className="bg-rose-950/40 border border-rose-900/50 rounded-lg p-2 flex items-center justify-center text-[11px] sm:text-xs text-rose-400 font-bold mb-2 shadow-sm">
                   ⚠️ 임신 디버프 적용 중 (모든 스탯 30% 감소)
                </div>
              )}
              <div className="space-y-2">
                {statList.map(({ key, label, icon: Icon, color, val, equip, buff, mount, style }) => {
                  const isExpanded = activeStatDesc === key;
                  return (
                    <div 
                      key={key}
                      className={`p-3 rounded-xl border transition-all ${isExpanded ? 'bg-slate-900 border-amber-500/40 shadow-md' : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex items-center gap-2.5 cursor-pointer select-none flex-1"
                          onClick={() => setActiveStatDesc(isExpanded ? null : key)}
                        >
                          <div className={`p-1.5 rounded-lg bg-slate-950 border border-slate-800 ${color}`}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-200 flex items-center gap-1">
                              {label}
                              <Info size={11} className="text-slate-500" />
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              {equip > 0 && <span className="text-emerald-400 font-semibold">장비 +{equip}</span>}
                              {style > 0 && <span className="text-purple-400 font-semibold">계열 +{style}</span>}
                              {buff !== 0 && <span className={buff > 0 ? "text-sky-400 font-semibold" : "text-rose-400 font-semibold"}>버프 {buff > 0 ? `+${buff}` : buff}</span>}
                              {mount > 0 && <span className="text-amber-400 font-semibold">탈것 +{mount}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-base font-black font-mono text-slate-100 min-w-[3rem] text-right">
                            {val}
                          </span>

                          {character.statPoints > 0 && (
                            <div className="flex items-center gap-1">
                              {character.statPoints >= 50 && (
                                <button 
                                  onClick={() => onIncreaseStat(key, label, 50)}
                                  className="px-2 py-1 bg-amber-950/90 hover:bg-amber-900 text-amber-100 rounded-lg text-[11px] font-bold border border-amber-400/80 shadow-sm active:scale-95 transition-transform"
                                  title="+50 포인트 투자"
                                >
                                  +50
                                </button>
                              )}
                              {character.statPoints >= 20 && (
                                <button 
                                  onClick={() => onIncreaseStat(key, label, 20)}
                                  className="px-2 py-1 bg-amber-950/85 hover:bg-amber-900 text-amber-200 rounded-lg text-[11px] font-bold border border-amber-500/70 shadow-sm active:scale-95 transition-transform"
                                  title="+20 포인트 투자"
                                >
                                  +20
                                </button>
                              )}
                              {character.statPoints >= 10 && (
                                <button 
                                  onClick={() => onIncreaseStat(key, label, 10)}
                                  className="px-2 py-1 bg-amber-950/80 hover:bg-amber-900 text-amber-200 rounded-lg text-[11px] font-bold border border-amber-500/60 shadow-sm active:scale-95 transition-transform"
                                  title="+10 포인트 투자"
                                >
                                  +10
                                </button>
                              )}
                              {character.statPoints >= 5 && (
                                <button 
                                  onClick={() => onIncreaseStat(key, label, 5)}
                                  className="px-2 py-1 bg-amber-950 hover:bg-amber-900 text-amber-300 rounded-lg text-[11px] font-bold border border-amber-600/50 shadow-sm active:scale-95 transition-transform"
                                  title="+5 포인트 투자"
                                >
                                  +5
                                </button>
                              )}
                              <button 
                                onClick={() => onIncreaseStat(key, label, 1)}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-black shadow-md active:scale-95 transition-transform"
                                title="+1 포인트 투자"
                              >
                                +1
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-2.5 rounded-lg">
                          {STAT_DESCRIPTIONS[key] || "기본 능력치입니다."}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Derived Combat Stats & Details */}
            <div className="space-y-4">
              
              {/* Derived Combat Matrix */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Sword size={16} /> 주요 전투 파생 수치
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">신력: {character.shinryokuType || '없음'}</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <span className="text-[11px] text-red-400 font-medium">물리 공격력 (P.ATK)</span>
                    <span className="text-base font-black text-slate-100 mt-1 font-mono">{derived.pAtk.toFixed(1)}</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <span className="text-[11px] text-purple-400 font-medium">마법 공격력 (M.ATK)</span>
                    <span className="text-base font-black text-slate-100 mt-1 font-mono">{derived.mAtk.toFixed(1)}</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <span className="text-[11px] text-emerald-400 font-medium">물리 방어력 (P.DEF)</span>
                    <span className="text-base font-black text-slate-100 mt-1 font-mono">{derived.pDef.toFixed(1)}</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <span className="text-[11px] text-blue-400 font-medium">마법 방어력 (M.DEF)</span>
                    <span className="text-base font-black text-slate-100 mt-1 font-mono">{derived.mDef.toFixed(1)}</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <span className="text-[11px] text-amber-400 font-medium">치명타율 (Crit Rate)</span>
                    <span className="text-base font-black text-amber-200 mt-1 font-mono">{derived.critChance.toFixed(1)}%</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <span className="text-[11px] text-yellow-400 font-medium">치명타 피해량</span>
                    <span className="text-base font-black text-yellow-200 mt-1 font-mono">{derived.critDamage.toFixed(2)}배</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <span className="text-[11px] text-cyan-400 font-medium">물리 명중률 (P.Acc)</span>
                    <span className="text-base font-black text-slate-100 mt-1 font-mono">{derived.accuracy.toFixed(1)}%</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <span className="text-[11px] text-teal-400 font-medium">물리 회피율 (P.Eva)</span>
                    <span className="text-base font-black text-slate-100 mt-1 font-mono">{derived.evasion.toFixed(1)}%</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <span className="text-[11px] text-indigo-400 font-medium">마법 명중률 (M.Acc)</span>
                    <span className="text-base font-black text-slate-100 mt-1 font-mono">{derived.mAccuracy.toFixed(1)}%</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <span className="text-[11px] text-sky-400 font-medium">마법 회피율 (M.Eva)</span>
                    <span className="text-base font-black text-slate-100 mt-1 font-mono">{derived.mEvasion.toFixed(1)}%</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <span className="text-[11px] text-green-400 font-medium">상태이상 저항</span>
                    <span className="text-base font-black text-green-200 mt-1 font-mono">{derived.statusResist.toFixed(1)}%</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <span className="text-[11px] text-emerald-400 font-medium">치명타 피해 감소</span>
                    <span className="text-base font-black text-emerald-200 mt-1 font-mono">{derived.critDmgResist.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Detailed Stats Modal Trigger */}
              <div className="bg-gradient-to-br from-amber-950/30 to-slate-900 p-5 rounded-2xl border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <Sparkles size={16} /> 고급 전투 분석 및 속성 안내
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  속성 강화/저항 배율, 무기 숙련도 효과, 상태이상 저항 확률 및 전투 계열 심층 수치를 확인합니다.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDetailedStats(true)}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  <BarChart2 size={16} /> 상세 스탯 및 속성 저항 전체보기
                </button>
              </div>

            </div>

          </div>
        </div>

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
            <svg width="10" height="10" viewBox="0 0 10 10" className="text-amber-500/60 fill-current m-0.5 pointer-events-none">
              <path d="M10,0 L0,10 L10,10 Z" />
            </svg>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default StatsModal;
