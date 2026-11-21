import { Item, ItemRarity, Companion, ClassTier } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

export interface DimensionMarketListing {
    id: string;
    seller_uid: string;
    seller_name: string;
    listing_type: 'item' | 'companion';
    title: string;
    rarity_or_tier: string;
    level_or_cp: number;
    price_gold: number;
    price_mana_crystal: number;
    storage_path: string;
    status: 'active' | 'sold' | 'cancelled';
    buyer_uid?: string | null;
    created_at: string;
    expires_at: string;
}

export interface DimensionSettlement {
    id: string;
    seller_uid: string;
    listing_id?: string | null;
    title: string;
    gold_amount: number;
    mana_crystal_amount: number;
    claimed: boolean;
    created_at: string;
}

export interface DimensionBattleRoster {
    id: string;
    owner_uid: string;
    challenger_name: string;
    level: number;
    combat_power: number;
    shinryoku_type: string;
    wins: number;
    losses: number;
    storage_path: string;
    updated_at: string;
}

// ============================================================================
// 1. 추천 가격 자동 계산기 (아이템 & 동료)
// ============================================================================

const RARITY_BASE_PRICE: Record<string, { gold: number; manaCrystal: number }> = {
    [ItemRarity.NORMAL]: { gold: 5000, manaCrystal: 0 },
    [ItemRarity.MAGIC]: { gold: 25000, manaCrystal: 5 },
    [ItemRarity.RARE]: { gold: 100000, manaCrystal: 20 },
    [ItemRarity.EPIC]: { gold: 500000, manaCrystal: 80 },
    [ItemRarity.UNIQUE]: { gold: 1500000, manaCrystal: 200 },
    [ItemRarity.LEGENDARY]: { gold: 5000000, manaCrystal: 500 },
    [ItemRarity.MYTHTIC]: { gold: 20000000, manaCrystal: 1500 },
};

export const getRecommendedItemPrice = (item: Item): { gold: number; manaCrystal: number } => {
    const base = RARITY_BASE_PRICE[item.rarity || ItemRarity.NORMAL] || { gold: 10000, manaCrystal: 0 };
    const enhLv = Math.max(0, item.enhancement || 0);
    const enhMult = 1 + enhLv * 0.2;
    const optionCount = (item.secondaryOptions?.length || 0) + (item.mythicOption ? 2 : 0);
    const optBonusGold = optionCount * 15000;

    return {
        gold: Math.max(1000, Math.round((base.gold * enhMult + optBonusGold) / 100) * 100),
        manaCrystal: Math.max(0, Math.round(base.manaCrystal * (1 + enhLv * 0.1)))
    };
};

const TIER_COMPANION_PRICE: Record<string, { gold: number; manaCrystal: number }> = {
    [ClassTier.NONE]: { gold: 20000, manaCrystal: 0 },
    [ClassTier.FIRST]: { gold: 100000, manaCrystal: 10 },
    [ClassTier.SECOND]: { gold: 500000, manaCrystal: 50 },
    [ClassTier.LAST]: { gold: 2500000, manaCrystal: 250 },
    [ClassTier.FINAL]: { gold: 15000000, manaCrystal: 1000 },
};

export const getRecommendedCompanionPrice = (comp: Companion): { gold: number; manaCrystal: number } => {
    const tierBase = TIER_COMPANION_PRICE[comp.classTier || ClassTier.FIRST] || { gold: 100000, manaCrystal: 10 };
    const lv = Math.max(1, comp.level || 1);
    const skillBonus = (comp.skills?.length || 0) * 50000;

    return {
        gold: Math.max(10000, Math.round((tierBase.gold + lv * 10000 + skillBonus) / 1000) * 1000),
        manaCrystal: Math.max(0, Math.round(tierBase.manaCrystal + Math.floor(lv / 20)))
    };
};

// ============================================================================
// 2. 실물 경매장 API (매물 목록 / 출품 / 원자적 구매 / 취소 / 정산함)
// ============================================================================

