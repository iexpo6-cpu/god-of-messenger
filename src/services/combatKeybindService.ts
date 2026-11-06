import { useEffect } from 'react';

// 전투 퀵슬롯 단축키 저장 및 관리 서비스

const STORAGE_KEY = 'combat_quick_slot_keybinds_v2';

export const DEFAULT_KEYBINDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

export const PRESET_QWERTY = ['q', 'w', 'e', 'r', 't', 'a', 's', 'd', 'f', 'g'];
export const PRESET_NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
export const PRESET_ACTION = ['z', 'x', 'c', 'v', 'a', 's', 'd', 'f', 'q', 'w'];

/**
 * 저장된 단축키 목록 불러오기 (10개)
 */
export const loadCombatKeybinds = (): string[] => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length === 10) {
                return parsed.map((k, idx) => (typeof k === 'string' && k.trim() !== '' ? k : DEFAULT_KEYBINDS[idx]));
            }
        }
    } catch (e) {
        console.warn('전투 단축키 불러오기 실패:', e);
    }
    return [...DEFAULT_KEYBINDS];
};

/**
 * 단축키 목록 저장
 */
export const saveCombatKeybinds = (keybinds: string[]): void => {
    try {
        const sanitized = Array.from({ length: 10 }, (_, i) => keybinds[i] || DEFAULT_KEYBINDS[i]);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    } catch (e) {
        console.warn('전투 단축키 저장 실패:', e);
    }
};

/**
 * UI 표시용 키 텍스트 변환 (영어 소문자 -> 대문자, 특수키 친화적 변환)
 */
export const formatKeyDisplay = (key: string): string => {
    if (!key) return '-';
    const lower = key.toLowerCase();
    if (lower === ' ') return '스페이스';
    if (lower === 'escape') return 'ESC';
    if (lower === 'enter') return '엔터';
    if (lower === 'tab') return '탭';
    if (lower === 'control') return 'Ctrl';
    if (lower === 'alt') return 'Alt';
    if (lower === 'shift') return 'Shift';
    if (lower === 'backspace') return '백스페이스';
    if (lower.startsWith('arrow')) {
        if (lower === 'arrowup') return '위방향키';
        if (lower === 'arrowdown') return '아래방향키';
        if (lower === 'arrowleft') return '왼쪽방향키';
        if (lower === 'arrowright') return '오른쪽방향키';
    }
    if (key.length === 1) {
        return key.toUpperCase();
    }
    return key;
};

/**
 * 키보드 이벤트와 지정된 단축키가 일치하는지 판별
 */
export const isKeyMatching = (eventKey: string, boundKey: string): boolean => {
    if (!eventKey || !boundKey) return false;
    return eventKey.toLowerCase() === boundKey.toLowerCase();
};

/**
 * 전투 화면 키보드 단축키 감지 훅
 */
export const useCombatKeybindHandler = (
    keybinds: string[],
    enabled: boolean,
    onTriggerSlot: (slotIndex: number) => void
) => {
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // 브라우저 단축키 조합(Ctrl, Alt, Meta)은 무시
            if (e.ctrlKey || e.altKey || e.metaKey) return;

            // 텍스트 입력 중일 때는 무시
            const target = e.target as HTMLElement | null;
            if (target) {
                const tagName = target.tagName.toUpperCase();
                if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || target.isContentEditable) {
                    return;
                }
            }

            const pressedKey = e.key.toLowerCase();
            const matchedIndex = keybinds.findIndex(k => k && k.toLowerCase() === pressedKey);

            if (matchedIndex !== -1) {
                e.preventDefault();
                e.stopPropagation();
                onTriggerSlot(matchedIndex);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [keybinds, enabled, onTriggerSlot]);
};
