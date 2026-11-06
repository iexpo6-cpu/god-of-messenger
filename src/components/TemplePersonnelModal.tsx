
import React, { useState, useEffect } from 'react';
import { Character, Companion, TemplePersonnel, ClassTier, Stats } from '../types';
import { X, Users, UserPlus, UserMinus, Shield, Star, Crown, Heart, Info, CheckCircle, AlertTriangle, MessageCircle, Gem, TrendingUp, Lock, Flame, ShieldAlert, ShieldCheck, TowerControl, Sparkles } from 'lucide-react';
import { TEMPLE_ROLES, TempleRole, checkTempleEligibility, checkRoleGender } from '../divinerealmpersonnel';
import { TEMPLE_MESSENGER_MAP, INITIAL_BASE } from '../constants';
import { DIVINE_MESSENGER_CONFIG } from '../awakening';
import ActionResultModal, { ResultData } from './ActionResultModal';
import DivineResourceModal from './DivineResourceModal';
import DivineRitualModal from './DivineRitualModal'; 
import TempleDefenseModal from './TempleDefenseModal'; 
import { getYear } from '../utils';
import { calculateTempleMajesty } from '../templedefensesystem';

interface Props {
    character: Character;
    templeCity: string;
    templeLevel: number; 
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const TemplePersonnelModal: React.FC<Props> = ({ character, templeCity, templeLevel, onClose, onUpdateCharacter }) => {
    const [selectedRole, setSelectedRole] = useState<TempleRole | null>(null);
    const [showOnlyEligible, setShowOnlyEligible] = useState<boolean>(true);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
    const [isRitualModalOpen, setIsRitualModalOpen] = useState(false); 
    const [isDefenseModalOpen, setIsDefenseModalOpen] = useState(false); 

    const loc = character.currentLocation || { region: '신계', nation: '신의 성소', city: templeCity };
    const templeKey = `${loc.nation}_${templeCity}`;
    
    const personnel: TemplePersonnel = character.base?.templePersonnel?.[templeKey] || {
        knightIds: [], butlerIds: [], maidIds: []
    };

    const allComps = [...character.companions, ...(character.inactiveCompanions || [])];
    
    const assignedIds = new Set<string>();
    (Object.values(character.base?.templePersonnel || {}) as TemplePersonnel[]).forEach(tp => {
        if (tp.priestId) assignedIds.add(tp.priestId);
        if (tp.subPriestId) assignedIds.add(tp.subPriestId);
        tp.knightIds.forEach(id => assignedIds.add(id));
        tp.butlerIds.forEach(id => assignedIds.add(id));
        tp.maidIds.forEach(id => assignedIds.add(id));
    });

    // [MODIFIED] 연간 안보 체크 로직: 중앙화된 위엄도 계산 로직 통합 반영
    useEffect(() => {
        const currentYear = getYear(character.currentDate || '2000-01-01');
        const lastCheckYear = character.base?.lastSecurityCheckYear || 0;

        if (currentYear > lastCheckYear && character.base) {
            const newChar = { ...character };
            newChar.base = { ...newChar.base!, lastSecurityCheckYear: currentYear };

            // 1. 중앙화된 함수를 사용하여 위엄도 계산
            const totalMajesty = calculateTempleMajesty(character, templeKey);

            // 2. 방어 점수 및 안보 체크
            let defenseScore = 0;
            const targetDefense = templeLevel * 500000; 
            
            const getStatsSum = (id: string) => {
                const c = allComps.find(comp => comp.id === id);
                if (!c) return 0;
                return c.stats.str + c.stats.int + c.stats.wis + c.stats.def + c.stats.agi + c.stats.ctrl;
            };

            personnel.knightIds.forEach(id => defenseScore += getStatsSum(id) * 1.5);
            personnel.butlerIds.forEach(id => defenseScore += getStatsSum(id) * 1.0);
            personnel.maidIds.forEach(id => defenseScore += getStatsSum(id) * 1.0);

            const anxiety = Math.min(100, Math.max(0, 100 - (defenseScore / (targetDefense || 1) * 100)));

            // 위엄도 10,000 초과 시 자동 통과
            if (totalMajesty > 10000) {
                onUpdateCharacter(newChar, `[성전 안보 점검] 위엄이 하늘을 찔러 평화로운 한 해를 보냈습니다.`);
                return;
            }

            if (anxiety > 30) {
                const faithLoss = Math.floor((character.faith || 0) * (anxiety / 100) * 0.5);
                if (faithLoss > 0) {
                    newChar.faith = Math.max(0, (newChar.faith || 0) - faithLoss);
                    
                    onUpdateCharacter(newChar, `[성전 안보 위기] ${currentYear}년도 안보 점검 결과, 성전의 불안감이 높아 신앙심이 ${faithLoss}만큼 하락했습니다.`);
                    
                    setResultData({
                        type: 'warning',
                        title: '성전 안보 위기',
                        message: `성전의 방어 체계가 부실하여 신도들이 불안에 떨고 있습니다.\n${currentYear}년도 안보 점검 결과, 대규모 신앙심 이탈이 발생했습니다.`,
                        items: [
                            { label: '성전 불안감', after: `${anxiety.toFixed(1)}%` },
                            { label: '신앙심 손실', after: `-${faithLoss}` },
                            { label: '현재 방어력', after: `${Math.floor(defenseScore)} / 목표 ${targetDefense}` }
                        ]
                    });
                    return; 
                }
            }
            
            onUpdateCharacter(newChar, "");
        }
    }, [character.currentDate, character.base?.lastSecurityCheckYear]);

    const isCompanionDispatched = (compId: string) => {
        const isBaseDispatched = character.base?.dispatched?.some(m => m.companionId === compId);
        const isGroupDispatched = character.mercenaryData?.groupMissions?.some(m => m.memberIds.includes(compId));
        const isAssigned = Object.values(character.base?.assignments || {}).includes(compId);
        return isBaseDispatched || isGroupDispatched || assignedIds.has(compId) || isAssigned;
    };

    const handleAssign = (compId: string) => {
        if (!selectedRole) return;
        const member = allComps.find(c => c.id === compId);
        if (!member) return;

        const { allowed, reason } = checkTempleEligibility(member, templeCity);
        if (!allowed) {
            alert(reason);
            return;
        }

        if (!checkRoleGender(member, selectedRole)) {
            alert(selectedRole === 'Butler' ? "집사 보직은 남성 대원만 가능합니다." : "메이드 보직은 여성 대원만 가능합니다.");
            return;
        }

        const roleCfg = TEMPLE_ROLES.find(r => r.id === selectedRole)!;
        
        let maxQuota = roleCfg.max;
        if (selectedRole === 'Knight' && templeLevel === 1) {
            maxQuota = 1; 
        }

        let currentCount = 0;
        if (selectedRole === 'Priest') currentCount = personnel.priestId ? 1 : 0;
        else if (selectedRole === 'SubPriest') currentCount = personnel.subPriestId ? 1 : 0;
        else if (selectedRole === 'Knight') currentCount = personnel.knightIds.length;
        else if (selectedRole === 'Butler') currentCount = personnel.butlerIds.length;
        else if (selectedRole === 'Maid') currentCount = personnel.maidIds.length;

        if (currentCount >= maxQuota) {
            alert(`해당 보직의 정원이 가득 찼습니다. (현재 집무실 레벨 정원: ${maxQuota}명)`);
            return;
        }

        const baseData = character.base ? { ...character.base } : { ...INITIAL_BASE };

        const newChar: Character = { 
            ...character,
            companions: [...character.companions],
            inactiveCompanions: character.inactiveCompanions ? [...character.inactiveCompanions] : [],
            base: { 
                ...baseData,
                templePersonnel: { ...(baseData.templePersonnel || {}) },
                assignments: { ...(baseData.assignments || {}) }
            }
        };

        const newTP: TemplePersonnel = { 
            ...personnel,
            knightIds: [...personnel.knightIds],
            butlerIds: [...personnel.butlerIds],
            maidIds: [...personnel.maidIds]
        };

        if (selectedRole === 'Priest') {
            newTP.priestId = compId;
            newTP.priestAssignmentDate = character.currentDate;
        }
        else if (selectedRole === 'SubPriest') newTP.subPriestId = compId;
        else if (selectedRole === 'Knight') newTP.knightIds.push(compId);
        else if (selectedRole === 'Butler') newTP.butlerIds.push(compId);
        else if (selectedRole === 'Maid') newTP.maidIds.push(compId);

        newChar.base!.templePersonnel![templeKey] = newTP;
        newChar.base!.assignments[`temple_${templeKey}_${selectedRole}_${compId}`] = compId;

        const activeIdx = newChar.companions.findIndex(c => c.id === compId);
        if (activeIdx !== -1) {
            const [removed] = newChar.companions.splice(activeIdx, 1);
            newChar.inactiveCompanions!.push(removed);
        }

        onUpdateCharacter(newChar, `[성전 인사] ${member.name}을(를) ${roleCfg.label}(으)로 임명했습니다.`);
        
        setResultData({
            type: 'success',
            title: '인사 발령 완료',
            message: `${member.name} 대원이 성전의 '${roleCfg.label}' 보직을 맡게 되었습니다.`,
            items: [{ label: '임명 보직', after: roleCfg.label }]
        });
        setSelectedRole(null);
    };

    const handleDismiss = (role: TempleRole, compId: string) => {
        if (!character.base?.templePersonnel) return;

        const newChar: Character = { 
            ...character,
            base: { 
                ...character.base,
                templePersonnel: { ...(character.base.templePersonnel || {}) },
                assignments: { ...(character.base.assignments || {}) }
            } 
        };
        
        const currentTP = newChar.base!.templePersonnel![templeKey];
        if (!currentTP) return;

        const newTP: TemplePersonnel = { 
            ...currentTP,
            knightIds: [...(currentTP.knightIds || [])],
            butlerIds: [...(currentTP.butlerIds || [])],
            maidIds: [...(currentTP.maidIds || [])]
        };

        if (role === 'Priest') {
            newTP.priestId = undefined;
            newTP.priestAssignmentDate = undefined;
        }
        else if (role === 'SubPriest') newTP.subPriestId = undefined;
        else if (role === 'Knight') newTP.knightIds = newTP.knightIds.filter(id => id !== compId);
        else if (role === 'Butler') newTP.butlerIds = newTP.butlerIds.filter(id => id !== compId);
        else if (role === 'Maid') newTP.maidIds = newTP.maidIds.filter(id => id !== compId);

        newChar.base!.templePersonnel![templeKey] = newTP;
        delete newChar.base!.assignments[`temple_${templeKey}_${role}_${compId}`];

        const member = allComps.find(c => c.id === compId);
        onUpdateCharacter(newChar, `[성전 인사] ${member?.name || '대원'}을(를) 보직에서 해임했습니다.`);
        
        setResultData({
            type: 'info',
            title: '보직 해임',
            message: '성전 인사 이동이 완료되었습니다.',
            items: [{ label: '해임 대상', after: member?.name || '동료' }]
        });
    };

    const renderRoleSection = (role: typeof TEMPLE_ROLES[0]) => {
        const isLocked = templeLevel < role.minLevel;
        let assignedList: string[] = [];
        if (role.id === 'Priest') assignedList = personnel.priestId ? [personnel.priestId] : [];
        else if (role.id === 'SubPriest') assignedList = personnel.subPriestId ? [personnel.subPriestId] : [];
        else if (role.id === 'Knight') assignedList = personnel.knightIds || [];
        else if (role.id === 'Butler') assignedList = personnel.butlerIds || [];
        else if (role.id === 'Maid') assignedList = personnel.maidIds || [];

        const dynamicMax = (role.id === 'Knight' && templeLevel === 1) ? 1 : role.max;

        return (
            <div key={role.id} className={`bg-slate-950 p-4 rounded-2xl border transition-all ${isLocked ? 'border-slate-800 opacity-50' : 'border-slate-800'} space-y-4 relative overflow-hidden`}>
                {isLocked && (
                    <div className="absolute inset-0 bg-black/40 z-10 flex flex-col items-center justify-center backdrop-blur-[1px]">
                        <Lock size={20} className="text-slate-600 mb-1"/>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">집무실 Lv.{role.minLevel} 필요</span>
                    </div>
                )}
                
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className={`font-bold flex items-center ${isLocked ? 'text-slate-600' : 'text-indigo-400'}`}>
                            {role.label} 
                            {!isLocked && (
                                <span className="ml-2 text-[10px] text-slate-500 font-mono">
                                    ({assignedList.length} / {dynamicMax === 999 ? '∞' : dynamicMax})
                                </span>
                            )}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{role.effectDesc}</p>
                        {role.id === 'Butler' && !isLocked && (
                            <p className="text-[9px] text-blue-400 mt-1 flex items-center gap-1"><Shield size={10}/> 접견실 전투 시 플레이어 능력치 +15%</p>
                        )}
                        {role.id === 'Maid' && !isLocked && (
                            <p className="text-[9px] text-pink-400 mt-1 flex items-center gap-1"><Sparkles size={10}/> 접견실 교류 신앙심 2배 & 영입 성공률 +20%</p>
                        )}
                    </div>
                    {!isLocked && assignedList.length < dynamicMax && (
                        <button 
                            onClick={() => setSelectedRole(role.id)}
                            className="p-1.5 bg-indigo-900/30 text-indigo-400 rounded border border-indigo-700 hover:bg-indigo-800 transition-colors"
                            title="배치하기"
                        >
                            <UserPlus size={14}/>
                        </button>
                    )}
                </div>

                <div className="space-y-2">
                    {assignedList.map(mid => {
                        const m = allComps.find(c => c.id === mid);
                        return (
                            <div key={mid} className="flex justify-between items-center p-2 bg-slate-900 rounded-lg border border-slate-800 group hover:border-red-500/50 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                                        <Users size={16} className="text-slate-500"/>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-200">{m?.name || "알 수 없음"}</div>
                                        <div className="text-[9px] text-slate-500">Lv.{m?.level} • {m?.shinryokuType}</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleDismiss(role.id, mid)}
                                    className="p-1.5 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="해임하기"
                                >
                                    <UserMinus size={14}/>
                                </button>
                            </div>
                        );
                    })}
                    {assignedList.length === 0 && !isLocked && <p className="text-[10px] text-slate-700 italic text-center py-2">공석</p>}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => { setResultData(null); onClose(); }} />}
            {isResourceModalOpen && (
                <DivineResourceModal 
                    character={character} 
                    templeCity={templeCity} 
                    onClose={() => setIsResourceModalOpen(false)} 
                    onUpdateCharacter={onUpdateCharacter} 
                />
            )}
            {isRitualModalOpen && (
                <DivineRitualModal 
                    character={character} 
                    templeCity={templeCity} 
                    onClose={() => setIsRitualModalOpen(false)} 
                    onUpdateCharacter={onUpdateCharacter} 
                />
            )}
            {isDefenseModalOpen && (
                <TempleDefenseModal
                    character={character}
                    templeCity={templeCity}
                    templeLevel={templeLevel}
                    onClose={() => setIsDefenseModalOpen(false)}
                />
            )}

