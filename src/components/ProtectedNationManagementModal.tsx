import React, { useState } from 'react';
    import { Character, Companion, DivineDiplomacyStatus, DivineRelation, JobType, DispatchMission } from '../types';
    import { X, ShieldCheck, UserCheck, Heart, Coins, Zap, Loader2, Sparkles, ChevronRight, Clock, AlertTriangle, UserPlus, Shield, Target, TrendingUp, Handshake } from 'lucide-react';
    import ActionResultModal, { ResultData } from './ActionResultModal';
    import { getYear } from '../utils';
    
    interface Props {
        character: Character;
        targetNation: string;
        templeElement: string;
        onClose: () => void;
        onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    }
    
    const ProtectedNationManagementModal: React.FC<Props> = ({ character, targetNation, templeElement, onClose, onUpdateCharacter }) => {
        const [resultData, setResultData] = useState<ResultData | null>(null);
        const [isProcessing, setIsProcessing] = useState(false);
        const [showKnightSelector, setShowKnightSelector] = useState(false);
    
        const rel = character.templeDiplomacy?.[targetNation];
        if (!rel || rel.status !== DivineDiplomacyStatus.BLESSED) return null;
    
        const currentYear = getYear(character.currentDate || '2000-01-01');
        const currentMonth = character.currentDate?.substring(0, 7);
        
        const canCollectFaith = rel.lastFaithCollectionDate !== currentMonth;
        const canCollectOffering = rel.lastInteractionYear !== currentYear;
    
        const allComps = [...character.companions, ...(character.inactiveCompanions || [])];
        const dispatchedKnight = allComps.find(c => c.id === rel.dispatchedKnightId);
    
        const availableKnights = allComps.filter(c => {
            if (c.isDead || c.shinryokuType !== templeElement) return false;
            
            const isBaseDispatched = character.base?.dispatched?.some(m => m.companionId === c.id);
            const isWarDispatched = character.base?.dispatched?.some(m => 
                m.missionType === 'WarInvasion' && (m as any).participants?.includes(c.id)
            );
            const isGroupDispatched = character.mercenaryData?.groupMissions?.some(m => m.memberIds.includes(c.id));
            const isAssigned = Object.values(character.base?.assignments || {}).includes(c.id);
            
            return !isBaseDispatched && !isWarDispatched && !isGroupDispatched && !isAssigned;
        });
    
        const handleDispatchKnight = (knightId: string) => {
            const knight = allComps.find(c => c.id === knightId);
            if (!knight) return;
    
            setIsProcessing(true);
            setTimeout(() => {
                const newChar = JSON.parse(JSON.stringify(character)) as Character;
                if (!newChar.templeDiplomacy) newChar.templeDiplomacy = {};
                if (!newChar.templeDiplomacy[targetNation]) {
                    setIsProcessing(false);
                    return;
                }
    
                const targetRel = newChar.templeDiplomacy[targetNation];
                targetRel.dispatchedKnightId = knightId;
    
                const activeIdx = newChar.companions.findIndex(c => c.id === knightId);
                if (activeIdx !== -1) {
                    const [target] = newChar.companions.splice(activeIdx, 1);
                    if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
                    newChar.inactiveCompanions.push(target);
                }
    
                if (!newChar.base) newChar.base = JSON.parse(JSON.stringify(character.base || {}));
                if (!newChar.base!.assignments) newChar.base!.assignments = {};
                newChar.base!.assignments[`temple_protection_${targetNation}`] = knightId;
                
                if (!newChar.base!.dispatched) newChar.base!.dispatched = [];
                const newMission: DispatchMission = {
                    id: `temple_prot_${targetNation}_${knightId}`,
                    companionId: knightId,
                    destination: { nation: targetNation, city: "", region: "" },
                    startTime: character.currentDate || "",
                    durationMonths: 999,
                    expectedReturnDate: "2099-12-31",
                    status: 'Normal',
                    dangerCounter: 0,
                    successRate: 100,
                    missionType: 'TempleProtection'
                };
                newChar.base!.dispatched.push(newMission);
    
                onUpdateCharacter(newChar, `[성전 파견] ${knight.name} 수호기사를 ${targetNation}의 수호자로 파견했습니다.`);
                setResultData({
                    type: 'success',
                    title: '수호기사 파견 완료',
                    message: `${knight.name} 대원이 ${targetNation}의 평화를 지키기 위해 떠났습니다.`,
                    items: [{ label: '파견 대원', after: knight.name }, { label: '상태', after: '파견 중' }]
                });
                setIsProcessing(false);
                setShowKnightSelector(false);
            }, 1000);
        };
    
        const handleRecallKnight = () => {
            const knightId = rel.dispatchedKnightId;
            if (!knightId) return;
    
            setIsProcessing(true);
            setTimeout(() => {
                const newChar = JSON.parse(JSON.stringify(character)) as Character;
                if (!newChar.templeDiplomacy || !newChar.templeDiplomacy[targetNation]) {
                    setIsProcessing(false);
                    return;
                }
    
                const targetRel = newChar.templeDiplomacy[targetNation];
                const knightName = dispatchedKnight?.name || "대원";
                targetRel.dispatchedKnightId = undefined;
    
                if (newChar.base) {
                    if (newChar.base.assignments) {
                        const assignments = { ...newChar.base.assignments };
                        Object.keys(assignments).forEach(key => {
                            if (assignments[key] === knightId || key === `temple_protection_${targetNation}`) {
                                delete assignments[key];
                            }
                        });
                        newChar.base.assignments = assignments;
                    }
    
                    if (newChar.base.dispatched) {
                        newChar.base.dispatched = newChar.base.dispatched.filter(m => 
                            !(m.missionType === 'TempleProtection' && m.companionId === knightId)
                        );
                    }
                }
                
                onUpdateCharacter(newChar, `[성전 복귀] ${targetNation}에 파견되었던 ${knightName} 수호기사를 불러들였습니다.`);
                setResultData({
                    type: 'info',
                    title: '복귀 완료',
                    message: `${knightName} 대원이 성전으로 복귀했습니다.`,
                    items: [{ label: '대상', after: knightName }, { label: '상태', after: '대기 중' }]
                });
                setIsProcessing(false);
            }, 1000);
        };
    
        const handleCollectMonthlyTribute = () => {
            if (!dispatchedKnight || !canCollectFaith) return;
    
            // 보상 계산: 영향력 수치에 비례 + 신앙심 포인트 보너스
            const influenceMult = (rel.influence || 10) / 100;
            // [NEW] FaithPoints 보너스 (1 + 0~1.0) -> 최대 2배 보너스
            const faithPointMult = 1 + (rel.faithPoints / 1000);
            
            // 신앙심: (기본 200 + 기사 레벨 * 2) * 영향력% * 신앙심배수
            const faithGain = Math.max(1, Math.floor((200 + dispatchedKnight.level * 2) * influenceMult * faithPointMult));
            // 골드: (기본 5000 + 기사 레벨 * 100) * 영향력% * 신앙심배수
            const goldGain = Math.max(1, Math.floor((5000 + dispatchedKnight.level * 100) * influenceMult * faithPointMult));
    
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            newChar.faith = (newChar.faith || 0) + faithGain;
            newChar.money += goldGain;
            
            if (newChar.templeDiplomacy && newChar.templeDiplomacy[targetNation]) {
                newChar.templeDiplomacy[targetNation].lastFaithCollectionDate = currentMonth;
            }
    
            onUpdateCharacter(newChar, `[월간 조공] ${targetNation} 비호 보상으로 신앙심 ${faithGain}, 골드 ${goldGain.toLocaleString()}G를 수령했습니다.`);
            setResultData({
                type: 'success',
                title: '월간 신성 조공 수령',
                message: `파견된 기사가 현지에서 사자님의 위엄(영향력 ${rel.influence}%)과 신앙(신성도 ${rel.faithPoints})에 따라 자원을 수거해왔습니다.`,
                items: [
                    { label: '획득 신앙심', after: `+${faithGain}` },
                    { label: '획득 골드', after: `+${goldGain.toLocaleString()} G` },
                    { label: '신앙 보너스', after: `x${faithPointMult.toFixed(2)}` }
                ]
            });
        };
    
        const handleCollectOffering = () => {
            if (!canCollectOffering) return;
    
            // 연간 보상 계산: 영향력에 정비례 (최대 20만 골드, 500 신앙심) + 신앙심 포인트 보너스
            const influenceMult = (rel.influence || 10) / 100;
            // [NEW] FaithPoints 보너스 적용
            const faithPointMult = 1 + (rel.faithPoints / 1000);

            const baseGold = 200000;
            const baseFaith = 500;
            
            const goldGain = Math.floor(baseGold * influenceMult * faithPointMult);
            const faithGain = Math.floor(baseFaith * influenceMult * faithPointMult);
    
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            newChar.money += goldGain;
            newChar.faith = (newChar.faith || 0) + faithGain;
            
            if (newChar.templeDiplomacy && newChar.templeDiplomacy[targetNation]) {
                newChar.templeDiplomacy[targetNation].lastInteractionYear = currentYear;
            }
    
            onUpdateCharacter(newChar, `[연간 헌금] ${targetNation}으로부터 ${currentYear}년도 감사의 헌금 ${goldGain.toLocaleString()}G와 신앙심 ${faithGain}을 수령했습니다.`);
            setResultData({
                type: 'success',
                title: '연간 성궤 헌금 수령',
                message: `${targetNation}의 온 백성이 사자님의 비호(영향력 ${rel.influence}%)와 두터운 신앙(신성도 ${rel.faithPoints})에 감사하며 성궤를 가득 채웠습니다.`,
                items: [
                    { label: '총 획득 골드', after: `${goldGain.toLocaleString()} G` },
                    { label: '총 획득 신앙심', after: `+${faithGain}` },
                    { label: '신앙 보너스', after: `x${faithPointMult.toFixed(2)}` }
                ]
            });
        };
    
        return (
            <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 p-3 sm:p-4 animate-in fade-in">
                {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}
    
                <div className="bg-slate-900 border border-emerald-500/50 w-full max-w-md max-h-[92vh] rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.25)] flex flex-col overflow-hidden relative">
                    {/* 헤더 */}
                    <div className="p-4 sm:p-5 border-b border-emerald-900/40 bg-emerald-950/20 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2.5">
                            <ShieldCheck className="text-emerald-400" size={24} />
                            <div>
                                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">비호 국가 관리</h2>
                                <p className="text-[11px] text-emerald-400/80 font-medium">성전의 가호 아래 있는 영지</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                        >
                            <X size={20}/>
                        </button>
                    </div>
    
                    {/* 본문 */}
                    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 flex-1 overflow-y-auto custom-scrollbar overscroll-contain">
                        {/* 국가 정보 */}
                        <div className="text-center bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                            <span className="text-[11px] text-slate-400 font-bold tracking-wider block mb-0.5">신성 비호국</span>
                            <h3 className="text-2xl font-black text-white mb-1">{targetNation}</h3>
                            <p className="text-xs font-medium text-emerald-400 flex items-center justify-center gap-1.5">
                                <Sparkles size={13}/> 사자의 신성한 비호를 받는 국가 <Sparkles size={13}/>
                            </p>
                        </div>
    
                        {/* 수치 바 */}
                        <div className="space-y-3">
                            <div className="bg-slate-950 p-3.5 rounded-2xl border border-indigo-500/30">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-xs text-indigo-300 font-bold">국가 영향력</span>
                                    <span className="text-sm font-bold text-indigo-400 font-mono">{rel.influence}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                    <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${rel.influence}%` }}></div>
                                </div>
                            </div>
                            
                            <div className="bg-slate-950 p-3.5 rounded-2xl border border-amber-500/30">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-xs text-amber-300 font-bold">신성도</span>
                                    <span className="text-sm font-bold text-amber-400 font-mono">{rel.faithPoints} / 1000</span>
                                </div>
                                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                    <div className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)] transition-all duration-500" style={{ width: `${(rel.faithPoints / 1000) * 100}%` }}></div>
                                </div>
                                <p className="text-[10px] text-amber-400/70 mt-1.5 text-right font-medium">
                                    신성도 조공 보너스: x{(1 + rel.faithPoints/1000).toFixed(2)}배
                                </p>
                            </div>
                        </div>
    
                        {/* 월간 조공 */}
                        <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3.5 relative overflow-hidden">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-bold text-indigo-300 tracking-wide flex items-center gap-1.5">
                                    <UserCheck size={16} className="text-indigo-400"/> 월간 신성 조공
                                </h4>
                                <span className="text-[10px] text-slate-500">{currentMonth}</span>
                            </div>
                            
                            {dispatchedKnight ? (
                                <div className="space-y-3">
                                    <div className="bg-indigo-950/30 border border-indigo-500/30 p-3 rounded-xl flex justify-between items-center">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-9 h-9 rounded-lg bg-indigo-900/50 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xs">
                                                기사
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white">{dispatchedKnight.name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">Lv.{dispatchedKnight.level} • {dispatchedKnight.shinryokuType}</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleRecallKnight} 
                                            disabled={isProcessing}
                                            className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950/40 text-rose-300 rounded-lg text-xs font-bold transition-all border border-slate-700 hover:border-rose-500 flex items-center gap-1"
                                        >
                                            {isProcessing ? <Loader2 size={12} className="animate-spin"/> : '복귀'}
                                        </button>
                                    </div>
    
                                    <div className="space-y-2">
                                        <button 
                                            onClick={handleCollectMonthlyTribute}
                                            disabled={!canCollectFaith || isProcessing}
                                            className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px] ${canCollectFaith ? 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-98' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}
                                        >
                                            <Zap size={16}/> {canCollectFaith ? '월간 조공 수령' : '이번 달 수령 완료'}
                                        </button>
                                        <div className="flex justify-center gap-4 text-[11px] text-slate-400 font-medium">
                                            <span className="flex items-center gap-1 text-pink-400">신앙심: +{Math.max(1, Math.floor((200 + dispatchedKnight.level * 2) * (rel.influence/100) * (1 + rel.faithPoints/1000)))}</span>
                                            <span className="flex items-center gap-1 text-amber-400">골드: +{Math.max(1, Math.floor((5000 + dispatchedKnight.level * 100) * (rel.influence/100) * (1 + rel.faithPoints/1000))).toLocaleString()}G</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-xs text-slate-400 leading-relaxed text-center py-3.5 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                                        상주 수호기사가 없습니다.<br/>
                                        <span className="text-indigo-400 font-bold">{templeElement}</span> 속성의 기사를 파견하십시오.
                                    </p>
                                    <button 
                                        onClick={() => setShowKnightSelector(true)}
                                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px] active:scale-98"
                                    >
                                        <UserPlus size={16}/> 수호기사 파견하기
                                    </button>
                                </div>
                            )}
                        </div>
    
                        {/* 연간 헌금 */}
                        <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3.5 relative overflow-hidden">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-bold text-amber-300 tracking-wide flex items-center gap-1.5">
                                    <Handshake size={16} className="text-amber-400"/> 연간 성궤 헌금
                                </h4>
                                <span className="text-[10px] text-slate-500 font-mono">{currentYear}년도</span>
                            </div>
                            
                            <div className="text-center bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
                                <div className="text-[11px] text-slate-400 mb-1">영향력 및 신성도 비례 수령액</div>
                                <div className="text-xl font-mono font-bold text-amber-400">
                                    {(Math.floor(200000 * (rel.influence/100) * (1 + rel.faithPoints/1000))).toLocaleString()} G
                                </div>
                                <div className="text-[11px] text-pink-400 font-medium mt-0.5">신앙심 +{Math.floor(500 * (rel.influence/100) * (1 + rel.faithPoints/1000))} 보너스</div>
                            </div>
    
                            <button 
                                onClick={handleCollectOffering}
                                disabled={!canCollectOffering || isProcessing}
                                className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px] ${canCollectOffering ? 'bg-amber-600 hover:bg-amber-500 text-white active:scale-98' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}
                            >
                                <Coins size={16}/> {canCollectOffering ? '성궤 헌금 수령' : '올해 헌금 수령 완료'}
                            </button>
                        </div>
                    </div>
    
                    {/* 파견 기사 선택 모달 */}
                    {showKnightSelector && (
                        <div className="absolute inset-0 bg-black/95 z-50 p-4 sm:p-5 animate-in fade-in flex flex-col">
                            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Target className="text-indigo-400" size={18}/> 파견 대원 선택
                                </h3>
                                <button 
                                    onClick={() => setShowKnightSelector(false)}
                                    className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                                >
                                    <X size={18}/>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5">
                                {availableKnights.length > 0 ? availableKnights.map(k => (
                                    <button
                                        key={k.id}
                                        onClick={() => handleDispatchKnight(k.id)}
                                        className="w-full p-3.5 bg-slate-900 border border-slate-800 hover:border-indigo-500 rounded-xl text-left flex justify-between items-center transition-all min-h-[44px]"
                                    >
                                        <div>
                                            <div className="font-bold text-white text-sm">{k.name}</div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">Lv.{k.level} • {k.shinryokuType}</div>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-500"/>
                                    </button>
                                )) : (
                                    <div className="py-16 text-center text-slate-500">
                                        <AlertTriangle size={36} className="mx-auto mb-2 text-slate-600"/>
                                        <p className="text-xs">파견 가능한 '{templeElement}' 대원이 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };
    
    export default ProtectedNationManagementModal;