import React, { useState, useMemo } from 'react';
import { Item, ItemRarity } from '../types';
import { X, Trash2, Shield, Package, Sparkles, AlertTriangle, Check } from 'lucide-react';

export type DismantleCategory = 'equipment' | 'consumable' | 'etc';

export const RARITY_SCORE: Record<ItemRarity, number> = {
  [ItemRarity.NORMAL]: 1,
  [ItemRarity.MAGIC]: 2,
  [ItemRarity.RARE]: 3,
  [ItemRarity.EPIC]: 4,
  [ItemRarity.UNIQUE]: 5,
  [ItemRarity.LEGENDARY]: 6,
  [ItemRarity.MYTHTIC]: 7,
};

export const classifyItemCategory = (item: Item): DismantleCategory => {
  const isEquip =
    ['Weapon', 'SubWeapon', 'Armor', 'Accessory', 'Head', 'Body', 'Hand', 'Feet', 'Shield'].some(t =>
      item.type?.includes(t)
    ) ||
    ['무기', '방어구', '장신구', '투구', '갑옷', '장갑', '신발', '보조무기', '방패'].some(t =>
      item.type?.includes(t)
    );
  if (isEquip) return 'equipment';

  const isConsumable =
    item.type === 'Consumable' ||
    item.type?.includes('소비') ||
    item.type?.includes('포션') ||
    item.type?.includes('주문서') ||
    item.type?.includes('음식');
  if (isConsumable) return 'consumable';

  return 'etc';
};

export interface YieldDisplayItem {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ReactNode;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  allowedCategories: DismantleCategory[];
  inventory: Item[];
  calculateYield: (items: Item[]) => YieldDisplayItem[];
  onConfirm: (targetIndices: number[]) => void;
  themeColor?: 'purple' | 'red';
}

const RARITY_OPTIONS: { rarity: ItemRarity; label: string; activeColor: string }[] = [
  { rarity: ItemRarity.NORMAL, label: '노말 이하', activeColor: 'bg-slate-700 text-white border-slate-500' },
  { rarity: ItemRarity.MAGIC, label: '마법 이하', activeColor: 'bg-blue-900 text-blue-100 border-blue-500' },
  { rarity: ItemRarity.RARE, label: '레어 이하', activeColor: 'bg-amber-900 text-amber-100 border-amber-500' },
  { rarity: ItemRarity.EPIC, label: '에픽 이하', activeColor: 'bg-purple-900 text-purple-100 border-purple-500' },
  { rarity: ItemRarity.UNIQUE, label: '유니크 이하', activeColor: 'bg-pink-900 text-pink-100 border-pink-500' },
];

const CATEGORY_META: Record<DismantleCategory, { label: string; icon: typeof Package }> = {
  equipment: { label: '장비', icon: Shield },
  consumable: { label: '소비', icon: Sparkles },
  etc: { label: '기타', icon: Package },
};

