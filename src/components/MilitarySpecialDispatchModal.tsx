
import React, { useState } from 'react';
import { Character, Companion, DispatchMission, MilitaryRank, JobType } from '../types';
import { X, ShieldAlert, Target, Users, CheckCircle, ShieldCheck, Flame, Skull, Ghost, Clock, Send, Lock } from 'lucide-react';
import { QUEST_DANGER_INDEX } from '../constants';
import { addDays } from '../utils';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

type SpecialMissionType = 'Ancient' | 'Infiltration' | 'AntiState' | 'RoyalGuard' | 'CoupSuppression' | 'SecretProtect';

const MilitarySpecialDispatchModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter }) => {
    const [activeTab, setActiveTab] = useState<'new' | 'status'>('new');
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [selectedMissionKey, setSelectedMissionKey] = useState<SpecialMissionType | null>(null);
    const [resultData, setResultData] = useState<ResultData | null>(null);

    const mData = character.militaryData!;
    const eliteIds = mData.eliteMemberIds || [];
    const royalIds = mData.royalGuardMemberIds || [];
    
    const allCompanions = [...character.companions, ...(character.inactiveCompanions || [])];
    const specialMembers = allCompanions.filter(c => 
        (eliteIds.includes(c.id) || royalIds.includes(c.id)) && 
        !character.base?.dispatched?.some(d => d.companionId === c.id)
    );

    const missions: Record<SpecialMissionType, any> = {
        Ancient: { id: 'Ancient', category: 'Elite', label: '초고위험 토벌', danger: '극도', days: 60, merit: 200, gold: 100000, desc: '고대 봉인체 혹은 재앙급 몬스터를 토벌합니다.', icon: Skull },
        Infiltration: { id: 'Infiltration', category: 'Elite', label: '비공개 침투', danger: '높음', days: 15, merit: 60, gold: 50000, desc: '적진 깊숙이 침투하여 핵심 시설을 무력화합니다.', icon: Target },
        AntiState: { id: 'AntiState', category: 'Elite', label: '반국가 조직 제거', danger: '보통', days: 10, merit: 40, gold: 30000, desc: '테러 조직 및 금지 종교 세력을 숙청합니다.', icon: Ghost },
        RoyalGuard: { id: 'RoyalGuard', category: 'Royal', label: '국왕 직접 호위', danger: '높음', days: 30, merit: 75, gold: 80000, desc: '암살 위협으로부터 국왕을 근접 보호합니다.', icon: ShieldCheck },
        CoupSuppression: { id: 'CoupSuppression', category: 'Royal', label: '내란 및 반란 진압', danger: '극도', days: 15, merit: 200, gold: 100000, desc: '군 내부 반란 혹은 귀족 반란 세력을 진압합니다.', icon: Flame },
        SecretProtect: { id: 'SecretProtect', category: 'Royal', label: '국가 기밀 보호', danger: '보통', days: 35, merit: 100, gold: 80000, desc: '왕실 기밀 탈취를 시도하는 첩보원들을 저지합니다.', icon: Lock }
    };

    const getSuccessRate = (member: Companion, mission: any) => {
        const dangerIdx = mission.danger === '극도' ? 2 : mission.danger === '높음' ? 1.5 : 1;
        const rate = 100 - (dangerIdx * 40) + (member.level * 0.1);
        return Math.min(99, Math.max(1, Math.floor(rate)));
    };

    const handleDispatch = () => {
        if (!selectedMemberId || !selectedMissionKey) return;
        
        const member = specialMembers.find(m => m.id === selectedMemberId)!;
        const mission = missions[selectedMissionKey];
        const successRate = getSuccessRate(member, mission);

        const newMission: DispatchMission = {
            id: `spec_disp_${Math.random().toString(36).substring(7)}`,
            companionId: selectedMemberId,
            destination: character.currentLocation!,
            startTime: character.currentDate!,
            durationMonths: 0,
            expectedReturnDate: addDays(character.currentDate!, mission.days),
            status: 'Normal',
            dangerCounter: 0,
            rewards: { gold: mission.gold, items: [], merit: mission.merit },
            successRate: successRate,
            missionType: selectedMissionKey
        };

        const newChar = { ...character };
        const activeIdx = newChar.companions.findIndex(c => c.id === selectedMemberId);
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

        onUpdateCharacter(newChar, `[특수 작전] ${member.name} 대원을 '${mission.label}' 임무에 투입했습니다. (성공률: ${successRate}%)`);
        setResultData({
            type: 'success',
            title: '특수 작전 개시',
            message: `${member.name} 대원이 국가의 명운을 건 기밀 작전에 투입되었습니다.`,
            items: [
                { label: '작전명', after: mission.label },
                { label: '성공률', after: `${successRate}%` },
                { label: '복귀 예정일', after: newMission.expectedReturnDate }
            ]
        });
        
        setSelectedMemberId(null);
        setSelectedMissionKey(null);
        setActiveTab('status');
    };

    const handleCompleteSpecialMission = (mission: DispatchMission) => {
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
            const exp = (mission.rewards?.merit || 10) * 200;

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

            logMsg = `[특수 작전 성공] ${comp.name} 대원이 극비 임무를 완수했습니다! (골드 +${gold}, 공적치 +${merit})`;
            result = {
                type: 'success',
                title: '특수 작전 대성공',
                message: `국가의 부름에 응답한 ${comp.name} 대원이 임무를 성공적으로 완수하고 무사히 복귀했습니다.`,
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
                if (newChar.inactiveCompanions) newChar.inactiveCompanions = newChar.inactiveCompanions.filter(c => c.id !== comp.id);
                
                if (newChar.militaryData) {
                    newChar.militaryData.eliteMemberIds = newChar.militaryData.eliteMemberIds?.filter(id => id !== comp.id);
                    newChar.militaryData.royalGuardMemberIds = newChar.militaryData.royalGuardMemberIds?.filter(id => id !== comp.id);
                }

                logMsg = `[특수 작전 실패] ${comp.name} 대원이 작전 중 전사했습니다... (사망 확률: ${deathChance.toFixed(1)}%)`;
                result = {
                    type: 'destroy',
                    title: '최정예 대원 전사',
                    message: `비밀 작전 수행 중 ${comp.name} 대원과의 통신이 두절되었습니다.\n확인 결과 조국을 위해 끝까지 싸우다 전사했습니다.`,
                    items: [
                        { label: '상태', after: '전사' },
                        { label: '사망 확률', after: `${deathChance.toFixed(1)}%` }
                    ]
                };
            } else {
                logMsg = `[특수 작전 실패] ${comp.name} 대원이 작전에 실패하고 복귀했습니다.`;
                result = {
                    type: 'failure',
                    title: '작전 실패',
                    message: `${comp.name} 대원이 임무 완수에 실패했습니다. 대원이 큰 부상 없이 복귀한 것에 만족해야 합니다.`,
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

    const activeSpecialDispatches = character.base?.dispatched?.filter(d => d.id.startsWith('spec_disp_')) || [];

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 md:p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}

            <div className="bg-slate-900 border border-slate-700/80 w-full max-w-4xl max-h-[92vh] rounded-2xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                {/* 헤더 */}
                <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400">
                            <ShieldAlert size={20} />
                        </div>
                        <div>
                            <h2 className="text-base md:text-lg font-bold text-white tracking-wide">기밀 특수 작전실</h2>
                            <p className="text-xs text-slate-400">정예 및 친위 대원 전용 국가 기밀 작전 하달</p>
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
                        className={`flex-1 py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'new' ? 'text-rose-400 border-b-2 border-rose-500 bg-slate-900/80' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Send size={15}/> 작전 하달
                    </button>
                    <button 
                        type="button"
                        onClick={() => setActiveTab('status')} 
                        className={`flex-1 py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'status' ? 'text-rose-400 border-b-2 border-rose-500 bg-slate-900/80' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Clock size={15}/> 진행 현황 ({activeSpecialDispatches.length})
                    </button>
                </div>

                {/* 본문 */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {activeTab === 'new' ? (
                        <>
                            {/* 좌측: 특수 대원 선택 */}
                            <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/40 p-4 overflow-y-auto shrink-0">
                                <h3 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
                                    <Users size={14} className="text-rose-400"/> 가용 특수 대원
                                </h3>
                                <div className="space-y-2">
                                    {specialMembers.map(m => {
                                        const isRoyal = royalIds.includes(m.id);
                                        const isSelected = selectedMemberId === m.id;
                                        return (
                                            <button 
                                                key={m.id} 
                                                type="button"
                                                onClick={() => setSelectedMemberId(m.id)} 
                                                className={`w-full p-3 rounded-xl border text-left flex justify-between items-center transition-all ${isSelected ? 'bg-rose-950/40 border-rose-500 shadow-sm' : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'}`}
                                            >
                                                <div>
                                                    <div className="font-bold text-xs md:text-sm text-slate-200">{m.name}</div>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${isRoyal ? 'text-amber-300 border-amber-800/60 bg-amber-950/40' : 'text-sky-300 border-sky-800/60 bg-sky-950/40'}`}>
                                                            {isRoyal ? '친위대' : '정예'}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400">Lv.{m.level}</span>
                                                    </div>
                                                </div>
                                                {isSelected && <CheckCircle size={16} className="text-rose-400 shrink-0"/>}
                                            </button>
                                        );
                                    })}
                                    {specialMembers.length === 0 && (
                                        <div className="text-xs text-slate-500 text-center py-8 border border-dashed border-slate-800 rounded-xl">
                                            가용 특수 대원이 없습니다.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 우측: 기밀 작전 목록 */}
                            <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-3">
                                <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                    <Target size={14} className="text-rose-400"/> 기밀 작전 선택
                                </h3>
                                {selectedMemberId ? (
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {Object.values(missions).map((m: any) => {
                                            const member = specialMembers.find(sm => sm.id === selectedMemberId)!;
                                            const canTake = (m.category === 'Elite' && eliteIds.includes(member.id)) || (m.category === 'Royal' && royalIds.includes(member.id));
                                            const successRate = getSuccessRate(member, m);
                                            const isSelected = selectedMissionKey === m.id;
                                            const Icon = m.icon;
                                            return (
                                                <button 
                                                    key={m.id} 
                                                    type="button"
                                                    disabled={!canTake} 
                                                    onClick={() => setSelectedMissionKey(m.id)} 
                                                    className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${!canTake ? 'opacity-40 cursor-not-allowed border-slate-800 bg-slate-950/30' : isSelected ? 'bg-rose-950/40 border-rose-500 shadow-sm' : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'}`}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-rose-600 text-white' : 'bg-slate-900 border border-slate-800 text-rose-400'}`}>
                                                                <Icon size={18}/>
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-xs md:text-sm text-slate-100">{m.label}</div>
                                                                <div className="text-[11px] text-slate-400 mt-0.5">{m.category === 'Elite' ? '정예 대원 전용' : '친위 대원 전용'}</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`text-xs font-bold ${successRate >= 80 ? 'text-emerald-400' : successRate >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                                성공률 {successRate}%
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">위험도: {m.danger}</div>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mb-3">{m.desc}</p>
                                                    <div className="flex flex-wrap items-center gap-3 border-t border-slate-800/70 pt-2.5 text-xs">
                                                        <span className="text-amber-400 font-bold font-mono">+{m.gold.toLocaleString()} 골드</span>
                                                        <span className="text-sky-400 font-bold font-mono">+{m.merit} 공적치</span>
                                                        <span className="text-slate-400 ml-auto font-mono">{m.days}일 소요</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="h-48 md:h-64 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                                        <Users size={36} className="mb-2 opacity-40"/>
                                        <p className="text-xs">먼저 좌측에서 투입할 특수 대원을 선택하십시오.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-3">
                            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                <Clock size={14} className="text-rose-400"/> 작전 진행 및 복귀 현황
                            </h3>
                            {activeSpecialDispatches.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3">
                                    {activeSpecialDispatches.map(m => {
                                        const comp = [...character.companions, ...(character.inactiveCompanions || [])].find(c => c.id === m.companionId);
                                        const isDone = character.currentDate! >= m.expectedReturnDate;
                                        return (
                                            <div key={m.id} className={`p-4 rounded-xl border ${isDone ? 'border-amber-500/70 bg-amber-950/20' : 'border-slate-800 bg-slate-950/80'}`}>
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <div className="font-bold text-slate-200 text-xs md:text-sm">{comp?.name || '대원'}</div>
                                                        <div className="text-[11px] text-slate-400">극비 임무 수행 중 (성공률: {m.successRate}%)</div>
                                                    </div>
                                                    {isDone ? (
                                                        <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-md font-bold">
                                                            작전 완료
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                                                            복귀 예정: {m.expectedReturnDate}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 mb-3 flex justify-between text-xs text-slate-300">
                                                    <span className="text-slate-400">예상 보상</span>
                                                    <span className="font-bold text-amber-400 font-mono">{m.rewards?.gold.toLocaleString()} 골드 / +{m.rewards?.merit} 공적치</span>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => handleCompleteSpecialMission(m)} 
                                                    disabled={!isDone} 
                                                    className={`w-full py-2.5 rounded-lg font-bold text-xs transition-all ${isDone ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                                >
                                                    {isDone ? '작전 결과 보고 수령' : '작전 완료 대기 중'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                                    <ShieldAlert size={40} className="mx-auto mb-3 opacity-30 text-slate-400"/>
                                    <p className="text-xs">현재 진행 중인 기밀 특수 작전이 없습니다.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 하단 작전 투입 버튼 */}
                {activeTab === 'new' && (
                    <div className="p-4 bg-slate-950 border-t border-slate-800">
                        <button 
                            type="button"
                            onClick={handleDispatch} 
                            disabled={!selectedMemberId || !selectedMissionKey} 
                            className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.99] text-xs md:text-sm flex items-center justify-center gap-2"
                        >
                            <Send size={16}/> 기밀 작전 투입 명령
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MilitarySpecialDispatchModal;
