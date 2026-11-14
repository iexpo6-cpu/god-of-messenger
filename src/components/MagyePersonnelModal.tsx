
import React, { useState } from 'react';
import { Character, Companion, DominionData, MagyePersonnel, JobType } from '../types';
import { X, Skull, Users, UserPlus, UserMinus, Shield, Star, Crown, Heart, Info, CheckCircle, AlertTriangle, MessageCircle, Gem, TrendingUp, Lock, Flame, ShieldAlert, ShieldCheck, TowerControl, Gavel, Zap } from 'lucide-react';
import { SHINRYOKU_UI_CONFIG, MAX_PARTY_SIZE, INITIAL_BASE } from '../constants';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
    character: Character;
    city: string;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const MAGYE_ROLES = [
    { id: 'tormentor', label: '심연 고문관', max: 1, desc: 'CTRL, INT 기반. 매달 공포도(Fear)를 생성합니다.', icon: Skull, color: 'text-purple-400' },
    { id: 'executioner', label: '공포의 처형인', max: 2, desc: 'STR, AGI 기반. 공포도의 자연 하락을 방어합니다.', icon: Flame, color: 'text-red-500' },
    { id: 'overseer', label: '노예 감독관', max: 999, desc: 'STR, DEF 기반. 자원 수급 및 칙령 효율을 극대화합니다.', icon: Gavel, color: 'text-amber-500' },
];

