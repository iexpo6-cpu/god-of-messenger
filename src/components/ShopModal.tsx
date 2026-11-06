import React, { useState, useEffect, useMemo } from 'react';
import { Item, Character, ItemRarity } from '../types';
import { X, Coins, ShoppingBag, Plus, Minus, Backpack, AlertTriangle, Lock, Search, Filter, ArrowUpRight, MessageSquare, Sparkles, Sword, Shield, Package, Heart, Tag, Check, RefreshCw, Hammer, Target, Crosshair, Scroll, Activity } from 'lucide-react';
import { calculateItemPrice, calculateInventorySize, getWeaponTypeFromItem } from '../utils';
import { ItemTooltip } from './CharacterSheet';
import { SHINRYOKU_UI_CONFIG } from '../constants';
import { getItemDisplayImageUrl } from '../ItemData';

interface Props {
  title: string;
  items: Item[];
  character: Character;
  onBuy: (item: Item, unitPrice: number, quantity: number) => void;
  onClose: () => void;
  onSell?: (itemIndices: number[], unitPrice: number, quantity: number) => void;
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

// 상점 분위기에 맞는 상인 정보 맵
const MERCHANT_PROFILES: Record<string, { name: string; title: string; avatar: string; quote: string; greeting: string }> = {
  default: {
    name: '만물상인 반스',
    title: '황실 인증 만물 상점 대표',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=MerchantVance&backgroundColor=0f172a',
    quote: '좋은 무기는 목숨을 구하고, 양질의 포션은 기적을 만든다네!',
    greeting: '어서오게나, 여행자! 오늘 입고된 희귀 보물들을 구경해보겠나?'
  },
  weapon: {
    name: '대장장이 발도르',
    title: '전설의 무기 명장',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=BlacksmithBaldor&backgroundColor=1e1b4b',
    quote: '내 망치질 한 번에 철검 하나가 명검으로 거듭나지.',
    greeting: '자네 자루를 채워줄 날카로운 강철 무기들이 완벽히 준비되어 있다네!'
  },
  armor: {
    name: '방어구 장인 헬레나',
    title: '황실 공인 방어구 명장',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ArmorerHelena&backgroundColor=1e293b',
    quote: '단단한 갑옷과 방패는 전장에서 가장 든든한 동료라네.',
    greeting: '어서오게나! 생명을 지켜줄 견고한 방어구들을 둘러보게.'
  },
  magic: {
    name: '대마법사 로제타',
    title: '아케인 만물 상점 주인',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=SorceressRosetta&backgroundColor=311b92',
    quote: '신비한 마력이 머문 물품일수록 자네의 지혜를 빛내줄 것이라네.',
    greeting: '마력의 향기가 느껴지는군요. 자네에게 딱 맞는 마법 물품이 기다리고 있어요.'
  }
};

type TabMode = 'buy' | 'sell';

export const ShopModal: React.FC<Props> = ({ title, items, character, onBuy, onClose, onSell }) => {
  const [activeTab, setActiveTab] = useState<TabMode>('buy');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [shopInventory, setShopInventory] = useState<Item[]>([]);
  
  // merchant dialog state
  const [merchantQuote, setMerchantQuote] = useState<string>('');
  
  // Selection / Quantity Modal State
  const [selectedBuyItem, setSelectedBuyItem] = useState<{ item: Item; index: number } | null>(null);
  const [selectedSellGroup, setSelectedSellGroup] = useState<{ item: Item; count: number; originalIndices: number[] } | null>(null);
  const [transactionQuantity, setTransactionQuantity] = useState(1);

  // 상점 종류 구분
  const shopType = useMemo<'weapon' | 'armor' | 'general'>(() => {
    if (title.includes('무기') || title.includes('대장간')) return 'weapon';
    if (title.includes('방어구')) return 'armor';
    return 'general';
  }, [title]);

  // 상점 카테고리 목록 정의
  const categoryList = useMemo<{ id: string; label: string; icon: React.FC<any> }[]>(() => {
    if (shopType === 'weapon') {
      return [
        { id: 'all', label: '전체', icon: Package },
        { id: 'sword', label: '검', icon: Sword },
        { id: 'spear', label: '창', icon: Crosshair },
        { id: 'blunt', label: '둔기', icon: Hammer },
        { id: 'axe', label: '도끼', icon: Hammer },
        { id: 'bow', label: '활', icon: Target },
        { id: 'staff', label: '지팡이', icon: Sparkles },
        { id: 'knuckle', label: '격투', icon: Activity },
        { id: 'gun', label: '총기', icon: Crosshair },
        { id: 'other_weapon', label: '기타', icon: Package },
      ];
    }
    if (shopType === 'armor') {
      return [
        { id: 'all', label: '전체', icon: Package },
        { id: 'head', label: '머리', icon: Shield },
        { id: 'body', label: '갑옷', icon: Shield },
        { id: 'hand', label: '장갑', icon: Shield },
        { id: 'feet', label: '신발', icon: Activity },
        { id: 'subweapon', label: '방패', icon: Shield },
        { id: 'accessory', label: '악세사리', icon: Sparkles },
      ];
    }
    // 잡화점
    return [
      { id: 'all', label: '전체', icon: Package },
      { id: 'consumable', label: '소모품', icon: Heart },
      { id: 'scroll', label: '주문서', icon: Scroll },
      { id: 'accessory', label: '악세사리', icon: Sparkles },
      { id: 'etc', label: '기타', icon: Package },
    ];
  }, [shopType]);

  // 상인 프로필 선택
  const merchant = useMemo(() => {
    if (shopType === 'weapon') return MERCHANT_PROFILES.weapon;
    if (shopType === 'armor') return MERCHANT_PROFILES.armor;
    if (title.includes('마법') || title.includes('연금술')) return MERCHANT_PROFILES.magic;
    return MERCHANT_PROFILES.default;
  }, [shopType, title]);

  useEffect(() => {
    setShopInventory(items.map(item => ({ ...item })));
    setMerchantQuote(merchant.greeting);
  }, [items, merchant]);

  // 계산된 인벤토리 여유 공간
  const maxInventorySize = calculateInventorySize(character.stats);
  const isInventoryFull = character.inventory.length >= maxInventorySize;

  // 구매 물품 가격 계산 함수 (평판 할인 반영)
  const getCalculatedPrice = (item: Item) => {
    let price = item.price !== undefined ? item.price : calculateItemPrice(item) * 2;
    if (item.reputationPriceMod) {
      const rep = item.reputationPriceMod.faction === '엘프' ? (character.elfReputation || 0) :
                  item.reputationPriceMod.faction === '수인' ? (character.beastReputation || 0) :
                  (character.demonReputation || 0);
      if (rep >= 50) {
        price = Math.floor(price * item.reputationPriceMod.multiplier);
      }
    }
    return price;
  };

  // 판매 시 아이템 수거 가격 (인벤토리 판매가와 일치시킴)
  const getSellPrice = (item: Item) => {
    return calculateItemPrice(item);
  };

  // 카테고리 매칭 함수
  const isItemMatchingCategory = (item: Item, cat: string, sType: 'weapon' | 'armor' | 'general'): boolean => {
    if (cat === 'all') return true;

    if (sType === 'weapon') {
      const wType = getWeaponTypeFromItem(item);
      const name = item.name || '';
      if (cat === 'sword') return wType === 'Sword' || wType === 'SubSword' || name.includes('검') || name.includes('소드') || name.includes('도') || name.includes('단검') || name.includes('세검') || name.includes('카타나') || name.includes('나이프') || name.includes('레이피어');
      if (cat === 'spear') return wType === 'Spear' || name.includes('창') || name.includes('스피어') || name.includes('랜스') || name.includes('글레이브') || name.includes('삼지창');
      if (cat === 'blunt') return wType === 'Blunt' || name.includes('둔기') || name.includes('해머') || name.includes('메이스') || name.includes('망치') || name.includes('철퇴') || name.includes('몽둥이');
      if (cat === 'axe') return wType === 'Axe' || name.includes('도끼') || name.includes('액스') || name.includes('토마호크') || name.includes('할버드');
      if (cat === 'bow') return wType === 'Bow' || wType === 'Crossbow' || name.includes('활') || name.includes('궁') || name.includes('보우') || name.includes('석궁');
      if (cat === 'staff') return wType === 'Staff' || wType === 'Grimoire' || wType === 'Orb' || name.includes('지팡이') || name.includes('스태프') || name.includes('완드') || name.includes('마법서') || name.includes('보주');
      if (cat === 'knuckle') return wType === 'Knuckle' || name.includes('너클') || name.includes('글러브') || name.includes('피스트') || name.includes('권투') || name.includes('클로');
      if (cat === 'gun') return wType === 'Firearm' || wType === 'Heavy' || wType === 'Thrown' || name.includes('총') || name.includes('포') || name.includes('건') || name.includes('라이플') || name.includes('투척');
      if (cat === 'other_weapon') return item.type === 'Weapon' || item.type === 'SubWeapon';
    }

    if (sType === 'armor') {
      if (cat === 'head') return item.type === 'Head';
      if (cat === 'body') return item.type === 'Body';
      if (cat === 'hand') return item.type === 'Hand';
      if (cat === 'feet') return item.type === 'Feet';
      if (cat === 'subweapon') return item.type === 'SubWeapon' || (item.type as string) === 'Shield';
      if (cat === 'accessory') return item.type === 'Accessory';
    }

    if (sType === 'general') {
      const isScroll = item.name.includes('귀환') || item.name.includes('주문서') || item.name.includes('이동') || item.name.includes('스크롤') || item.name.includes('탈출') || item.name.includes('축복서');
      if (cat === 'consumable') return item.type === 'Consumable' && !isScroll;
      if (cat === 'scroll') return isScroll;
      if (cat === 'accessory') return item.type === 'Accessory';
      if (cat === 'etc') return item.type === 'Etc' || (!isScroll && item.type !== 'Consumable' && item.type !== 'Accessory');
    }

    return true;
  };

  // 필터링된 구매 상점 목록
  const filteredBuyItems = useMemo(() => {
    return shopInventory.map((item, originalIndex) => ({ item, originalIndex })).filter(({ item }) => {
      // 카테고리 필터
      if (!isItemMatchingCategory(item, selectedCategory, shopType)) return false;

      // 검색어 필터
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || (item.type && item.type.toLowerCase().includes(q));
      }
      return true;
    });
  }, [shopInventory, selectedCategory, shopType, searchQuery]);

