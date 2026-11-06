import React, { useState, useMemo } from 'react';
import { Character, Companion, Skill, ClassTier, SkillType } from '../../types';
import { 
    X, Command, Zap, Shield, Sword, Sparkles, Star, 
    Crosshair, Users, Crown, AlertCircle 
} from 'lucide-react';
import { SHINRYOKU_UI_CONFIG } from '../../constants';
import { calculateDebuffSuccessRate } from '../../utils';
import { checkSkillWeaponRequirement, getCleanseAilments, getBuffEffectSummaries } from './SkillSelector';
import { checkSkillParticipantsMp } from '../../services/BondSkillService';

interface CompanionCommandModalProps {
    companion: Companion;
    player?: Character;
    skills: Skill[];
    onAction: (actionText: string, mpCost?: number) => void;
    onSelectSkill: (skill: Skill) => void;
    onClose: () => void;
    isClassTrial?: boolean;
}

const TIER_ICONS: Record<string, any> = {
    'ALL': Sparkles,
    [ClassTier.NONE]: Sparkles,
    [ClassTier.FIRST]: Zap,
    [ClassTier.SECOND]: Shield,
    [ClassTier.LAST]: Crosshair,
    [ClassTier.FINAL]: Crown,
    [ClassTier.BOND]: Users,
    'COMBAT_STYLE': Sword
};

const isResurrectionSkill = (skill: Skill) => {
    return !!(skill.name?.includes('부활') || skill.description?.includes('부활') || (skill as any).isResurrect);
};

const checkSkillMatchesTier = (skill: Skill, targetTier: string): boolean => {
    if (!skill || skill.type === SkillType.PASSIVE) return false;
    if (targetTier === 'ALL') return true;
    if (targetTier === 'COMBAT_STYLE') {
        return !!(skill.isCombatStyleSkill || skill.combatStyleSource || (skill.id && skill.id.startsWith('combat_style_')));
    }
    if (targetTier === ClassTier.BOND) {
        return !!skill.isBondSkill;
    }
    if (skill.isCombatStyleSkill || skill.combatStyleSource || (skill.id && skill.id.startsWith('combat_style_'))) {
        return false;
    }
    if (skill.isBondSkill) {
        return false;
    }
    const skillTierRaw = (skill.tier || '').toLowerCase().replace(/\s/g, '');
    let keywords: string[] = [];
    if (targetTier === ClassTier.NONE) keywords = ['none', '없음', '기본', '미해방'];
    else if (targetTier === ClassTier.FIRST) keywords = ['first', '1', '퍼스트', '초급'];
    else if (targetTier === ClassTier.SECOND) keywords = ['second', '2', '세컨드', '중급'];
    else if (targetTier === ClassTier.LAST) keywords = ['last', '3', '라스트', '상급'];
    else if (targetTier === ClassTier.FINAL) keywords = ['final', '4', '파이널', '최상급'];
    return keywords.some(k => skillTierRaw.includes(k));
};

const getInitialCompanionTier = (comp: Companion, allSkills: Skill[]): string => {
    const raw = String(comp.classTier || '').toLowerCase().replace(/\s/g, '');
    const priority = [
        ClassTier.FINAL,
        ClassTier.LAST,
        ClassTier.SECOND,
        ClassTier.FIRST,
        ClassTier.NONE
    ];

    let highestTier = ClassTier.NONE;
    if (
        comp.classTier === ClassTier.FINAL || 
        raw.includes('final') || 
        raw.includes('파이널') || 
        comp.hasClearedFinalTrial || 
        comp.finalTrialCleared || 
        !!comp.finalClassName
    ) {
        highestTier = ClassTier.FINAL;
    } else if (
        comp.classTier === ClassTier.LAST || 
        raw.includes('last') || 
        raw.includes('라스트') || 
        comp.hasClearedLastTrial || 
        comp.lastTrialCleared || 
        !!comp.lastClassName
    ) {
        highestTier = ClassTier.LAST;
    } else if (
        comp.classTier === ClassTier.SECOND || 
        raw.includes('second') || 
        raw.includes('세컨드') || 
        comp.hasClearedSecondTrial || 
        comp.secondTrialCleared || 
        !!comp.secondClassName
    ) {
        highestTier = ClassTier.SECOND;
    } else if (
        comp.classTier === ClassTier.FIRST || 
        raw.includes('first') || 
        raw.includes('퍼스트') || 
        comp.hasClearedFirstTrial || 
        comp.firstTrialCleared || 
        !!comp.firstClassName
    ) {
        highestTier = ClassTier.FIRST;
    }

    // 해당 등급에 등록된 스킬이 존재하면 우선 적용
    if (allSkills.some(s => checkSkillMatchesTier(s, highestTier))) {
        return highestTier;
    }

    // 만약 해당 등급에 스킬이 없다면 보유한 스킬 중 가장 높은 등급을 기본 탭으로 설정
    for (const tier of priority) {
        if (allSkills.some(s => checkSkillMatchesTier(s, tier))) {
            return tier;
        }
    }

    return highestTier;
};

