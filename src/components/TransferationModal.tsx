
import React, { useState, useEffect } from 'react';
import { Character, Companion, Item, JobType, Stats, ClassTier } from '../types';
import { X, RefreshCw, Users, Package, Zap, CheckCircle, AlertTriangle, Info, Shield, Loader2, Sparkles, UserCheck, ArrowRight, Sun, Moon, Flame, Droplets, Snowflake, Mountain, Wind, Ghost, Hammer, Leaf, Activity, Sword, CloudSun } from 'lucide-react';
import { SHINRYOKU_TYPES_LIST, SHINRYOKU_UI_CONFIG } from '../constants';
import { DIVINE_MESSENGER_CONFIG } from '../awakening';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    messengerJob: JobType;
}

const ELEMENT_ICONS: Record<string, any> = {
    "태양계": Sun, "화염계": Flame, "광휘계": Sparkles, "월광계": Moon,
    "전격계": Zap, "대지계": Mountain, "질풍계": CloudSun, "빙결계": Snowflake,
    "해수계": Droplets, "강철계": Shield, "암흑계": Ghost, "초화계": Leaf,
    "무기강화계": Sword, "신체강화계": Activity
};

const TransferationModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter, messengerJob }) => {
    const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);

    // 신의 사자 직업군 체크 헬퍼
    const isMessengerJob = (job?: JobType) => {
        if (!job) return false;
        return [
            JobType.SOLAR_MESSENGER, JobType.FIRE_MESSENGER, JobType.RADIANT_MESSENGER,
            JobType.MOONLIGHT_MESSENGER, JobType.ELECTRIC_MESSENGER, JobType.EARTH_MESSENGER,
            JobType.GALE_MESSENGER, JobType.ICE_MESSENGER, JobType.SEA_MESSENGER,
            JobType.STEEL_MESSENGER, JobType.DARK_MESSENGER, JobType.NATURE_MESSENGER,
            JobType.VOID_MESSENGER
        ].includes(job);
    };

    // 현재 성전(사자)의 설정 찾기
    const messengerConfig = Object.values(DIVINE_MESSENGER_CONFIG).find(c => c.jobType === messengerJob);
    const targetType = messengerConfig?.elements[0] || "태양계";
    const requiredItemName = messengerConfig?.material || "신의 정수";
    const uiConfig = SHINRYOKU_UI_CONFIG[targetType] || SHINRYOKU_UI_CONFIG.default;

    // 대상 캐릭터 리스트: 신의 사자가 아니고, 이미 신력을 해방한(미개방이 아닌) 캐릭터만
    const allPotentials = [
        { id: 'player', name: `${character.name} (나)`, level: character.level, shinryoku: character.shinryokuType, job: character.job, entity: character },
        ...character.companions.map(c => ({ id: c.id, name: c.name, level: c.level, shinryoku: c.shinryokuType, job: c.job, entity: c })),
        ...(character.inactiveCompanions || []).map(c => ({ id: c.id, name: c.name, level: c.level, shinryoku: c.shinryokuType, job: c.job, entity: c }))
    ].filter(p => !isMessengerJob(p.job) && p.shinryoku !== "미개방");

    const selectedTarget = allPotentials.find(p => p.id === selectedTargetId);
    
    // 비용 계산: 타겟 레벨 * 1
    const requiredCount = selectedTarget ? selectedTarget.level : 0;
    const currentItemCount = character.inventory.filter(i => i.name === requiredItemName).length;
    const canAfford = currentItemCount >= requiredCount && selectedTargetId !== null && selectedTarget?.shinryoku !== targetType;

    const handleTransfer = () => {
        if (!canAfford || !selectedTarget || !messengerConfig) return;

        setIsProcessing(true);
        setTimeout(() => {
            const newChar = { ...character };
            
            // 1. 아이템 소모
            let removed = 0;
            newChar.inventory = newChar.inventory.filter(item => {
                if (item.name === requiredItemName && removed < requiredCount) {
                    removed++;
                    return false;
                }
                return true;
            });

            // 2. 신력 계통 변경
            const updateEntity = (entity: any) => {
                entity.shinryokuType = targetType;
                // 기존 클래스 설명 초기화 (새로운 계통에 맞게 재설정 유도)
                entity.firstClassName = "미정";
                entity.secondClassName = undefined;
                entity.lastClassName = undefined;
                entity.finalClassName = undefined;
                entity.classTier = ClassTier.NONE;
            };

            if (selectedTargetId === 'player') {
                updateEntity(newChar);
            } else {
                const activeIdx = newChar.companions.findIndex(c => c.id === selectedTargetId);
                if (activeIdx !== -1) {
                    updateEntity(newChar.companions[activeIdx]);
                } else if (newChar.inactiveCompanions) {
                    const inactiveIdx = newChar.inactiveCompanions.findIndex(c => c.id === selectedTargetId);
                    if (inactiveIdx !== -1) {
                        updateEntity(newChar.inactiveCompanions[inactiveIdx]);
                    }
                }
            }

            const logMsg = `[신력 전이] ${requiredItemName} ${requiredCount}개를 소모하여 ${selectedTarget.name}의 신력을 ${targetType}(으)로 재편했습니다.`;
            onUpdateCharacter(newChar, logMsg);
            
            setResultData({
                type: 'success',
                title: '신력 재편 성공',
                message: `${selectedTarget.name}의 마력 회로가 ${targetType}의 기운으로 완전히 재편되었습니다.\n기존의 전직 정보는 초기화되었습니다.`,
                items: [
                    { label: '변경된 계통', after: targetType },
                    { label: '소모 재료', after: `${requiredItemName} x${requiredCount}` }
                ]
            });
            setIsProcessing(false);
        }, 2000);
    };

    const TargetIcon = ELEMENT_ICONS[targetType] || Sparkles;
    const CurrentIcon = selectedTarget ? (ELEMENT_ICONS[selectedTarget.shinryoku] || Zap) : Zap;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => { setResultData(null); onClose(); }} />}

            <div className={`bg-slate-900 border w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative ${uiConfig.border}`}>
                <div className={`p-6 border-b bg-slate-950 flex justify-between items-center shrink-0 ${uiConfig.border}`}>
                    <div className="flex items-center">
                        <RefreshCw size={28} className={`${uiConfig.text} mr-4 animate-spin-slow`} />
                        <div>
                            <h2 className="text-2xl font-bold text-white font-cinzel tracking-widest">{targetType.toUpperCase()} TRANSFERATION</h2>
                            <p className={`text-xs font-bold ${uiConfig.text}`}>{targetType} 성전: 근원적인 힘의 전이</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"><X size={24} /></button>
                </div>

                <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                    {/* Left: Target Selection */}
                    <div className="w-full md:w-72 border-r border-slate-800 p-4 overflow-y-auto custom-scrollbar shrink-0 bg-slate-950/30">
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center">
                            <Users size={14} className="mr-2"/> 대상 캐릭터 (해방자 전용)
                        </h3>
                        <div className="space-y-2">
                            {allPotentials.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedTargetId(p.id)}
                                    className={`w-full p-3 rounded-xl border text-left transition-all flex flex-col ${selectedTargetId === p.id ? 'bg-indigo-900/40 border-indigo-500 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
                                >
                                    <div className="flex justify-between items-center w-full">
                                        <span className="font-bold text-sm text-slate-200">{p.name}</span>
                                        <span className="text-[10px] text-amber-500 font-bold">Lv.{p.level}</span>
                                    </div>
                                    <div className="text-[9px] text-slate-500 mt-1">{p.shinryoku}</div>
                                </button>
                            ))}
                            {allPotentials.length === 0 && (
                                <div className="text-center py-20 text-slate-600">
                                    <AlertTriangle size={24} className="mx-auto mb-2 opacity-30"/>
                                    <p className="text-[10px]">전이 가능한 캐릭터가 없습니다.<br/>(신력 미해방자 및 사자 제외)</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Middle: Transfer Visualization */}
                    <div className="flex-1 p-8 flex flex-col items-center justify-center bg-slate-900/50 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-10 pointer-events-none"></div>
                        
                        {selectedTarget ? (
                            <div className="w-full max-w-sm text-center z-10 animate-in zoom-in-95">
                                <div className="flex items-center justify-between mb-12">
                                    <div className="flex flex-col items-center">
                                        <div className="p-4 bg-slate-800 rounded-full border border-slate-600 mb-2">
                                            <CurrentIcon size={40} className="text-slate-400" />
                                        </div>
                                        <span className="text-xs text-slate-500 font-bold uppercase">{selectedTarget.shinryoku}</span>
                                    </div>
                                    
                                    <div className="flex-1 px-4 flex flex-col items-center">
                                        <ArrowRight size={32} className={`${uiConfig.text} animate-pulse`} />
                                        <span className="text-[10px] text-slate-600 mt-1 font-bold">RECODING...</span>
                                    </div>

                                    <div className="flex flex-col items-center">
                                        <div className={`p-4 ${uiConfig.bg} rounded-full border ${uiConfig.border} mb-2 shadow-lg shadow-indigo-500/20`}>
                                            <TargetIcon size={40} className={uiConfig.text} />
                                        </div>
                                        <span className={`text-xs font-bold uppercase ${uiConfig.text}`}>{targetType}</span>
                                    </div>
                                </div>
                                
                                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-sm text-slate-400 leading-relaxed italic">
                                    "성전의 정수와 사자의 권능을 통해,<br/>영혼에 각인된 신력의 흐름을 강제로 재편합니다."
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-slate-600 opacity-50">
                                <RefreshCw size={64} className="mx-auto mb-4" />
                                <p>좌측 목록에서 대상을 선택하여<br/>신력 재편을 준비하십시오.</p>
                            </div>
                        )}
                    </div>

                    {/* Right: Summary and Action */}
                    <div className="w-full md:w-80 border-l border-slate-800 p-6 flex flex-col shrink-0 bg-slate-950/30">
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-6 flex items-center">
                            <Zap size={14} className="mr-2"/> 전이 명세서
                        </h3>
                        
                        <div className="space-y-6 flex-1">
                            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">변경 대상</div>
                                <div className="text-sm font-bold text-white">{selectedTarget?.name || "-"}</div>
                                <div className="text-xs text-slate-400 mt-1">
                                    {selectedTarget?.shinryoku || "-"} → <span className={`${uiConfig.text} font-bold`}>{targetType}</span>
                                </div>
                            </div>

                            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                                <div className="text-[10px] text-slate-500 uppercase font-bold mb-3 flex justify-between">
                                    <span>필요 자원</span>
                                    <span className={uiConfig.text}>레벨당 1개</span>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-slate-300">{requiredItemName}</span>
                                    <span className={`text-sm font-mono font-bold ${currentItemCount >= requiredCount ? 'text-green-400' : 'text-red-400'}`}>
                                        {requiredCount} / {currentItemCount}
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all ${currentItemCount >= requiredCount ? 'bg-green-500' : 'bg-red-500'}`} 
                                        style={{ width: `${Math.min(100, (currentItemCount / (requiredCount || 1)) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className={`${uiConfig.bg} p-4 rounded-2xl border ${uiConfig.border} bg-opacity-10`}>
                                <h4 className={`text-[10px] font-bold uppercase mb-2 flex items-center ${uiConfig.text}`}>
                                    <Info size={12} className="mr-1"/> Notice
                                </h4>
                                <ul className="text-[10px] text-slate-400 space-y-1 list-disc list-inside">
                                    <li>이 성전에서는 <span className={`${uiConfig.text} font-bold`}>{targetType}</span>로만 변경됩니다.</li>
                                    <li>전이 후 기존의 전직 및 클래스 명칭은 소멸합니다.</li>
                                    <li>사자의 정수는 해당 계열 신화 보스에게서 획득합니다.</li>
                                </ul>
                            </div>
                        </div>

                        <button
                            onClick={handleTransfer}
                            disabled={!canAfford || isProcessing}
                            className={`w-full py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 mt-6 ${canAfford ? 'bg-indigo-600 hover:bg-indigo-500 text-white transform hover:scale-105 active:scale-95' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'}`}
                        >
                            {isProcessing ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <Sparkles size={18} />
                                    <span>신력 전이 수행</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransferationModal;
