
import React, { useState } from 'react';
import { Character, Companion, TemplePersonnel, Stats, JobType } from '../types';
import { X, Flame, Sparkles, Star, ScrollText, AlertTriangle, CheckCircle, Loader2, UserCheck, Zap, Heart, TrendingUp, ShieldCheck, Clock, ShieldAlert, Medal } from 'lucide-react';
import { DIVINE_MESSENGER_CONFIG } from '../awakening';
import { TEMPLE_MESSENGER_MAP } from '../constants';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { getYear } from '../utils';

interface Props {
    character: Character;
    templeCity: string;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

type RitualType = 'Blessing' | 'Awakening' | 'Revelation';

const DivineRitualModal: React.FC<Props> = ({ character, templeCity, onClose, onUpdateCharacter }) => {
    const [selectedRitual, setSelectedRitual] = useState<RitualType | null>(null);
    const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);

    const currentYear = getYear(character.currentDate || '2000-03-02');
    const lastRitualYear = character.base?.lastRitualYear || 0;
    const isReady = lastRitualYear < currentYear;

    const templeKey = `${character.currentLocation?.nation}_${templeCity}`;
    const personnel = character.base?.templePersonnel?.[templeKey];
    
    const requiredMessengerJob = TEMPLE_MESSENGER_MAP[templeCity];
    const messengerConfig = Object.values(DIVINE_MESSENGER_CONFIG).find(c => c.jobType === requiredMessengerJob);

    const allComps = [...character.companions, ...(character.inactiveCompanions || [])];
    const priest = allComps.find(c => c.id === personnel?.priestId);
    const subPriest = allComps.find(c => c.id === personnel?.subPriestId);

    const hasPresidingOfficer = !!priest || !!subPriest;

    // [MODIFIED] 근속 연수 계산을 상위로 추출
    const yearsOfService = (() => {
        if (priest?.id && personnel?.priestAssignmentDate) {
            const startYear = parseInt(personnel.priestAssignmentDate.split('-')[0]);
            return Math.max(0, currentYear - startYear);
        }
        return 0;
    })();

    const ritualPower = (() => {
        if (!hasPresidingOfficer) return 0;
        const pVal = priest ? (priest.stats.ctrl + priest.stats.wis) * 0.5 : 0;
        const sVal = subPriest ? (subPriest.stats.ctrl + subPriest.stats.wis) * 0.3 : 0;
        return Math.floor(pVal + sVal);
    })();

    const successRate = (() => {
        if (!hasPresidingOfficer) return 0;
        
        // 1. 기초 스탯 보너스
        const pWisBonus = priest ? priest.stats.wis * 0.001 : 0;
        const sWisBonus = subPriest ? subPriest.stats.wis * 0.001 : 0;
        
        // 2. 근속 연수 보너스 (1년당 1% 가산)
        const totalRate = pWisBonus + sWisBonus + yearsOfService;
        return Math.min(100, Math.max(0, totalRate));
    })();

