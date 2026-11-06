import React, { useState } from 'react';
import { Character, BlackMarketItem, ItemRarity, Item } from '../types';
import { X, Coins, Sparkles, Package, ShoppingBag, Eye, ShieldAlert, Check } from 'lucide-react';
import { calculateInventorySize } from '../utils';
import { ItemTooltip } from './CharacterSheet';
import { getItemDisplayImageUrl } from '../ItemData';

interface Props {
  character: Character;
  onClose: () => void;
  onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const RARITY_STYLES: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  [ItemRarity.NORMAL]: { border: 'border-slate-800 hover:border-slate-600', bg: 'bg-slate-950/80', text: 'text-slate-300', badge: 'bg-slate-800 text-slate-300 border-slate-700' },
  [ItemRarity.MAGIC]: { border: 'border-blue-800/60 hover:border-blue-500/80', bg: 'bg-blue-950/20', text: 'text-blue-300', badge: 'bg-blue-950 text-blue-300 border-blue-700' },
  [ItemRarity.RARE]: { border: 'border-yellow-700/60 hover:border-yellow-500/80', bg: 'bg-yellow-950/20', text: 'text-yellow-300', badge: 'bg-yellow-950 text-yellow-300 border-yellow-700' },
  [ItemRarity.EPIC]: { border: 'border-purple-700/60 hover:border-purple-500/80', bg: 'bg-purple-950/20', text: 'text-purple-300', badge: 'bg-purple-950 text-purple-300 border-purple-700' },
  [ItemRarity.UNIQUE]: { border: 'border-pink-700/60 hover:border-pink-500/80', bg: 'bg-pink-950/20', text: 'text-pink-300', badge: 'bg-pink-950 text-pink-300 border-pink-700' },
  [ItemRarity.LEGENDARY]: { border: 'border-amber-500/80 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]', bg: 'bg-amber-950/30', text: 'text-amber-300', badge: 'bg-amber-950 text-amber-300 border-amber-600' },
  [ItemRarity.MYTHTIC]: { border: 'border-red-600/80 hover:border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]', bg: 'bg-red-950/30', text: 'text-red-400', badge: 'bg-red-950 text-red-400 border-red-600' },
};