  // 필터링된 판매 인벤토리 목록
  const filteredSellItems = useMemo(() => {
    return character.inventory.map((item, originalIndex) => ({ item, originalIndex })).filter(({ item }) => {
      if (!isItemMatchingCategory(item, selectedCategory, shopType)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [character.inventory, selectedCategory, shopType, searchQuery]);

  // 필터링된 판매 인벤토리 목록을 그룹화 (같은 아이템은 하나로 묶고 개수 표시)
  const groupedSellItems = useMemo(() => {
    const groups: Record<string, { item: Item; count: number; originalIndices: number[] }> = {};
    
    filteredSellItems.forEach(({ item, originalIndex }) => {
      // 그룹 기준: 이름, 등급, 속성타입, 강화수치, 신성레벨, 잠금여부
      const key = `${item.name}__${item.rarity}__${item.elementalType || ''}__${item.enhancement || 0}__${item.divineLevel || 0}__${item.locked ? 'locked' : 'unlocked'}`;
      if (!groups[key]) {
        groups[key] = {
          item,
          count: 0,
          originalIndices: []
        };
      }
      groups[key].count += 1;
      groups[key].originalIndices.push(originalIndex);
    });
    
    return Object.values(groups);
  }, [filteredSellItems]);

  // 아이템 클릭 핸들러 (구매)
  const handleItemClick = (item: Item, index: number) => {
    if (item.stock !== undefined && item.stock <= 0) return;
    setSelectedBuyItem({ item, index });
    setTransactionQuantity(1);
    setMerchantQuote(`"오, 자네가 선택한 [${item.name}]! 최고의 선택이라 자부한다네."`);
  };

  // 아이템 클릭 핸들러 (판매)
  const handleSellClick = (group: { item: Item; count: number; originalIndices: number[] }) => {
    if (group.item.locked) {
      alert("잠금 상태인 아이템은 판매할 수 없습니다.");
      return;
    }
    setSelectedSellGroup(group);
    setTransactionQuantity(1);
    setMerchantQuote(`"음! [${group.item.name}]을(를) 팔겠다고? 내 합당한 가격을 치러주지."`);
  };

  // 구매 확정
  const handleConfirmBuy = () => {
    if (!selectedBuyItem) return;
    const { item, index } = selectedBuyItem;

    if (character.inventory.length + transactionQuantity > maxInventorySize) {
      alert(`인벤토리가 가득 찼습니다. (최대 ${maxInventorySize}개)\n현재 보유량: ${character.inventory.length}개`);
      return;
    }

    if (item.reputationReq) {
      const rep = item.reputationReq.faction === '엘프' ? (character.elfReputation || 0) :
                  item.reputationReq.faction === '수인' ? (character.beastReputation || 0) :
                  (character.demonReputation || 0);
      if (rep < item.reputationReq.value) {
        alert(`${item.reputationReq.faction} 평판이 부족합니다. (필요: ${item.reputationReq.value}, 현재: ${rep})`);
        return;
      }
    }

    const unitPrice = getCalculatedPrice(item);
    const totalPrice = unitPrice * transactionQuantity;

    if (character.money < totalPrice) {
      alert("골드가 부족합니다.");
      return;
    }

    onBuy(item, unitPrice, transactionQuantity);

    if (item.stock !== undefined) {
      const newInventory = [...shopInventory];
      newInventory[index] = { ...item, stock: Math.max(0, item.stock - transactionQuantity) };
      setShopInventory(newInventory);
    }

    setMerchantQuote(`"감사하네! [${item.name}] x${transactionQuantity}개 잘 받아가게나!"`);
    setSelectedBuyItem(null);
  };

  // 판매 확정
  const handleConfirmSell = () => {
    if (!selectedSellGroup) return;
    const { item, originalIndices } = selectedSellGroup;

    const unitPrice = getSellPrice(item);
    const indicesToSell = originalIndices.slice(0, transactionQuantity);
    
    if (onSell) {
      onSell(indicesToSell, unitPrice, transactionQuantity);
    } else {
      // fallback sell simulation if onSell prop is not passed
      const gainedGold = unitPrice * transactionQuantity;
      character.money += gainedGold;
      const sortedIndices = [...indicesToSell].sort((a, b) => b - a);
      sortedIndices.forEach(idx => {
        character.inventory.splice(idx, 1);
      });
    }

    setMerchantQuote(`"여기 [${item.name}] x${transactionQuantity}개 값으로 ${(unitPrice * transactionQuantity).toLocaleString()} G를 지급했다네!"`);
    setSelectedSellGroup(null);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-6xl max-h-[96vh] sm:max-h-[92vh] flex flex-col shadow-[0_0_60px_rgba(245,158,11,0.15)] overflow-hidden">
        
        {/* Top Navigation Header */}
        <div className="bg-slate-950 px-3 sm:px-5 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
              <ShoppingBag size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-amber-400 truncate tracking-tight">{title}</h2>
                <span className="text-[10px] bg-amber-950/80 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-600/40 hidden sm:inline">
                  {merchant.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">{merchant.title}</p>
            </div>
          </div>

          {/* User Status Bar & Close */}
          <div className="flex items-center gap-2 shrink-0">
            <div className={`hidden md:flex px-3 py-1.5 rounded-xl border items-center text-xs font-bold ${isInventoryFull ? 'bg-red-950/50 border-red-500 text-red-400' : 'bg-slate-900 border-slate-800 text-slate-300'}`}>
              <Backpack size={14} className="mr-1.5 text-slate-400" />
              <span>{character.inventory.length} / {maxInventorySize}</span>
            </div>

            <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-amber-500/40 flex items-center text-amber-400 font-mono font-bold text-xs sm:text-sm shadow-inner">
              <Coins size={15} className="mr-1.5 text-amber-400 animate-bounce" />
              <span>{character.money.toLocaleString()} G</span>
            </div>

            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Merchant Greeting & Dialog Panel */}
        <div className="bg-slate-950/90 border-b border-slate-800/90 px-3 sm:px-5 py-2.5 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-900 border border-amber-500/40 p-0.5 shrink-0 shadow-md relative overflow-hidden">
            <img src={merchant.avatar} alt={merchant.name} className="w-full h-full object-cover rounded-lg" />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950"></div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-bold text-amber-300">{merchant.name}</span>
              <span className="text-[10px] text-slate-500 italic hidden sm:inline">"{merchant.quote}"</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-200 flex items-center gap-2 shadow-inner">
              <MessageSquare size={13} className="text-amber-400 shrink-0" />
              <span className="truncate italic font-medium">{merchantQuote || merchant.greeting}</span>
            </div>
          </div>
        </div>

        {/* Sub Navigation Bar: Buy / Sell Tabs & Search & Category Filter */}
        <div className="bg-slate-950/80 px-3 sm:px-5 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          
          {/* Buy/Sell Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => { setActiveTab('buy'); setMerchantQuote(merchant.greeting); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'buy'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingBag size={14} />
              <span>아이템 구매</span>
            </button>
            <button
              onClick={() => { setActiveTab('sell'); setMerchantQuote('"가지고 있는 아이템 중 보탬이 될 만한 걸 보여주게나."'); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'sell'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tag size={14} />
              <span>소지품 판매</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full sm:max-w-md">
            {categoryList.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 shrink-0 ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon size={12} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[140px] sm:min-w-[180px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="아이템 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-xl focus:border-amber-500/50 outline-none transition-all placeholder:text-slate-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Main Content Item Grid Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 custom-scrollbar bg-slate-900/40">
          
          {/* Alert Warning for full inventory */}
          {activeTab === 'buy' && isInventoryFull && (
            <div className="mb-3 p-3 bg-red-950/40 border border-red-500/50 rounded-xl flex items-center gap-2.5 text-red-400 text-xs font-bold animate-pulse">
              <AlertTriangle size={18} className="shrink-0" />
              <span>가방 용량이 가득 찼습니다! 아이템을 구매하려면 소지품 판매나 가방 정리가 필요합니다.</span>
            </div>
          )}

          {/* BUY MODE ITEMS GRID */}
          {activeTab === 'buy' && (
            filteredBuyItems.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs italic">
                검색 조건에 일치하는 아이템이 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
                {filteredBuyItems.map(({ item, originalIndex }) => {
                  const price = getCalculatedPrice(item);
                  const canAfford = character.money >= price;
                  const hasStock = item.stock === undefined || item.stock > 0;
                  const isStockLow = item.stock !== undefined && item.stock <= 3 && item.stock > 0;
                  const rarityStyle = RARITY_STYLES[item.rarity] || RARITY_STYLES[ItemRarity.NORMAL];
                  const uiConfig = item.elementalType ? (SHINRYOKU_UI_CONFIG[item.elementalType] || SHINRYOKU_UI_CONFIG.default) : null;
                  const displayImg = getItemDisplayImageUrl(item);

                  // 평판 제한
                  let isLocked = false;
                  if (item.reputationReq) {
                    const rep = item.reputationReq.faction === '엘프' ? (character.elfReputation || 0) :
                                item.reputationReq.faction === '수인' ? (character.beastReputation || 0) :
                                (character.demonReputation || 0);
                    if (rep < item.reputationReq.value) isLocked = true;
                  }

                  return (
                    <div
                      key={originalIndex}
                      className={`p-3 rounded-xl border transition-all relative group flex flex-col justify-between ${rarityStyle.bg} ${rarityStyle.border} ${
                        hasStock && !isInventoryFull && !isLocked ? 'hover:scale-[1.01]' : 'opacity-70 grayscale'
                      }`}
                    >
                      {/* Top: Name & Rarity Badge */}
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <div className="min-w-0 flex-1">
                          <h4 className={`text-xs sm:text-sm font-bold truncate ${rarityStyle.text}`}>
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-0.5 flex-wrap">
                            <span className={`px-1.5 py-0.2 rounded border font-bold ${rarityStyle.badge}`}>
                              {item.rarity}
                            </span>
                            <span className="text-slate-400">
                              {item.type}
                            </span>
                            {item.elementalType && uiConfig && (
                              <span className={`font-bold px-1 py-0.2 rounded border ${uiConfig.text} ${uiConfig.bg} ${uiConfig.border}`}>
                                {item.elementalType}
                              </span>
                            )}
                          </div>
                        </div>

                        {item.stock !== undefined && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                            !hasStock
                              ? 'bg-red-950 text-red-400 border border-red-900'
                              : isStockLow
                              ? 'bg-amber-950 text-amber-400 border border-amber-700 animate-pulse'
                              : 'bg-slate-900 text-slate-400 border border-slate-800'
                          }`}>
                            {hasStock ? `재고: ${item.stock}` : '품절'}
                          </span>
                        )}
                      </div>

                      {/* Locked Reputation Overlay */}
                      {isLocked && (
                        <div className="absolute inset-0 z-10 bg-slate-950/80 rounded-xl flex flex-col items-center justify-center p-2 backdrop-blur-[1px]">
                          <Lock size={20} className="text-red-400 mb-1" />
                          <span className="text-[10px] font-bold text-red-300 text-center">
                            {item.reputationReq?.faction} 평판 {item.reputationReq?.value} 필요
                          </span>
                        </div>
                      )}

                      {/* Middle: Thumbnail Image & Description */}
                      <div className="flex items-start gap-2.5 my-1.5">
                        <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden relative p-0.5 shadow-inner">
                          <img src={displayImg} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 italic leading-relaxed">
                          "{item.description}"
                        </p>
                      </div>

                      {/* Stats Preview */}
                      {item.stats && Object.keys(item.stats).length > 0 && (
                        <div className="flex gap-1 mb-2 flex-wrap text-[9px]">
                          {Object.entries(item.stats).map(([k, v]) => (
                            <span key={k} className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300 font-mono font-bold">
                              {k.toUpperCase()} +{v}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Bottom Price & Purchase Button */}
                      <div className="mt-auto pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">가격</span>
                          <span className={`font-mono font-bold text-xs ${canAfford ? 'text-amber-400' : 'text-red-400'}`}>
                            {price.toLocaleString()} G
                          </span>
                        </div>

                        <button
                          onClick={() => handleItemClick(item, originalIndex)}
                          disabled={!canAfford || !hasStock || isInventoryFull || isLocked}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow ${
                            !hasStock || isInventoryFull || isLocked
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                              : canAfford
                              ? 'bg-amber-600 hover:bg-amber-500 text-white hover:scale-105'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          }`}
                        >
                          <span>{!hasStock ? '품절' : isInventoryFull ? '가방 가득 참' : canAfford ? '구매하기' : '골드 부족'}</span>
                          {canAfford && hasStock && !isInventoryFull && <ArrowUpRight size={13} />}
                        </button>
                      </div>

                      <ItemTooltip item={item} character={character} />
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* SELL MODE ITEMS GRID */}
          {activeTab === 'sell' && (
            groupedSellItems.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs italic">
                판매 가능한 인벤토리 소지품이 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
                {groupedSellItems.map((group, groupIdx) => {
                  const { item, count } = group;
                  const sellPrice = getSellPrice(item);
                  const rarityStyle = RARITY_STYLES[item.rarity] || RARITY_STYLES[ItemRarity.NORMAL];
                  const displayImg = getItemDisplayImageUrl(item);

                  return (
                    <div
                      key={groupIdx}
                      className={`p-3 rounded-xl border transition-all relative group flex flex-col justify-between ${rarityStyle.bg} ${rarityStyle.border} hover:scale-[1.01]`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <div className="min-w-0 flex-1">
                          <h4 className={`text-xs sm:text-sm font-bold truncate ${rarityStyle.text}`}>
                            {item.name}
                            {item.enhancement ? <span className="text-amber-400 font-mono ml-1">+{item.enhancement}</span> : null}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-0.5">
                            <span className={`px-1.5 py-0.2 rounded border font-bold ${rarityStyle.badge}`}>
                              {item.rarity}
                            </span>
                            <span>{item.type}</span>
                          </div>
                        </div>

                        {/* 개수 뱃지 */}
                        <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 text-slate-300 font-bold font-mono">
                          보유: {count}개
                        </span>
                      </div>

                      <div className="flex items-start gap-2.5 my-1.5">
                        <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden relative p-0.5 shadow-inner">
                          <img src={displayImg} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 italic leading-relaxed">
                          "{item.description}"
                        </p>
                      </div>

                      {/* Stats Preview */}
                      {item.stats && Object.keys(item.stats).length > 0 && (
                        <div className="flex gap-1 mb-2 flex-wrap text-[9px]">
                          {Object.entries(item.stats).map(([k, v]) => (
                            <span key={k} className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300 font-mono font-bold">
                              {k.toUpperCase()} +{v}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-auto pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">개당 판매가</span>
                          <span className="font-mono font-bold text-xs text-emerald-400">
                            +{sellPrice.toLocaleString()} G
                          </span>
                        </div>

                        <button
                          onClick={() => handleSellClick(group)}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow hover:scale-105"
                        >
                          <span>판매하기</span>
                          <Tag size={13} />
                        </button>
                      </div>

                      <ItemTooltip item={item} character={character} />
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Quantity Overlay Modal (Buy Mode) */}
        {selectedBuyItem && (() => {
          const item = selectedBuyItem.item;
          const unitPrice = getCalculatedPrice(item);
          const maxAffordable = Math.floor(character.money / unitPrice);
          const stockLimit = item.stock !== undefined ? item.stock : 999;
          const spaceLimit = maxInventorySize - character.inventory.length;
          const trueMax = Math.max(1, Math.min(stockLimit, maxAffordable, spaceLimit));

          return (
            <div className="fixed inset-0 z-[130] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
              <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-amber-500/40 shadow-2xl p-5 sm:p-6 text-slate-200">
                
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
                  <div className="w-12 h-12 rounded-xl bg-slate-950 border border-amber-500/30 p-1 shrink-0">
                    <img src={getItemDisplayImageUrl(item)} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-amber-300 truncate">{item.name}</h3>
                    <p className="text-xs text-slate-400">구매 수량을 선택하거나 지정하세요.</p>
                  </div>
                </div>

                {/* Quantity Control Row */}
                <div className="flex items-center justify-center gap-3 mb-5">
                  <button
                    onClick={() => setTransactionQuantity(Math.max(1, transactionQuantity - 1))}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 active:scale-95 transition-transform"
                  >
                    <Minus size={18} />
                  </button>

                  <div className="relative text-center">
                    <input
                      type="number"
                      value={transactionQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val)) setTransactionQuantity(0);
                        else setTransactionQuantity(Math.max(0, Math.min(trueMax, val)));
                      }}
                      onBlur={() => { if (transactionQuantity < 1) setTransactionQuantity(1); }}
                      className="w-24 h-12 bg-slate-950 border-2 border-slate-700 rounded-xl text-center text-xl font-bold font-mono text-amber-400 focus:border-amber-500 outline-none transition-colors"
                    />
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                      최대 (MAX): {trueMax}
                    </div>
                  </div>

                  <button
                    onClick={() => setTransactionQuantity(Math.min(trueMax, transactionQuantity + 1))}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 active:scale-95 transition-transform"
                  >
                    <Plus size={18} />
                  </button>

                  <button
                    onClick={() => setTransactionQuantity(trueMax)}
                    className="px-2.5 py-3 bg-amber-950/60 hover:bg-amber-900 text-amber-300 rounded-xl border border-amber-600/50 text-xs font-bold transition-colors"
                  >
                    최대
                  </button>
                </div>

                {/* Price Breakdown */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-5 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>개당 단가</span>
                    <span className="font-mono">{unitPrice.toLocaleString()} G</span>
                  </div>
                  <div className="border-t border-slate-800/80 pt-2 flex justify-between items-center font-bold text-sm">
                    <span>총 구매 금액</span>
                    <span className="text-amber-400 font-mono text-base">
                      {(unitPrice * transactionQuantity).toLocaleString()} G
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedBuyItem(null)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs border border-slate-700 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleConfirmBuy}
                    disabled={transactionQuantity < 1 || character.money < (unitPrice * transactionQuantity)}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-xl font-bold text-xs shadow-lg transition-all disabled:border disabled:border-slate-700"
                  >
                    구매 확정
                  </button>
                </div>

              </div>
            </div>
          );
        })()}

        {/* Quantity Overlay Modal (Sell Mode) */}
        {selectedSellGroup !== null && (() => {
          const { item, count } = selectedSellGroup;
          const unitPrice = getSellPrice(item);
          const trueMax = count;

          return (
            <div className="fixed inset-0 z-[130] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
              <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-emerald-500/40 shadow-2xl p-5 sm:p-6 text-slate-200">
                
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
                  <div className="w-12 h-12 rounded-xl bg-slate-950 border border-emerald-500/30 p-1 shrink-0">
                    <img src={getItemDisplayImageUrl(item)} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-emerald-300 truncate">{item.name}</h3>
                    <p className="text-xs text-slate-400">판매할 수량을 선택하세요.</p>
                  </div>
                </div>

                {/* Quantity Control Row */}
                <div className="flex items-center justify-center gap-3 mb-5">
                  <button
                    onClick={() => setTransactionQuantity(Math.max(1, transactionQuantity - 1))}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 active:scale-95 transition-transform"
                  >
                    <Minus size={18} />
                  </button>

                  <div className="relative text-center">
                    <input
                      type="number"
                      value={transactionQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val)) setTransactionQuantity(0);
                        else setTransactionQuantity(Math.max(0, Math.min(trueMax, val)));
                      }}
                      onBlur={() => { if (transactionQuantity < 1) setTransactionQuantity(1); }}
                      className="w-24 h-12 bg-slate-950 border-2 border-slate-700 rounded-xl text-center text-xl font-bold font-mono text-emerald-400 focus:border-emerald-500 outline-none transition-colors"
                    />
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                      보유량 (MAX): {trueMax}
                    </div>
                  </div>

                  <button
                    onClick={() => setTransactionQuantity(Math.min(trueMax, transactionQuantity + 1))}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 active:scale-95 transition-transform"
                  >
                    <Plus size={18} />
                  </button>

                  <button
                    onClick={() => setTransactionQuantity(trueMax)}
                    className="px-2.5 py-3 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 rounded-xl border border-emerald-600/50 text-xs font-bold transition-colors"
                  >
                    최대
                  </button>
                </div>

                {/* Price Breakdown */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-5 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>개당 매입가</span>
                    <span className="font-mono text-emerald-400">+{unitPrice.toLocaleString()} G</span>
                  </div>
                  <div className="border-t border-slate-800/80 pt-2 flex justify-between items-center font-bold text-sm">
                    <span>획득할 총 골드</span>
                    <span className="text-emerald-400 font-mono text-base">
                      +{(unitPrice * transactionQuantity).toLocaleString()} G
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedSellGroup(null)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs border border-slate-700 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleConfirmSell}
                    disabled={transactionQuantity < 1 || transactionQuantity > trueMax}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg transition-all"
                  >
                    판매 확정
                  </button>
                </div>

              </div>
            </div>
          );
        })()}

        {/* Footer Bar */}
        <div className="bg-slate-950 px-4 sm:px-6 py-2.5 border-t border-slate-800 flex items-center justify-between shrink-0 text-xs text-slate-500">
          <span className="hidden sm:inline">상점에서 필요한 물품을 신중히 둘러보세요.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors ml-auto"
          >
            상점 나가기
          </button>
        </div>

      </div>
    </div>
  );
};

export default ShopModal;
