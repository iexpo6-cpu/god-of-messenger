/**
 * ============================================================================
 * [신의 사자 RPG] 통합 비주얼 레지스트리 & 어댑터 시스템 (Visual Registry & Adapter)
 * ============================================================================
 * 
 * 목적:
 * 1. 아이템, 몬스터, 보스, 스킬, 캐릭터, 배경 등 전 영역의 비주얼 이미지를
 *    기존 코드베이스의 파괴나 대규모 수정 없이 안전하고 유연하게 주입(Injection)
 * 2. Visualizer 서브에이전트 또는 외부 이미지 생성 파이프라인에서 신규 URL이 확보되면
 *    `registerVisualBatch()`를 통해 즉각 일괄 등록 및 실시간 적용
 * 3. 기존 fallback(더미/플레이스홀더) 이미지 탐지 및 스마트 정규화 매칭 지원
 */

import { getLocalVisualPath } from './localVisualManifest';

export type VisualCategory = 'item' | 'monster' | 'boss' | 'skill' | 'character' | 'location';

export interface VisualBatchPayload {
    items?: Record<string, string>;
    monsters?: Record<string, string>;
    bosses?: Record<string, string>;
    skills?: Record<string, string>;
    characters?: Record<string, string>;
    locations?: Record<string, string>;
}

export interface RegistryStats {
    items: number;
    monsters: number;
    bosses: number;
    skills: number;
    characters: number;
    locations: number;
    total: number;
}

// ----------------------------------------------------------------------------
// 1. 공통 더미 / 플레이스홀더 URL 목록 (Fallback 탐지용)
// ----------------------------------------------------------------------------
export const KNOWN_FALLBACK_URLS = new Set<string>([
    "https://i.ibb.co/6RsrXBZW/image.png", // 기본 아이템 더미
    "https://i.ibb.co/Kz56VGDS/image.png", // 기본 몬스터 / 무기 더미
    "https://i.ibb.co/P9TfV9W1/armor.png", // 기본 방어구 더미
    "https://i.ibb.co/CpZ5dPkw/image.png", // 기본 소모품 더미
]);

/**
 * 주어진 이미지 URL이 플레이스홀더 또는 비어있는지 판별
 */
export const isFallbackVisualUrl = (url?: string | null): boolean => {
    if (!url) return true;
    const trimmed = url.trim();
    if (!trimmed) return true;
    if (trimmed.includes('api.dicebear.com/7.x/shapes')) return true;
    return KNOWN_FALLBACK_URLS.has(trimmed);
};

// ----------------------------------------------------------------------------
// 2. 인메모리 레지스트리 저장소
// ----------------------------------------------------------------------------
const itemRegistry = new Map<string, string>();
const monsterRegistry = new Map<string, string>();
const bossRegistry = new Map<string, string>();
const skillRegistry = new Map<string, string>();
const characterRegistry = new Map<string, string>();
const locationRegistry = new Map<string, string>();

const listeners = new Set<() => void>();

const notifyListeners = () => {
    listeners.forEach(cb => {
        try {
            cb();
        } catch (e) {
            console.error('[VisualRegistry] Listener error:', e);
        }
    });
};

/**
 * 엔티티 이름 정규화 (태그, 단계, 공백, 넘버링 접미사 제거)
 */
export const normalizeVisualKey = (key: string): string => {
    if (!key) return '';
    return key
        .replace(/\[.*?\]\s*/g, '') // [BOSS], [호위], [미궁 마물] 등 접두/태그 제거
        .replace(/^(알|유년기|성장기|성숙기|완전체|궁극체|초궁극체)\s+/, '') // 펫/몬스터 진화 단계 접두사
        .replace(/\s+[A-Z0-9]$/g, '') // A, B, C 또는 1, 2, 3 접미사
        .replace(/\s+/g, ' ')
        .trim();
};

// ----------------------------------------------------------------------------
// 3. 등록(Register) API
// ----------------------------------------------------------------------------

export const registerItemVisual = (nameOrKey: string, url: string): void => {
    if (!nameOrKey || !url) return;
    const cleanUrl = url.trim();
    itemRegistry.set(nameOrKey.trim(), cleanUrl);
    itemRegistry.set(normalizeVisualKey(nameOrKey), cleanUrl);
};

export const registerItemVisuals = (items: Record<string, string>): void => {
    Object.entries(items).forEach(([key, url]) => registerItemVisual(key, url));
    notifyListeners();
};