export const CompanionCommandModal: React.FC<CompanionCommandModalProps> = ({
    companion,
    player,
    skills,
    onAction,
    onSelectSkill,
    onClose,
    isClassTrial = false
}) => {
    // 동료의 가장 높은 해방 등급부터 기본 탭으로 설정
    const initialTier = useMemo(() => getInitialCompanionTier(companion, skills), [companion, skills]);
    const [selectedTier, setSelectedTier] = useState<string>(initialTier);

    React.useEffect(() => {
        setSelectedTier(initialTier);
    }, [initialTier]);

    // 사용 가능한 티어 탭 목록
    const tierTabs = useMemo(() => {
        const tabs: { id: string; label: string }[] = [
            { id: 'ALL', label: '전체' },
            { id: ClassTier.NONE, label: '미해방' },
            { id: ClassTier.FIRST, label: '퍼스트' },
            { id: ClassTier.SECOND, label: '세컨드' },
            { id: ClassTier.LAST, label: '라스트' },
            { id: ClassTier.FINAL, label: '파이널' }
        ];

        if (!isClassTrial) {
            tabs.push({ id: ClassTier.BOND, label: '인연' });
        }
        tabs.push({ id: 'COMBAT_STYLE', label: '전투계열' });

        return tabs;
    }, [isClassTrial]);

    // 필터링된 스킬 목록
    const filteredSkills = useMemo(() => {
        return skills.filter(skill => {
            if (!skill) return false;
            if (skill.type === SkillType.PASSIVE) return false;

            if (isClassTrial && skill.isBondSkill) return false;

            return checkSkillMatchesTier(skill, selectedTier);
        });
    }, [skills, selectedTier, isClassTrial]);

    const currentMp = companion.stats?.mp ?? 0;
    const maxMp = (companion as any).finalStats?.maxMp ?? companion.stats?.maxMp ?? 1;

    return (
        <div 
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-hidden animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="w-full max-w-[96vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl bg-slate-900 border-2 border-indigo-500/80 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 영역 */}
                <div className="flex justify-between items-center px-3.5 py-3 sm:px-5 sm:py-3.5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <div className="p-1.5 sm:p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 shrink-0">
                            <Command size={18} className="sm:size-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-1.5 truncate">
                                <span>동료 지시:</span>
                                <span className="text-indigo-300 font-extrabold truncate">{companion.name}</span>
                            </h3>
                            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-400 font-mono mt-0.5">
                                <span>레벨 {companion.level}</span>
                                <span>·</span>
                                <span className="text-blue-300">마력 {currentMp.toLocaleString()} / {maxMp.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-white hover:bg-slate-800/80 p-2 rounded-xl transition-all flex items-center justify-center shrink-0 active:scale-95"
                        style={{ minWidth: '40px', minHeight: '40px' }}
                        aria-label="닫기"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 모달 본문 (스크롤 영역) */}
                <div className="overflow-y-auto custom-scrollbar flex-1 p-3 sm:p-4 space-y-3.5 bg-slate-900/90">
                    
                    {/* 즉각 행동 지시 버튼 바 (공격 집중 / 방어 태세) */}
                    <div className="bg-slate-950/60 p-2.5 sm:p-3 rounded-xl border border-slate-800/90 space-y-1.5">
                        <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                            <span>전술 행동 지시</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                            <button 
                                type="button"
                                onClick={() => {
                                    onAction(`[동료 지시: ${companion.name}] 공격 집중`);
                                    onClose();
                                }} 
                                className="py-2.5 px-3 bg-gradient-to-r from-red-950/80 to-slate-900 hover:from-red-900/80 hover:to-slate-850 text-red-200 border border-red-800/60 hover:border-red-500 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2 active:scale-98"
                            >
                                <Sword size={15} className="text-red-400 shrink-0" />
                                <span>공격 집중</span>
                            </button>
                            <button 
                                type="button"
                                onClick={() => {
                                    onAction(`[동료 지시: ${companion.name}] 방어 태세`);
                                    onClose();
                                }} 
                                className="py-2.5 px-3 bg-gradient-to-r from-emerald-950/80 to-slate-900 hover:from-emerald-900/80 hover:to-slate-850 text-emerald-200 border border-emerald-800/60 hover:border-emerald-500 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2 active:scale-98"
                            >
                                <Shield size={15} className="text-emerald-400 shrink-0" />
                                <span>방어 태세</span>
                            </button>
                        </div>
                    </div>

                    {/* 스킬 사용 지시 섹션 */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs sm:text-sm font-bold text-indigo-300 flex items-center gap-1.5">
                                <Zap size={14} className="text-amber-400" />
                                <span>스킬 사용 지시</span>
                                <span className="text-[10px] text-slate-500 font-mono">({filteredSkills.length}개)</span>
                            </h4>
                        </div>

                        {/* 티어 필터 탭 */}
                        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                            {tierTabs.map(tab => {
                                const Icon = TIER_ICONS[tab.id] || Sparkles;
                                const isActive = selectedTier === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        ref={(el) => {
                                            if (isActive && el) {
                                                el.scrollIntoView({ inline: 'center', block: 'nearest' });
                                            }
                                        }}
                                        onClick={() => setSelectedTier(tab.id)}
                                        className={`px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold flex items-center gap-1 shrink-0 transition-all border ${
                                            isActive 
                                                ? 'bg-indigo-600 text-white border-indigo-400 shadow-md' 
                                                : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                                        }`}
                                    >
                                        <Icon size={12} className={isActive ? 'text-amber-300' : 'text-slate-500'} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* 스킬 카드 목록 (넓은 1열 또는 2열 반응형 그리드) */}
                        {filteredSkills.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5">
                                {filteredSkills.map((skill, idx) => {
                                    const isRes = isResurrectionSkill(skill);
                                    const isCombatStyle = !!(skill.isCombatStyleSkill || skill.combatStyleSource || (skill.id && skill.id.startsWith('combat_style_')));
                                    const isPassiveSkill = skill.type === SkillType.PASSIVE || (skill.type as string) === '패시브';
                                    const displayMp = isPassiveSkill ? 0 : (skill.mpCost || 0);
                                    const mpCheck = isPassiveSkill ? { isAllowed: true } : checkSkillParticipantsMp(skill, player, companion);
                                    const isMpEnough = mpCheck.isAllowed && currentMp >= displayMp;

                                    const weaponCheck = checkSkillWeaponRequirement(companion, skill);
                                    const isWeaponAllowed = weaponCheck.isAllowed;
                                    const isUsable = isWeaponAllowed && isMpEnough;

                                    const sElem = skill.shinryokuType || companion.shinryokuType || '무속성';
                                    const sElemCfg = SHINRYOKU_UI_CONFIG[sElem] || SHINRYOKU_UI_CONFIG.default;

                                    return (
                                        <button
                                            key={skill.id || `${skill.name}_${idx}`}
                                            type="button"
                                            disabled={!isUsable}
                                            onClick={() => {
                                                if (!isMpEnough) return;
                                                if (!isWeaponAllowed) {
                                                    alert(weaponCheck.reason || '특화 무기를 착용해야만 사용할 수 있는 기술입니다.');
                                                    return;
                                                }
                                                onSelectSkill(skill);
                                            }}
                                            className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col justify-between gap-1.5 group relative shadow-md ${
                                                !isMpEnough
                                                    ? 'bg-slate-950/50 border-slate-800/80 opacity-50 cursor-not-allowed'
                                                    : !isWeaponAllowed
                                                    ? 'bg-slate-950/70 border-red-900/40 opacity-75'
                                                    : isCombatStyle
                                                    ? 'bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border-amber-500/40 hover:border-amber-400 hover:bg-slate-850'
                                                    : 'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-900 border-slate-700/80 hover:border-indigo-400 hover:bg-slate-850'
                                            } active:scale-99`}
                                        >
                                            {/* 상단: 아이콘 + 이름 + 마력 소모량 */}
                                            <div className="flex items-start gap-2.5 w-full">
                                                {/* 스킬 이미지 또는 아이콘 */}
                                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                                                    {skill.imageUrl ? (
                                                        <img 
                                                            src={skill.imageUrl} 
                                                            alt={skill.name} 
                                                            referrerPolicy="no-referrer" 
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                                                        />
                                                    ) : (
                                                        <Zap size={18} className={isUsable ? 'text-amber-400' : 'text-slate-600'} />
                                                    )}
                                                </div>

                                                {/* 이름 및 속성 배지 */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                                        <span className={`font-bold text-xs sm:text-sm break-words leading-snug ${
                                                            !isMpEnough
                                                                ? 'text-slate-500'
                                                                : !isWeaponAllowed
                                                                ? 'text-red-400'
                                                                : isCombatStyle
                                                                ? 'text-amber-300 group-hover:text-amber-200'
                                                                : 'text-slate-100 group-hover:text-indigo-300'
                                                        }`}>
                                                            {skill.name}
                                                        </span>

                                                        {/* 마력 소모량 표시 */}
                                                        <span className={`text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${
                                                            !isMpEnough && !isPassiveSkill
                                                                ? 'text-red-400 bg-red-950/70 border-red-800'
                                                                : 'text-cyan-300 bg-cyan-950/50 border-cyan-800/60'
                                                        }`}>
                                                            MP {displayMp.toLocaleString()}
                                                            {!isMpEnough && !isPassiveSkill && ' (부족)'}
                                                        </span>
                                                    </div>

                                                    {/* 속성 및 계열 배지 */}
                                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                        {skill.type !== SkillType.BUFF && skill.type !== SkillType.DEBUFF && skill.type !== SkillType.PASSIVE && (
                                                            <span className={`text-[8.5px] sm:text-[9.5px] px-1.5 py-0.5 rounded border font-bold flex items-center gap-1 shrink-0 ${sElemCfg.bg} ${sElemCfg.text} ${sElemCfg.border}`}>
                                                                <Sparkles size={9} />
                                                                <span>속성: {sElem}</span>
                                                            </span>
                                                        )}

                                                        {isCombatStyle && (
                                                            <span className="text-[8.5px] sm:text-[9.5px] text-amber-300 bg-amber-950/60 border border-amber-700/60 px-1.5 py-0.5 rounded font-bold shrink-0">
                                                                {skill.combatStyleSource ? `전투계열 [${skill.combatStyleSource}]` : '전투계열'}
                                                            </span>
                                                        )}

                                                        {isRes && (
                                                            <span className="text-[8.5px] sm:text-[9.5px] text-amber-400 bg-amber-950/80 border border-amber-600 px-1.5 py-0.5 rounded font-bold flex items-center gap-1 shrink-0 animate-pulse">
                                                                <Star size={9} />
                                                                <span>부활</span>
                                                            </span>
                                                        )}

                                                        {skill.tier && (
                                                            <span className="text-[8px] sm:text-[9px] text-slate-400 bg-slate-950 px-1 rounded border border-slate-800 font-mono">
                                                                {skill.tier}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 설명글 */}
                                            {skill.description && (
                                                <p className="text-[10px] sm:text-xs text-slate-400 leading-relaxed mt-1 line-clamp-2 group-hover:text-slate-300 transition-colors">
                                                    {skill.description}
                                                </p>
                                            )}

                                            {/* 버프 스킬 상태이상 해제 정보 및 효과 상세 표시 */}
                                            {(() => {
                                                const cleanseAilments = getCleanseAilments(skill);
                                                const buffSummaries = getBuffEffectSummaries(skill);
                                                if (cleanseAilments.length === 0 && buffSummaries.length === 0) return null;
                                                return (
                                                    <div className="mt-1 space-y-1">
                                                        {cleanseAilments.length > 0 && (
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="text-[9px] sm:text-[10px] font-bold text-teal-300 bg-teal-950/90 px-2 py-0.5 rounded border border-teal-500/60 flex items-center gap-1 shadow-sm">
                                                                    <Sparkles size={11} className="text-teal-400 shrink-0" />
                                                                    <span>해제 상태이상:</span>
                                                                    <span className="text-teal-100 font-extrabold">
                                                                        {cleanseAilments.map(a => `[${a}]`).join(' ')}
                                                                    </span>
                                                                </span>
                                                            </div>
                                                        )}
                                                        {buffSummaries.length > 0 && (
                                                            <div className="flex items-center gap-1 flex-wrap">
                                                                {buffSummaries.map((sum, sIdx) => (
                                                                    <span key={sIdx} className="text-[8.5px] sm:text-[9.5px] font-medium text-emerald-300 bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-500/40">
                                                                        {sum}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* 하단 세부 지표 (대상 / 위력 / 성공률) */}
                                            <div className="flex items-center justify-between text-[9px] sm:text-[10px] pt-1 border-t border-slate-800/80 text-slate-400 mt-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span>대상: <strong className="text-slate-200">{skill.targetType === 'aoe' ? '광역' : skill.targetType === 'ally' ? '아군' : '단일'}</strong></span>
                                                    {skill.powerRatio && (
                                                        <span>위력: <strong className="text-amber-400 font-mono">{skill.powerRatio}%</strong></span>
                                                    )}
                                                    {skill.type === SkillType.DEBUFF && (
                                                        <span className="text-purple-300">
                                                            기본 성공률: ~{calculateDebuffSuccessRate(companion.stats || {}, { ctrl: 10 } as any)}%
                                                        </span>
                                                    )}
                                                </div>

                                                {!isWeaponAllowed && (
                                                    <span className="text-red-400 font-bold flex items-center gap-0.5">
                                                        <AlertCircle size={10} />
                                                        <span>특화무기 필요</span>
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/60 text-xs">
                                선택한 분류에 사용할 수 있는 스킬이 없습니다.
                            </div>
                        )}
                    </div>

                </div>

                {/* 모달 하단 닫기 바 */}
                <div className="p-2.5 sm:p-3 border-t border-slate-800 bg-slate-950/70 flex justify-end shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold rounded-xl transition-all shadow active:scale-95"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};
export default CompanionCommandModal;