            {selectedRole && (() => {
                const messengerJob = TEMPLE_MESSENGER_MAP[templeCity];
                const messengerConfig = Object.values(DIVINE_MESSENGER_CONFIG).find(c => c.jobType === messengerJob);
                const requiredElement = messengerConfig?.elements[0];
                const roleConfig = TEMPLE_ROLES.find(r => r.id === selectedRole);

                const eligibleComps = allComps.filter(c => {
                    const busy = isCompanionDispatched(c.id);
                    const { allowed } = checkTempleEligibility(c, templeCity);
                    const genderOk = checkRoleGender(c, selectedRole);
                    return allowed && !busy && genderOk;
                });

                const displayComps = showOnlyEligible ? eligibleComps : allComps;

                return (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 md:p-4">
                        <div className="bg-slate-900 border border-indigo-500/80 rounded-2xl p-4 md:p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[85vh]">
                            <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-800">
                                <div>
                                    <h3 className="font-bold text-white text-base md:text-lg flex items-center gap-2">
                                        <span>인원 선발:</span>
                                        <span className="text-indigo-400">{roleConfig?.label}</span>
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                        {requiredElement && (
                                            <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 font-medium">
                                                요구 신력: {requiredElement}
                                            </span>
                                        )}
                                        {selectedRole === 'Butler' && (
                                            <span className="text-[11px] px-2 py-0.5 rounded bg-blue-950/80 border border-blue-700/60 text-blue-300 font-medium">
                                                남성 전용
                                            </span>
                                        )}
                                        {selectedRole === 'Maid' && (
                                            <span className="text-[11px] px-2 py-0.5 rounded bg-rose-950/80 border border-rose-700/60 text-rose-300 font-medium">
                                                여성 전용
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedRole(null)} 
                                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* 필터 탭 */}
                            <div className="flex gap-2 mb-3">
                                <button
                                    onClick={() => setShowOnlyEligible(true)}
                                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                                        showOnlyEligible
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                            : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
                                    }`}
                                >
                                    배치 가능만 ({eligibleComps.length}명)
                                </button>
                                <button
                                    onClick={() => setShowOnlyEligible(false)}
                                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                                        !showOnlyEligible
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                            : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
                                    }`}
                                >
                                    전체 동료 ({allComps.length}명)
                                </button>
                            </div>

                            {/* 동료 목록 */}
                            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1 min-h-[160px] max-h-[340px]">
                                {displayComps.map(c => {
                                    const busy = isCompanionDispatched(c.id);
                                    const { allowed, reason } = checkTempleEligibility(c, templeCity);
                                    const genderOk = checkRoleGender(c, selectedRole);
                                    const isTarget = allowed && !busy && genderOk;

                                    return (
                                        <button
                                            key={c.id}
                                            disabled={!isTarget}
                                            onClick={() => handleAssign(c.id)}
                                            className={`w-full p-3 rounded-xl border text-left flex justify-between items-center transition-all ${
                                                isTarget 
                                                    ? 'bg-slate-800/90 border-slate-700 hover:border-indigo-500 hover:bg-slate-800 cursor-pointer shadow-sm active:scale-[0.99]' 
                                                    : 'opacity-35 grayscale cursor-not-allowed border-slate-900 bg-slate-950/40'
                                            }`}
                                        >
                                            <div className="flex-1 min-w-0 mr-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-bold text-slate-100 truncate">{c.name}</span>
                                                    <span className="text-[11px] font-semibold text-amber-400">Lv.{c.level || 1}</span>
                                                </div>
                                                <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-2 mt-0.5">
                                                    <span>{c.gender}</span>
                                                    <span>•</span>
                                                    <span className={c.shinryokuType === requiredElement ? 'text-indigo-300 font-semibold' : 'text-slate-400'}>
                                                        신력: {c.shinryokuType || '무속성'}
                                                    </span>
                                                    {c.combatClass && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-slate-300">{c.combatClass}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex flex-col items-end gap-1">
                                                {isTarget ? (
                                                    <span className="text-xs px-2.5 py-1 rounded-md bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold shadow-sm">
                                                        배치
                                                    </span>
                                                ) : (
                                                    <>
                                                        {busy && <span className="text-[10px] bg-red-950/80 border border-red-800/60 text-red-400 px-1.5 py-0.5 rounded">업무 중</span>}
                                                        {!allowed && !busy && <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-500 px-1.5 py-0.5 rounded" title={reason}>신력 불일치</span>}
                                                        {!genderOk && !busy && allowed && <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-500 px-1.5 py-0.5 rounded">성별 부적합</span>}
                                                    </>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}

                                {displayComps.length === 0 && (
                                    <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/30">
                                        <p className="text-sm text-slate-300 font-semibold mb-1">
                                            {showOnlyEligible ? '배치 가능한 동료가 없습니다' : '보유한 동료가 없습니다'}
                                        </p>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            {showOnlyEligible && requiredElement ? (
                                                <>해당 보직은 <span className="text-indigo-400 font-medium">[{requiredElement}]</span> 신력을 지닌 미배치 동료만 임명할 수 있습니다.</>
                                            ) : (
                                                '동료를 영입하거나 다른 임무에서 복귀시킨 후 다시 시도해 주세요.'
                                            )}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={() => setSelectedRole(null)} 
                                className="w-full mt-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                );
            })()}

            <div className="bg-slate-900 border border-indigo-500 w-full max-w-4xl h-[92vh] md:h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                <div className="p-4 md:p-6 border-b border-indigo-900/50 bg-indigo-950/20 flex flex-col md:flex-row md:justify-between md:items-center shrink-0">
                    <div className="flex items-center">
                        <Users size={24} className="text-indigo-400 mr-3 md:size-7" />
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-white font-cinzel">성전 인사관리</h2>
                            <p className="text-[10px] md:text-xs text-slate-400">집무실 레벨: <span className="text-indigo-400 font-bold">Lv.{templeLevel}</span> | 보직 관리</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mt-3 md:mt-0">
                        <button 
                            onClick={() => setIsDefenseModalOpen(true)}
                            className="px-2.5 md:px-4 py-1.5 md:py-2 bg-blue-900/40 hover:bg-blue-900/60 text-blue-400 border border-blue-500/50 rounded-xl font-bold text-[10px] md:text-xs flex items-center gap-1.5 transition-all shadow-lg"
                        >
                            <ShieldCheck size={14} className="md:size-4"/>
                            성전 안보
                        </button>
                        <button 
                            onClick={() => setIsRitualModalOpen(true)}
                            className="px-2.5 md:px-4 py-1.5 md:py-2 bg-purple-900/40 hover:bg-purple-900/60 text-purple-400 border border-purple-500/50 rounded-xl font-bold text-[10px] md:text-xs flex items-center gap-1.5 transition-all shadow-lg"
                        >
                            <Flame size={14} className="md:size-4"/>
                            신성 의식
                        </button>
                        <button 
                            onClick={() => setIsResourceModalOpen(true)}
                            className="px-2.5 md:px-4 py-1.5 md:py-2 bg-amber-900/40 hover:bg-amber-900/60 text-amber-400 border border-amber-500/50 rounded-xl font-bold text-[10px] md:text-xs flex items-center gap-1.5 transition-all shadow-lg animate-pulse"
                        >
                            <TrendingUp size={14} className="md:size-4"/>
                            자원 관리
                        </button>
                        <button onClick={onClose} className="text-slate-500 hover:text-white p-1.5 md:p-2 rounded-full hover:bg-slate-800 transition-colors ml-auto md:ml-0"><X className="w-5 h-5 md:w-6 md:h-6" /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-900 custom-scrollbar overscroll-contain">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {TEMPLE_ROLES.map(role => renderRoleSection(role))}
                    </div>

                    <div className="mt-8 bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
                        <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center uppercase tracking-widest">
                            <Info size={16} className="mr-2 text-indigo-400"/> 집무실 단계별 권한 안내
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className={`p-3 rounded-xl border ${templeLevel >= 1 ? 'border-indigo-500/30 bg-indigo-900/10' : 'border-slate-800 opacity-40'}`}>
                                <div className="text-xs font-bold text-indigo-300 mb-1">레벨 1 (초급)</div>
                                <ul className="text-[10px] text-slate-500 space-y-1">
                                    <li>• 성전 인사 시스템 해금</li>
                                    <li>• 신관 1명 선임 가능</li>
                                    <li>• 수호기사 1명 선임 가능</li>
                                </ul>
                            </div>
                            <div className={`p-3 rounded-xl border ${templeLevel >= 2 ? 'border-indigo-500/30 bg-indigo-900/10' : 'border-slate-800 opacity-40'}`}>
                                <div className="text-xs font-bold text-indigo-300 mb-1">레벨 2 (중급)</div>
                                <ul className="text-[10px] text-slate-500 space-y-1">
                                    <li>• 부사제 1명 선임 가능</li>
                                    <li>• 수호기사 2명까지 선임 가능</li>
                                    <li>• 성전 장비 관리실 해금</li>
                                </ul>
                            </div>
                            <div className={`p-3 rounded-xl border ${templeLevel >= 3 ? 'border-indigo-500/30 bg-indigo-900/10' : 'border-slate-800 opacity-40'}`}>
                                <div className="text-xs font-bold text-indigo-300 mb-1">레벨 3 (고급)</div>
                                <ul className="text-[10px] text-slate-500 space-y-1">
                                    <li>• 집사 및 메이드 선임 가능</li>
                                    <li>• 신의 권능 강화 기능 해금</li>
                                    <li>• 성전 접견실 보좌 시스템 활성화</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end shrink-0">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-sm">닫기</button>
                </div>
            </div>
        </div>
    );
};

export default TemplePersonnelModal;