export const registerMonsterVisual = (nameOrKey: string, url: string): void => {
    if (!nameOrKey || !url) return;
    const cleanUrl = url.trim();
    monsterRegistry.set(nameOrKey.trim(), cleanUrl);
    monsterRegistry.set(normalizeVisualKey(nameOrKey), cleanUrl);
};

export const registerMonsterVisuals = (monsters: Record<string, string>): void => {
    Object.entries(monsters).forEach(([key, url]) => registerMonsterVisual(key, url));
    notifyListeners();
};

export const registerBossVisual = (nameOrId: string, url: string): void => {
    if (!nameOrId || !url) return;
    const cleanUrl = url.trim();
    bossRegistry.set(nameOrId.trim(), cleanUrl);
    bossRegistry.set(normalizeVisualKey(nameOrId), cleanUrl);
};

export const registerBossVisuals = (bosses: Record<string, string>): void => {
    Object.entries(bosses).forEach(([key, url]) => registerBossVisual(key, url));
    notifyListeners();
};

export const registerSkillVisual = (nameOrId: string, url: string): void => {
    if (!nameOrId || !url) return;
    const cleanUrl = url.trim();
    skillRegistry.set(nameOrId.trim(), cleanUrl);
    skillRegistry.set(normalizeVisualKey(nameOrId), cleanUrl);
};

export const registerSkillVisuals = (skills: Record<string, string>): void => {
    Object.entries(skills).forEach(([key, url]) => registerSkillVisual(key, url));
    notifyListeners();
};

export const registerCharacterVisual = (nameOrKey: string, url: string): void => {
    if (!nameOrKey || !url) return;
    const cleanUrl = url.trim();
    characterRegistry.set(nameOrKey.trim(), cleanUrl);
    characterRegistry.set(normalizeVisualKey(nameOrKey), cleanUrl);
};

export const registerCharacterVisuals = (characters: Record<string, string>): void => {
    Object.entries(characters).forEach(([key, url]) => registerCharacterVisual(key, url));
    notifyListeners();
};

export const registerLocationVisual = (nameOrKey: string, url: string): void => {
    if (!nameOrKey || !url) return;
    const cleanUrl = url.trim();
    locationRegistry.set(nameOrKey.trim(), cleanUrl);
    locationRegistry.set(normalizeVisualKey(nameOrKey), cleanUrl);
};

export const registerLocationVisuals = (locations: Record<string, string>): void => {
    Object.entries(locations).forEach(([key, url]) => registerLocationVisual(key, url));
    notifyListeners();
};

/**
 * Visualizer 또는 외부 일괄 생성 파이프라인 전용 통합 배치 등록 함수
 */
export const registerVisualBatch = (payload: VisualBatchPayload): RegistryStats => {
    if (payload.items) {
        Object.entries(payload.items).forEach(([k, u]) => registerItemVisual(k, u));
    }
    if (payload.monsters) {
        Object.entries(payload.monsters).forEach(([k, u]) => registerMonsterVisual(k, u));
    }
    if (payload.bosses) {
        Object.entries(payload.bosses).forEach(([k, u]) => registerBossVisual(k, u));
    }
    if (payload.skills) {
        Object.entries(payload.skills).forEach(([k, u]) => registerSkillVisual(k, u));
    }
    if (payload.characters) {
        Object.entries(payload.characters).forEach(([k, u]) => registerCharacterVisual(k, u));
    }
    if (payload.locations) {
        Object.entries(payload.locations).forEach(([k, u]) => registerLocationVisual(k, u));
    }

    notifyListeners();
    return getRegistryStats();
};

// ----------------------------------------------------------------------------
// 4. 조회(Lookup) API (스마트 정규화 & 부분 일치 지원)
// ----------------------------------------------------------------------------

export const getRegisteredItemImage = (name?: string | null): string | undefined => {
    if (!name) return undefined;
    const raw = name.trim();
    // 0순위: 로컬 정적 에셋(0ms 로딩) 최우선 조회
    const local = getLocalVisualPath(raw) || getLocalVisualPath(normalizeVisualKey(raw));
    if (local) return local;

    if (itemRegistry.has(raw)) return itemRegistry.get(raw);
    const clean = normalizeVisualKey(raw);
    if (itemRegistry.has(clean)) return itemRegistry.get(clean);
    return undefined;
};