    const handleRitual = () => {
        if (!selectedRitual || !isReady || !hasPresidingOfficer) return;

        const costFaith = selectedRitual === 'Awakening' ? 100 : 50;
        const costMana = selectedRitual === 'Awakening' ? 50 : 20;
        
        if ((character.faith || 0) < costFaith || (character.base?.resources.manaCrystal || 0) < costMana) {
            alert(`자원이 부족합니다. (필요: 신앙심 ${costFaith}, 마정석 ${costMana})`);
            return;
        }

        if (selectedRitual === 'Awakening' && !selectedTargetId) {
            alert("각성 의식을 거행할 대상을 선택하십시오.");
            return;
        }

        setIsProcessing(true);
        setTimeout(() => {
            const roll = Math.random() * 100;
            const success = roll < successRate;

            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            newChar.faith -= costFaith;
            newChar.base!.resources.manaCrystal -= costMana;
            newChar.base!.lastRitualYear = currentYear;

            let title = "";
            let msg = "";
            let items: any[] = [];
            let logMsg = "";

            if (success) {
                if (selectedRitual === 'Blessing') {
                    newChar.base!.isTempleBlessed = true;
                    title = "축복 의식 성공";
                    msg = "성전 전체에 신성한 기운이 감돕니다. 다음 달 자원 수령 시 생산량이 50% 증가하며, 신화 장비 강화가 축복받습니다.";
                    items = [{ label: '다음 달 생산량', after: '+50% (Blessing)' }];
                } 
                else if (selectedRitual === 'Revelation') {
                    if (newChar.militaryData) {
                        newChar.militaryData.lastOracleYear = 0; 
                    }
                    title = "계시 의식 성공";
                    msg = "하늘의 문이 다시 열렸습니다. 올해의 신탁을 다시 수령할 수 있습니다.";
                    items = [{ label: '신탁 상태', after: '재수령 가능' }];
                }
                else if (selectedRitual === 'Awakening' && selectedTargetId) {
                    const updateTarget = (entity: any) => {
                        if (entity.id === selectedTargetId || (selectedTargetId === 'player' && entity === newChar)) {
                            entity.hasDivineAwakened = true;
                            
                            const subRoll = Math.random() * 100;
                            const isGreatSuccess = subRoll < 20; 
                            const isDivineBlessing = Math.random() * 100 < 1; 
                            
                            const baseBoost = 100; 
                            let finalBoost = isGreatSuccess ? baseBoost * 2 : baseBoost;
                            
                            let extraBonus = 0;
                            if (isDivineBlessing) {
                                extraBonus = Math.floor(ritualPower * 0.01);
                                finalBoost += extraBonus;
                            }

                            entity.stats.str += finalBoost;
                            entity.stats.int += finalBoost;
                            entity.stats.wis += finalBoost;
                            entity.stats.def += finalBoost;
                            entity.stats.agi += finalBoost;
                            entity.stats.ctrl += finalBoost;
                            entity.stats.maxHp += finalBoost * 10;
                            entity.stats.maxMp += finalBoost * 10;
                            entity.stats.hp = entity.stats.maxHp;
                            entity.stats.mp = entity.stats.maxMp;

                            return { 
                                name: entity.name, 
                                isGreatSuccess, 
                                isDivineBlessing, 
                                boost: finalBoost,
                                extra: extraBonus 
                            };
                        }
                        return null;
                    };

                    let res = updateTarget(newChar);
                    if (!res) {
                        newChar.companions.forEach(c => { const r = updateTarget(c); if(r) res = r; });
                        if (!res && newChar.inactiveCompanions) {
                            newChar.inactiveCompanions.forEach(c => { const r = updateTarget(c); if(r) res = r; });
                        }
                    }

                    if (res) {
                        title = res.isDivineBlessing ? "★ 신의 축복 강림 ★" : res.isGreatSuccess ? "각성 대성공!" : "신력 각성 성공";
                        msg = `${res.name} 대원의 영혼 속에 잠들어 있던 ${messengerConfig?.title || '신력'}이 ${res.isGreatSuccess ? '폭발적으로 ' : ''}각성했습니다.`;
                        if (res.isDivineBlessing) msg += `\n신의 자애로운 빛이 의식 위력에 응답하여 추가 힘을 부여했습니다!`;
                        
                        items = [
                            { label: '각성 대상', after: res.name },
                            { label: '전 능력치 상승', after: `+${res.boost}` },
                            ...(res.isDivineBlessing ? [{ label: '의식 위력 보너스', after: `+${res.extra}` }] : [])
                        ];
                    }
                }
                logMsg = `[성전 의식] ${currentYear}년도 ${selectedRitual} 의식을 성공적으로 거행했습니다. (확률: ${successRate.toFixed(2)}%)`;
            } else {
                title = "의식 실패";
                msg = "마력이 조화롭지 못해 기운이 흩어졌습니다. 재료와 신앙심만 소모되었습니다.";
                items = [{ label: '결과', after: '실패 (기운 분산)' }];
                logMsg = `[성전 의식] ${currentYear}년도 ${selectedRitual} 의식 거행에 실패했습니다. (확률: ${successRate.toFixed(2)}%)`;
            }

            onUpdateCharacter(newChar, logMsg);
            setResultData({ 
                type: success ? 'levelup' : 'failure', 
                title, 
                message: msg, 
                items: [...items, { label: '집례 성공률', after: `${successRate.toFixed(2)}%` }] 
            });
            setIsProcessing(false);
        }, 2000);
    };

    const getAwakeningPotentials = () => {
        const type = messengerConfig?.elements[0];
        return [
            { id: 'player', name: `${character.name} (나)`, entity: character },
            ...allComps.map(c => ({ id: c.id, name: c.name, entity: c }))
        ].filter(p => p.entity.shinryokuType === type && !p.entity.hasDivineAwakened);
    };

