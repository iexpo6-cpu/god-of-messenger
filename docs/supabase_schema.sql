-- ============================================================================
-- 신의 사자 RPG — Supabase 하이브리드 세이브/로드 & 차원교신 경매장/배틀 스키마
-- Supabase Dashboard > SQL Editor에 전체 내용을 붙여넣고 Run을 클릭하세요.
-- ============================================================================

-- 1. 유저 세이브 슬롯 메타데이터 테이블 (텍스트 경량 세이브)
CREATE TABLE IF NOT EXISTS public.save_slots (
    user_id TEXT NOT NULL,
    slot_num INTEGER NOT NULL,
    character_name TEXT NOT NULL DEFAULT '이름 없음',
    level INTEGER NOT NULL DEFAULT 1,
    storage_path TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    meta_json JSONB DEFAULT '{}'::jsonb,
    PRIMARY KEY (user_id, slot_num)
);

-- 2. 차원교신 숏코드 공유 테이블 (BT / SM / IT 호환)
CREATE TABLE IF NOT EXISTS public.dimension_shares (
    short_code TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('battle', 'summon', 'item')),
    storage_path TEXT,
    inline_data TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

-- 3. 차원교신 실물 경매장 매물 테이블 (아이템 / 동료)
CREATE TABLE IF NOT EXISTS public.dimension_market_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_uid TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    listing_type TEXT NOT NULL CHECK (listing_type IN ('item', 'companion')),
    title TEXT NOT NULL,
    rarity_or_tier TEXT NOT NULL DEFAULT '',
    level_or_cp BIGINT NOT NULL DEFAULT 0,
    price_gold BIGINT NOT NULL DEFAULT 0 CHECK (price_gold >= 0),
    price_mana_crystal BIGINT NOT NULL DEFAULT 0 CHECK (price_mana_crystal >= 0),
    storage_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
    buyer_uid TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_market_active
    ON public.dimension_market_listings (listing_type, status, created_at DESC);