export const BulkDismantleModal: React.FC<Props> = ({
  isOpen,
  onClose,
  title,
  description,
  allowedCategories,
  inventory,
  calculateYield,
  onConfirm,
  themeColor = 'purple',
}) => {
  const [selectedMaxRarity, setSelectedMaxRarity] = useState<ItemRarity>(ItemRarity.RARE);
  const [selectedCategories, setSelectedCategories] = useState<Record<DismantleCategory, boolean>>({
    equipment: allowedCategories.includes('equipment'),
    consumable: allowedCategories.includes('consumable'),
    etc: allowedCategories.includes('etc'),
  });

  const toggleCategory = (cat: DismantleCategory) => {
    setSelectedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Filter Target Items
  const targetEntries = useMemo(() => {
    const maxScore = RARITY_SCORE[selectedMaxRarity] || 3;
    const targets: { item: Item; idx: number }[] = [];

    inventory.forEach((item, idx) => {
      if (!item) return;
      if (item.rarity === ItemRarity.MYTHTIC) return;
      if ((item as any).isEquipped) return;
      if (item.locked) return;

      const score = RARITY_SCORE[item.rarity] || 1;
      if (score > maxScore) return;

      const cat = classifyItemCategory(item);
      if (!allowedCategories.includes(cat)) return;
      if (!selectedCategories[cat]) return;

      targets.push({ item, idx });
    });

    return targets;
  }, [inventory, selectedMaxRarity, selectedCategories, allowedCategories]);

  const targetItems = useMemo(() => targetEntries.map(e => e.item), [targetEntries]);
  const targetIndices = useMemo(() => targetEntries.map(e => e.idx), [targetEntries]);

  const yieldData = useMemo(() => {
    if (targetItems.length === 0) return [];
    return calculateYield(targetItems);
  }, [targetItems, calculateYield]);

  if (!isOpen) return null;

  const isRed = themeColor === 'red';

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className={`p-3.5 sm:p-4 border-b flex items-center justify-between shrink-0 ${
            isRed ? 'border-red-500/30 bg-red-950/30' : 'border-purple-500/30 bg-purple-950/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <Trash2 className={isRed ? 'text-red-400' : 'text-purple-400'} size={20} />
            <h3 className="text-base sm:text-lg font-bold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar">
          <p className="text-xs text-slate-300 leading-relaxed">{description}</p>

          {/* Rarity Selector */}
          <div className="bg-slate-950/60 p-3 sm:p-3.5 rounded-xl border border-slate-800">
            <label className="text-xs font-bold text-slate-400 block mb-2">분해 기준 등급 선택</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
              {RARITY_OPTIONS.map(opt => {
                const isSelected = selectedMaxRarity === opt.rarity;
                return (
                  <button
                    key={opt.rarity}
                    type="button"
                    onClick={() => setSelectedMaxRarity(opt.rarity)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? opt.activeColor + ' shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {isSelected && <Check size={13} className="shrink-0" />}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Selector */}
          <div className="bg-slate-950/60 p-3 sm:p-3.5 rounded-xl border border-slate-800">
            <label className="text-xs font-bold text-slate-400 block mb-2">분해 대상 품목 선택</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {allowedCategories.map(cat => {
                const isChecked = selectedCategories[cat];
                const meta = CATEGORY_META[cat];
                const IconComponent = meta.icon;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-between ${
                      isChecked
                        ? isRed
                          ? 'bg-red-900/60 text-red-200 border-red-500 shadow-sm'
                          : 'bg-purple-900/60 text-purple-200 border-purple-500 shadow-sm'
                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <IconComponent size={14} />
                      <span>{meta.label}</span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isChecked
                          ? isRed
                            ? 'bg-red-600 border-red-400 text-white'
                            : 'bg-purple-600 border-purple-400 text-white'
                          : 'border-slate-700 bg-slate-950'
                      }`}
                    >
                      {isChecked && <Check size={11} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Yield and Summary Card */}
          <div className="bg-slate-950 p-3.5 sm:p-4 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-xs font-bold text-slate-400">분해 대상 아이템</span>
              <span className="text-sm font-bold text-amber-400 font-mono">{targetItems.length}개</span>
            </div>

            {targetItems.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-400">예상 획득 자원</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {yieldData.map((y, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-2 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        {y.icon}
                        <span>{y.label}</span>
                      </div>
                      <span className={`text-xs font-bold font-mono ${y.color || 'text-white'}`}>{y.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-slate-500">
                조건에 맞는 분해 대상 아이템이 없습니다.
              </div>
            )}
          </div>

          {/* Caution Note */}
          <div className="flex items-start gap-2 text-[11px] text-amber-400/80 bg-amber-950/20 p-2.5 rounded-lg border border-amber-900/40">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-400" />
            <span>분해된 아이템은 즉시 소멸하며 복구할 수 없습니다. 장착 중인 아이템, 잠금 설정된 아이템 및 신화 등급은 보호됩니다.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs sm:text-sm font-bold transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              if (targetIndices.length === 0) return;
              onConfirm(targetIndices);
            }}
            disabled={targetIndices.length === 0}
            className={`flex-[2] py-3 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all disabled:bg-slate-800 disabled:text-slate-600 ${
              isRed
                ? 'bg-red-800 hover:bg-red-700 active:scale-98'
                : 'bg-purple-800 hover:bg-purple-700 active:scale-98'
            }`}
          >
            {targetIndices.length > 0 ? `${targetIndices.length}개 일괄 분해하기` : '분해할 아이템 없음'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkDismantleModal;
