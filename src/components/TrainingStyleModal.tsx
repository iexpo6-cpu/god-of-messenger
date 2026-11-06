import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Character, Companion, CombatStyle, TrainerBranch } from '../types';
import { COMBAT_STYLE_CONFIG, COMBAT_STYLE_TIER_REQUIREMENTS, COMBAT_STYLE_SPECIALTIES } from '../constants';
import { getCombatStyleUnlockStatus, getTrainerBranchMultiplier } from '../utils';
import { getCombatStyleSkillSet } from '../combatStyleSkills';
import { 
    Sword, Shield, Sparkles, ChevronRight, Check, Lock, 
    Layers, GitBranch, ArrowRight, X, User, Zap
} from 'lucide-react';

interface TrainingStyleModalProps {
    character: Character;
    onClose: () => void;
    onUpdateTargetStyle: (targetId: string, style: CombatStyle) => void;
    onPromoteStyle: (targetId: string, style: CombatStyle) => void;
}

const TrainingStyleModalComponent: React.FC<TrainingStyleModalProps> = ({ 
    character, 
    onClose, 
    onUpdateTargetStyle, 
    onPromoteStyle 
}) => {
    const actors = [character, ...(character.companions || []).filter(c => c.isCustom)];
    const [selectedActorId, setSelectedActorId] = useState<string>('player');
    
    const selectedActor = actors.find(a => (a as any).id === selectedActorId || (!('id' in a) && selectedActorId === 'player')) || character;
    const actorCurrentRoot = (selectedActor.combatStyle && COMBAT_STYLE_CONFIG[selectedActor.combatStyle]?.rootStyle) || CombatStyle.SWORDSMAN;
    
    const [selectedRootStyle, setSelectedRootStyle] = useState<CombatStyle>(actorCurrentRoot);
    const [selectedStyle, setSelectedStyle] = useState<CombatStyle | null>(selectedActor.combatStyle || actorCurrentRoot);
    const [focusedBranch2nd, setFocusedBranch2nd] = useState<CombatStyle | null>(null);
    const [mobileTab, setMobileTab] = useState<'tree' | 'detail'>('tree');

    const facilityLevel = character.base?.layout?.find(f => f.type === 'training_style')?.level || 1;
    const maxAllowedTier = facilityLevel >= 5 ? 4 : facilityLevel >= 3 ? 3 : facilityLevel >= 2 ? 2 : 1;
    const styleMult = getTrainerBranchMultiplier(character, TrainerBranch.COMBAT_STYLE);

    const allStyles = Object.values(CombatStyle);
    const rootStyles = allStyles.filter(s => COMBAT_STYLE_CONFIG[s]?.tier === 1);

    const handleSelectActor = (id: string) => {
        setSelectedActorId(id);
        const target = actors.find(a => (a as any).id === id || (!('id' in a) && id === 'player')) || character;
        const root = (target.combatStyle && COMBAT_STYLE_CONFIG[target.combatStyle]?.rootStyle) || CombatStyle.SWORDSMAN;
        setSelectedRootStyle(root);
        setSelectedStyle(target.combatStyle || root);
        setFocusedBranch2nd(null);
    };

    const handleSelectRootTab = (root: CombatStyle) => {
        setSelectedRootStyle(root);
        setSelectedStyle(root);
        setFocusedBranch2nd(null);
    };

    const handleSelectStyle = (style: CombatStyle) => {
        const config = COMBAT_STYLE_CONFIG[style];
        if (config?.rootStyle && config.rootStyle !== selectedRootStyle) {
            setSelectedRootStyle(config.rootStyle);
        }
        
        // 2차 전직을 클릭하면 해당 2차 분기로 포커스 설정
        if (config?.tier === 2) {
            setFocusedBranch2nd(style);
        } else if (config?.tier === 1) {
            setFocusedBranch2nd(null);
        } else if (config?.tier >= 3) {
            // 3차나 4차를 클릭하면 상위 2차 전직 분기 식별
            let curr = style;
            while (curr) {
                const parent = COMBAT_STYLE_CONFIG[curr]?.parentStyle;
                if (!parent) break;
                if (COMBAT_STYLE_CONFIG[parent]?.tier === 2) {
                    setFocusedBranch2nd(parent);
                    break;
                }
                curr = parent;
            }
        }

        setSelectedStyle(style);
        setMobileTab('detail');
    };

    // 2차 전직 목록 및 3차/4차 하위 트리 계산
    const currentRootConfig = COMBAT_STYLE_CONFIG[selectedRootStyle];
    const tier2List = allStyles.filter(s => COMBAT_STYLE_CONFIG[s]?.rootStyle === selectedRootStyle && COMBAT_STYLE_CONFIG[s]?.tier === 2);
    
    // 분기 필터링 적용 (특정 2차 분기만 집중 보기 또는 전체 보기)
    const displayedTier2List = focusedBranch2nd 
        ? tier2List.filter(s => s === focusedBranch2nd) 
        : tier2List;

    // 선택된 전직과의 연계 경로 확인 (하이라이트용)
    const isStyleInLineage = (style: CombatStyle) => {
        if (!selectedStyle) return false;
        if (style === selectedStyle) return true;

        // selectedStyle의 조상인지 확인
        let curr = selectedStyle;
        while (curr) {
            const p = COMBAT_STYLE_CONFIG[curr]?.parentStyle;
            if (p === style) return true;
            if (!p || p === curr) break;
            curr = p;
        }

        // selectedStyle의 후손인지 확인
        curr = style;
        while (curr) {
            const p = COMBAT_STYLE_CONFIG[curr]?.parentStyle;
            if (p === selectedStyle) return true;
            if (!p || p === curr) break;
            curr = p;
        }

        return false;
    };

    // 스타일 카드 렌더러 컴포넌트
    const renderStyleCard = (style: CombatStyle, compact = false) => {
        const status = getCombatStyleUnlockStatus(selectedActor, style);
        const isFacilityLocked = status.config.tier > maxAllowedTier;
        const isSelected = selectedStyle === style;
        const inLineage = isStyleInLineage(style);

        return (
            <button
                key={style}
                onClick={() => handleSelectStyle(style)}
                className={`relative w-full text-left p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 group flex flex-col justify-between ${
                    isSelected
                        ? 'ring-2 ring-blue-500 bg-blue-950/40 border-blue-400 shadow-lg shadow-blue-950/50 scale-[1.02]'
                        : inLineage
                        ? 'bg-blue-950/20 border-blue-600/60 hover:border-blue-400'
                        : status.isCurrent
                        ? 'bg-blue-900/25 border-blue-500/60 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                        : status.isTarget
                        ? 'bg-amber-900/25 border-amber-500/60'
                        : status.isUnlocked
                        ? 'bg-neutral-800/90 border-neutral-700 hover:border-neutral-500'
                        : status.meetsParent && !isFacilityLocked
                        ? 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-600'
                        : 'bg-neutral-950/80 border-neutral-900 opacity-50 hover:opacity-75'
                } ${compact ? 'min-h-[72px]' : 'min-h-[82px]'}`}
            >
                {/* 상단 뱃지 및 차수 */}
                <div className="flex items-center justify-between w-full mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        status.config.tier === 1 ? 'bg-slate-800 text-slate-300' :
                        status.config.tier === 2 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40' :
                        status.config.tier === 3 ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/40' :
                        'bg-purple-950 text-purple-300 border border-purple-800/40'
                    }`}>
                        {status.config.tier}차
                    </span>

                    <div className="flex items-center gap-1">
                        {isFacilityLocked && !status.isUnlocked && (
                            <Lock size={12} className="text-red-400 opacity-80" />
                        )}
                        {status.isCurrent && (
                            <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow">
                                현재
                            </span>
                        )}
                        {status.isTarget && (
                            <span className="bg-amber-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow">
                                목표
                            </span>
                        )}
                        {status.isUnlocked && !status.isCurrent && (
                            <span className="bg-emerald-900/70 text-emerald-300 text-[9px] px-1 py-0.5 rounded font-bold border border-emerald-700/50 flex items-center">
                                <Check size={10} className="mr-0.5" /> 해금
                            </span>
                        )}
                    </div>
                </div>

                {/* 스타일 이름 */}
                <div className={`font-bold text-xs sm:text-sm tracking-tight truncate w-full ${
                    isSelected ? 'text-white' :
                    status.isCurrent ? 'text-blue-200' :
                    status.isUnlocked ? 'text-neutral-100' :
                    'text-neutral-300'
                }`}>
                    {style}
                </div>

                {/* 하단 진척도 바 */}
                {!status.isUnlocked && status.meetsParent && (
                    <div className="w-full mt-1.5 space-y-0.5">
                        <div className="w-full h-1 bg-neutral-950 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-300 ${status.progressPercent >= 100 ? 'bg-emerald-400' : 'bg-amber-400'}`} 
                                style={{ width: `${Math.max(5, status.progressPercent)}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[9px] text-neutral-400 font-mono">
                            <span>진척도</span>
                            <span className={status.progressPercent >= 100 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                                {Math.floor(status.progressPercent)}%
                            </span>
                        </div>
                    </div>
                )}
            </button>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm font-sans">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-6xl h-[94vh] md:h-[90vh] max-h-[94vh] flex flex-col shadow-2xl overflow-hidden"
            >
                {/* 헤더 */}
                <div className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4 border-b border-neutral-800 bg-neutral-950 shrink-0">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-blue-950/80 border border-blue-600/50 flex items-center justify-center text-blue-400 shrink-0">
                            <GitBranch size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-xl font-bold text-white tracking-wide">전투 스타일 훈련소</h2>
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 font-bold border border-blue-700/50">
                                    훈련소 Lv.{facilityLevel}
                                </span>
                            </div>
                            <p className="text-xs text-neutral-400 mt-0.5 hidden sm:block">
                                계열별 전직 계통 트리를 확인하고 원하는 전투 스타일로 수련 및 승급(전직)을 진행할 수 있습니다.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-neutral-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-neutral-800"
                        aria-label="닫기"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 모바일 대상 선택 바 */}
                <div className="md:hidden flex items-center gap-1.5 p-2 bg-neutral-950 border-b border-neutral-800 overflow-x-auto shrink-0 scrollbar-none">
                    <span className="text-xs font-bold text-neutral-400 whitespace-nowrap px-1">대상:</span>
                    {actors.map(actor => {
                        const actorId = 'id' in actor ? actor.id : 'player';
                        const isSelected = selectedActorId === actorId;
                        return (
                            <button
                                key={actorId}
                                onClick={() => handleSelectActor(actorId)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 min-h-[38px] ${
                                    isSelected
                                        ? 'bg-blue-600 text-white font-bold shadow'
                                        : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700'
                                }`}
                            >
                                <User size={13} />
                                <span>{actor.name}</span>
                                <span className="opacity-70 text-[10px]">Lv.{actor.level || 1}</span>
                            </button>
                        );
                    })}
                </div>

                {/* 모바일 탭 스위처 */}
                <div className="md:hidden flex border-b border-neutral-800 bg-neutral-900 shrink-0">
                    <button
                        onClick={() => setMobileTab('tree')}
                        className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-colors min-h-[44px] flex items-center justify-center gap-1.5 ${
                            mobileTab === 'tree' ? 'border-blue-500 text-blue-400 bg-neutral-800/50' : 'border-transparent text-neutral-400'
                        }`}
                    >
                        <GitBranch size={14} />
                        <span>전직 계통 트리</span>
                    </button>
                    <button
                        onClick={() => setMobileTab('detail')}
                        className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 min-h-[44px] ${
                            mobileTab === 'detail' ? 'border-blue-500 text-blue-400 bg-neutral-800/50' : 'border-transparent text-neutral-400'
                        }`}
                    >
                        <Sparkles size={14} />
                        <span>계열 상세 정보</span>
                        {selectedStyle && (
                            <span className="text-[10px] bg-blue-900/80 text-blue-200 px-1.5 py-0.5 rounded font-normal truncate max-w-[90px]">
                                {selectedStyle}
                            </span>
                        )}
                    </button>
                </div>

                {/* 메인 레이아웃 영역 */}
                <div className="flex-1 flex overflow-hidden">
                    {/* 데스크탑 좌측: 캐릭터 대상 선택 */}
                    <div className="hidden md:block w-52 lg:w-60 border-r border-neutral-800 bg-neutral-950/60 overflow-y-auto p-3.5 space-y-2 shrink-0">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 px-2 flex items-center gap-1.5">
                            <User size={13} className="text-blue-400" />
                            <span>대상 캐릭터 선택</span>
                        </h3>
                        {actors.map(actor => {
                            const actorId = 'id' in actor ? actor.id : 'player';
                            const isSelected = selectedActorId === actorId;
                            return (
                                <button
                                    key={actorId}
                                    onClick={() => handleSelectActor(actorId)}
                                    className={`w-full text-left p-3 rounded-2xl transition-all border ${
                                        isSelected
                                            ? 'bg-blue-950/60 border-blue-500/60 text-blue-100 shadow-md shadow-blue-950/50'
                                            : 'bg-neutral-900/60 border-neutral-800/80 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                                    }`}
                                >
                                    <div className="font-bold text-sm text-white">{actor.name}</div>
                                    <div className="text-xs text-neutral-400 mt-1 flex items-center justify-between">
                                        <span>Lv.{actor.level || 1}</span>
                                        <span className="text-blue-400 font-medium truncate max-w-[100px]">{actor.combatStyle || '무직'}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* 중앙: 전직 계통 트리 (1차 선택 탭 + 집중 전직 트리) */}
                    <div className={`flex-1 bg-neutral-950 overflow-y-auto p-3 sm:p-5 relative flex flex-col custom-scrollbar ${mobileTab === 'detail' ? 'hidden md:flex' : 'flex'}`}>
                        {/* 1. 1차 계열 선택 탭 바 (상단에서 바로 클릭하여 원하는 계열로 즉시 전환) */}
                        <div className="mb-4 shrink-0 bg-neutral-900/80 p-2 rounded-2xl border border-neutral-800">
                            <div className="text-[11px] font-bold text-neutral-400 mb-1.5 px-1 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    <Layers size={13} className="text-blue-400" />
                                    <span>1차 기본 계열 선택</span>
                                </span>
                                <span className="text-neutral-500 text-[10px]">
                                    계열 클릭 시 해당 2~4차 전직 트리만 즉시 표시됩니다
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {rootStyles.map(root => {
                                    const isRootActive = selectedRootStyle === root;
                                    const isActorInRoot = (selectedActor.combatStyle && COMBAT_STYLE_CONFIG[selectedActor.combatStyle]?.rootStyle === root);
                                    
                                    return (
                                        <button
                                            key={root}
                                            onClick={() => handleSelectRootTab(root)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 min-h-[38px] ${
                                                isRootActive
                                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-950/60 border border-blue-400'
                                                    : 'bg-neutral-950/70 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 hover:border-neutral-700'
                                            }`}
                                        >
                                            <span>{root}</span>
                                            {isActorInRoot && (
                                                <span className={`w-2 h-2 rounded-full ${isRootActive ? 'bg-white' : 'bg-blue-400'} animate-pulse`} />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {styleMult > 1 && (
                            <div className="mb-4 bg-purple-950/70 border border-purple-500/50 rounded-2xl p-3 flex items-center justify-between text-xs text-purple-200 font-bold shadow-md">
                                <span className="flex items-center gap-2">
                                    <Sparkles size={16} className="text-purple-400 shrink-0" />
                                    <span>전투 스타일 트레이너 효과 적용 중: 수련 경험치 획득량 {styleMult}배 증가!</span>
                                </span>
                                <span className="text-[10px] bg-purple-900/80 text-purple-300 px-2 py-0.5 rounded-full border border-purple-700/50">
                                    배치 완료
                                </span>
                            </div>
                        )}

                        {/* 2. 현재 선택된 1차 계열 헤더 & 분기 필터 안내 바 */}
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-blue-950/40 via-neutral-900/60 to-neutral-900/40 p-3 rounded-2xl border border-blue-900/40 mb-4 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-900/40 border border-blue-500/40 flex items-center justify-center text-blue-300 font-bold text-xs shrink-0">
                                    1차
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-white text-sm sm:text-base">
                                            {selectedRootStyle} 계열 전직 트리
                                        </h3>
                                        <span className="text-[11px] text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-800/50">
                                            {currentRootConfig?.specialtyText || '고유 특화'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-neutral-400 line-clamp-1">
                                        {currentRootConfig?.description}
                                    </p>
                                </div>
                            </div>

                            {/* 분기 집중 해제 버튼 */}
                            {focusedBranch2nd && (
                                <button
                                    onClick={() => setFocusedBranch2nd(null)}
                                    className="px-2.5 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl border border-neutral-700 transition-colors flex items-center gap-1 font-medium min-h-[36px]"
                                >
                                    <span>전체 분기 보기</span>
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {/* 3. 1차 -> 2차 -> 3차 -> 4차 계단형 직관적 분기 트리 (드래그 없이 한눈에 보기) */}
                        <div className="space-y-4 pb-6 flex-1">
                            {/* 1차 루트 카드 */}
                            <div className="max-w-xs">
                                {renderStyleCard(selectedRootStyle)}
                            </div>

                            {/* 2차 분기별 하위 전직 트리 섹션들 */}
                            <div className="space-y-4 pt-1">
                                {displayedTier2List.map(s2 => {
                                    const tier3List = allStyles.filter(s => COMBAT_STYLE_CONFIG[s]?.parentStyle === s2 && COMBAT_STYLE_CONFIG[s]?.tier === 3);
                                    const isThisBranchFocused = focusedBranch2nd === s2;

                                    return (
                                        <div 
                                            key={s2} 
                                            className={`p-3 sm:p-4 rounded-3xl border transition-all ${
                                                isThisBranchFocused 
                                                    ? 'bg-neutral-900/90 border-blue-500/50 shadow-xl' 
                                                    : 'bg-neutral-900/50 border-neutral-800/90 hover:border-neutral-700'
                                            }`}
                                        >
                                            {/* 분기 헤더 */}
                                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800/80">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                                    <h4 className="font-bold text-xs sm:text-sm text-neutral-200">
                                                        2차 전직: <strong className="text-emerald-300">{s2}</strong> 분기
                                                    </h4>
                                                </div>
                                                <button
                                                    onClick={() => setFocusedBranch2nd(isThisBranchFocused ? null : s2)}
                                                    className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${
                                                        isThisBranchFocused
                                                            ? 'bg-blue-950 text-blue-300 border-blue-700/60 font-bold'
                                                            : 'bg-neutral-950/60 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                                                    }`}
                                                >
                                                    {isThisBranchFocused ? '전체 분기 보기' : '이 분기만 보기'}
                                                </button>
                                            </div>

                                            {/* 2차 카드 및 파생되는 3차 / 4차 트리 레이아웃 */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                                                {/* 2차 전직 카드 */}
                                                <div className="space-y-1.5">
                                                    <div className="text-[10px] font-bold text-neutral-400 px-1">2차 전직</div>
                                                    {renderStyleCard(s2)}
                                                </div>

                                                {/* 3차 & 4차 연계 카드 컬럼들 */}
                                                <div className="md:col-span-2 space-y-3">
                                                    <div className="text-[10px] font-bold text-neutral-400 px-1">
                                                        3차 및 4차 승급 계통
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                        {tier3List.map(s3 => {
                                                            const tier4List = allStyles.filter(s => COMBAT_STYLE_CONFIG[s]?.parentStyle === s3 && COMBAT_STYLE_CONFIG[s]?.tier === 4);

                                                            return (
                                                                <div key={s3} className="bg-neutral-950/70 p-2.5 rounded-2xl border border-neutral-800 space-y-2">
                                                                    {/* 3차 카드 */}
                                                                    <div>
                                                                        <div className="text-[9px] text-indigo-400 font-bold mb-1">3차 전직</div>
                                                                        {renderStyleCard(s3, true)}
                                                                    </div>

                                                                    {/* 4차 카드들 (3차 아래에 바로 직관적으로 배치) */}
                                                                    {tier4List.length > 0 && (
                                                                        <div className="pt-1.5 border-t border-neutral-800/80 space-y-1.5">
                                                                            <div className="text-[9px] text-purple-400 font-bold flex items-center gap-1">
                                                                                <ArrowRight size={10} />
                                                                                <span>4차 최종 승급</span>
                                                                            </div>
                                                                            {tier4List.map(s4 => renderStyleCard(s4, true))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* 우측 사이드바: 선택한 전투 스타일 상세 정보 */}
                    <div className={`w-full md:w-80 lg:w-96 border-l border-neutral-800 bg-neutral-900/60 overflow-y-auto p-4 sm:p-5 flex flex-col shrink-0 custom-scrollbar ${mobileTab === 'tree' ? 'hidden md:flex' : 'flex'}`}>
                        <AnimatePresence mode="wait">
                            {selectedStyle ? (() => {
                                const status = getCombatStyleUnlockStatus(selectedActor, selectedStyle);
                                const req = COMBAT_STYLE_TIER_REQUIREMENTS[status.config.tier];
                                const specialties = COMBAT_STYLE_SPECIALTIES[selectedStyle] || [];
                                
                                return (
                                    <motion.div
                                        key={selectedStyle}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="space-y-4 sm:space-y-5"
                                    >
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 font-bold border border-blue-800/60">
                                                        {status.config.tier}차 전직
                                                    </span>
                                                    {status.isUnlocked && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/60">
                                                            해금 완료
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => setMobileTab('tree')}
                                                    className="md:hidden text-xs text-blue-400 hover:underline flex items-center gap-1 font-bold p-1"
                                                >
                                                    ← 트리 보기
                                                </button>
                                            </div>
                                            <h3 className="text-xl sm:text-2xl font-black text-white">{selectedStyle}</h3>
                                            <p className="text-xs text-neutral-300 leading-relaxed">{status.config.label || status.config.description}</p>
                                        </div>

                                        {/* 전투 특수 효과 (추가 효과) 강조 박스 */}
                                        <div className="space-y-1.5 bg-gradient-to-br from-blue-950/40 to-neutral-900 border border-blue-500/30 rounded-2xl p-3.5 shadow-md">
                                            <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs">
                                                <Zap size={14} className="text-blue-400 shrink-0" />
                                                <span>전투 특수 효과 (추가 효과)</span>
                                            </div>
                                            {status.config.bonusDescription ? (
                                                <p className="text-xs sm:text-sm text-blue-100 font-semibold leading-relaxed whitespace-pre-wrap pt-0.5">
                                                    {status.config.bonusDescription}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-neutral-300 pt-0.5 leading-relaxed">
                                                    {status.config.specialtyText || status.config.description || '이 계열 고유의 전투 능력치 및 스킬 보너스가 부여됩니다.'}
                                                </p>
                                            )}
                                        </div>

                                        {/* 계열 고유 스킬 (습득 보유 패시브 / 장착 패시브 / 장착 액티브) */}
                                        {(() => {
                                            const skillSet = getCombatStyleSkillSet(selectedStyle, status.config.tier);
                                            if (!skillSet) return null;
                                            return (
                                                <div className="space-y-2.5 bg-neutral-950/80 border border-neutral-800 rounded-2xl p-3.5 shadow-md">
                                                    <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                                                        <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                                                            <Sparkles size={13} className="text-indigo-400" />
                                                            <span>계열 스킬 구성</span>
                                                        </h4>
                                                        <span className="text-[10px] text-neutral-500">패시브 및 액티브</span>
                                                    </div>

                                                    {/* 1. 습득 보유 패시브 */}
                                                    <div className="bg-neutral-900/80 border border-emerald-900/40 rounded-xl p-2.5 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                                                                <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800/60 text-[9px] font-medium text-emerald-300">습득 패시브</span>
                                                                {skillSet.learnedPassive.name}
                                                            </span>
                                                            <span className={`text-[10px] font-bold ${status.isUnlocked ? 'text-emerald-400' : 'text-neutral-500'}`}>
                                                                {status.isUnlocked ? '✓ 상시 적용 중' : '미습득'}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-neutral-300 leading-relaxed pl-1">
                                                            {skillSet.learnedPassive.description}
                                                        </p>
                                                        <p className="text-[10px] text-neutral-500 pl-1">
                                                            * 이 계열을 한번 해금(습득)하면 다른 계열로 전직해도 상시 영구 누적됩니다.
                                                        </p>
                                                    </div>

                                                    {/* 2. 장착 전용 패시브 */}
                                                    <div className="bg-neutral-900/80 border border-blue-900/40 rounded-xl p-2.5 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1">
                                                                <span className="px-1.5 py-0.5 rounded bg-blue-950 border border-blue-800/60 text-[9px] font-medium text-blue-300">장착 패시브</span>
                                                                {skillSet.equippedPassive.name}
                                                            </span>
                                                            <span className={`text-[10px] font-bold ${status.isCurrent ? 'text-blue-400' : 'text-neutral-500'}`}>
                                                                {status.isCurrent ? '✓ 장착 활성화' : '장착 시 활성'}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-neutral-300 leading-relaxed pl-1">
                                                            {skillSet.equippedPassive.description}
                                                        </p>
                                                    </div>

                                                    {/* 3. 장착 전용 액티브 스킬 */}
                                                    <div className="bg-neutral-900/80 border border-purple-900/40 rounded-xl p-2.5 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
                                                                <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800/60 text-[9px] font-medium text-purple-300">장착 액티브</span>
                                                                {skillSet.equippedActive.name}
                                                            </span>
                                                            <span className="text-[10px] text-purple-300 font-bold bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40">
                                                                마나 {skillSet.equippedActive.mpCost}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-neutral-300 leading-relaxed pl-1">
                                                            {skillSet.equippedActive.description}
                                                        </p>
                                                        <div className="flex items-center justify-between text-[10px] text-neutral-400 pl-1 pt-0.5">
                                                            <span>위력 배율: <strong className="text-purple-300">{Math.round(skillSet.equippedActive.powerRatio)}%</strong></span>
                                                            <span className={status.isCurrent ? 'text-purple-400 font-bold' : 'text-neutral-500'}>
                                                                {status.isCurrent ? '전투 사용 가능' : '장착 시 사용 가능'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* 특화 무기 */}
                                        <div className="space-y-1.5">
                                            <h4 className="text-xs font-bold text-neutral-400 border-b border-neutral-800 pb-1 flex items-center gap-1">
                                                <Sword size={13} className="text-neutral-400" />
                                                <span>특화 무기</span>
                                            </h4>
                                            <div className="flex flex-wrap gap-1.5">
                                                {specialties.map((w, wIdx) => (
                                                    <span key={`spec-${w}-${wIdx}`} className="text-xs bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-xl border border-neutral-700 font-medium">
                                                        {w}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 수련 조건 및 진척도 */}
                                        {!status.isUnlocked && (
                                            <div className="space-y-3 bg-neutral-950 p-3.5 rounded-2xl border border-neutral-800">
                                                <h4 className="text-xs font-bold text-neutral-300">수련 진척도 및 조건</h4>
                                                
                                                <div className="space-y-2.5">
                                                    <div>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="text-neutral-400">레벨 조건 (Lv.{status.config.tier === 1 ? 1 : status.config.tier === 2 ? 100 : status.config.tier === 3 ? 300 : 500}+)</span>
                                                            <span className={status.meetsLevel ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                                                                {selectedActor.level || 1} / {status.config.tier === 1 ? 1 : status.config.tier === 2 ? 100 : status.config.tier === 3 ? 300 : 500}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="text-neutral-400">무기 숙련도 ({status.config.minMastery}+)</span>
                                                            <span className={status.meetsMastery ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                                                                {status.meetsMastery ? '달성' : '미달'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="text-neutral-400">수련 경험치</span>
                                                            <span className={status.currentExp >= status.reqExp ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                                                                {Math.floor(status.currentExp).toLocaleString()} / {status.reqExp.toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                                                            <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${Math.min(100, (status.currentExp / status.reqExp) * 100)}%` }}></div>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="text-neutral-400">Lv.{req.minMonsterLevel}+ 몬스터 처치</span>
                                                            <span className={status.currentKills >= status.reqKills ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                                                                {status.currentKills} / {status.reqKills}
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                                                            <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${Math.min(100, (status.currentKills / status.reqKills) * 100)}%` }}></div>
                                                        </div>
                                                    </div>

                                                    {req.reqBossKills > 0 && (
                                                        <div>
                                                            <div className="flex justify-between text-xs mb-1">
                                                                <span className="text-neutral-400">보스 처치</span>
                                                                <span className={status.currentBossKills >= status.reqBossKills ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                                                                    {status.currentBossKills} / {status.reqBossKills}
                                                                </span>
                                                            </div>
                                                            <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                                                                <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${Math.min(100, (status.currentBossKills / status.reqBossKills) * 100)}%` }}></div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* 액션 버튼 */}
                                        <div className="pt-2 flex flex-col gap-2">
                                            {status.isCurrent ? (
                                                <button disabled className="w-full py-3 rounded-2xl bg-blue-900/30 text-blue-400 font-bold border border-blue-900/50 cursor-not-allowed text-xs sm:text-sm min-h-[44px]">
                                                    현재 장착 중인 계열
                                                </button>
                                            ) : status.isUnlocked ? (
                                                <button 
                                                    onClick={() => {
                                                        const targetId = 'id' in selectedActor ? selectedActor.id : 'player';
                                                        onUpdateTargetStyle(targetId!, selectedStyle);
                                                        onPromoteStyle(targetId!, selectedStyle);
                                                    }}
                                                    className="w-full py-3 rounded-2xl bg-white text-black hover:bg-neutral-200 font-bold transition-colors text-xs sm:text-sm shadow-md min-h-[44px]"
                                                >
                                                    이 계열로 변경 (무료)
                                                </button>
                                            ) : status.config.tier > maxAllowedTier ? (
                                                <div className="text-center p-3 rounded-2xl bg-red-900/20 border border-red-900/30 text-red-400 text-xs font-medium leading-relaxed">
                                                    훈련소 레벨이 낮아 수련할 수 없습니다.<br/>(필요 훈련소 레벨: {status.config.tier === 4 ? 5 : status.config.tier === 3 ? 3 : status.config.tier === 2 ? 2 : 1})
                                                </div>
                                            ) : status.canPromote ? (
                                                <button 
                                                    onClick={() => {
                                                        const targetId = 'id' in selectedActor ? selectedActor.id : 'player';
                                                        onPromoteStyle(targetId!, selectedStyle);
                                                    }}
                                                    className="w-full py-3 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600 font-bold transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] text-xs sm:text-sm min-h-[44px]"
                                                >
                                                    전직 승급하기
                                                </button>
                                            ) : status.meetsAllPrerequisites ? (
                                                <button 
                                                    onClick={() => {
                                                        if (status.isTarget) return;
                                                        const targetId = 'id' in selectedActor ? selectedActor.id : 'player';
                                                        onUpdateTargetStyle(targetId!, selectedStyle);
                                                    }}
                                                    className={`w-full py-3 rounded-2xl font-bold transition-colors text-xs sm:text-sm border min-h-[44px] ${
                                                        status.isTarget 
                                                            ? 'bg-amber-900/30 text-amber-500 border-amber-900/50 cursor-default' 
                                                            : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white border-neutral-700'
                                                    }`}
                                                >
                                                    {status.isTarget ? '수련 중' : '수련 목표로 지정'}
                                                </button>
                                            ) : status.meetsParent ? (
                                                <button disabled className="w-full py-3 rounded-2xl bg-neutral-950 text-neutral-600 font-bold border border-neutral-900 cursor-not-allowed text-xs min-h-[44px]">
                                                    선행 조건 미충족 (레벨 및 숙련도 필요)
                                                </button>
                                            ) : (
                                                <div className="text-center p-3 rounded-2xl bg-red-900/20 border border-red-900/30 text-red-400 text-xs font-medium">
                                                    이전 차수 계열의 해금이 필요합니다.
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })() : (
                                <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 space-y-3 py-8">
                                    <Sparkles className="w-10 h-10 opacity-40" />
                                    <p className="text-xs text-center leading-relaxed">
                                        전투 계열을 선택하여<br />특수 효과 및 수련 정보를 확인하세요.
                                    </p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export const TrainingStyleModal = React.memo(TrainingStyleModalComponent);
export default TrainingStyleModal;
