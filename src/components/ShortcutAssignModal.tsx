import React from 'react';
import { Character, Skill, Item } from '../types';
import { Zap, X, Check, Trash2, Sword, Package, Sparkles, BookOpen, Flame, Heart, Moon, Shield, Skull, Sun, Waves, Wind } from 'lucide-react';
import { getEntityAllCombatSkills } from '../utils';

const ICON_MAP: Record<string, React.ElementType> = {
  Sword,
  Zap,
  Shield,
  Skull,
  BookOpen,
  Flame,
  Sparkles,
  Heart,
  Waves,
  Wind,
  Sun,
  Moon,
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  targetName: string; // 스킬명 또는 [ITEM] 아이템명
  targetDisplayName: string;
  targetType: 'skill' | 'item';
  targetIcon?: string;
  targetImageUrl?: string;
  character: Character;
  onAssignSlot: (slotIndex: number) => void;
  onRemoveShortcut: () => void;
}

const ShortcutAssignModal: React.FC<Props> = ({
  isOpen,
  onClose,
  targetName,
  targetDisplayName,
  targetType,
  targetIcon,
  targetImageUrl,
  character,
  onAssignSlot,
  onRemoveShortcut,
}) => {
  if (!isOpen) return null;

  const currentShortcuts: string[] = character.skillShortcuts || [];
  const allAvailableSkills = getEntityAllCombatSkills(character as any);

  // 현재 대상이 이미 등록된 슬롯 번호 찾기 (0~9)
  const currentSlotIndex = currentShortcuts.findIndex(s => {
    if (!s) return false;
    if (s === targetName) return true;
    if (targetType === 'item') {
      const raw = s.replace(/^\[ITEM\]\s*/, '');
      return raw === targetDisplayName || s === targetDisplayName;
    }
    return false;
  });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
      <div 
        className="bg-slate-950 border border-slate-800 w-full max-w-lg rounded-2xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* 상단 헤더 */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-500/50 text-amber-400">
              <Zap size={18} className="fill-current" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-1.5">
                <span>숏컷 번호 지정 등록</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                등록할 번호(1~10번 슬롯)를 선택해 주세요.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
            title="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* 선택된 대상 정보 카드 */}
        <div className="p-3 sm:p-4 bg-slate-900/40 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-10 h-10 rounded-lg border overflow-hidden flex items-center justify-center shrink-0 ${
                targetType === 'item' ? 'border-emerald-500/50 bg-emerald-950/40' : 'border-indigo-500/50 bg-indigo-950/40'
              }`}>
                {targetImageUrl ? (
                  <img src={targetImageUrl} alt={targetDisplayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : targetType === 'item' ? (
                  <Package size={20} className="text-emerald-400" />
                ) : (
                  (() => {
                    const IconComp = (targetIcon && ICON_MAP[targetIcon]) || Sword;
                    return <IconComp size={20} className="text-indigo-400" />;
                  })()
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                    targetType === 'item' 
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60' 
                      : 'bg-indigo-950 text-indigo-400 border-indigo-800/60'
                  }`}>
                    {targetType === 'item' ? '소비 아이템' : '전투 스킬'}
                  </span>
                  {currentSlotIndex !== -1 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded border bg-amber-950 text-amber-300 border-amber-700/60">
                      현재 {currentSlotIndex + 1}번 등록됨
                    </span>
                  )}
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate mt-0.5">
                  {targetDisplayName}
                </h4>
              </div>
            </div>

            {currentSlotIndex !== -1 && (
              <button
                type="button"
                onClick={() => {
                  onRemoveShortcut();
                  onClose();
                }}
                className="px-2.5 py-1.5 rounded-lg border border-red-500/50 bg-red-950/70 hover:bg-red-900/80 text-red-300 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors"
              >
                <Trash2 size={13} />
                <span>등록 해제</span>
              </button>
            )}
          </div>
        </div>

        {/* 10개 슬롯 목록 (모바일 최적화 그리드) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 custom-scrollbar">
          <div className="text-[11px] font-bold text-slate-400 mb-1 flex items-center justify-between">
            <span>슬롯 목록 (터치하여 등록 또는 교체)</span>
            <span className="text-[10px] text-amber-400 font-mono font-bold">
              {currentShortcuts.filter(Boolean).length} / 10 사용 중
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((slotIdx) => {
              const shortcutVal = currentShortcuts[slotIdx];
              const isOccupied = Boolean(shortcutVal && shortcutVal.trim() !== '');
              const isCurrentTargetSlot = slotIdx === currentSlotIndex;

              // 슬롯에 할당된 대상 이름 추출
              let occupiedDisplayName = '';
              let occupiedType: 'skill' | 'item' = 'skill';
              if (isOccupied) {
                const isItem = shortcutVal.startsWith('[ITEM]') || (character.inventory || []).some(i => i.name === shortcutVal && !allAvailableSkills.some(s => s.name === shortcutVal));
                occupiedType = isItem ? 'item' : 'skill';
                occupiedDisplayName = isItem ? shortcutVal.replace(/^\[ITEM\]\s*/, '') : shortcutVal;
              }

              return (
                <button
                  key={slotIdx}
                  type="button"
                  onClick={() => {
                    onAssignSlot(slotIdx);
                    onClose();
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-all min-h-[52px] ${
                    isCurrentTargetSlot
                      ? 'bg-amber-950/60 border-amber-400 shadow-md shadow-amber-950/40 text-amber-200'
                      : isOccupied
                        ? 'bg-slate-900/80 border-slate-700/80 hover:border-amber-500/70 hover:bg-slate-850 text-slate-200'
                        : 'bg-slate-950 border-slate-800/80 hover:border-emerald-500/70 hover:bg-slate-900 text-slate-400 border-dashed'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 border ${
                      isCurrentTargetSlot
                        ? 'bg-amber-500 text-slate-950 border-amber-300'
                        : isOccupied
                          ? 'bg-slate-800 text-slate-200 border-slate-600'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}>
                      {slotIdx + 1}
                    </span>

                    <div className="min-w-0 flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] sm:text-xs font-bold truncate">
                          {slotIdx + 1}번 숏컷
                        </span>
                        {isCurrentTargetSlot && (
                          <span className="text-[9px] font-bold px-1 rounded bg-amber-500 text-slate-950">
                            현재
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 truncate">
                        {isOccupied ? (
                          <span className="flex items-center gap-1 text-slate-300">
                            <span className={`text-[9px] px-1 rounded ${
                              occupiedType === 'item' ? 'bg-emerald-950 text-emerald-400' : 'bg-indigo-950 text-indigo-400'
                            }`}>
                              {occupiedType === 'item' ? '아이템' : '스킬'}
                            </span>
                            <span className="truncate">{occupiedDisplayName}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">비어있음</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isCurrentTargetSlot ? (
                      <span className="text-[10px] font-bold text-amber-400 px-2 py-1 rounded bg-amber-950/80 border border-amber-500/40 flex items-center gap-0.5">
                        <Check size={12} />
                        <span>선택됨</span>
                      </span>
                    ) : isOccupied ? (
                      <span className="text-[10px] font-bold text-slate-300 px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:border-amber-400">
                        교체
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-400 px-2 py-1 rounded bg-emerald-950/60 border border-emerald-700/60">
                        등록
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 하단 닫기 */}
        <div className="p-3 bg-slate-900/80 border-t border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShortcutAssignModal;
