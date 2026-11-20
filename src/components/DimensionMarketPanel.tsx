import React, { useState, useEffect, useCallback } from 'react';
import { Character, Item, Companion, ItemRarity } from '../types';
import { auth } from '../services/firebase';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { GameStorage } from '../storage';
import { getSaveSlotKey, optimizeSaveData, compressData } from '../utils';
import { extractImagesFromSaveData } from '../services/imageAssetSplitService';
import { uploadLightSaveToSupabase } from '../services/supabaseSaveService';
import {
    DimensionMarketListing,
    DimensionSettlement,
    fetchMarketListings,
    fetchMyListingsAndSettlements,
    publishMarketListing,
    purchaseMarketListing,
    cancelMarketListing,
    claimSettlements,
    getRecommendedItemPrice,
    getRecommendedCompanionPrice
} from '../services/dimensionMarketService';
import {
    Store, Coins, Sparkles, Search, RefreshCw, Loader2, Tag,
    CheckCircle2, AlertTriangle, Package, Users, RotateCcw, Wallet
} from 'lucide-react';

interface DimensionMarketPanelProps {
    mode: 'item' | 'companion';
    character: Character;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onNotify?: (type: 'success' | 'failure' | 'warning' | 'info', title: string, message: string) => void;
}

export const DimensionMarketPanel: React.FC<DimensionMarketPanelProps> = ({
    mode,
    character,
    onUpdateCharacter,
    onNotify
}) => {
    const [subTab, setSubTab] = useState<'browse' | 'sell' | 'settlement'>('browse');
    const [listings, setListings] = useState<DimensionMarketListing[]>([]);
    const [myListings, setMyListings] = useState<DimensionMarketListing[]>([]);
    const [settlements, setSettlements] = useState<DimensionSettlement[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [rarityFilter, setRarityFilter] = useState<string>('ALL');

    // 출품 상태
    const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
    const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
    const [priceGold, setPriceGold] = useState<string>('10000');
    const [priceCrystal, setPriceCrystal] = useState<string>('0');

    const currentUid = auth.currentUser?.uid || character.id || 'local_player';
    const supabaseReady = isSupabaseConfigured();
    const myManaCrystal = character.base?.resources?.manaCrystal || 0;

    const notify = (type: 'success' | 'failure' | 'warning' | 'info', title: string, msg: string) => {
        if (onNotify) onNotify(type, title, msg);
        else alert(`[${title}] ${msg}`);
    };

    // [리세마라/복사 방지] 경매장 출품·구매·취소·정산 직후 즉시 로컬 세이브 및 Supabase 클라우드 강제 동기화
    const syncCharacterImmediately = useCallback(async (updatedChar: Character) => {
        try {
            const payload = {
                timestamp: new Date().toISOString(),
                character: updatedChar,
                sceneType: 'normal'
            };
            const sanitized = optimizeSaveData(payload);
            await GameStorage.set(getSaveSlotKey(0), sanitized);

            // 동일 캐릭터가 저장된 로컬 슬롯이 있으면 함께 즉시 덮어쓰기
            const targetSlots: number[] = [];
            for (let s = 1; s <= 10; s++) {
                try {
                    const raw = await GameStorage.get(getSaveSlotKey(s));
                    if (raw && ((typeof raw === 'string' && raw.includes(updatedChar.name)) || (typeof raw === 'object' && raw?.character?.name === updatedChar.name))) {
                        targetSlots.push(s);
                    }
                } catch {}
            }
            if (targetSlots.length === 0) targetSlots.push(1);

            const { lightData } = await extractImagesFromSaveData(sanitized);
            const compressedLight = await compressData(lightData);

            for (const slotNum of targetSlots) {
                await GameStorage.set(getSaveSlotKey(slotNum), sanitized);
                if (supabaseReady && auth.currentUser?.uid) {
                    await uploadLightSaveToSupabase(auth.currentUser.uid, slotNum, compressedLight, {
                        characterName: updatedChar.name || '이름 없음',
                        level: updatedChar.level || 1
                    });
                }
            }
        } catch (err) {
            console.warn('[DimensionMarket] 즉시 세이브 동기화 중 오류 (무시 가능):', err);
        }
    }, [supabaseReady]);

    const loadMarketData = useCallback(async () => {
        if (!supabaseReady) return;
        setIsLoading(true);
        try {
            const [activeList, mine] = await Promise.all([
                fetchMarketListings(mode),
                fetchMyListingsAndSettlements(currentUid, mode)
            ]);
            setListings(activeList);
            setMyListings(mine.myListings);
            setSettlements(mine.settlements);
        } catch (err: any) {
            console.error('[DimensionMarket] 로드 실패:', err);
        } finally {
            setIsLoading(false);
        }
    }, [mode, currentUid, supabaseReady]);

    useEffect(() => {
        loadMarketData();
    }, [loadMarketData]);

    const handleApplyRecommendedPrice = () => {
        if (mode === 'item') {
            if (selectedItemIdx === null || !character.inventory[selectedItemIdx]) return;
            const rec = getRecommendedItemPrice(character.inventory[selectedItemIdx]);
            setPriceGold(String(rec.gold));
            setPriceCrystal(String(rec.manaCrystal));
        } else {
            const allComps = [...(character.companions || []), ...(character.inactiveCompanions || [])];
            const comp = allComps.find(c => c.id === selectedCompId);
            if (!comp) return;
            const rec = getRecommendedCompanionPrice(comp);
            setPriceGold(String(rec.gold));
            setPriceCrystal(String(rec.manaCrystal));
        }
    };

    const handlePublishListing = async () => {
        if (!supabaseReady) {
            notify('warning', 'Supabase 미설정', '.env에 VITE_SUPABASE_URL 및 VITE_SUPABASE_ANON_KEY를 연결해야 경매장을 이용할 수 있습니다.');
            return;
        }
        const goldVal = Math.max(0, parseInt(priceGold || '0', 10) || 0);
        const crystalVal = Math.max(0, parseInt(priceCrystal || '0', 10) || 0);
        if (goldVal === 0 && crystalVal === 0) {
            notify('warning', '가격 입력 필요', '골드 또는 마정석 중 최소 1개 이상의 가격을 입력해 주세요.');
            return;
        }

        setIsLoading(true);
        try {
            if (mode === 'item') {
                if (selectedItemIdx === null || !character.inventory[selectedItemIdx]) {
                    notify('warning', '선택 필요', '출품할 아이템을 선택해 주세요.');
                    return;
                }
                const targetItem = character.inventory[selectedItemIdx];
                await publishMarketListing({
                    sellerUid: currentUid,
                    sellerName: character.name,
                    listingType: 'item',
                    title: targetItem.enhancement ? `+${targetItem.enhancement} ${targetItem.name}` : targetItem.name,
                    rarityOrTier: targetItem.rarity || ItemRarity.NORMAL,
                    levelOrCp: targetItem.enhancement || 0,
                    priceGold: goldVal,
                    priceManaCrystal: crystalVal,
                    payloadJson: JSON.stringify(targetItem)
                });

                const nextInv = character.inventory.filter((_, idx) => idx !== selectedItemIdx);
                const updatedChar = { ...character, inventory: nextInv };
                onUpdateCharacter(
                    updatedChar,
                    `[차원 경매장] '${targetItem.name}'을(를) 출품했습니다. (${goldVal.toLocaleString()}G / 마정석 ${crystalVal}개)`
                );
                await syncCharacterImmediately(updatedChar);
                setSelectedItemIdx(null);
            } else {
                const activeComp = (character.companions || []).find(c => c.id === selectedCompId);
                const inactiveComp = (character.inactiveCompanions || []).find(c => c.id === selectedCompId);
                const targetComp = activeComp || inactiveComp;
                if (!targetComp) {
                    notify('warning', '선택 필요', '출품할 동료를 선택해 주세요.');
                    return;
                }

                await publishMarketListing({
                    sellerUid: currentUid,
                    sellerName: character.name,
                    listingType: 'companion',
                    title: targetComp.name,
                    rarityOrTier: String(targetComp.classTier || '1차'),
                    levelOrCp: targetComp.level || 1,
                    priceGold: goldVal,
                    priceManaCrystal: crystalVal,
                    payloadJson: JSON.stringify(targetComp)
                });

                const nextActive = (character.companions || []).filter(c => c.id !== selectedCompId);
                const nextInactive = (character.inactiveCompanions || []).filter(c => c.id !== selectedCompId);
                const updatedChar = { ...character, companions: nextActive, inactiveCompanions: nextInactive };
                onUpdateCharacter(
                    updatedChar,
                    `[차원 영입소] 동료 '${targetComp.name}'을(를) 등록했습니다. (${goldVal.toLocaleString()}G / 마정석 ${crystalVal}개)`
                );
                await syncCharacterImmediately(updatedChar);
                setSelectedCompId(null);
            }

            notify('success', '출품 완료', '차원 경매장에 매물이 성공적으로 등록되었습니다!');
            setSubTab('settlement');
            await loadMarketData();
        } catch (err: any) {
            notify('failure', '출품 실패', err.message || '경매장 등록 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePurchase = async (listing: DimensionMarketListing) => {
        if (!supabaseReady) return;
        if (character.money < listing.price_gold) {
            notify('warning', '골드 부족', `골드가 부족합니다. (필요: ${listing.price_gold.toLocaleString()}G)`);
            return;
        }
        if (myManaCrystal < listing.price_mana_crystal) {
            notify('warning', '마정석 부족', `마정석이 부족합니다. (필요: ${listing.price_mana_crystal.toLocaleString()}개)`);
            return;
        }

        setIsLoading(true);
        try {
            const res = await purchaseMarketListing(listing.id, currentUid);
            const parsed = JSON.parse(res.payloadJson);

            const nextChar: Character = {
                ...character,
                money: character.money - res.priceGold,
                base: character.base ? {
                    ...character.base,
                    resources: {
                        ...character.base.resources,
                        manaCrystal: (character.base.resources.manaCrystal || 0) - res.priceManaCrystal
                    }
                } : undefined
            };

            if (mode === 'item') {
                const boughtItem: Item = { ...parsed, id: `${parsed.id || 'item'}_${Date.now()}` };
                nextChar.inventory = [...character.inventory, boughtItem];
                onUpdateCharacter(
                    nextChar,
                    `[차원 경매장] '${boughtItem.name}'을(를) 구매했습니다! (-${res.priceGold.toLocaleString()}G / 마정석 -${res.priceManaCrystal})`
                );
                notify('success', '구매 완료', `'${boughtItem.name}'을(를) 인벤토리에 획득했습니다!`);
            } else {
                const boughtComp: Companion = { ...parsed, id: `mkt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
                if ((character.companions || []).length < 6) {
                    nextChar.companions = [...(character.companions || []), boughtComp];
                } else {
                    nextChar.inactiveCompanions = [...(character.inactiveCompanions || []), boughtComp];
                }
                onUpdateCharacter(
                    nextChar,
                    `[차원 영입소] 동료 '${boughtComp.name}'을(를) 영입했습니다! (-${res.priceGold.toLocaleString()}G / 마정석 -${res.priceManaCrystal})`
                );
                notify('success', '영입 완료', `동료 '${boughtComp.name}'이(가) 합류했습니다!`);
            }

            await syncCharacterImmediately(nextChar);
            await loadMarketData();
        } catch (err: any) {
            notify('failure', '구매 실패', err.message || '매물을 구매하지 못했습니다.');
            await loadMarketData();
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelListing = async (listing: DimensionMarketListing) => {
        setIsLoading(true);
        try {
            const res = await cancelMarketListing(listing.id, currentUid);
            const parsed = JSON.parse(res.payloadJson);

            let nextChar = { ...character };
            if (mode === 'item') {
                nextChar = { ...character, inventory: [...character.inventory, parsed as Item] };
                onUpdateCharacter(
                    nextChar,
                    `[차원 경매장] '${res.title}' 출품을 취소하고 인벤토리로 회수했습니다.`
                );
            } else {
                const comp = parsed as Companion;
                if ((character.companions || []).length < 6) {
                    nextChar.companions = [...(character.companions || []), comp];
                } else {
                    nextChar.inactiveCompanions = [...(character.inactiveCompanions || []), comp];
                }
                onUpdateCharacter(nextChar, `[차원 영입소] '${res.title}' 등록을 취소하고 회수했습니다.`);
            }
            await syncCharacterImmediately(nextChar);
            notify('info', '등록 취소 완료', `'${res.title}'을(를) 회수했습니다.`);
            await loadMarketData();
        } catch (err: any) {
            notify('failure', '취소 실패', err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClaimAllSettlements = async () => {
        if (settlements.length === 0) return;
        setIsLoading(true);
        try {
            const totalGold = settlements.reduce((s, st) => s + Number(st.gold_amount || 0), 0);
            const totalCrystal = settlements.reduce((s, st) => s + Number(st.mana_crystal_amount || 0), 0);
            await claimSettlements(currentUid, settlements.map(s => s.id));

            const nextChar: Character = {
                ...character,
                money: character.money + totalGold,
                base: character.base ? {
                    ...character.base,
                    resources: {
                        ...character.base.resources,
                        manaCrystal: (character.base.resources.manaCrystal || 0) + totalCrystal
                    }
                } : undefined
            };
            onUpdateCharacter(
                nextChar,
                `[차원 경매장 정산] 판매 대금 ${totalGold.toLocaleString()}G 및 마정석 ${totalCrystal.toLocaleString()}개를 수령했습니다.`
            );
            await syncCharacterImmediately(nextChar);
            notify('success', '정산 완료', `${totalGold.toLocaleString()}G와 마정석 ${totalCrystal.toLocaleString()}개를 수령했습니다!`);
            await loadMarketData();
        } catch (err: any) {
            notify('failure', '정산 실패', err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredListings = listings.filter(l => {
        if (searchText.trim() && !l.title.toLowerCase().includes(searchText.toLowerCase()) && !l.seller_name.toLowerCase().includes(searchText.toLowerCase())) {
            return false;
        }
        if (rarityFilter !== 'ALL' && l.rarity_or_tier !== rarityFilter) {
            return false;
        }
        return true;
    });

    const allOwnedCompanions = [...(character.companions || []), ...(character.inactiveCompanions || [])];

    return (
        <div className="space-y-3">
            {!supabaseReady && (
                <div className="p-3 bg-amber-950/40 border border-amber-600/50 rounded-xl text-[11px] text-amber-200 flex items-start gap-2">
                    <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold">Supabase 경매장 미연결 (.env 설정 필요)</p>
                        <p className="text-slate-400 mt-0.5">
                            현재 환경변수(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)가 설정되지 않아 실시간 경매장이 비활성화되어 있습니다. 기존 숏코드 탭은 정상 이용 가능합니다.
                        </p>
                    </div>
                </div>
            )}

            {/* 보유 재화 및 서브 탭 */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="text-amber-400 flex items-center gap-1">
                        <Coins size={14} /> {character.money.toLocaleString()}G
                    </span>
                    <span className="text-cyan-400 flex items-center gap-1">
                        <Sparkles size={14} /> 마정석 {myManaCrystal.toLocaleString()}
                    </span>
                </div>
                <button
                    onClick={loadMarketData}
                    disabled={isLoading || !supabaseReady}
                    className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-1 disabled:opacity-40"
                >
                    <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} /> 새로고침
                </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                    onClick={() => setSubTab('browse')}
                    className={`py-2 rounded-lg text-[11px] font-bold transition-all ${subTab === 'browse' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Store size={12} className="inline mr-1" />
                    매물 목록 ({listings.length})
                </button>
                <button
                    onClick={() => setSubTab('sell')}
                    className={`py-2 rounded-lg text-[11px] font-bold transition-all ${subTab === 'sell' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Tag size={12} className="inline mr-1" />
                    {mode === 'item' ? '아이템 출품' : '동료 등록'}
                </button>
                <button
                    onClick={() => setSubTab('settlement')}
                    className={`py-2 rounded-lg text-[11px] font-bold transition-all relative ${subTab === 'settlement' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Wallet size={12} className="inline mr-1" />
                    정산함 ({myListings.length + settlements.length})
                </button>
            </div>

            {/* 1. 매물 목록 */}
            {subTab === 'browse' && (
                <div className="space-y-2.5">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
                            <input
                                type="text"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                placeholder={mode === 'item' ? '아이템명 또는 판매자 검색...' : '동료 이름 또는 등록자 검색...'}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-500"
                            />
                        </div>
                        <select
                            value={rarityFilter}
                            onChange={(e) => setRarityFilter(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2 text-xs text-slate-300 outline-none"
                        >
                            <option value="ALL">전체 등급</option>
                            {mode === 'item' ? (
                                Object.values(ItemRarity).map(r => <option key={r} value={r}>{r}</option>)
                            ) : (
                                <>
                                    <option value="1차">1차</option>
                                    <option value="2차">2차</option>
                                    <option value="3차">3차</option>
                                    <option value="4차">4차</option>
                                </>
                            )}
                        </select>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                        {isLoading ? (
                            <div className="py-10 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                                <Loader2 size={20} className="animate-spin text-amber-400" />
                                <span>차원 경매장 목록 불러오는 중...</span>
                            </div>
                        ) : filteredListings.length === 0 ? (
                            <div className="py-10 text-center bg-slate-950/50 rounded-xl border border-slate-800 text-xs text-slate-500">
                                현재 등록된 매물이 없습니다.
                            </div>
                        ) : (
                            filteredListings.map(listing => {
                                const isMine = listing.seller_uid === currentUid;
                                const canAfford = character.money >= listing.price_gold && myManaCrystal >= listing.price_mana_crystal;
                                return (
                                    <div key={listing.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-bold shrink-0">
                                                    {listing.rarity_or_tier}
                                                </span>
                                                <span className="text-xs font-bold text-white truncate">{listing.title}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-400">
                                                <span>판매자: {listing.seller_name}</span>
                                                {mode === 'companion' && <span>Lv.{listing.level_or_cp}</span>}
                                                <span className="text-amber-400 font-bold">{listing.price_gold.toLocaleString()}G</span>
                                                {listing.price_mana_crystal > 0 && (
                                                    <span className="text-cyan-400 font-bold">+ 마정석 {listing.price_mana_crystal.toLocaleString()}</span>
                                                )}
                                            </div>
                                        </div>
                                        {isMine ? (
                                            <span className="text-[10px] px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 font-bold shrink-0">내 매물</span>
                                        ) : (
                                            <button
                                                onClick={() => handlePurchase(listing)}
                                                disabled={!canAfford || isLoading}
                                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
                                                    canAfford
                                                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow active:scale-95'
                                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                                }`}
                                            >
                                                구매하기
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* 2. 출품하기 */}
            {subTab === 'sell' && (
                <div className="space-y-3">
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 space-y-2">
                        <span className="text-[11px] font-bold text-slate-400 block">
                            {mode === 'item' ? '인벤토리 아이템 선택 (실물 차감)' : '보유 동료 선택 (실물 차감)'}
                        </span>
                        <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                            {mode === 'item' ? (
                                character.inventory.length === 0 ? (
                                    <p className="text-xs text-slate-500 text-center py-4">보유한 아이템이 없습니다.</p>
                                ) : (
                                    character.inventory.map((item, idx) => (
                                        <button
                                            key={`${item.id}_${idx}`}
                                            onClick={() => setSelectedItemIdx(idx)}
                                            className={`w-full p-2 rounded-lg border text-left flex items-center justify-between text-xs transition-all ${
                                                selectedItemIdx === idx
                                                    ? 'bg-indigo-950/70 border-indigo-400 text-white font-bold'
                                                    : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                                            }`}
                                        >
                                            <span className="truncate">{item.enhancement ? `+${item.enhancement} ` : ''}{item.name}</span>
                                            <span className="text-[10px] text-amber-300 shrink-0">{item.rarity}</span>
                                        </button>
                                    ))
                                )
                            ) : (
                                allOwnedCompanions.length === 0 ? (
                                    <p className="text-xs text-slate-500 text-center py-4">보유한 동료가 없습니다.</p>
                                ) : (
                                    allOwnedCompanions.map(comp => (
                                        <button
                                            key={comp.id}
                                            onClick={() => setSelectedCompId(comp.id)}
                                            className={`w-full p-2 rounded-lg border text-left flex items-center justify-between text-xs transition-all ${
                                                selectedCompId === comp.id
                                                    ? 'bg-indigo-950/70 border-indigo-400 text-white font-bold'
                                                    : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                                            }`}
                                        >
                                            <span className="truncate">{comp.name} (Lv.{comp.level})</span>
                                            <span className="text-[10px] text-cyan-300 shrink-0">{comp.classTier}</span>
                                        </button>
                                    ))
                                )
                            )}
                        </div>
                    </div>

                    {/* 가격 입력 + 추천 가격 버튼 */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-300">판매 희망 가격 설정</span>
                            <button
                                type="button"
                                onClick={handleApplyRecommendedPrice}
                                disabled={mode === 'item' ? selectedItemIdx === null : !selectedCompId}
                                className="text-[11px] px-2.5 py-1 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 font-bold disabled:opacity-40"
                            >
                                ✨ 추천 가격 입력
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] text-amber-400 font-bold block mb-1">골드 (G)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={priceGold}
                                    onChange={(e) => setPriceGold(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-amber-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-cyan-400 font-bold block mb-1">마정석 (개)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={priceCrystal}
                                    onChange={(e) => setPriceCrystal(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-cyan-500"
                                />
                            </div>
                        </div>
                        <div className="text-[11px] bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-2 flex items-center justify-between text-slate-400">
                            <span>예상 정산금 (수수료 10% 차감):</span>
                            <span className="font-bold text-emerald-400">
                                {Math.floor((parseInt(priceGold || '0', 10) || 0) * 0.9).toLocaleString()}G
                                {(parseInt(priceCrystal || '0', 10) || 0) > 0 ? ` / 마정석 ${Math.floor((parseInt(priceCrystal || '0', 10) || 0) * 0.9).toLocaleString()}개` : ''}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                            * 출품 시 실물이 즉시 차감되며 세이브 슬롯에 자동 동기화됩니다.
                        </p>
                        <button
                            onClick={handlePublishListing}
                            disabled={isLoading || !supabaseReady || (mode === 'item' ? selectedItemIdx === null : !selectedCompId)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1.5"
                        >
                            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Tag size={14} />}
                            <span>경매장에 출품 등록하기</span>
                        </button>
                    </div>
                </div>
            )}

            {/* 3. 내 매물 & 정산함 */}
            {subTab === 'settlement' && (
                <div className="space-y-3">
                    {/* 판매 완료 정산금 */}
                    <div className="bg-emerald-950/20 border border-emerald-700/40 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-300">수령 가능한 판매 대금 ({settlements.length}건)</span>
                            {settlements.length > 0 && (
                                <button
                                    onClick={handleClaimAllSettlements}
                                    disabled={isLoading}
                                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow"
                                >
                                    일괄 수령
                                </button>
                            )}
                        </div>
                        {settlements.length === 0 ? (
                            <p className="text-[11px] text-slate-500">정산 대기 중인 판매 대금이 없습니다.</p>
                        ) : (
                            <div className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar">
                                {settlements.map(st => (
                                    <div key={st.id} className="flex justify-between text-[11px] bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                        <span className="text-slate-200 truncate">{st.title}</span>
                                        <span className="text-emerald-400 font-bold shrink-0">
                                            +{Number(st.gold_amount).toLocaleString()}G {Number(st.mana_crystal_amount) > 0 ? `/ +${st.mana_crystal_amount} 마정석` : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 내 활성 매물 */}
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
                        <span className="text-xs font-bold text-slate-300 block">내 판매 대기 매물 ({myListings.length}건)</span>
                        {myListings.length === 0 ? (
                            <p className="text-[11px] text-slate-500">등록 중인 매물이 없습니다.</p>
                        ) : (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                                {myListings.map(ml => (
                                    <div key={ml.id} className="flex items-center justify-between gap-2 bg-slate-900/80 px-2.5 py-2 rounded-lg border border-slate-800 text-xs">
                                        <div className="min-w-0">
                                            <p className="font-bold text-white truncate">{ml.title}</p>
                                            <p className="text-[10px] text-amber-400">
                                                {ml.price_gold.toLocaleString()}G {ml.price_mana_crystal > 0 ? `/ 마정석 ${ml.price_mana_crystal}` : ''}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleCancelListing(ml)}
                                            disabled={isLoading}
                                            className="px-2.5 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-700/50 text-[10px] font-bold flex items-center gap-1 shrink-0"
                                        >
                                            <RotateCcw size={11} /> 등록 취소
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
