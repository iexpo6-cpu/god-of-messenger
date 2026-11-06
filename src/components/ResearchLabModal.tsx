import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Character, Companion, Skill, BondSkill, ClassTier, SkillType, JobType 
} from '../types';
import { 
    X, Sparkles, TrendingUp, Zap, Crown, Flame, Star, Snowflake, Droplets, Wind, Mountain, 
    Eclipse, Hammer, Sun, Moon, Leaf, Sword, Shield, Skull, 
    Heart, BookOpen, Waves, CheckCircle2, AlertCircle, 
    DollarSign, Compass, Crosshair, Feather, Gem, Lock, Clock,
    AlertTriangle, RefreshCw, Trash2, FlaskConical, Award, ArrowUpCircle, UserCheck, ChevronRight, Sliders, HelpCircle, User
} from 'lucide-react';
import { SkillCraftHelpModal } from './SkillCraftHelpModal';
import { getSkillTierRank } from './CombatVFX';
import { 
    calculateTotalLabLevel, calculateResearcherBonus, getResearcherRankTitle, 
    getResearcherTierByLevel, getNextResearcherPromotionLevel, RESEARCHER_TIER_NAMES,
    getNextResearcherPromotionWisReq, calculateFinalStats
} from '../utils';
import { 
    calculateSkillResearchTimeReduction, 
    executeSkillResearch, 
    executeSkillLimitBreak,
    executeMultiSkillResearch
} from '../services/skillResearchService';
import { getFinalSkillSlotsUsage, isFinalTierSkill } from '../services/finalClassLevelScalingService';
import ActionResultModal, { ResultData } from './ActionResultModal';

const GRADIENT_PRESETS = [
    { name: '오로라 스펙트럼', colors: '#ff007f, #00f5ff, #7000ff', value: 'linear-gradient(135deg, #ff007f, #00f5ff, #7000ff)' },
    { name: '마그마 익스플로전', colors: '#ff0000, #ff7700, #ffdd00', value: 'linear-gradient(135deg, #ff0000, #ff7700, #ffdd00)' },
    { name: '네온 바이올렛', colors: '#00f5ff, #ff00ff, #39ff14', value: 'linear-gradient(135deg, #00f5ff, #ff00ff, #39ff14)' },
    { name: '보이드 다크니스', colors: '#8a2be2, #00ffff, #000000', value: 'linear-gradient(135deg, #8a2be2, #00ffff, #000000)' },
    { name: '빙결 오로라', colors: '#00ffff, #0072ff, #7000ff', value: 'linear-gradient(135deg, #00ffff, #0072ff, #7000ff)' },
    { name: '벚꽃 연풍', colors: '#ff758c, #ff7eb3, #ffffff', value: 'linear-gradient(135deg, #ff758c, #ff7eb3, #ffffff)' },
    { name: '황금 로열', colors: '#ffe259, #ffa751, #ff416c', value: 'linear-gradient(135deg, #ffe259, #ffa751, #ff416c)' },
    { name: '칠흑 혈염', colors: '#ff0055, #4a000d, #1a1a1a', value: 'linear-gradient(135deg, #ff0055, #4a000d, #1a1a1a)' },
    { name: '에메랄드 나이트', colors: '#11998e, #38ef7d, #00f5ff', value: 'linear-gradient(135deg, #11998e, #38ef7d, #00f5ff)' },
    { name: '은하수 코스모스', colors: '#833ab4, #fd1d1d, #fcb045', value: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' },
];

export const BASE_ICONS = [
    { name: 'Sword', icon: Sword, label: '물리' },
    { name: 'Zap', icon: Zap, label: '마법' },
    { name: 'Shield', icon: Shield, label: '방어' },
    { name: 'Skull', icon: Skull, label: '상태이상' },
    { name: 'BookOpen', icon: BookOpen, label: '패시브' },
    { name: 'Flame', icon: Flame, label: '화염' },
    { name: 'Sparkles', icon: Sparkles, label: '신성' },
    { name: 'Heart', icon: Heart, label: '치유' },
    { name: 'Waves', icon: Waves, label: '빙결' },
    { name: 'Wind', icon: Wind, label: '바람' },
    { name: 'Sun', icon: Sun, label: '태양' },
    { name: 'Moon', icon: Moon, label: '달' },
    { name: 'Leaf', icon: Leaf, label: '자연' },
    { name: 'Crown', icon: Crown, label: '패기' },
    { name: 'Crosshair', icon: Crosshair, label: '사격' },
    { name: 'Gem', icon: Gem, label: '보석' },
    { name: 'Feather', icon: Feather, label: '신속' },
    { name: 'Compass', icon: Compass, label: '탐색' }
];

export type LabTab = 'research' | 'limit_break' | 'forget' | 'researchers';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    character: Character;
    onSkillResearch: (skillIndex: number, targetId: string) => void;
    onSkillLimitBreak: (skillIndex: number, targetId: string) => void;
    onUpdateCharacter: (newChar: Character, logMsg?: string) => void;
    facilityLevel?: number;
    initialTargetId?: string;
    initialTab?: LabTab;
}

