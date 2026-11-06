import React, { useState, useMemo } from 'react';
import { 
    X, ShoppingBag, ShoppingCart, Coins, ArrowRightLeft, TrendingDown, 
    Search, Filter, Plus, Minus, Check, Sparkles, Utensils, Trees, 
    Mountain, Shield, Zap, Leaf, Gem, Apple, Activity, Store, Package, Lock
} from 'lucide-react';
import { Character } from '../types';
import { RESOURCE_SELL_PRICES, SHINRYOKU_TYPES_LIST } from '../constants';

interface Props {
    isOpen: boolean;
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (updatedChar: Character, logMessage?: string) => void;
    facilityLevel?: number;
}

type Mode = 'buy' | 'sell';
type Category = 'all' | 'basic' | 'crops' | 'minerals' | 'shards';

interface ResourceItemDef {
    id: string;
    name: string;
    category: 'basic' | 'crops' | 'minerals' | 'shards';
    icon: any;
    color: string;
    sellPrice: number;
    buyLevelRequired?: number; // 1~5, undefined면 구매 불가(판매 전용)
    customBuyPrice?: number; // 특별 구매 단가 (예: 보석류 1,000,000 G)
    isShard?: boolean;
    description: string;
}

const ALL_RESOURCE_ITEMS: ResourceItemDef[] = [
    // 기본 자원
    { id: 'food', name: '식량', category: 'basic', icon: Utensils, color: 'text-amber-400', sellPrice: RESOURCE_SELL_PRICES.food || 100, buyLevelRequired: 1, description: '기지 주민과 동료들의 식량입니다.' },
    { id: 'wood', name: '목재', category: 'basic', icon: Trees, color: 'text-emerald-400', sellPrice: RESOURCE_SELL_PRICES.wood || 100, buyLevelRequired: 1, description: '시설 건축 및 업그레이드에 사용되는 목재입니다.' },
    { id: 'stone', name: '석재', category: 'basic', icon: Mountain, color: 'text-slate-400', sellPrice: RESOURCE_SELL_PRICES.stone || 100, buyLevelRequired: 1, description: '시설 방어 및 기반 시설 건축에 사용되는 석재입니다.' },
    { id: 'iron', name: '철', category: 'basic', icon: Shield, color: 'text-zinc-300', sellPrice: RESOURCE_SELL_PRICES.iron || 100, buyLevelRequired: 1, description: '장비 제작 및 고급 시설 건설에 필수적인 철광물입니다.' },
    { id: 'herbs', name: '약초', category: 'basic', icon: Leaf, color: 'text-green-400', sellPrice: RESOURCE_SELL_PRICES.herbs || 50, buyLevelRequired: 1, description: '연금술 및 치료에 사용되는 약초입니다.' },
    { id: 'manaStone', name: '마석', category: 'basic', icon: Mountain, color: 'text-indigo-400', sellPrice: RESOURCE_SELL_PRICES.manaStone || 50, description: '마력이 깃든 원석입니다. (판매 전용)' },
    { id: 'manaCrystal', name: '마정석', category: 'basic', icon: Zap, color: 'text-purple-400', sellPrice: RESOURCE_SELL_PRICES.manaCrystal || 500, description: '고순도의 마력이 응축된 귀중한 결정체입니다. (판매 전용)' },

    // 농작물 및 특산품 (Lv.2 기본 농작물)
    { id: 'wheat', name: '밀', category: 'crops', icon: Utensils, color: 'text-yellow-400', sellPrice: RESOURCE_SELL_PRICES.wheat || 30, buyLevelRequired: 2, description: '기본적인 곡물 작물입니다.' },
    { id: 'rice', name: '쌀', category: 'crops', icon: Utensils, color: 'text-slate-200', sellPrice: RESOURCE_SELL_PRICES.rice || 40, buyLevelRequired: 2, description: '주식으로 애용되는 쌀입니다.' },
    { id: 'corn', name: '옥수수', category: 'crops', icon: Utensils, color: 'text-yellow-500', sellPrice: RESOURCE_SELL_PRICES.corn || 60, buyLevelRequired: 2, description: '영양가 높은 옥수수입니다.' },
    { id: 'potato', name: '감자', category: 'crops', icon: Utensils, color: 'text-amber-600', sellPrice: RESOURCE_SELL_PRICES.potato || 90, buyLevelRequired: 2, description: '구황작물로 유용한 감자입니다.' },
    { id: 'sweet_potato', name: '고구마', category: 'crops', icon: Utensils, color: 'text-purple-600', sellPrice: RESOURCE_SELL_PRICES.sweet_potato || 100, buyLevelRequired: 2, description: '달콤한 영양 고구마입니다.' },
    { id: 'onion', name: '양파', category: 'crops', icon: Utensils, color: 'text-slate-100', sellPrice: RESOURCE_SELL_PRICES.onion || 50, buyLevelRequired: 2, description: '요리에 감칠맛을 더하는 양파입니다.' },
    { id: 'garlic', name: '마늘', category: 'crops', icon: Utensils, color: 'text-slate-300', sellPrice: RESOURCE_SELL_PRICES.garlic || 120, buyLevelRequired: 2, description: '체력 증진에 좋은 마늘입니다.' },
    { id: 'lettuce', name: '상추', category: 'crops', icon: Leaf, color: 'text-green-500', sellPrice: RESOURCE_SELL_PRICES.lettuce || 24, buyLevelRequired: 2, description: '신선한 쌈 채소 상추입니다.' },
    { id: 'carrot', name: '당근', category: 'crops', icon: Utensils, color: 'text-orange-500', sellPrice: RESOURCE_SELL_PRICES.carrot || 36, buyLevelRequired: 2, description: '비타민이 풍부한 당근입니다.' },

    // 농작물 및 특산품 (Lv.3 그 밖의 농작물)
    { id: 'cabbage', name: '배추', category: 'crops', icon: Leaf, color: 'text-green-300', sellPrice: RESOURCE_SELL_PRICES.cabbage || 44, buyLevelRequired: 3, description: '아삭한 식감의 배추입니다.' },
    { id: 'tomato', name: '토마토', category: 'crops', icon: Utensils, color: 'text-red-500', sellPrice: RESOURCE_SELL_PRICES.tomato || 76, buyLevelRequired: 3, description: '신선하고 상큼한 붉은 토마토입니다.' },
    { id: 'strawberry', name: '딸기', category: 'crops', icon: Utensils, color: 'text-rose-400', sellPrice: RESOURCE_SELL_PRICES.strawberry || 120, buyLevelRequired: 3, description: '달콤하고 향긋한 딸기입니다.' },
    { id: 'grape', name: '포도', category: 'crops', icon: Utensils, color: 'text-purple-500', sellPrice: RESOURCE_SELL_PRICES.grape || 180, buyLevelRequired: 3, description: '과즙이 풍부한 보랏빛 포도입니다.' },
    { id: 'watermelon', name: '수박', category: 'crops', icon: Utensils, color: 'text-green-600', sellPrice: RESOURCE_SELL_PRICES.watermelon || 240, buyLevelRequired: 3, description: '시원한 과즙이 일품인 수박입니다.' },
    { id: 'ginseng', name: '인삼', category: 'crops', icon: Leaf, color: 'text-amber-200', sellPrice: RESOURCE_SELL_PRICES.ginseng || 600, buyLevelRequired: 3, description: '기력을 크게 보하는 명약초입니다.' },
    { id: 'mana_fruit', name: '마력 열매', category: 'crops', icon: Zap, color: 'text-purple-400', sellPrice: RESOURCE_SELL_PRICES.mana_fruit || 300, buyLevelRequired: 3, description: '마력이 깃든 신비로운 열매입니다.' },

    // 특수 농작물 (구매 제외/판매 전용)
    { id: 'shinryoku_flower', name: '신력 꽃', category: 'crops', icon: Sparkles, color: 'text-pink-400', sellPrice: RESOURCE_SELL_PRICES.shinryoku_flower || 2000, description: '신의 기운을 품고 피어난 전설의 꽃입니다. (판매 전용)' },
    { id: 'mandrake', name: '만드라고라', category: 'crops', icon: Activity, color: 'text-amber-400', sellPrice: RESOURCE_SELL_PRICES.mandrake || 1000, description: '연금술의 최고급 비약 재료입니다. (판매 전용)' },
    { id: 'world_tree_branch', name: '세계수의 가지', category: 'crops', icon: Trees, color: 'text-emerald-400', sellPrice: RESOURCE_SELL_PRICES.world_tree_branch || 5000, description: '태고의 생명력이 깃든 세계수의 가지입니다. (판매 전용)' },
    { id: 'golden_apple', name: '황금 사과', category: 'crops', icon: Apple, color: 'text-yellow-400', sellPrice: RESOURCE_SELL_PRICES.golden_apple || 3000, description: '황금빛으로 빛나는 기적의 과실입니다. (판매 전용)' },

    // 광물 (Lv.4 은광석, 금광석)
    { id: 'silver_ore', name: '은광석', category: 'minerals', icon: Coins, color: 'text-slate-300', sellPrice: RESOURCE_SELL_PRICES.silver_ore || 800, buyLevelRequired: 4, description: '은빛을 띠는 귀금속 원석입니다.' },
    { id: 'gold_ore', name: '금광석', category: 'minerals', icon: Coins, color: 'text-yellow-500', sellPrice: RESOURCE_SELL_PRICES.gold_ore || 2000, buyLevelRequired: 4, description: '고순도의 순금 원석입니다.' },

    // 보석류 (Lv.5 다이아몬드, 루비, 사파이어, 에메랄드 - 100만 골드 구매)
    { id: 'diamond', name: '다이아몬드', category: 'minerals', icon: Gem, color: 'text-cyan-300', sellPrice: RESOURCE_SELL_PRICES.diamond || 10000, buyLevelRequired: 5, customBuyPrice: 1000000, description: '가장 단단하고 영롱한 최고급 보석입니다.' },
    { id: 'ruby', name: '루비', category: 'minerals', icon: Gem, color: 'text-red-500', sellPrice: RESOURCE_SELL_PRICES.ruby || 5000, buyLevelRequired: 5, customBuyPrice: 1000000, description: '불꽃처럼 붉게 타오르는 최고급 보석입니다.' },
    { id: 'sapphire', name: '사파이어', category: 'minerals', icon: Gem, color: 'text-blue-500', sellPrice: RESOURCE_SELL_PRICES.sapphire || 5000, buyLevelRequired: 5, customBuyPrice: 1000000, description: '심해처럼 깊고 푸른 최고급 보석입니다.' },
    { id: 'emerald', name: '에메랄드', category: 'minerals', icon: Gem, color: 'text-green-500', sellPrice: RESOURCE_SELL_PRICES.emerald || 5000, buyLevelRequired: 5, customBuyPrice: 1000000, description: '생명력이 넘쳐나는 최고급 녹색 보석입니다.' },

    // 결정류 (판매 전용)
    { id: 'normalCrystal', name: '노말 결정', category: 'minerals', icon: Gem, color: 'text-slate-300', sellPrice: RESOURCE_SELL_PRICES.normalCrystal || 100, description: '일반적인 마력의 결정체입니다. (판매 전용)' },
    { id: 'magicCrystal', name: '마법 결정', category: 'minerals', icon: Gem, color: 'text-blue-500', sellPrice: RESOURCE_SELL_PRICES.magicCrystal || 500, description: '정제된 마법력이 깃든 결정입니다. (판매 전용)' },
    { id: 'rareCrystal', name: '레어 결정', category: 'minerals', icon: Gem, color: 'text-yellow-500', sellPrice: RESOURCE_SELL_PRICES.rareCrystal || 1000, description: '희귀한 마력이 응축된 결정입니다. (판매 전용)' },
    { id: 'epicCrystal', name: '에픽 결정', category: 'minerals', icon: Gem, color: 'text-purple-500', sellPrice: RESOURCE_SELL_PRICES.epicCrystal || 5000, description: '강력한 에너지가 맥동하는 상급 결정입니다. (판매 전용)' },
    { id: 'uniqueCrystal', name: '유니크 결정', category: 'minerals', icon: Gem, color: 'text-pink-500', sellPrice: RESOURCE_SELL_PRICES.uniqueCrystal || 15000, description: '극도로 순수한 마력 결정체입니다. (판매 전용)' },
    { id: 'legendaryCrystal', name: '전설 결정', category: 'minerals', icon: Gem, color: 'text-amber-500', sellPrice: RESOURCE_SELL_PRICES.legendaryCrystal || 50000, description: '신화적인 힘을 담고 있는 전설의 결정입니다. (판매 전용)' },

    // 속성 파편 (판매 전용)
    ...SHINRYOKU_TYPES_LIST.map(type => ({
        id: type,
        name: `${type} 파편`,
        category: 'shards' as const,
        icon: Sparkles,
        color: 'text-cyan-400',
        sellPrice: RESOURCE_SELL_PRICES.shard || 1000,
        isShard: true,
        description: `${type}의 기운이 깃든 신비로운 속성 파편입니다. (판매 전용)`
    }))
];

