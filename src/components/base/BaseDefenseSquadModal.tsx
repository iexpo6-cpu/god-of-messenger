import React, { useState, useMemo } from 'react';
import { Character, Companion } from '../../types';
import { 
    DefenseSquad, 
    getDefenseSquads, 
    calculateSquadDefensePower, 
    calculateTotalSquadDefenseContribution, 
    calculateFinalBaseDefenseWithSquads,
    updateDefenseSquadAssignment, 
    autoAssignAllDefenseSquads, 
    clearAllDefenseSquads,
    getDispatchedCompanionIds,
    getCompanionDefenseRestriction,
    TACTICAL_ROLE_CONFIG
} from '../../services/baseDefenseSquadService';
import { calculateCombatPower } from '../../utils';
import { 
    X, Shield, ShieldAlert, Users, Sword, Crown, Zap, Plus, UserMinus, 
    Check, Sparkles, RefreshCw, Trash2, Info, ChevronRight, UserPlus, Search, Award
} from 'lucide-react';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

export const BaseDefenseSquadModal: React.FC<Props> = ({
    character,
    onClose,
    onUpdateCharacter
}) => {
    const [selectedSquadId, setSelectedSquadId] = useState<string>('squad_1');
    const [isAssigningModalOpen, setIsAssigningModalOpen] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);

    const allCompanions = useMemo(() => {
        return character.inactiveCompanions || [];
    }, [character.inactiveCompanions]);

    const dispatchedIds = useMemo(() => {
        return getDispatchedCompanionIds(character);
    }, [character]);

    const squads = useMemo(() => {
        return getDefenseSquads(character.base);
    }, [character.base]);

    const defenseSummary = useMemo(() => {
        return calculateFinalBaseDefenseWithSquads(character.base, allCompanions, dispatchedIds);
    }, [character.base, allCompanions, dispatchedIds]);

    const squadStatsSummary = useMemo(() => {
        return calculateTotalSquadDefenseContribution(character.base, allCompanions, dispatchedIds);
    }, [character.base, allCompanions, dispatchedIds]);

    const currentSquad = useMemo(() => {
        return squads.find(s => s.id === selectedSquadId) || squads[0];
    }, [squads, selectedSquadId]);

    const currentSquadStats = useMemo(() => {
        if (!currentSquad) return { totalCP: 0, defenseContribution: 0, assignedCount: 0 };
        return calculateSquadDefensePower(currentSquad, allCompanions, dispatchedIds);
    }, [currentSquad, allCompanions, dispatchedIds]);

    // 해당 동료가 다른 방어 분대에 수호 중인지 확인하는 지도
    const assignedSquadMap = useMemo(() => {
        const map: Record<string, string> = {};
        squads.forEach(sq => {
            sq.memberIds.forEach(mId => {
                map[mId] = sq.name;
            });
        });
        return map;
    }, [squads]);

    const handleOpenAssignModal = (squad: DefenseSquad) => {
        setSelectedSquadId(squad.id);
        const activeMembers = squad.memberIds.filter(id => !dispatchedIds.has(id));
        setSelectedMemberIds(activeMembers);
        setSelectedLeaderId(squad.leaderId && activeMembers.includes(squad.leaderId) ? squad.leaderId : activeMembers[0] || null);
        setIsAssigningModalOpen(true);
    };

    const handleToggleMember = (comp: Companion) => {
        const restriction = getCompanionDefenseRestriction(character, comp);
        if (restriction.isRestricted) {
            if (restriction.type === 'dispatched') {
                alert('파견 중인 동료는 방어 분대에 배치할 수 없습니다.');
            } else if (restriction.type === 'facility') {
                alert('기지 담당자로 배치된 동료는 방어 분대에 배치할 수 없습니다.');
            } else if (restriction.type === 'non_combat') {
                alert('비전투인력(농부, 광부, 연금술사, 연구원 등)은 방어 분대에 배치할 수 없습니다.');
            } else {
                alert('배치할 수 없는 동료입니다.');
            }
            return;
        }

        if (selectedMemberIds.includes(comp.id)) {
            const nextMembers = selectedMemberIds.filter(id => id !== comp.id);
            setSelectedMemberIds(nextMembers);
            if (selectedLeaderId === comp.id) {
                setSelectedLeaderId(nextMembers[0] || null);
            }
        } else {
            if (selectedMemberIds.length >= 4) {
                alert('방어 분대당 최대 4명까지만 배치할 수 있습니다.');
                return;
            }
            const nextMembers = [...selectedMemberIds, comp.id];
            setSelectedMemberIds(nextMembers);
            if (!selectedLeaderId) {
                setSelectedLeaderId(comp.id);
            }
        }
    };

    const handleSaveSquad = () => {
        const updatedChar = updateDefenseSquadAssignment(
            character,
            selectedSquadId,
            selectedMemberIds,
            selectedLeaderId
        );
        onUpdateCharacter(updatedChar, `[기지 방어소] ${currentSquad.name} 방어 분대 배치를 변경했습니다.`);
        setIsAssigningModalOpen(false);
    };

    const handleAutoAssign = () => {
        if (confirm('모든 방어 분대에 보유한 동료들을 전투력 순으로 자동 배치하시겠습니까? (파견 중인 동료 제외)')) {
            const updatedChar = autoAssignAllDefenseSquads(character);
            onUpdateCharacter(updatedChar, `[기지 방어소] 모든 기지 방어 분대에 동료들을 최적 자동 배치했습니다.`);
        }
    };

    const handleClearAll = () => {
        if (confirm('모든 방어 분대 배치를 초기화하시겠습니까?')) {
            const updatedChar = clearAllDefenseSquads(character);
            onUpdateCharacter(updatedChar, `[기지 방어소] 모든 기지 방어 분대 배치를 초기화했습니다.`);
        }
    };

    const filteredCompanionsForModal = useMemo(() => {
        let list = [...allCompanions];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(c => c.name.toLowerCase().includes(q) || (c.classType && c.classType.toLowerCase().includes(q)));
        }
        // 전투력 내림차순 정렬
        return list.sort((a, b) => calculateCombatPower(b) - calculateCombatPower(a));
    }, [allCompanions, searchQuery]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
            <div className="relative w-full max-w-4xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-indigo-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900/90 border-b border-indigo-500/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-500/50 text-indigo-400 shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                            <Shield size={22} className="animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                <span>기지 전용 방어 분대 관리</span>
                                <span className="text-[10px] sm:text-xs bg-indigo-950 text-indigo-300 border border-indigo-700/60 px-2 py-0.5 rounded-full font-semibold">
                                    기지수호대
                                </span>
                            </h2>
                            <p className="text-xs text-slate-400">동료들을 방어 분대에 배치하여 기지의 총 방어력을 대폭 강화하세요.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Top Summary Banner */}
                <div className="p-3 sm:p-5 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/60 border-b border-indigo-500/20">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
                        <div className="bg-slate-950/70 border border-indigo-500/30 p-2.5 sm:p-3 rounded-xl">
                            <span className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1 font-medium">
                                <Shield size={12} className="text-indigo-400" /> 최종 기지 방어력
                            </span>
                            <div className="text-lg sm:text-xl font-extrabold text-indigo-300 mt-1 font-mono">
                                {defenseSummary.totalBaseDefense.toLocaleString()} <span className="text-xs font-normal text-indigo-400/80">점</span>
                            </div>
                        </div>

                        <div className="bg-slate-950/70 border border-emerald-500/30 p-2.5 sm:p-3 rounded-xl">
                            <span className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1 font-medium">
                                <Sword size={12} className="text-emerald-400" /> 분대 전투력 기여
                            </span>
                            <div className="text-lg sm:text-xl font-extrabold text-emerald-400 mt-1 font-mono">
                                +{defenseSummary.squadDefenseContribution.toLocaleString()} <span className="text-xs font-normal text-emerald-500/80 font-sans">방어</span>
                            </div>
                        </div>

                        <div className="bg-slate-950/70 border border-cyan-500/30 p-2.5 sm:p-3 rounded-xl">
                            <span className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1 font-medium">
                                <Zap size={12} className="text-cyan-400" /> 분대 총 전투력
                            </span>
                            <div className="text-lg sm:text-xl font-extrabold text-cyan-300 mt-1 font-mono">
                                {squadStatsSummary.totalCP.toLocaleString()} <span className="text-xs font-normal text-cyan-400/80 font-sans">CP</span>
                            </div>
                        </div>

                        <div className="bg-slate-950/70 border border-amber-500/30 p-2.5 sm:p-3 rounded-xl">
                            <span className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1 font-medium">
                                <Users size={12} className="text-amber-400" /> 배치된 수호 동료
                            </span>
                            <div className="text-lg sm:text-xl font-extrabold text-amber-300 mt-1 font-mono">
                                {squadStatsSummary.assignedCompanionsCount} <span className="text-xs font-normal text-amber-400/80 font-sans">명</span>
                            </div>
                        </div>
                    </div>

                    {/* Controls Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                        <div className="flex items-center gap-2 text-slate-400 text-[11px] sm:text-xs">
                            <Info size={13} className="text-indigo-400 shrink-0" />
                            <span>방어 분대의 총 전투력이 기지 방어력에 합산됩니다. (파견 중인 동료는 자동 제외됩니다)</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-auto">
                            <button
                                onClick={handleAutoAssign}
                                className="px-3 py-1.5 rounded-lg bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/50 flex items-center gap-1.5 transition-all active:scale-95 font-medium shadow-sm"
                            >
                                <Sparkles size={13} className="text-indigo-300" />
                                <span>자동 최적 배치</span>
                            </button>
                            <button
                                onClick={handleClearAll}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/70 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-600/50 flex items-center gap-1.5 transition-all active:scale-95 font-medium"
                            >
                                <Trash2 size={13} />
                                <span>전체 초기화</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content Area: Squad Cards */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {squads.map((squad, idx) => {
                            const sqStats = calculateSquadDefensePower(squad, allCompanions, dispatchedIds);
                            const roleCfg = TACTICAL_ROLE_CONFIG[squad.tacticalRole] || TACTICAL_ROLE_CONFIG.FRONT_LINE;
                            const isSelected = selectedSquadId === squad.id;
                            const assignedComps = allCompanions.filter(c => squad.memberIds.includes(c.id));

                            const colorThemes = [
                                { border: 'border-amber-500/50', bg: 'from-amber-950/40 to-slate-900/90', text: 'text-amber-400', badge: 'bg-amber-950 border-amber-600 text-amber-300' },
                                { border: 'border-cyan-500/50', bg: 'from-cyan-950/40 to-slate-900/90', text: 'text-cyan-400', badge: 'bg-cyan-950 border-cyan-600 text-cyan-300' },
                                { border: 'border-rose-500/50', bg: 'from-rose-950/40 to-slate-900/90', text: 'text-rose-400', badge: 'bg-rose-950 border-rose-600 text-rose-300' },
                                { border: 'border-purple-500/50', bg: 'from-purple-950/40 to-slate-900/90', text: 'text-purple-400', badge: 'bg-purple-950 border-purple-600 text-purple-300' }
                            ];
                            const theme = colorThemes[idx % colorThemes.length];

                            return (
                                <div
                                    key={squad.id}
                                    className={`relative rounded-xl border ${theme.border} bg-gradient-to-b ${theme.bg} p-3.5 sm:p-4 transition-all flex flex-col justify-between gap-3 shadow-lg hover:border-opacity-100 ${
                                        isSelected ? 'ring-2 ring-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.25)]' : ''
                                    }`}
                                >
                                    {/* Squad Card Header */}
                                    <div className="flex items-start justify-between border-b border-slate-800/80 pb-2.5">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold text-sm sm:text-base ${theme.text}`}>
                                                    {squad.name}
                                                </span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${theme.badge}`}>
                                                    {roleCfg.name}
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                                                <span>{roleCfg.desc}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleOpenAssignModal(squad)}
                                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-md active:scale-95 shrink-0"
                                        >
                                            <UserPlus size={13} />
                                            <span>동료 배치</span>
                                        </button>
                                    </div>

                                    {/* Squad Stats Bar */}
                                    <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 text-xs font-mono">
                                        <div>
                                            <span className="text-[10px] text-slate-400 block font-sans">분대 총 전투력</span>
                                            <span className="font-bold text-cyan-300 text-sm">{sqStats.totalCP.toLocaleString()} CP</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 block font-sans">방어력 기여</span>
                                            <span className="font-bold text-emerald-400 text-sm">+{sqStats.defenseContribution.toLocaleString()} 방어</span>
                                        </div>
                                    </div>

                                    {/* Assigned Members Grid */}
                                    <div>
                                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                                            <span>배치된 분대원 ({assignedComps.length} / 4)</span>
                                            {sqStats.leaderName && (
                                                <span className="text-amber-400 flex items-center gap-1 font-semibold">
                                                    <Crown size={11} /> 분대장: {sqStats.leaderName}
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {Array.from({ length: 4 }).map((_, slotIdx) => {
                                                const comp = assignedComps[slotIdx];
                                                const isLeader = comp && squad.leaderId === comp.id;
                                                const restriction = comp ? getCompanionDefenseRestriction(character, comp) : { isRestricted: false };
                                                const isRestricted = restriction.isRestricted;
                                                const compCP = comp ? calculateCombatPower(comp) : 0;

                                                return (
                                                    <div
                                                        key={slotIdx}
                                                        onClick={() => handleOpenAssignModal(squad)}
                                                        className={`p-2 rounded-lg border flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[76px] relative group ${
                                                            comp
                                                                ? isRestricted
                                                                    ? 'bg-slate-950/60 border-rose-900/50 hover:border-rose-700/80'
                                                                    : 'bg-slate-900/90 border-indigo-500/40 hover:border-indigo-400 hover:bg-slate-800/90'
                                                                : 'bg-slate-950/40 border-slate-800/80 border-dashed hover:border-slate-600 text-slate-500'
                                                        }`}
                                                    >
                                                        {comp ? (
                                                            <>
                                                                {isLeader && !isRestricted && (
                                                                    <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 p-0.5 rounded-full shadow border border-amber-300" title="분대장">
                                                                        <Crown size={11} className="fill-slate-950" />
                                                                    </div>
                                                                )}
                                                                {isRestricted && (
                                                                    <div className="absolute -top-1.5 -right-1.5 bg-rose-900 text-rose-200 text-[9px] px-1.5 py-0.2 rounded-full font-bold border border-rose-500/60 shadow">
                                                                        {restriction.reason || '배치 불가'}
                                                                    </div>
                                                                )}
                                                                <div className={`text-xs font-bold truncate w-full px-1 ${isRestricted ? 'text-slate-400 line-through' : 'text-white'}`}>
                                                                    {comp.name}
                                                                </div>
                                                                <div className="text-[10px] text-indigo-300 truncate mt-0.5">
                                                                    Lv.{comp.level} {comp.classType || '동료'}
                                                                </div>
                                                                <div className={`text-[10px] font-mono mt-0.5 ${isRestricted ? 'text-rose-400/80 font-sans' : 'text-cyan-400'}`}>
                                                                    {isRestricted ? '배치 제외' : `${compCP.toLocaleString()} CP`}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-1 text-slate-500 group-hover:text-slate-400">
                                                                <Plus size={14} />
                                                                <span className="text-[10px]">빈 슬롯</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-4 sm:px-6 py-3 bg-slate-900/90 border-t border-indigo-500/30 flex items-center justify-between">
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Award size={14} className="text-amber-400" />
                        <span>기지 방어력은 습격 이벤트 발생 시 피해 완화율을 높여줍니다.</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-slate-600"
                    >
                        닫기
                    </button>
                </div>

            </div>

            {/* Sub-Modal: Companion Selection Drawer */}
            {isAssigningModalOpen && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4">
                    <div className="relative w-full max-w-xl bg-slate-900 border border-indigo-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95">
                        
                        {/* Drawer Header */}
                        <div className="p-4 bg-slate-950 border-b border-indigo-500/30 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                                    <span>{currentSquad.name} 동료 배치</span>
                                    <span className="text-xs font-mono text-cyan-400">({selectedMemberIds.length} / 4 명 선택됨)</span>
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">배치할 동료를 클릭하여 추가하거나 해제하세요. (파견 중인 동료는 배치 불가)</p>
                            </div>
                            <button
                                onClick={() => setIsAssigningModalOpen(false)}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Search & Leader Selector Bar */}
                        <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
                            <div className="relative w-full sm:w-1/2">
                                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="동료 이름/직업 검색..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            {/* Leader Selection Dropdown */}
                            {selectedMemberIds.length > 0 && (
                                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 text-xs">
                                    <span className="text-slate-400 flex items-center gap-1 shrink-0">
                                        <Crown size={12} className="text-amber-400" /> 분대장 지정:
                                    </span>
                                    <select
                                        value={selectedLeaderId || ''}
                                        onChange={(e) => setSelectedLeaderId(e.target.value || null)}
                                        className="bg-slate-950 border border-amber-500/50 rounded-lg px-2 py-1 text-xs text-amber-300 font-bold focus:outline-none"
                                    >
                                        {selectedMemberIds.map(id => {
                                            const comp = allCompanions.find(c => c.id === id);
                                            return (
                                                <option key={id} value={id}>
                                                    {comp?.name || '동료'}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Companions List */}
                        <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1 max-h-[50vh] custom-scrollbar">
                            {filteredCompanionsForModal.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-xs">
                                    배치할 수 있는 동료가 없습니다.
                                </div>
                            ) : (
                                    filteredCompanionsForModal.map(comp => {
                                        const isSelected = selectedMemberIds.includes(comp.id);
                                        const assignedOtherSquad = assignedSquadMap[comp.id];
                                        const isLeader = selectedLeaderId === comp.id;
                                        const restriction = getCompanionDefenseRestriction(character, comp);
                                        const isRestricted = restriction.isRestricted;
                                        const compCP = calculateCombatPower(comp);

                                        return (
                                            <div
                                                key={comp.id}
                                                onClick={() => handleToggleMember(comp)}
                                                className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                                                    isRestricted
                                                        ? 'bg-slate-950/40 border-slate-800/80 text-slate-500 opacity-60 cursor-not-allowed'
                                                        : isSelected
                                                            ? 'bg-indigo-950/70 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                                                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-indigo-500/50 hover:bg-slate-900'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                                        isSelected
                                                            ? 'bg-indigo-600 border-indigo-400 text-white'
                                                            : isRestricted
                                                                ? 'border-slate-800 bg-slate-950 text-slate-600'
                                                                : 'border-slate-700 bg-slate-900'
                                                    }`}>
                                                        {isSelected && <Check size={12} />}
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className={`font-bold text-xs ${isRestricted ? 'text-slate-400 line-through' : 'text-white'}`}>{comp.name}</span>
                                                            {isRestricted && (
                                                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${
                                                                    restriction.type === 'dispatched'
                                                                        ? 'bg-rose-950 text-rose-300 border-rose-700'
                                                                        : restriction.type === 'facility'
                                                                            ? 'bg-amber-950 text-amber-300 border-amber-700'
                                                                            : 'bg-slate-800 text-slate-300 border-slate-600'
                                                                }`}>
                                                                    {restriction.reason || '배치 불가'}
                                                                </span>
                                                            )}
                                                            {isLeader && !isRestricted && (
                                                                <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-600 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                                                                    <Crown size={10} /> 분대장
                                                                </span>
                                                            )}
                                                            {assignedOtherSquad && assignedOtherSquad !== currentSquad.name && !isRestricted && (
                                                                <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.2 rounded">
                                                                    {assignedOtherSquad} 배치중
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 mt-0.5">
                                                            Lv.{comp.level} | {comp.classType || '동료'} | {comp.job || '무직'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right font-mono">
                                                    <div className={`text-xs font-bold ${isRestricted ? 'text-slate-500' : 'text-cyan-400'}`}>{compCP.toLocaleString()} CP</div>
                                                    <div className="text-[10px] text-slate-400">전투력</div>
                                                </div>
                                            </div>
                                        );
                                    })
                            )}
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                            <span className="text-xs text-slate-400">
                                선택된 동료: <strong className="text-white">{selectedMemberIds.length}</strong> / 4명
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsAssigningModalOpen(false)}
                                    className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSaveSquad}
                                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md"
                                >
                                    저장하기
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default BaseDefenseSquadModal;

