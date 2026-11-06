
import React, { useState } from 'react';
import { Character, Item, ItemRarity, BaseResources, Stats, MythicOptionType } from '../types';
import { X, Sparkles, Sword, Zap, Shield, Crown, Target, AlertTriangle, ArrowUp, Gem, Package, Flame, Snowflake, Mountain, Moon, Sun, Hammer, Wind, Eclipse, Droplets, Leaf, Activity, Ghost, CheckCircle, AlertCircle, Loader2, CloudSun } from 'lucide-react';
import { SHINRYOKU_UI_CONFIG, ENHANCEMENT_CAPS, ENHANCEMENT_CONFIG, SHINRYOKU_TYPES_LIST } from '../constants';
import { DIVINE_MESSENGER_CONFIG } from '../awakening';
import { getEnhancedStatValue, getMythicOptionDescription } from '../utils';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    templeElement: string;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const ELEMENT_ICONS: Record<string, any> = {
    "태양계": Sun, "화염계": Flame, "광휘계": Sparkles, "월광계": Moon,
    "전격계": Zap, "대지계": Mountain, "질풍계": CloudSun, "빙결계": Snowflake,
    "해수계": Droplets, "강철계": Hammer, "암흑계": Ghost, "초화계": Leaf,
    "무기강화계": Sword, "신체강화계": Activity
};