const TradeExchangeModal: React.FC<Props> = ({
    isOpen,
    character,
    onClose,
    onUpdateCharacter,
    facilityLevel = 1
}) => {
    const [mode, setMode] = useState<Mode>('buy');
    const [category, setCategory] = useState<Category>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState<ResourceItemDef | null>(null);
    const [tradeQuantity, setTradeQuantity] = useState<number>(1);
    const [notice, setNotice] = useState<string | null>(null);

    // 시설 레벨에 따른 구매 할인율 (Lv.1: 0%, Lv.2: 4%, Lv.3: 8%, Lv.4: 12%, Lv.5: 16%)
    const discountPercent = Math.min(25, (Math.max(1, facilityLevel) - 1) * 4);

    // 보유 수량 확인 헬퍼
    const getOwnedQuantity = (item: ResourceItemDef): number => {
        if (!character.base) return 0;
        if (item.isShard) {
            return character.base.elementalShards?.[item.id] || 0;
        }
        return (character.base.resources as any)?.[item.id] || 0;
    };

    // 아이템별 구매 단가 계산 (기본 = 판매가의 2배 또는 지정 구매가, 시설 레벨에 따라 할인)
    const getBuyUnitPrice = (item: ResourceItemDef): number => {
        const baseBuyPrice = item.customBuyPrice !== undefined ? item.customBuyPrice : item.sellPrice * 2;
        const discounted = Math.round(baseBuyPrice * (1 - discountPercent / 100));
        return Math.max(1, discounted);
    };

    // 아이템 구매 가능 여부 확인
    const isItemPurchasable = (item: ResourceItemDef): { purchasable: boolean; reason?: string } => {
        if (item.buyLevelRequired === undefined) {
            return { purchasable: false, reason: '판매 전용 품목' };
        }
        if (facilityLevel < item.buyLevelRequired) {
            return { purchasable: false, reason: `시설 레벨 ${item.buyLevelRequired} 필요` };
        }
        return { purchasable: true };
    };

    // 필터링된 아이템 목록
    const filteredItems = useMemo(() => {
        return ALL_RESOURCE_ITEMS.filter(item => {
            if (category !== 'all' && item.category !== category) return false;
            if (searchQuery.trim() && !item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
            return true;
        });
    }, [category, searchQuery]);

    // 아이템 선택 시 기본 수량 설정
    const handleSelectItem = (item: ResourceItemDef) => {
        if (mode === 'buy') {
            const check = isItemPurchasable(item);
            if (!check.purchasable) {
                setNotice(`${item.name}은(는) ${check.reason}입니다. (현재 시설 레벨: ${facilityLevel})`);
                setTimeout(() => setNotice(null), 3000);
                return;
            }
        }
        setSelectedItem(item);
        setTradeQuantity(1);
    };

    // 거래 실행 (구매 또는 판매)
    const handleExecuteTrade = () => {
        if (!selectedItem || tradeQuantity <= 0 || !character.base) return;

        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        if (!newChar.base) return;
        if (!newChar.base.resources) {
            newChar.base.resources = {
                gold: 0,
                food: 0, wood: 0, stone: 0, iron: 0, manaStone: 0, manaCrystal: 0, herbs: 0,
                wheat: 0, corn: 0, potato: 0, mana_fruit: 0, rice: 0, sweet_potato: 0,
                onion: 0, garlic: 0, lettuce: 0, shinryoku_flower: 0, carrot: 0, cabbage: 0,
                tomato: 0, strawberry: 0, grape: 0, watermelon: 0, ginseng: 0, mandrake: 0,
                world_tree_branch: 0, golden_apple: 0, normalCrystal: 0, magicCrystal: 0,
                rareCrystal: 0, epicCrystal: 0, uniqueCrystal: 0, legendaryCrystal: 0,
                gold_ore: 0, silver_ore: 0, diamond: 0, ruby: 0, sapphire: 0, emerald: 0
            };
        }
        if (!newChar.base.elementalShards) {
            newChar.base.elementalShards = {};
        }

        if (mode === 'buy') {
            const unitPrice = getBuyUnitPrice(selectedItem);
            const totalCost = unitPrice * tradeQuantity;

            if (newChar.money < totalCost) {
                setNotice(`소지금이 부족합니다. (필요: ${totalCost.toLocaleString()} 골드, 보유: ${newChar.money.toLocaleString()} 골드)`);
                setTimeout(() => setNotice(null), 3000);
                return;
            }

            newChar.money -= totalCost;
            if (selectedItem.isShard) {
                newChar.base.elementalShards[selectedItem.id] = (newChar.base.elementalShards[selectedItem.id] || 0) + tradeQuantity;
            } else {
                (newChar.base.resources as any)[selectedItem.id] = ((newChar.base.resources as any)[selectedItem.id] || 0) + tradeQuantity;
            }

            const logMsg = `[물자 교류소] ${selectedItem.name} x${tradeQuantity} 구매 완료. (-${totalCost.toLocaleString()} 골드)`;
            onUpdateCharacter(newChar, logMsg);
            setNotice(`${selectedItem.name} ${tradeQuantity}개를 성공적으로 구매했습니다! (-${totalCost.toLocaleString()} 골드)`);
            setTimeout(() => setNotice(null), 3000);
        } else {
            const owned = getOwnedQuantity(selectedItem);
            if (owned < tradeQuantity) {
                setNotice(`보유 수량이 부족합니다. (보유: ${owned}개)`);
                setTimeout(() => setNotice(null), 3000);
                return;
            }

            const totalEarn = selectedItem.sellPrice * tradeQuantity;
            if (selectedItem.isShard) {
                newChar.base.elementalShards[selectedItem.id] -= tradeQuantity;
            } else {
                (newChar.base.resources as any)[selectedItem.id] -= tradeQuantity;
            }
            newChar.money += totalEarn;

            const logMsg = `[물자 교류소] ${selectedItem.name} x${tradeQuantity} 판매 완료. (+${totalEarn.toLocaleString()} 골드)`;
            onUpdateCharacter(newChar, logMsg);
            setNotice(`${selectedItem.name} ${tradeQuantity}개를 성공적으로 판매했습니다! (+${totalEarn.toLocaleString()} 골드)`);
            setTimeout(() => setNotice(null), 3000);
        }

        setSelectedItem(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 font-sans animate-in fade-in duration-300">
            <div className="w-full max-w-4xl h-[92vh] max-h-[860px] bg-slate-950 border border-amber-500/40 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col overflow-hidden relative text-slate-100">
                
                {/* 상단 헤더 */}
                <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                            <Store size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">물자 교류소</h2>
                                <span className="text-xs bg-amber-950/80 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
                                    시설 레벨 {facilityLevel}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 hidden sm:block">
                                기지의 잉여 자원을 판매하거나, 필요한 물자를 골드로 구매할 수 있습니다.
                            </p>
                        </div>
                    </div>

                    {/* 보유 골드 & 닫기 */}
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/90 border border-amber-500/30 rounded-xl shadow-inner">
                            <Coins size={16} className="text-yellow-400" />
                            <span className="text-xs text-slate-400">보유 골드:</span>
                            <span className="text-sm font-mono font-bold text-yellow-300">{character.money.toLocaleString()} G</span>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* 안내 알림 바 */}
                {notice && (
                    <div className="px-4 py-2 bg-amber-500/20 border-b border-amber-500/40 text-amber-300 text-xs sm:text-sm font-semibold flex items-center justify-between animate-in slide-in-from-top duration-200">
                        <span className="flex items-center gap-2">
                            <Check size={16} className="text-amber-400" />
                            {notice}
                        </span>
                    </div>
                )}

                {/* 구매 모드 레벨 단계 안내 */}
                {mode === 'buy' && (
                    <div className="px-3 sm:px-4 py-2 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-300 overflow-x-auto scrollbar-none shrink-0">
                        <div className="flex items-center gap-1.5 shrink-0 text-amber-400 font-bold">
                            <span>레벨별 구매 품목:</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-0.5 rounded-full ${facilityLevel >= 1 ? 'bg-amber-950 text-amber-300 border border-amber-500/40 font-bold' : 'text-slate-500'}`}>
                                1단계: 기본 자원 5종
                            </span>
                            <span className="text-slate-600">→</span>
                            <span className={`px-2 py-0.5 rounded-full ${facilityLevel >= 2 ? 'bg-amber-950 text-amber-300 border border-amber-500/40 font-bold' : 'text-slate-500'}`}>
                                2단계: 기본 농작물 9종
                            </span>
                            <span className="text-slate-600">→</span>
                            <span className={`px-2 py-0.5 rounded-full ${facilityLevel >= 3 ? 'bg-amber-950 text-amber-300 border border-amber-500/40 font-bold' : 'text-slate-500'}`}>
                                3단계: 상급 농작물 7종
                            </span>
                            <span className="text-slate-600">→</span>
                            <span className={`px-2 py-0.5 rounded-full ${facilityLevel >= 4 ? 'bg-amber-950 text-amber-300 border border-amber-500/40 font-bold' : 'text-slate-500'}`}>
                                4단계: 은광석/금광석
                            </span>
                            <span className="text-slate-600">→</span>
                            <span className={`px-2 py-0.5 rounded-full ${facilityLevel >= 5 ? 'bg-amber-950 text-amber-300 border border-amber-500/40 font-bold' : 'text-slate-500'}`}>
                                5단계: 최고급 보석 4종
                            </span>
                        </div>
                    </div>
                )}

                {/* 탭 & 필터 제어 바 */}
                <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 shrink-0">
                    {/* 구매 / 판매 모드 탭 */}
                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                        <button
                            onClick={() => { setMode('buy'); setSelectedItem(null); }}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                                mode === 'buy'
                                    ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <ShoppingBag size={16} />
                            자원 구매
                            {discountPercent > 0 && (
                                <span className="ml-1 text-[10px] bg-amber-950 border border-amber-400 text-amber-200 px-1.5 py-0.2 rounded-full">
                                    {discountPercent}% 할인
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => { setMode('sell'); setSelectedItem(null); }}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                                mode === 'sell'
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <ShoppingCart size={16} />
                            자원 판매
                        </button>
                    </div>

                    {/* 카테고리 필터 및 검색 */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 text-xs">
                            <button
                                onClick={() => setCategory('all')}
                                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                                    category === 'all' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                전체
                            </button>
                            <button
                                onClick={() => setCategory('basic')}
                                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                                    category === 'basic' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                기본 자원
                            </button>
                            <button
                                onClick={() => setCategory('crops')}
                                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                                    category === 'crops' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                농작물/특산물
                            </button>
                            <button
                                onClick={() => setCategory('minerals')}
                                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                                    category === 'minerals' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                광물/결정
                            </button>
                            <button
                                onClick={() => setCategory('shards')}
                                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                                    category === 'shards' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                속성 파편
                            </button>
                        </div>

                        {/* 검색창 */}
                        <div className="relative shrink-0 w-32 sm:w-44">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="자원 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50"
                            />
                        </div>
                    </div>
                </div>

                {/* 메인 콘텐츠 영역: 목록 & 하단/사이드 거래 패널 */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 content-start">
                    {filteredItems.map(item => {
                        const Icon = item.icon;
                        const owned = getOwnedQuantity(item);
                        const buyPrice = getBuyUnitPrice(item);
                        const isSelected = selectedItem?.id === item.id;
                        const purchaseStatus = isItemPurchasable(item);
                        const isLockedForBuy = mode === 'buy' && !purchaseStatus.purchasable;

                        return (
                            <div
                                key={item.id}
                                onClick={() => handleSelectItem(item)}
                                className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 select-none ${
                                    isLockedForBuy
                                        ? 'bg-slate-950/70 border-slate-800/60 opacity-65 cursor-pointer hover:border-slate-700'
                                        : isSelected
                                            ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-950/50 ring-1 ring-amber-500/50 cursor-pointer'
                                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900 cursor-pointer'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800 ${item.color} shrink-0`}>
                                            <Icon size={18} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                                                <span>{item.name}</span>
                                                {mode === 'buy' && item.buyLevelRequired && item.buyLevelRequired > 1 && (
                                                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                                                        facilityLevel >= item.buyLevelRequired
                                                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                                                            : 'bg-amber-950/80 text-amber-400 border border-amber-500/30'
                                                    }`}>
                                                        Lv.{item.buyLevelRequired}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-400 line-clamp-1">
                                                {item.description}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-[10px] text-slate-400">보유량</div>
                                        <div className="text-xs font-mono font-bold text-amber-300">
                                            {owned.toLocaleString()}개
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                                    {mode === 'buy' ? (
                                        <div className="flex items-center gap-1.5">
                                            {purchaseStatus.purchasable ? (
                                                <div className="flex items-center gap-1 text-amber-400">
                                                    <span className="text-[10px] text-slate-400">구매 단가:</span>
                                                    <span className="font-mono font-bold">{buyPrice.toLocaleString()} G</span>
                                                    {discountPercent > 0 && (
                                                        <span className="text-[10px] line-through text-slate-500 font-mono">
                                                            {((item.customBuyPrice || item.sellPrice * 2)).toLocaleString()} G
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-slate-400">
                                                    <Lock size={12} className="text-amber-500 shrink-0" />
                                                    <span className="text-[11px] text-amber-400/90 font-medium">{purchaseStatus.reason}</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-emerald-400">
                                            <span className="text-[10px] text-slate-400">판매 단가:</span>
                                            <span className="font-mono font-bold">+{item.sellPrice.toLocaleString()} G</span>
                                        </div>
                                    )}

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectItem(item);
                                        }}
                                        disabled={isLockedForBuy}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                            isLockedForBuy
                                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
                                                : mode === 'buy'
                                                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                        }`}
                                    >
                                        {isLockedForBuy ? '구매 잠김' : mode === 'buy' ? '구매 선택' : '판매 선택'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {filteredItems.length === 0 && (
                        <div className="col-span-full py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                            <Package size={36} className="text-slate-600" />
                            <span>해당 조건에 일치하는 자원이 없습니다.</span>
                        </div>
                    )}
                </div>

                {/* 하단 거래 실행 패널 (선택된 아이템이 있을 때 활성화) */}
                {selectedItem && (
                    <div className="p-3 sm:p-4 bg-slate-900 border-t border-amber-500/30 shrink-0 flex flex-col gap-3 animate-in slide-in-from-bottom duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                                <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800 ${selectedItem.color}`}>
                                    {React.createElement(selectedItem.icon, { size: 18 })}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white flex items-center gap-2">
                                        <span>{selectedItem.name}</span>
                                        <span className="text-xs font-normal text-slate-400">
                                            ({mode === 'buy' ? '구매' : '판매'})
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        보유 수량: <span className="font-mono font-bold text-amber-300">{getOwnedQuantity(selectedItem).toLocaleString()}개</span>
                                    </div>
                                </div>
                            </div>

                            {/* 빠른 수량 조절 버튼군 */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                    onClick={() => setTradeQuantity(1)}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold border border-slate-700"
                                >
                                    최소
                                </button>
                                <button
                                    onClick={() => setTradeQuantity(prev => Math.max(1, prev + 10))}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold border border-slate-700"
                                >
                                    +10
                                </button>
                                <button
                                    onClick={() => setTradeQuantity(prev => Math.max(1, prev + 50))}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold border border-slate-700"
                                >
                                    +50
                                </button>
                                <button
                                    onClick={() => setTradeQuantity(prev => Math.max(1, prev + 100))}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold border border-slate-700"
                                >
                                    +100
                                </button>
                                <button
                                    onClick={() => {
                                        if (mode === 'buy') {
                                            const unit = getBuyUnitPrice(selectedItem);
                                            const maxAffordable = Math.max(1, Math.floor(character.money / unit));
                                            setTradeQuantity(maxAffordable);
                                        } else {
                                            const owned = getOwnedQuantity(selectedItem);
                                            setTradeQuantity(Math.max(1, owned));
                                        }
                                    }}
                                    className="px-2.5 py-1 bg-amber-900/40 hover:bg-amber-800/60 text-amber-300 rounded-lg text-xs font-bold border border-amber-500/40"
                                >
                                    최대
                                </button>
                            </div>
                        </div>

                        {/* 수량 인풋 및 합계 계산 */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950 p-2.5 sm:p-3 rounded-xl border border-slate-800">
                            {/* 수량 카운터 */}
                            <div className="flex items-center gap-2 justify-center sm:justify-start">
                                <button
                                    onClick={() => setTradeQuantity(prev => Math.max(1, prev - 1))}
                                    className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                                >
                                    <Minus size={16} />
                                </button>
                                <input
                                    type="number"
                                    min={1}
                                    value={tradeQuantity}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        setTradeQuantity(isNaN(val) ? 1 : Math.max(1, val));
                                    }}
                                    className="w-24 text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                                />
                                <button
                                    onClick={() => setTradeQuantity(prev => prev + 1)}
                                    className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            {/* 총 금액 & 실행 버튼 */}
                            <div className="flex items-center justify-between sm:justify-end gap-3">
                                <div className="text-right">
                                    <div className="text-[11px] text-slate-400">
                                        {mode === 'buy' ? '총 결제 금액' : '총 획득 금액'}
                                    </div>
                                    <div className={`text-base sm:text-lg font-mono font-bold ${mode === 'buy' ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {mode === 'buy' ? (
                                            `-${(getBuyUnitPrice(selectedItem) * tradeQuantity).toLocaleString()} G`
                                        ) : (
                                            `+${(selectedItem.sellPrice * tradeQuantity).toLocaleString()} G`
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleExecuteTrade}
                                    className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center gap-1.5 ${
                                        mode === 'buy'
                                            ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-amber-900/30'
                                            : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-900/30'
                                    }`}
                                >
                                    {mode === 'buy' ? (
                                        <>
                                            <ShoppingBag size={16} />
                                            구매하기
                                        </>
                                    ) : (
                                        <>
                                            <ShoppingCart size={16} />
                                            판매하기
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 하단 상태 바 */}
                <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-1 shrink-0">
                    <div className="flex items-center gap-2">
                        <ArrowRightLeft size={14} className="text-amber-400 shrink-0" />
                        <span>물자 교류소 시설 레벨이 오를수록 자원 구매 금액이 추가 할인됩니다. (현재 Lv.{facilityLevel}: {discountPercent}% 할인)</span>
                    </div>
                    <div className="text-slate-500 hidden sm:block">
                        기지 고유 상업 시설
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TradeExchangeModal;
