import React, { useState, memo } from 'react';
import { Skill, ClassTier, Character, Companion, SkillType } from '../../types';
import { Zap, X, Sword, Shield, Skull, Sparkles, Star, User, Crosshair, Award, Users, Crown } from 'lucide-react';
import { SHINRYOKU_UI_CONFIG } from '../../constants';
import { calculateDebuffSuccessRate } from '../../utils';

// Internal TIER_ICONS config
const TIER_ICONS: Record<string, any> = {
    [ClassTier.NONE]: Award,
    [ClassTier.FIRST]: Zap,
    [ClassTier.SECOND]: Shield,
    [ClassTier.LAST]: Crosshair,
    [ClassTier.FINAL]: Crown,
    [ClassTier.BOND]: Users,
    'COMBAT_STYLE': Sword
};

const BASE_ICONS = [
  { name: 'Sword', icon: Sword },
  { name: 'Zap', icon: Zap },
  { name: 'Shield', icon: Shield },
  { name: 'Skull', icon: Skull },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Heart', icon: HeartComp },
  { name: 'Wind', icon: WindComp },
];

function HeartComp(props: any) { return <span {...props}>❤️</span>; }
function WindComp(props: any) { return <span {...props}>🌀</span>; }

// Weapon requirement check helper mirroring existing code logic
export function checkSkillWeaponRequirement(player: Character | Companion, skill: Skill): { isAllowed: boolean; reason?: string } {
    const s = skill as any;
    if (!s.reqWeaponType) return { isAllowed: true };
    const pEquipped = (player as any).equipment?.weapon;
    const eqType = pEquipped?.itemData?.weaponType || pEquipped?.weaponType;
    if (!eqType || eqType !== s.reqWeaponType) {
        return { 
            isAllowed: false, 
            reason: `이 기술은 특화 무기 [${s.reqWeaponType}] 착용이 필수입니다. (현재: ${eqType || '미착용'})` 
        };
    }
    return { isAllowed: true };
}

// CombatUtils stub mirroring system behaviors for resurrect detection
const CombatUtils = {
    isResurrectionSkill: (skill: Skill) => {
        return !!(skill.name?.includes('부활') || skill.description?.includes('부활') || (skill as any).isResurrect);
    }
};

const STAT_DISPLAY_NAMES: Record<string, string> = {
    'str': '근력',
    'int': '지능',
    'wis': '지혜',
    'def': '방어력',
    'agi': '민첩',
    'ctrl': '제어력',
    'maxHp': '최대 체력',
    'maxMp': '최대 마나',
    'STR': '근력',
    'INT': '지능',
    'WIS': '지혜',
    'DEF': '방어력',
    'AGI': '민첩',
    'CTRL': '제어력',
    'MaxHP': '최대 체력',
    'MaxMP': '최대 마나',
    'PAtk': '물리공격력',
    'MAtk': '마법공격력',
    'CritChance': '치명타율',
    'CritDamage': '치명타 피해량',
    'CritDmgResist': '치명타 피해 감소',
    'CritResist': '치명타 저항',
    'StatusResist': '상태이상 저항',
    'ManaShield': '마나 쉴드',
    'Acc': '물리명중률',
    'MAcc': '마법명중률',
    'Eva': '물리회피율',
    'MEva': '마법회피율'
};