export const getRegisteredMonsterVisual = (name?: string | null): string | undefined => {
    if (!name) return undefined;
    const raw = name.trim();
    // 0순위: 로컬 정적 에셋(0ms 로딩) 최우선 조회
    const local = getLocalVisualPath(raw) || getLocalVisualPath(normalizeVisualKey(raw));
    if (local) return local;

    if (monsterRegistry.has(raw)) return monsterRegistry.get(raw);
    const clean = normalizeVisualKey(raw);
    if (monsterRegistry.has(clean)) return monsterRegistry.get(clean);

    // 단어 부분 일치 탐색
    for (const [key, url] of monsterRegistry.entries()) {
        if (clean.includes(key) || key.includes(clean)) {
            return url;
        }
    }
    return undefined;
};

export const getRegisteredBossVisual = (nameOrId?: string | null): string | undefined => {
    if (!nameOrId) return undefined;
    const raw = nameOrId.trim();
    // 0순위: 로컬 정적 에셋(0ms 로딩) 최우선 조회
    const local = getLocalVisualPath(raw) || getLocalVisualPath(normalizeVisualKey(raw));
    if (local) return local;

    if (bossRegistry.has(raw)) return bossRegistry.get(raw);
    const clean = normalizeVisualKey(raw);
    if (bossRegistry.has(clean)) return bossRegistry.get(clean);

    for (const [key, url] of bossRegistry.entries()) {
        if (clean.includes(key) || key.includes(clean)) {
            return url;
        }
    }
    return undefined;
};

export const getRegisteredSkillImage = (nameOrId?: string | null): string | undefined => {
    if (!nameOrId) return undefined;
    const raw = nameOrId.trim();
    if (skillRegistry.has(raw)) return skillRegistry.get(raw);
    const clean = normalizeVisualKey(raw);
    if (skillRegistry.has(clean)) return skillRegistry.get(clean);
    return undefined;
};

export const getRegisteredCharacterVisual = (nameOrKey?: string | null): string | undefined => {
    if (!nameOrKey) return undefined;
    const raw = nameOrKey.trim();
    if (characterRegistry.has(raw)) return characterRegistry.get(raw);
    const clean = normalizeVisualKey(raw);
    if (characterRegistry.has(clean)) return characterRegistry.get(clean);
    return undefined;
};

export const getRegisteredLocationVisual = (nameOrKey?: string | null): string | undefined => {
    if (!nameOrKey) return undefined;
    const raw = nameOrKey.trim();
    if (locationRegistry.has(raw)) return locationRegistry.get(raw);
    const clean = normalizeVisualKey(raw);
    if (locationRegistry.has(clean)) return locationRegistry.get(clean);
    return undefined;
};

export const getRegisteredVisual = (category: VisualCategory, key?: string | null): string | undefined => {
    switch (category) {
        case 'item': return getRegisteredItemImage(key);
        case 'monster': return getRegisteredMonsterVisual(key);
        case 'boss': return getRegisteredBossVisual(key);
        case 'skill': return getRegisteredSkillImage(key);
        case 'character': return getRegisteredCharacterVisual(key);
        case 'location': return getRegisteredLocationVisual(key);
        default: return undefined;
    }
};

// ----------------------------------------------------------------------------
// 5. 엔티티 어댑터 / 주입(Injection) 헬퍼
// ----------------------------------------------------------------------------

/**
 * 아이템 객체에 등록된 최신 비주얼 URL을 주입 (기존 비주얼이 fallback이거나 누락된 경우)
 */
export const injectItemVisual = <T extends { name?: string; imageUrl?: string; visualUrl?: string }>(item: T): T => {
    if (!item) return item;
    const registered = getRegisteredItemImage(item.name);
    if (!registered) return item;

    if (!item.imageUrl || isFallbackVisualUrl(item.imageUrl)) {
        item.imageUrl = registered;
    }
    if (!item.visualUrl || isFallbackVisualUrl(item.visualUrl)) {
        item.visualUrl = registered;
    }
    return item;
};

/**
 * 몬스터 객체에 등록된 최신 비주얼 URL을 주입
 */
export const injectMonsterVisual = <T extends { name?: string; visualUrl?: string }>(monster: T): T => {
    if (!monster) return monster;
    const registered = getRegisteredMonsterVisual(monster.name);
    if (!registered) return monster;

    if (!monster.visualUrl || isFallbackVisualUrl(monster.visualUrl)) {
        monster.visualUrl = registered;
    }
    return monster;
};

/**
 * 보스 객체에 등록된 최신 비주얼 URL을 주입
 */
export const injectBossVisual = <T extends { id?: string; name?: string; visualUrl?: string }>(boss: T): T => {
    if (!boss) return boss;
    const registered = getRegisteredBossVisual(boss.id) || getRegisteredBossVisual(boss.name);
    if (!registered) return boss;

    if (!boss.visualUrl || isFallbackVisualUrl(boss.visualUrl)) {
        boss.visualUrl = registered;
    }
    return boss;
};