export const fetchMarketListings = async (
    listingType: 'item' | 'companion',
    limitCount: number = 100
): Promise<DimensionMarketListing[]> => {
    if (!isSupabaseConfigured()) return [];
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('dimension_market_listings')
        .select('*')
        .eq('listing_type', listingType)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(limitCount);

    if (error) {
        throw new Error(`경매장 목록 조회 실패: ${error.message}`);
    }
    return (data || []) as DimensionMarketListing[];
};

export const fetchMyListingsAndSettlements = async (
    sellerUid: string,
    listingType?: 'item' | 'companion'
): Promise<{
    myListings: DimensionMarketListing[];
    settlements: DimensionSettlement[];
}> => {
    if (!isSupabaseConfigured() || !sellerUid) {
        return { myListings: [], settlements: [] };
    }
    const supabase = getSupabaseClient();
    if (!supabase) return { myListings: [], settlements: [] };

    let listQuery = supabase
        .from('dimension_market_listings')
        .select('*')
        .eq('seller_uid', sellerUid)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

    if (listingType) {
        listQuery = listQuery.eq('listing_type', listingType);
    }

    const [{ data: listData }, { data: settleData }] = await Promise.all([
        listQuery,
        supabase
            .from('dimension_settlements')
            .select('*')
            .eq('seller_uid', sellerUid)
            .eq('claimed', false)
            .order('created_at', { ascending: false })
    ]);

    // 이미 정산 완료되었거나 취소되어 DB에 남아있는 잔여 데이터 백그라운드 자동 정리
    cleanupSettledMarketData(sellerUid).catch(() => {});

    return {
        myListings: (listData || []) as DimensionMarketListing[],
        settlements: (settleData || []) as DimensionSettlement[]
    };
};

/**
 * 이미 정산(claimed=true)되었거나 취소/판매 완료된 잔여 매물 및 스토리지 파일 정리
 */
export const cleanupSettledMarketData = async (sellerUid: string): Promise<void> => {
    if (!isSupabaseConfigured() || !sellerUid) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
        // 1. 이미 수령 완료(claimed=true)된 정산 레코드 조회 및 삭제
        const { data: claimedRows } = await supabase
            .from('dimension_settlements')
            .select('id, listing_id')
            .eq('seller_uid', sellerUid)
            .eq('claimed', true);

        if (claimedRows && claimedRows.length > 0) {
            const claimedIds = claimedRows.map((r: any) => r.id).filter(Boolean);
            const listingIds = claimedRows.map((r: any) => r.listing_id).filter(Boolean);

            if (claimedIds.length > 0) {
                await supabase
                    .from('dimension_settlements')
                    .delete()
                    .eq('seller_uid', sellerUid)
                    .in('id', claimedIds);
            }

            if (listingIds.length > 0) {
                const { data: soldListings } = await supabase
                    .from('dimension_market_listings')
                    .select('id, storage_path')
                    .eq('seller_uid', sellerUid)
                    .in('id', listingIds);

                const paths = (soldListings || []).map((l: any) => l.storage_path).filter(Boolean);
                if (paths.length > 0) {
                    await supabase.storage.from('dimension-shares').remove(paths).catch(() => {});
                }
                await supabase
                    .from('dimension_market_listings')
                    .delete()
                    .eq('seller_uid', sellerUid)
                    .in('id', listingIds);
            }
        }

        // 2. 취소 완료(status='cancelled')된 매물 행 삭제
        const { data: cancelledRows } = await supabase
            .from('dimension_market_listings')
            .select('id, storage_path')
            .eq('seller_uid', sellerUid)
            .eq('status', 'cancelled');

        if (cancelledRows && cancelledRows.length > 0) {
            const paths = cancelledRows.map((r: any) => r.storage_path).filter(Boolean);
            if (paths.length > 0) {
                await supabase.storage.from('dimension-shares').remove(paths).catch(() => {});
            }
            const cancelIds = cancelledRows.map((r: any) => r.id).filter(Boolean);
            await supabase
                .from('dimension_market_listings')
                .delete()
                .eq('seller_uid', sellerUid)
                .in('id', cancelIds);
        }

        // 3. 미수령 정산 건이 없는 판매 완료(status='sold') 매물 행도 정리
        const { data: soldRows } = await supabase
            .from('dimension_market_listings')
            .select('id, storage_path')
            .eq('seller_uid', sellerUid)
            .eq('status', 'sold');

        if (soldRows && soldRows.length > 0) {
            const { data: pendingSettlements } = await supabase
                .from('dimension_settlements')
                .select('listing_id')
                .eq('seller_uid', sellerUid)
                .eq('claimed', false);

            const pendingListingIds = new Set(
                (pendingSettlements || []).map((s: any) => s.listing_id).filter(Boolean)
            );
            const removableSold = soldRows.filter((r: any) => !pendingListingIds.has(r.id));

            if (removableSold.length > 0) {
                const paths = removableSold.map((r: any) => r.storage_path).filter(Boolean);
                if (paths.length > 0) {
                    await supabase.storage.from('dimension-shares').remove(paths).catch(() => {});
                }
                const soldIds = removableSold.map((r: any) => r.id).filter(Boolean);
                await supabase
                    .from('dimension_market_listings')
                    .delete()
                    .eq('seller_uid', sellerUid)
                    .in('id', soldIds);
            }
        }
    } catch (err) {
        console.warn('[DimensionMarket] 정산/취소 잔여 데이터 정리 중 오류 (무시 가능):', err);
    }
};