// 해제 가능한 상태이상 목록 추출 헬퍼
export function getCleanseAilments(skill: Skill): string[] {
    const list: string[] = [];

    // 1) buffEffects 배열 검사
    if (Array.isArray(skill.buffEffects)) {
        skill.buffEffects.forEach(ef => {
            if (!ef) return;
            const isCleanse = ef.type === 'CLEANSE' || ef.type === '정화' || ef.type === '상태이상해제';
            if (isCleanse) {
                if (Array.isArray(ef.ailments)) {
                    ef.ailments.forEach((a: any) => {
                        if (typeof a === 'string') {
                            const trimmed = a.trim();
                            if (trimmed && trimmed !== '없음' && !list.includes(trimmed)) {
                                list.push(trimmed);
                            }
                        }
                    });
                } else if (typeof ef.ailment === 'string' && ef.ailment) {
                    const trimmed = ef.ailment.trim();
                    if (trimmed && trimmed !== '없음' && !list.includes(trimmed)) {
                        list.push(trimmed);
                    }
                }
            }
        });
    }

    // 2) effectFormula 또는 description 정규식 파싱
    const targetTexts = [skill.effectFormula, skill.description, (skill as any).formulaOverride].filter(Boolean) as string[];
    targetTexts.forEach(text => {
        // 형태: 상태이상 해제(기절,화상,빙결)
        const match = text.match(/상태이상\s*해제\s*\(([^)]+)\)/);
        if (match && match[1]) {
            const splitted = match[1].split(/[,/|·\s]+/).map(s => s.trim()).filter(s => s && s !== '없음');
            splitted.forEach(a => {
                if (!list.includes(a)) list.push(a);
            });
        }
        // 형태: [해제: 기절, 화상] 또는 [상태이상 해제: ...]
        const match2 = text.match(/\[(?:해제|정화|상태이상\s*해제):\s*([^\]]+)\]/);
        if (match2 && match2[1]) {
            const splitted = match2[1].split(/[,/|·\s]+/).map(s => s.trim()).filter(s => s && s !== '없음');
            splitted.forEach(a => {
                if (!list.includes(a)) list.push(a);
            });
        }
    });

    return list;
}

// 버프 효과 요약 텍스트 추출 헬퍼
export function getBuffEffectSummaries(skill: Skill): string[] {
    const summaries: string[] = [];
    if (Array.isArray(skill.buffEffects)) {
        skill.buffEffects.forEach(ef => {
            if (!ef) return;
            if (ef.type === 'HP_RECOV') {
                summaries.push(`체력 회복 +${ef.value || 0}%`);
            } else if (ef.type === 'MP_RECOV') {
                summaries.push(`마나 회복 +${ef.value || 0}%`);
            } else if (ef.type === 'STAT_BOOST') {
                const statName = STAT_DISPLAY_NAMES[ef.targetStat] || ef.targetStat || '능력치';
                summaries.push(`${statName} +${ef.value || 0}%`);
            } else if (ef.type === 'ELEMENTAL_DMG_BOOST') {
                summaries.push(`${ef.targetElement || '속성'} 피해 +${ef.value || 0}%`);
            } else if (ef.type === 'ELEMENTAL_RES_BOOST') {
                summaries.push(`${ef.targetElement || '속성'} 저항 +${ef.value || 0}%`);
            } else if (ef.type === 'MANA_SHIELD') {
                summaries.push(`마나 쉴드 +${ef.value || 0}%`);
            } else if (ef.type === 'RESURRECTION') {
                summaries.push(`부활 (${ef.value || 0}%)`);
            }
        });
    }
    return summaries;
}

interface SkillSelectorProps {
    skills: Skill[];
    currentTier: ClassTier;
    player?: Character | Companion;
    onSelect: (skill: Skill) => void;
    onClose: () => void;
    isClassTrial?: boolean;
}

