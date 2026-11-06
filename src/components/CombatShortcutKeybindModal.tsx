import React, { useState, useEffect, useRef } from 'react';
import { Keyboard, X, RotateCcw, Check, Sparkles, Layers } from 'lucide-react';
import { 
    DEFAULT_KEYBINDS, 
    PRESET_QWERTY, 
    PRESET_NUMBERS, 
    PRESET_ACTION, 
    saveCombatKeybinds, 
    formatKeyDisplay 
} from '../services/combatKeybindService';

interface CombatShortcutKeybindModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentKeybinds: string[];
    onSaveKeybinds: (newKeybinds: string[]) => void;
    unitName?: string;
    shortcuts?: string[];
}

export const CombatShortcutKeybindModal: React.FC<CombatShortcutKeybindModalProps> = ({
    isOpen,
    onClose,
    currentKeybinds,
    onSaveKeybinds,
    unitName = '플레이어',
    shortcuts = []
}) => {
    const [keybinds, setKeybinds] = useState<string[]>([...currentKeybinds]);
    const [listeningSlot, setListeningSlot] = useState<number | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // 모달 열릴 때 초기화
    useEffect(() => {
        if (isOpen) {
            setKeybinds([...currentKeybinds]);
            setListeningSlot(null);
            setToastMessage(null);
        }
    }, [isOpen, currentKeybinds]);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2500);
    };

    // 키보드 입력 리스너 (특정 슬롯 바인딩 모드일 때)
    useEffect(() => {
        if (!isOpen || listeningSlot === null) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // 특수 제어키 단독 입력은 방지
            if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            if (e.key === 'Escape') {
                setListeningSlot(null);
                return;
            }

            const inputKey = e.key.toLowerCase();

            setKeybinds(prev => {
                const next = [...prev];
                // 기존에 같은 키를 쓰던 슬롯이 있다면 빈자리로 스왑
                const existingIdx = next.findIndex((k, idx) => idx !== listeningSlot && k.toLowerCase() === inputKey);
                if (existingIdx !== -1) {
                    next[existingIdx] = next[listeningSlot];
                }
                next[listeningSlot] = inputKey;
                return next;
            });

            showToast(`슬롯 #${listeningSlot + 1}의 단축키가 [${formatKeyDisplay(inputKey)}] 로 지정되었습니다.`);
            setListeningSlot(null);
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isOpen, listeningSlot]);

    if (!isOpen) return null;

    // 프리셋 일괄 적용
    const handleApplyPreset = (preset: string[], label: string) => {
        setKeybinds([...preset]);
        setListeningSlot(null);
        showToast(`단축키가 [${label}] 프리셋으로 변경되었습니다.`);
    };

    // 저장 및 닫기
    const handleSave = () => {
        saveCombatKeybinds(keybinds);
        onSaveKeybinds(keybinds);
        onClose();
    };

    // 모바일 터치 사용자를 위한 자주 쓰는 키패드 목록
    const quickTouchKeys = [
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
        'q', 'w', 'e', 'r', 't', 'a', 's', 'd', 'f', 'g',
        'z', 'x', 'c', 'v', 'b', ' '
    ];

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div 
                ref={modalRef}
                className="bg-slate-900 border border-amber-500/50 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 animate-in zoom-in-95 duration-150"
            >
                {/* 헤더 */}
                <div className="bg-slate-950 px-3.5 sm:px-5 py-3 border-b border-amber-500/30 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                            <Keyboard size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h3 className="text-sm sm:text-base font-black text-amber-300">
                                    전투 퀵슬롯 단축키 설정
                                </h3>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-500/30 font-bold">
                                    PC 환경
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                                전투 중 키보드를 눌러 스킬과 아이템을 즉시 발동합니다.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        aria-label="닫기"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* 본문 (모바일 스크롤 최적화) */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 custom-scrollbar">
                    
                    {/* 프리셋 빠른 선택 바 */}
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                            <span className="flex items-center gap-1">
                                <Sparkles size={12} className="text-amber-400" />
                                빠른 프리셋 선택
                            </span>
                            <span className="text-[10px] text-slate-500">원클릭 일괄 적용</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => handleApplyPreset(PRESET_NUMBERS, '숫자 키 1 ~ 0')}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 active:scale-95 transition-all"
                            >
                                숫자 키 (1 ~ 0)
                            </button>
                            <button
                                type="button"
                                onClick={() => handleApplyPreset(PRESET_QWERTY, '스킬 키 Q ~ G')}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 text-xs font-bold border border-indigo-700/60 active:scale-95 transition-all"
                            >
                                스킬 키 (Q ~ G)
                            </button>
                            <button
                                type="button"
                                onClick={() => handleApplyPreset(PRESET_ACTION, '액션 키 Z ~ W')}
                                className="px-2.5 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-300 text-xs font-bold border border-purple-700/60 active:scale-95 transition-all"
                            >
                                액션 키 (Z ~ W)
                            </button>
                        </div>
                    </div>

                    {/* 슬롯 단축키 그리드 (10개) */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-0.5">
                            <span className="flex items-center gap-1">
                                <Layers size={13} className="text-amber-400" />
                                <span>슬롯별 단축키 지정 (총 10개)</span>
                            </span>
                            <span className="text-[11px] text-amber-400">
                                {listeningSlot !== null ? `슬롯 #${listeningSlot + 1} 키 입력 대기 중...` : '슬롯을 누르고 키를 입력하세요'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            {keybinds.map((key, idx) => {
                                const isListening = listeningSlot === idx;
                                const assignedName = shortcuts[idx] || '';
                                const cleanName = assignedName.replace(/^\[ITEM\]\s*/, '');

                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            if (isListening) {
                                                setListeningSlot(null);
                                            } else {
                                                setListeningSlot(idx);
                                            }
                                        }}
                                        className={`relative p-2.5 rounded-xl border text-left flex flex-col justify-between h-20 transition-all active:scale-95 ${
                                            isListening
                                                ? 'bg-amber-950/90 border-amber-400 ring-2 ring-amber-500/50 shadow-lg animate-pulse'
                                                : 'bg-slate-950 hover:bg-slate-850 border-slate-800 hover:border-amber-500/50'
                                        }`}
                                    >
                                        {/* 상단 슬롯 번호 및 단축키 배지 */}
                                        <div className="flex items-center justify-between w-full">
                                            <span className="text-[10px] font-mono font-bold text-slate-400">
                                                슬롯 #{idx + 1}
                                            </span>
                                            <div className={`px-2 py-0.5 rounded-md font-mono font-black text-xs shadow-inner ${
                                                isListening
                                                    ? 'bg-amber-400 text-black'
                                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                            }`}>
                                                {isListening ? '입력 대기' : formatKeyDisplay(key)}
                                            </div>
                                        </div>

                                        {/* 하단 현재 장착된 스킬/아이템 이름 */}
                                        <div className="w-full mt-1">
                                            {cleanName ? (
                                                <div className="text-[11px] font-bold text-slate-200 truncate">
                                                    {cleanName}
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-slate-600 italic">
                                                    미등록 슬롯
                                                </div>
                                            )}
                                            <div className="text-[9px] text-slate-500 mt-0.5">
                                                {isListening ? '키보드를 누르세요' : '클릭하여 변경'}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 모바일 화면/가상 터치 키패드 안내 (입력 대기 중일 때 터치로도 선택 가능) */}
                    {listeningSlot !== null && (
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-500/40 space-y-1.5 animate-in fade-in">
                            <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold">
                                <span>터치로 빠른 키 지정 (슬롯 #{listeningSlot + 1})</span>
                                <button
                                    type="button"
                                    onClick={() => setListeningSlot(null)}
                                    className="text-[10px] text-slate-400 hover:text-white underline"
                                >
                                    취소
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {quickTouchKeys.map(k => (
                                    <button
                                        key={k}
                                        type="button"
                                        onClick={() => {
                                            const targetKey = k.toLowerCase();
                                            setKeybinds(prev => {
                                                const next = [...prev];
                                                const existingIdx = next.findIndex((item, idx) => idx !== listeningSlot && item.toLowerCase() === targetKey);
                                                if (existingIdx !== -1) {
                                                    next[existingIdx] = next[listeningSlot];
                                                }
                                                next[listeningSlot] = targetKey;
                                                return next;
                                            });
                                            showToast(`슬롯 #${listeningSlot + 1}의 단축키가 [${formatKeyDisplay(targetKey)}] 로 지정되었습니다.`);
                                            setListeningSlot(null);
                                        }}
                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white font-mono font-bold text-xs flex items-center justify-center border border-slate-700 active:scale-90 transition-all"
                                    >
                                        {formatKeyDisplay(k)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 안내 문구 */}
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                        <p className="font-bold text-slate-300">💡 단축키 사용 안내</p>
                        <p>• 전투 중 본인 턴일 때 지정한 키를 누르면 해당 슬롯의 스킬 또는 아이템이 즉시 실행됩니다.</p>
                        <p>• 타겟 선택이 필요한 스킬은 키를 누른 후 마우스 또는 번호로 타겟을 지정할 수 있습니다.</p>
                    </div>
                </div>

                {/* 하단 버튼 바 */}
                <div className="bg-slate-950 px-3.5 sm:px-5 py-3 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => handleApplyPreset(DEFAULT_KEYBINDS, '기본 숫자 키')}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all active:scale-95"
                    >
                        <RotateCcw size={14} />
                        <span>기본값 초기화</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all active:scale-95"
                        >
                            취소
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-950/50 active:scale-95 transition-all"
                        >
                            <Check size={16} className="stroke-[3]" />
                            <span>단축키 저장</span>
                        </button>
                    </div>
                </div>

                {/* 토스트 알림 */}
                {toastMessage && (
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-slate-900/95 border border-amber-500/80 text-amber-300 text-xs font-bold shadow-2xl pointer-events-none animate-in fade-in slide-in-from-bottom-2">
                        {toastMessage}
                    </div>
                )}
            </div>
        </div>
    );
};
