import React, { memo, useMemo, useState } from 'react';
import { Character, Companion, Item, Skill, SkillType } from '../../types';
import { SHINRYOKU_UI_CONFIG } from '../../constants';
import { checkSkillWeaponRequirement } from '../../utils';
import { checkSkillParticipantsMp } from '../../services/BondSkillService';
import { getSkillIconComponent, getItemImage } from '../../services/rpgIconService';
import { getRegisteredSkillImage } from '../../services/visualManager';
import { FastImage } from '../common/FastImage';
import { Zap, Keyboard, Package } from 'lucide-react';

interface CombatQuickSlotsProps {
    currentUnit: Character | Companion;
    player: Character;
    availableSkillList: Skill[];
    shortcuts: string[];
    combatKeybinds: string[];
    isPlayerOrManualCompanionTurn: boolean;
    isPlayerUnit: boolean;
    isAutoBattle: boolean;
    isLoading: boolean;
    formatKeyDisplay: (key: string) => string;
    onTriggerSlot: (slotIdx: number) => void;
    onOpenKeybindModal: () => void;
    onHoverSkillChange?: (skill: Skill | null) => void;
}

export const CombatQuickSlots: React.FC<CombatQuickSlotsProps> = memo(({
    currentUnit,
    player,
    availableSkillList,
    shortcuts,
    combatKeybinds,
    isPlayerOrManualCompanionTurn,
    isPlayerUnit,
    isAutoBattle,
    isLoading,
    formatKeyDisplay,
    onTriggerSlot,
    onOpenKeybindModal,
    onHoverSkillChange
}) => {
    const [hoveredSlotIdx, setHoveredSlotIdx] = useState<number | null>(null);

    // O(1) 스킬 및 인벤토리 조회 맵 사전 구축
    const skillMap = useMemo(() => {
        const map = new Map<string, Skill>();
        for (const s of availableSkillList) {
            if (s.name) map.set(s.name, s);
            if (s.id) map.set(s.id, s);
        }
        return map;
    }, [availableSkillList]);

    const inventoryMap = useMemo(() => {
        const map = new Map<string, { item: Item; qty: number }>();
        for (const invItem of player.inventory || []) {
            if (!invItem?.name) continue;
            const existing = map.get(invItem.name);
            if (existing) {
                existing.qty += 1;
            } else {
                map.set(invItem.name, { item: invItem, qty: 1 });
            }
        }
        return map;
    }, [player.inventory]);

    const filledCount = useMemo(() => shortcuts.filter(Boolean).length, [shortcuts]);

    return (
        <div className="max-w-4xl mx-auto mb-1 bg-slate-950/90 p-1 rounded-lg border border-amber-500/30 shadow-md relative">
            <div className="flex items-center justify-between mb-0.5 px-0.5">
                <div className="flex items-center gap-1 text-[8px] md:text-xs font-bold text-slate-300">
                    <Zap size={10} className="text-amber-400 fill-amber-400 shrink-0" />
                    <span className="text-amber-300 truncate">[{currentUnit.name}] 퀵 슬롯</span>
                    <span className="text-[7.5px] text-slate-500 font-mono">({filledCount}/10)</span>
                </div>
                <button
                    type="button"
                    onClick={onOpenKeybindModal}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] md:text-[10px] font-bold bg-slate-900 hover:bg-slate-850 text-amber-300 hover:text-amber-200 border border-amber-500/40 hover:border-amber-400 transition-colors active:scale-95 shadow-sm"
                    title="전투 단축키 설정"
                >
                    <Keyboard size={11} className="text-amber-400 shrink-0" />
                    <span>단축키 설정</span>
                </button>
            </div>

            <div className="grid grid-cols-10 gap-0.5 sm:gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(slotIdx => {
                    const shortcutName = shortcuts[slotIdx];
                    const hasPrefixItem = Boolean(shortcutName && shortcutName.startsWith('[ITEM]'));
                    const rawShortcutName = shortcutName ? shortcutName.replace(/^\[ITEM\]\s*/, '') : '';
                    const matchedSkill = !hasPrefixItem && shortcutName ? skillMap.get(shortcutName) : undefined;
                    const invEntry = (hasPrefixItem || (!matchedSkill && shortcutName))
                        ? (inventoryMap.get(rawShortcutName) || (shortcutName ? inventoryMap.get(shortcutName) : undefined))
                        : undefined;

                    const skill = matchedSkill || null;
                    const item = (!skill && invEntry) ? invEntry.item : null;
                    const itemQty = invEntry ? invEntry.qty : 0;

                    const isMpEnough = skill ? checkSkillParticipantsMp(skill, player, currentUnit).isAllowed : false;
                    const isWeaponAllowed = skill ? checkSkillWeaponRequirement(currentUnit, skill).isAllowed : true;
                    const isUsable = Boolean(skill && isPlayerOrManualCompanionTurn && !isLoading && isMpEnough && isWeaponAllowed && skill.type !== SkillType.PASSIVE);
                    const isItemUsable = Boolean(item && item.type === 'Consumable' && !item.name.includes('차원주문서') && !item.name.includes('차원 주문서') && isPlayerUnit && !isAutoBattle && !isLoading && itemQty > 0);
                    const isHovered = hoveredSlotIdx === slotIdx && Boolean(skill || item);

                    return (
                        <div key={slotIdx} className="relative group">
                            {isHovered && skill && (
                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 w-44 md:w-52 bg-slate-950 border border-amber-500/60 p-1.5 rounded-lg shadow-2xl z-50 pointer-events-none text-left">
                                    <div className="flex justify-between items-start mb-0.5 border-b border-slate-800 pb-0.5">
                                        <h5 className="font-bold text-[10px] text-amber-300 flex items-center gap-1">
                                            <span>{skill.name}</span>
                                            {skill.tier && <span className="text-[7px] px-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">{skill.tier}</span>}
                                        </h5>
                                        <span className="text-[7.5px] font-mono font-bold text-cyan-300 bg-cyan-950 px-1 rounded border border-cyan-800">
                                            MP {skill.mpCost || 0}
                                        </span>
                                    </div>
                                    {(() => {
                                        const sElem = skill.shinryokuType || (currentUnit as any)?.shinryokuType || '무속성';
                                        const sElemCfg = SHINRYOKU_UI_CONFIG[sElem] || SHINRYOKU_UI_CONFIG.default;
                                        return (
                                            <>
                                                <div className="text-[7.5px] font-mono mb-0.5 flex items-center justify-between">
                                                    <span className="text-slate-400">종류: {skill.type}</span>
                                                    {skill.type !== SkillType.BUFF && skill.type !== SkillType.DEBUFF && skill.type !== SkillType.PASSIVE && (
                                                        <span className={`px-1 py-0.2 rounded border font-bold ${sElemCfg.bg} ${sElemCfg.text} ${sElemCfg.border}`}>
                                                            속성: {sElem}
                                                        </span>
                                                    )}
                                                    <span className="text-slate-400">대상: {skill.targetType === 'aoe' ? '광역' : skill.targetType === 'ally' ? '아군' : '단일'}</span>
                                                </div>
                                                <p className="text-[8px] text-slate-200 leading-tight line-clamp-2 italic bg-slate-900/60 p-1 rounded border border-slate-800 mb-0.5">
                                                    "{skill.description}"
                                                </p>
                                                {skill.powerRatio && (
                                                    <div className="text-[7.5px] text-amber-400 font-mono font-bold flex justify-between items-center">
                                                        <span>위력: {skill.powerRatio}%</span>
                                                        {skill.type !== SkillType.BUFF && skill.type !== SkillType.DEBUFF && skill.type !== SkillType.PASSIVE && <span className={sElemCfg.text}>[속성: {sElem}]</span>}
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                            {isHovered && item && (
                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 w-44 md:w-52 bg-slate-950 border border-emerald-500/60 p-1.5 rounded-lg shadow-2xl z-50 pointer-events-none text-left">
                                    <div className="flex justify-between items-start mb-0.5 border-b border-slate-800 pb-0.5">
                                        <h5 className="font-bold text-[10px] text-emerald-300 flex items-center gap-1">
                                            <span>{item.name}</span>
                                            {item.rarity && <span className="text-[7px] px-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">{item.rarity}</span>}
                                        </h5>
                                        <span className="text-[7.5px] font-mono font-bold text-amber-300 bg-amber-950 px-1 rounded border border-amber-800">
                                            보유 {itemQty}개
                                        </span>
                                    </div>
                                    <div className="text-[7.5px] text-slate-400 font-mono mb-0.5">
                                        종류: {item.type}
                                    </div>
                                    <p className="text-[8px] text-slate-200 leading-tight line-clamp-2 italic bg-slate-900/60 p-1 rounded border border-slate-800 mb-0.5">
                                        "{item.description}"
                                    </p>
                                </div>
                            )}

                            {skill || item ? (
                                <button
                                    type="button"
                                    onClick={() => onTriggerSlot(slotIdx)}
                                    onMouseEnter={() => {
                                        setHoveredSlotIdx(slotIdx);
                                        if (onHoverSkillChange) onHoverSkillChange(skill);
                                    }}
                                    onMouseLeave={() => {
                                        setHoveredSlotIdx(null);
                                        if (onHoverSkillChange) onHoverSkillChange(null);
                                    }}
                                    onTouchStart={() => {
                                        setHoveredSlotIdx(slotIdx);
                                        if (onHoverSkillChange) onHoverSkillChange(skill);
                                    }}
                                    onTouchEnd={() => setTimeout(() => {
                                        setHoveredSlotIdx(null);
                                        if (onHoverSkillChange) onHoverSkillChange(null);
                                    }, 2500)}
                                    disabled={skill ? !isUsable : !isItemUsable}
                                    className={`w-full h-8 sm:h-10 p-0.5 rounded border flex flex-col items-center justify-center gap-0 transition-colors relative overflow-hidden group ${
                                        skill
                                            ? isUsable
                                                ? 'bg-gradient-to-b from-indigo-950/80 to-slate-950 border-indigo-500/60 hover:border-amber-400 hover:from-indigo-900/90 text-slate-100 shadow-sm active:scale-95 cursor-pointer'
                                                : 'bg-slate-950/60 border-slate-800/80 text-slate-600 opacity-50 cursor-not-allowed'
                                            : isItemUsable
                                                ? 'bg-gradient-to-b from-emerald-950/80 to-slate-950 border-emerald-500/60 hover:border-amber-400 hover:from-emerald-900/90 text-slate-100 shadow-sm active:scale-95 cursor-pointer'
                                                : 'bg-slate-950/60 border-slate-800/80 text-slate-600 opacity-50 cursor-not-allowed'
                                    }`}
                                >
                                    <span className="absolute top-0.5 left-0.5 text-[5px] sm:text-[6.5px] font-mono font-bold text-amber-400/90 z-10 leading-none flex items-center gap-0.5 bg-slate-950/80 px-0.5 rounded border border-amber-500/20" title={`단축키: ${formatKeyDisplay(combatKeybinds[slotIdx])}`}>
                                        <span>#{slotIdx + 1}</span>
                                        <span className="text-amber-300 font-black">[{formatKeyDisplay(combatKeybinds[slotIdx])}]</span>
                                    </span>

                                    {skill ? (
                                        <span className={`absolute top-0.5 right-0.5 text-[5px] sm:text-[7px] font-mono font-bold px-0.5 rounded border z-10 leading-none ${
                                            isMpEnough ? 'bg-cyan-950/90 text-cyan-300 border-cyan-800/60' : 'bg-red-950/90 text-red-400 border-red-800/60'
                                        }`}>
                                            {skill.mpCost || 0}M
                                        </span>
                                    ) : (
                                        <span className="absolute top-0.5 right-0.5 text-[5px] sm:text-[7px] font-mono font-bold px-0.5 rounded border z-10 leading-none bg-emerald-950/90 text-emerald-300 border-emerald-800/60">
                                            {itemQty}
                                        </span>
                                    )}

                                    <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded border ${skill ? 'border-indigo-400/30' : 'border-emerald-400/30'} overflow-hidden bg-slate-950 flex items-center justify-center shrink-0 mt-0.5 shadow-inner`}>
                                        {skill ? (
                                            (skill.imageUrl || getRegisteredSkillImage(skill.id) || getRegisteredSkillImage(skill.name)) ? (
                                                <FastImage src={skill.imageUrl || getRegisteredSkillImage(skill.id) || getRegisteredSkillImage(skill.name)} alt={skill.name} className="w-full h-full object-cover" />
                                            ) : (
                                                (() => {
                                                    const IconComp = getSkillIconComponent(skill);
                                                    return <IconComp size={8} className={isUsable ? 'text-indigo-300 group-hover:text-amber-300' : 'text-slate-600'} />;
                                                })()
                                            )
                                        ) : (
                                            item ? (
                                                <FastImage src={getItemImage(item)} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Package size={8} className={isItemUsable ? 'text-emerald-300 group-hover:text-amber-300' : 'text-slate-600'} />
                                            )
                                        )}
                                    </div>

                                    <span className="text-[5.5px] sm:text-[7.5px] font-bold truncate w-full text-center leading-none mt-0.5 px-0.5">
                                        {item ? item.name : skill?.name}
                                    </span>
                                    {skill && skill.type !== SkillType.BUFF && skill.type !== SkillType.DEBUFF && skill.type !== SkillType.PASSIVE && (() => {
                                        const sElem = skill.shinryokuType || (currentUnit as any)?.shinryokuType || '무속성';
                                        const sElemCfg = SHINRYOKU_UI_CONFIG[sElem] || SHINRYOKU_UI_CONFIG.default;
                                        return (
                                            <span className={`text-[4.5px] sm:text-[6.5px] font-bold px-0.5 sm:px-1 py-0.2 rounded border ${sElemCfg.bg} ${sElemCfg.text} ${sElemCfg.border} leading-none truncate max-w-full mt-0.5 shadow-sm`}>
                                                속성: {sElem}
                                            </span>
                                        );
                                    })()}
                                </button>
                            ) : (
                                <div className="w-full h-8 sm:h-10 p-0.5 rounded border border-dashed border-slate-800/80 bg-slate-950/40 flex flex-col items-center justify-center text-slate-600">
                                    <span className="text-[5px] sm:text-[6.5px] font-mono leading-none text-slate-500">
                                        #{slotIdx + 1} [{formatKeyDisplay(combatKeybinds[slotIdx])}]
                                    </span>
                                    <span className="text-[5px] text-slate-600 leading-none mt-0.5">빈 슬롯</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