export const publishMarketListing = async (params: {
    sellerUid: string;
    sellerName: string;
    listingType: 'item' | 'companion';
    title: string;
    rarityOrTier: string;
    levelOrCp: number;
    priceGold: number;
    priceManaCrystal: number;
    payloadJson: string;
}): Promise<DimensionMarketListing> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
        throw new Error('Supabase가 설정되지 않아 경매장 등록을 진행할 수 없습니다.');
    }

    const listingId = crypto.randomUUID();
    const storagePath = `market/${params.listingType}/${listingId}.json`;
    const blob = new Blob([params.payloadJson], { type: 'application/json;charset=utf-8' });

    const { error: upErr } = await supabase.storage
        .from('dimension-shares')
        .upload(storagePath, blob, {
            upsert: true,
            contentType: 'application/json;charset=utf-8'
        });

    if (upErr) {
        throw new Error(`매물 데이터 업로드 실패: ${upErr.message}`);
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error: dbErr } = await supabase
        .from('dimension_market_listings')
        .insert({
            id: listingId,
            seller_uid: params.sellerUid,
            seller_name: params.sellerName,
            listing_type: params.listingType,
            title: params.title,
            rarity_or_tier: params.rarityOrTier,
            level_or_cp: Math.max(0, Math.floor(params.levelOrCp)),
            price_gold: Math.max(0, Math.floor(params.priceGold)),
            price_mana_crystal: Math.max(0, Math.floor(params.priceManaCrystal)),
            storage_path: storagePath,
            status: 'active',
            expires_at: expiresAt
        })
        .select('*')
        .single();

    if (dbErr || !data) {
        await supabase.storage.from('dimension-shares').remove([storagePath]);
        throw new Error(`경매장 등록 실패: ${dbErr?.message || '알 수 없는 오류'}`);
    }

    return data as DimensionMarketListing;
};

// 매물 상세 툴팁 프리뷰용 인메모리 캐시 (storagePath -> parsed JSON object)
const previewPayloadCache = new Map<string, any>();

/**
 * 매물의 storage_path JSON을 온디맨드 로드(캐싱)하여 툴팁/상세 프리뷰용 객체 반환
 */
export const fetchListingPreviewPayload = async <T = any>(storagePath: string): Promise<T | null> => {
    if (!storagePath || !isSupabaseConfigured()) return null;
    if (previewPayloadCache.has(storagePath)) {
        return previewPayloadCache.get(storagePath) as T;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data: blob, error } = await supabase.storage
        .from('dimension-shares')
        .download(storagePath);

    if (error || !blob) return null;
    try {
        const parsed = JSON.parse(await blob.text());
        if (previewPayloadCache.size > 150) {
            previewPayloadCache.clear();
        }
        previewPayloadCache.set(storagePath, parsed);
        return parsed as T;
    } catch {
        return null;
    }
};