export const BlackMarketModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter }) => {
  const blackMarket = character.activeBlackMarket;
  const [selectedItem, setSelectedItem] = useState<{ item: BlackMarketItem; index: number } | null>(null);
  const [buyCount, setBuyCount] = useState<number>(1);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  if (!blackMarket) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-center text-slate-300">
          <ShieldAlert size={48} className="mx-auto text-amber-500 mb-3" />
          <h3 className="text-xl font-bold text-white mb-2">특별상점 정보 없음</h3>
          <p className="text-sm text-slate-400 mb-6">현재 이 지역에서는 열린 특별상점이 없습니다.</p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  const items = blackMarket.items || [];
  const maxInvSize = calculateInventorySize(character.stats);
  const currentInvSize = character.inventory ? character.inventory.length : 0;

  const handleOpenBuy = (item: BlackMarketItem, index: number) => {
    if (item.stock <= 0) return;
    setSelectedItem({ item, index });
    setBuyCount(1);
    setNoticeMessage(null);
  };

  const handleConfirmPurchase = () => {
    if (!selectedItem) return;
    const { item, index } = selectedItem;
    const count = buyCount;

    if (count <= 0 || count > item.stock) {
      setNoticeMessage("구매 수량이 올바르지 않습니다.");
      return;
    }

    const totalPrice = (item.price || 0) * count;
    if (character.money < totalPrice) {
      setNoticeMessage("골드가 부족합니다.");
      return;
    }

    // 인벤토리 확인 (일반 아이템인 경우)
    if (!item.resourceGain) {
      if (currentInvSize + count > maxInvSize) {
        setNoticeMessage("인벤토리 공간이 부족합니다.");
        return;
      }
    }

    const newChar: Character = JSON.parse(JSON.stringify(character));
    newChar.money -= totalPrice;

    // 1. 자원 지급 또는 인벤토리 추가
    let purchaseLog = "";
    if (item.resourceGain) {
      const resType = item.resourceGain.resourceType;
      const totalGain = item.resourceGain.amount * count;

      if (!newChar.base) {
        newChar.base = {
          level: 1,
          gridSize: 5,
          layout: [],
          resources: {
            gold: 0, food: 0, wood: 0, stone: 0, iron: 0, manaStone: 0, manaCrystal: 0, herbs: 0,
            normalCrystal: 0, magicCrystal: 0, rareCrystal: 0, epicCrystal: 0, uniqueCrystal: 0, legendaryCrystal: 0
          },
          residents: [],
          facilities: [],
          assignments: {},
          storage: [],
          facilityLevels: {},
          dailyCounts: {},
          elementalShards: {},
          capturedMonsters: []
        };
      }
      if (!newChar.base.resources) {
        newChar.base.resources = {
          gold: 0, food: 0, wood: 0, stone: 0, iron: 0, manaStone: 0, manaCrystal: 0, herbs: 0,
          normalCrystal: 0, magicCrystal: 0, rareCrystal: 0, epicCrystal: 0, uniqueCrystal: 0, legendaryCrystal: 0
        };
      }

      if (resType === 'magicStone') {
        newChar.base.resources.manaStone = (newChar.base.resources.manaStone || 0) + totalGain;
        purchaseLog = `[특별상점 거래] ${item.name} ${count}개 구매 (${totalPrice.toLocaleString()}G) -> 마정석 +${totalGain} 획득!`;
      } else if (resType === 'manaCrystal') {
        newChar.base.resources.manaCrystal = (newChar.base.resources.manaCrystal || 0) + totalGain;
        purchaseLog = `[특별상점 거래] ${item.name} ${count}개 구매 (${totalPrice.toLocaleString()}G) -> 마석 +${totalGain} 획득!`;
      } else if (resType === 'shinryokuFlower') {
        newChar.base.resources.shinryoku_flower = (newChar.base.resources.shinryoku_flower || 0) + totalGain;
        purchaseLog = `[특별상점 거래] ${item.name} ${count}개 구매 (${totalPrice.toLocaleString()}G) -> 신력꽃 +${totalGain} 획득!`;
      } else if (resType === 'specialOre') {
        newChar.base.resources.iron = (newChar.base.resources.iron || 0) + totalGain;
        newChar.base.resources.rareCrystal = (newChar.base.resources.rareCrystal || 0) + totalGain;
        purchaseLog = `[특별상점 거래] ${item.name} ${count}개 구매 (${totalPrice.toLocaleString()}G) -> 특수 광석 +${totalGain} 획득!`;
      }
    } else {
      if (!newChar.inventory) newChar.inventory = [];
      for (let i = 0; i < count; i++) {
        const itemCopy: Item = {
          name: item.name,
          type: item.type,
          rarity: item.rarity,
          description: item.description,
          price: item.price,
          stats: item.stats ? { ...item.stats } : undefined,
          enhancement: item.enhancement || 0,
          imageUrl: item.imageUrl,
          weaponType: item.weaponType,
          elementalType: item.elementalType,
          secondaryOptions: item.secondaryOptions ? [...item.secondaryOptions] : undefined,
          mythicOption: item.mythicOption
        };
        newChar.inventory.push(itemCopy);
      }
      purchaseLog = `[특별상점 거래] ${item.name} ${count}개 구매 완료 (${totalPrice.toLocaleString()}G)`;
    }

    // 2. 암시장 재고 차감
    if (newChar.activeBlackMarket && newChar.activeBlackMarket.items[index]) {
      newChar.activeBlackMarket.items[index].stock -= count;
    }

    onUpdateCharacter(newChar, purchaseLog);
    setSelectedItem(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-gradient-to-b from-slate-900 via-purple-950/40 to-slate-950 border-2 border-purple-600/70 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(147,51,234,0.35)] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-purple-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-900/60 border border-purple-500/60 text-purple-300 shadow-inner">
              <ShoppingBag size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white font-cinzel tracking-wider">
                  비밀 특별상점
                </h3>
                <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-purple-900/90 text-purple-200 border border-purple-500/80">
                  한정 비밀 거래소
                </span>
              </div>
              <p className="text-xs text-purple-300/80 mt-0.5">
                {blackMarket.nation} {blackMarket.city}의 외곽 은신처에서 밀매되는 특별한 물품들입니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-400 font-mono font-bold text-sm">
              <Coins size={16} />
              <span>{(character.money || 0).toLocaleString()} G</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
              aria-label="닫기"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Mobile Money Bar */}
        <div className="sm:hidden px-4 py-2 bg-slate-950/90 border-b border-purple-900/40 flex items-center justify-between text-xs">
          <span className="text-slate-400">보유 자금</span>
          <div className="flex items-center gap-1 text-amber-400 font-mono font-bold">
            <Coins size={14} />
            <span>{(character.money || 0).toLocaleString()} G</span>
          </div>
        </div>

        {/* Notice Info Banner */}
        <div className="px-4 py-2.5 bg-purple-950/40 border-b border-purple-900/30 flex items-center justify-between text-xs text-purple-200/90">
          <span className="flex items-center gap-1.5 font-medium">
            <Sparkles size={14} className="text-amber-400" />
            타 대륙의 고유 특산품과 희귀 자원을 수량 한정으로 판매합니다. (매달 1일 갱신)
          </span>
          <span className="text-[11px] text-purple-300/70 font-mono">
            인벤토리: {currentInvSize}/{maxInvSize}
          </span>
        </div>

        {/* Items Grid */}
        <div className="flex-1 p-3 sm:p-5 overflow-y-auto custom-scrollbar">
          {items.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Package size={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">현재 판매 중인 특별상점 물품이 모두 소진되었습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((item, index) => {
                const style = RARITY_STYLES[item.rarity] || RARITY_STYLES[ItemRarity.NORMAL];
                const isOutOfStock = item.stock <= 0;
                const img = item.imageUrl || getItemDisplayImageUrl(item);

                return (
                  <div
                    key={`${item.name}-${index}`}
                    className={`relative p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                      isOutOfStock
                        ? 'bg-slate-950/40 border-slate-800 opacity-60'
                        : `${style.bg} ${style.border} shadow-md hover:scale-[1.01]`
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-700/80 p-1 flex items-center justify-center shrink-0 overflow-hidden relative group">
                            <img
                              src={img}
                              alt={item.name}
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                            {/* Hover Tooltip for gear */}
                            {!item.resourceGain && (
                              <div className="hidden group-hover:block absolute top-0 left-full ml-2 z-50 w-64 pointer-events-none">
                                <ItemTooltip item={item} character={character} />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${style.badge}`}>
                                {item.rarity}
                              </span>
                              {item.resourceGain && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700">
                                  특수 자원
                                </span>
                              )}
                              {item.originNation && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                                  {item.originNation}
                                </span>
                              )}
                            </div>
                            <h4 className={`text-sm font-black truncate mt-1 ${style.text}`}>
                              {item.name}
                            </h4>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-300/90 leading-relaxed mb-3 line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    {/* Footer: Price, Stock, Buy Button */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1 text-amber-400 font-mono font-bold text-xs">
                          <Coins size={13} />
                          <span>{(item.price || 0).toLocaleString()} G</span>
                        </div>
                        <span className={`text-[11px] font-bold ${item.stock > 0 ? 'text-purple-300' : 'text-red-400'}`}>
                          {item.stock > 0 ? `재고: ${item.stock}/${item.maxStock || item.stock}개` : '품절'}
                        </span>
                      </div>

                      <button
                        onClick={() => handleOpenBuy(item, index)}
                        disabled={isOutOfStock || character.money < (item.price || 0)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isOutOfStock
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : character.money < (item.price || 0)
                            ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg hover:shadow-purple-500/30 active:scale-95'
                        }`}
                      >
                        {isOutOfStock ? '품절' : '구매'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Purchase Confirmation Modal (Mobile Optimized) */}
        {selectedItem && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border-2 border-purple-500 rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-fade-in flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <h4 className="text-base font-black text-white flex items-center gap-2">
                  <ShoppingBag size={18} className="text-purple-400" />
                  구매 수량 선택
                </h4>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <img
                  src={selectedItem.item.imageUrl || getItemDisplayImageUrl(selectedItem.item)}
                  alt={selectedItem.item.name}
                  className="w-12 h-12 object-contain rounded-lg bg-slate-900 border border-slate-700 p-1 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0 flex-1">
                  <h5 className="text-sm font-bold text-white truncate">{selectedItem.item.name}</h5>
                  <p className="text-xs text-amber-400 font-mono">단가: {(selectedItem.item.price || 0).toLocaleString()} G</p>
                  <p className="text-[11px] text-purple-300 font-mono">남은 재고: {selectedItem.item.stock}개</p>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="mb-4">
                <label className="text-xs text-slate-400 mb-1.5 block">수량 조절</label>
                <div className="flex items-center justify-between bg-slate-950 border border-slate-700 rounded-xl p-1.5">
                  <button
                    onClick={() => setBuyCount(Math.max(1, buyCount - 1))}
                    disabled={buyCount <= 1}
                    className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-lg flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-base text-white">{buyCount}</span>
                  <button
                    onClick={() => setBuyCount(Math.min(selectedItem.item.stock, buyCount + 1))}
                    disabled={buyCount >= selectedItem.item.stock}
                    className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-lg flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Price Calculation */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-purple-900/40 mb-4 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>총 필요 금액:</span>
                  <span className="text-amber-400 font-mono font-bold">
                    {((selectedItem.item.price || 0) * buyCount).toLocaleString()} G
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>보유 골드:</span>
                  <span className="text-slate-200 font-mono">
                    {(character.money || 0).toLocaleString()} G
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                  <span>구매 후 잔액:</span>
                  <span className={`font-mono font-bold ${character.money >= (selectedItem.item.price || 0) * buyCount ? 'text-emerald-400' : 'text-red-400'}`}>
                    {(character.money - (selectedItem.item.price || 0) * buyCount).toLocaleString()} G
                  </span>
                </div>
              </div>

              {noticeMessage && (
                <p className="text-xs text-red-400 font-medium mb-3 text-center">
                  {noticeMessage}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleConfirmPurchase}
                  disabled={character.money < (selectedItem.item.price || 0) * buyCount}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-purple-600/30"
                >
                  구매 확인
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