-- 4. 차원 경매장 판매 대금 정산함 테이블
CREATE TABLE IF NOT EXISTS public.dimension_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_uid TEXT NOT NULL,
    listing_id UUID REFERENCES public.dimension_market_listings(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    gold_amount BIGINT NOT NULL DEFAULT 0,
    mana_crystal_amount BIGINT NOT NULL DEFAULT 0,
    claimed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlements_seller
    ON public.dimension_settlements (seller_uid, claimed, created_at DESC);

-- 5. 차원 배틀 공개 도전 목록 테이블
CREATE TABLE IF NOT EXISTS public.dimension_battle_rosters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_uid TEXT NOT NULL UNIQUE,
    challenger_name TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    combat_power BIGINT NOT NULL DEFAULT 0,
    shinryoku_type TEXT NOT NULL DEFAULT '무속성',
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    storage_path TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_battle_rosters_cp
    ON public.dimension_battle_rosters (combat_power DESC, updated_at DESC);

-- ============================================================================
-- 6. Storage 버킷 생성 (save-bundles, dimension-shares)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
    ('save-bundles', 'save-bundles', true, 10485760),     -- 10MB 제한 (경량 텍스트 전용)
    ('dimension-shares', 'dimension-shares', true, 20971520) -- 20MB 제한 (이미지 포함 교신/매물)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. RLS (Row Level Security) 정책 설정
--    (Firebase Auth UID 기반 클라이언트 연동용 공개 접근 정책)
-- ============================================================================
ALTER TABLE public.save_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dimension_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dimension_market_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dimension_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dimension_battle_rosters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_save_slots" ON public.save_slots;
CREATE POLICY "allow_all_save_slots" ON public.save_slots FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_dimension_shares" ON public.dimension_shares;
CREATE POLICY "allow_all_dimension_shares" ON public.dimension_shares FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_market_listings" ON public.dimension_market_listings;
CREATE POLICY "allow_all_market_listings" ON public.dimension_market_listings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_settlements" ON public.dimension_settlements;
CREATE POLICY "allow_all_settlements" ON public.dimension_settlements FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_battle_rosters" ON public.dimension_battle_rosters;
CREATE POLICY "allow_all_battle_rosters" ON public.dimension_battle_rosters FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_storage_objects" ON storage.objects;
CREATE POLICY "allow_all_storage_objects" ON storage.objects
    FOR ALL USING (bucket_id IN ('save-bundles', 'dimension-shares'))
    WITH CHECK (bucket_id IN ('save-bundles', 'dimension-shares'));

-- ============================================================================
-- 8. 원자적(Atomic) 경매장 거래 & 전적 기록 RPC 함수
-- ============================================================================

-- 8-1. 매물 구매 (동시 구매 경합 방지: FOR UPDATE 행 잠금)
CREATE OR REPLACE FUNCTION public.purchase_dimension_listing(
    p_listing_id UUID,
    p_buyer_uid TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    storage_path TEXT,
    price_gold BIGINT,
    price_mana_crystal BIGINT,
    title TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_row public.dimension_market_listings%ROWTYPE;
BEGIN
    SELECT * INTO v_row
    FROM public.dimension_market_listings
    WHERE id = p_listing_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, '존재하지 않는 매물입니다.'::TEXT, NULL::TEXT, 0::BIGINT, 0::BIGINT, ''::TEXT;
        RETURN;
    END IF;

    IF v_row.status <> 'active' THEN
        RETURN QUERY SELECT FALSE, '이미 판매되었거나 취소된 매물입니다.'::TEXT, NULL::TEXT, 0::BIGINT, 0::BIGINT, v_row.title;
        RETURN;
    END IF;

    IF v_row.seller_uid = p_buyer_uid THEN
        RETURN QUERY SELECT FALSE, '본인이 등록한 매물은 구매할 수 없습니다. [내 매물]에서 취소를 이용해 주세요.'::TEXT, NULL::TEXT, 0::BIGINT, 0::BIGINT, v_row.title;
        RETURN;
    END IF;

    UPDATE public.dimension_market_listings
    SET status = 'sold',
        buyer_uid = p_buyer_uid
    WHERE id = p_listing_id;

    -- 10% 경매장 거래 수수료 차감 후 판매자 정산함 기록 (자전거래 방어)
    INSERT INTO public.dimension_settlements (
        seller_uid, listing_id, title, gold_amount, mana_crystal_amount, claimed
    ) VALUES (
        v_row.seller_uid,
        v_row.id,
        v_row.title,
        FLOOR(v_row.price_gold * 0.9)::BIGINT,
        FLOOR(v_row.price_mana_crystal * 0.9)::BIGINT,
        FALSE
    );

    RETURN QUERY SELECT TRUE, '구매 성공'::TEXT, v_row.storage_path, v_row.price_gold, v_row.price_mana_crystal, v_row.title;
END;
$$;

-- 8-2. 매물 등록 취소 (실물 반환용)
CREATE OR REPLACE FUNCTION public.cancel_dimension_listing(
    p_listing_id UUID,
    p_seller_uid TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    storage_path TEXT,
    title TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_row public.dimension_market_listings%ROWTYPE;
BEGIN
    SELECT * INTO v_row
    FROM public.dimension_market_listings
    WHERE id = p_listing_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, '존재하지 않는 매물입니다.'::TEXT, NULL::TEXT, ''::TEXT;
        RETURN;
    END IF;

    IF v_row.seller_uid <> p_seller_uid THEN
        RETURN QUERY SELECT FALSE, '본인의 매물만 취소할 수 있습니다.'::TEXT, NULL::TEXT, v_row.title;
        RETURN;
    END IF;

    IF v_row.status <> 'active' THEN
        RETURN QUERY SELECT FALSE, '이미 판매되었거나 취소된 매물입니다.'::TEXT, NULL::TEXT, v_row.title;
        RETURN;
    END IF;

    UPDATE public.dimension_market_listings
    SET status = 'cancelled'
    WHERE id = p_listing_id;

    RETURN QUERY SELECT TRUE, '등록 취소 성공'::TEXT, v_row.storage_path, v_row.title;
END;
$$;

-- 8-3. 차원 배틀 승/패 전적 기록
CREATE OR REPLACE FUNCTION public.record_dimension_battle_result(
    p_roster_id UUID,
    p_challenger_won BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_challenger_won THEN
        UPDATE public.dimension_battle_rosters
        SET losses = losses + 1
        WHERE id = p_roster_id;
    ELSE
        UPDATE public.dimension_battle_rosters
        SET wins = wins + 1
        WHERE id = p_roster_id;
    END IF;
END;
$$;

-- ============================================================================
-- 9. anon / authenticated 역할 스키마 및 테이블/함수 실행 권한 부여
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