/**
 * 미수령 경매장 정산 건수 경량 카운트 조회 (헤더 알림 배지용)
 */
export const countUnclaimedSettlements = async (sellerUid: string): Promise<number> => {
    if (!isSupabaseConfigured() || !sellerUid) return 0;
    const supabase = getSupabaseClient();
    if (!supabase) return 0;

    try {
        const { count, error } = await supabase
            .from('dimension_settlements')
            .select('id', { count: 'exact', head: true })
            .eq('seller_uid', sellerUid)
            .eq('claimed', false);

        if (error) return 0;
        return count || 0;
    } catch {
        return 0;
    }
};

/**
 * 구매/취소 후 클라이언트 실물 반영 및 세이브 동기화 완료 시점에 스토리지 파일 안전 삭제
 */
export const cleanupMarketStorageFile = async (storagePath?: string | null): Promise<void> => {
    if (!storagePath || !isSupabaseConfigured()) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    previewPayloadCache.delete(storagePath);
    await supabase.storage.from('dimension-shares').remove([storagePath]).catch(() => {});
};

const downloadMarketPayloadWithRetry = async (storagePath: string, retries: number = 2): Promise<string> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.');

    let lastErr: any = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        const { data: blob, error } = await supabase.storage
            .from('dimension-shares')
            .download(storagePath);
        if (!error && blob) {
            return await blob.text();
        }
        lastErr = error;
        if (attempt < retries) {
            await new Promise(res => setTimeout(res, 400 * (attempt + 1)));
        }
    }
    throw new Error(lastErr?.message || '매물 실물 데이터를 불러오지 못했습니다.');
};

export const purchaseMarketListing = async (
    listingId: string,
    buyerUid: string
): Promise<{
    payloadJson: string;
    storagePath: string;
    priceGold: number;
    priceManaCrystal: number;
    title: string;
}> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
        throw new Error('Supabase가 설정되지 않았습니다.');
    }

    const { data, error } = await supabase.rpc('purchase_dimension_listing', {
        p_listing_id: listingId,
        p_buyer_uid: buyerUid
    });

    if (error) {
        throw new Error(`구매 트랜잭션 오류: ${error.message}`);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !row.success) {
        throw new Error(row?.message || '매물 구매에 실패했습니다.');
    }

    const payloadJson = await downloadMarketPayloadWithRetry(row.storage_path, 2);
    return {
        payloadJson,
        storagePath: row.storage_path || '',
        priceGold: Number(row.price_gold || 0),
        priceManaCrystal: Number(row.price_mana_crystal || 0),
        title: row.title || ''
    };
};

export const cancelMarketListing = async (
    listingId: string,
    sellerUid: string
): Promise<{ payloadJson: string; storagePath: string; title: string }> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
        throw new Error('Supabase가 설정되지 않았습니다.');
    }

    const { data, error } = await supabase.rpc('cancel_dimension_listing', {
        p_listing_id: listingId,
        p_seller_uid: sellerUid
    });

    if (error) {
        throw new Error(`등록 취소 오류: ${error.message}`);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !row.success) {
        throw new Error(row?.message || '매물 등록 취소에 실패했습니다.');
    }

    const payloadJson = await downloadMarketPayloadWithRetry(row.storage_path, 2);
    // 취소된 매물 DB 행 삭제 (스토리지 파일은 호출자가 실물 회수 완료 후 cleanupMarketStorageFile로 안전 삭제)
    await supabase
        .from('dimension_market_listings')
        .delete()
        .eq('id', listingId)
        .eq('seller_uid', sellerUid);
    return {
        payloadJson,
        storagePath: row.storage_path || '',
        title: row.title || ''
    };
};