const TIER_COLORS: Record<string, { badge: string, border: string, text: string }> = {
    [ClassTier.NONE]: { badge: 'bg-slate-800 text-slate-400 border-slate-700', border: 'border-slate-800', text: 'text-slate-300' },
    [ClassTier.FIRST]: { badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800', border: 'border-emerald-900/40', text: 'text-emerald-300' },
    [ClassTier.SECOND]: { badge: 'bg-blue-950/80 text-blue-300 border-blue-800', border: 'border-blue-900/40', text: 'text-blue-300' },
    [ClassTier.LAST]: { badge: 'bg-purple-950/80 text-purple-300 border-purple-800', border: 'border-purple-900/40', text: 'text-purple-300' },
    [ClassTier.FINAL]: { badge: 'bg-amber-950/80 text-amber-300 border-amber-800', border: 'border-amber-900/40', text: 'text-amber-300' },
    [ClassTier.BOND]: { badge: 'bg-pink-950/80 text-pink-300 border-pink-800', border: 'border-pink-900/40', text: 'text-pink-300' },
};

export const ResearchLabModal: React.FC<Props> = ({
    isOpen,
    onClose,
    character,
    onSkillResearch,
    onSkillLimitBreak,
    onUpdateCharacter,
    facilityLevel = 1,
    initialTargetId,
    initialTab = 'research'
}) => {
    const [activeTab, setActiveTab] = useState<LabTab>(initialTab);
    const [targetId, setTargetId] = useState<string>(initialTargetId || 'player');
    const [targetFilter, setTargetFilter] = useState<'all' | 'custom' | 'normal' | 'monster'>('all');
    const [targetSort, setTargetSort] = useState<'level' | 'name' | 'element'>('level');
    const [skillFilter, setSkillFilter] = useState<string>('전체');
    const [selectedSkillName, setSelectedSkillName] = useState<string | null>(null);
    const [skillToForget, setSkillToForget] = useState<any>(null);
    const [showCraftHelp, setShowCraftHelp] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [researchCount, setResearchCount] = useState<number>(1); // 연마 횟수 (1~10회)
    const [processingProgress, setProcessingProgress] = useState<number>(0);
    const [processingMessage, setProcessingMessage] = useState<string>('');

    // Status Toast/Message
    const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' | 'info' } | null>(null);

    const showToast = (text: string, type: 'success' | 'warning' | 'info' = 'info') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 3200);
    };

    // Target Candidates
    const allTargets = useMemo(() => [
        { 
            id: 'player', 
            name: character.name, 
            level: character.level, 
            job: character.job, 
            isPlayer: true, 
            isCustom: false,
            isMonster: false,
            avatar: (character as any).avatar || character.visualUrl, 
            element: character.shinryokuType || '화염계' 
        },
        ...character.companions.map(c => {
            const isMon = !!(c.isMonster || c.monsterData || c.race === '몬스터' || c.race?.includes('Monster'));
            return { 
                id: c.id, 
                name: c.name, 
                level: c.level, 
                job: c.job, 
                isPlayer: false, 
                isCustom: (c as any).isCustom === true,
                isMonster: isMon,
                avatar: (c as any).avatar || c.visualUrl || c.monsterData?.visualUrl, 
                element: c.shinryokuType || '화염계' 
            };
        }),
        ...(character.inactiveCompanions || []).map(c => {
            const isMon = !!(c.isMonster || c.monsterData || c.race === '몬스터' || c.race?.includes('Monster'));
            return { 
                id: c.id, 
                name: c.name, 
                level: c.level, 
                job: c.job, 
                isPlayer: false, 
                isCustom: (c as any).isCustom === true,
                isMonster: isMon,
                avatar: (c as any).avatar || c.visualUrl || c.monsterData?.visualUrl, 
                element: c.shinryokuType || '화염계' 
            };
        })
    ], [character]);

    const filteredTargets = useMemo(() => {
        let list = [...allTargets];
        if (targetFilter === 'custom') {
            list = list.filter(t => t.isPlayer || t.isCustom);
        } else if (targetFilter === 'normal') {
            list = list.filter(t => !t.isPlayer && !t.isMonster && !t.isCustom);
        } else if (targetFilter === 'monster') {
            list = list.filter(t => t.isMonster);
        }

        if (targetSort === 'level') {
            list.sort((a, b) => b.level - a.level);
        } else if (targetSort === 'name') {
            list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        } else if (targetSort === 'element') {
            list.sort((a, b) => (a.element || '').localeCompare(b.element || '', 'ko'));
        }
        return list;
    }, [allTargets, targetFilter, targetSort]);

    const activeTarget = useMemo(() => {
        if (targetId === 'player') return character;
        return character.companions.find(c => c.id === targetId) || character.inactiveCompanions?.find(c => c.id === targetId) || character;
    }, [character, targetId]);

    const isPlayerTarget = targetId === 'player';
    const isCustomCompanion = !isPlayerTarget && ((activeTarget as any).isCustom === true);
    // Customization tabs (vfx, icon, cutin, video) are allowed for Player & Custom Companions only
    const isAllowedToCustomize = isPlayerTarget || isCustomCompanion;

    // Collect skills for active target
    const targetSkills = useMemo(() => {
        if (!activeTarget) return [];
        const normalSkills = (activeTarget.skills || []).map((s, idx) => ({ ...s, originalIndex: idx, isBond: false }));
        const allIndexedBondSkills = (character.bondSkills || []).map((s, idx) => ({ ...s, originalIndex: idx, isBond: true }));
        const bondSkills = isPlayerTarget 
            ? allIndexedBondSkills.filter(s => !s.sourceId || s.sourceId === 'player')
            : allIndexedBondSkills.filter(s => s.sourceId === activeTarget.id || s.companionId === activeTarget.id);
        return [...normalSkills, ...bondSkills];
    }, [activeTarget, isPlayerTarget, character.bondSkills]);

    // Filtered Skills for research/limit_break
    const filteredSkills = useMemo(() => {
        return targetSkills.filter(skill => {
            if (skillFilter === '전체') return true;
            const map: Record<string, string> = {
                '미해방': ClassTier.NONE,
                '퍼스트': ClassTier.FIRST,
                '세컨드': ClassTier.SECOND,
                '라스트': ClassTier.LAST,
                '파이널': ClassTier.FINAL,
                '인연': ClassTier.BOND
            };
            if (skillFilter === '인연') {
                return (skill as any).isBond || skill.tier === ClassTier.BOND;
            }
            if ((skill as any).isBond) {
                return false;
            }
            return skill.tier === map[skillFilter];
        });
    }, [targetSkills, skillFilter]);

    // Auto-select first skill if selectedSkillName not valid
    const currentSelectedSkill = useMemo(() => {
        if (!targetSkills.length) return null;
        if (selectedSkillName) {
            const found = targetSkills.find(s => s.name === selectedSkillName);
            if (found) return found;
        }
        return targetSkills[0];
    }, [targetSkills, selectedSkillName]);

    const skillTierLevel = useMemo(() => {
        if (!currentSelectedSkill) return 1;
        return getSkillTierRank((currentSelectedSkill as any).isBond ? ClassTier.FINAL : currentSelectedSkill.tier);
    }, [currentSelectedSkill]);

    // Effective Lab Level for display and cost calculation
    const calculatedLabLevel = useMemo(() => calculateTotalLabLevel(character.base), [character.base]);
    const labLevel = Math.max(facilityLevel || 1, calculatedLabLevel || 1);
    const researcherBonus = useMemo(() => calculateResearcherBonus(character), [character]);
    const totalDiscountRate = Math.min(0.85, (labLevel * 0.05) + researcherBonus.costDiscount);
    const discountMultiplier = Math.max(0.15, 1 - totalDiscountRate);
    const totalAvailableMana = character.base?.resources?.manaCrystal || 0;

    // 1회당 소요 시간 계산 (스킬 연구: 기본 30분, 한계 돌파: 기본 60분 - 연구원의 숙련도에 따라 단축)
    const { researchMinutes, limitBreakMinutes, reductionRate } = useMemo(
        () => calculateSkillResearchTimeReduction(character),
        [character]
    );

    const handleExecuteResearch = (skillIndex: number, effectiveTargetId: string, count: number = 1) => {
        setProcessingProgress(1);
        setProcessingMessage("스킬의 마력을 동기화하고 연마를 준비하는 중...");
        
        const interval = setInterval(() => {
            setProcessingProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        setProcessingProgress(0);
                        
                        const result = count > 1 
                            ? executeMultiSkillResearch(character, skillIndex, effectiveTargetId, count)
                            : executeSkillResearch(character, skillIndex, effectiveTargetId);

                        if (result.success) {
                            onUpdateCharacter(result.updatedCharacter, result.logMessage);
                            if (result.resultData) {
                                setResultData(result.resultData);
                            } else {
                                showToast(result.logMessage, result.leveledUp ? 'success' : 'info');
                            }
                        } else {
                            if (result.resultData) {
                                setResultData(result.resultData);
                            } else {
                                showToast(result.logMessage, 'warning');
                            }
                        }
                    }, 200);
                    return 100;
                }
                const next = prev + Math.floor(Math.random() * 15) + 8;
                if (next >= 40 && next < 70) {
                    setProcessingMessage("연구원의 조력을 받아 숙련 공식을 심화 연구 중...");
                } else if (next >= 70 && next < 100) {
                    setProcessingMessage("스킬 한계를 보정하여 연마를 최종 정착시키는 중...");
                }
                return Math.min(100, next);
            });
        }, 100);
    };

    const handleExecuteLimitBreak = (skillIndex: number, effectiveTargetId: string) => {
        setProcessingProgress(1);
        setProcessingMessage("스킬 봉인을 해제하고 한계 돌파를 준비하는 중...");
        
        const interval = setInterval(() => {
            setProcessingProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        setProcessingProgress(0);
                        
                        const result = executeSkillLimitBreak(character, skillIndex, effectiveTargetId);
                        if (result.success) {
                            onUpdateCharacter(result.updatedCharacter, result.logMessage);
                            if (result.resultData) {
                                setResultData(result.resultData);
                            } else {
                                showToast(result.logMessage, 'success');
                            }
                        } else {
                            if (result.updatedCharacter !== character) {
                                onUpdateCharacter(result.updatedCharacter, result.logMessage);
                            }
                            if (result.resultData) {
                                setResultData(result.resultData);
                            } else {
                                showToast(result.logMessage, 'warning');
                            }
                        }
                    }, 200);
                    return 100;
                }
                const next = prev + Math.floor(Math.random() * 15) + 8;
                if (next >= 45 && next < 75) {
                    setProcessingMessage("마정석 에너지를 전개하여 최대 레벨 한계를 분쇄 중...");
                } else if (next >= 75 && next < 100) {
                    setProcessingMessage("각인된 영혼 회로의 최대 포텐셜을 강제 승급 중...");
                }
                return Math.min(100, next);
            });
        }, 100);
    };

    // Researcher Lists & Lab Assignment status
    const assignedIdsToLab = useMemo(() => {
        const base = character.base;
        if (!base) return [];
        const labInst = base.layout?.find(inst => inst.type === 'lab');
        if (!labInst) return [];
        const ids: string[] = [];
        if (base.assignments?.[labInst.id]) ids.push(base.assignments[labInst.id]);
        if (base.multiAssignments?.[labInst.id]) {
            base.multiAssignments[labInst.id].forEach(id => { if (!ids.includes(id)) ids.push(id); });
        }
        return ids;
    }, [character.base]);

    const allResearchers = useMemo(() => {
        const list: Companion[] = [];
        const comps = character.inactiveCompanions || [];
        comps.forEach(c => {
            if (c.job === JobType.RESEARCHER || (c.job as string) === '연구원') {
                if (!list.some(item => item.id === c.id)) list.push(c);
            }
        });
        const activeComps = character.companions || [];
        activeComps.forEach(c => {
            if (c.job === JobType.RESEARCHER || (c.job as string) === '연구원') {
                if (!list.some(item => item.id === c.id)) list.push(c);
            }
        });
        return list;
    }, [character]);

    const nonResearchers = useMemo(() => {
        const comps = character.inactiveCompanions || [];
        return comps.filter(c => !c.isMonster && !c.monsterData && c.race !== '몬스터' && (c.job === JobType.UNEMPLOYED || !c.job || (c.job as string) === '무직'));
    }, [character]);

    // 동료 연구원 승급 처리 핸들러
    const handlePromoteResearcher = (targetComp: Companion) => {
        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        const targetObj = (newChar.inactiveCompanions || []).find(c => c.id === targetComp.id) || 
                          (newChar.companions || []).find(c => c.id === targetComp.id) || null;

        if (!targetObj) return;

        const currentLevel = targetObj.professions?.research?.level || 1;
        const currentTier = targetObj.researcherTier || getResearcherTierByLevel(currentLevel);
        const nextTier = currentTier + 1;

        if (nextTier > 5) {
            showToast('이미 최고 등급의 연구원입니다.', 'warning');
            return;
        }

        const reqWis = getNextResearcherPromotionWisReq(currentTier);
        const finalWis = calculateFinalStats(targetObj).finalStats.wis || 10;
        if (reqWis !== null && finalWis < reqWis) {
            showToast(`승급에 필요한 지혜(WIS) 스탯이 부족합니다! (필요 WIS: ${reqWis}, 현재: ${finalWis})`, 'warning');
            return;
        }

        targetObj.researcherTier = nextTier;
        const newTitle = RESEARCHER_TIER_NAMES[nextTier] || '연구원';
        
        onUpdateCharacter(newChar, `[연구소] ${targetObj.name} 연구원이 [${newTitle}]으로 승급했습니다!`);
        showToast(`${targetObj.name} 연구원이 [${newTitle}]으로 승급했습니다!`, 'success');
    };

    // 거주민을 연구원으로 지정/전직 처리 핸들러 (무직 전용)
    const handleAssignAsResearcher = (targetComp: Companion) => {
        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        const comp = (newChar.inactiveCompanions || []).find(c => c.id === targetComp.id) || 
                     (newChar.companions || []).find(c => c.id === targetComp.id);

        if (!comp) return;

        if (comp.job && comp.job !== JobType.UNEMPLOYED && (comp.job as string) !== '무직') {
            showToast('무직인 동료만 연구원으로 지정할 수 있습니다.', 'warning');
            return;
        }

        comp.job = JobType.RESEARCHER;
        if (!comp.professions) comp.professions = {};
        if (!comp.professions.research) {
            comp.professions.research = { level: 1, exp: 0, maxExp: 100 };
        }
        comp.researcherTier = 1;

        const labInst = newChar.base?.layout?.find(inst => inst.type === 'lab');
        if (labInst && newChar.base) {
            if (!newChar.base.multiAssignments) newChar.base.multiAssignments = {};
            if (!newChar.base.multiAssignments[labInst.id]) newChar.base.multiAssignments[labInst.id] = [];
            if (!newChar.base.multiAssignments[labInst.id].includes(comp.id)) {
                newChar.base.multiAssignments[labInst.id].push(comp.id);
            }
            if (!newChar.base.assignments) newChar.base.assignments = {};
            if (!newChar.base.assignments[labInst.id]) {
                newChar.base.assignments[labInst.id] = comp.id;
            }
        }

        onUpdateCharacter(newChar, `[연구소] ${comp.name} 동료가 [연구원] 직업으로 지정되었습니다.`);
        showToast(`${comp.name} 동료가 연구원으로 지정되었습니다.`, 'success');
    };

    const getSkillCosts = (skill: Skill, mode: 'research' | 'limit_break') => {
        const tierMultipliers: Record<string, number> = {
            [ClassTier.NONE]: 1,
            [ClassTier.FIRST]: 3,
            [ClassTier.SECOND]: 5,
            [ClassTier.LAST]: 10,
            [ClassTier.FINAL]: 50,
            [ClassTier.BOND]: 150
        };
        const skillTier = (skill as any).isBond ? ClassTier.BOND : skill.tier;
        const tierMult = tierMultipliers[skillTier] || tierMultipliers[skill.tier] || 1;

        if (mode === 'research') {
            return {
                gold: Math.max(1, Math.floor(Math.max(1, skill.level) * 400 * tierMult * discountMultiplier)),
                mana: Math.max(1, Math.floor(Math.max(1, skill.level) * 1 * tierMult * discountMultiplier)),
                reqMastery: 20 * (skill.level + 4)
            };
        } else {
            const maxLvl = skill.maxLevel || 10;
            return {
                gold: Math.max(1, Math.floor((4000 + 2000 * maxLvl) * tierMult * discountMultiplier)),
                mana: Math.max(1, Math.floor((5 + maxLvl) * tierMult * discountMultiplier)),
                maxLevel: maxLvl
            };
        }
    };

    const handleForgetSkill = (skillToDelete: any) => {
        if (!skillToDelete) return;
        const newChar: Character = {
            ...character,
            skills: [...(character.skills || [])],
            skillShortcuts: character.skillShortcuts ? [...character.skillShortcuts] : undefined,
            companions: (character.companions || []).map(c => ({
                ...c,
                skills: [...(c.skills || [])],
                skillShortcuts: c.skillShortcuts ? [...c.skillShortcuts] : undefined,
                stats: { ...c.stats }
            })),
            inactiveCompanions: (character.inactiveCompanions || []).map(c => ({
                ...c,
                skills: [...(c.skills || [])],
                skillShortcuts: c.skillShortcuts ? [...c.skillShortcuts] : undefined,
                stats: { ...c.stats }
            })),
            stats: { ...character.stats }
        };

        let targetObj: Character | Companion | undefined;
        if (targetId === 'player') {
            targetObj = newChar;
        } else {
            const cIdx = (newChar.companions || []).findIndex(c => c.id === targetId);
            if (cIdx >= 0) {
                targetObj = newChar.companions[cIdx];
            } else {
                const inIdx = (newChar.inactiveCompanions || []).findIndex(c => c.id === targetId);
                if (inIdx >= 0 && newChar.inactiveCompanions) {
                    targetObj = newChar.inactiveCompanions[inIdx];
                }
            }
        }

        if (!targetObj) return;

        const skillName = skillToDelete.name;
        if (skillToDelete.isBond) {
            newChar.bondSkills = (newChar.bondSkills || []).filter((_, idx) => idx !== skillToDelete.originalIndex);
        } else {
            // 파이널 클래스 스킬 삭제 전 기존 스킬들의 슬롯 번호(finalSkillSlot)를 고정하여 상위 슬롯 비율 중복 생성 악용 방지
            const { assignedSkills } = getFinalSkillSlotsUsage(targetObj.skills || []);
            const slotMap = new Map<Skill, number>();
            assignedSkills.forEach(({ skill, slot }) => {
                if (isFinalTierSkill(skill) && !slotMap.has(skill)) {
                    slotMap.set(skill, slot);
                }
            });
            targetObj.skills = (targetObj.skills || [])
                .map((s) => {
                    if (isFinalTierSkill(s) && slotMap.has(s)) {
                        return { ...s, finalSkillSlot: slotMap.get(s) };
                    }
                    return s;
                })
                .filter((_, idx) => idx !== skillToDelete.originalIndex);
        }

        // 해당 대상(플레이어 또는 선택된 동료 본인)의 퀵슬롯에서 동일 이름의 스킬이 더 이상 남아있지 않을 때만 정리
        const stillHasSameNamedSkillInTarget =
            (targetObj.skills || []).some(s => s.name === skillName) ||
            (targetId === 'player'
                ? (newChar.bondSkills || []).some(s => (!s.sourceId || s.sourceId === 'player') && s.name === skillName)
                : (newChar.bondSkills || []).some(s => (s.sourceId === targetObj!.id || s.companionId === targetObj!.id) && s.name === skillName));

        if (!stillHasSameNamedSkillInTarget && targetObj.skillShortcuts) {
            targetObj.skillShortcuts = targetObj.skillShortcuts.map(s => s === skillName ? '' : s);
        }

        // Recalculate stats for the target only
        const { finalStats } = calculateFinalStats(targetObj);
        if (targetObj.stats.hp > finalStats.maxHp) targetObj.stats.hp = finalStats.maxHp;
        if (targetObj.stats.mp > finalStats.maxMp) targetObj.stats.mp = finalStats.maxMp;

        if (selectedSkillName === skillName) {
            setSelectedSkillName(null);
        }

        onUpdateCharacter(newChar, `[스킬 연구소] ${targetObj.name}이(가) [${skillName}] 스킬을 잊었습니다.`);
        showToast(`[${skillName}] 스킬을 성공적으로 잊었습니다.`, 'success');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-1 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-slate-950 border border-purple-500/40 rounded-2xl w-full max-w-5xl h-[94vh] sm:h-[88vh] flex flex-col shadow-[0_0_50px_rgba(168,85,247,0.15)] overflow-hidden">
                
                {/* 1. Header Bar */}
                <div className="px-3 py-2.5 sm:px-6 sm:py-3.5 bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 border-b border-purple-900/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="p-1.5 sm:p-2 rounded-xl bg-purple-900/50 border border-purple-500/50 text-purple-300 shadow-md">
                            <Sparkles size={18} className="animate-pulse text-purple-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-pink-200 to-amber-200">
                                    기지 연구소
                                </h3>
                                <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-purple-950 border border-purple-700 text-purple-300 font-mono font-bold">
                                    Lv.{labLevel}
                                </span>
                            </div>
                            <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">
                                스킬 연마 · 한계 돌파 · 타격 오라 & VFX 테마 · 아이콘 · 컷신 · 이펙트 영상 커스터마이징
                            </p>
                        </div>
                    </div>

                    {/* Resources & Close */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            type="button"
                            id="btn-research-craft-help"
                            onClick={() => setShowCraftHelp(true)}
                            className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                            title="각 클래스별 스킬 제작 및 슬롯 한도 안내"
                        >
                            <HelpCircle size={13} className="text-amber-400" />
                            <span className="hidden sm:inline">스킬 한도 안내</span>
                            <span className="sm:hidden">도움말</span>
                        </button>
                        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-mono bg-slate-900/80 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-800">
                            <span className="text-amber-400 flex items-center gap-1 font-bold">
                                <DollarSign size={12} /> {(character.money || 0).toLocaleString()}G
                            </span>
                            <span className="text-purple-400 flex items-center gap-1 font-bold" title="마정석">
                                <Zap size={12} /> {totalAvailableMana.toLocaleString()}개
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* 2. Target Selector Bar (Horizontal Mobile-Friendly Chips with Filter & Sort) */}
                <div className="px-2.5 sm:px-6 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 hidden md:inline">연구 대상:</span>
                    
                    {/* Filter & Sort controls */}
                    <div className="flex items-center gap-1 shrink-0 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <select 
                            value={targetFilter} 
                            onChange={(e) => setTargetFilter(e.target.value as any)}
                            className="bg-slate-900 text-slate-300 text-[10px] font-bold px-1.5 py-1 rounded border border-slate-700 outline-none cursor-pointer"
                        >
                            <option value="all">전체 ({allTargets.length})</option>
                            <option value="custom">커스텀 / 주인공</option>
                            <option value="normal">일반 동료</option>
                            <option value="monster">몬스터</option>
                        </select>
                        <select 
                            value={targetSort} 
                            onChange={(e) => setTargetSort(e.target.value as any)}
                            className="bg-slate-900 text-slate-300 text-[10px] font-bold px-1.5 py-1 rounded border border-slate-700 outline-none cursor-pointer"
                        >
                            <option value="level">레벨순</option>
                            <option value="name">이름순</option>
                            <option value="element">속성순</option>
                        </select>
                    </div>

                    <div className="w-px h-4 bg-slate-800 shrink-0 mx-0.5"></div>

                    {filteredTargets.map(target => {
                        const isSelected = targetId === target.id;
                        const roleTag = target.isPlayer ? '주인공' : target.isMonster ? '몬스터' : target.isCustom ? '커스텀' : '동료';
                        const tagColor = target.isPlayer 
                            ? 'bg-amber-950 text-amber-300 border-amber-800' 
                            : target.isMonster
                                ? 'bg-red-950 text-red-300 border-red-800'
                                : target.isCustom 
                                    ? 'bg-cyan-950 text-cyan-300 border-cyan-800' 
                                    : 'bg-slate-800 text-slate-400 border-slate-700';

                        return (
                            <button
                                key={target.id}
                                onClick={() => {
                                    setTargetId(target.id);
                                    setSelectedSkillName(null);
                                }}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-2 border transition-all ${
                                    isSelected
                                        ? 'bg-purple-900/70 border-purple-400 text-purple-100 shadow-[0_0_12px_rgba(168,85,247,0.4)] scale-[1.02]'
                                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                }`}
                            >
                                <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center">
                                    {target.avatar ? (
                                        <img src={target.avatar} alt={target.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={12} className="text-slate-400" />
                                    )}
                                </div>
                                <span>{target.name}</span>
                                <span className={`text-[9px] px-1 py-0.2 rounded border font-mono ${tagColor}`}>
                                    {roleTag}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* 3. Navigation Tabs Bar (Scrollable for mobile) */}
                <div className="px-2 sm:px-6 bg-slate-950 border-b border-slate-800 flex gap-1 overflow-x-auto no-scrollbar shrink-0">
                    <button
                        onClick={() => setActiveTab('research')}
                        className={`px-3 py-2.5 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-1.5 shrink-0 transition-colors ${
                            activeTab === 'research'
                                ? 'border-purple-500 text-purple-300 bg-purple-950/30'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <TrendingUp size={14} className="text-purple-400" />
                        <span>스킬 연마</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('limit_break')}
                        className={`px-3 py-2.5 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-1.5 shrink-0 transition-colors ${
                            activeTab === 'limit_break'
                                ? 'border-pink-500 text-pink-300 bg-pink-950/30'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Zap size={14} className="text-pink-400" />
                        <span>한계 돌파</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('forget')}
                        className={`px-3 py-2.5 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-1.5 shrink-0 transition-colors ${
                            activeTab === 'forget'
                                ? 'border-rose-500 text-rose-300 bg-rose-950/30'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Trash2 size={14} className="text-rose-400" />
                        <span>스킬 잊기</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('researchers')}
                        className={`px-3 py-2.5 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-1.5 shrink-0 transition-colors ${
                            activeTab === 'researchers'
                                ? 'border-cyan-500 text-cyan-300 bg-cyan-950/30'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <FlaskConical size={14} className="text-cyan-400" />
                        <span>연구원 관리</span>
                    </button>
                </div>

                {/* Toast Notification Alert */}
                <AnimatePresence>
                    {toastMessage && (
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            className={`mx-3 sm:mx-6 my-2 p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between z-30 shadow-lg ${
                                toastMessage.type === 'success' ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200' :
                                toastMessage.type === 'warning' ? 'bg-amber-950/90 border-amber-500 text-amber-200' :
                                'bg-slate-900 border-slate-700 text-slate-200'
                            }`}
                        >
                            <span className="flex items-center gap-1.5">
                                {toastMessage.type === 'success' ? <CheckCircle2 size={15} className="text-emerald-400 shrink-0"/> : <AlertCircle size={15} className="text-amber-400 shrink-0"/>}
                                {toastMessage.text}
                            </span>
                            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white"><X size={14}/></button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 4. Tab Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col p-2.5 sm:p-5">
                    
                    {/* Tier Filters for list-based tabs (Research & Limit Break) */}
                    {(activeTab === 'research' || activeTab === 'limit_break') && (
                        <>
                            {/* Researcher Bonus Banner */}
                            <div className="mb-3 p-2.5 sm:p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div className={`p-2 rounded-lg ${researcherBonus.researcherCount > 0 ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                                        <FlaskConical size={18} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-white">연구소 담당 연구원 현황</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${researcherBonus.researcherCount > 0 ? 'bg-cyan-950 text-cyan-300 border-cyan-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                                {researcherBonus.rankTitle}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                                            {researcherBonus.researcherCount > 0 ? (
                                                <>
                                                    <span className="text-cyan-300">연구 비용: <strong>-{Math.round(researcherBonus.costDiscount * 100)}%</strong></span>
                                                    <span className="text-purple-300">연구 대성공 보정: <strong>+{researcherBonus.greatSuccessBonus.toFixed(1)}%</strong></span>
                                                    <span className="text-pink-300">한계돌파 확률 보정: <strong>+{researcherBonus.limitBreakBonus.toFixed(1)}%</strong></span>
                                                    {researcherBonus.researcherCount >= 2 && researcherBonus.countBonus && (
                                                        <span className="text-amber-300 font-bold bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/80 text-[10px]">
                                                            👥 부연구원 등급보정({researcherBonus.researcherCount - 1}명): 할인 +{Math.round(researcherBonus.countBonus.costDiscount * 100)}%, 대성공 +{researcherBonus.countBonus.greatSuccessBonus.toFixed(1)}%, 한계돌파 +{researcherBonus.countBonus.limitBreakBonus.toFixed(1)}%
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-amber-400/90">⚠️ 연구소 담당 연구원이 배치되지 않았습니다. 연구원 관리를 통해 연구원을 등록하고 승급하세요.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setActiveTab('researchers')}
                                    className="self-end sm:self-center px-2.5 py-1 bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-700/50 text-cyan-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1 shrink-0"
                                >
                                    <span>연구원 관리</span>
                                    <ChevronRight size={12} />
                                </button>
                            </div>
                        </>
                    )}

                    {/* Tier Filters for list-based tabs (Research, Limit Break, Forget) */}
                    {(activeTab === 'research' || activeTab === 'limit_break' || activeTab === 'forget') && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2.5 gap-2 shrink-0">
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                                {['전체', '미해방', '퍼스트', '세컨드', '라스트', '파이널', '인연'].map(tier => (
                                    <button
                                        key={tier}
                                        onClick={() => setSkillFilter(tier)}
                                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all shrink-0 ${
                                            skillFilter === tier
                                                ? 'bg-purple-900/50 border-purple-500 text-white shadow-sm'
                                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        {tier}
                                    </button>
                                ))}
                            </div>

                            {/* Research Count Stepper for Research tab (Max 10) */}
                            {activeTab === 'research' && (
                                <div className="flex items-center gap-1.5 bg-slate-900/90 border border-purple-500/40 rounded-xl px-2.5 py-1 shrink-0 self-start sm:self-auto">
                                    <span className="text-[11px] font-bold text-purple-300 mr-1">연마 횟수:</span>
                                    <div className="flex items-center gap-1">
                                        {[1, 3, 5, 10].map(cnt => (
                                            <button
                                                key={cnt}
                                                type="button"
                                                onClick={() => setResearchCount(cnt)}
                                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                                                    researchCount === cnt
                                                        ? 'bg-purple-600 text-white shadow-sm scale-105'
                                                        : 'bg-slate-800 text-slate-400 hover:text-white'
                                                }`}
                                            >
                                                {cnt}회
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-1 ml-1 border-l border-slate-700 pl-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setResearchCount(prev => Math.max(1, prev - 1))}
                                            disabled={researchCount <= 1}
                                            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-slate-300 flex items-center justify-center transition-all"
                                        >
                                            -
                                        </button>
                                        <span className="w-5 text-center text-xs font-mono font-bold text-amber-300">
                                            {researchCount}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setResearchCount(prev => Math.min(10, prev + 1))}
                                            disabled={researchCount >= 10}
                                            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-slate-300 flex items-center justify-center transition-all"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            )}

                            <span className="text-[11px] text-slate-500 font-mono hidden sm:inline shrink-0">
                                {filteredSkills.length}개 스킬
                            </span>
                        </div>
                    )}

                    {/* TAB 1: Skill Research (연마) & TAB 2: Limit Break (한계 돌파) */}
                    {(activeTab === 'research' || activeTab === 'limit_break') && (
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
                            {filteredSkills.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs italic">
                                    <Sparkles size={24} className="mb-2 opacity-30 text-purple-400" />
                                    조건에 맞는 스킬이 없습니다.
                                </div>
                            ) : (
                                filteredSkills.map((skill, idx) => {
                                    const costs = getSkillCosts(skill, activeTab);
                                    const isBond = (skill as any).isBond;
                                    const tierStyle = isBond ? TIER_COLORS[ClassTier.BOND] : (TIER_COLORS[skill.tier] || TIER_COLORS[ClassTier.NONE]);
                                    const effectiveCount = activeTab === 'research' ? researchCount : 1;
                                    const hasEnoughInitialGold = (character.money || 0) >= costs.gold;
                                    const hasEnoughInitialMana = totalAvailableMana >= costs.mana;
                                    const canStartResearch = hasEnoughInitialGold && hasEnoughInitialMana;
                                    const masteryPercent = activeTab === 'research' 
                                        ? Math.min(100, ((skill.currentMastery || 0) / (costs.reqMastery || 1)) * 100)
                                        : 0;

                                    return (
                                        <div
                                            key={idx}
                                            className="bg-slate-900/70 p-3 sm:p-4 rounded-xl border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                                        >
                                            {/* Skill Info */}
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                {/* Thumbnail */}
                                                <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-700/80 shrink-0 overflow-hidden flex items-center justify-center shadow-inner relative group">
                                                    {skill.imageUrl ? (
                                                        <img src={skill.imageUrl} alt={skill.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                    ) : (
                                                        (() => {
                                                            const found = BASE_ICONS.find(b => b.name === skill.icon);
                                                            const IconComp = found ? found.icon : Sword;
                                                            return <IconComp size={20} className="text-purple-400" />;
                                                        })()
                                                    )}
                                                    {/* VFX Badge Indicator */}
                                                    {(skill as any).vfxTheme && (
                                                        <div 
                                                             className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border border-slate-900 shadow-sm"
                                                             style={{ backgroundColor: (skill as any).vfxColor || '#a855f7' }}
                                                             title="커스텀 VFX 적용됨"
                                                        />
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${tierStyle.badge}`}>
                                                            {isBond ? '인연' : (skill.tier || '기본')}
                                                        </span>
                                                        <h4 className="text-sm font-bold text-slate-100 truncate">
                                                            {skill.name}
                                                        </h4>
                                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-purple-300">
                                                            Lv.{skill.level} / Max.{skill.maxLevel || 10}
                                                        </span>
                                                    </div>

                                                    {/* Progress / Description */}
                                                    {activeTab === 'research' ? (
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                                                                <span>스킬 숙련도</span>
                                                                <span>{skill.currentMastery || 0} / {costs.reqMastery} ({masteryPercent.toFixed(1)}%)</span>
                                                            </div>
                                                            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                                                <div 
                                                                    className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-300"
                                                                    style={{ width: `${masteryPercent}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[11px] text-slate-400 line-clamp-1">
                                                            {skill.description || "한계 돌파 시 스킬의 최대 레벨 제한이 +1 해금됩니다."}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action & Cost */}
                                            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                                                <div className="flex flex-col sm:items-end gap-1">
                                                    <div className="flex items-center gap-2 text-xs font-mono">
                                                        <span className={`flex items-center gap-0.5 ${hasEnoughInitialGold ? 'text-amber-400' : 'text-red-400 font-bold'}`}>
                                                            <DollarSign size={11} /> {costs.gold.toLocaleString()}G
                                                            {effectiveCount > 1 && <span className="text-[10px] text-slate-400 font-sans">/회</span>}
                                                        </span>
                                                        <span className={`flex items-center gap-0.5 ${hasEnoughInitialMana ? 'text-purple-400' : 'text-red-400 font-bold'}`}>
                                                            <Zap size={11} /> {costs.mana}개
                                                            {effectiveCount > 1 && <span className="text-[10px] text-slate-400 font-sans">/회</span>}
                                                        </span>
                                                    </div>
                                                    {effectiveCount > 1 && (
                                                        <div className="text-[10px] text-amber-300/80 font-sans">
                                                            (순차 연마 · 레벨업 시 비용 추가 지불)
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                                        <Clock size={11} className={activeTab === 'research' ? 'text-indigo-400' : 'text-pink-400'} />
                                                        <span className="font-semibold text-slate-300">
                                                            소요 {researchMinutes * effectiveCount}분 (회당 {researchMinutes}분)
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => {
                                                            const isBondSkill = (skill as any).isBond;
                                                            const effectiveTargetId = isBondSkill ? 'bond' : targetId;
                                                            if (activeTab === 'research') {
                                                                handleExecuteResearch((skill as any).originalIndex, effectiveTargetId, researchCount);
                                                            } else {
                                                                handleExecuteLimitBreak((skill as any).originalIndex, effectiveTargetId);
                                                            }
                                                        }}
                                                        disabled={!canStartResearch}
                                                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                                                            !canStartResearch
                                                                ? 'bg-slate-800 text-slate-600 border border-slate-700/50 cursor-not-allowed'
                                                                : activeTab === 'research'
                                                                    ? 'bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white border border-purple-500/50'
                                                                    : 'bg-gradient-to-r from-pink-700 to-rose-600 hover:from-pink-600 hover:to-rose-500 text-white border border-pink-500/50'
                                                        }`}
                                                    >
                                                        {activeTab === 'research' ? <TrendingUp size={14} /> : <Zap size={14} />}
                                                        <span>{activeTab === 'research' ? `스킬 연마 (${researchCount}회)` : '한계 돌파'}</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setSkillToForget(skill)}
                                                        title="스킬 잊기 (삭제)"
                                                        className="p-2 rounded-xl text-xs font-bold flex items-center justify-center transition-all bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 border border-rose-800/50 active:scale-95 shrink-0"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* TAB: Skill Forget (스킬 잊기 / 삭제) */}
                    {activeTab === 'forget' && (
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
                            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/50 flex items-center gap-2.5 text-xs text-rose-200">
                                <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                                <span>
                                    연구소에서 불필요해진 스킬을 잊고 스킬 슬롯을 확보할 수 있습니다. 잊은 스킬은 목록에서 완전히 삭제됩니다.
                                </span>
                            </div>
                            {filteredSkills.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs italic">
                                    <Trash2 size={24} className="mb-2 opacity-30 text-rose-400" />
                                    조건에 맞는 스킬이 없습니다.
                                </div>
                            ) : (
                                filteredSkills.map((skill, idx) => {
                                    const isBond = (skill as any).isBond;
                                    const tierStyle = TIER_COLORS[skill.tier] || TIER_COLORS[ClassTier.NONE];

                                    return (
                                        <div
                                            key={idx}
                                            className="bg-slate-900/70 p-3 sm:p-4 rounded-xl border border-slate-800 hover:border-rose-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                                        >
                                            {/* Skill Info */}
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-700/80 shrink-0 overflow-hidden flex items-center justify-center shadow-inner relative">
                                                    {skill.imageUrl ? (
                                                        <img src={skill.imageUrl} alt={skill.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                    ) : (
                                                        (() => {
                                                            const found = BASE_ICONS.find(b => b.name === skill.icon);
                                                            const IconComp = found ? found.icon : Sword;
                                                            return <IconComp size={20} className="text-rose-400" />;
                                                        })()
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${tierStyle.badge}`}>
                                                            {isBond ? '인연' : (skill.tier || '기본')}
                                                        </span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                                                            {skill.type || '액티브'}
                                                        </span>
                                                        <h4 className="text-sm font-bold text-slate-100 truncate">
                                                            {skill.name}
                                                        </h4>
                                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                                                            Lv.{skill.level} / Max.{skill.maxLevel || 10}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 line-clamp-2">
                                                        {skill.description || "등록된 설명이 없습니다."}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Forget Action Button */}
                                            <div className="flex items-center justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                                                <button
                                                    onClick={() => setSkillToForget(skill)}
                                                    className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 text-white border border-rose-500/50"
                                                >
                                                    <Trash2 size={14} />
                                                    <span>스킬 잊기</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* 5. RESEARCHERS MANAGEMENT TAB */}
                    {activeTab === 'researchers' && (
                        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
                            {/* Top Info Header */}
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-slate-950 border border-cyan-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-cyan-900/40 border border-cyan-700/60 rounded-xl text-cyan-400">
                                        <FlaskConical size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                                            <span>연구원 숙련도 및 승급 관리</span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/60 border border-cyan-700 text-cyan-300 font-mono font-normal">
                                                동료 연구원 {allResearchers.length}명
                                            </span>
                                        </h3>
                                        <p className="text-xs text-slate-300 mt-1">
                                            배치된 연구원은 스킬 연구 비용을 절감하고, 대성공 및 한계돌파 성공 확률을 비약적으로 증가시킵니다.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2 w-full md:w-auto text-xs font-mono">
                                    <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 flex-1 md:flex-none text-center">
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">동료 최고 직급</div>
                                        <div className="text-cyan-300 font-bold">{researcherBonus.rankTitle}</div>
                                    </div>
                                    <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 flex-1 md:flex-none text-center">
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">총 연구 할인</div>
                                        <div className="text-emerald-300 font-bold">-{Math.round(researcherBonus.costDiscount * 100)}%</div>
                                    </div>
                                    <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 flex-1 md:flex-none text-center">
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">총 대성공 보정</div>
                                        <div className="text-purple-300 font-bold">+{researcherBonus.greatSuccessBonus.toFixed(1)}%</div>
                                    </div>
                                    <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 flex-1 md:flex-none text-center">
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">총 한계돌파 보정</div>
                                        <div className="text-amber-300 font-bold">+{researcherBonus.limitBreakBonus.toFixed(1)}%</div>
                                    </div>
                                </div>
                            </div>

                            {/* Player Research Mastery Card */}
                            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-indigo-950/30 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
                                        <Crown size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-amber-200">{character.name}</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-900/60 text-amber-300 border border-amber-700/60 font-mono">
                                                플레이어 연구 숙련 Lv.{character.professions?.research?.level || 1}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                ({character.professions?.research?.exp || 0} / {character.professions?.research?.maxExp || 100} EXP)
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-2">
                                            <span>플레이어 숙련 효과:</span>
                                            <span className="text-emerald-400 font-medium">비용 할인 -{((researcherBonus.playerMastery?.costDiscount || 0) * 100).toFixed(1)}%</span>
                                            <span>•</span>
                                            <span className="text-purple-400 font-medium">대성공 +{(researcherBonus.playerMastery?.greatSuccessBonus || 0).toFixed(1)}%</span>
                                            <span>•</span>
                                            <span className="text-amber-400 font-medium">한계돌파 +{(researcherBonus.playerMastery?.limitBreakBonus || 0).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-[11px] text-slate-400 bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800 shrink-0">
                                    스킬 연구 및 한계돌파 시 플레이어 연구 경험치가 획득됩니다.
                                </div>
                            </div>

                            {/* Section 1: Registered Companion Researchers */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2.5 flex items-center gap-1.5">
                                    <Award size={14} />
                                    <span>동료 연구원 목록 (숙련도 & 승급)</span>
                                </h4>

                                {allResearchers.length === 0 ? (
                                    <div className="p-8 rounded-xl bg-slate-900/50 border border-slate-800 border-dashed text-center">
                                        <FlaskConical size={32} className="mx-auto text-slate-600 mb-2" />
                                        <div className="text-sm font-bold text-slate-400">등록된 동료 연구원이 없습니다</div>
                                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                                            아래 거주민 동료 목록에서 <strong>[연구원으로 지정]</strong> 버튼을 눌러 동료를 연구원으로 전직시키세요!
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {allResearchers.map((resTarget) => {
                                            const resLevel = resTarget.professions?.research?.level || 1;
                                            const resExp = resTarget.professions?.research?.exp || 0;
                                            const resMaxExp = resTarget.professions?.research?.maxExp || 100;
                                            const resTier = resTarget.researcherTier || getResearcherTierByLevel(resLevel);
                                            const rankTitle = getResearcherRankTitle(resLevel, resTier);

                                            const reqNextLevel = getNextResearcherPromotionLevel(resTier);
                                            const reqWis = getNextResearcherPromotionWisReq(resTier);
                                            const targetWis = calculateFinalStats(resTarget).finalStats.wis || 10;
                                            const hasWis = reqWis === null || targetWis >= reqWis;
                                            const canPromote = reqNextLevel !== null && resLevel >= reqNextLevel && resTier < getResearcherTierByLevel(resLevel) && hasWis;

                                            const isAssignedToLab = assignedIdsToLab.includes(resTarget.id);

                                            return (
                                                <div
                                                    key={resTarget.id}
                                                    className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                                                        isAssignedToLab 
                                                            ? 'bg-cyan-950/30 border-cyan-500/60 shadow-md shadow-cyan-950/50' 
                                                            : 'bg-slate-900/70 border-slate-800'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center font-bold text-sm text-slate-200 shrink-0 overflow-hidden">
                                                                {(resTarget as any).avatarUrl ? (
                                                                    <img src={(resTarget as any).avatarUrl} alt={resTarget.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    resTarget.name.charAt(0)
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-sm text-white">{resTarget.name}</span>
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                                                                        {rankTitle}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                                                                    <span>캐릭터 Lv.{resTarget.level}</span>
                                                                    <span>•</span>
                                                                    {isAssignedToLab ? (
                                                                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                                                                            <CheckCircle2 size={11} /> 연구소 담당 중
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-500">대기 중 (기지 관리에서 배치 가능)</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Experience Bar & Promotion Status */}
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-400 font-bold flex items-center gap-1">
                                                                <span>연구 숙련도</span>
                                                                <span className="text-cyan-300 font-mono">Lv.{resLevel}</span>
                                                            </span>
                                                            <span className="text-[11px] font-mono text-slate-400">
                                                                {resExp} / {resMaxExp} EXP
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                                                            <div 
                                                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                                                                style={{ width: `${Math.min(100, (resExp / resMaxExp) * 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Promotion Action Button */}
                                                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                                                        <div className="text-[11px] text-slate-400 flex flex-col">
                                                            {reqNextLevel ? (
                                                                <>
                                                                    <span>자격 조건: <strong className="text-amber-300">숙련 Lv.{reqNextLevel}</strong> (현재 Lv.{resLevel})</span>
                                                                    {reqWis && (
                                                                        <span className={hasWis ? 'text-emerald-400 font-medium' : 'text-rose-400 font-bold'}>
                                                                            필요 지혜: WIS {reqWis} (현재 {targetWis})
                                                                        </span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span className="text-cyan-400 font-bold">전설의 연구원 (최고 등급)</span>
                                                            )}
                                                        </div>

                                                        {canPromote ? (
                                                            <button
                                                                onClick={() => handlePromoteResearcher(resTarget)}
                                                                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-950/50 flex items-center gap-1 transition-all active:scale-95 animate-pulse"
                                                            >
                                                                <ArrowUpCircle size={14} />
                                                                <span>[{RESEARCHER_TIER_NAMES[resTier + 1]}] 승급하기</span>
                                                            </button>
                                                        ) : (
                                                            <button
                                                                disabled
                                                                className="px-3 py-1 bg-slate-800 text-slate-500 text-xs font-bold rounded-xl border border-slate-700 cursor-not-allowed"
                                                            >
                                                                승급 불가 {!hasWis ? '(WIS 부족)' : '(숙련도 부족)'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Section 2: Non-Researcher Residents */}
                            {nonResearchers.length > 0 && (
                                <div className="mt-2 pt-4 border-t border-slate-800">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                                        <UserCheck size={14} className="text-slate-400" />
                                        <span>연구원으로 지정 가능한 동료 (무직)</span>
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                        {nonResearchers.map((nonResComp) => (
                                            <div
                                                key={nonResComp.id}
                                                className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between gap-2 hover:border-slate-700 transition-all"
                                            >
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                                                        {nonResComp.name.charAt(0)}
                                                    </div>
                                                    <div className="truncate">
                                                        <div className="text-xs font-bold text-slate-200 truncate">{nonResComp.name}</div>
                                                        <div className="text-[10px] text-slate-500 truncate">{nonResComp.job || '무직'} • Lv.{nonResComp.level}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleAssignAsResearcher(nonResComp)}
                                                    className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[11px] font-bold rounded-lg shrink-0 transition-all active:scale-95"
                                                >
                                                    연구원 지정
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Skill Forget Confirmation Dialog */}
                <AnimatePresence>
                    {skillToForget && (
                        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="bg-slate-900 border border-rose-600/60 p-5 sm:p-6 rounded-2xl max-w-md w-full shadow-[0_0_50px_rgba(225,29,72,0.3)] space-y-4"
                            >
                                <div className="flex items-center gap-2.5 text-rose-400 font-bold text-base border-b border-slate-800 pb-3">
                                    <AlertTriangle size={22} className="shrink-0 text-rose-500" />
                                    <span>스킬 잊기 (삭제 확인)</span>
                                </div>
                                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-purple-300 font-bold">
                                            {skillToForget.tier || '기본'}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                                            {skillToForget.type || '액티브'}
                                        </span>
                                        <span className="text-sm font-bold text-white">
                                            {skillToForget.name}
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">
                                            Lv.{skillToForget.level}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        {skillToForget.description || '등록된 설명이 없습니다.'}
                                    </p>
                                </div>
                                <div className="text-xs text-rose-300/90 bg-rose-950/40 p-3 rounded-xl border border-rose-900/40 leading-relaxed">
                                    ⚠️ 정말로 <strong>[{skillToForget.name}]</strong> 스킬을 잊으시겠습니까?
                                    <br />
                                    잊은 스킬은 완전히 삭제되어 빈 슬롯이 되며, 되돌릴 수 없습니다.
                                </div>
                                <div className="flex gap-2.5 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setSkillToForget(null)}
                                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleForgetSkill(skillToForget);
                                            setSkillToForget(null);
                                        }}
                                        className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                    >
                                        <Trash2 size={14} />
                                        <span>잊기 (삭제)</span>
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <SkillCraftHelpModal
                    isOpen={showCraftHelp}
                    onClose={() => setShowCraftHelp(false)}
                    currentLevel={activeTarget?.level || character.level}
                    currentTier={activeTarget?.classTier || character.classTier}
                />

                {processingProgress > 0 && (
                    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[70] flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-slate-900 border border-purple-500/30 p-6 rounded-2xl w-full max-w-sm text-center space-y-4 shadow-2xl relative overflow-hidden">
                            <div className="absolute -top-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl animate-pulse"></div>
                            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl animate-pulse"></div>

                            <div className="relative flex justify-center">
                                <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin flex items-center justify-center">
                                    <Sparkles className="text-purple-400 animate-pulse" size={24} />
                                </div>
                            </div>

                            <div className="space-y-1 relative">
                                <h4 className="text-sm font-black text-purple-200">
                                    {processingMessage.includes("한계") ? "스킬 한계 돌파 분석 중" : "스킬 숙련 연마 및 연구 중"}
                                </h4>
                                <p className="text-[11px] text-slate-400 font-medium h-4 transition-all duration-300">
                                    {processingMessage}
                                </p>
                            </div>

                            <div className="space-y-1 relative">
                                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                    <div 
                                        className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-150"
                                        style={{ width: `${processingProgress}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-500 font-mono font-bold">
                                    <span>준비</span>
                                    <span className="text-purple-400">{processingProgress}%</span>
                                    <span>완성</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {resultData && (
                    <ActionResultModal
                        data={resultData}
                        onClose={() => setResultData(null)}
                    />
                )}

            </div>
        </div>
    );
};

export default ResearchLabModal;
