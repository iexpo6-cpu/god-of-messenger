
import React, { useState } from 'react';
import { Character, Item, ItemRarity, BaseResources, Stats } from '../types';
// [FIX] Added ArrowRight to the lucide-react imports
import { X, Star, Sparkles, Gem, Package, Zap, Loader2, Info, AlertTriangle, Shield, Sword, Heart, Target, TrendingUp, Flame, ArrowRight } from 'lucide-react';
import { SHINRYOKU_UI_CONFIG } from '../constants';
import { DIVINE_MESSENGER_CONFIG } from '../awakening';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    templeElement: string;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const DivineElementalEnhancementModal: React.FC<Props> = ({ character, templeElement, onClose, onUpdateCharacter }) => {
    const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);

    const uiConfig = SHINRYOKU_UI_CONFIG[templeElement] || SHINRYOKU_UI_CONFIG.default;
    const messengerConfig = Object.values(DIVINE_MESSENGER_CONFIG).find(c => c.elements.includes(templeElement));
    const materialName = messengerConfig?.material || "신의 정수";

    // 해당 신력계열과 맞는 장비만 필터링
    const targetItems = character.inventory.map((item, idx) => ({ item, idx }))
        .filter(entry => entry.item.elementalType === templeElement);

    const selectedEntry = selectedItemIdx !== null ? character.inventory[selectedItemIdx] : null;

    const getEnhancementCost = (item: Item) => {
        const nextLv = (item.divineLevel || 0) + 1;
        return {
            faith: 20 * nextLv,
            mana: 10 * nextLv,
            shard: 1 * nextLv,
            special: 1 * nextLv
        };
    };

    const getSuccessRate = (item: Item) => {
        const current = item.divineLevel || 0;
        return Math.max(1, 100 - current);
    };

    const handleEnhance = () => {
        if (selectedItemIdx === null || !selectedEntry) return;

        const costs = getEnhancementCost(selectedEntry);
        const res = character.base?.resources;
        const shards = character.base?.elementalShards || {};
        
        const currentFaith = character.faith || 0;
        const currentMana = res?.manaCrystal || 0;
        const currentShard = shards[templeElement] || 0;
        const currentSpecial = character.inventory.filter(i => i.name === materialName).length;

        const missing = [];
        if (currentFaith < costs.faith) missing.push(`신앙심 ${costs.faith - currentFaith}`);
        if (currentMana < costs.mana) missing.push(`마정석 ${costs.mana - currentMana}개`);
        if (currentShard < costs.shard) missing.push(`${templeElement} 조각 ${costs.shard - currentShard}개`);
        if (currentSpecial < costs.special) missing.push(`${materialName} ${costs.special - currentSpecial}개`);

        if (missing.length > 0) {
            setResultData({
                type: 'warning',
                title: '재료 부족',
                message: '신성 속성 강화에 필요한 신성한 재료가 부족합니다.',
                items: missing.map(m => ({ label: '부족', after: m }))
            });
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = { ...character };
            const targetItemObj = newChar.inventory[selectedItemIdx];

            // 재료 소모
            newChar.faith -= costs.faith;
            if (newChar.base) {
                newChar.base = {
                    ...newChar.base,
                    resources: { ...newChar.base.resources, manaCrystal: currentMana - costs.mana },
                    elementalShards: { ...newChar.base.elementalShards, [templeElement]: currentShard - costs.shard }
                };
            }

            let removedSpecial = 0;
            newChar.inventory = newChar.inventory.filter((item, idx) => {
                if (idx === selectedItemIdx) return true;
                if (item.name === materialName && removedSpecial < costs.special) {
                    removedSpecial++;
                    return false;
                }
                return true;
            });

            const newIdx = newChar.inventory.findIndex(i => i === targetItemObj);
            const rate = getSuccessRate(selectedEntry);
            const success = Math.random() * 100 < rate;

            if (success) {
                const updatedItem = { ...targetItemObj };
                const prevLv = updatedItem.divineLevel || 0;
                updatedItem.divineLevel = prevLv + 1;
                
                newChar.inventory[newIdx] = updatedItem;
                
                setResultData({
                    type: 'success',
                    title: '신성 강화 성공!',
                    message: `${updatedItem.name}에 신의 기운이 더욱 깊게 깃들었습니다.\n신력 공명 배율이 상승합니다.`,
                    items: [
                        { label: '신성 레벨', before: prevLv, after: updatedItem.divineLevel },
                        { label: '공명 배율', before: `x${(1.5 + prevLv * 0.01).toFixed(2)}`, after: `x${(1.5 + updatedItem.divineLevel * 0.01).toFixed(2)}` }
                    ]
                });
                onUpdateCharacter(newChar, `[신성 속성 강화] ${updatedItem.name} 강화 성공 (+${updatedItem.divineLevel})`);
            } else {
                setResultData({
                    type: 'failure',
                    title: '강화 실패',
                    message: '마력이 조화롭지 못해 기운이 흩어졌습니다. 재료만 소모되었습니다.',
                    items: [{ label: '결과', after: '유지됨' }]
                });
                onUpdateCharacter(newChar, `[신성 속성 강화] ${selectedEntry.name} 강화 실패...`);
            }

            setSelectedItemIdx(newIdx);
            setIsProcessing(false);
        }, 1200);
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}

            <div className={`bg-slate-900 border-2 w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative ${uiConfig.border}`}>
                <div className={`p-6 border-b bg-slate-950 flex justify-between items-center shrink-0 ${uiConfig.border}`}>
                    <div className="flex items-center">
                        <Star size={28} className={`${uiConfig.text} mr-4 animate-pulse`} />
                        <div>
                            <h2 className="text-2xl font-bold text-white font-cinzel tracking-widest">DIVINE RESONANCE</h2>
                            <p className={`text-xs font-bold ${uiConfig.text}`}>{templeElement} 성전: 신성 속성 강화 센터</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Item List */}
                    <div className="w-full md:w-80 border-r border-slate-800 p-4 overflow-y-auto custom-scrollbar shrink-0 bg-slate-950/30">
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center">
                            <Package size={14} className="mr-2"/> 강화 가능 장비 ({templeElement})
                        </h3>
                        <div className="space-y-2">
                            {targetItems.map(entry => (
                                <button
                                    key={entry.idx}
                                    onClick={() => setSelectedItemIdx(entry.idx)}
                                    className={`w-full p-3 rounded-xl border text-left transition-all flex flex-col ${selectedItemIdx === entry.idx ? 'bg-amber-900/30 border-amber-500 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                                >
                                    <div className="flex justify-between items-center w-full">
                                        <span className="font-bold text-sm text-slate-200 truncate">{entry.item.name}</span>
                                        <div className="flex items-center">
                                            <Star size={12} className={`${uiConfig.text} mr-1 fill-current`} />
                                            <span className={`text-[10px] font-bold ${uiConfig.text}`}>{entry.item.divineLevel || 0}</span>
                                        </div>
                                    </div>
                                    <div className="text-[9px] text-slate-500 mt-1 uppercase">{entry.item.type} | {entry.item.rarity}</div>
                                </button>
                            ))}
                            {targetItems.length === 0 && (
                                <div className="text-center py-20 text-slate-600">
                                    <AlertTriangle size={24} className="mx-auto mb-2 opacity-30"/>
                                    <p className="text-[10px]">이 성전과 공명 가능한<br/>'{templeElement}' 장비가 없습니다.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Work Area */}
                    <div className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar bg-slate-900 flex flex-col">
                        {selectedEntry ? (
                            <div className="max-w-xl mx-auto w-full space-y-8 animate-in slide-in-from-bottom-2">
                                <div className="text-center">
                                    <div className={`w-24 h-24 rounded-3xl mx-auto mb-4 border-2 flex items-center justify-center bg-slate-950 shadow-2xl overflow-hidden ${uiConfig.border}`}>
                                        <img src={selectedEntry.imageUrl || "https://i.ibb.co/6RsrXBZW/image.png"} className="w-full h-full object-cover" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-1">{selectedEntry.name}</h3>
                                    <div className="flex items-center justify-center gap-2">
                                        <Star size={20} className={`${uiConfig.text} fill-current`} />
                                        <span className={`text-xl font-bold ${uiConfig.text}`}>Divine Level {selectedEntry.divineLevel || 0}</span>
                                    </div>
                                </div>

                                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-6">
                                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-indigo-500/20 text-center">
                                        <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest block mb-2">Resonance Multiplier Effect</span>
                                        <div className="flex items-center justify-center gap-4">
                                            <div className="text-slate-500 text-sm font-mono">x{(1.5 + (selectedEntry.divineLevel || 0) * 0.01).toFixed(2)}</div>
                                            <ArrowRight size={16} className="text-slate-700" />
                                            <div className="text-xl font-bold text-cyan-400 font-mono">x{(1.5 + ((selectedEntry.divineLevel || 0) + 1) * 0.01).toFixed(2)}</div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Required Materials</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {(() => {
                                                const c = getEnhancementCost(selectedEntry);
                                                const fCount = character.faith || 0;
                                                const mCount = character.base?.resources.manaCrystal || 0;
                                                const sCount = character.base?.elementalShards?.[templeElement] || 0;
                                                const pCount = character.inventory.filter(i => i.name === materialName).length;
                                                
                                                return (
                                                    <>
                                                        <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 flex flex-col items-center">
                                                            <Flame size={14} className="text-amber-500 mb-1"/>
                                                            <span className="text-[8px] text-slate-500">신앙심</span>
                                                            <span className={`text-[10px] font-bold ${fCount >= c.faith ? 'text-slate-200' : 'text-red-500'}`}>{c.faith} / {fCount}</span>
                                                        </div>
                                                        <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 flex flex-col items-center">
                                                            <Zap size={14} className="text-purple-500 mb-1"/>
                                                            <span className="text-[8px] text-slate-500">마정석</span>
                                                            <span className={`text-[10px] font-bold ${mCount >= c.mana ? 'text-slate-200' : 'text-red-500'}`}>{c.mana} / {mCount}</span>
                                                        </div>
                                                        <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 flex flex-col items-center">
                                                            <Gem size={14} className="text-indigo-400 mb-1"/>
                                                            <span className="text-[8px] text-slate-500">조각</span>
                                                            <span className={`text-[10px] font-bold ${sCount >= c.shard ? 'text-slate-200' : 'text-red-500'}`}>{c.shard} / {sCount}</span>
                                                        </div>
                                                        <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 flex flex-col items-center">
                                                            <Package size={14} className={`${uiConfig.text} mb-1`}/>
                                                            <span className="text-[8px] text-slate-500">정수</span>
                                                            <span className={`text-[10px] font-bold ${pCount >= c.special ? 'text-slate-200' : 'text-red-500'}`}>{c.special} / {pCount}</span>
                                                        </div>
                                                    </>
                                                )
                                            })()}
                                        </div>
                                    </div>

                                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center">
                                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Blessing Success Rate</span>
                                        <div className={`text-3xl font-mono font-bold ${getSuccessRate(selectedEntry) > 70 ? 'text-green-400' : getSuccessRate(selectedEntry) > 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {getSuccessRate(selectedEntry)}%
                                        </div>
                                        <p className="text-[9px] text-slate-600 mt-2">강화 실패 시 수치가 하락하거나 장비가 파괴되지 않습니다.</p>
                                    </div>

                                    <button 
                                        onClick={handleEnhance}
                                        disabled={isProcessing}
                                        className={`w-full py-5 rounded-2xl font-bold text-white shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-3 ${uiConfig.bg} hover:brightness-125 border ${uiConfig.border}`}
                                    >
                                        {isProcessing ? <Loader2 className="animate-spin" size={24}/> : <><Sparkles size={20}/> 신성 속성 강화 수행</>}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 opacity-50">
                                <Star size={64} className="mb-4" />
                                <p>좌측 목록에서 신성 기운을 각인할 장비를 선택하십시오.</p>
                                <p className="text-xs mt-2">해당 성전의 속성과 일치하는 장비만 표시됩니다.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end shrink-0">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs">닫기</button>
                </div>
            </div>
        </div>
    );
};

export default DivineElementalEnhancementModal;