const TempleEquipmentModal: React.FC<Props> = ({ character, templeElement, onClose, onUpdateCharacter }) => {
    const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [activeSubTab, setActiveSubTab] = useState<'enhance' | 'transcend' | 'special'>('enhance');
    const [isProcessing, setIsProcessing] = useState(false);

    const uiConfig = SHINRYOKU_UI_CONFIG[templeElement] || SHINRYOKU_UI_CONFIG.default;
    const messengerConfig = Object.values(DIVINE_MESSENGER_CONFIG).find(c => c.elements.includes(templeElement));
    const materialName = messengerConfig?.material || "신의 정수";

    // 필터링: 신화 등급이며 템플 속성과 일치하는 인벤토리 아이템
    const mythicItems = character.inventory.map((item, idx) => ({ item, idx }))
        .filter(entry => entry.item.rarity === ItemRarity.MYTHTIC && entry.item.elementalType === templeElement);

    const selectedEntry = selectedItemIdx !== null ? character.inventory[selectedItemIdx] : null;

    // 1. 강화 로직용 계산
    const getEnhanceCost = (item: Item) => {
        const level = (item.enhancement || 0) + 1;
        return {
            primordial: level, // 태초의 빛
            shard: level,     // 해당 속성 조각
            special: level    // 전용 재료
        };
    };

    const getEnhanceRate = (item: Item) => {
        const currentEnh = item.enhancement || 0;
        const baseRate = ENHANCEMENT_CONFIG.baseSuccess(currentEnh + 1);
        return Math.min(100, Math.max(1, baseRate * 10));
    };

    // 2. 초월 로직용 계산
    const getTranscendCost = (item: Item) => {
        const currentMax = item.maxEnhancement || ENHANCEMENT_CAPS[ItemRarity.MYTHTIC];
        const currentEnh = item.enhancement || 0;
        return {
            primordial: currentMax,
            shard: currentEnh + 1,
            special: currentEnh + 1
        };
    };

    const getTranscendRate = (item: Item) => {
        const currentMax = item.maxEnhancement || ENHANCEMENT_CAPS[ItemRarity.MYTHTIC];
        return Math.max(1, 100 - currentMax);
    };

    // 3. 특별 옵션 로직용 계산
    const getSpecialOptionCost = (item: Item) => {
        return {
            primordial: 10, // 태초의 빛 10개
            shard: 50,      // 해당 속성 조각 50개
            special: 5      // 전용 재료 5개
        };
    };

    const handleAction = (type: 'enhance' | 'transcend' | 'special', selectedOption?: MythicOptionType) => {
        if (selectedItemIdx === null || !selectedEntry) return;

        const shards = character.base?.elementalShards || {};
        const costs = type === 'enhance' ? getEnhanceCost(selectedEntry) : 
                     type === 'transcend' ? getTranscendCost(selectedEntry) :
                     getSpecialOptionCost(selectedEntry);
        
        // 재료 확인
        const primordialCount = character.inventory.filter(i => i.name === "태초의 빛").length;
        const specialCount = character.inventory.filter(i => i.name === materialName).length;
        const shardCount = shards[templeElement] || 0;

        const missing = [];
        if (primordialCount < costs.primordial) missing.push(`태초의 빛 ${costs.primordial - primordialCount}개`);
        if (shardCount < costs.shard) missing.push(`${templeElement} 조각 ${costs.shard - shardCount}개`);
        if (specialCount < costs.special) missing.push(`${materialName} ${costs.special - specialCount}개`);

        if (missing.length > 0) {
            setResultData({
                type: 'warning',
                title: '재료 부족',
                message: '수행에 필요한 성스러운 재료가 부족합니다.',
                items: missing.map(m => ({ label: '부족', after: m }))
            });
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = { ...character };
            const targetItemObj = newChar.inventory[selectedItemIdx]; // 강화할 원본 객체 참조

            // 1. 재료 차감 (강화할 아이템 인덱스 자체는 건드리지 않도록 필터링 시 인덱스 보호)
            let pRemoved = 0;
            let sRemoved = 0;
            const nextInventory = newChar.inventory.filter((item, idx) => {
                if (idx === selectedItemIdx) return true; // 현재 강화 대상은 절대 필터링에서 삭제하지 않음
                if (item.name === "태초의 빛" && pRemoved < costs.primordial) { pRemoved++; return false; }
                if (item.name === materialName && sRemoved < costs.special) { sRemoved++; return false; }
                return true;
            });
            
            // 필터링된 배열에서 강화 대상 아이템의 새로운 인덱스 찾기
            const newIdx = nextInventory.findIndex(i => i === targetItemObj);
            
            if (newChar.base) {
                newChar.base = {
                    ...newChar.base,
                    elementalShards: {
                        ...newChar.base.elementalShards,
                        [templeElement]: (newChar.base.elementalShards[templeElement] || 0) - costs.shard
                    }
                };
            }

            const rate = type === 'enhance' ? getEnhanceRate(selectedEntry) : 
                         type === 'transcend' ? getTranscendRate(selectedEntry) : 100;
            const success = Math.random() * 100 < rate;

            if (success) {
                const updatedItem = { ...targetItemObj }; // 객체 복사
                if (type === 'enhance') {
                    const prev = updatedItem.enhancement || 0;
                    updatedItem.enhancement = prev + 1;
                    if (!updatedItem.stats) updatedItem.stats = { str: 10, int: 10 };
                    Object.keys(updatedItem.stats).forEach(k => {
                        const key = k as keyof Stats;
                        if (typeof updatedItem.stats![key] === 'number') {
                            updatedItem.stats![key]! += 50; 
                        }
                    });
                    
                    setResultData({
                        type: 'success',
                        title: '강화 대성공!',
                        message: `성전의 축복으로 ${updatedItem.name}이(가) 더 강력해졌습니다.`,
                        items: [
                            { label: '강화 수치', before: `+${prev}`, after: `+${updatedItem.enhancement}` },
                            { label: '성공 확률', after: `${rate.toFixed(1)}%` }
                        ]
                    });
                } else if (type === 'transcend') {
                    const prevMax = updatedItem.maxEnhancement || ENHANCEMENT_CAPS[ItemRarity.MYTHTIC];
                    updatedItem.maxEnhancement = prevMax + 1;
                    setResultData({
                        type: 'levelup',
                        title: '장비 초월 성공',
                        message: `${updatedItem.name}의 한계치가 확장되었습니다.`,
                        items: [{ label: '최대 강화도', before: `+${prevMax}`, after: `+${updatedItem.maxEnhancement}` }]
                    });
                } else if (type === 'special' && selectedOption) {
                    const prevOption = updatedItem.mythicOption;
                    updatedItem.mythicOption = selectedOption;
                    setResultData({
                        type: 'success',
                        title: '특별 옵션 부여 완료',
                        message: `${updatedItem.name}에 신화 특별 옵션이 깃들었습니다.`,
                        items: [{ label: '특별 옵션', before: prevOption || '없음', after: selectedOption }]
                    });
                }
                nextInventory[newIdx] = updatedItem; // 새 배열의 정확한 위치에 업데이트된 아이템 삽입
                newChar.inventory = nextInventory;
                onUpdateCharacter(newChar, `[성전 장비 관리] ${selectedEntry.name} ${type === 'enhance' ? '강화' : '초월'} 성공!`);
            } else {
                newChar.inventory = nextInventory; // 실패 시에도 재료 소모된 인벤토리로 교체
                setResultData({
                    type: 'failure',
                    title: '작업 실패',
                    message: '신의 기운이 흩어졌습니다. 재료만 소모되고 장비는 무사합니다.',
                    items: [{ label: '결과', after: '유지됨' }]
                });
                onUpdateCharacter(newChar, `[성전 장비 관리] ${selectedEntry.name} ${type === 'enhance' ? '강화' : '초월'} 실패... (하락 없음)`);
            }
            
            setSelectedItemIdx(newIdx); // 선택 인덱스 갱신
            setIsProcessing(false);
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}

            <div className={`bg-slate-900 border w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative ${uiConfig.border}`}>
                
                <div className={`p-6 border-b bg-slate-950 flex justify-between items-center shrink-0 ${uiConfig.border}`}>
                    <div className="flex items-center">
                        <Crown size={28} className={`${uiConfig.text} mr-4 animate-pulse`} />
                        <div>
                            <h2 className="text-2xl font-bold text-white font-cinzel tracking-widest">MYTHIC FORGE</h2>
                            <p className={`text-xs font-bold ${uiConfig.text}`}>{templeElement} 성전: 신화 장비 축복 센터</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Item List */}
                    <div className="w-full md:w-80 border-r border-slate-800 p-4 overflow-y-auto custom-scrollbar shrink-0 bg-slate-950/30">
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center">
                            <Package size={14} className="mr-2"/> 대상 신화 장비 ({templeElement})
                        </h3>
                        <div className="space-y-2">
                            {mythicItems.map(entry => (
                                <button
                                    key={entry.idx}
                                    onClick={() => setSelectedItemIdx(entry.idx)}
                                    className={`w-full p-3 rounded-xl border text-left transition-all flex flex-col ${selectedItemIdx === entry.idx ? 'bg-amber-900/30 border-amber-500 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                                >
                                    <div className="flex justify-between items-center w-full">
                                        <span className="font-bold text-sm text-slate-200 truncate">{entry.item.name}</span>
                                        <span className={`text-[10px] font-bold ${uiConfig.text}`}>+{entry.item.enhancement || 0}</span>
                                    </div>
                                    <div className="text-[9px] text-slate-500 mt-1 uppercase">{entry.item.type} | Max +{entry.item.maxEnhancement || ENHANCEMENT_CAPS[ItemRarity.MYTHTIC]}</div>
                                </button>
                            ))}
                            {mythicItems.length === 0 && (
                                <div className="text-center py-20 text-slate-600">
                                    <AlertTriangle size={24} className="mx-auto mb-2 opacity-30"/>
                                    <p className="text-[10px]">이 성전에서 축복 가능한<br/>'{templeElement}' 신화 장비가 없습니다.</p>
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
                                    <h3 className="text-2xl font-bold text-white mb-1">{selectedEntry.name} <span className={uiConfig.text}>+{selectedEntry.enhancement || 0}</span></h3>
                                    <p className="text-xs text-slate-500">Maximum Enhancement: +{selectedEntry.maxEnhancement || ENHANCEMENT_CAPS[ItemRarity.MYTHTIC]}</p>
                                </div>

                                <div className="flex space-x-2 bg-slate-950/50 p-1 rounded-xl border border-slate-800">
                                    <button onClick={() => setActiveSubTab('enhance')} className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'enhance' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>신화 강화 (Blessing)</button>
                                    <button onClick={() => setActiveSubTab('transcend')} className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'transcend' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>한계 초월 (Transcend)</button>
                                    <button onClick={() => setActiveSubTab('special')} className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'special' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>특별 옵션 (Special)</button>
                                </div>

                                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-6">
                                    {activeSubTab === 'special' ? (
                                        <div className="space-y-6">
                                            <div className="text-center p-8 bg-slate-900 rounded-2xl border border-slate-800">
                                                <Sparkles size={48} className="mx-auto mb-4 text-amber-500 animate-pulse" />
                                                <h4 className="text-lg font-bold text-white mb-2">신화 특별 옵션 무작위 부여</h4>
                                                <p className="text-xs text-slate-500 mb-6">
                                                    장비에 깃든 신화의 힘을 일깨워 무작위 특별 옵션을 부여합니다.<br/>
                                                    이미 옵션이 있는 경우 새로운 옵션으로 교체됩니다.
                                                </p>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-left mb-8">
                                                    {Object.values(MythicOptionType).map((opt, optIdx) => (
                                                        <div key={`${opt}-${optIdx}`} className="p-2 bg-slate-950 rounded border border-slate-800 flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                                                <span className="text-[10px] text-slate-300 font-bold">{opt}</span>
                                                            </div>
                                                            <p className="text-[9px] text-slate-500 leading-tight pl-3">
                                                                {getMythicOptionDescription(opt)}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>

                                                <button 
                                                    onClick={() => {
                                                        const options = Object.values(MythicOptionType);
                                                        const randomOpt = options[Math.floor(Math.random() * options.length)];
                                                        handleAction('special', randomOpt);
                                                    }}
                                                    disabled={isProcessing}
                                                    className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-900/40 transition-all flex items-center justify-center gap-2"
                                                >
                                                    {isProcessing ? <Loader2 className="animate-spin" size={20}/> : <><Sparkles size={20}/> 옵션 무작위 부여 (재설정)</>}
                                                </button>
                                            </div>
                                            
                                            <div className="grid grid-cols-3 gap-4">
                                                {(() => {
                                                    const c = getSpecialOptionCost(selectedEntry);
                                                    const pCount = character.inventory.filter(i => i.name === "태초의 빛").length;
                                                    const sCount = character.inventory.filter(i => i.name === materialName).length;
                                                    const shardCount = character.base?.elementalShards?.[templeElement] || 0;
                                                    
                                                    return (
                                                        <>
                                                            <div className="flex flex-col items-center">
                                                                <div className={`w-10 h-10 rounded-full bg-slate-900 border flex items-center justify-center mb-1 ${pCount >= c.primordial ? 'border-amber-500 text-amber-400' : 'border-red-900 text-red-900'}`}><Sparkles size={16}/></div>
                                                                <span className="text-[9px] text-slate-500">태초의 빛</span>
                                                                <span className={`text-xs font-mono font-bold ${pCount >= c.primordial ? 'text-slate-200' : 'text-red-500'}`}>{c.primordial} / {pCount}</span>
                                                            </div>
                                                            <div className="flex flex-col items-center">
                                                                <div className={`w-10 h-10 rounded-full bg-slate-900 border flex items-center justify-center mb-1 ${shardCount >= c.shard ? 'border-indigo-500 text-indigo-400' : 'border-red-900 text-red-900'}`}><Gem size={16}/></div>
                                                                <span className="text-[9px] text-slate-500">{templeElement.replace('계','')} 조각</span>
                                                                <span className={`text-xs font-mono font-bold ${shardCount >= c.shard ? 'text-slate-200' : 'text-red-500'}`}>{c.shard} / {shardCount}</span>
                                                            </div>
                                                            <div className="flex flex-col items-center">
                                                                <div className={`w-10 h-10 rounded-full bg-slate-900 border flex items-center justify-center mb-1 ${sCount >= c.special ? `border-${uiConfig.text.split('-')[1]}-500 ${uiConfig.text}` : 'border-red-900 text-red-900'}`}><Target size={16}/></div>
                                                                <span className="text-[9px] text-slate-500">{materialName}</span>
                                                                <span className={`text-xs font-mono font-bold ${sCount >= c.special ? 'text-slate-200' : 'text-red-500'}`}>{c.special} / {sCount}</span>
                                                            </div>
                                                        </>
                                                    )
                                                })()}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Required Sacrifices</h4>
                                                <div className="grid grid-cols-3 gap-4">
                                                    {(() => {
                                                        const c = activeSubTab === 'enhance' ? getEnhanceCost(selectedEntry) : getTranscendCost(selectedEntry);
                                                        const pCount = character.inventory.filter(i => i.name === "태초의 빛").length;
                                                        const sCount = character.inventory.filter(i => i.name === materialName).length;
                                                        const shardCount = character.base?.elementalShards?.[templeElement] || 0;
                                                        
                                                        return (
                                                            <>
                                                                <div className="flex flex-col items-center">
                                                                    <div className={`w-10 h-10 rounded-full bg-slate-900 border flex items-center justify-center mb-1 ${pCount >= c.primordial ? 'border-amber-500 text-amber-400' : 'border-red-900 text-red-900'}`}><Sparkles size={16}/></div>
                                                                    <span className="text-[9px] text-slate-500">태초의 빛</span>
                                                                    <span className={`text-xs font-mono font-bold ${pCount >= c.primordial ? 'text-slate-200' : 'text-red-500'}`}>{c.primordial} / {pCount}</span>
                                                                </div>
                                                                <div className="flex flex-col items-center">
                                                                    <div className={`w-10 h-10 rounded-full bg-slate-900 border flex items-center justify-center mb-1 ${shardCount >= c.shard ? 'border-indigo-500 text-indigo-400' : 'border-red-900 text-red-900'}`}><Gem size={16}/></div>
                                                                    <span className="text-[9px] text-slate-500">{templeElement.replace('계','')} 조각</span>
                                                                    <span className={`text-xs font-mono font-bold ${shardCount >= c.shard ? 'text-slate-200' : 'text-red-500'}`}>{c.shard} / {shardCount}</span>
                                                                </div>
                                                                <div className="flex flex-col items-center">
                                                                    <div className={`w-10 h-10 rounded-full bg-slate-900 border flex items-center justify-center mb-1 ${sCount >= c.special ? `border-${uiConfig.text.split('-')[1]}-500 ${uiConfig.text}` : 'border-red-900 text-red-900'}`}><Target size={16}/></div>
                                                                    <span className="text-[9px] text-slate-500">{materialName}</span>
                                                                    <span className={`text-xs font-mono font-bold ${sCount >= c.special ? 'text-slate-200' : 'text-red-500'}`}>{c.special} / {sCount}</span>
                                                                </div>
                                                            </>
                                                        )
                                                    })()}
                                                </div>
                                            </div>

                                            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center">
                                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Success Probability</span>
                                                <div className={`text-3xl font-mono font-bold ${activeSubTab === 'enhance' ? 'text-indigo-400' : 'text-purple-400'}`}>
                                                    {activeSubTab === 'enhance' ? getEnhanceRate(selectedEntry) : getTranscendRate(selectedEntry)}%
                                                </div>
                                                <div className="text-[9px] text-slate-600 mt-2 flex items-center justify-center">
                                                    <AlertCircle size={10} className="mr-1"/> 
                                                    {activeSubTab === 'enhance' ? "실패해도 수치가 하락하지 않습니다." : "실패해도 장비가 파괴되지 않습니다."}
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => handleAction(activeSubTab)}
                                                disabled={isProcessing}
                                                className={`w-full py-5 rounded-2xl font-bold text-white shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-3 ${activeSubTab === 'enhance' ? 'bg-indigo-700 hover:bg-indigo-600 shadow-indigo-900/40' : 'bg-purple-700 hover:bg-purple-600 shadow-purple-900/40'}`}
                                            >
                                                {isProcessing ? <Loader2 className="animate-spin" size={24}/> : activeSubTab === 'enhance' ? <><Sparkles size={20}/> 신화 강화 수행</> : <><ArrowUp size={20}/> 한계 초월 수행</>}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 opacity-50">
                                <Sword size={64} className="mb-4" />
                                <p>좌측 목록에서 관리할 신화 장비를 선택하십시오.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex gap-4">
                        <div className="flex items-center text-xs text-amber-500 font-mono">
                            <Sparkles size={14} className="mr-1.5"/> 태초의 빛: {character.inventory.filter(i => i.name === "태초의 빛").length}
                        </div>
                        <div className="flex items-center text-xs text-indigo-400 font-mono">
                            <Gem size={14} className="mr-1.5"/> {templeElement}: {character.base?.elementalShards?.[templeElement] || 0}
                        </div>
                    </div>
                    <button onClick={onClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs">닫기</button>
                </div>
            </div>
        </div>
    );
};

export default TempleEquipmentModal;
