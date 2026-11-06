
import React, { useState } from 'react';
import { Character, Companion, Location, DispatchMission, JobType, MilitaryRank } from '../types';
import { X, Send, MapPin, Shield, Sword, Target, Clock, Loader2, Users, CheckCircle, Crown, Lock, TrendingUp } from 'lucide-react';
import { WORLD_GEOGRAPHY, MILITARY_RANK_ORDER, QUEST_DANGER_INDEX } from '../constants';
import { addDays } from '../utils';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const MilitaryDispatchModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter }) => {
    const [activeTab, setActiveTab] = useState<'new' | 'status'>('new');
    const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);
    const [missionType, setMissionType] = useState<'Patrol' | 'Suppression' | 'Infiltration' | 'Escort'>('Patrol');
    const [resultData, setResultData] = useState<ResultData | null>(null);

    const mData = character.militaryData;
    const playerRank = mData?.rank || MilitaryRank.PVT;
    const playerRankIdx = MILITARY_RANK_ORDER.indexOf(playerRank);

    const currentNation = character.currentLocation?.nation || '대한민국';

    // 모든 지역의 지역대장 및 지역부대장 ID 집합 생성 (지휘관/부지휘관 보직자 제외)
    const assignedRegionalLeaderIds = new Set<string>();
    if (character.militaryData?.regionalAppointments) {
        Object.values(character.militaryData.regionalAppointments).forEach(id => {
            if (id && id !== 'player') assignedRegionalLeaderIds.add(id);
        });
    }
    if (character.militaryData?.regionalViceAppointments) {
        Object.values(character.militaryData.regionalViceAppointments).forEach(id => {
            if (id && id !== 'player') assignedRegionalLeaderIds.add(id);
        });
    }

    const soldiers = [...character.companions, ...(character.inactiveCompanions || [])]
        .filter(c => {
            if (c.job !== JobType.SOLDIER || c.isDead) return false;
            // 해당 국적 군인만 하달 가능 (국적 일치 확인)
            if (c.nation && c.nation !== currentNation) return false;
            // 지역대장 및 부대장 제외
            if (assignedRegionalLeaderIds.has(c.id)) return false;
            // 파견 수행 중인 대원 제외
            return !character.base?.dispatched?.some(d => d.companionId === c.id);
        });

    const missions = {
        Patrol: { label: '도시 순찰', risk: '낮음', days: 7, merit: 10, gold: 1000, icon: Shield },
        Suppression: { label: '마물 토벌', risk: '보통', days: 14, merit: 15, gold: 5000, icon: Sword },
        Infiltration: { label: '적진 첩보', risk: '높음', days: 30, merit: 25, gold: 10000, icon: Target },
        Escort: { label: '국왕 호위', risk: '극도', days: 15, merit: 100, gold: 50000, icon: Crown, minRank: MilitaryRank.LG } 
    };

    const getSuccessRate = (member: Companion, mKey: keyof typeof missions) => {
        const riskLevel = mKey === 'Patrol' ? 'Low' : mKey === 'Suppression' ? 'Mid' : mKey === 'Infiltration' ? 'High' : 'Extreme';
        const dangerIdx = QUEST_DANGER_INDEX[riskLevel] || 1;
        const rate = 80 - (dangerIdx * 15) + (member.level * 0.1);
        return Math.min(99, Math.max(1, Math.floor(rate)));
    };

    const handleDispatch = () => {
        if (!selectedCompanionId) return;
        const mission = missions[missionType];
        
        if (missionType === 'Escort' && playerRankIdx < MILITARY_RANK_ORDER.indexOf(MilitaryRank.LG)) {
            setResultData({
                type: 'warning',
                title: '권한 부족',
                message: '국왕 호위 작전 지휘권은 중장 이상의 고위 장성에게만 부여됩니다.',
                items: [{ label: '필요 계급', after: '중장 이상' }, { label: '현재 계급', after: playerRank }]
            });
            return;
        }

        const comp = soldiers.find(s => s.id === selectedCompanionId)!;
        const rate = getSuccessRate(comp, missionType);

        const newMission: DispatchMission = {
            id: `mil_disp_${Math.random().toString(36).substring(7)}`,
            companionId: selectedCompanionId,
            destination: character.currentLocation!,
            startTime: character.currentDate!,
            durationMonths: 0, 
            expectedReturnDate: addDays(character.currentDate!, mission.days),
            status: 'Normal',
            dangerCounter: 0,
            rewards: { gold: mission.gold, items: [], merit: mission.merit },
            successRate: rate,
            missionType: missionType
        };

        const newChar = { ...character };
        const activeIdx = newChar.companions.findIndex(c => c.id === selectedCompanionId);
        if (activeIdx !== -1) {
            const [target] = newChar.companions.splice(activeIdx, 1);
            if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
            newChar.inactiveCompanions.push(target);
        }

        if (!newChar.base) {
            // @ts-ignore
            newChar.base = { dispatched: [] };
        }
        if (!newChar.base!.dispatched) newChar.base!.dispatched = [];
        newChar.base!.dispatched.push(newMission);

        onUpdateCharacter(newChar, `[군사 파견] ${comp.name} 대원을 '${mission.label}' 작전에 투입했습니다. (성공률: ${rate}%)`);
        setResultData({
            type: 'success',
            title: '작전 투입 완료',
            message: `${comp.name} 대원이 명령에 따라 작전지로 향했습니다.`,
            items: [
                { label: '작전명', after: mission.label },
                { label: '성공률', after: `${rate}%` },
                { label: '복귀 예정일', after: newMission.expectedReturnDate }
            ]
        });
        setSelectedCompanionId(null);
        setActiveTab('status');
    };

    const handleCompleteMission = (mission: DispatchMission) => {
        const allComps = [...character.companions, ...(character.inactiveCompanions || [])];
        const comp = allComps.find(c => c.id === mission.companionId);
        if (!comp) return;

        const successRate = mission.successRate || 50;
        const roll = Math.random() * 100;
        const isSuccess = roll < successRate;

        const newChar = { ...character };
        let logMsg = "";
        let result: ResultData;

        if (isSuccess) {
            const gold = mission.rewards?.gold || 0;
            const merit = mission.rewards?.merit || 0;
            const exp = (mission.rewards?.merit || 10) * 100;

            newChar.money += gold;
            if (newChar.militaryData) newChar.militaryData.merit += merit;
            
            const findAndAddRewards = (list: Companion[]) => {
                const idx = list.findIndex(c => c.id === comp.id);
                if (idx !== -1) {
                    list[idx] = { 
                        ...list[idx], 
                        currentExp: list[idx].currentExp + exp,
                        merit: (list[idx].merit || 0) + merit
                    };
                }
            };
            findAndAddRewards(newChar.companions);
            if (newChar.inactiveCompanions) findAndAddRewards(newChar.inactiveCompanions);

            logMsg = `[군사 보고] ${comp.name} 대원이 작전을 완수하고 복귀했습니다. (골드 +${gold}, 공적치 +${merit})`;
            result = {
                type: 'success',
                title: '작전 성공',
                message: `${comp.name} 대원이 우수한 성과를 거두고 복귀했습니다.`,
                items: [
                    { label: '획득 골드', after: `${gold.toLocaleString()} 골드` },
                    { label: '획득 공적치', after: `+${merit} 공적치` },
                    { label: '경험치', after: `+${exp} EXP` }
                ]
            };
        } else {
            const statsSum = comp.stats.str + comp.stats.int + comp.stats.wis + comp.stats.def + comp.stats.agi + comp.stats.ctrl;
            const deathChance = Math.max(5, 10 + (100 - (statsSum * 0.01)));
            
            const deathRoll = Math.random() * 100;
            if (deathRoll < deathChance) {
                newChar.companions = newChar.companions.filter(c => c.id !== comp.id);
                if (newChar.inactiveCompanions) {
                    newChar.inactiveCompanions = newChar.inactiveCompanions.filter(c => c.id !== comp.id);
                }
                
                logMsg = `[군사 비보] ${comp.name} 대원이 작전 중 전사했습니다... (사망 확률: ${deathChance.toFixed(1)}%)`;
                result = {
                    type: 'destroy',
                    title: '대원 전사',
                    message: `${comp.name} 대원이 작전 수행 중 치명적인 부상을 입고 전사했습니다.\n그의 고귀한 희생을 기립니다.`,
                    items: [
                        { label: '상태', after: '전사' },
                        { label: '사망 확률', after: `${deathChance.toFixed(1)}%` }
                    ]
                };
            } else {
                logMsg = `[군사 보고] ${comp.name} 대원이 작전에 실패하여 빈손으로 복귀했습니다.`;
                result = {
                    type: 'failure',
                    title: '작전 실패',
                    message: `${comp.name} 대원이 목표 달성에 실패했습니다. 큰 부상 없이 복귀한 것에 만족해야 합니다.`,
                    items: [{ label: '결과', after: '보상 없음' }]
                };
            }
        }

        if (newChar.base?.dispatched) {
            newChar.base.dispatched = newChar.base.dispatched.filter(d => d.id !== mission.id);
        }

        onUpdateCharacter(newChar, logMsg);
        setResultData(result);
    };

    const activeMilitaryDispatches = character.base?.dispatched?.filter(d => d.id.startsWith('mil_disp_')) || [];

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 md:p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}

            <div className="bg-slate-900 border border-slate-700/80 w-full max-w-2xl max-h-[92vh] rounded-2xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                {/* 헤더 */}
                <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-950/60 border border-sky-800/60 flex items-center justify-center text-sky-400">
                            <Send size={20} />
                        </div>
                        <div>
                            <h2 className="text-base md:text-lg font-bold text-white tracking-wide">군사 작전 본부</h2>
                            <p className="text-xs text-slate-400">대원 파견 지휘 및 현황 관리</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* 탭 네비게이션 */}
                <div className="flex border-b border-slate-800 bg-slate-950/90 shrink-0">
                    <button 
                        type="button"
                        onClick={() => setActiveTab('new')} 
                        className={`flex-1 py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'new' ? 'text-sky-400 border-b-2 border-sky-500 bg-slate-900/80' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Sword size={15}/> 작전 투입
                    </button>
                    <button 
                        type="button"
                        onClick={() => setActiveTab('status')} 
                        className={`flex-1 py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'status' ? 'text-sky-400 border-b-2 border-sky-500 bg-slate-900/80' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Clock size={15}/> 파견 현황 ({activeMilitaryDispatches.length})
                    </button>
                </div>

                {/* 본문 */}
                <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-5">
                    {activeTab === 'new' ? (
                        <div className="space-y-5">
                            {/* 파견 대원 선택 */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                    <Users size={14} className="text-sky-400"/> 파견 대원 선택
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                    {soldiers.map(s => (
                                        <button 
                                            key={s.id} 
                                            type="button"
                                            onClick={() => setSelectedCompanionId(s.id)} 
                                            className={`p-3 rounded-xl border text-left flex justify-between items-center transition-all ${selectedCompanionId === s.id ? 'bg-sky-950/40 border-sky-500 shadow-sm' : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'}`}
                                        >
                                            <div>
                                                <div className="text-xs md:text-sm font-bold text-slate-200">{s.name}</div>
                                                <div className="text-[11px] text-slate-400">{s.militaryRank} · Lv.{s.level}</div>
                                            </div>
                                            {selectedCompanionId === s.id && <CheckCircle size={16} className="text-sky-400"/>}
                                        </button>
                                    ))}
                                    {soldiers.length === 0 && (
                                        <div className="col-span-full text-center py-8 text-slate-500 border border-dashed border-slate-800 rounded-xl text-xs">
                                            파견 가능한 군인 동료가 없습니다.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 작전 유형 선택 */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                    <Target size={14} className="text-sky-400"/> 작전 유형 선택
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {(Object.entries(missions) as [keyof typeof missions, any][]).map(([key, m]) => {
                                        const Icon = m.icon;
                                        const isLocked = key === 'Escort' && playerRankIdx < MILITARY_RANK_ORDER.indexOf(MilitaryRank.LG);
                                        const isSelected = missionType === key;
                                        return (
                                            <button 
                                                key={key} 
                                                type="button"
                                                onClick={() => !isLocked && setMissionType(key)} 
                                                className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all relative overflow-hidden ${isLocked ? 'bg-slate-950/50 border-slate-800/80 opacity-50 cursor-not-allowed' : isSelected ? 'bg-sky-950/50 border-sky-500 shadow-sm' : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'}`}
                                            >
                                                <Icon size={20} className={isLocked ? 'text-slate-600' : isSelected ? 'text-sky-400' : 'text-slate-400'} />
                                                <div className="text-center">
                                                    <div className={`text-xs font-bold ${isLocked ? 'text-slate-500' : 'text-slate-200'}`}>{m.label}</div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">위험도: {m.risk}</div>
                                                </div>
                                                {isLocked && (
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                        <Lock size={16} className="text-rose-400" />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 예상 작전 분석 정보 */}
                            {selectedCompanionId && (
                                <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800 space-y-3">
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                            <TrendingUp size={14} className="text-emerald-400"/> 예상 성공률
                                        </span>
                                        {(() => { 
                                            const comp = soldiers.find(s => s.id === selectedCompanionId); 
                                            if (!comp) return null; 
                                            const rate = getSuccessRate(comp, missionType); 
                                            return (
                                                <span className={`text-base font-mono font-bold ${rate >= 80 ? 'text-emerald-400' : rate >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                    {rate}%
                                                </span>
                                            ); 
                                        })()}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                        <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                                            <div className="text-[10px] text-slate-400 mb-0.5">소요 기간</div>
                                            <div className="font-bold text-slate-200">{missions[missionType].days}일</div>
                                        </div>
                                        <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                                            <div className="text-[10px] text-slate-400 mb-0.5">예상 공적치</div>
                                            <div className="font-bold text-sky-400">+{missions[missionType].merit}</div>
                                        </div>
                                        <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                                            <div className="text-[10px] text-slate-400 mb-0.5">작전 지원금</div>
                                            <div className="font-bold text-amber-400">+{missions[missionType].gold.toLocaleString()} 골드</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button 
                                type="button"
                                onClick={handleDispatch} 
                                disabled={!selectedCompanionId || (missionType === 'Escort' && playerRankIdx < MILITARY_RANK_ORDER.indexOf(MilitaryRank.LG))} 
                                className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.99] text-xs md:text-sm"
                            >
                                작전 투입 명령
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeMilitaryDispatches.length > 0 ? (
                                activeMilitaryDispatches.map(m => {
                                    const comp = [...character.companions, ...(character.inactiveCompanions || [])].find(c => c.id === m.companionId);
                                    const isDone = character.currentDate! >= m.expectedReturnDate;
                                    return (
                                        <div key={m.id} className={`p-4 rounded-xl border ${isDone ? 'border-emerald-500/70 bg-emerald-950/20' : 'border-slate-800 bg-slate-950/80'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="text-xs md:text-sm font-bold text-slate-200">{comp?.name || '대원'}</div>
                                                    <div className="text-[11px] text-slate-400">{m.destination.city} 파견 작전 (성공률: {m.successRate}%)</div>
                                                </div>
                                                {isDone ? (
                                                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-md font-bold">
                                                        작전 완료
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 flex items-center bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                                                        <Clock size={10} className="mr-1 text-sky-400"/> 진행 중
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-400 mb-3">복귀 예정일: {m.expectedReturnDate}</div>
                                            <button 
                                                type="button"
                                                onClick={() => handleCompleteMission(m)} 
                                                disabled={!isDone} 
                                                className={`w-full py-2.5 rounded-lg font-bold text-xs transition-all ${isDone ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                            >
                                                임무 보고 수령
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                                    <Clock size={40} className="mx-auto mb-3 opacity-30 text-slate-400"/>
                                    <p className="text-xs">현재 파견 중인 대원이 없습니다.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MilitaryDispatchModal;
