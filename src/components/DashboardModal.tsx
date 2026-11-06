
import React, { useState } from 'react';
import { Character, Item, Companion, ItemRarity, Stats } from '../types';
import { X, Activity, Backpack, Shield, Users, Sword, Zap, Heart, Brain, User, AlertCircle, Trash2, LayoutGrid, CheckCircle, Box, Award as TitleIcon, Check, Sparkles } from 'lucide-react';
import { calculateTotalStats, calculateDerivedStats, calculateItemPrice, getEnhancedStatValue, calculateFinalStats, getWeaponTypeFromItem, generateDefaultVisualUrl, getBondBonus, calculateInventorySize } from '../utils';
import { STAT_DESCRIPTIONS, SELL_PRICES, SHINRYOKU_UI_CONFIG } from '../constants';
import { TITLES } from '../titles';
import { ItemTooltip } from './CharacterSheet';
import DetailedStatsModal from './DetailedStatsModal';
import { getVisualUrlByJob } from '../services/visualManager';
import { isRealTimeElixir } from '../services/elixirService';

interface Props {
  character: Character;
  onClose: () => void;
  onUseItem: (item: Item, index: number | number[]) => void;
  onEquipItem: (itemIndex: number) => void;
  onUnequipItem: (slot: string) => void;
  onSellItem: (item: Item, index: number | number[]) => void;
  onDiscardItem: (item: Item, index: number | number[]) => void;
  onSelectCompanion: (id: string) => void;
  onSelectMountedMonster?: (id: string) => void;
  onIncreaseStat: (key: string, label: string, amount: number) => void;
  onEquipTitle?: (titleId: string | undefined) => void; // [NEW]
}

type TabType = 'stats' | 'inventory' | 'equipment' | 'companions' | 'titles';

import { getItemImage } from '../services/rpgIconService';

// [HELPER] Format title stat bonuses into clean 1-line string
const formatTitleStats = (title: any) => {
  const STAT_MAP: Record<string, string> = {
    str: '힘', int: '지력', wis: '지능', def: '방어', agi: '민첩', ctrl: '제어',
    maxHp: '최대 HP', maxMp: '최대 MP', pAtk: '물공', mAtk: '마공', pDef: '물방', mDef: '마방',
    critChance: '치명타율', accuracy: '명중률', evasion: '회피율', statusResist: '상태저항'
  };
  const parts: string[] = [];
  if (title.stats) {
    Object.entries(title.stats).forEach(([k, v]) => {
      const label = STAT_MAP[k] || k;
      parts.push(`${label} +${v}`);
    });
  }
  if (title.statMultipliers) {
    Object.entries(title.statMultipliers).forEach(([k, v]) => {
      const label = STAT_MAP[k] || k;
      parts.push(`${label} +${Math.round(Number(v) * 100)}%`);
    });
  }
  return parts.length > 0 ? parts.join(', ') : '능력치 효과 없음';
};

// Helper for stacking items
interface GroupedItem {
    item: Item;
    count: number;
    indices: number[];
}

