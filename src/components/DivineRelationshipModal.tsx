
import React, { useState, useMemo } from 'react';
import { Character, Enemy } from '../types';
import { X, Crown, Flame, Sparkles, UserCheck, Landmark, Sun, Moon, Droplets, Snowflake, Wind, Mountain, Ghost, Hammer, Leaf, Activity, Sword, CloudSun, Info, Gavel, Smile, Ghost as GhostIcon } from 'lucide-react';
import { TEMPLE_MESSENGER_MAP, SHINRYOKU_TYPES_LIST, INFAMY_CONFIG } from '../constants';
import ActionResultModal, { ResultData } from './ActionResultModal';
import DivineWarModal from './DivineWarModal';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onBattle?: (enemy: Enemy | Enemy[], type: string, source: string, city?: string, nation?: string) => void;
}

const ELEMENT_ICONS: Record<string, any> = {
    "태양계": Sun, "화염계": Flame, "광휘계": Sparkles, "월광계": Moon,
    "전격계": Wind, "대지계": Mountain, "질풍계": CloudSun, "빙결계": Snowflake,
    "해수계": Droplets, "강철계": Hammer, "암흑계": Ghost, "초화계": Leaf,
    "무기강화계": Sword, "신체강화계": Activity
};

const DivineRelationshipModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter, onBattle }) => {
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [repentAmount, setRepentAmount] = useState(0);

    const [warTargetId, setWarTargetId] = useState<'god' | string | null>(null);

    const infamy = character.infamy || 0;
    const faith = character.faith || 0;
    const isGodDefeated = character.isGodDefeated || false;

    const maxPossibleRepent = useMemo(() => {
        return Math.min(infamy, Math.floor(faith / 10));
    }, [infamy, faith]);

    const processedRelations = useMemo(() => {
        const relations = {
            god: character.divineRelations?.god || { affection: 0, status: '중립' },
            temples: { ...(character.divineRelations?.temples || {}) }
        };

        const allComps = [...character.companions, ...(character.inactiveCompanions || [])];
        
        Object.entries(TEMPLE_MESSENGER_MAP).forEach(([templeCityName, job]) => {
            if (character.job === job) return;

            if (!relations.temples[templeCityName]) {
                relations.temples[templeCityName] = { affection: 0, status: '중립' };
            }

            const hasMessengerAsCompanion = allComps.some(c => c.job === job);
            if (hasMessengerAsCompanion) {
                relations.temples[templeCityName] = { affection: 100, status: '동맹' };
            }
        });

        return relations;
    }, [character]);

    const handleOfferFaith = () => {
        const cost = 100;
        if ((character.faith || 0) < cost) {
            alert("신앙심이 부족합니다. (100 필요)");
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const nextChar = JSON.parse(JSON.stringify(character)) as Character;
            nextChar.faith = (nextChar.faith || 0) - cost;
            
            if (!nextChar.divineRelations) {
                nextChar.divineRelations = { god: { affection: 0, status: '중립' }, temples: {} };
            }

            const newAff = Math.min(100, nextChar.divineRelations.god.affection + 1);
            let status = '중립';
            if (newAff >= 50) status = '신뢰';
            if (newAff <= -80) status = '적대';

            nextChar.divineRelations.god = { affection: newAff, status };
            
            onUpdateCharacter(nextChar, `[신과의 교감] 신앙심 100을 바쳐 신과의 유대를 강화했습니다. (친밀도 +1)`);
            setResultData({
                type: 'success',
                title: '봉헌 완료',
                message: '신의 시선이 잠시 당신에게 머눕니다. 영혼이 맑아지는 기분입니다.',
                items: [{ label: '신과의 친밀도', before: newAff - 1, after: newAff }]
            });
            setIsProcessing(false);
        }, 800);
    };

    const handleRepent = () => {
        if (repentAmount <= 0) return;
        const faithCost = repentAmount * 10;
        
        setIsProcessing(true);
        setTimeout(() => {
            const nextChar = JSON.parse(JSON.stringify(character)) as Character;
            const prevInfamy = nextChar.infamy || 0;
            
            nextChar.faith = (nextChar.faith || 0) - faithCost;
            nextChar.infamy = Math.max(0, prevInfamy - repentAmount);

            if (!nextChar.memories) nextChar.memories = [];
            nextChar.memories.push(`[${nextChar.currentDate || '기록 없음'}] 천상의 회개를 통해 악명 ${repentAmount}을 씻어냄.`);

            onUpdateCharacter(nextChar, `[천상의 회개] 신앙심 ${faithCost}를 소모하여 과거의 죄업을 씻어냈습니다. (악명 -${repentAmount})`);
            
            setResultData({
                type: 'levelup',
                title: '죄 사함 완료',
                message: '당신의 진심 어린 참회와 신앙이 하늘에 닿았습니다.\n어두웠던 과거의 기록들이 신성한 빛에 의해 씻겨 내려갑니다.',
                items: [
                    { label: '악명도', before: prevInfamy, after: nextChar.infamy },
                    { label: '소모 신앙심', after: `-${faithCost}` }
                ]
            });
            setIsProcessing(false);
            setRepentAmount(0);
        }, 1200);
    };

    const getStatusColor = (status: string) => {
        if (status === '동맹' || status === '신뢰') return 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40';
        if (status === '적대') return 'text-red-400 bg-red-950/60 border-red-500/40';
        return 'text-slate-300 bg-slate-800/60 border-slate-700/50';
    };

    const getInfamyInfo = (val: number) => {
        const { STAGES } = INFAMY_CONFIG;
        if (val >= STAGES.CALAMITY.threshold) return STAGES.CALAMITY;
        if (val >= STAGES.DISASTER.threshold) return STAGES.DISASTER;
        if (val >= STAGES.WANTED.threshold) return STAGES.WANTED;
        if (val >= STAGES.CRIMINAL.threshold) return STAGES.CRIMINAL;
        if (val >= STAGES.SUSPECT.threshold) return STAGES.SUSPECT;
        return STAGES.NONE;
    };

    const infamyInfo = getInfamyInfo(infamy);

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-300">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}
            
            {warTargetId && (
                <DivineWarModal 
                    character={character} 
                    targetId={warTargetId} 
                    onClose={() => setWarTargetId(null)} 
                    onUpdateCharacter={onUpdateCharacter}
                    onBattle={(enemy, type, source, targetCity, targetNation) => onBattle!(enemy, type, source, targetCity, targetNation)}
                />
            )}

            <div className="bg-slate-950 border border-amber-500/30 w-full max-w-2xl h-[95vh] sm:h-[88vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative text-slate-100">
                {/* Header */}
                <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-xl font-bold text-amber-200 tracking-tight">신성 관계망</h2>
                            <p className="text-[11px] text-slate-400">신 및 타 성전과의 외교 관계 및 영향력 현황</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/80 transition-colors"
                        aria-label="닫기"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 space-y-5 sm:space-y-6">
                    
                    {/* Section: Absolute God Relation */}
                    <section className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <h3 className="text-sm sm:text-base font-bold text-amber-300 flex items-center gap-2">
                                <Crown size={18} className="text-amber-400" />
                                {isGodDefeated ? '비어버린 신좌' : '절대신과의 관계'}
                            </h3>
                            {!isGodDefeated && (
                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusColor(processedRelations.god.status)}`}>
                                    {processedRelations.god.status}
                                </span>
                            )}
                        </div>
                        
                        {isGodDefeated ? (
                            <div className="bg-slate-900/80 p-6 sm:p-8 rounded-2xl border border-red-900/40 flex flex-col items-center justify-center text-center relative overflow-hidden">
                                <GhostIcon size={48} className="text-slate-600 mb-3 animate-pulse" />
                                <h4 className="text-base font-bold text-slate-400">신은 더 이상 존재하지 않습니다</h4>
                                <p className="text-xs text-slate-500 mt-1">당신의 반역이 성공하여 신계의 질서가 재편되었습니다.</p>
                            </div>
                        ) : (
                            <div 
                                onClick={() => setWarTargetId('god')}
                                className="bg-slate-900/90 p-4 sm:p-6 rounded-2xl border border-amber-500/20 hover:border-amber-400/50 transition-all cursor-pointer space-y-4 group relative overflow-hidden"
                            >
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        <span className="text-[11px] text-slate-400 block">신과의 호감도</span>
                                        <span className="text-2xl sm:text-3xl font-mono font-bold text-amber-300">
                                            {processedRelations.god.affection}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[11px] text-slate-400 block">현재 죄업 및 악명</span>
                                        <div className={`flex items-center justify-end gap-1 font-bold text-xs sm:text-sm ${infamyInfo.color}`}>
                                            <Gavel size={14} /> {infamy} <span className="text-[11px] opacity-80">({infamyInfo.label})</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-1">
                                    <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                        <div 
                                            className="h-full bg-gradient-to-r from-amber-700 via-amber-400 to-amber-200 transition-all duration-700"
                                            style={{ width: `${Math.max(0, Math.min(100, (processedRelations.god.affection + 100) / 2))}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-500">
                                        <span>적대 (-100)</span>
                                        <span>중립 (0)</span>
                                        <span>신뢰 (+100)</span>
                                    </div>
                                </div>

                                {/* Interactive Controls Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    {/* Faith Offering Button */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleOfferFaith(); }}
                                        disabled={isProcessing || (character.faith || 0) < 100}
                                        className="py-3 px-4 bg-gradient-to-r from-amber-900/60 to-amber-800/40 hover:from-amber-800 hover:to-amber-700 border border-amber-600/50 text-white rounded-xl transition-all flex flex-col items-center justify-center gap-1 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-amber-200">
                                            <Flame size={16} className="text-orange-400 animate-pulse"/>
                                            <span>신앙심 봉헌</span>
                                        </div>
                                        <span className="text-[11px] text-amber-300/80">호감도 +1 (신앙심 100 소모)</span>
                                    </button>

                                    {/* Repentance Control */}
                                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
                                        <div className="flex justify-between items-center text-[11px]">
                                            <span className="font-bold text-indigo-300 flex items-center gap-1">
                                                <Smile size={12} /> 천상의 회개
                                            </span>
                                            <span className="text-slate-400 text-[10px]">신앙심 10당 악명 1 정화</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="range"
                                                min="0"
                                                max={maxPossibleRepent}
                                                value={repentAmount}
                                                onChange={(e) => setRepentAmount(parseInt(e.target.value))}
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex-1 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                                disabled={maxPossibleRepent <= 0}
                                            />
                                            <span className={`text-xs font-mono font-bold w-7 text-right ${repentAmount > 0 ? 'text-indigo-400' : 'text-slate-500'}`}>
                                                {repentAmount}
                                            </span>
                                        </div>

                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleRepent(); }}
                                            disabled={isProcessing || repentAmount <= 0}
                                            className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all ${repentAmount > 0 ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                        >
                                            회개 진행 (신앙심 {repentAmount * 10} 소모)
                                        </button>
                                    </div>
                                </div>

                                <div className="text-[11px] text-center text-amber-400/80 font-medium pt-1">
                                    카드를 클릭하여 교류 및 침공 진행
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Section: Other Temples */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-sm sm:text-base font-bold text-indigo-300 flex items-center gap-2">
                                <Landmark size={18} className="text-indigo-400" /> 타 성전과의 관계
                            </h3>
                            <span className="text-[11px] text-slate-400">사자 포섭 여부에 따라 동맹 가능</span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {Object.entries(processedRelations.temples).map(([templeCityName, data]) => {
                                const element = SHINRYOKU_TYPES_LIST.find(e => templeCityName.includes(e.replace('계',''))) || '광휘계';
                                const Icon = ELEMENT_ICONS[element] || Sparkles;
                                const isAlliance = data.status === '동맹';

                                return (
                                    <div 
                                        key={templeCityName} 
                                        onClick={() => {
                                            if (isAlliance) {
                                                setResultData({
                                                    type: 'info',
                                                    title: '동맹 성전',
                                                    message: '해당 성전의 사자가 이미 당신의 동료입니다. 동맹 관계인 성전은 침공하거나 적대할 수 없습니다.',
                                                    items: [{ label: '소속 사자', after: '파티 합류 중' }]
                                                });
                                                return;
                                            }
                                            setWarTargetId(templeCityName);
                                        }}
                                        className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2.5 ${isAlliance ? 'bg-emerald-950/10 border-emerald-500/40 opacity-95' : 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/50 cursor-pointer'}`}
                                    >
                                        <div className="flex justify-between items-center gap-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`p-2 rounded-xl bg-slate-950 border ${isAlliance ? 'text-emerald-400 border-emerald-500/30' : 'text-slate-400 border-slate-800'}`}>
                                                    <Icon size={16}/>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-slate-200 truncate">{templeCityName}</div>
                                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.2 rounded border ${getStatusColor(data.status)}`}>
                                                        {data.status}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="text-[10px] text-slate-400 block">호감도</span>
                                                <span className={`text-xs sm:text-sm font-mono font-bold ${data.affection > 0 ? 'text-emerald-400' : data.affection < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                                    {data.affection > 0 ? '+' : ''}{data.affection}
                                                </span>
                                            </div>
                                        </div>

                                        {isAlliance && (
                                            <div className="flex items-center gap-1.5 bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-500/30 text-[10px] text-emerald-300 font-bold">
                                                <UserCheck size={12}/> 해당 사자를 포섭하여 동맹 상태임
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Information Callout */}
                    <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex gap-3 items-start">
                        <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                        <div className="space-y-1 text-[11px] text-slate-400 leading-relaxed">
                            <h4 className="font-bold text-slate-300 text-xs">신성 외교 정보</h4>
                            <p>• 악명이 높으면 신성한 의식의 성공 확률이 하락하고 성전의 위엄이 실추될 수 있습니다.</p>
                            <p>• 카드를 클릭하여 각 성전에 친선 예물을 보내거나 무력 침공을 진행할 수 있습니다.</p>
                            <p>• 사자가 동료인 동맹 성전과는 적대 행위를 할 수 없습니다.</p>
                            <p>• 절대신 처단 성공 시 성전 관리 효율이 대폭 상승하지만 모든 성전이 일시적으로 혼란에 빠집니다.</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-900/90 border-t border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-800/40">
                        <Flame size={14} className="text-amber-400 animate-pulse" />
                        <span>보유 신앙심: {character.faith || 0}</span>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="px-6 py-2 sm:px-8 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95"
                    >
                        확인 완료
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DivineRelationshipModal;

