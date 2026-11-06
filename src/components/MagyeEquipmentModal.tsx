import React, { useState } from 'react';
import { Character, Item, ItemRarity, Stats, MagyeOptionType } from '../types';
import { X, Sparkles, Sword, Zap, Shield, Crown, Target, AlertTriangle, ArrowUp, Gem, Package, Flame, Snowflake, Mountain, Moon, Sun, Hammer, Wind, Eclipse, Droplets, Leaf, Activity, Ghost, CheckCircle, AlertCircle, Loader2, CloudSun, Skull } from 'lucide-react';
import { ENHANCEMENT_CAPS, ENHANCEMENT_CONFIG } from '../constants';
import { getMagyeOptionDescription } from '../utils';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const MagyeEquipmentModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter }) => {
    const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [activeSubTab, setActiveSubTab] = useState<'enhance' | 'transcend' | 'special'>('enhance');
    const [isProcessing, setIsProcessing] = useState(false);

    // 마계 장비 필터링 (신화 등급 및 장비류만)
    const mythicItems = character.inventory.map((item, idx) => ({ item, idx }))
        .filter(entry => 
            entry.item.rarity === ItemRarity.MYTHTIC && 
            ['Weapon', 'SubWeapon', 'Head', 'Body', 'Feet', 'Hand', 'Accessory'].includes(entry.item.type)
        );

    const selectedEntry = selectedItemIdx !== null ? character.inventory[selectedItemIdx] : null;

    const getEnhanceCost = (item: Item) => {
        const level = (item.enhancement || 0) + 1;
        return { primordial: level, soul: level * 50 };
    };

    const getEnhanceRate = (item: Item) => {
        const currentEnh = item.enhancement || 0;
        return Math.min(100, Math.max(1, ENHANCEMENT_CONFIG.baseSuccess(currentEnh + 1) * 10));
    };

    const getTranscendCost = (item: Item) => {
        const currentMax = item.maxEnhancement || ENHANCEMENT_CAPS[ItemRarity.MYTHTIC];
        return { primordial: currentMax * 2, soul: (currentMax + 1) * 200 };
    };

    const getTranscendRate = (item: Item) => {
        const currentMax = item.maxEnhancement || ENHANCEMENT_CAPS[ItemRarity.MYTHTIC];
        return Math.max(1, 100 - currentMax);
    };

    const getSpecialOptionCost = () => ({ primordial: 10, soul: 500 });

    const handleAction = (type: 'enhance' | 'transcend' | 'special', selectedOption?: MagyeOptionType) => {
        if (selectedItemIdx === null || !selectedEntry) return;

        const costs = type === 'enhance' ? getEnhanceCost(selectedEntry) : 
                     type === 'transcend' ? getTranscendCost(selectedEntry) :
                     getSpecialOptionCost();
        
        const primordialCount = character.inventory.filter(i => i.name === "종말의 파편").length;
        const soulCount = character.base?.resources.manaCrystal || 0;

        if (primordialCount < costs.primordial || soulCount < costs.soul) {
            setResultData({ 
                type: 'warning', 
                title: '재료 부족', 
                message: '마계의 기운을 다루기 위한 재료가 부족합니다.', 
                items: [
                    { label: '필요 종말의 파편', after: `${costs.primordial}개` },
                    { label: '필요 마정석', after: `${costs.soul}개` }
                ] 
            });
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = { ...character };
            const targetItemObj = newChar.inventory[selectedItemIdx];

            // 재료 차감
            let pRemoved = 0;
            newChar.inventory = newChar.inventory.filter((item, idx) => {
                if (idx === selectedItemIdx) return true;
                if (item.name === "종말의 파편" && pRemoved < costs.primordial) { pRemoved++; return false; }
                return true;
            });
            if (newChar.base) newChar.base.resources.manaCrystal -= costs.soul;

            const rate = type === 'enhance' ? getEnhanceRate(selectedEntry) : type === 'transcend' ? getTranscendRate(selectedEntry) : 100;
            const success = Math.random() * 100 < rate;

            if (success) {
                const updatedItem = { ...targetItemObj };
                if (type === 'enhance') {
                    updatedItem.enhancement = (updatedItem.enhancement || 0) + 1;
                    if (!updatedItem.stats) updatedItem.stats = { str: 10, int: 10 };
                    Object.keys(updatedItem.stats).forEach(k => {
                        const key = k as keyof Stats;
                        if (typeof updatedItem.stats![key] === 'number') updatedItem.stats![key]! += 50;
                    });
                    setResultData({ type: 'success', title: '마계 강화 성공!', message: `${updatedItem.name}이(가) 마계의 힘으로 강화되었습니다.`, items: [{ label: '강화 수치', after: `+${updatedItem.enhancement}` }] });
                } else if (type === 'transcend') {
                    updatedItem.maxEnhancement = (updatedItem.maxEnhancement || ENHANCEMENT_CAPS[ItemRarity.MYTHTIC]) + 1;
                    setResultData({ type: 'levelup', title: '마계 초월 성공', message: `${updatedItem.name}의 한계치가 확장되었습니다.`, items: [{ label: '최대 강화도', after: `+${updatedItem.maxEnhancement}` }] });
                } else if (type === 'special' && selectedOption) {
                    updatedItem.mythicOption = selectedOption;
                    setResultData({ type: 'success', title: '특별 옵션 부여 완료', message: `${updatedItem.name}에 마계의 저주가 깃들었습니다.`, items: [{ label: '특별 옵션', after: selectedOption }] });
                }
                newChar.inventory[newChar.inventory.findIndex(i => i === targetItemObj)] = updatedItem;
                onUpdateCharacter(newChar, `[마계 장비 관리] ${selectedEntry.name} ${type} 성공!`);
            } else {
                setResultData({ type: 'failure', title: '작업 실패', message: '마계의 기운이 역류했습니다. 재료만 소모되었습니다.', items: [] });
            }
            setIsProcessing(false);
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}
            <div className="bg-slate-950 border-2 border-red-900 w-full max-w-5xl h-[85vh] rounded-3xl shadow-[0_0_50px_rgba(220,38,38,0.2)] flex flex-col overflow-hidden relative">
                <div className="p-6 border-b border-red-900/50 bg-slate-950 flex justify-between items-center shrink-0">
                    <div className="flex items-center">
                        <Skull size={28} className="text-red-500 mr-4 animate-pulse" />
                        <div>
                            <h2 className="text-2xl font-bold text-white font-cinzel tracking-widest">MAGYE FORGE</h2>
                            <p className="text-xs font-bold text-red-400">마계 장비 축복 센터</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    <div className="w-full md:w-80 border-r border-red-900/30 p-4 overflow-y-auto custom-scrollbar shrink-0 bg-slate-950/50">
                        <h3 className="text-xs font-bold text-red-500 uppercase mb-4 flex items-center"><Package size={14} className="mr-2"/> 마계 신화 장비</h3>
                        <div className="space-y-2">
                            {mythicItems.map(entry => (
                                <button key={entry.idx} onClick={() => setSelectedItemIdx(entry.idx)} className={`w-full p-3 rounded-xl border text-left transition-all flex flex-col ${selectedItemIdx === entry.idx ? 'bg-red-950/50 border-red-500 shadow-lg' : 'bg-slate-900 border-red-900/20 hover:border-red-900'}`}>
                                    <div className="flex justify-between items-center w-full">
                                        <span className="font-bold text-sm text-slate-200 truncate">{entry.item.name}</span>
                                        <span className="text-[10px] font-bold text-red-400">+{entry.item.enhancement || 0}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar bg-slate-900 flex flex-col">
                        {selectedEntry ? (
                            <div className="max-w-xl mx-auto w-full space-y-8 animate-in slide-in-from-bottom-2">
                                <div className="text-center">
                                    <div className="w-24 h-24 rounded-3xl mx-auto mb-4 border-2 border-red-900 flex items-center justify-center bg-slate-950 shadow-2xl overflow-hidden">
                                        <img src={selectedEntry.imageUrl || "https://i.ibb.co/6RsrXBZW/image.png"} className="w-full h-full object-cover" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-1">{selectedEntry.name} <span className="text-red-400">+{selectedEntry.enhancement || 0}</span></h3>
                                </div>

                                <div className="flex space-x-2 bg-slate-950 p-1 rounded-xl border border-red-900/30">
                                    <button onClick={() => setActiveSubTab('enhance')} className={`flex-1 py-3 text-xs font-bold rounded-lg ${activeSubTab === 'enhance' ? 'bg-red-900 text-white' : 'text-slate-500'}`}>마계 강화</button>
                                    <button onClick={() => setActiveSubTab('transcend')} className={`flex-1 py-3 text-xs font-bold rounded-lg ${activeSubTab === 'transcend' ? 'bg-red-900 text-white' : 'text-slate-500'}`}>마계 초월</button>
                                    <button onClick={() => setActiveSubTab('special')} className={`flex-1 py-3 text-xs font-bold rounded-lg ${activeSubTab === 'special' ? 'bg-red-900 text-white' : 'text-slate-500'}`}>마계 옵션</button>
                                </div>

                                <div className="bg-slate-950 p-6 rounded-3xl border border-red-900/30 space-y-6">
                                    {activeSubTab === 'special' ? (
                                        <div className="space-y-6">
                                            <div className="text-center p-8 bg-slate-900 rounded-2xl border border-red-900/30">
                                                <Sparkles size={48} className="mx-auto mb-4 text-red-500 animate-pulse" />
                                                <h4 className="text-lg font-bold text-white mb-2">마계 특별 옵션 무작위 부여</h4>
                                                
                                                <div className="bg-slate-950 p-4 rounded-xl border border-red-900/30 mb-6 flex justify-center gap-6">
                                                    <div className="text-center">
                                                        <span className="text-[10px] text-slate-500 block mb-1">필요 종말의 파편</span>
                                                        <span className="text-sm font-bold text-red-400">{getSpecialOptionCost().primordial}개</span>
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="text-[10px] text-slate-500 block mb-1">필요 마정석</span>
                                                        <span className="text-sm font-bold text-blue-400">{getSpecialOptionCost().soul}개</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-left mb-8">
                                                    {Object.values(MagyeOptionType).map((opt) => (
                                                        <div key={opt} className="p-2 bg-slate-950 rounded border border-red-900/30 flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                                                <span className="text-[10px] text-slate-300 font-bold">{opt}</span>
                                                            </div>
                                                            <p className="text-[9px] text-slate-500 leading-tight pl-3">{getMagyeOptionDescription(opt)}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button onClick={() => {
                                                    const options = Object.values(MagyeOptionType);
                                                    handleAction('special', options[Math.floor(Math.random() * options.length)]);
                                                }} disabled={isProcessing} className="w-full py-4 bg-red-900 hover:bg-red-800 text-white rounded-xl font-bold transition-all">
                                                    {isProcessing ? <Loader2 className="animate-spin" size={20}/> : '옵션 무작위 부여'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="bg-slate-900 p-4 rounded-2xl border border-red-900/30 text-center mb-4">
                                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Success Probability</span>
                                                <div className="text-3xl font-mono font-bold text-red-400">
                                                    {activeSubTab === 'enhance' ? getEnhanceRate(selectedEntry) : getTranscendRate(selectedEntry)}%
                                                </div>
                                            </div>
                                            
                                            <div className="bg-slate-950 p-4 rounded-xl border border-red-900/30 mb-6 flex justify-center gap-6">
                                                <div className="text-center">
                                                    <span className="text-[10px] text-slate-500 block mb-1">필요 종말의 파편</span>
                                                    <span className="text-sm font-bold text-red-400">
                                                        {activeSubTab === 'enhance' ? getEnhanceCost(selectedEntry).primordial : getTranscendCost(selectedEntry).primordial}개
                                                    </span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-[10px] text-slate-500 block mb-1">필요 마정석</span>
                                                    <span className="text-sm font-bold text-blue-400">
                                                        {activeSubTab === 'enhance' ? getEnhanceCost(selectedEntry).soul : getTranscendCost(selectedEntry).soul}개
                                                    </span>
                                                </div>
                                            </div>

                                            <button onClick={() => handleAction(activeSubTab)} disabled={isProcessing} className="w-full py-5 rounded-2xl font-bold text-white bg-red-900 hover:bg-red-800 shadow-xl transition-all">
                                                {isProcessing ? <Loader2 className="animate-spin" size={24}/> : activeSubTab === 'enhance' ? '마계 강화 수행' : '마계 초월 수행'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 opacity-50">
                                <Sword size={64} className="mb-4" />
                                <p>강화할 마계 신화 장비를 선택하십시오.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MagyeEquipmentModal;
