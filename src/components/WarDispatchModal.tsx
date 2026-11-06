
import React, { useState } from 'react';
import { Character, Companion, Location, DispatchMission, DiplomaticStatus, JobType } from '../types';
import { X, Send, Users, CheckCircle, Target, Loader2, Info, Sword, Shield, TrendingUp, Clock, AlertTriangle, Flame, Package, Skull } from 'lucide-react';
import { WORLD_GEOGRAPHY, MILITARY_RANK_ORDER, QUEST_DANGER_INDEX } from '../constants';
import { addDays } from '../utils';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    targetNation: string;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const WarDispatchModal: React.FC<Props> = ({ character, targetNation, onClose, onUpdateCharacter }) => {
    const [activeTab, setActiveTab] = useState<'new' | 'status'>('new');
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);

    const handleResultClose = () => {
        setResultData(null);
    };

    const mData = character.militaryData;
    const relation = mData?.diplomacy?.[targetNation];
    const occupation = relation?.occupation || 0;

    // 동료가 현재 다른 임무 수행 중인지 확인하는 헬퍼
    const isMemberBusy = (id: string) => {
        // 1. 기본 파견 확인
        if (character.base?.dispatched?.some(d => d.companionId === id)) return true;
        // 2. 다인 파견(전쟁) 참가 여부 확인
        if (character.base?.dispatched?.some(d => d.missionType === 'WarInvasion' && (d as any).participants?.includes(id))) return true;
        // 3. 시설 배치 확인
        if (Object.values(character.base?.assignments || {}).includes(id)) return true;
        // 4. 용병단 그룹 미션 확인
        if (character.mercenaryData?.groupMissions?.some(m => m.memberIds.includes(id))) return true;
        return false;
    };

    // 파견 가능한 인원: 살아있고, 몬스터가 아니며, 용병/군인 직업이고, 현재 아무 작업도 수행 중이지 않은 인원
    const availableMembers = [...character.companions, ...(character.inactiveCompanions || [])].filter(c => 
        !c.isDead && 
        !c.isMonster && 
        (c.job === JobType.MERCENARY || c.job === JobType.SOLDIER) &&
        !isMemberBusy(c.id)
    );

    const nationCities = (() => {
        for (const region in WORLD_GEOGRAPHY) {
            if (WORLD_GEOGRAPHY[region][targetNation]) {
                return WORLD_GEOGRAPHY[region][targetNation].cities;
            }
        }
        return [];
    })();

    // 성공률 계산
    const calculateSuccessRate = () => {
        if (selectedMemberIds.length === 0) return 0;
        const selectedMembers = availableMembers.filter(m => selectedMemberIds.includes(m.id));
        const maxStatsSum = Math.max(...selectedMembers.map(m => 
            m.stats.str + m.stats.int + m.stats.wis + m.stats.def + m.stats.agi + m.stats.ctrl
        ));
        const baseRate = maxStatsSum * 0.01;
        const penalty = Math.min(50, Math.max(0, occupation)); 
        const bonus = selectedMemberIds.length * 5; 
        return Math.min(99, Math.max(1, Math.floor(baseRate - penalty + bonus)));
    };

    const handleDispatch = () => {
        if (selectedMemberIds.length === 0 || !selectedCity) return;
        
        setIsProcessing(true);
        const rate = calculateSuccessRate();
        const nextDate = addDays(character.currentDate || '2000-01-01', 30); 

        setTimeout(() => {
            const newChar = { ...character };
            const missionId = `war_inv_${Math.random().toString(36).substring(7)}`;
            
            // 기지 데이터가 없으면 초기화 (기존 데이터 보존)
            if (!newChar.base) {
                newChar.base = { 
                    level: 0, 
                    resources: { gold: 0, wood: 0, stone: 0, iron: 0, manaStone: 0, manaCrystal: 0, food: 0, herbs: 0, normalCrystal: 0, magicCrystal: 0, rareCrystal: 0, epicCrystal: 0, uniqueCrystal: 0, legendaryCrystal: 0 }, 
                    residents: [], 
                    facilities: [], 
                    assignments: {}, 
                    storage: [], 
                    facilityLevels: {}, 
                    dailyCounts: {}, 
                    elementalShards: {}, 
                    capturedMonsters: [],
                    gridSize: 2,
                    layout: []
                };
            }
            
            const newBase = { ...newChar.base };
            if (!newBase.dispatched) newBase.dispatched = [];
            else newBase.dispatched = [...newBase.dispatched];

            const newMission: DispatchMission = {
                id: missionId,
                companionId: selectedMemberIds[0], // 대표 아이디
                destination: { nation: targetNation, city: selectedCity, region: "" },
                startTime: character.currentDate!,
                durationMonths: 1,
                expectedReturnDate: nextDate,
                status: 'Normal',
                dangerCounter: 0,
                successRate: rate,
                missionType: 'WarInvasion'
            };

            // 모든 참가자 메타데이터 저장
            (newMission as any).participants = selectedMemberIds;
            (newMission as any).targetCity = selectedCity;

            // 1. 선택된 모든 인원을 파티(Active)에서 제외하고 대기(Inactive)로 이동
            const activeParticipants = newChar.companions.filter(c => selectedMemberIds.includes(c.id));
            if (activeParticipants.length > 0) {
                newChar.companions = newChar.companions.filter(c => !selectedMemberIds.includes(c.id));
                if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
                newChar.inactiveCompanions = [...newChar.inactiveCompanions, ...activeParticipants];
            }

            // 2. 모든 참가자를 시스템상 'Busy' 상태로 마킹 (assignments 활용)
            if (!newBase.assignments) newBase.assignments = {};
            else newBase.assignments = { ...newBase.assignments };

            selectedMemberIds.forEach(id => {
                newBase.assignments[`dispatch_war_${missionId}_${id}`] = id;
            });

            newBase.dispatched.push(newMission);
            newChar.base = newBase;
            
            onUpdateCharacter(newChar, `[전쟁 파견] ${selectedMemberIds.length}명의 대원이 ${targetNation} ${selectedCity} 침공을 위해 출정했습니다.`);
            setResultData({
                type: 'info',
                title: '침공 부대 출정',
                message: `부대가 목적지인 ${selectedCity}를 향해 출발했습니다.\n모든 참가 대원은 작전 종료 시까지 파티 합류 및 기지 배정이 불가합니다.`,
                items: [
                    { label: '파견 인원', after: `${selectedMemberIds.length}명` },
                    { label: '성공률', after: `${rate}%` },
                    { label: '완료 예정', after: nextDate }
                ]
            });
            setIsProcessing(false);
            setActiveTab('status');
            setSelectedMemberIds([]);
        }, 1000);
    };

    const handleCompleteInvasion = (mission: DispatchMission) => {
        const meta = mission as any;
        const participants = meta.participants || [];
        const targetCity = meta.targetCity || "전선";
        const rate = mission.successRate || 50;

        setIsProcessing(true);
        setTimeout(() => {
            const roll = Math.random() * 100;
            const success = roll < rate;
            const newChar = { ...character };
            const allComps = [...newChar.companions, ...(newChar.inactiveCompanions || [])];
            
            const casualties: string[] = [];

            // 1. 파견 목록 및 배정 데이터(Busy 상태) 삭제
            if (newChar.base) {
                newChar.base = { ...newChar.base };
                newChar.base.dispatched = newChar.base.dispatched?.filter(d => d.id !== mission.id);
                if (newChar.base.assignments) {
                    const newAssignments = { ...newChar.base.assignments };
                    participants.forEach((id: string) => {
                        delete newAssignments[`dispatch_war_${mission.id}_${id}`];
                    });
                    newChar.base.assignments = newAssignments;
                }
            }

            if (success) {
                const rel = { ...newChar.militaryData!.diplomacy![targetNation] };
                rel.occupation = Math.min(100, (rel.occupation || 0) + 5);
                rel.lastEvent = `${targetCity} 지역 침공 성공! 점유율 5% 상승.`;
                newChar.militaryData!.diplomacy![targetNation] = rel;

                const expGain = 5000 * participants.length;
                
                // 경험치 및 충성도 보상 분배
                participants.forEach((id: string) => {
                    const comp = allComps.find(c => c.id === id);
                    if (comp) {
                        comp.currentExp += expGain;
                        comp.loyalty = Math.min(100, comp.loyalty + 5);
                    }
                });

                onUpdateCharacter(newChar, `[전쟁 보고] ${targetNation} 침공 성공! 점유율 +5%.`);
                setResultData({
                    type: 'success',
                    title: '침공 작전 대성공',
                    message: `부대가 ${targetCity}의 적군을 격퇴하고 거점을 장악했습니다!`,
                    items: [
                        { label: '전선 점유율', after: '+5% (상승)' },
                        { label: '단원 획득 경험치', after: `+${expGain.toLocaleString()} EXP` }
                    ]
                });
            } else {
                // [NEW] 실패 시 모든 참가자에 대해 개별 사망 확률 계산: 10% + (100 - 능력치합*0.01)%
                participants.forEach((id: string) => {
                    const comp = allComps.find(c => c.id === id);
                    if (comp && !comp.isDead) {
                        const statsSum = comp.stats.str + comp.stats.int + comp.stats.wis + comp.stats.def + comp.stats.agi + comp.stats.ctrl;
                        const deathChance = Math.max(5, 10 + (100 - (statsSum * 0.01)));
                        const deathRoll = Math.random() * 100;
                        
                        if (deathRoll < deathChance) {
                            casualties.push(comp.name);
                            comp.isDead = true;
                            // Remove from active/inactive lists if necessary, or let isDead flag handle it
                            newChar.companions = newChar.companions.filter(c => c.id !== id);
                                // [MODIFIED] 전사 시 사회적 관계망에서도 영구 삭제
                            if (newChar.socialNetwork) newChar.socialNetwork = newChar.socialNetwork.filter(sn => sn.id !== id);
                            if (newChar.inactiveCompanions) {
                                newChar.inactiveCompanions = newChar.inactiveCompanions.filter(c => c.id !== id);
                            }
                        }
                    }
                });

                const rel = { ...newChar.militaryData!.diplomacy![targetNation] };
                rel.lastEvent = `${targetCity} 침공 실패... 아군이 피해를 입고 후퇴했습니다.`;
                newChar.militaryData!.diplomacy![targetNation] = rel;

                let logMsg = `[전쟁 보고] ${targetNation} 침공 실패... 부대가 패퇴했습니다.`;
                if (casualties.length > 0) logMsg += ` [전사자: ${casualties.join(', ')}]`;
            
                onUpdateCharacter(newChar, logMsg);
                setResultData({
                    type: casualties.length > 0 ? 'destroy' : 'failure',
                    title: '침공 실패',
                    message: `적의 강력한 저지에 가로막혀 진격에 실패했습니다.\n${casualties.length > 0 ? `안타깝게도 작전 중 ${casualties.join(', ')} 대원이 전사했습니다.` : '대원들이 지친 몸으로 본부로 복귀했습니다.'}`,
                    items: [
                        { label: '결과', after: '패배' },
                        ...(casualties.length > 0 ? [{ label: '전사자', after: `${casualties.length}명` }] : [])
                    ]
                });
            }
            setIsProcessing(false);
        }, 1200);
    };

    const currentRate = calculateSuccessRate();
    const activeWarMissions = character.base?.dispatched?.filter(d => d.missionType === 'WarInvasion') || [];

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            {resultData && <ActionResultModal data={resultData} onClose={handleResultClose} />}

            <div className="bg-slate-950 border border-red-500 w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                <div className="p-6 border-b border-red-900/30 bg-red-950/20 flex justify-between items-center shrink-0">
                    <div className="flex items-center">
                        <Flame size={32} className="text-red-500 mr-4 animate-pulse" />
                        <div>
                            <h2 className="text-2xl font-bold text-white font-cinzel">WAR DISPATCH</h2>
                            <p className="text-xs text-red-400 font-bold uppercase tracking-widest">전쟁 병력 파견 관리</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"><X size={24} /></button>
                </div>

                <div className="flex border-b border-slate-800 bg-slate-900 shrink-0">
                    <button onClick={() => setActiveTab('new')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center transition-all ${activeTab === 'new' ? 'text-red-400 border-b-2 border-red-500 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}>
                        <Sword size={18} className="mr-2"/> 신규 침공 파견
                    </button>
                    <button onClick={() => setActiveTab('status')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center transition-all ${activeTab === 'status' ? 'text-red-400 border-b-2 border-red-500 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}>
                        <Clock size={18} className="mr-2"/> 파견 및 보고 ({activeWarMissions.length})
                    </button>
                </div>

                <div className="flex-1 overflow-hidden">
                    {activeTab === 'new' ? (
                        <div className="flex flex-col md:flex-row h-full">
                            <div className="w-full md:w-80 border-r border-slate-800 p-4 overflow-y-auto custom-scrollbar shrink-0 bg-slate-900/50">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Users size={14}/> 대원 선택</h3>
                                    <span className="text-[10px] text-red-500 font-bold">{selectedMemberIds.length}/10</span>
                                </div>
                                <div className="space-y-2">
                                    {availableMembers.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => {
                                                if (selectedMemberIds.includes(m.id)) setSelectedMemberIds(prev => prev.filter(id => id !== m.id));
                                                else if (selectedMemberIds.length < 10) setSelectedMemberIds(prev => [...prev, m.id]);
                                            }}
                                            className={`w-full p-3 rounded-2xl border text-left transition-all ${selectedMemberIds.includes(m.id) ? 'bg-red-900/30 border-red-500' : 'bg-slate-900 border border-slate-800 hover:border-slate-700'}`}
                                        >
                                            <div className="font-bold text-sm text-slate-200">{m.name}</div>
                                            <div className="text-[9px] text-slate-500 uppercase">{m.mercenaryRank || m.militaryRank} Rank • Lv.{m.level}</div>
                                        </button>
                                    ))}
                                    {availableMembers.length === 0 && (
                                        <div className="py-20 text-center text-slate-600 italic px-4">
                                            <Info size={24} className="mx-auto mb-2 opacity-30"/>
                                            <p className="text-xs">파견 가능한 군인/용병 동료가 없습니다.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-slate-900/80 flex flex-col items-center justify-center">
                                <div className="max-w-md w-full space-y-8">
                                    <div className="bg-slate-950 p-6 rounded-3xl border border-red-900/30 space-y-6">
                                        <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                                            <Target size={18} /> 침공 목표 도시
                                        </h4>
                                        <select 
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white text-lg font-bold outline-none focus:border-red-500 transition-all"
                                            value={selectedCity}
                                            onChange={e => setSelectedCity(e.target.value)}
                                        >
                                            <option value="" disabled>도시 선택</option>
                                            {nationCities.map((city, idx) => <option key={`${city}-${idx}`} value={city}>{city}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-center">
                                            <span className="text-[10px] text-slate-500 uppercase block mb-1">Success Rate</span>
                                            <div className={`text-2xl font-mono font-bold ${currentRate >= 80 ? 'text-green-400' : currentRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{currentRate}%</div>
                                        </div>
                                        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-center">
                                            <span className="text-[10px] text-slate-500 uppercase block mb-1">Time</span>
                                            <div className="text-2xl font-mono font-bold text-blue-400">30 Days</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleDispatch}
                                        disabled={selectedMemberIds.length === 0 || !selectedCity || isProcessing}
                                        className="w-full py-5 bg-red-800 hover:bg-red-700 disabled:bg-slate-800 text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all"
                                    >
                                        {isProcessing ? <Loader2 className="animate-spin" /> : <Send size={20}/>}
                                        침공 부대 파견
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 overflow-y-auto h-full custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeWarMissions.map(mission => {
                                    const isDone = character.currentDate! >= mission.expectedReturnDate;
                                    const meta = mission as any;
                                    const allPossibleComps = [...character.companions, ...(character.inactiveCompanions || [])];
                                    const representative = allPossibleComps.find(c => c.id === mission.companionId);
                                    const participantList = (meta.participants || []).map((id: string) => allPossibleComps.find(c => c.id === id)?.name).filter(Boolean);

                                    return (
                                        <div key={mission.id} className={`p-5 rounded-2xl border-2 transition-all ${isDone ? 'border-amber-500 bg-amber-950/20 shadow-lg' : 'border-slate-800 bg-slate-950'}`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                                                        <Users size={20} className="text-red-500"/>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-slate-200 truncate">{targetNation} 침공 부대</div>
                                                        <div className="text-[10px] text-slate-500 truncate">지휘: {representative?.name || '대원'} 외 {meta.participants?.length - 1}명</div>
                                                    </div>
                                                </div>
                                                {isDone ? (
                                                    <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded font-bold animate-pulse whitespace-nowrap">작전 종료</span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-500 flex items-center whitespace-nowrap"><Clock size={10} className="mr-1"/> 진행 중</span>
                                                )}
                                            </div>
                                            
                                            <div className="bg-black/40 p-3 rounded-xl border border-white/5 mb-4 space-y-2">
                                                <div className="flex justify-between text-[10px]">
                                                    <span className="text-slate-500">목표 도시</span>
                                                    <span className="text-white font-bold">{meta.targetCity}</span>
                                                </div>
                                                <div className="flex justify-between text-[10px]">
                                                    <span className="text-slate-500">복귀 예정</span>
                                                    <span className="text-amber-400 font-mono">{mission.expectedReturnDate}</span>
                                                </div>
                                                <div className="pt-2 border-t border-white/5">
                                                    <div className="text-[9px] text-slate-600 font-bold uppercase mb-1">Participants</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {participantList.map((name: string, i: number) => (
                                                            <span key={i} className="text-[9px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">{name}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => handleCompleteInvasion(mission)} 
                                                disabled={!isDone || isProcessing}
                                                className={`w-full py-3 rounded-xl font-bold text-xs transition-all ${isDone ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'}`}
                                            >
                                                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : '작전 보고 수령'}
                                            </button>
                                        </div>
                                    );
                                })}
                                {activeWarMissions.length === 0 && (
                                    <div className="col-span-full py-20 text-center text-slate-600">
                                        <Clock size={48} className="mx-auto mb-4 opacity-10"/>
                                        <p>진행 중인 침공 작전이 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WarDispatchModal;