    const awakeningTargets = getAwakeningPotentials();

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => { setResultData(null); onClose(); }} />}

            <div className="bg-slate-900 border-2 border-purple-500 w-full max-w-3xl h-[92vh] md:h-[80vh] rounded-3xl shadow-[0_0_100px_rgba(168,85,247,0.3)] flex flex-col overflow-hidden relative">
                <div className="p-4 md:p-6 border-b border-purple-900/50 bg-purple-950/20 flex justify-between items-center shrink-0">
                    <div className="flex items-center">
                        <Flame size={24} className="text-purple-400 mr-3 animate-pulse md:size-8" />
                        <div>
                            <h2 className="text-lg md:text-2xl font-bold text-white font-cinzel tracking-widest">SACRED RITUALS</h2>
                            <p className="text-[10px] md:text-xs text-purple-300 font-bold uppercase">{templeCity} 신성 의식 홀</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-1.5 md:p-2 rounded-full hover:bg-slate-800 transition-colors"><X className="w-5 h-5 md:w-6 md:h-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-900 custom-scrollbar space-y-6 md:space-y-8 overscroll-contain">
                    {!hasPresidingOfficer ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                            <AlertTriangle size={64} className="text-red-500 opacity-50" />
                            <h3 className="text-xl font-bold text-white">집례자 부재</h3>
                            <p className="text-sm text-slate-400">의식을 거행하기 위해서는 '신관' 또는 '부사제'가 성전에 배치되어 있어야 합니다.</p>
                        </div>
                    ) : !isReady ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                            <Clock size={64} className="text-slate-600" />
                            <h3 className="text-xl font-bold text-slate-400">의식 준비 중</h3>
                            <p className="text-sm text-slate-500">신성 의식은 1년에 단 한 번만 거행할 수 있습니다.<br/>{currentYear}년의 의식은 이미 완료되었습니다.</p>
                            <span className="text-[10px] text-purple-400 font-bold tracking-widest bg-purple-950/50 px-3 py-1 rounded-full border border-purple-900">NEXT RITUAL: {currentYear + 1}ND YEAR</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <button 
                                onClick={() => { setSelectedRitual('Blessing'); setSelectedTargetId(null); }}
                                className={`p-6 rounded-3xl border transition-all flex flex-col items-center text-center group relative overflow-hidden ${selectedRitual === 'Blessing' ? 'bg-indigo-900/40 border-indigo-500 shadow-xl scale-105' : 'bg-slate-950 border-slate-800 hover:border-indigo-500/50'}`}
                            >
                                <Sparkles size={40} className={`mb-4 ${selectedRitual === 'Blessing' ? 'text-indigo-400' : 'text-slate-600'}`}/>
                                <h4 className="font-bold text-white mb-2 text-lg">축복 의식</h4>
                                <p className="text-[10px] text-slate-500 leading-relaxed">다음 달 자원 생산량 +50%<br/>신성 장비 강화 성공률 보정</p>
                                <div className="mt-4 pt-4 border-t border-slate-800 w-full flex justify-between text-[10px]">
                                    <span className="text-slate-500">신앙심: 50</span>
                                    <span className="text-slate-500">마정석: 20</span>
                                </div>
                            </button>

                            <button 
                                onClick={() => { setSelectedRitual('Awakening'); setSelectedTargetId(null); }}
                                className={`p-6 rounded-3xl border transition-all flex flex-col items-center text-center group relative overflow-hidden ${selectedRitual === 'Awakening' ? 'bg-amber-900/40 border-amber-500 shadow-xl scale-105' : 'bg-slate-950 border-slate-800 hover:border-amber-500/50'}`}
                            >
                                <Zap size={40} className={`mb-4 ${selectedRitual === 'Awakening' ? 'text-amber-400' : 'text-slate-600'}`}/>
                                <h4 className="font-bold text-white mb-2 text-lg">신력 각성 의식</h4>
                                <p className="text-[10px] text-slate-500 leading-relaxed">대상 1인 영구 초월적 강화<br/>대성공 및 축복 기회 존재</p>
                                <div className="mt-4 pt-4 border-t border-slate-800 w-full flex justify-between text-[10px]">
                                    <span className="text-slate-500">신앙심: 100</span>
                                    <span className="text-slate-500">마정석: 50</span>
                                </div>
                            </button>

                            <button 
                                onClick={() => { setSelectedRitual('Revelation'); setSelectedTargetId(null); }}
                                className={`p-6 rounded-3xl border transition-all flex flex-col items-center text-center group relative overflow-hidden ${selectedRitual === 'Revelation' ? 'bg-red-900/40 border-red-500 shadow-xl scale-105' : 'bg-slate-950 border-slate-800 hover:border-red-500/50'}`}
                            >
                                <ScrollText size={40} className={`mb-4 ${selectedRitual === 'Revelation' ? 'text-red-400' : 'text-slate-600'}`}/>
                                <h4 className="font-bold text-white mb-2 text-lg">계시 의식</h4>
                                <p className="text-[10px] text-slate-500 leading-relaxed">올해의 신탁 수령 기회 초기화<br/>새로운 신탁 수령 가능</p>
                                <div className="mt-4 pt-4 border-t border-slate-800 w-full flex justify-between text-[10px]">
                                    <span className="text-slate-500">신앙심: 50</span>
                                    <span className="text-slate-500">마정석: 20</span>
                                </div>
                            </button>
                        </div>
                    )}

                    {selectedRitual === 'Awakening' && isReady && hasPresidingOfficer && (
                        <div className="animate-in slide-in-from-top-4 space-y-4">
                            <h4 className="text-sm font-bold text-amber-500 flex items-center justify-center">
                                <UserCheck size={18} className="mr-2"/> 각성 대상자 선택 (계통 일치자 전용)
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {awakeningTargets.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedTargetId(p.id)}
                                        className={`p-3 rounded-xl border text-center transition-all ${selectedTargetId === p.id ? 'bg-amber-900/40 border-amber-500 shadow-md ring-1 ring-amber-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                                    >
                                        <div className="text-xs font-bold text-slate-200">{p.name}</div>
                                        <div className="text-[9px] text-slate-500">Lv.{p.entity.level}</div>
                                    </button>
                                ))}
                                {awakeningTargets.length === 0 && (
                                    <div className="col-span-full py-10 text-center text-xs text-slate-600 italic">
                                        현재 이 성전의 계통과 일치하는 각성 가능한 인원이 없습니다.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {selectedRitual && isReady && hasPresidingOfficer && (
                        <div className="bg-slate-950 p-6 rounded-3xl border border-purple-900/30 text-center space-y-4 shadow-inner">
                            <div className="flex justify-center gap-2 items-center text-purple-400 font-bold">
                                <Sparkles size={20} className="animate-pulse" />
                                <h3>{selectedRitual === 'Blessing' ? '축복의 의식 거행' : selectedRitual === 'Awakening' ? '신력 각성의 의식 거행' : '하늘의 계시를 구하는 의식'}</h3>
                                <Sparkles size={20} className="animate-pulse" />
                            </div>
                            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 inline-block text-left space-y-1">
                                <div className="text-xs flex justify-between gap-8">
                                    <span className="text-slate-500">주요 집례자</span> 
                                    <span className="text-indigo-400 font-bold">{priest?.name || subPriest?.name}</span>
                                </div>
                                <div className="text-xs flex justify-between gap-8">
                                    <span className="text-slate-500 flex items-center gap-1"><Medal size={12}/> 신관 근속 연수</span> 
                                    <span className="text-amber-300 font-bold font-mono">{yearsOfService}년 (+{yearsOfService.toFixed(2)}%)</span>
                                </div>
                                <div className="text-xs flex justify-between gap-8">
                                    <span className="text-slate-500">의식 위력 (보정)</span> 
                                    <span className="text-amber-400 font-bold">{ritualPower}</span>
                                </div>
                                <div className="text-xs flex justify-between gap-8 border-t border-slate-800 pt-1 mt-1">
                                    <span className="text-slate-300 font-bold">집례 성공률</span> 
                                    <span className="text-green-400 font-bold font-mono">{successRate.toFixed(2)}%</span>
                                </div>
                                {selectedRitual === 'Awakening' && (
                                    <div className="text-[9px] text-slate-500 mt-2 italic">* 성공 시 20% 확률로 대성공(2배 강화), 1% 확률로 신의 축복 보너스(+{Math.floor(ritualPower * 0.01)})</div>
                                )}
                            </div>
                            <button 
                                onClick={handleRitual}
                                disabled={isProcessing || (selectedRitual === 'Awakening' && !selectedTargetId)}
                                className="w-full py-5 bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all transform active:scale-95 disabled:opacity-50"
                            >
                                {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <Flame size={24} className="animate-bounce-short"/>}
                                <span>의식 수행 (Ritual Start)</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex gap-4">
                        <div className="flex items-center text-xs text-indigo-400 font-mono"><Zap size={14} className="mr-1.5"/> 마정석: {character.base?.resources.manaCrystal || 0}</div>
                        <div className="flex items-center text-xs text-amber-400 font-mono"><Sparkles size={14} className="mr-1.5"/> 신앙심: {character.faith || 0}</div>
                    </div>
                    <button onClick={onClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-sm transition-colors">닫기</button>
                </div>
            </div>
        </div>
    );
};

export default DivineRitualModal;