const MagyePersonnelModal: React.FC<Props> = ({ character, city, onClose, onUpdateCharacter }) => {
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [personnelSort, setPersonnelSort] = useState<'levelDesc' | 'levelAsc' | 'nameAsc' | 'powerDesc' | 'element'>('levelDesc');

    const dominion = character.magyeDominions?.[city] || { fear: 500, corruption: 500, facilityLevels: {}, personnel: { overseerIds: [], executionerIds: [] } };
    const personnel = dominion.personnel || { overseerIds: [], executionerIds: [] };
    const allComps = [...character.companions, ...(character.inactiveCompanions || [])];

    // 모든 마계 지배지에 배정된 인원 ID 수집
    const assignedIds = new Set<string>();
    Object.values(character.magyeDominions || {}).forEach(dom => {
        if (dom.personnel) {
            if (dom.personnel.tormentorId) assignedIds.add(dom.personnel.tormentorId);
            dom.personnel.overseerIds.forEach(id => assignedIds.add(id));
            dom.personnel.executionerIds.forEach(id => assignedIds.add(id));
        }
    });

    const isCompanionBusy = (compId: string) => {
        // 1. 일반 파견 확인
        const isBaseDispatched = character.base?.dispatched?.some(m => m.companionId === compId);
        // 2. 기존 시설 배치 및 마계 인사 배치 확인 (assignments 필드 기준)
        const isAssigned = Object.values(character.base?.assignments || {}).includes(compId);
        // 3. 현재 열려있는 마계 인사 리스트 내 확인
        const isAlreadyInMagye = assignedIds.has(compId);
        
        return isBaseDispatched || isAssigned || isAlreadyInMagye;
    };

    const handleAssign = (compId: string) => {
        if (!selectedRole) return;
        const member = allComps.find(c => c.id === compId);
        if (!member) return;

        const roleCfg = MAGYE_ROLES.find(r => r.id === selectedRole)!;
        const currentCount = selectedRole === 'tormentor' ? (personnel.tormentorId ? 1 : 0) :
                           selectedRole === 'executioner' ? personnel.executionerIds.length :
                           personnel.overseerIds.length;

        if (currentCount >= roleCfg.max) {
            alert("정원이 가득 찼습니다.");
            return;
        }

        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        if (!newChar.magyeDominions) newChar.magyeDominions = {};
        if (!newChar.magyeDominions[city]) newChar.magyeDominions[city] = JSON.parse(JSON.stringify(dominion));
        if (!newChar.magyeDominions[city].personnel) newChar.magyeDominions[city].personnel = { overseerIds: [], executionerIds: [] };

        const targetDom = newChar.magyeDominions[city];
        if (selectedRole === 'tormentor') targetDom.personnel!.tormentorId = compId;
        else if (selectedRole === 'executioner') targetDom.personnel!.executionerIds.push(compId);
        else targetDom.personnel!.overseerIds.push(compId);

        // [CORE] 전역 assignments에 등록하여 'Busy' 상태로 만듦
        if (!newChar.base) newChar.base = { ...INITIAL_BASE };
        if (!newChar.base.assignments) newChar.base.assignments = {};
        newChar.base.assignments[`magye_${city}_${selectedRole}_${compId}`] = compId;

        // 이동 처리 (파티 -> 기지)
        const activeIdx = newChar.companions.findIndex(c => c.id === compId);
        if (activeIdx !== -1) {
            const [removed] = newChar.companions.splice(activeIdx, 1);
            if (!newChar.inactiveCompanions) newChar.inactiveCompanions = [];
            newChar.inactiveCompanions.push(removed);
        }

        onUpdateCharacter(newChar, `[마계 인사] ${member.name}을(를) ${city}의 ${roleCfg.label}(으)로 임명했습니다. 해당 대원은 이제 성전 업무에 전념합니다.`);
        setResultData({
            type: 'success',
            title: '보직 임명 완료',
            message: `${member.name}이(가) ${city} 지배를 위한 핵심 보직을 맡게 되었습니다. 업무 중에는 파티 합류가 제한됩니다.`,
            items: [{ label: '임명 보직', after: roleCfg.label }]
        });
        setSelectedRole(null);
    };

    const handleDismiss = (roleId: string, compId: string) => {
        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        const targetDom = newChar.magyeDominions?.[city];
        if (!targetDom || !targetDom.personnel) return;

        if (roleId === 'tormentor') targetDom.personnel.tormentorId = undefined;
        else if (roleId === 'executioner') targetDom.personnel.executionerIds = targetDom.personnel.executionerIds.filter(id => id !== compId);
        else targetDom.personnel.overseerIds = targetDom.personnel.overseerIds.filter(id => id !== compId);

        // [CORE] 전역 assignments에서 삭제하여 'Busy' 상태 해제
        if (newChar.base?.assignments) {
            delete newChar.base.assignments[`magye_${city}_${roleId}_${compId}`];
        }

        const memberName = allComps.find(c => c.id === compId)?.name || '대원';
        onUpdateCharacter(newChar, `[마계 인사] ${memberName}을(를) 보직에서 해임했습니다. 이제 다시 파티에 합류할 수 있습니다.`);
        setResultData({ type: 'info', title: '보직 해임', message: '인사 이동이 완료되었습니다.', items: [{ label: '해방 대상', after: memberName }] });
    };

    const sortedComps = [...allComps].sort((a, b) => {
        if (personnelSort === 'levelDesc') return (b.level || 0) - (a.level || 0);
        if (personnelSort === 'levelAsc') return (a.level || 0) - (b.level || 0);
        if (personnelSort === 'nameAsc') return a.name.localeCompare(b.name, 'ko');
        if (personnelSort === 'powerDesc') {
            const pA = (a.stats?.str || 0) + (a.stats?.int || 0) + (a.stats?.maxHp || 0);
            const pB = (b.stats?.str || 0) + (b.stats?.int || 0) + (b.stats?.maxHp || 0);
            return pB - pA;
        }
        if (personnelSort === 'element') return (a.shinryokuType || '').localeCompare(b.shinryokuType || '', 'ko');
        return 0;
    });

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}

            {selectedRole && (
                <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 md:p-4">
                    <div className="bg-slate-900 border border-red-500/80 rounded-3xl p-4 md:p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[85vh]">
                        <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-800">
                            <div>
                                <h3 className="font-bold text-red-100 text-base md:text-lg flex items-center gap-2">
                                    <span>대원 선발:</span>
                                    <span className="text-red-400">{MAGYE_ROLES.find(r => r.id === selectedRole)?.label}</span>
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">지배지에 배치할 최적의 대원을 선택하십시오.</p>
                            </div>
                            <button onClick={() => setSelectedRole(null)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                                <X size={20}/>
                            </button>
                        </div>

                        {/* 정렬 드롭다운 */}
                        <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-3">
                            <span className="text-xs font-bold text-slate-300">보유 대원: {allComps.length}명</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-400">정렬:</span>
                                <select
                                    value={personnelSort}
                                    onChange={(e) => setPersonnelSort(e.target.value as any)}
                                    className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2 py-1 outline-none focus:border-red-500"
                                >
                                    <option value="levelDesc">레벨 높은순</option>
                                    <option value="levelAsc">레벨 낮은순</option>
                                    <option value="powerDesc">전투력 높은순</option>
                                    <option value="nameAsc">이름순</option>
                                    <option value="element">신력 속성순</option>
                                </select>
                            </div>
                        </div>

                        {/* 동료 목록 */}
                        <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1 min-h-[180px] max-h-[320px]">
                            {sortedComps.map(c => {
                                const busy = isCompanionBusy(c.id);
                                return (
                                    <button
                                        key={c.id}
                                        disabled={busy || c.isDead}
                                        onClick={() => handleAssign(c.id)}
                                        className={`w-full p-3 rounded-xl border text-left flex justify-between items-center transition-all ${
                                            !busy && !c.isDead
                                                ? 'bg-slate-800/90 border-slate-700 hover:border-red-500 hover:bg-slate-800 cursor-pointer shadow-sm active:scale-[0.99]' 
                                                : 'opacity-35 grayscale cursor-not-allowed border-slate-900 bg-slate-950/40'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {c.visualUrl ? (
                                                <img src={c.visualUrl} alt={c.name} className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 text-slate-500 text-sm">
                                                    👤
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-bold text-slate-100 truncate">{c.name}</span>
                                                    <span className="text-xs font-semibold text-amber-400">Lv.{c.level || 1}</span>
                                                </div>
                                                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                                    {(c as any).combatClass || c.classType || c.job || '전사'} {c.shinryokuType ? `• ${c.shinryokuType}` : ''}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="shrink-0 flex flex-col items-end gap-1 ml-2">
                                            {!busy && !c.isDead ? (
                                                <span className="text-xs px-2.5 py-1 rounded-md bg-red-800 hover:bg-red-700 text-white font-bold shadow-sm">
                                                    선발
                                                </span>
                                            ) : (
                                                <>
                                                    {busy && <span className="text-[10px] bg-red-950 border border-red-800/60 text-red-400 px-1.5 py-0.5 rounded">업무 중</span>}
                                                    {c.isDead && <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-500 px-1.5 py-0.5 rounded">사망</span>}
                                                </>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                            {sortedComps.length === 0 && (
                                <p className="text-xs text-slate-500 text-center py-8">선발 가능한 대원이 없습니다.</p>
                            )}
                        </div>
                        <button onClick={() => setSelectedRole(null)} className="w-full mt-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors">
                            취소
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-slate-950 border-2 border-red-600 w-full max-w-3xl h-[82vh] md:h-[80vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
                <div className="p-5 md:p-6 border-b border-red-900/50 bg-red-950/20 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-red-950 rounded-2xl border border-red-800 shadow-md">
                            <TowerControl className="text-red-500" size={26}/>
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-white font-cinzel tracking-wider">{city} 인사 통제실</h2>
                            <p className="text-xs text-red-400 mt-0.5">지배의 효율을 높일 핵심 인력을 배치하십시오.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"><X size={24}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
                    {MAGYE_ROLES.map(role => {
                        let assignedIdsList: string[] = [];
                        if (role.id === 'tormentor') assignedIdsList = personnel.tormentorId ? [personnel.tormentorId] : [];
                        else if (role.id === 'executioner') assignedIdsList = personnel.executionerIds;
                        else assignedIdsList = personnel.overseerIds;

                        return (
                            <div key={role.id} className="bg-slate-900 p-4 md:p-5 rounded-3xl border border-slate-800 space-y-4 shadow-lg">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`p-3 rounded-2xl bg-black/40 border border-white/5 shrink-0 ${role.color}`}>
                                            <role.icon size={22}/>
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className={`font-bold text-base md:text-lg ${role.color}`}>{role.label}</h4>
                                            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{role.desc}</p>
                                        </div>
                                    </div>
                                    {assignedIdsList.length < role.max && (
                                        <button 
                                            onClick={() => setSelectedRole(role.id)}
                                            className="p-2 bg-red-900/40 text-red-300 rounded-xl border border-red-700/60 hover:bg-red-800 hover:text-white transition-all shrink-0 active:scale-95"
                                        >
                                            <UserPlus size={20}/>
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {assignedIdsList.map(id => {
                                        const comp = allComps.find(c => c.id === id);
                                        return (
                                            <div key={id} className="flex justify-between items-center p-2.5 bg-black/50 rounded-xl border border-white/5 group shadow-sm">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    {comp?.visualUrl ? (
                                                        <img src={comp.visualUrl} alt={comp.name} className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs shrink-0">👤</div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold text-white truncate">{comp?.name}</div>
                                                        <div className="text-[10px] text-slate-400">Lv.{comp?.level || 1}</div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleDismiss(role.id, id)}
                                                    className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                                                    title="해임"
                                                >
                                                    <UserMinus size={16}/>
                                                </button>
                                            </div>
                                        );
                                    })}
                                    {assignedIdsList.length === 0 && (
                                        <div className="col-span-1 md:col-span-2 py-3 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800/60">
                                            <p className="text-xs text-slate-500">배치된 인원이 없습니다.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 md:p-5 bg-slate-950 border-t border-purple-900/50 flex justify-end items-center shrink-0">
                    <button onClick={onClose} className="px-8 py-2.5 bg-red-800 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95">
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MagyePersonnelModal;