const groupItems = (inventory: Item[], filter: (i: Item) => boolean): GroupedItem[] => {
    const grouped: Record<string, GroupedItem> = {};
    
    inventory.forEach((item, index) => {
        if (!filter(item)) return;

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

  const RARITY_COLORS: Record<string, string> = {
    [ItemRarity.NORMAL]: 'text-slate-400 border-slate-600',
    [ItemRarity.MAGIC]: 'text-blue-400 border-blue-500',
    [ItemRarity.RARE]: 'text-yellow-400 border-yellow-500',
    [ItemRarity.EPIC]: 'text-purple-400 border-purple-500',
    [ItemRarity.UNIQUE]: 'text-pink-400 border-pink-500',
    [ItemRarity.LEGENDARY]: 'text-amber-500 border-amber-500 shadow-amber-500/20',
    [ItemRarity.MYTHTIC]: 'text-red-700 border-red-700 shadow-red-700/20',
  };
const DashboardModal: React.FC<Props> = ({ 
    character, onClose, onUseItem, onEquipItem, onUnequipItem, onSellItem, onDiscardItem, onSelectCompanion, onSelectMountedMonster, onIncreaseStat , onEquipTitle
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'equip' | 'consumable' | 'etc'>('all');
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);

  const { total: totalStats, bonus: bonusStats } = calculateTotalStats(character);
  const { finalStats: playerFinalStats, buffBonus, equipPercentBonus, activeSets } = calculateFinalStats(character);

  // Calculate Synergy
  let elementalSynergy = false;
  let activeMasteryInfo = undefined;
  let activeSubMasteryInfo = undefined;

  if (character.equipment.weapon) {
      if (character.shinryokuType && character.equipment.weapon.elementalType === character.shinryokuType) {
          elementalSynergy = true;
      }
      // Extract mastery info for consistency with DetailedStatsModal
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

  // Calculate with mastery logic (though Dashboard view is high level, detailed stats handles accurate display)
  const derived = calculateDerivedStats(
      playerFinalStats, 
      character.statusEffects, 
      activeMasteryInfo, 
      activeSubMasteryInfo, 
      elementalSynergy, 
      character.skills, 
      character.equipment,
      character.shinryokuType,
      undefined,
      getBondBonus(character)
  );

  let bonusOptions: string[] = [];
  Object.values(character.equipment).forEach((item: any) => {
      if (item && item.secondaryOptions) {
          bonusOptions = [...bonusOptions, ...item.secondaryOptions];
      }
  });

  const StatBlock = ({ label, value, subValue, icon: Icon, color }: any) => (
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
          <div className="flex items-center text-slate-400">
              <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800 mr-3 ${color} bg-opacity-10`}>
                  <Icon size={20} className={color} />
              </div>
              <span className="font-bold text-sm uppercase">{label}</span>
          </div>
          <div className="text-right">
              <div className="text-xl font-bold text-slate-200 font-mono">{value}</div>
              {subValue && <div className="text-xs text-slate-500 font-mono">{subValue}</div>}
          </div>
      </div>
  );

  const getGroupedInventory = () => {
      const equipTypes = ['Weapon', 'SubWeapon', 'Head', 'Body', 'Feet', 'Hand', 'Accessory', '무기', '보조무기', '투구', '모자', '갑옷', '상의', '하의', '장갑', '신발', '장신구', '반지', '목걸이'];
      const consumTypes = ['Consumable', '소비', '물약', '음식', '소모품'];
      
      return groupItems(character.inventory, (i) => {
          if (inventoryFilter === 'all') return true;
          if (inventoryFilter === 'equip') return equipTypes.some(t => i.type.includes(t));
          if (inventoryFilter === 'consumable') return consumTypes.some(t => i.type.includes(t));
          if (inventoryFilter === 'etc') return !equipTypes.some(t => i.type.includes(t)) && !consumTypes.some(t => i.type.includes(t));
          return true;
      });
  };

  const filteredInventory = getGroupedInventory();

  // Updated Sell logic matching CharacterSheet
  const handleStandardSellClick = (item: Item, indices: number[]) => {
      // @ts-ignore
      onSellItem(item, indices, false);
  };

  const handleSellAllClick = (item: Item, indices: number[]) => {
      // @ts-ignore
      onSellItem(item, indices, true);
  };

  const handleDiscardClick = (item: Item, indices: number[]) => {
      if (indices.length > 1) {
          onDiscardItem(item, indices);
      } else {
          onDiscardItem(item, indices[0]);
      }
  };

  const handleUseClick = (item: Item, indices: number[]) => {
      onUseItem(item, indices);
  };

  // Filter unwanted statuses
  const validStatusEffects = character.statusEffects?.filter(status => {
      if (!status.name || status.name === 'None') return false;
      if (['휴식', '완전 회복', '수면', '잠'].some(k => status.name.includes(k))) return false;
      return true;
  }) || [];

  const playerMessengerVisual = getVisualUrlByJob(character.job, character.gender, character.visualUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-0 md:p-4 font-sans animate-in fade-in duration-300">
      
      {showDetailedStats && (
          <DetailedStatsModal 
            stats={playerFinalStats} 
            bonusStats={bonusStats} 
            equipment={character.equipment as Record<string, Item | undefined>} 
            statusEffects={character.statusEffects} 
            name={character.name} 
            shinryokuType={character.shinryokuType} 
            weaponMastery={character.weaponMastery} 
            skills={character.skills} 
            elementalDamageBoosts={character.base?.elementalDamageBoosts}
            elementalResistanceBoosts={character.base?.elementalResistanceBoosts}
            combatStyle={character.combatStyle}
            onClose={() => setShowDetailedStats(false)} 
          />
      )}

      {/* [NEW] Image Zoom Overlay */}
      {zoomedImg && (
          <div 
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-300"
              onClick={() => setZoomedImg(null)}
          >
              <div className="relative max-w-4xl max-h-full">
                  <img src={zoomedImg} alt="Zoomed" className="w-full h-auto max-h-[85vh] rounded-2xl border border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.4)] animate-in zoom-in duration-300" />
                  <button className="absolute -top-4 -right-4 bg-slate-800 text-white p-2 rounded-full border border-slate-600 hover:bg-slate-700 shadow-xl transition-all">
                      <X size={24} />
                  </button>
                  <div className="mt-4 text-center">
                      <p className="text-amber-500 font-cinzel text-lg font-bold tracking-widest uppercase">외형</p>
                      <p className="text-slate-500 text-xs mt-1">클릭하여 닫기</p>
                  </div>
              </div>
          </div>
      )}

      <div className="bg-slate-950 w-full md:max-w-6xl h-full md:h-[90vh] rounded-none md:rounded-2xl border-0 md:border border-slate-700 shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Header */}
         <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-900 flex justify-between items-center shrink-0">
            <div className="flex items-center min-w-0">
                {playerMessengerVisual && (
                    <div 
                        onClick={() => setZoomedImg(playerMessengerVisual)}
                        className="w-12 h-12 md:w-16 md:h-16 rounded-xl border-2 border-amber-500/30 overflow-hidden shrink-0 mr-3 md:mr-4 shadow-lg cursor-zoom-in hover:border-amber-500 transition-all group"
                    >
                        <img src={playerMessengerVisual} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="Player Avatar" />
                    </div>
                )}
                <div className="min-w-0">
                    <h2 className="text-lg md:text-2xl font-bold text-white font-cinzel truncate">{character.name}</h2>
                    <div className="flex items-center text-[10px] md:text-xs text-slate-500 space-x-1 md:space-x-2 mt-0.5 md:mt-1">
                        <span className="bg-slate-800 px-1.5 md:px-2 py-0.5 rounded border border-slate-700 text-amber-500">Lv.{character.level}</span>
                        <span className="truncate">{character.race}</span>
                        <span className="truncate">{character.classTier}</span>
                        {getBondBonus(character) > 0 && (
                            <span className="text-pink-400 font-bold flex items-center gap-1 bg-pink-950/30 px-2 rounded border border-pink-900/50 animate-pulse">
                                <Heart size={10} className="fill-current"/> 인연 버프 +{Math.round(getBondBonus(character) * 100)}%
                            </span>
                        )}
                    </div>
                </div>
                <div className="hidden lg:flex space-x-4 ml-8">
                    <div className="text-center">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">HP</div>
                        <div className="text-sm font-mono text-red-400 font-bold">{Math.floor(character.stats.hp)}/{playerFinalStats.maxHp}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">MP</div>
                        <div className="text-sm font-mono text-blue-400 font-bold">{Math.floor(character.stats.mp)}/{playerFinalStats.maxMp}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">골드</div>
                        <div className="text-sm font-mono text-amber-400 font-bold">{(character.money || 0).toLocaleString()} G</div>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors shrink-0 ml-2">
                <X size={28} />
            </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 shrink-0 overflow-x-auto">
            {[
                { id: 'stats', label: '상세 스탯', icon: Activity },
                { id: 'equipment', label: '장비', icon: Shield },
                { id: 'titles', label: '칭호', icon: TitleIcon },
                { id: 'inventory', label: '가방', icon: Backpack },
                { id: 'companions', label: '동료 관리', icon: Users },
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex-1 min-w-[120px] py-4 text-sm font-bold flex items-center justify-center transition-all border-b-2 ${activeTab === tab.id ? 'text-amber-500 border-amber-500 bg-slate-800' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                >
                    <tab.icon size={18} className="mr-2" /> {tab.label}
                </button>
            ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900 custom-scrollbar relative">
            
            {/* STATS TAB */}
            {activeTab === 'stats' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-400 uppercase text-sm">기본 능력치</h3>
                            {character.statPoints > 0 && <span className="text-xs bg-amber-900/50 text-amber-300 px-2 py-1 rounded border border-amber-500/30 animate-pulse">Points: {character.statPoints}</span>}
                        </div>
                        <div className="space-y-2">
                            {[
                                { key: 'str', label: '힘', icon: Sword, color: 'text-red-500' },
                                { key: 'int', label: '지력', icon: Zap, color: 'text-purple-500' },
                                { key: 'wis', label: '지능', icon: Brain, color: 'text-blue-500' },
                                { key: 'def', label: '방어', icon: Shield, color: 'text-green-500' },
                                { key: 'agi', label: '민첩', icon: Activity, color: 'text-yellow-500' },
                                { key: 'ctrl', label: '제어', icon: User, color: 'text-cyan-500' },
                            ].map((stat) => (
                                <div key={stat.key} className="flex justify-between items-center p-3 bg-slate-900 rounded border border-slate-800">
                                    <div className="flex items-center text-slate-400 text-sm">
                                        <stat.icon size={16} className={`mr-2 ${stat.color}`} />
                                        <span>{stat.label}</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className="text-right flex flex-col items-end leading-none">
                                            <div className="flex items-center">
                                                <span className="font-bold text-slate-200 font-mono">{playerFinalStats[stat.key as keyof Stats]}</span>
                                                {(bonusStats[stat.key as keyof Stats]! > 0 || (equipPercentBonus && (equipPercentBonus as any)[stat.key] > 0)) && (
                                                    <span className="text-[10px] text-green-500 ml-1">
                                                        (+{bonusStats[stat.key as keyof Stats]! + ((equipPercentBonus as any)?.[stat.key] || 0)})
                                                    </span>
                                                )}
                                            </div>
                                            {buffBonus[stat.key as keyof Stats] !== 0 && (
                                                <span className={`text-[9px] font-bold ${buffBonus[stat.key as keyof Stats]! > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                                    ({buffBonus[stat.key as keyof Stats]! > 0 ? '+' : ''}{buffBonus[stat.key as keyof Stats]} Buff)
                                                </span>
                                            )}
                                        </div>
                                        {character.statPoints > 0 && (
                                            <div className="flex items-center space-x-1">
                                                {character.statPoints >= 10 && (
                                                    <button onClick={() => onIncreaseStat(stat.key, stat.label, 10)} className="px-1.5 h-6 bg-amber-950/80 hover:bg-amber-900 text-amber-200 rounded border border-amber-600/60 text-[10px] font-bold transition-colors" title="+10 포인트 투자">+10</button>
                                                )}
                                                {character.statPoints >= 5 && (
                                                    <button onClick={() => onIncreaseStat(stat.key, stat.label, 5)} className="px-1.5 h-6 bg-slate-800 hover:bg-amber-900 text-amber-400 hover:text-amber-200 rounded border border-slate-700 text-[10px] font-bold transition-colors" title="+5 포인트 투자">+5</button>
                                                )}
                                                <button onClick={() => onIncreaseStat(stat.key, stat.label, 1)} className="w-6 h-6 bg-slate-800 hover:bg-amber-700 text-amber-500 hover:text-white rounded border border-slate-700 flex items-center justify-center text-xs transition-colors" title="+1 포인트 투자">+</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-400 uppercase text-sm">세부 스탯</h3>
                            <button onClick={() => setShowDetailedStats(true)} className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300 border border-slate-700 hover:border-amber-500 hover:text-white transition-colors">상세 보기</button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <StatBlock label="물리공격력" value={derived.pAtk.toFixed(1)} icon={Sword} color="text-red-500" />
                            <StatBlock label="마법공격력" value={derived.mAtk.toFixed(1)} icon={Zap} color="text-purple-500" />
                            <StatBlock label="물리방어력" value={derived.pDef.toFixed(1)} icon={Shield} color="text-slate-400" />
                            <StatBlock label="마법방어력" value={derived.mDef.toFixed(1)} icon={Shield} color="text-blue-400" />
                            <StatBlock label="치명타율" value={`${derived.critChance.toFixed(1)}%`} icon={AlertCircle} color="text-yellow-500" />
                            <StatBlock label="상태이상 저항" value={`${derived.statusResist.toFixed(1)}%`} icon={Shield} color="text-green-500" />
                        </div>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 overflow-y-auto">
                        <h3 className="font-bold text-slate-400 uppercase text-sm mb-4">활성화된 장비 세트 효과</h3>
                        {activeSets && activeSets.length > 0 ? (
                            <div className="space-y-2 mb-6">
                                {activeSets.map((set, idx) => {
                                    const isBoosted = Boolean((set as any).isBoosted || set.name.includes('부스트'));
                                    return (
                                        <div key={idx} className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1 shadow-inner ${
                                            isBoosted
                                                ? 'bg-gradient-to-r from-amber-950/70 via-yellow-950/40 to-amber-950/70 text-amber-200 border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                                                : 'bg-amber-950/40 text-amber-200 border-amber-500/30'
                                        }`}>
                                            <div className="flex justify-between items-center font-bold">
                                                <span className="text-amber-400 flex items-center gap-1">
                                                    {isBoosted && <Sparkles size={13} className="text-amber-300 animate-pulse shrink-0" />}
                                                    {set.name}
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    {isBoosted && (
                                                        <span className="text-[10px] bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black px-1.5 py-0.5 rounded shadow-sm">
                                                            보스부스트 증폭
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] bg-amber-900/60 px-1.5 py-0.5 rounded border border-amber-600/40">
                                                        {set.count} 부위
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-slate-300 text-[11px] leading-relaxed">{set.description}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-slate-600 text-sm italic text-center py-6 border border-slate-900/50 rounded-xl mb-6">활성화된 신화 세트 효과가 없습니다.</p>
                        )}

                        <h3 className="font-bold text-slate-400 uppercase text-sm mb-4">활성화된 개별 보너스</h3>
                        {bonusOptions.length > 0 ? (
                            <div className="space-y-2">
                                {bonusOptions.map((opt, idx) => (
                                    <div key={idx} className="bg-indigo-900/20 text-indigo-300 p-2 rounded border border-indigo-500/30 text-xs flex items-center">
                                        <CheckCircle size={12} className="mr-2" />
                                        {opt}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-600 text-sm italic text-center py-10">활성화된 추가 옵션 보너스가 없습니다.</p>
                        )}
                        
                        <h3 className="font-bold text-slate-400 uppercase text-sm mt-6 mb-4">상태창</h3>
                        {validStatusEffects.length > 0 ? (
                            <div className="space-y-2">
                                {validStatusEffects.map((status, idx) => {
                                    const isElixir = isRealTimeElixir(status);
                                    const formattedDuration = isElixir
                                        ? `${Math.floor(Number(status.duration) / 60)}분${Number(status.duration) % 60 > 0 ? ` ${Number(status.duration) % 60}초` : ''}`
                                        : `${status.duration}턴`;
                                    return (
                                        <div key={idx} className="bg-red-900/20 text-red-300 p-2 rounded border border-red-500/30 text-xs">
                                            <div className="font-bold">{status.name} ({formattedDuration})</div>
                                            <div className="opacity-70">{status.effect}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-slate-600 text-sm italic text-center py-4">정상 상태입니다.</p>
                        )}
                    </div>
                </div>
            )}

            {/* EQUIPMENT TAB */}
            {activeTab === 'equipment' && (
                <div className="flex flex-col h-full items-center justify-center">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-5xl">
                        <div className="lg:col-start-2 flex flex-col items-center space-y-4 relative">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 pointer-events-none rounded-full"></div>
                            
                            <div className="relative group overflow-visible">
                                <div className={`w-24 h-24 rounded-lg border-2 flex items-center justify-center bg-slate-900 relative overflow-hidden ${character.equipment.head ? RARITY_COLORS[character.equipment.head.rarity] || 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-slate-800'}`}>
                                    {character.equipment.head ? <img src={getItemImage(character.equipment.head)} alt="" className="w-full h-full object-cover"/> : <Shield size={32} className="text-slate-700"/>}
                                    <span className="absolute bottom-1 text-[10px] uppercase font-bold text-slate-400 bg-slate-950/80 px-2 rounded">투구</span>
                                </div>
                                {character.equipment.head && (
                                    <>
                                        <ItemTooltip item={character.equipment.head} character={character} />
                                        <button onClick={() => onUnequipItem('head')} className="absolute -top-2 -right-2 bg-red-900 text-red-300 p-1 rounded-full border border-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-20"><X size={12}/></button>
                                    </>
                                )}
                                <div className="text-center mt-1 h-8">
                                    <div className="text-xs font-bold text-slate-300">{character.equipment.head?.name || "빈 슬롯"}</div>
                                    <div className="text-[10px] text-slate-500">{character.equipment.head?.rarity}</div>
                                </div>
                            </div>

                            <div className="flex space-x-12">
                                {/* Hand */}
                                <div className="relative group overflow-visible">
                                <div className={`w-24 h-24 rounded-lg border-2 flex items-center justify-center bg-slate-900 relative overflow-hidden ${character.equipment.hand ? RARITY_COLORS[character.equipment.hand.rarity] || 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-slate-800'}`}>
                                        {character.equipment.hand ? <img src={getItemImage(character.equipment.hand)} alt="" className="w-full h-full object-cover"/> : <Box size={32} className="text-slate-700"/>}
                                        <span className="absolute bottom-1 text-[10px] uppercase font-bold text-slate-400 bg-slate-950/80 px-2 rounded">장갑</span>
                                    </div>
                                    {character.equipment.hand && (
                                        <>
                                            <ItemTooltip item={character.equipment.hand} character={character} />
                                            <button onClick={() => onUnequipItem('hand')} className="absolute -top-2 -right-2 bg-red-900 text-red-300 p-1 rounded-full border border-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-20"><X size={12}/></button>
                                        </>
                                    )}
                                    <div className="text-center mt-1 h-8 text-xs font-bold text-slate-300">{character.equipment.hand?.name || "빈 슬롯"}</div>
                                </div>
                                {/* Body */}
                                <div className="relative group overflow-visible">
                                    <div className={`w-32 h-44 rounded-lg border-2 flex items-center justify-center bg-slate-900 relative overflow-hidden ${character.equipment.body ? RARITY_COLORS[character.equipment.body.rarity] || 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-slate-800'}`}>
                                        {character.equipment.body ? <img src={getItemImage(character.equipment.body)} alt="" className="w-full h-full object-cover"/> : <Shield size={48} className="text-slate-700"/>}
                                        <span className="absolute bottom-1 text-[10px] uppercase font-bold text-slate-400 bg-slate-950/80 px-2 rounded">갑옷</span>
                                    </div>
                                    {character.equipment.body && (
                                        <>
                                            <ItemTooltip item={character.equipment.body} character={character} />
                                            <button onClick={() => onUnequipItem('body')} className="absolute -top-2 -right-2 bg-red-900 text-red-300 p-1 rounded-full border border-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-20"><X size={12}/></button>
                                        </>
                                    )}
                                    <div className="text-center mt-1 h-8 text-xs font-bold text-slate-300">{character.equipment.body?.name || "빈 슬롯"}</div>
                                </div>
                                {/* Weapon */}
                                <div className="relative group overflow-visible">
                                    <div className={`w-24 h-24 rounded-lg border-2 flex items-center justify-center bg-slate-900 relative overflow-hidden ${character.equipment.weapon ? RARITY_COLORS[character.equipment.weapon.rarity] || 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-slate-800'}`}>
                                        {character.equipment.weapon ? <img src={getItemImage(character.equipment.weapon)} alt="" className="w-full h-full object-cover"/> : <Sword size={32} className="text-slate-700"/>}
                                        <span className="absolute bottom-1 text-[10px] uppercase font-bold text-slate-400 bg-slate-950/80 px-2 rounded">주무기</span>
                                    </div>
                                    {character.equipment.weapon && (
                                        <>
                                            <ItemTooltip item={character.equipment.weapon} character={character} />
                                            <button onClick={() => onUnequipItem('weapon')} className="absolute -top-2 -right-2 bg-red-900 text-red-300 p-1 rounded-full border border-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-20"><X size={12}/></button>
                                        </>
                                    )}
                                    {(() => {
                                        const uiConfig = character.equipment.weapon?.elementalType ? (SHINRYOKU_UI_CONFIG[character.equipment.weapon.elementalType] || SHINRYOKU_UI_CONFIG.default) : null;
                                        return (
                                            <div className="text-center mt-1 h-8 text-xs font-bold text-slate-300">
                                                {character.equipment.weapon?.name || "빈 슬롯"}
                                                {character.equipment.weapon?.elementalType && uiConfig && (
                                                    <span className={`block text-[8px] font-bold ${uiConfig.text}`}>[{character.equipment.weapon.elementalType}]</span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div className="flex space-x-12">
                                {/* Accessory */}
                                <div className="relative group overflow-visible">
                                    <div className={`w-24 h-24 rounded-lg border-2 flex items-center justify-center bg-slate-900 relative overflow-hidden ${character.equipment.accessory ? RARITY_COLORS[character.equipment.accessory.rarity] || 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-slate-800'}`}>
                                        {character.equipment.accessory ? <img src={getItemImage(character.equipment.accessory)} alt="" className="w-full h-full object-cover"/> : <Activity size={32} className="text-slate-700"/>}
                                        <span className="absolute bottom-1 text-[10px] uppercase font-bold text-slate-400 bg-slate-950/80 px-2 rounded">장신구</span>
                                    </div>
                                    {character.equipment.accessory && (
                                        <>
                                            <ItemTooltip item={character.equipment.accessory} character={character} />
                                            <button onClick={() => onUnequipItem('accessory')} className="absolute -top-2 -right-2 bg-red-900 text-red-300 p-1 rounded-full border border-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-20"><X size={12}/></button>
                                        </>
                                    )}
                                    <div className="text-center mt-1 h-8 text-xs font-bold text-slate-300">{character.equipment.accessory?.name || "빈 슬롯"}</div>
                                </div>
                                {/* Feet */}
                                <div className="relative group overflow-visible">
                                    <div className={`w-24 h-24 rounded-lg border-2 flex items-center justify-center bg-slate-900 relative overflow-hidden ${character.equipment.feet ? RARITY_COLORS[character.equipment.feet.rarity] || 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-slate-800'}`}>
                                        {character.equipment.feet ? <img src={getItemImage(character.equipment.feet)} alt="" className="w-full h-full object-cover"/> : <Zap size={32} className="text-slate-700"/>}
                                        <span className="absolute bottom-1 text-[10px] uppercase font-bold text-slate-400 bg-slate-950/80 px-2 rounded">신발</span>
                                    </div>
                                    {character.equipment.feet && (
                                        <>
                                            <ItemTooltip item={character.equipment.feet} character={character} />
                                            <button onClick={() => onUnequipItem('feet')} className="absolute -top-2 -right-2 bg-red-900 text-red-300 p-1 rounded-full border border-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-20"><X size={12}/></button>
                                        </>
                                    )}
                                    <div className="text-center mt-1 h-8 text-xs font-bold text-slate-300">{character.equipment.feet?.name || "빈 슬롯"}</div>
                                </div>
                                {/* Sub Weapon */}
                                <div className="relative group overflow-visible">
                                    <div className={`w-24 h-24 rounded-lg border-2 flex items-center justify-center bg-slate-900 relative overflow-hidden ${character.equipment.subWeapon ? RARITY_COLORS[character.equipment.subWeapon.rarity] || 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-slate-800'}`}>
                                        {character.equipment.subWeapon ? <img src={getItemImage(character.equipment.subWeapon)} alt="" className="w-full h-full object-cover"/> : <Shield size={32} className="text-slate-700"/>}
                                        <span className="absolute bottom-1 text-[10px] uppercase font-bold text-slate-400 bg-slate-950/80 px-2 rounded">보조무기</span>
                                    </div>
                                    {character.equipment.subWeapon && (
                                        <>
                                            <ItemTooltip item={character.equipment.subWeapon} character={character} />
                                            <button onClick={() => onUnequipItem('subWeapon')} className="absolute -top-2 -right-2 bg-red-900 text-red-300 p-1 rounded-full border border-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-20"><X size={12}/></button>
                                        </>
                                    )}
                                    <div className="text-center mt-1 h-8 text-xs font-bold text-slate-300">{character.equipment.subWeapon?.name || "빈 슬롯"}</div>
                                </div>
                            </div>

                            {/* [NEW] Mounted Monster Slot */}
                            <div className="mt-8 flex flex-col items-center">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest">장착 탈것</div>
                                <div 
                                    onClick={() => character.mountedMonster && onUnequipItem('mount')}
                                    className={`w-32 h-32 rounded-2xl border-2 flex items-center justify-center bg-slate-950 relative overflow-hidden group transition-all ${character.mountedMonster ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer hover:border-amber-400' : 'border-slate-800 opacity-50'}`}
                                >
                                    {character.mountedMonster ? (
                                        <>
                                            <img src={character.mountedMonster.visualUrl || character.mountedMonster.monsterData?.visualUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                                                <span className="text-[10px] text-red-400 font-bold uppercase">해제</span>
                                            </div>
                                        </>
                                    ) : (
                                        <Activity size={40} className="text-slate-800" />
                                    )}
                                    <span className="absolute top-1 right-1 text-[8px] uppercase font-black text-amber-500/50">탈것</span>
                                </div>
                                <div className="text-center mt-2">
                                    <div className="text-sm font-bold text-slate-200">{character.mountedMonster?.name || "장착된 탈것 없음"}</div>
                                    {character.mountedMonster && <div className="text-[10px] text-slate-500">Lv.{character.mountedMonster.level} {character.mountedMonster.classType}</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TITLES TAB */}
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
                          (보유: <span className="text-amber-400 font-bold">{character.availableTitles?.length || 0}</span> / {Object.keys(TITLES).length}개)
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">달성한 과업의 칭호를 장착하여 추가 능력치를 얻으세요.</p>
                    </div>
                  </div>

                  {/* Currently Equipped Title Display */}
                  <div className="flex items-center gap-2 bg-slate-900/90 px-3.5 py-2 rounded-xl border border-slate-800 text-xs">
                    <span className="text-slate-400 font-medium">착용 중인 칭호:</span>
                    {(() => {
                      const equippedTitle = character.equippedTitleId ? TITLES[character.equippedTitleId] : null;
                      if (equippedTitle) {
                        return (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-300">[{equippedTitle.name}]</span>
                            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-900/40">
                              {formatTitleStats(equippedTitle)}
                            </span>
                            <button 
                              onClick={() => onEquipTitle?.(undefined)}
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
                    const isUnlocked = character.availableTitles?.includes(title.id);
                    const isEquipped = character.equippedTitleId === title.id;
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
                                onClick={() => onEquipTitle?.(undefined)}
                                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold transition-colors"
                              >
                                해제
                              </button>
                            ) : isUnlocked ? (
                              <button 
                                onClick={() => onEquipTitle?.(title.id)}
                                className="px-2.5 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold shadow transition-colors"
                              >
                                장착
                              </button>
                            ) : (
                              <span className="px-1.5 py-0.5 text-slate-400 bg-slate-900 rounded border border-slate-800 text-[9px]">
                                미획득
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

            {/* INVENTORY TAB */}
            {activeTab === 'inventory' && (
                <div className="flex flex-col h-full space-y-3">
                    <div className="flex flex-wrap justify-between items-center gap-2 pb-1 shrink-0">
                        <div className="flex space-x-1.5 sm:space-x-2">
                            {[
                                { key: 'all', label: '전체 보기' },
                                { key: 'equip', label: '장비류' },
                                { key: 'consumable', label: '소비용품' },
                                { key: 'etc', label: '기타' },
                            ].map(f => (
                                <button 
                                    key={f.key}
                                    onClick={() => setInventoryFilter(f.key as any)} 
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        inventoryFilter === f.key 
                                            ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30' 
                                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        <div className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5 shadow-inner">
                            <Backpack size={13} className="text-slate-500" />
                            <span className="text-slate-500">인벤토리:</span>
                            <span className={character.inventory.length >= calculateInventorySize(character.stats) ? 'text-red-400 font-bold' : 'text-amber-400 font-bold'}>
                                {character.inventory.length}
                            </span>
                            <span className="text-slate-600">/</span>
                            <span>{calculateInventorySize(character.stats)}</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 overflow-y-auto custom-scrollbar content-start flex-1 pr-1">
                        {filteredInventory.map((group, idx) => {
                            const { item, count, indices } = group;
                            const sellPrice = calculateItemPrice(item);
                            const isEquippable = ['Weapon', 'SubWeapon', 'Head', 'Body', 'Feet', 'Hand', 'Accessory', '무기', '보조무기', '투구', '모자', '갑옷', '상의', '하의', '장갑', '신발', '장신구', '반지', '목걸이'].some(t => item.type.includes(t));
                            const isConsumable = ['Consumable', '소비', '물약', '음식', '소모품'].some(t => item.type.includes(t));
                            const primaryIndex = indices[0];
                            const uiConfig = item.elementalType ? (SHINRYOKU_UI_CONFIG[item.elementalType] || SHINRYOKU_UI_CONFIG.default) : null;
                            const rarityClass = RARITY_COLORS[item.rarity] || 'text-slate-400 border-slate-700';

                            return (
                                <div 
                                    key={`${item.name}-${idx}`} 
                                    className={`bg-slate-950/80 p-3 rounded-xl border transition-all flex flex-col justify-between group relative overflow-visible hover:bg-slate-900/90 ${
                                        item.rarity === ItemRarity.LEGENDARY ? 'border-amber-500/50 shadow-sm shadow-amber-500/10' :
                                        item.rarity === ItemRarity.MYTHTIC ? 'border-red-600/50 shadow-sm shadow-red-600/10' :
                                        item.rarity === ItemRarity.UNIQUE ? 'border-pink-500/40' :
                                        item.rarity === ItemRarity.EPIC ? 'border-purple-500/40' :
                                        item.rarity === ItemRarity.RARE ? 'border-yellow-500/40' :
                                        item.rarity === ItemRarity.MAGIC ? 'border-blue-500/40' :
                                        'border-slate-800 hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Item Thumbnail (Clean, compact square size) */}
                                        <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 shrink-0 overflow-hidden relative group-hover:border-slate-700 transition-colors">
                                            <img src={getItemImage(item)} alt="" className="w-full h-full object-cover" />
                                            {count > 1 && (
                                                <span className="absolute bottom-0 right-0 bg-slate-950/90 text-amber-400 text-[10px] font-bold px-1 rounded-tl border-t border-l border-slate-700 min-w-[1.25rem] text-center shadow-sm">
                                                    x{count}
                                                </span>
                                            )}
                                        </div>

                                        {/* Item Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <h4 className={`font-bold text-xs sm:text-sm truncate ${
                                                    item.rarity === ItemRarity.LEGENDARY ? 'text-amber-400' :
                                                    item.rarity === ItemRarity.MYTHTIC ? 'text-red-400' :
                                                    item.rarity === ItemRarity.UNIQUE ? 'text-pink-300' :
                                                    item.rarity === ItemRarity.EPIC ? 'text-purple-300' :
                                                    item.rarity === ItemRarity.RARE ? 'text-yellow-300' :
                                                    item.rarity === ItemRarity.MAGIC ? 'text-blue-300' :
                                                    'text-slate-200'
                                                }`}>
                                                    {item.name} {item.enhancement ? `+${item.enhancement}` : ''}
                                                </h4>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-500 mb-1">
                                                <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold uppercase ${rarityClass}`}>
                                                    {item.rarity}
                                                </span>
                                                <span className="text-slate-400">{item.type}</span>
                                                {item.elementalType && uiConfig && (
                                                    <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${uiConfig.bg} ${uiConfig.text} border ${uiConfig.border}`}>
                                                        {item.elementalType}
                                                    </span>
                                                )}
                                            </div>

                                            {item.description && (
                                                <p className="text-[10px] text-slate-500 line-clamp-1 italic">
                                                    "{item.description}"
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Tooltip on hover */}
                                    <ItemTooltip item={item} character={character} />

                                    {/* Actions Toolbar */}
                                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                                        <div className="text-[10px] font-mono text-slate-400">
                                            <span className="text-amber-400/80">{sellPrice.toLocaleString()}</span> G
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            {isEquippable && (
                                                <button 
                                                    onClick={() => onEquipItem(primaryIndex)} 
                                                    className="px-2.5 py-1 bg-indigo-900/50 hover:bg-indigo-800 border border-indigo-700/60 text-indigo-200 hover:text-white rounded text-[10px] font-bold transition-colors"
                                                >
                                                    장착
                                                </button>
                                            )}
                                            {isConsumable && (
                                                <button 
                                                    onClick={() => handleUseClick(item, indices)} 
                                                    className="px-2.5 py-1 bg-emerald-900/50 hover:bg-emerald-800 border border-emerald-700/60 text-emerald-200 hover:text-white rounded text-[10px] font-bold transition-colors"
                                                >
                                                    사용
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleStandardSellClick(item, indices)} 
                                                className="px-2 py-1 bg-slate-900 hover:bg-blue-900/40 border border-slate-800 hover:border-blue-700 text-slate-400 hover:text-blue-300 rounded text-[10px] font-medium transition-colors"
                                                title={`개당 판매 (${sellPrice.toLocaleString()} G)`}
                                            >
                                                판매
                                            </button>
                                            {count > 1 && (
                                                <button 
                                                    onClick={() => handleSellAllClick(item, indices)} 
                                                    className="px-2 py-1 bg-slate-900 hover:bg-blue-950 border border-slate-800 hover:border-blue-600 text-blue-400 rounded text-[10px] font-bold transition-colors"
                                                    title={`전체 판매 (${(sellPrice * count).toLocaleString()} G)`}
                                                >
                                                    전체
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleDiscardClick(item, indices)} 
                                                className="p-1 bg-slate-900 hover:bg-red-900/40 border border-slate-800 hover:border-red-700 text-slate-500 hover:text-red-400 rounded transition-colors"
                                                title="아이템 버리기"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredInventory.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-600">
                                <Backpack size={36} className="mb-2 opacity-20"/>
                                <p className="text-xs">아이템이 없습니다.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* COMPANIONS TAB (Identical logic) */}
            {activeTab === 'companions' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {((character.companions || []).filter(c => c && !c.isMountedAsMount).length > 0) ? (
                        (character.companions || []).filter(c => c && !c.isMountedAsMount).map((comp, idx) => {
                            // [MODIFIED] visualUrl 혹은 메신저 혹은 몬스터/수호수 이미지 우선 표시
                            const monsterVisual = comp.monsterData?.visualUrl;
                            const defaultVisualUrl = comp.defaultVisualUrl || generateDefaultVisualUrl(comp.name, comp.nation || '기타', comp.race, comp.gender);
                            const displayVisual = getVisualUrlByJob(comp.job, comp.gender, comp.visualUrl || monsterVisual || defaultVisualUrl);

                            const { finalStats: compFinalStats } = calculateFinalStats(comp);

                            return (
                                <div key={comp.id} onClick={() => onSelectCompanion(comp.id)} className={`bg-slate-950 p-5 rounded-xl border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all group relative overflow-hidden ${comp.isLover ? 'border-pink-500/30' : ''}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center">
                                            <div 
                                                onClick={(e) => { e.stopPropagation(); displayVisual && setZoomedImg(displayVisual); }}
                                                className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center mr-3 bg-slate-900 overflow-hidden ${displayVisual ? 'cursor-zoom-in border-amber-500/50' : 'border-slate-700 text-slate-500'}`}
                                            >
                                                {displayVisual ? (
                                                    <img src={displayVisual} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="Companion Visual" />
                                                ) : (
                                                    <User size={24} />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-200 text-lg flex items-center">
                                                    {comp.name}
                                                    {comp.isLover && <Heart size={14} className="ml-2 text-pink-500 fill-pink-500 animate-pulse"/>}
                                                </h4>
                                                <div className="text-xs text-slate-500">Lv.{comp.level} {comp.classType}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs font-mono text-slate-600 bg-slate-900 px-2 py-1 rounded">
                                            {comp.race}
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2 mb-4">
                                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                                            <div className="bg-red-600 h-full" style={{ width: `${(comp.stats.hp / compFinalStats.maxHp) * 100}%` }}></div>
                                        </div>
                                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                                            <div className="bg-blue-600 h-full" style={{ width: `${(comp.stats.mp / compFinalStats.maxMp) * 100}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-4 bg-slate-900/50 p-2 rounded">
                                        <div className="flex justify-between"><span>STR</span> <span className="font-mono text-slate-200">{compFinalStats.str}</span></div>
                                        <div className="flex justify-between"><span>INT</span> <span className="font-mono text-slate-200">{compFinalStats.int}</span></div>
                                        <div className="flex justify-between"><span>DEF</span> <span className="font-mono text-slate-200">{compFinalStats.def}</span></div>
                                        <div className="flex justify-between"><span>AGI</span> <span className="font-mono text-slate-200">{compFinalStats.agi}</span></div>
                                    </div>

                                    <button className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-400 border border-slate-800 hover:border-amber-500/30 rounded text-xs transition-colors">
                                        상세 관리
                                    </button>
                                </div>
                            )
                        })
                    ) : (
                        <div className="col-span-full flex flex-col items-center justify-center h-64 text-slate-600">
                            <Users size={48} className="mb-4 opacity-20"/>
                            <p>현재 함께하는 동료가 없습니다.</p>
                        </div>
                    )}
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default React.memo(DashboardModal);