export const SkillSelector = memo(({ 
    skills, 
    currentTier, 
    player, 
    onSelect, 
    onClose,
    isClassTrial = false
}: SkillSelectorProps) => {
    // 만약 시련 전투인데 현재 티어가 인연(BOND)이라면 기본 없음(NONE)이나 다른 티어로 대체
    const initialTier = (isClassTrial && currentTier === ClassTier.BOND) ? ClassTier.NONE : currentTier;
    const [activeTier, setActiveTier] = useState<ClassTier | 'COMBAT_STYLE'>(initialTier);
    
    // 시련 전투(isClassTrial)일 때는 인연 탭(BOND)을 제외시킴
    const tiers: (ClassTier | 'COMBAT_STYLE')[] = [
        ClassTier.NONE, 
        ClassTier.FIRST, 
        ClassTier.SECOND, 
        ClassTier.LAST, 
        ClassTier.FINAL, 
        ...(isClassTrial ? [] : [ClassTier.BOND]),
        'COMBAT_STYLE'
    ];
    
    const filteredSkills = skills.filter(s => {
        if (!s) return false;
        if (s.type === SkillType.PASSIVE) return false;

        // 시련 전투(isClassTrial) 중에는 모든 인연 스킬 제외
        if (isClassTrial && s.isBondSkill) {
            return false;
        }

        // 전투계열 스킬은 전투계열 탭으로 분류
        if (s.isCombatStyleSkill || s.combatStyleSource || (s.id && s.id.startsWith('combat_style_'))) {
            return activeTier === 'COMBAT_STYLE';
        }

        // 인연 스킬은 무조건 인연 탭으로 분류
        if (s.isBondSkill) {
            return activeTier === ClassTier.BOND;
        }

        if (activeTier === 'COMBAT_STYLE') {
            return false;
        }

        const skillTierRaw = (s.tier || '').toLowerCase().replace(/\s/g, '');
        let keywords: string[] = [];
        
        if (activeTier === ClassTier.NONE) keywords = ['none', '없음'];
        else if (activeTier === ClassTier.FIRST) keywords = ['first', '1', '퍼스트', '초급'];
        else if (activeTier === ClassTier.SECOND) keywords = ['second', '2', '세컨드', '중급'];
        else if (activeTier === ClassTier.LAST) keywords = ['last', '3', '라스트', '상급'];
        else if (activeTier === ClassTier.FINAL) keywords = ['final', '4', '파이널', '최상급'];
        else if (activeTier === ClassTier.BOND) keywords = ['bond', '인연'];
        
        return keywords.some(k => skillTierRaw.includes(k));
    });

    const getTabLabel = (tier: ClassTier | 'COMBAT_STYLE') => {
        if (tier === 'COMBAT_STYLE') return '전투계열';
        if (tier === ClassTier.BOND) return '인연';
        return tier.toString().split(' ')[0];
    };

    return (
        <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-3 md:p-4 overflow-hidden"
            onClick={onClose}
        >
            <div 
                className="w-full max-w-md bg-slate-900 border border-indigo-500 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-950/50 rounded-t-xl shrink-0">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <h3 className="font-bold text-indigo-400 flex items-center text-sm md:text-base">
                            <Zap size={18} className="mr-2 shrink-0 text-amber-400"/> 기술 일람
                        </h3>
                        {player && (
                            <span className="text-[10px] text-slate-400 font-mono truncate">
                                ({player.name})
                            </span>
                        )}
                    </div>
                    <button 
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClose();
                        }} 
                        aria-label="닫기"
                        className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-full transition-all cursor-pointer relative z-20 flex items-center justify-center shrink-0 active:scale-95"
                        style={{ minWidth: '44px', minHeight: '44px' }}
                    >
                        <X size={20}/>
                    </button>
                </div>

                {/* Tab selector */}
                <div className="flex bg-slate-950 border-b border-slate-800 overflow-x-auto no-scrollbar shrink-0">
                    {tiers.map(tier => {
                        const Icon = TIER_ICONS[tier] || User;
                        const isActive = activeTier === tier;
                        return (
                            <button 
                                key={tier}
                                onClick={() => setActiveTier(tier)}
                                className={`flex-1 py-3 px-2 text-[10px] md:text-xs font-bold flex flex-col items-center justify-center transition-all border-b-2 min-w-[3.8rem] md:min-w-[4rem] shrink-0 ${isActive ? 'text-amber-400 border-amber-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/50'}`}
                                style={{ minHeight: '48px' }}
                            >
                                <Icon size={14} className={`mb-1 ${isActive ? 'text-amber-500' : 'opacity-50'}`}/>
                                {getTabLabel(tier)}
                            </button>
                        )
                    })}
                </div>

                {/* List contents */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-900/50">
                    {filteredSkills.length > 0 ? (
                        filteredSkills.map((skill, idx) => {
                            const isRes = CombatUtils.isResurrectionSkill(skill);
                            const isCombatStyle = !!(skill.isCombatStyleSkill || skill.combatStyleSource || (skill.id && skill.id.startsWith('combat_style_')));
                            const currentMp = player?.stats?.mp ?? 0;
                            let isMpEnough = currentMp >= (skill.mpCost || 0);
                            
                            if (skill.isBondSkill && (skill as any).companionId) {
                                const comp = player && 'companions' in (player as any) ? (player as Character).companions.find(c => c.id === (skill as any).companionId) : null;
                                if (comp && (comp.stats?.mp || 0) < (skill.mpCost || 0)) {
                                    isMpEnough = false;
                                }
                            }
                            
                            const weaponCheck = player ? checkSkillWeaponRequirement(player, skill) : { isAllowed: true };
                            const isWeaponAllowed = weaponCheck.isAllowed;
                            const isUsable = isWeaponAllowed && isMpEnough;

                            return (
                                <button 
                                    key={idx} 
                                    disabled={!isUsable}
                                    onClick={() => {
                                        if (!isMpEnough) return;
                                        if (!isWeaponAllowed) {
                                            alert(weaponCheck.reason || '특화 무기를 착용해야만 사용할 수 있는 스킬입니다.');
                                            return;
                                        }
                                        onSelect(skill);
                                    }} 
                                    className={`w-full text-left border p-3 rounded-xl group transition-all shadow-sm ${
                                        !isMpEnough
                                            ? 'bg-slate-950/60 border-slate-800/80 text-slate-500 opacity-40 cursor-not-allowed'
                                            : !isWeaponAllowed 
                                            ? 'border-red-900/40 bg-slate-950/90 opacity-75' 
                                            : isRes 
                                            ? 'border-amber-500/50 bg-slate-950 hover:bg-amber-950/20' 
                                            : isCombatStyle 
                                            ? 'border-amber-700/60 hover:border-amber-500 bg-gradient-to-r from-amber-950/20 to-slate-950' 
                                            : 'bg-slate-950 hover:bg-indigo-900/20 border-slate-800'
                                    }`}
                                    style={{ minHeight: '56px' }}
                                >
                                    <div className="flex gap-3 items-start">
                                        {/* Skill icon */}
                                        <div className="shrink-0">
                                            {skill.imageUrl ? (
                                                <div className="w-9 h-9 rounded bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
                                                    <img src={skill.imageUrl} alt={skill.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className={`w-9 h-9 rounded bg-slate-900 border flex items-center justify-center transition-colors ${
                                                    !isMpEnough
                                                        ? 'border-slate-800 text-slate-600'
                                                        : !isWeaponAllowed 
                                                        ? 'border-red-900/60 text-red-400' 
                                                        : isCombatStyle 
                                                        ? 'border-amber-700 text-amber-400 group-hover:text-amber-300' 
                                                        : 'border-slate-800 text-slate-400 group-hover:text-amber-400'
                                                }`}>
                                                    {(() => {
                                                        const found = BASE_ICONS.find(bi => bi.name === skill.icon);
                                                        const IconComp = found ? found.icon : (isCombatStyle ? Crosshair : skill.type === SkillType.PHYSICAL ? Sword : skill.type === SkillType.MAGIC ? Zap : skill.type === SkillType.BUFF ? Shield : skill.type === SkillType.DEBUFF ? Skull : Sparkles);
                                                        return <IconComp size={16} />;
                                                    })()}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1 gap-1">
                                                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                                    <span className={`font-bold transition-colors text-xs md:text-sm truncate ${
                                                        !isMpEnough
                                                            ? 'text-slate-500'
                                                            : !isWeaponAllowed 
                                                            ? 'text-slate-400' 
                                                            : isRes 
                                                            ? 'text-amber-400 group-hover:text-amber-300' 
                                                            : isCombatStyle 
                                                            ? 'text-amber-300 group-hover:text-amber-200' 
                                                            : 'text-slate-200 group-hover:text-indigo-300'
                                                    }`}>
                                                        {skill.name}
                                                    </span>
                                                    {(() => {
                                                        if (skill.type === SkillType.BUFF || skill.type === SkillType.DEBUFF || skill.type === SkillType.PASSIVE) return null;
                                                        const sElem = skill.shinryokuType || (player as any)?.shinryokuType || '무속성';
                                                        const sElemCfg = SHINRYOKU_UI_CONFIG[sElem] || SHINRYOKU_UI_CONFIG.default;
                                                        return (
                                                            <span className={`text-[8px] md:text-[9px] px-1.5 py-0.5 rounded border font-bold shrink-0 flex items-center gap-1 ${sElemCfg.bg} ${sElemCfg.text} ${sElemCfg.border} shadow-sm`}>
                                                                <Sparkles size={9} />
                                                                <span>속성: {sElem}</span>
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                                {(() => {
                                                    const isPassiveSkill = skill.type === SkillType.PASSIVE || (skill.type as string) === '패시브';
                                                    const displayMp = isPassiveSkill ? 0 : (skill.mpCost || 0);
                                                    return (
                                                        <span className={`text-[10px] md:text-xs font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                                                            !isMpEnough && !isPassiveSkill
                                                                ? 'text-red-400 bg-red-950/60 border-red-800/80'
                                                                : 'text-blue-400 bg-blue-950/30 border-blue-900/30'
                                                        }`}>
                                                            {skill.tier === ClassTier.BOND ? `MP ${displayMp}(각각)` : `MP ${displayMp}`}
                                                            {!isMpEnough && !isPassiveSkill && ' (부족)'}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            <p className="text-[10px] md:text-xs text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">{skill.description}</p>
                                            
                                            {/* [NEW] 버프 스킬 상태이상 해제 정보 및 효과 상세 표시 */}
                                            {(() => {
                                                const cleanseAilments = getCleanseAilments(skill);
                                                const buffSummaries = getBuffEffectSummaries(skill);
                                                if (cleanseAilments.length === 0 && buffSummaries.length === 0) return null;
                                                return (
                                                    <div className="mt-1.5 space-y-1">
                                                        {cleanseAilments.length > 0 && (
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="text-[9px] md:text-[10px] font-bold text-teal-300 bg-teal-950/90 px-2 py-0.5 rounded border border-teal-500/60 flex items-center gap-1 shadow-sm">
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
                                                                    <span key={sIdx} className="text-[9px] font-medium text-emerald-300 bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-500/40">
                                                                        {sum}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            <div className="flex flex-wrap justify-between items-center mt-1.5 gap-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-[9px] text-slate-500">대상: {skill.targetType === 'aoe' ? '광역' : '단일'}</span>
                                                    {skill.powerRatio && (
                                                        <span className="text-[9px] text-amber-400 font-mono font-bold">
                                                            위력: {skill.powerRatio}%
                                                        </span>
                                                    )}
                                                    {skill.type === SkillType.DEBUFF && (
                                                        <span className="text-[9px] text-purple-300 font-bold bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-800/60">
                                                            기본 성공률: ~{calculateDebuffSuccessRate((player as any)?.stats || {}, { ctrl: 10 } as any)}% (적 저항 스탯에 따라 변동)
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {!isMpEnough ? (
                                                    <span className="text-[8px] md:text-[9px] text-red-400 bg-red-950/80 border border-red-800 px-1.5 py-0.5 rounded font-bold leading-none">
                                                        MP 부족
                                                    </span>
                                                ) : !isWeaponAllowed ? (
                                                    <span className="text-[8px] md:text-[9px] text-red-400 bg-red-950/80 border border-red-800 px-1.5 py-0.5 rounded font-bold leading-none">
                                                        특화무기 필요
                                                    </span>
                                                ) : isRes ? (
                                                    <span className="text-[9px] text-amber-500 border border-amber-900 px-1 rounded flex items-center gap-1 font-bold animate-pulse"><Star size={8}/> 부활</span>
                                                ) : isCombatStyle ? (
                                                    <span className="text-[9px] text-amber-400 border border-amber-800 bg-amber-950/40 px-1.5 py-0.5 rounded font-bold">
                                                        {skill.combatStyleSource ? `전투계열 [${skill.combatStyleSource}]` : '전투계열 고유기'}
                                                    </span>
                                                ) : (
                                                    <>
                                                        {skill.type === SkillType.BUFF && <span className="text-[9px] text-green-500 border border-green-900 px-1 rounded">버프</span>}
                                                        {skill.type === SkillType.DEBUFF && <span className="text-[9px] text-purple-500 border border-purple-900 px-1 rounded">디버프</span>}
                                                    </>
                                                )}
                                            </div>

                                            {!isWeaponAllowed && weaponCheck.reason && (
                                                <div className="text-[8px] md:text-[9px] text-red-400/90 mt-1 italic font-medium bg-red-950/50 p-1 rounded border border-red-900/40 leading-snug">
                                                    {weaponCheck.reason}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                            <p className="text-xs italic">해당 탭의 스킬이 없습니다.</p>
                        </div>
                    )}
                </div>

                {/* Footer close button for mobile optimization */}
                <div className="p-3 border-t border-slate-800 bg-slate-950/80 shrink-0">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClose();
                        }}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                        <X size={16} />
                        <span>닫기</span>
                    </button>
                </div>
            </div>
        </div>
    );
});
