import React, { useState } from 'react';
import { Character, Companion, ClassTier } from '../types';
import { Sparkles, Coins, HelpCircle, CheckCircle2, ChevronRight, X, AlertCircle, ArrowUpDown, UserCheck } from 'lucide-react';
import { checkAndInitializeLiberationEligibility, getCompanionCP, isMonsterCompanion } from '../services/companionGrowthService';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

type SortOption = 'unappraisedFirst' | 'appraisedFirst' | 'customFirst' | 'nonCustomFirst' | 'levelDesc' | 'levelAsc' | 'cpDesc' | 'cpAsc';

export const ProphetModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter }) => {
    const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);
    const [appraisalResult, setAppraisalResult] = useState<{
        companion: Companion;
        potential: ClassTier;
        prevAppraised: boolean;
    } | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isAppraising, setIsAppraising] = useState<boolean>(false);
    const [sortBy, setSortBy] = useState<SortOption>('unappraisedFirst');

    // Get all companions (active + inactive, excluding monsters) and initialize them so they have consistent potentials
    const activeCompanions = (character.companions || [])
        .filter(c => !isMonsterCompanion(c))
        .map(c => checkAndInitializeLiberationEligibility({ ...c }, getCompanionCP(c)));
    const inactiveCompanions = (character.inactiveCompanions || [])
        .filter(c => !isMonsterCompanion(c))
        .map(c => checkAndInitializeLiberationEligibility({ ...c }, getCompanionCP(c)));
    const allCompanions = [...activeCompanions, ...inactiveCompanions];

    const sortedCompanions = [...allCompanions].sort((a, b) => {
        if (sortBy === 'unappraisedFirst') {
            if (a.potentialAppraised !== b.potentialAppraised) return a.potentialAppraised ? 1 : -1;
        } else if (sortBy === 'appraisedFirst') {
            if (a.potentialAppraised !== b.potentialAppraised) return a.potentialAppraised ? -1 : 1;
        } else if (sortBy === 'customFirst') {
            const aCustom = !!a.isCustom;
            const bCustom = !!b.isCustom;
            if (aCustom !== bCustom) return aCustom ? -1 : 1;
        } else if (sortBy === 'nonCustomFirst') {
            const aCustom = !!a.isCustom;
            const bCustom = !!b.isCustom;
            if (aCustom !== bCustom) return aCustom ? 1 : -1;
        } else if (sortBy === 'levelDesc') {
            if (a.level !== b.level) return b.level - a.level;
        } else if (sortBy === 'levelAsc') {
            if (a.level !== b.level) return a.level - b.level;
        } else if (sortBy === 'cpDesc') {
            const cpA = getCompanionCP(a);
            const cpB = getCompanionCP(b);
            if (cpA !== cpB) return cpB - cpA;
        } else if (sortBy === 'cpAsc') {
            const cpA = getCompanionCP(a);
            const cpB = getCompanionCP(b);
            if (cpA !== cpB) return cpA - cpB;
        }
        if (a.potentialAppraised !== b.potentialAppraised) return a.potentialAppraised ? 1 : -1;
        return b.level - a.level;
    });

    const getCompanionClassName = (comp: Companion) => {
        const rawBaseClass = comp.finalClassName || comp.lastClassName || comp.secondClassName || comp.firstClassName;
        return rawBaseClass && rawBaseClass !== '미정' ? rawBaseClass : comp.classType;
    };

    const goldCost = 1000;
    const crystalCost = 5;

    const currentGold = character.money || 0;
    const currentCrystals = character.base?.resources?.manaCrystal || 0;

    const hasEnoughGold = currentGold >= goldCost;
    const hasEnoughCrystals = currentCrystals >= crystalCost;

    const handleAppraise = async (companion: Companion) => {
        if (companion.potentialAppraised) {
            setErrorMsg("이미 포텐셜이 감정된 동료입니다.");
            return;
        }

        if (!hasEnoughGold || !hasEnoughCrystals) {
            setErrorMsg("감정에 필요한 재화(골드 또는 마정석)가 부족합니다.");
            return;
        }

        setErrorMsg(null);
        setIsAppraising(true);

        // Simulate a mystical ritual animation
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Get fully initialized version to find real potential and eligibility
        const initializedComp = checkAndInitializeLiberationEligibility({ ...companion }, getCompanionCP(companion));
        const revealedPotential = initializedComp.liberationPotential || ClassTier.NONE;

        // Deduct resources
        const updatedBase = {
            ...character.base!,
            resources: {
                ...character.base!.resources,
                manaCrystal: currentCrystals - crystalCost
            }
        };

        // Helper to update companion in appropriate list, storing potential & eligibility permanently
        const updateCompanionList = (list: Companion[]) => 
            list.map(c => c.id === companion.id ? { 
                ...c, 
                potentialAppraised: true,
                liberationPotential: revealedPotential,
                liberationEligibility: initializedComp.liberationEligibility
            } : c);

        const updatedCompanions = updateCompanionList(character.companions || []);
        const updatedInactiveCompanions = updateCompanionList(character.inactiveCompanions || []);

        const updatedCharacter: Character = {
            ...character,
            money: currentGold - goldCost,
            base: updatedBase,
            companions: updatedCompanions,
            inactiveCompanions: updatedInactiveCompanions
        };

        const POTENTIAL_NAMES: Record<ClassTier, string> = {
            [ClassTier.NONE]: '해방 불가',
            [ClassTier.F]: '해방 불가',
            [ClassTier.FIRST]: '퍼스트 클래스',
            [ClassTier.SECOND]: '세컨드 클래스',
            [ClassTier.LAST]: '라스트 클래스',
            [ClassTier.FINAL]: '파이널 클래스',
            [ClassTier.BOND]: '본드 클래스'
        };

        const potentialName = POTENTIAL_NAMES[revealedPotential] || '미해방';
        const logMsg = `[운명의 예언가] 예언가 사바스가 마정석과 골드를 바쳐 ${companion.name}의 숨겨진 영혼을 꿰뚫어 보았습니다. (한계 포텐셜: ${potentialName})`;

        onUpdateCharacter(updatedCharacter, logMsg);
        setAppraisalResult({
            companion: initializedComp,
            potential: revealedPotential,
            prevAppraised: false
        });
        setIsAppraising(false);
    };

    const POTENTIAL_BADGES: Record<ClassTier, { label: string; badge: string; desc: string }> = {
        [ClassTier.NONE]: { label: '해방 불가', badge: 'bg-slate-950 border-slate-800 text-slate-500 font-bold', desc: '태생적 그릇의 깊이가 얕아 더 이상의 클래스 해방이 불가능합니다.' },
        [ClassTier.F]: { label: '해방 불가', badge: 'bg-slate-950 border-slate-800 text-slate-500 font-bold', desc: '태생적 그릇의 깊이가 얕아 더 이상의 클래스 해방이 불가능합니다.' },
        [ClassTier.FIRST]: { label: '퍼스트 클래스', badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-black shadow-sm ring-1 ring-emerald-500/20', desc: '최대 퍼스트 클래스까지 승급할 수 있는 자질을 가집니다.' },
        [ClassTier.SECOND]: { label: '세컨드 클래스', badge: 'bg-sky-500/10 border-sky-500/30 text-sky-400 font-black shadow-md ring-1 ring-sky-500/20', desc: '뛰어난 재능으로 최대 세컨드 클래스까지 승급할 수 있는 자질을 가집니다.' },
        [ClassTier.LAST]: { label: '라스트 클래스', badge: 'bg-purple-500/10 border-purple-500/30 text-purple-400 font-black shadow-lg ring-1 ring-purple-500/20', desc: '영혼이 매우 비범하여 최대 라스트 클래스까지 해방할 수 있습니다.' },
        [ClassTier.FINAL]: { label: '파이널 클래스', badge: 'bg-gradient-to-r from-teal-500/15 via-cyan-500/10 to-emerald-500/15 border-teal-500 text-teal-300 font-black shadow-xl shadow-teal-950/40 animate-pulse ring-1 ring-teal-400/30', desc: '천부적인 궁극의 재능을 가져 파이널 클래스까지 해방될 수 있습니다.' },
        [ClassTier.BOND]: { label: '본드 클래스', badge: 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-black ring-1 ring-amber-500/20', desc: '기량을 아득히 넘어선 인연의 결속 클래스에 도달할 수 있습니다.' }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto py-2 sm:py-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl h-[95vh] sm:h-[92vh] md:h-[85vh] rounded-2xl md:rounded-3xl overflow-hidden flex flex-col shadow-2xl relative my-auto shrink-0">
                
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/40 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shrink-0">
                            <Sparkles size={20} className="animate-pulse" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm md:text-lg font-black text-slate-100 truncate">운명의 예언가 사바스</h3>
                            <p className="text-[10px] md:text-xs text-slate-400 truncate">동료의 잠재된 영혼을 통찰하여 한계 클래스 포텐셜을 감정합니다.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-slate-200 shrink-0">
                        <X size={18} />
                    </button>
                </div>

                {/* Main ritual overlay */}
                {isAppraising && (
                    <div className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center space-y-6 p-4">
                        <div className="relative flex items-center justify-center">
                            <div className="w-20 h-20 md:w-24 md:h-24 border-4 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin"></div>
                            <Sparkles className="absolute text-indigo-400 animate-pulse" size={32} />
                        </div>
                        <div className="text-center space-y-2">
                            <h4 className="text-base md:text-lg font-bold text-indigo-300 animate-bounce">수정구가 공명하는 중...</h4>
                            <p className="text-[11px] md:text-xs text-slate-400 max-w-xs md:max-w-sm mx-auto leading-relaxed">
                                사바스가 영혼의 수정구를 응시하며 기도를 올립니다. 은은한 보랏빛 광채가 동료의 심장을 타고 흐릅니다...
                            </p>
                        </div>
                    </div>
                )}

                {/* Appraisal Result Overly */}
                {appraisalResult && (
                    <div className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center p-4 md:p-6 space-y-6 md:space-y-8 animate-fade-in">
                        <div className="text-center space-y-1 md:space-y-2">
                            <span className="text-[9px] md:text-[10px] font-black tracking-widest text-indigo-400">감정 완료</span>
                            <h4 className="text-xl md:text-2xl font-black text-slate-100">운명의 실타래가 풀렸습니다</h4>
                            <p className="text-[11px] md:text-xs text-slate-400">예언가 사바스가 드러난 동료의 한계를 짚어냅니다.</p>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-2xl w-full max-w-md text-center space-y-4 shadow-xl mx-4">
                            <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                                    {appraisalResult.companion.isCustom && (
                                        <span className="text-[10px] bg-purple-950/80 border border-purple-500/40 text-purple-300 px-1.5 py-0.5 rounded font-bold">
                                            커스텀
                                        </span>
                                    )}
                                    <span className="text-base md:text-lg font-black text-slate-200">{appraisalResult.companion.name}</span>
                                </div>
                                <span className="text-[11px] md:text-xs text-indigo-400">{getCompanionClassName(appraisalResult.companion)} (레벨 {appraisalResult.companion.level})</span>
                            </div>

                            <div className="py-3 md:py-4 border-t border-b border-slate-800/80">
                                <span className="text-[9px] md:text-[10px] text-slate-500 font-bold block mb-1.5 md:mb-2">통찰된 한계 포텐셜</span>
                                <span className={`text-xs md:text-sm font-black px-3.5 md:px-4 py-1.5 rounded-full border shadow-md inline-block ${POTENTIAL_BADGES[appraisalResult.potential]?.badge}`}>
                                    {POTENTIAL_BADGES[appraisalResult.potential]?.label}
                                </span>
                            </div>

                            <p className="text-[11px] md:text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                                {POTENTIAL_BADGES[appraisalResult.potential]?.desc}
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                setAppraisalResult(null);
                                setSelectedCompanion(null);
                            }}
                            className="px-6 md:px-8 py-2.5 md:py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs md:text-sm rounded-xl transition-all shadow-lg shadow-indigo-900/30 active:scale-95 min-h-[44px]"
                        >
                            예언의 방으로 돌아가기
                        </button>
                    </div>
                )}

                {/* Main Content Pane */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    
                    {/* Left Pane: Companion List */}
                    <div className={`w-full md:w-1/2 border-slate-800 md:border-r flex flex-col h-full overflow-hidden ${selectedCompanion ? 'hidden md:flex' : 'flex'}`}>
                        <div className="p-3 md:p-4 border-b border-slate-800/60 bg-slate-950/20 flex flex-wrap justify-between items-center gap-2 shrink-0">
                            <span className="text-xs font-bold text-slate-400">길드 동료 명단 ({sortedCompanions.length}명)</span>
                            <div className="flex items-center gap-1">
                                <ArrowUpDown size={12} className="text-indigo-400 shrink-0" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                                    className="bg-slate-900 border border-slate-700 text-indigo-300 text-[11px] md:text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                                >
                                    <option value="unappraisedFirst">미감정 동료 우선</option>
                                    <option value="appraisedFirst">감정 완료 동료 우선</option>
                                    <option value="customFirst">커스텀 동료 우선</option>
                                    <option value="nonCustomFirst">일반 동료 우선</option>
                                    <option value="levelDesc">레벨 높은순</option>
                                    <option value="levelAsc">레벨 낮은순</option>
                                    <option value="cpDesc">전투력 높은순</option>
                                    <option value="cpAsc">전투력 낮은순</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 custom-scrollbar">
                            {sortedCompanions.length === 0 ? (
                                <div className="p-6 text-center text-xs text-slate-500">
                                    등록된 동료가 없습니다.
                                </div>
                            ) : (
                                sortedCompanions.map((comp) => {
                                    const isSelected = selectedCompanion?.id === comp.id;
                                    const companionCP = getCompanionCP(comp);
                                    return (
                                        <button
                                            key={comp.id}
                                            onClick={() => {
                                                setSelectedCompanion(comp);
                                                setErrorMsg(null);
                                            }}
                                            className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between group min-h-[52px] ${
                                                isSelected 
                                                    ? 'bg-indigo-950/30 border-indigo-500/80 shadow-md shadow-indigo-950/40' 
                                                    : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/40 hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex flex-col gap-1 min-w-0 pr-2">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {comp.isCustom && (
                                                        <span className="text-[9px] bg-purple-950 border border-purple-500/40 text-purple-300 px-1 py-0.2 rounded font-bold shrink-0">
                                                            커스텀
                                                        </span>
                                                    )}
                                                    <span className={`font-black text-xs md:text-sm transition-colors truncate max-w-[120px] sm:max-w-none ${isSelected ? 'text-indigo-400' : 'text-slate-200 group-hover:text-slate-100'}`}>
                                                        {comp.name}
                                                    </span>
                                                    <span className="text-[9px] md:text-[10px] text-slate-500 font-bold shrink-0">Lv.{comp.level}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] md:text-xs text-slate-400 truncate">
                                                    <span className="truncate">{getCompanionClassName(comp)}</span>
                                                    <span className="text-[10px] text-amber-400/80 font-mono shrink-0">⚔️ {companionCP.toLocaleString()}</span>
                                                </div>
                                            </div>

                                            <div className="shrink-0">
                                                {comp.potentialAppraised ? (
                                                    <span className="text-[9px] md:text-[10px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-950/30 border border-emerald-800/60 px-1.5 md:px-2 py-0.5 rounded-md">
                                                        <CheckCircle2 size={10} className="md:w-[12px] md:h-[12px]" /> 감정 완료
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] md:text-[10px] font-bold text-amber-300 flex items-center gap-1 bg-amber-950/40 border border-amber-600/40 px-1.5 md:px-2 py-0.5 rounded-md">
                                                        <HelpCircle size={10} className="text-amber-400 md:w-[12px] md:h-[12px]" /> 미감정
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Pane: Interaction Panel */}
                    <div className={`w-full md:w-1/2 flex flex-col bg-slate-950/10 h-full overflow-hidden ${selectedCompanion ? 'flex' : 'hidden md:flex'}`}>
                        {selectedCompanion ? (
                            <div className="flex-1 flex flex-col h-full overflow-hidden justify-between">
                                <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
                                    <div className="space-y-1 md:space-y-1.5 border-b border-slate-800 pb-3 md:pb-4 relative">
                                        <button
                                            onClick={() => setSelectedCompanion(null)}
                                            className="md:hidden absolute right-0 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 active:scale-95 transition-all min-h-[36px]"
                                        >
                                            목록 보기
                                        </button>
                                        <span className="text-[9px] md:text-[10px] font-black tracking-wider text-indigo-400">선택된 동료</span>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {selectedCompanion.isCustom && (
                                                <span className="text-[10px] bg-purple-950 border border-purple-500/40 text-purple-300 px-1.5 py-0.5 rounded font-bold">
                                                    커스텀 동료
                                                </span>
                                            )}
                                            <h4 className="text-lg md:text-xl font-black text-slate-100">{selectedCompanion.name}</h4>
                                        </div>
                                        <p className="text-[11px] md:text-xs text-slate-400">{getCompanionClassName(selectedCompanion)} (레벨 {selectedCompanion.level}) · 전투력 {getCompanionCP(selectedCompanion).toLocaleString()}</p>
                                    </div>

                                    {/* Resource Status */}
                                    <div className="bg-slate-900/60 border border-slate-800/80 p-3 md:p-4 rounded-2xl space-y-2 md:space-y-3">
                                        <h5 className="text-[10px] md:text-xs font-bold text-slate-400">포텐셜 감정 요구 비용</h5>
                                        
                                        <div className="grid grid-cols-2 gap-2 md:gap-3">
                                            {/* Gold */}
                                            <div className="bg-slate-950 border border-slate-850 p-2.5 md:p-3 rounded-xl flex flex-col justify-between">
                                                <span className="text-[9px] md:text-[10px] text-slate-500 font-bold block">요구 골드</span>
                                                <div className="flex items-center gap-1 mt-0.5 md:mt-1">
                                                    <Coins size={12} className="text-amber-500 md:w-[14px] md:h-[14px]" />
                                                    <span className={`text-xs md:text-sm font-black ${hasEnoughGold ? 'text-amber-400' : 'text-red-400'}`}>
                                                        {goldCost.toLocaleString()}G
                                                    </span>
                                                </div>
                                                <span className="text-[8px] md:text-[9px] text-slate-500 block mt-0.5 md:mt-1 truncate">보유: {currentGold.toLocaleString()}G</span>
                                            </div>

                                            {/* Mana Crystal */}
                                            <div className="bg-slate-950 border border-slate-850 p-2.5 md:p-3 rounded-xl flex flex-col justify-between">
                                                <span className="text-[9px] md:text-[10px] text-slate-500 font-bold block">요구 마정석</span>
                                                <div className="flex items-center gap-1 mt-0.5 md:mt-1">
                                                    <Sparkles size={12} className="text-indigo-400 animate-pulse md:w-[14px] md:h-[14px]" />
                                                    <span className={`text-xs md:text-sm font-black ${hasEnoughCrystals ? 'text-indigo-400' : 'text-red-400'}`}>
                                                        {crystalCost}개
                                                    </span>
                                                </div>
                                                <span className="text-[8px] md:text-[9px] text-slate-500 block mt-0.5 md:mt-1 truncate">보유: {currentCrystals}개</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Error Banner if any */}
                                    {errorMsg && (
                                        <div className="bg-red-950/20 border border-red-900/40 p-3 rounded-xl flex items-start gap-2 text-xs text-red-300">
                                            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                                            <p className="leading-relaxed text-[11px] md:text-xs">{errorMsg}</p>
                                        </div>
                                    )}

                                    {selectedCompanion.potentialAppraised ? (
                                        <div className="bg-emerald-950/10 border border-emerald-950/30 p-3.5 md:p-4 rounded-xl space-y-1.5">
                                            <span className="text-[11px] md:text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                                <CheckCircle2 size={13} className="md:w-[15px] md:h-[15px]" /> 이미 감정이 완료된 동료입니다.
                                            </span>
                                            <p className="text-[10px] md:text-[11px] text-slate-400 leading-normal">
                                                상태 정보창(Companion Status Modal)의 상세 정보에서 이 동료의 한계 포텐셜을 자유롭게 확인할 수 있습니다.
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-[11px] md:text-xs text-slate-400 leading-relaxed bg-slate-900/20 p-3 rounded-xl border border-slate-850">
                                            예언가 사바스가 동료의 심상과 영혼의 기류를 들여다봅니다. 감정하면 <strong>1,000골드</strong>와 <strong>마정석 5개</strong>가 즉시 차감되며, 한계 클래스가 개방 및 드러나게 됩니다.
                                        </p>
                                    )}
                                </div>

                                {!selectedCompanion.potentialAppraised && (
                                    <div className="p-3 md:p-4 bg-slate-900/40 border-t border-slate-800 shrink-0">
                                        <button
                                            onClick={() => handleAppraise(selectedCompanion)}
                                            disabled={!hasEnoughGold || !hasEnoughCrystals}
                                            className={`w-full py-3 md:py-4 text-white font-extrabold text-xs md:text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                                                (hasEnoughGold && hasEnoughCrystals)
                                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-950/40 active:scale-[0.98]'
                                                    : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                                            }`}
                                        >
                                            <Sparkles size={14} className="md:w-[16px] md:h-[16px]" />
                                            <span>영혼의 한계 포텐셜 감정하기</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3 opacity-60">
                                <HelpCircle size={36} className="text-slate-600 md:w-[40px] md:h-[40px]" />
                                <div>
                                    <h5 className="text-xs md:text-sm font-black text-slate-300">동료를 선택하십시오</h5>
                                    <p className="text-[10px] md:text-xs text-slate-500 mt-1 max-w-[240px] mx-auto">좌측 명단에서 영혼을 감정할 동료를 선택하면 예언을 시작할 수 있습니다.</p>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

            </div>
        </div>
    );
};
