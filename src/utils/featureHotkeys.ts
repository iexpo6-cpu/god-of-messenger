import type { ShortcutId } from '../components/HeaderShortcuts';

export interface FeatureHotkeyDef {
    id: ShortcutId;
    label: string;
    category: '캐릭터' | '기능' | '시스템';
}

export const FEATURE_HOTKEY_ITEMS: FeatureHotkeyDef[] = [
    { id: 'character', label: '내 정보', category: '캐릭터' },
    { id: 'skills', label: '스킬', category: '캐릭터' },
    { id: 'stats', label: '스탯', category: '캐릭터' },
    { id: 'items', label: '아이템', category: '캐릭터' },
    { id: 'equipment', label: '장비', category: '캐릭터' },
    { id: 'relations', label: '관계', category: '캐릭터' },
    { id: 'companions', label: '동료', category: '캐릭터' },
    { id: 'rest', label: '휴식', category: '기능' },
    { id: 'mailbox', label: '서신함', category: '기능' },
    { id: 'base', label: '기지', category: '기능' },
    { id: 'dimension', label: '차원', category: '기능' },
    { id: 'bestiary', label: '도감', category: '기능' },
    { id: 'rival', label: '라이벌', category: '기능' },
    { id: 'quest', label: '퀘스트', category: '기능' },
    { id: 'map', label: '지도', category: '기능' },
    { id: 'tactics', label: '전술', category: '기능' },
    { id: 'dashboard', label: '종합관리', category: '기능' },
    { id: 'saveload', label: '저장/로드', category: '시스템' },
    { id: 'settings', label: '게임 설정', category: '시스템' },
];

export const DEFAULT_FEATURE_HOTKEYS: Partial<Record<ShortcutId, string>> = {
    character: 'c',
    skills: 'k',
    stats: 't',
    items: 'i',
    equipment: 'u',
    relations: 'r',
    companions: 'p',
    rest: 'h',
    mailbox: 'm',
    base: 'b',
    dimension: 'n',
    bestiary: 'j',
    rival: 'v',
    quest: 'q',
    map: 'g',
    tactics: 'y',
    dashboard: 'o',
    saveload: 'l',
    settings: ',',
};

const STORAGE_KEY = 'shinryoku_feature_hotkeys_v1';

export const RESERVED_MOVEMENT_KEYS = new Set(['w', 'a', 's', 'd', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'enter', 'escape']);

export function normalizeHotkey(key: string): string {
    return key.trim().toLowerCase();
}

const CODE_SYMBOL_MAP: Record<string, string> = {
    Comma: ',',
    Period: '.',
    Slash: '/',
    Semicolon: ';',
    Quote: "'",
    BracketLeft: '[',
    BracketRight: ']',
    Minus: '-',
    Equal: '=',
    Backquote: '`',
    Backslash: '\\',
};

/**
 * 한글 IME 상태에서도 일관되게 단축키를 인식할 수 있도록 KeyboardEvent.code를 우선 변환합니다.
 */
export function eventToHotkey(e: KeyboardEvent): string {
    const code = e.code || '';
    if (code.startsWith('Key') && code.length === 4) {
        return code.slice(3).toLowerCase();
    }
    if (code.startsWith('Digit') && code.length === 6) {
        return code.slice(5);
    }
    if (/^F\d{1,2}$/.test(code)) {
        return code.toLowerCase();
    }
    if (CODE_SYMBOL_MAP[code]) {
        return CODE_SYMBOL_MAP[code];
    }
    return normalizeHotkey(e.key);
}

export function formatHotkeyLabel(key?: string): string {
    if (!key) return '미지정';
    if (key === ',') return ',';
    return key.toUpperCase();
}

export function loadFeatureHotkeys(): Partial<Record<ShortcutId, string>> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_FEATURE_HOTKEYS };
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_FEATURE_HOTKEYS, ...(parsed || {}) };
    } catch {
        return { ...DEFAULT_FEATURE_HOTKEYS };
    }
}

export function saveFeatureHotkeys(map: Partial<Record<ShortcutId, string>>): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
        window.dispatchEvent(new CustomEvent('shinryoku-hotkeys-updated', { detail: map }));
    } catch {}
}

export function resetFeatureHotkeys(): Partial<Record<ShortcutId, string>> {
    const next = { ...DEFAULT_FEATURE_HOTKEYS };
    saveFeatureHotkeys(next);
    return next;
}