export const claimSettlements = async (
    sellerUid: string,
    settlementIds: string[]
): Promise<void> => {
    if (!settlementIds.length) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // 1. 정산 대상과 연결된 listing_id 먼저 조회
    const { data: settleRows } = await supabase
        .from('dimension_settlements')
        .select('id, listing_id')
        .eq('seller_uid', sellerUid)
        .in('id', settlementIds);

    const listingIds = (settleRows || [])
        .map((r: any) => r.listing_id)
        .filter((id: any): id is string => Boolean(id));

    // 2. 정산 완료된 정산함 레코드 실제 삭제
    const { error } = await supabase
        .from('dimension_settlements')
        .delete()
        .eq('seller_uid', sellerUid)
        .in('id', settlementIds);

    if (error) {
        throw new Error(`정산 수령 처리 실패: ${error.message}`);
    }

    // 3. 판매 및 정산이 모두 끝난 원본 매물 행 + 잔여 스토리지 파일 완전 삭제
    if (listingIds.length > 0) {
        const { data: listingRows } = await supabase
            .from('dimension_market_listings')
            .select('id, storage_path')
            .eq('seller_uid', sellerUid)
            .in('id', listingIds);

        const storagePaths = (listingRows || [])
            .map((r: any) => r.storage_path)
            .filter((p: any): p is string => Boolean(p));

        if (storagePaths.length > 0) {
            await supabase.storage.from('dimension-shares').remove(storagePaths).catch(() => {});
        }

        await supabase
            .from('dimension_market_listings')
            .delete()
            .eq('seller_uid', sellerUid)
            .in('id', listingIds);
    }
};

// ============================================================================
// 3. 차원 배틀 공개 도전 목록 API
// ============================================================================

export const fetchBattleRosters = async (limitCount: number = 100): Promise<DimensionBattleRoster[]> => {
    if (!isSupabaseConfigured()) return [];
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('dimension_battle_rosters')
        .select('*')
        .order('combat_power', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(limitCount);

    if (error) {
        throw new Error(`차원 배틀 목록 조회 실패: ${error.message}`);
    }
    return (data || []) as DimensionBattleRoster[];
};

export const upsertMyBattleRoster = async (params: {
    ownerUid: string;
    challengerName: string;
    level: number;
    combatPower: number;
    shinryokuType: string;
    payloadJson: string;
}): Promise<DimensionBattleRoster> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
        throw new Error('Supabase가 설정되지 않았습니다.');
    }

    const storagePath = `battle-rosters/${params.ownerUid}.json`;
    const blob = new Blob([params.payloadJson], { type: 'application/json;charset=utf-8' });

    const { error: upErr } = await supabase.storage
        .from('dimension-shares')
        .upload(storagePath, blob, {
            upsert: true,
            contentType: 'application/json;charset=utf-8'
        });

    if (upErr) {
        throw new Error(`파티 스냅샷 업로드 실패: ${upErr.message}`);
    }

    const { data, error: dbErr } = await supabase
        .from('dimension_battle_rosters')
        .upsert(
            {
                owner_uid: params.ownerUid,
                challenger_name: params.challengerName,
                level: Math.max(1, Math.floor(params.level)),
                combat_power: Math.max(0, Math.floor(params.combatPower)),
                shinryoku_type: params.shinryokuType || '무속성',
                storage_path: storagePath,
                updated_at: new Date().toISOString()
            },
            { onConflict: 'owner_uid' }
        )
        .select('*')
        .single();

    if (dbErr || !data) {
        throw new Error(`차원 배틀 목록 등록 실패: ${dbErr?.message || '알 수 없는 오류'}`);
    }

    return data as DimensionBattleRoster;
};

export const downloadBattleRosterPayload = async (storagePath: string): Promise<string> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
        throw new Error('Supabase가 설정되지 않았습니다.');
    }
    const { data, error } = await supabase.storage
        .from('dimension-shares')
        .download(storagePath);

    if (error || !data) {
        throw new Error('도전 대상의 파티 데이터를 불러오지 못했습니다.');
    }
    return await data.text();
};

export const recordDimensionBattleResult = async (
    rosterId: string,
    challengerWon: boolean
): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.rpc('record_dimension_battle_result', {
        p_roster_id: rosterId,
        p_challenger_won: challengerWon
    });
};