/**
 * 스킬 객체에 등록된 최신 비주얼 URL을 주입
 */
export const injectSkillVisual = <T extends { id?: string; name?: string; imageUrl?: string; icon?: string; illustrationUrl?: string }>(skill: T): T => {
    if (!skill) return skill;
    const registered = getRegisteredSkillImage(skill.id) || getRegisteredSkillImage(skill.name);
    if (!registered) return skill;

    if (!skill.imageUrl || isFallbackVisualUrl(skill.imageUrl)) {
        skill.imageUrl = registered;
    }
    return skill;
};

// ----------------------------------------------------------------------------
// 6. 상태 통계 및 관찰자
// ----------------------------------------------------------------------------

export const getRegistryStats = (): RegistryStats => ({
    items: itemRegistry.size,
    monsters: monsterRegistry.size,
    bosses: bossRegistry.size,
    skills: skillRegistry.size,
    characters: characterRegistry.size,
    locations: locationRegistry.size,
    total: itemRegistry.size + monsterRegistry.size + bossRegistry.size + skillRegistry.size + characterRegistry.size + locationRegistry.size
});

export const subscribeVisualUpdates = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

// 브라우저 DevTools 콘솔 및 외부 스크립트 접근용 글로벌 바인딩
if (typeof window !== 'undefined') {
    (window as any).__VISUAL_REGISTRY__ = {
        registerVisualBatch,
        registerItemVisuals,
        registerMonsterVisuals,
        registerBossVisuals,
        registerSkillVisuals,
        getRegistryStats,
        getRegisteredVisual
    };
}

// ----------------------------------------------------------------------------
// 7. 1차 & 2차 생성 및 검증된 비주얼 에셋 기본 초기화 등록 (ko.imgbb.com 공식 호스팅)
// ----------------------------------------------------------------------------
registerVisualBatch({
    monsters: {
        "지옥의 아수라": "https://i.ibb.co/dw9Gpd4j/hell-asura.jpg",
        "기계식 훈련 로봇": "https://i.ibb.co/fdss1kry/mechanical-training-robot-clean-1794397527683.jpg",
        "마력 깃든 스파링 골렘": "https://i.ibb.co/7t8yMHMb/mana-infused-sparring-golem-1794397508197.jpg",
        "빛의 나비": "https://i.ibb.co/VWqv9DKZ/holy-light-butterfly-1794397393983.jpg",
        "화난 멧돼지": "https://i.ibb.co/twZpghGQ/target-01-angry-boar.jpg",
        "오염된 슬라임": "https://i.ibb.co/4zP1xwx/target-02-corrupted-slime.jpg",
        "백사": "https://i.ibb.co/YFMngHhv/target-03-white-serpent.jpg",
        "검은 늑대": "https://i.ibb.co/CptX2gyz/target-04-shadow-wolf.jpg",
        "산적 두목": "https://i.ibb.co/tpgH1Mvd/target-05-bandit-leader.jpg",
        "길 잃은 처녀귀신": "https://i.ibb.co/j0Q24ZM/target-06-lost-maiden-ghost.jpg",
        "지석묘 수호령": "https://i.ibb.co/xKzWT9w8/target-07-dolmen-guardian-spirit.jpg"
    },
    bosses: {
        "산적 두목": "https://i.ibb.co/tpgH1Mvd/target-05-bandit-leader.jpg"
    },
    items: {
        "[유니크] 어둠 서린 가죽 튜닉": "https://i.ibb.co/pr6MWmK2/target-08-shadow-leather_tunic.jpg",
        "어둠 서린 가죽 튜닉": "https://i.ibb.co/pr6MWmK2/target-08-shadow-leather_tunic.jpg",
        "[레어] 그림자 보행자 경갑": "https://i.ibb.co/8LNt6rRV/target-09-shadow-walker_greaves.jpg",
        "그림자 보행자 경갑": "https://i.ibb.co/8LNt6rRV/target-09-shadow-walker_greaves.jpg",
        "프로토타입 레일건": "https://i.ibb.co/mx11nPw/target-10-prototype-railgun.jpg",
        "프로토타입 레일걸": "https://i.ibb.co/mx11nPw/target-10-prototype-railgun.jpg",
        "저격용 레일건 (프로토타입)": "https://i.ibb.co/mx11nPw/target-10-prototype-railgun.jpg"
    }
});

