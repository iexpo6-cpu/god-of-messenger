
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Character, Companion, Skill, ClassTier, SkillType, SkillTarget, WeaponType, CombatStyle } from '../types';
import { BookOpen, Lock, Sparkles,CheckCircle2, X, Zap, Flame, Crown, Star, Shield, Sword, Activity, Info, PenTool, Dices, RefreshCw, Calculator, TrendingUp, PlusCircle, Loader2, Target, Crosshair, UserCheck, Trash2, CheckCircle, CheckSquare, Square, AlertCircle, Skull, Link, Brain, Type, User, Waves, Wind, Sun, Moon, Heart, Package, Upload, HelpCircle } from 'lucide-react';
import { generateSkillSuggestion, generateSkillDescriptionSuggestion, generateSkillNameOnlySuggestion } from '../services/geminiService';
import { calculateBuffSuccessRate, calculateTotalStats, calculateFinalStats, calculateDebuffSuccessRate, generateLocalSkillSuggestion, getUnlockedCombatStylesList, getCombatStyleActiveSkill, getEntityAllCombatSkills } from '../utils';
import { getCombatStyleSkillSet, StyleLearnedPassive, StyleEquippedPassive } from '../combatStyleSkills';
import ActionResultModal, { ResultData } from './ActionResultModal';
import ShortcutAssignModal from './ShortcutAssignModal';
import { SkillCraftHelpModal } from './SkillCraftHelpModal';
import FinalSkillEnhanceModal from './FinalSkillEnhanceModal';
import { STATUS_AILMENTS_LIST, SHINRYOKU_TYPES_LIST, SHINRYOKU_STATUS_MAP, WEAPON_TYPE_KOREAN, SHINRYOKU_SPECIAL_PASSIVES, COMBAT_STYLE_CONFIG, SHINRYOKU_UI_CONFIG, SUMMON_PRESET_IMAGES, getDefaultSummonImageUrl } from '../constants';
import { checkNinjaCombatStyleOwnership } from '../services/ninjaCloneService';
import { isLegacySkillFormat } from '../services/skillReconfigureService';
import { getTierBuffScale, getTierAttackScale } from '../services/skillBuffScaleService';
import { getAuraDisplayLabel, getShinryokuAuraType } from '../services/buffDiminishingManager';

import {
  getBuffBaseCap,
  getBuffTotalCap,
  getBuffSlotMaxAllowed,
  getDebuffBaseCap,
  getDebuffTotalCap,
  getDebuffSlotMaxAllowed
} from '../utils/skillScalingHelper';
import { getAttackSkillBuffCap, getAttackSkillDebuffCap, ATTACK_DEBUFF_OPTIONS, getAttackDebuffKoreanName, ATTACK_SKILL_WITH_BUFF_DAMAGE_SCALE } from '../utils/finalClassSkillHelper';
import { getResurrectionCap, getBaseResurrectionRecovery } from '../services/skillFormulaService';
import {
  getFinalSkillSlotsUsage,
  getNextAvailableFinalSkillSlot,
  getFinalSkillSlotLevelTier,
  getFinalSkillBonusSteps,
  getFinalAttackPowerCap,
  getFinalPassiveStatCap,
  getFinalPassiveCombatCap
} from '../services/finalClassLevelScalingService';

import { RPG_SKILL_ICONS as BASE_ICONS, getItemImage, getSkillIconComponent } from '../services/rpgIconService';


interface Props {
  isOpen: boolean;
  onClose: () => void;
  character: Character | Companion;
  playerCharacter?: Character;
  onLearnSkill: (data: { name: string, type?: SkillType, description?: string, powerRatio?: number, mpCost?: number, formulaOverride?: string, targetType?: SkillTarget, isGreatSuccess?: boolean, icon?: string, shinryokuType?: string, imageUrl?: string, consumedShard?: string, consumedShardCount?: number }, tier: string) => void;
  onUpdateCharacter?: (newChar: Character) => void;
}

export const getSkillElement = (skill: { name: string, description?: string, effectFormula?: string, shinryokuType?: string }, defaultType?: string): string => {
  if (skill.shinryokuType && skill.shinryokuType.trim() && skill.shinryokuType.trim() !== '무속성') return skill.shinryokuType;
  if (defaultType && defaultType.trim()) return defaultType;
  if (skill.shinryokuType && skill.shinryokuType.trim()) return skill.shinryokuType;
  const fullText = `${skill.name} ${skill.description || ''} ${skill.effectFormula || ''}`;
  const found = SHINRYOKU_TYPES_LIST.find(t => fullText.includes(t) || fullText.includes(t.replace('계', '')));
  if (found) return found;
  return defaultType || '무속성';
};

const TIER_CONFIG: Record<string, { color: string, border: string, bg: string, icon: any, label: string, maxRatio: number }> = {
  [ClassTier.NONE]: { color: 'text-slate-400', border: 'border-slate-500', bg: 'bg-slate-900/40', icon: User, label: '미해방', maxRatio: 100 },
  [ClassTier.FIRST]: { color: 'text-amber-400', border: 'border-amber-500', bg: 'bg-amber-950/40', icon: Flame, label: '퍼스트 클래스', maxRatio: 150 },
  [ClassTier.SECOND]: { color: 'text-cyan-400', border: 'border-cyan-500', bg: 'bg-cyan-950/40', icon: Zap, label: '세컨드 클래스', maxRatio: 500 },
  [ClassTier.LAST]: { color: 'text-purple-400', border: 'border-purple-500', bg: 'bg-purple-950/40', icon: Crown, label: '라스트 클래스', maxRatio: 2000 },
  [ClassTier.FINAL]: { color: 'text-rose-400', border: 'border-rose-500', bg: 'bg-rose-950/40', icon: Star, label: '파이널 클래스', maxRatio: 10000 },
  [ClassTier.BOND]: { color: 'text-pink-400', border: 'border-pink-500', bg: 'bg-pink-950/40', icon: Sparkles, label: '인연스킬', maxRatio: 1000 },
  'COMBAT_STYLE': { color: 'text-amber-400', border: 'border-amber-500', bg: 'bg-amber-950/40', icon: Crosshair, label: '전투계열', maxRatio: 10000 },
};

const SKILL_TYPE_ICONS: Record<string, any> = {
  [SkillType.PHYSICAL]: Sword,
  [SkillType.MAGIC]: Zap,
  [SkillType.BUFF]: Shield,
  [SkillType.DEBUFF]: Skull,
  [SkillType.PASSIVE]: BookOpen,
};

const BUFF_STATS = ['STR', 'INT', 'WIS', 'DEF', 'AGI', 'CTRL', 'MaxHP', 'MaxMP', 'Acc', 'MAcc', 'Eva', 'MEva'];
const DEBUFF_STATS = ['P.Atk', 'M.Atk', 'P.Def', 'M.Def', 'Acc', 'MAcc', 'Eva', 'MEva'];

const STAT_DISPLAY_NAMES: Record<string, string> = {
    'STR': 'STR (힘)',
    'INT': 'INT (지능)',
    'WIS': 'WIS (지혜)',
    'DEF': 'DEF (방어)',
    'AGI': 'AGI (민첩)',
    'CTRL': 'CTRL (제어)',
    'MaxHP': 'MaxHP (체력)',
    'MaxMP': 'MaxMP (마력)',
    'P.Atk': 'P.Atk (물리공격력)',
    'M.Atk': 'M.Atk (마법공격력)',
    'P.Def': 'P.Def (물리방어력)',
    'M.Def': 'M.Def (마법방어력)',
    'Acc': 'Acc (물리명중률)',
    'MAcc': 'MAcc (마법명중률)',
    'Eva': 'Eva (물리회피율)',
    'MEva': 'MEva (마법회피율)'
};

const isAccOrEvaStat = (stat?: string): boolean => {
    if (!stat) return false;
    return ['Acc', 'MAcc', 'Eva', 'MEva', '물리명중률', '마법명중률', '물리회피율', '마법회피율', 'P.Acc', 'M.Acc', 'P.Eva', 'M.Eva'].includes(stat);
};

const hasCombatStyle = (character: Character | Companion, style: CombatStyle): boolean => {
    if (!character) return false;
    if (character.combatStyle === style) return true;
    if (character.unlockedCombatStyles && character.unlockedCombatStyles.includes(style)) return true;
    return false;
};

const MANA_SHIELD_ROOTS = [CombatStyle.MAGE, CombatStyle.ENERGIZER];
const EVA_ROOTS = [CombatStyle.ROGUE];
const ACC_ROOTS = [CombatStyle.ARCHER, CombatStyle.GUNNER, CombatStyle.BOXER];
const HP_ROOTS = [CombatStyle.SWORDSMAN, CombatStyle.SPEARMAN, CombatStyle.BERSERKER];
const MP_ROOTS = [CombatStyle.MAGE];
const SUMMON_ROOTS = [
  CombatStyle.SUMMONER,
  CombatStyle.ELEMENT_SUMMONER,
  CombatStyle.BEAST_SUMMONER,
  CombatStyle.GRAND_SUMMONER,
  CombatStyle.BEAST_MASTER,
  CombatStyle.SUMMON_KING,
  CombatStyle.ANCIENT_SUMMONER
];

const hasCombatStyleOfRootAndTier = (character: Character | Companion, roots: CombatStyle[], minTier: number): boolean => {
    if (!character) return false;
    const checkStyle = (style: CombatStyle) => {
        const cfg = COMBAT_STYLE_CONFIG[style];
        if (!cfg) return false;
        const isMatch = roots.includes(cfg.rootStyle) || roots.includes(cfg.style) || (cfg.parentStyle && roots.includes(cfg.parentStyle as CombatStyle));
        return isMatch && cfg.tier >= minTier;
    };
    if (character.combatStyle && checkStyle(character.combatStyle)) return true;
    if (character.unlockedCombatStyles) {
        for (const style of character.unlockedCombatStyles) {
            if (checkStyle(style)) return true;
        }
    }
    return false;
};

const getRequiredMinTier = (tab: string): number => {
    if (tab === ClassTier.SECOND) return 2;
    if (tab === ClassTier.LAST) return 3;
    if (tab === ClassTier.FINAL) return 4;
    return 0;
};

const isStatLocked = (character: Character | Companion, stat: string, tab: string): boolean => {
    const minTier = getRequiredMinTier(tab);
    if (minTier <= 1) return false;
    if (stat === 'MaxHP') {
        return !hasCombatStyleOfRootAndTier(character, HP_ROOTS, minTier);
    }
    if (stat === 'MaxMP') {
        return !hasCombatStyleOfRootAndTier(character, MP_ROOTS, minTier);
    }
    if (stat === 'Acc') {
        return !hasCombatStyleOfRootAndTier(character, ACC_ROOTS, minTier);
    }
    if (stat === 'MAcc') {
        return !hasCombatStyleOfRootAndTier(character, MP_ROOTS, minTier);
    }
    if (stat === 'Eva') {
        return !hasCombatStyleOfRootAndTier(character, EVA_ROOTS, minTier);
    }
    if (stat === 'MEva') {
        return !hasCombatStyleOfRootAndTier(character, MP_ROOTS, minTier);
    }
    if (stat === 'ManaShield' || stat === 'MANA_SHIELD') {
        return !hasCombatStyleOfRootAndTier(character, MANA_SHIELD_ROOTS, minTier);
    }
    return false;
};

export const isCritResistEligible = (character: Character | Companion): boolean => {
    if (!character) return false;
    const job = String((character as any).job || '');
    const className = String((character as any).className || '');
    const finalClassName = String((character as any).finalClassName || '');
    const roleOrTitle = String((character as any).title || '');
    const targetStr = `${job} ${className} ${finalClassName} ${roleOrTitle}`;
    
    // 직업 또는 클래스가 신의 사자, 마신, 마계 제너럴인 경우
    return targetStr.includes('사자') || targetStr.includes('마신') || targetStr.includes('제너럴');
};

export const ATTACK_SCALING: Record<string, number> = {
    [ClassTier.NONE]: 0.5,
    [ClassTier.FIRST]: 1.0,
    [ClassTier.SECOND]: 5.0,
    [ClassTier.LAST]: 20.0,
    [ClassTier.FINAL]: 100.0,
};

export const PASSIVE_SCALING: Record<string, number> = {
    [ClassTier.NONE]: 0.1,
    [ClassTier.FIRST]: 0.1,
    [ClassTier.SECOND]: 0.2,
    [ClassTier.LAST]: 0.5,
    [ClassTier.FINAL]: 1.0,
};

export const BUFF_SCALING: Record<string, number> = {
    [ClassTier.NONE]: 0.1,
    [ClassTier.FIRST]: 0.1,
    [ClassTier.SECOND]: 0.2,
    [ClassTier.LAST]: 0.5,
    [ClassTier.FINAL]: 1.0,
};

// Passive Config Types
export const PASSIVE_STAT_TARGETS = ['STR', 'INT', 'WIS', 'DEF', 'AGI', 'CTRL', 'MaxHP', 'MaxMP'];
export const PASSIVE_COMBAT_TARGETS = ['PAtk', 'MAtk', 'CritChance', 'CritDamage', 'CritDmgResist', 'CritResist', 'EleAtk', 'EleRes', 'StatusResist', 'ManaShield', 'Acc', 'MAcc', 'Eva', 'MEva'];

export const PASSIVE_LABEL_MAP: Record<string, string> = {
    'PAtk': '물리공격력',
    'MAtk': '마법공격력',
    'CritChance': '치명타율',
    'CritDamage': '치명타 피해량',
    'CritDmgResist': '치명타 피해 감소',
    'CritResist': '치명타 저항',
    'EleAtk': '속성 피해',
    'EleRes': '속성 저항',
    'StatusResist': '상태이상 저항',
    'ManaShield': '마나 쉴드',
    'Acc': '물리명중률',
    'MAcc': '마법명중률',
    'Eva': '물리회피율',
    'MEva': '마법회피율'
};

interface BuffConfig {
    type: 'HP_RECOV' | 'MP_RECOV' | 'STAT_BOOST' | 'CLEANSE' | 'RESURRECTION' | 'MANA_SHIELD' | 'ELEMENTAL_DMG_BOOST' | 'ELEMENTAL_RES_BOOST';
    targetStat?: string;
    targetElement?: string;
    value?: number; // percentage
    ailments?: string[]; // selected ailments for CLEANSE
}

type CreationStep = 'none' | 'select' | 'custom' | 'ai_result';

export const getMpTierMultiplier = (tier: string | ClassTier): number => {
    if (tier === ClassTier.FIRST || tier === '퍼스트 클래스' || tier === 'FIRST') return 2;
    if (tier === ClassTier.SECOND || tier === '세컨드 클래스' || tier === 'SECOND') return 3;
    if (tier === ClassTier.LAST || tier === '라스트 클래스' || tier === 'LAST') return 4;
    if (tier === ClassTier.FINAL || tier === '파이널 클래스' || tier === 'FINAL') return 2.5;
    return 2;
};

const SkillBook: React.FC<Props> = ({ isOpen, onClose, character, playerCharacter, onLearnSkill, onUpdateCharacter }) => {
  const [activeTab, setActiveTab] = useState<string>(character.classTier);
  const [selectedSkillTypeFilter, setSelectedSkillTypeFilter] = useState<'ALL' | 'ATTACK' | 'BUFF' | 'DEBUFF' | 'PASSIVE'>('ALL');
  const [creationStep, setCreationStep] = useState<CreationStep>('none');

  // 파이널 클래스 슬롯 번호(1-indexed), 기준 레벨 티어, 1000레벨당 보너스 단계 계산
  const isFinalActiveTab = activeTab === ClassTier.FINAL || activeTab === '파이널 클래스' || activeTab === 'FINAL';
  const [isFinalEnhanceOpen, setIsFinalEnhanceOpen] = useState(false);
  const finalSlotsUsage = useMemo(() => {
    return getFinalSkillSlotsUsage(character.skills || []);
  }, [character.skills]);

  const finalNextSlot = useMemo(() => {
    return getNextAvailableFinalSkillSlot(character.skills || []);
  }, [character.skills]);

  const finalEffectiveLevelTier = useMemo(() => {
    return getFinalSkillSlotLevelTier(finalNextSlot, character.level);
  }, [finalNextSlot, character.level]);

  const finalBonusSteps = useMemo(() => {
    if (!isFinalActiveTab) return 0;
    return getFinalSkillBonusSteps(finalNextSlot, character.level);
  }, [isFinalActiveTab, finalNextSlot, character.level]);

  // 시전자 최종 능력치 및 WIS·INT 합산 (체력 회복: 합산의 4배 비례, 마나 회복: 합산 비례)
  const charFinalStats = useMemo(() => {
    return calculateFinalStats(character).finalStats;
  }, [character]);
  const avgWisInt = Math.max(1, Math.floor(((charFinalStats.wis || 0) + (charFinalStats.int || 0)) / 2));
  const sumWisInt = Math.max(1, (charFinalStats.wis || 0) + (charFinalStats.int || 0));

  // 숏컷 번호 지정 모달 상태
  const [shortcutTarget, setShortcutTarget] = useState<{
    name: string;
    displayName: string;
    type: 'skill' | 'item';
    icon?: string;
    imageUrl?: string;
  } | null>(null);
  
  // 썸네일 아이콘 선택 및 인라인 수정용 상태
  const [selectedIcon, setSelectedIcon] = useState<string>('Sword');
  const [editingSkillName, setEditingSkillName] = useState<string | null>(null);
  const [editIcon, setEditIcon] = useState<string>('Sword');
  const [editImageUrl, setEditImageUrl] = useState<string>('');
  const [editElement, setEditElement] = useState<string>('무속성');
  const [editAilment, setEditAilment] = useState<string>('');
  

  
  // Custom Creation State
  const [customSkillName, setCustomSkillName] = useState('');
  const [customSkillDesc, setCustomSkillDesc] = useState('');
  const [customSkillType, setCustomSkillType] = useState<SkillType>(SkillType.PHYSICAL);

  useEffect(() => {
    if (customSkillType === SkillType.PHYSICAL) setSelectedIcon('Sword');
    else if (customSkillType === SkillType.MAGIC) setSelectedIcon('Zap');
    else if (customSkillType === SkillType.BUFF) setSelectedIcon('Shield');
    else if (customSkillType === SkillType.DEBUFF) setSelectedIcon('Skull');
    else if (customSkillType === SkillType.PASSIVE) setSelectedIcon('BookOpen');
    else if (customSkillType === SkillType.CLONE) {
      setSelectedIcon('UserPlus');
      setSummonName('그림자 분신');
      setCustomTargetType('single');
    } else if (customSkillType === SkillType.SUMMON) {
      setSelectedIcon('Sparkles');
      setSummonName('정령 소환수');
    }
  }, [customSkillType]);
  const [customTargetType, setCustomTargetType] = useState<SkillTarget>('single');
  const [customPowerRatio, setCustomPowerRatio] = useState<number>(100);
  const [customMpCost, setCustomMpCost] = useState<number>(10);
  const [selectedAilment, setSelectedAilment] = useState<string>(''); 
  const [selectedAilments, setSelectedAilments] = useState<string[]>([]);
  const [customSkillElement, setCustomSkillElement] = useState<string>(character.shinryokuType || '무속성');
  const [attackSkillEffectType, setAttackSkillEffectType] = useState<'ailment' | 'buff' | 'debuff'>('ailment');
  const [selectedAttackDebuffStat, setSelectedAttackDebuffStat] = useState<string>('P.Def');
  const [attackDebuffValue, setAttackDebuffValue] = useState<number>(10);
  
  // Buff Creation State
  const [buffTargetType, setBuffTargetType] = useState<'single' | 'aoe'>('single');
  const [buffEffects, setBuffEffects] = useState<BuffConfig[]>([]);
  const [selectedBuffType, setSelectedBuffType] = useState<string>('STAT_BOOST');

  // Debuff Creation State
  const [debuffSubType, setDebuffSubType] = useState<'STAT' | 'AILMENT' | 'BOTH'>('STAT');
  const [debuffStatType, setDebuffStatType] = useState<string>('P.Atk');
  const [debuffStatValue, setDebuffStatValue] = useState<number>(5);
  const [debuffEffects, setDebuffEffects] = useState<Array<{ type?: 'STAT' | 'AILMENT'; stat?: string; value?: number; ailment?: string }>>([{ type: 'STAT', stat: 'P.Atk', value: 5 }]);
  const [debuffAilments, setDebuffAilments] = useState<string[]>([]);

  // Passive Creation State
  const [passiveCategory, setPassiveCategory] = useState<'STAT' | 'COMBAT' | 'SPECIAL'>('STAT');
  const [passiveTarget, setPassiveTarget] = useState<string>('STR');
  const [passiveEffects, setPassiveEffects] = useState<Array<{ category: 'STAT' | 'COMBAT'; target: string; value: number; element?: string }>>([{ category: 'STAT', target: 'STR', value: 5 }]);
  const [selectedPassiveElement, setSelectedPassiveElement] = useState<string>('화염계');
  const [passiveHasCondition, setPassiveHasCondition] = useState<boolean>(false);
  const [passiveWeaponCondition, setPassiveWeaponCondition] = useState<WeaponType>('Sword');
  const [specialPassiveCode, setSpecialPassiveCode] = useState<string>('');

  // Summon Creation State
  const [summonName, setSummonName] = useState<string>('정령 소환수');
  const [summonType, setSummonType] = useState<'소환수' | '분신'>('소환수');
  const [summonCount, setSummonCount] = useState<number>(1);
  const [summonPowerLevel, setSummonPowerLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [summonDuration, setSummonDuration] = useState<number>(3);
  const [summonImageUrl, setSummonImageUrl] = useState<string>('');



  useEffect(() => {
    if (customSkillType === SkillType.CLONE) {
      setSummonType('분신');
      if (activeTab === ClassTier.SECOND) {
        setSummonPowerLevel('low');
        setCustomMpCost(1750);
        setSelectedIcon('UserPlus');
      } else if (activeTab === ClassTier.LAST) {
        setSummonPowerLevel('medium');
        setCustomMpCost(4750);
        setSelectedIcon('Users');
      } else {
        setSummonPowerLevel('high');
        setCustomMpCost(8000);
        setSelectedIcon('Crown');
      }
    } else if (customSkillType === SkillType.SUMMON) {
      setSummonType('소환수');
      setSelectedIcon('Sparkles');
      if (activeTab === ClassTier.SECOND && summonPowerLevel !== 'low') {
        setSummonPowerLevel('low');
      } else if (activeTab === ClassTier.LAST && summonPowerLevel === 'high') {
        setSummonPowerLevel('medium');
      }
      const baseMp = activeTab === ClassTier.SECOND ? 40 : activeTab === ClassTier.LAST ? 80 : 120;
      const countBonus = summonCount * 40;
      const powerBonus = summonPowerLevel === 'low' ? 20 : summonPowerLevel === 'medium' ? 40 : 60;
      const durationBonus = summonDuration * 15;
      const mult = getMpTierMultiplier(activeTab);
      setCustomMpCost(Math.floor((baseMp + countBonus + powerBonus + durationBonus) * mult));
    }
  }, [customSkillType, summonCount, summonPowerLevel, summonDuration, activeTab]);

  // AI Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isNameLoading, setIsNameLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedSkill, setGeneratedSkill] = useState<{
      name: string, 
      description: string, 
      type: SkillType, 
      powerRatio: number, 
      mpCost: number,
      effectFormula: string,
      targetType: SkillTarget
  } | null>(null);
  
  const [resultOverlay, setResultOverlay] = useState<{ show: boolean, data: ResultData | null }>({ show: false, data: null });
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setTimeout(() => setShowContent(true), 100);
        setActiveTab(character.classTier);
        setCreationStep('none');
    } else {
        setShowContent(false);
        setCreationStep('none');
        setGeneratedSkill(null);
    }
  }, [isOpen]);

  // Clamping logic for all skill types
  useEffect(() => {
      if (creationStep === 'custom') {
          // 1. 위력 상한 보정 로직 (물리/마법 공격)
          const config = TIER_CONFIG[activeTab];
          if (customSkillType === SkillType.PHYSICAL || customSkillType === SkillType.MAGIC) {
            const isNative = customSkillElement === (character.shinryokuType || '무속성');
            let adjustedMax = 100;

            if (isFinalActiveTab) {
                adjustedMax = getFinalAttackPowerCap(finalBonusSteps, customTargetType === 'aoe', isNative);
            } else if (config) {
                adjustedMax = customTargetType === 'aoe' ? Math.floor(config.maxRatio * 0.5) : config.maxRatio;
                if (activeTab === ClassTier.NONE) {
                    adjustedMax = customTargetType === 'aoe' ? 40 : 100;
                }
                if (!isNative) {
                    adjustedMax = Math.floor(adjustedMax * 0.65);
                }
            }

            if (customPowerRatio > adjustedMax) {
                setCustomPowerRatio(adjustedMax);
            }

            // 물리/마법 공격 스킬 부가 버프 및 디버프 수치 자동 조절
            if (activeTab === ClassTier.FINAL) {
                const attackBuffCap = getAttackSkillBuffCap(customTargetType, finalBonusSteps);
                setBuffEffects(prev => {
                    let changed = false;
                    const next = prev.map(ef => {
                        const clamped = Math.min(ef.value || 0, attackBuffCap);
                        if (clamped !== ef.value) changed = true;
                        return { ...ef, value: clamped };
                    });
                    return changed ? next : prev;
                });

                const attackDebuffCap = getAttackSkillDebuffCap(customTargetType, finalBonusSteps);
                if (attackDebuffValue > attackDebuffCap) {
                    setAttackDebuffValue(attackDebuffCap);
                }
            }
          }

          // 순수 버프 스킬 타겟 변경 시 효과 수치 자동 Clamping 로직
          if (customSkillType === SkillType.BUFF) {
              setBuffEffects(prev => {
                  let changed = false;
                  const next = prev.map(ef => {
                      const cap = getBuffValueCap(buffTargetType, ef.type === 'RESURRECTION', isAccOrEvaStat(ef.targetStat));
                      const clamped = Math.min(ef.value || 0, cap);
                      if (clamped !== ef.value) changed = true;
                      return { ...ef, value: clamped };
                  });
                  return changed ? next : prev;
              });
          }

          // 순수 디버프 스킬 타겟 변경 시 효과 수치 자동 Clamping 로직
          if (customSkillType === SkillType.DEBUFF) {
              const maxDebuffStat = getDebuffStatCap(customTargetType, false);
              const maxSlots = debuffLimits.maxEffects;
              setDebuffEffects(prev => {
                  let sliced = prev.slice(0, maxSlots);
                  if (sliced.length === 0) sliced = [{ type: 'STAT', stat: 'P.Atk', value: 5 }];

                  let curSum = 0;
                  let changed = prev.length !== sliced.length;
                  const next = sliced.map((ef, i) => {
                      const efType = ef.type || 'STAT';
                      if (efType === 'STAT') {
                          const remaining = Math.max(1, maxDebuffStat - curSum);
                          const val = Math.min(ef.value || 5, remaining);
                          curSum += val;
                          if (val !== ef.value || prev[i]?.stat !== ef.stat || prev[i]?.type !== 'STAT') changed = true;
                          return { ...ef, type: 'STAT' as const, value: val, stat: ef.stat || 'P.Atk' };
                      } else {
                          if (prev[i]?.type !== 'AILMENT' || prev[i]?.ailment !== ef.ailment) changed = true;
                          return { ...ef, type: 'AILMENT' as const, ailment: ef.ailment || STATUS_AILMENTS_LIST[0], value: 0 };
                      }
                  });
                  return changed ? next : prev;
              });
          }

          // 순수 패시브 스킬 자동 Clamping 로직
          if (customSkillType === SkillType.PASSIVE) {
              const maxPassiveVal = passiveCap;
              const maxSlots = passiveLimits.maxEffects;
              setPassiveEffects(prev => {
                  let sliced = prev.slice(0, maxSlots);
                  if (sliced.length === 0) sliced = [{ category: 'STAT', target: 'STR', value: 5 }];

                  let curSum = 0;
                  let changed = prev.length !== sliced.length;
                  const next = sliced.map((ef, i) => {
                      const isAccEva = isAccOrEvaStat(ef.target);
                      const slotCapMult = isAccEva ? 1.5 : 1.0;
                      let slotCap = Math.floor(maxPassiveVal * slotCapMult);
                      const isAllElemRes = ef.target === 'EleRes' && (ef.element === '모든 속성' || ef.element === '모든속성');
                      if (isAllElemRes) {
                          slotCap = Math.max(1, Math.floor(slotCap / 3));
                      }
                      if (ef.target === 'CritResist' || ef.target === 'CritDmgResist') {
                          slotCap = Math.min(10, slotCap);
                      }
                      const remaining = Math.max(1, slotCap - curSum);
                      const val = Math.min(ef.value || 5, remaining);
                      curSum += val;
                      if (val !== ef.value || prev[i]?.target !== ef.target || prev[i]?.category !== ef.category) changed = true;
                      return { ...ef, value: val };
                  });
                  return changed ? next : prev;
              });
          }

          // 2. MP 소모 계산 로직
          let cost = 0;
          if (customSkillType === SkillType.PHYSICAL || customSkillType === SkillType.MAGIC) {
              let ailmentCost = 0;
              const ailmentCount = activeTab === ClassTier.FINAL && selectedAilments.length > 0 
                  ? selectedAilments.length 
                  : (selectedAilment ? 1 : 0);
              
              if (activeTab === ClassTier.FINAL) {
                  ailmentCost = ailmentCount * 60;
              } else {
                  ailmentCost = ailmentCount * 30;
              }

              cost = Math.floor(customPowerRatio / 3) + ailmentCost;

              if (activeTab === ClassTier.FINAL && attackSkillEffectType === 'buff' && buffEffects.length > 0) {
                  cost = Math.floor(cost * (1 + buffEffects.length * 1.5));
              } else if (activeTab === ClassTier.FINAL && attackSkillEffectType === 'debuff' && selectedAttackDebuffStat) {
                  cost = Math.floor(cost * 1.5);
              }

              if (customTargetType === 'aoe') cost *= 3;

              if (activeTab === ClassTier.FINAL || activeTab === '파이널 클래스' || activeTab === 'FINAL') {
                  cost *= 3;
              } else if (activeTab === ClassTier.SECOND || activeTab === ClassTier.LAST || activeTab === '세컨드 클래스' || activeTab === '라스트 클래스' || activeTab === 'SECOND' || activeTab === 'LAST') {
                  cost *= 2;
              }
          } else if (customSkillType === SkillType.BUFF) {
              const totalValue = buffEffects.reduce((sum, ef) => {
                  if (ef.type === 'RESURRECTION') return sum + (ef.value || 0) * 2;
                  return sum + (ef.value || 0);
              }, 0);
              const effectCount = buffEffects.reduce((sum, ef) => sum + (ef.type === 'RESURRECTION' ? 2 : 1), 0);
              
              // 상태이상해제(CLEANSE) 슬롯 내 선택된 상태이상 개수 확인
              let cleanseAilmentTotalCount = 0;
              buffEffects.forEach(ef => {
                  if (ef.type === 'CLEANSE' && ef.ailments) {
                      cleanseAilmentTotalCount += ef.ailments.length;
                  }
              });

              const durationCost = 30;
              // 상태이상 해제 선택된 개수당 추가 마나 소모 (개당 40)
              const cleanseExtraCost = cleanseAilmentTotalCount * 40;

              cost = Math.floor(totalValue / 2) + (effectCount * 50) + durationCost + cleanseExtraCost;
              
              if (buffEffects.some(ef => ef.type === 'RESURRECTION')) cost += 100;

              const slotMultiplier = Math.max(1, effectCount);
              cost *= slotMultiplier;

              if (buffTargetType === 'aoe') cost *= 3;
          } else if (customSkillType === SkillType.DEBUFF) {
              let statCost = 0;
              let ailmentCost = 0;
              const totalDebuffStat = debuffEffects.reduce((sum, ef) => sum + ((ef.type === 'STAT' || !ef.type) ? (ef.value || 0) : 0), 0);
              const ailmentSlotCount = debuffEffects.filter(ef => ef.type === 'AILMENT').length;
              const debuffSlotCount = Math.max(1, debuffEffects.length);
              
              statCost = totalDebuffStat * 10;
              ailmentCost = ailmentSlotCount * 50;
              cost = statCost + ailmentCost + 30;
              
              cost *= debuffSlotCount;

              if (customTargetType === 'aoe') cost *= 3;
          } else if (customSkillType === SkillType.SUMMON) {
              const baseMp = activeTab === ClassTier.SECOND ? 40 : activeTab === ClassTier.LAST ? 80 : 120;
              const countBonus = summonCount * 40;
              const powerBonus = summonPowerLevel === 'low' ? 20 : summonPowerLevel === 'medium' ? 40 : 60;
              const durationBonus = summonDuration * 15;
              cost = Math.floor((baseMp + countBonus + powerBonus + durationBonus) / Math.max(1, getMpTierMultiplier(activeTab)));
          } else if (customSkillType === SkillType.CLONE) {
              const totalCloneMp = activeTab === ClassTier.SECOND ? 1750 : activeTab === ClassTier.LAST ? 4750 : 16000;
              cost = Math.floor(totalCloneMp / Math.max(1, getMpTierMultiplier(activeTab)));
          }

          if (customSkillType === SkillType.PASSIVE) {
              cost = 0;
          } else {
              let mult = getMpTierMultiplier(activeTab);
              if (customSkillType === SkillType.BUFF) {
                  if (activeTab === ClassTier.SECOND || activeTab === '세컨드 클래스' || activeTab === 'SECOND') {
                      mult *= 5;
                  } else if (activeTab === ClassTier.LAST || activeTab === '라스트 클래스' || activeTab === 'LAST') {
                      mult *= 10;
                  } else if (activeTab === ClassTier.FINAL || activeTab === '파이널 클래스' || activeTab === 'FINAL') {
                      mult *= 25;
                  }
              }
              cost = Math.floor(cost * mult);
          }

          const finalCost = Math.max(0, cost);
          setCustomMpCost(prev => (prev === finalCost ? prev : finalCost));
      }
  }, [customPowerRatio, customSkillType, creationStep, customTargetType, buffEffects, buffTargetType, debuffSubType, debuffStatType, debuffStatValue, debuffEffects, debuffAilments, selectedAilment, selectedAilments, attackSkillEffectType, attackDebuffValue, selectedAttackDebuffStat, activeTab, customSkillElement, character.shinryokuType, passiveHasCondition, passiveWeaponCondition, summonCount, summonPowerLevel, summonDuration]);

  useEffect(() => {
      setPassiveCategory('STAT');
      setPassiveTarget('STR');
      setSpecialPassiveCode('');
      if (activeTab === ClassTier.NONE) {
          setCustomSkillType(SkillType.PHYSICAL);
          setSelectedAilment('');
      }
  }, [activeTab]);

  const normalizeTierForTab = (tier: string): string => {
      if (!tier || tier === ClassTier.NONE) return ClassTier.NONE;
      const t = tier.replace(/\s+/g, '').toLowerCase();
      if (t.includes('combat') || t.includes('전투계열') || t.includes('style')) return 'COMBAT_STYLE';
      if (t.includes('final') || t.includes('파이널') || t.includes('4')) return ClassTier.FINAL;
      if (t.includes('last') || t.includes('라스트') || t.includes('3')) return ClassTier.LAST;
      if (t.includes('second') || t.includes('세컨드') || t.includes('2')) return ClassTier.SECOND;
      if (t.includes('first') || t.includes('퍼스트') || t.includes('1')) return ClassTier.FIRST;
      if (t.includes('bond') || t.includes('인연')) return ClassTier.BOND;
      return ClassTier.NONE;
  };

  const isTierWithinLockedPotential = (tier: string): boolean => {
      if (!(character as any).isPotentialLocked || !(character as any).isCustom) return false;
      const rankMap: Record<string, number> = {
          [ClassTier.NONE]: 0,
          [ClassTier.FIRST]: 1,
          [ClassTier.SECOND]: 2,
          [ClassTier.LAST]: 3,
          [ClassTier.FINAL]: 4
      };
      const normTarget = normalizeTierForTab(tier);
      const rawPot = (character as any).liberationPotential || character.classTier || ClassTier.NONE;
      const normPot = normalizeTierForTab(rawPot);
      const targetRank = rankMap[normTarget] ?? 99;
      const potRank = rankMap[normPot] ?? 0;
      return targetRank <= potRank && normTarget !== ClassTier.FINAL;
  };

  const getMaxSkillsForTier = (tier: string, level: number): number => {
      if (tier === 'COMBAT_STYLE') return 0;
      const hasLockedBonus = isTierWithinLockedPotential(tier);
      if (tier === ClassTier.NONE) {
          if (level < 10) return 0;
          if (level < 20) return 1;
          return 2 + (hasLockedBonus ? Math.floor((level - 20) / 100) : 0);
      }
      if (tier === ClassTier.FIRST) {
          if (level < 30) return 0;
          if (level < 50) return 1;
          if (level < 70) return 2;
          if (level < 90) return 3;
          return 4 + (hasLockedBonus ? Math.floor((level - 90) / 100) : 0);
      }
      if (tier === ClassTier.SECOND) {
          if (level < 100) return 0;
          if (level < 140) return 1;
          if (level < 180) return 2;
          if (level < 220) return 3;
          if (level < 260) return 4;
          return 5 + (hasLockedBonus ? Math.floor((level - 260) / 100) : 0);
      }
      if (tier === ClassTier.LAST) {
          if (level < 300) return 0;
          if (level < 400) return 1;
          if (level < 500) return 2;
          if (level < 600) return 3;
          if (level < 700) return 4;
          if (level < 800) return 5;
          if (level < 900) return 6;
          return 7 + (hasLockedBonus ? Math.floor((level - 900) / 100) : 0);
      }
      if (tier === ClassTier.FINAL || tier === '파이널 클래스' || tier === 'FINAL') {
          if (level < 1000 && character.classTier !== ClassTier.FINAL && !character.finalClassName) return 0;
          return Math.max(1, 1 + Math.floor((Math.max(1000, level) - 1000) / 200));
      }
      return 0;
  };

  if (!isOpen) return null;

  const isCombatStyleTab = activeTab === 'COMBAT_STYLE';
  const unlockedStyles = getUnlockedCombatStylesList(character as any);
  const equippedStyleConfig = character.combatStyle ? COMBAT_STYLE_CONFIG[character.combatStyle] : null;
  const equippedStyleTier = equippedStyleConfig?.tier || 1;
  const equippedSkillSet = character.combatStyle ? getCombatStyleSkillSet(character.combatStyle, equippedStyleTier) : null;

  const filteredSkills = useMemo(() => {
    const migratedSkills = character.skills || [];
    if (activeTab === ClassTier.BOND) {
      // 대상이 플레이어인지 동료인지 엄격히 판별
      const isPlayer = !('id' in character) || (character as any).id === 'player' || !playerCharacter || (character as any).id === (playerCharacter as any).id;
      const compId = (character as any).id;

      // 1) migratedSkills(character.skills) 내부 인연스킬 필터링
      const fromSkills = (migratedSkills || []).filter(s => {
        const norm = normalizeTierForTab(s.tier);
        const isBond = norm === ClassTier.BOND || (s.tier as any) === '인연' || (s.tier as any) === '인연스킬' || !!(s as any).isBondSkill;
        if (!isBond) return false;
        if (isPlayer) {
          // 플레이어 스킬북: 동료A-동료B 인연스킬(시전자가 다른 동료인 경우) 제외
          const bsSource = (s as any).sourceId;
          return !bsSource || bsSource === 'player';
        } else {
          // 동료 스킬북: 해당 동료가 시전자이거나 파트너인 경우만 포함
          const bsSource = (s as any).sourceId;
          const bsComp = (s as any).companionId;
          return bsSource === compId || bsComp === compId;
        }
      });

      // 2) bondSkills 배열에서 현재 대상의 인연스킬만 엄격히 필터링
      const rawBondSkills: any[] = [
        ...((character as any).bondSkills || []),
        ...((playerCharacter as any)?.bondSkills || [])
      ];

      const fromBondSkills = rawBondSkills.filter(s => {
        if (!s) return false;
        if (isPlayer) {
          // 플레이어 스킬북: 시전자가 플레이어 본인(!sourceId || sourceId === 'player')인 인연스킬만 포함
          // 동료A와 동료B 간의 인연스킬(sourceId가 다른 동료 ID)은 절대 표시하지 않음
          return !s.sourceId || s.sourceId === 'player';
        } else {
          // 동료 스킬북: 해당 동료가 참여한 인연스킬만 포함
          return s.companionId === compId || s.sourceId === compId;
        }
      });

      const combined = [...fromSkills, ...fromBondSkills];
      const uniqueMap = new Map<string, any>();
      combined.forEach(s => {
        if (s) {
          const key = s.id || s.name;
          if (!uniqueMap.has(key)) uniqueMap.set(key, s);
        }
      });
      const bondResults = Array.from(uniqueMap.values());
      if (selectedSkillTypeFilter === 'ALL') return bondResults;
      return bondResults.filter(s => {
        if (selectedSkillTypeFilter === 'ATTACK') return s.type === SkillType.PHYSICAL || s.type === SkillType.MAGIC;
        if (selectedSkillTypeFilter === 'BUFF') return s.type === SkillType.BUFF || s.type === SkillType.HEAL;
        if (selectedSkillTypeFilter === 'DEBUFF') return s.type === SkillType.DEBUFF;
        if (selectedSkillTypeFilter === 'PASSIVE') return s.type === SkillType.PASSIVE;
        return true;
      });
    }
    const baseList = (migratedSkills || []).filter(s => normalizeTierForTab(s.tier) === activeTab);
    if (selectedSkillTypeFilter === 'ALL') return baseList;
    return baseList.filter(s => {
      if (selectedSkillTypeFilter === 'ATTACK') return s.type === SkillType.PHYSICAL || s.type === SkillType.MAGIC;
      if (selectedSkillTypeFilter === 'BUFF') return s.type === SkillType.BUFF || s.type === SkillType.HEAL;
      if (selectedSkillTypeFilter === 'DEBUFF') return s.type === SkillType.DEBUFF;
      if (selectedSkillTypeFilter === 'PASSIVE') return s.type === SkillType.PASSIVE;
      return true;
    });
  }, [character.skills, (character as any).bondSkills, (playerCharacter as any)?.bondSkills, (character as any).id, playerCharacter, activeTab, selectedSkillTypeFilter]);
  const currentTierConfig = TIER_CONFIG[activeTab] || TIER_CONFIG[ClassTier.NONE];
  const tierLevels = {
      [ClassTier.NONE]: 10,
      [ClassTier.FIRST]: 30,
      [ClassTier.SECOND]: 100,
      [ClassTier.LAST]: 300,
      [ClassTier.FINAL]: 1000
  };
  
  const tierOrder = [ClassTier.NONE, ClassTier.FIRST, ClassTier.SECOND, ClassTier.LAST, ClassTier.FINAL];
  const currentTierIndex = tierOrder.indexOf(character.classTier as ClassTier);
  const activeTierIndex = tierOrder.indexOf(activeTab as ClassTier);
  
  const isClassUnlocked = activeTierIndex <= currentTierIndex || activeTab === ClassTier.BOND || (activeTab === ClassTier.FINAL && Boolean(character.finalClassName));
  const isLevelUnlocked = (activeTierIndex <= currentTierIndex) || (activeTab === ClassTier.FINAL && Boolean(character.finalClassName)) || character.level >= (tierLevels[activeTab as keyof typeof tierLevels] || 9999);
  
  const isTabUnlocked = isCombatStyleTab || (isClassUnlocked && isLevelUnlocked) || filteredSkills.length > 0;
  const isEnhanceTier = [ClassTier.FIRST, ClassTier.SECOND, ClassTier.LAST, ClassTier.FINAL].includes(activeTab as ClassTier);
  const getTierEnhanceCount = (tier: string): number => {
      const normTarget = normalizeTierForTab(tier);
      return (character.skills || []).reduce((sum, s) => {
          if (!s?.finalEnhanceData?.totalEnhanceCount) return sum;
          const normSkillTier = normalizeTierForTab(s.tier || s.baseTier || (s as any).minClassTier || '');
          return normSkillTier === normTarget ? sum + s.finalEnhanceData.totalEnhanceCount : sum;
      }, 0);
  };
  const tierEnhanceCount = getTierEnhanceCount(activeTab);
  const maxSkills = getMaxSkillsForTier(activeTab, character.level);
  const currentSkillCount = isFinalActiveTab ? finalSlotsUsage.usedSlots.size : (filteredSkills.length + tierEnhanceCount);
  const canCreateSkill = !isCombatStyleTab && isTabUnlocked && currentSkillCount < maxSkills;

  const tierSlotItems = useMemo(() => {
    if (isFinalActiveTab) return null;
    const items: Array<{
      slot: number;
      skill: Skill;
      isEnhance: boolean;
      enhanceIndex?: number;
    }> = [];

    let currentSlot = 1;
    // 1) 각 스킬 자체 슬롯 할당
    for (const skill of filteredSkills) {
      if (currentSlot <= maxSkills) {
        items.push({
          slot: currentSlot++,
          skill,
          isEnhance: false
        });
      }
    }
    // 2) 각 스킬의 강화 횟수 슬롯 할당
    for (const skill of filteredSkills) {
      const enhances = skill.finalEnhanceData?.totalEnhanceCount || 0;
      for (let e = 1; e <= enhances; e++) {
        if (currentSlot <= maxSkills) {
          items.push({
            slot: currentSlot++,
            skill,
            isEnhance: true,
            enhanceIndex: e
          });
        }
      }
    }
    return items;
  }, [isFinalActiveTab, filteredSkills, maxSkills]);
  const isSpecialTier = [ClassTier.LAST, ClassTier.FINAL].includes(activeTab as ClassTier);
  const isFinalTier = activeTab === ClassTier.FINAL;
  const isNoneTier = activeTab === ClassTier.NONE;
  
  const getRequiredShardCountForTier = (tier: string): number => {
      const t = String(tier || '').toUpperCase();
      if (t.includes('FINAL') || t.includes('파이널')) return 100;
      if (t.includes('LAST') || t.includes('라스트')) return 30;
      if (t.includes('SECOND') || t.includes('세컨드')) return 10;
      if (t.includes('FIRST') || t.includes('퍼스트')) return 5;
      return 5;
  };

  const getShardCount = (element: string): number => {
      if (!element || element === '무속성') return 999;
      const cleanKey = element.trim();
      const shortKey = cleanKey.endsWith('계') ? cleanKey.slice(0, -1) : cleanKey;
      const targetChar = (playerCharacter || character);

      const baseShards = targetChar.base?.elementalShards || {};
      const countFromBase = (baseShards[cleanKey] || 0) + (baseShards[shortKey] || 0);

      const charShards = (targetChar as any).shards || {};
      const countFromShards = (charShards[cleanKey] || 0) + (charShards[shortKey] || 0);

      const inv = targetChar.inventory || [];
      const countFromInv = inv.filter(i => {
          const name = i.name || '';
          return name === `${cleanKey} 조각` || name === `${shortKey} 조각` || name === cleanKey || name === shortKey;
      }).reduce((sum, item) => sum + (item.quantity || 1), 0);

      return countFromBase + countFromShards + countFromInv;
  };

  const getMaxPassiveSkillsForTier = (tier: string): number | null => {
      const t = normalizeTierForTab(tier);
      if (t === ClassTier.FIRST || t === ClassTier.SECOND) return 2;
      if (t === ClassTier.LAST) return 3;
      if (t === ClassTier.FINAL) return null; // 파이널 클래스는 제한 없음
      return 1;
  };

  const currentTierPassiveCount = filteredSkills.filter(s => s.type === SkillType.PASSIVE).length;
  const maxPassivesForTier = getMaxPassiveSkillsForTier(activeTab);
  const isPassiveLimitReached = maxPassivesForTier !== null && currentTierPassiveCount >= maxPassivesForTier;

  const getBuffLimits = () => {
      if ((customSkillType === SkillType.PHYSICAL || customSkillType === SkillType.MAGIC) && activeTab === ClassTier.FINAL) {
          return { maxEffects: 2 };
      }
      if (activeTab === ClassTier.FIRST) return { maxEffects: 1 };
      if (activeTab === ClassTier.SECOND) return { maxEffects: 2 };
      if (activeTab === ClassTier.LAST) return { maxEffects: 3 };
      if (activeTab === ClassTier.FINAL) return { maxEffects: 4 };
      return { maxEffects: 1 };
  };
  const buffLimits = getBuffLimits();

  const getDebuffLimits = () => {
      if (activeTab === ClassTier.FIRST) return { maxEffects: 1 };
      if (activeTab === ClassTier.SECOND) return { maxEffects: 2 };
      if (activeTab === ClassTier.LAST) return { maxEffects: 3 };
      if (activeTab === ClassTier.FINAL) return { maxEffects: 4 };
      return { maxEffects: 1 };
  };
  const debuffLimits = getDebuffLimits();
  
  const getBuffLevelScale = (tier: ClassTier) => {
      if (tier === ClassTier.FIRST) return 0.1;
      if (tier === ClassTier.SECOND) return 0.2;
      if (tier === ClassTier.LAST) return 0.5;
      if (tier === ClassTier.FINAL) return 1.0;
      return 1.0;
  };

  const isAttackSkillWithBuffTab = (customSkillType === SkillType.PHYSICAL || customSkillType === SkillType.MAGIC) && activeTab === ClassTier.FINAL && attackSkillEffectType === 'buff';
  const buffSlotCount = Math.max(1, buffEffects.length);
  const buffBaseCap = isAttackSkillWithBuffTab
      ? getAttackSkillBuffCap(customTargetType, isFinalActiveTab ? finalBonusSteps : 0)
      : getBuffBaseCap(activeTab, buffTargetType, false, false, false, isFinalActiveTab ? finalBonusSteps : 0);
  const buffTotalCap = isAttackSkillWithBuffTab
      ? getAttackSkillBuffCap(customTargetType, isFinalActiveTab ? finalBonusSteps : 0)
      : getBuffTotalCap(activeTab, buffTargetType, buffSlotCount, false, false, false, isFinalActiveTab ? finalBonusSteps : 0);
  const buffValueCap = buffTotalCap;

  const getBuffValueCap = (target: 'single' | 'aoe', isResurrection: boolean = false, isAccEva: boolean = false, slotCountOverride?: number) => {
      const count = slotCountOverride !== undefined ? slotCountOverride : buffSlotCount;
      return isAttackSkillWithBuffTab
          ? getAttackSkillBuffCap(target as any, isFinalActiveTab ? finalBonusSteps : 0)
          : getBuffTotalCap(activeTab, target, count, isAccEva, false, false, isFinalActiveTab ? finalBonusSteps : 0);
  };
  
  const getCleanseLimit = (target: 'single' | 'aoe') => {
      const isAoE = target === 'aoe';
      if (activeTab === ClassTier.FIRST) return isAoE ? 1 : 2;
      if (activeTab === ClassTier.SECOND) return isAoE ? 2 : 4;
      if (activeTab === ClassTier.LAST) return isAoE ? 3 : 6;
      if (activeTab === ClassTier.FINAL) return isAoE ? 6 : 12;
      return 1;
  };

  const baseResurrection = getBaseResurrectionRecovery(activeTab, buffTargetType === 'aoe');
  const resurrectionCap = baseResurrection;
  const cleanseLimit = getCleanseLimit(buffTargetType);

  const debuffSlotCount = Math.max(1, debuffEffects.length);
  const isCurrentDebuffAccEva = isAccOrEvaStat(debuffStatType);
  const debuffBaseCap = getDebuffBaseCap(activeTab, customTargetType, isCurrentDebuffAccEva, false, finalBonusSteps);
  const debuffTotalCap = getDebuffTotalCap(activeTab, customTargetType, debuffSlotCount, isCurrentDebuffAccEva, false, finalBonusSteps);
  const debuffStatCap = debuffTotalCap;

  const getDebuffStatCap = (target: SkillTarget, isAccEva: boolean = false, slotCountOverride?: number) => {
      const count = slotCountOverride !== undefined ? slotCountOverride : debuffSlotCount;
      return getDebuffTotalCap(activeTab, target, count, isAccEva, false, finalBonusSteps);
  };

  const getDebuffAilmentLimit = (target: SkillTarget) => {
      const isAoE = target === 'aoe';
      if (activeTab === ClassTier.FIRST) return isAoE ? 1 : 1;
      if (activeTab === ClassTier.SECOND) return isAoE ? 1 : 2;
      if (activeTab === ClassTier.LAST) return isAoE ? 2 : 2;
      if (activeTab === ClassTier.FINAL) return isAoE ? 2 : 3;
      return 1;
  };

  const debuffAilmentLimit = getDebuffAilmentLimit(customTargetType);
  const getPassiveLimits = () => {
      if (activeTab === ClassTier.FIRST) return { maxEffects: 1 };
      if (activeTab === ClassTier.SECOND) return { maxEffects: 2 };
      if (activeTab === ClassTier.LAST) return { maxEffects: 3 };
      if (activeTab === ClassTier.FINAL) return { maxEffects: 4 };
      return { maxEffects: 1 };
  };
  const passiveLimits = getPassiveLimits();

  const getPassiveCap = () => {
      const bonusMult = passiveHasCondition ? 1.2 : 1.0;
      let baseCap = 5;
      if (activeTab === ClassTier.FIRST) baseCap = 5;
      else if (activeTab === ClassTier.SECOND) baseCap = 10;
      else if (activeTab === ClassTier.LAST) baseCap = 20;
      else if (activeTab === ClassTier.FINAL) baseCap = getFinalPassiveStatCap(finalBonusSteps);

      return Math.floor(baseCap * bonusMult);
  };
  const passiveCap = getPassiveCap();

  const canSelectBoth = [ClassTier.LAST, ClassTier.FINAL].includes(activeTab as ClassTier);

  let nextUnlockLevel = 0;
  const isCurrentTabLockedBonus = isTierWithinLockedPotential(activeTab);
  if (!canCreateSkill && isTabUnlocked) {
      if (activeTab === ClassTier.NONE) {
          const milestones = [10, 20];
          nextUnlockLevel = currentSkillCount < milestones.length
              ? milestones[currentSkillCount]
              : (isCurrentTabLockedBonus ? 20 + (currentSkillCount - 1) * 100 : 0);
      } else if (activeTab === ClassTier.FIRST) {
          const milestones = [30, 50, 70, 90];
          nextUnlockLevel = currentSkillCount < milestones.length
              ? milestones[currentSkillCount]
              : (isCurrentTabLockedBonus ? 90 + (currentSkillCount - 3) * 100 : 0);
      } else if (activeTab === ClassTier.SECOND) {
          const milestones = [100, 140, 180, 220, 260];
          nextUnlockLevel = currentSkillCount < milestones.length
              ? milestones[currentSkillCount]
              : (isCurrentTabLockedBonus ? 260 + (currentSkillCount - 4) * 100 : 0);
      } else if (activeTab === ClassTier.LAST) {
          const milestones = [300, 400, 500, 600, 700, 800, 900];
          nextUnlockLevel = currentSkillCount < milestones.length
              ? milestones[currentSkillCount]
              : (isCurrentTabLockedBonus ? 900 + (currentSkillCount - 6) * 100 : 0);
      } else if (activeTab === ClassTier.FINAL) {
          if (character.level < 1000) {
              nextUnlockLevel = 1000;
          } else {
              nextUnlockLevel = 1000 + currentSkillCount * 200;
          }
      }
  }

  const resetForm = () => {
      setCustomSkillName('');
      setCustomSkillDesc('');
      setCustomSkillType(SkillType.PHYSICAL);
      setCustomTargetType('single');
      setCustomPowerRatio(isNoneTier ? 90 : 100);
      setCustomMpCost(10);
      setGeneratedSkill(null);
      setBuffEffects([]);
      setBuffTargetType('single');
      setSelectedAilment('');
      setSelectedAilments([]);
      setCustomSkillElement(character.shinryokuType || '무속성');
      setAttackSkillEffectType('ailment');
      setSelectedAttackDebuffStat('P.Def');
      setAttackDebuffValue(10);
      setDebuffSubType('STAT');
      setDebuffStatType('P.Atk');
      setDebuffStatValue(5);
      setDebuffEffects([{ stat: 'P.Atk', value: 5 }]);
      setDebuffAilments([]);
      setPassiveCategory('STAT');
      setPassiveTarget('STR');
      setPassiveHasCondition(false);
      setPassiveWeaponCondition('Sword');
      setSpecialPassiveCode('');
  };

  const handleLearn = (skill: any) => {
      if (isSubmitting) return;
      setIsSubmitting(true);

      const requiredShardCount = getRequiredShardCountForTier(activeTab);
      if (skill.type === SkillType.PASSIVE && maxPassivesForTier !== null && currentTierPassiveCount >= maxPassivesForTier) {
          alert(`${currentTierConfig.label}에서는 패시브 스킬을 최대 ${maxPassivesForTier}개까지만 배울 수 있습니다. (현재: ${currentTierPassiveCount}/${maxPassivesForTier}개)`);
          setIsSubmitting(false);
          return;
      }
      if (skill.consumedShard && getShardCount(skill.consumedShard) < requiredShardCount) {
          alert(`타속성(${skill.consumedShard}) 스킬을 연구하려면 [${skill.consumedShard} 조각] ${requiredShardCount}개가 필요합니다.`);
          setIsSubmitting(false);
          return;
      }

      // [신력 특수 패시브 동일 효과 중복 생성 제한 검사]
      let specialCodeToLearn = '';
      const formulaStr = skill.formulaOverride || skill.effectFormula || '';
      const specialMatch = formulaStr.match(/SPECIAL:([A-Z0-9_]+)/);
      if (specialMatch) {
          specialCodeToLearn = specialMatch[1];
      } else if (passiveCategory === 'SPECIAL' && specialPassiveCode) {
          specialCodeToLearn = specialPassiveCode;
      }

      if (specialCodeToLearn) {
          const alreadyHasThisSpecial = character.skills.some(s => 
              (s.effectFormula || "").includes(`SPECIAL:${specialCodeToLearn}`) ||
              (s.effectFormula || "").includes(specialCodeToLearn)
          );
          if (alreadyHasThisSpecial) {
              alert("해당 특수 패시브 효과는 이미 습득하여 보유 중입니다. (동일한 특수 패시브 효과는 1개만 습득 가능합니다.)");
              setIsSubmitting(false);
              return;
          }
      }
      let finalDescription = skill.description;
      if (activeTab === ClassTier.FINAL && selectedAilments.length > 0) {
          finalDescription += ` [부가 효과: ${selectedAilments.join(', ')}]`;
      } else if (selectedAilment) {
          finalDescription += ` [부가 효과: ${selectedAilment}]`;
      }
      
      // 신력 조각 차감 및 스킬 습득은 onLearnSkill에서 플레이어/동료 구분에 맞추어 안전하게 일괄 처리
      onLearnSkill({ 
          ...skill, 
          finalSkillSlot: skill.finalSkillSlot || (isFinalActiveTab ? finalNextSlot : undefined),
          consumedShard: skill.consumedShard,
          consumedShardCount: requiredShardCount,
          description: finalDescription 
      }, activeTab);
      
      setResultOverlay({
          show: true,
          data: {
              type: 'success',
              title: '스킬 연구 성공!',
              message: `${skill.name} 스킬을 성공적으로 연구하여 습득했습니다.`,
              items: [
                  { label: '습득 스킬', after: skill.name },
                  { label: '클래스', after: activeTab },
                  ...(skill.consumedShard ? [{ label: '소모 재료', after: `${skill.consumedShard} 조각 ${requiredShardCount}개` }] : [])
              ]
          }
      });

      setActiveTab(activeTab);
      setCreationStep('none');
      resetForm();
      setIsSubmitting(false);
  };

  const getPassiveConfig = () => {
      const isCond = passiveHasCondition;
      const bonusMult = isCond ? 1.2 : 1.0;
      const isAccEva = isAccOrEvaStat(passiveTarget);
      const targetMult = isAccEva ? 1.5 : 1.0;
      
      let base = 0;
      const scale = PASSIVE_SCALING[activeTab] || 0.1;

      if (passiveCategory === 'STAT') {
          if (activeTab === ClassTier.FIRST) { base = 5; }
          else if (activeTab === ClassTier.SECOND) { base = 10; }
          else if (activeTab === ClassTier.LAST) { base = 20; }
          else if (activeTab === ClassTier.FINAL) { base = getFinalPassiveStatCap(finalBonusSteps); }
      } else {
          // Combat Effect (CritChance, CritDamage, EleAtk, EleRes, StatusResist, ManaShield, Acc, MAcc, Eva, MEva)
          if (activeTab === ClassTier.SECOND) { base = 5; }
          else if (activeTab === ClassTier.LAST) { base = 10; }
          else if (activeTab === ClassTier.FINAL) { base = getFinalPassiveCombatCap(finalBonusSteps); }
      }

      base = Math.floor(base * bonusMult * targetMult);
      const finalScale = parseFloat((scale * bonusMult * targetMult).toFixed(2));
      return { base, scale: finalScale };
  };

  const getFormulaPreview = () => {
      if (customSkillType === SkillType.PASSIVE) {
          if (passiveCategory === 'SPECIAL' && specialPassiveCode) {
              return `PASSIVE: [SPECIAL:${specialPassiveCode}]`;
          }
          const scale = PASSIVE_SCALING[activeTab] || 0.1;
          const condStr = passiveHasCondition ? ` [COND: ${passiveWeaponCondition}]` : '';

          const parts = passiveEffects.map(ef => {
              let targetLabel = ef.category === 'COMBAT' ? (PASSIVE_LABEL_MAP[ef.target] || ef.target) : ef.target;
              if (ef.target === 'EleAtk') targetLabel = `${ef.element || selectedPassiveElement} 피해`;
              if (ef.target === 'EleRes') targetLabel = `${ef.element || selectedPassiveElement} 저항`;
              if (ef.target === 'ManaShield') return `[MANA_SHIELD] +${ef.value}% (+${scale}% per Lv)`;
              const isAllRes = ef.target === 'EleRes' && (ef.element === '모든 속성' || ef.element === '모든속성');
              const effectiveScale = isAllRes ? +(scale / 3).toFixed(2) : scale;
              return `[${targetLabel}] +${ef.value}% (+${effectiveScale}% per Lv)`;
          });

          return `PASSIVE: ${parts.join(' ')}${condStr}`;
      }
      
      if (customSkillType === SkillType.DEBUFF) {
          const parts: string[] = [];
          debuffEffects.forEach(ef => {
              const efType = ef.type || 'STAT';
              if (efType === 'STAT') {
                  parts.push(`[${ef.stat} -${ef.value || 0}%]`);
              } else if (efType === 'AILMENT' && ef.ailment) {
                  parts.push(`[${ef.ailment}]`);
              }
          });
          const { total } = calculateTotalStats(character);
          const successRate = calculateDebuffSuccessRate(total, { ctrl: 10 } as any);
          return `디버프: ${parts.join(' ')} (기본 성공률: ~${successRate}%, 적 저항률에 따라 최종 변동)`;
      }

      if (customSkillType === SkillType.BUFF) {
          const lvScale = getBuffLevelScale(activeTab as ClassTier);
          const parts = buffEffects.map(ef => {
              if (ef.type === 'STAT_BOOST') return `${STAT_DISPLAY_NAMES[ef.targetStat || ''] || ef.targetStat} ${ef.value}% 증가(Lv당+${lvScale}%)`;
              if (ef.type === 'ELEMENTAL_DMG_BOOST') return `${ef.targetElement || '속성'} 피해 ${ef.value}% 증가(Lv당+${lvScale}%)`;
              if (ef.type === 'ELEMENTAL_RES_BOOST') return `${ef.targetElement || '속성'} 저항 ${ef.value}% 증가(Lv당+${lvScale}%)`;
              if (ef.type === 'HP_RECOV') return `HP +${ef.value}% 회복(WIS·INT합산x4 비례, 예상: +${Math.max(10, Math.floor(sumWisInt * 4 * (ef.value || 0) / 100))}, Lv당+${lvScale}%)`;
              if (ef.type === 'MP_RECOV') return `MP +${ef.value}% 회복(WIS·INT합산 비례, 예상: +${Math.max(5, Math.floor(sumWisInt * (ef.value || 0) / 100))}, Lv당+${lvScale}%)`;
              if (ef.type === 'CLEANSE') return `상태이상 해제(${ef.ailments?.join(',') || '없음'})`;
              if (ef.type === 'RESURRECTION') {
                  return `RESURRECT ${ef.value}%`;
              }
              if (ef.type === 'MANA_SHIELD') return `MANA_SHIELD ${ef.value}%`;
              return '';
          });
          const durationText = (buffEffects.some(ef => ef.type === 'RESURRECTION')) ? '' : ' (3턴)';
          const { total } = calculateTotalStats(character);
          const successRate = calculateBuffSuccessRate(total);
          return `${parts.join(', ')}${durationText} [성공률: ${successRate}%]`;
      }

      const mainStatLabel = customSkillType === SkillType.PHYSICAL ? 'P.Atk' : 
                          customSkillType === SkillType.MAGIC ? 'M.Atk' : 'Atk';

      const isAttackWithBuff = activeTab === ClassTier.FINAL && 
                              attackSkillEffectType === 'buff' && 
                              buffEffects.length > 0;

      // 물공/마공에 버프가 딸린 경우 공격력 계수 성장률 절반인 50% 적용
      const scale = isAttackWithBuff ? ATTACK_SKILL_WITH_BUFF_DAMAGE_SCALE : (ATTACK_SCALING[activeTab] || 1.0);
      const atkVal = customSkillType === SkillType.PHYSICAL ? (charFinalStats.str || 10) : (charFinalStats.int || 10);
      const estimatedDmg = Math.max(10, Math.floor(atkVal * (customPowerRatio / 100)));
      const baseFormula = `(${mainStatLabel} * (${customPowerRatio} + (Lv * ${scale}))%, 예상: ~${estimatedDmg} 피해)`;
      
      if (isAttackWithBuff) {
          const buffCap = getAttackSkillBuffCap(customTargetType, finalBonusSteps);
          const buffSummary = buffEffects.map(ef => {
              const safeVal = Math.min(ef.value, buffCap);
              if (ef.type === 'STAT_BOOST') return `${STAT_DISPLAY_NAMES[ef.targetStat || ''] || ef.targetStat} +${safeVal}%(Lv당+0.5%)`;
              if (ef.type === 'ELEMENTAL_DMG_BOOST') return `${ef.targetElement || '속성'} 피해 +${safeVal}%(Lv당+0.5%)`;
              if (ef.type === 'ELEMENTAL_RES_BOOST') return `${ef.targetElement || '속성'} 저항 +${safeVal}%(Lv당+0.5%)`;
              if (ef.type === 'HP_RECOV') return `HP +${safeVal}% 회복(WIS·INT합산x4 비례, 예상: +${Math.max(10, Math.floor(sumWisInt * 4 * safeVal / 100))}, Lv당+0.5%)`;
              if (ef.type === 'MP_RECOV') return `MP +${safeVal}% 회복(WIS·INT합산 비례, 예상: +${Math.max(5, Math.floor(sumWisInt * safeVal / 100))}, Lv당+0.5%)`;
              return '';
          }).filter(Boolean).join(', ');
          return `${baseFormula} + [버프: ${buffSummary}]`;
      }

      if (activeTab === ClassTier.FINAL && attackSkillEffectType === 'debuff' && selectedAttackDebuffStat) {
          const debuffCap = getAttackSkillDebuffCap(customTargetType, finalBonusSteps);
          const safeDebuffVal = Math.min(attackDebuffValue, debuffCap);
          return `${baseFormula} + [디버프: ${getAttackDebuffKoreanName(selectedAttackDebuffStat)} -${safeDebuffVal}%]`;
      }

      if (activeTab === ClassTier.FINAL && selectedAilments.length > 0) {
          return `${baseFormula} + [${selectedAilments.join(', ')} 부여]`;
      }

      if (selectedAilment) return `${baseFormula} + [${selectedAilment} 부여]`;
      return baseFormula;
  };

  const toggleDebuffAilment = (ailment: string) => {
      if (debuffAilments.includes(ailment)) {
          setDebuffAilments(prev => prev.filter(a => a !== ailment));
      } else {
          if (debuffAilments.length < debuffAilmentLimit) {
              setDebuffAilments(prev => [...prev, ailment]);
          }
      }
  };

  const handleAddBuffEffect = () => {
      const minTier = getRequiredMinTier(activeTab);

      const isRestrictedBuff = ['HP_RECOV', 'MP_RECOV', 'CLEANSE', 'RESURRECTION'].includes(selectedBuffType);
      if (isRestrictedBuff) {
          if (activeTab === ClassTier.SECOND && !hasCombatStyle(character, CombatStyle.CLERIC)) {
              alert("세컨드 클래스에서 이 버프를 추가하려면 '클레릭' 전투계열 습득이 필요합니다.");
              return;
          }
          if (activeTab === ClassTier.LAST && !hasCombatStyle(character, CombatStyle.PRIEST)) {
              alert("라스트 클래스에서 이 버프를 추가하려면 '프리스트' 전투계열 습득이 필요합니다.");
              return;
          }
          if (activeTab === ClassTier.FINAL && !hasCombatStyle(character, CombatStyle.SAINT)) {
              alert("파이널 클래스에서 이 버프를 추가하려면 '세인트' 전투계열 습득이 필요합니다.");
              return;
          }
      }

      if (selectedBuffType === 'MANA_SHIELD') {
          if (!isSpecialTier) {
              alert("마나 쉴드는 라스트 클래스 이상(3차/4차)부터 추가할 수 있습니다.");
              return;
          }
          if (minTier > 1 && !hasCombatStyleOfRootAndTier(character, MANA_SHIELD_ROOTS, minTier)) {
              const tierName = activeTab === ClassTier.LAST ? "라스트" : "파이널";
              alert(`${tierName} 클래스에서 마나 쉴드를 추가하려면 '마법사' 또는 '에너자이저' 계열의 ${minTier}차 이상 전투계열 습득이 필요합니다.`);
              return;
          }
      }

      if (selectedBuffType === 'RESURRECTION') {
          if (!isSpecialTier) {
              alert("부활은 라스트 클래스 이상(3차/4차)부터 추가할 수 있습니다.");
              return;
          }
      }

      const currentSlotsUsed = buffEffects.reduce((sum, ef) => sum + (ef.type === 'RESURRECTION' ? 2 : 1), 0);
      const requiredSlots = selectedBuffType === 'RESURRECTION' ? 2 : 1;

      if (currentSlotsUsed + requiredSlots > buffLimits.maxEffects) {
          alert(`슬롯이 부족합니다. (현재 사용: ${currentSlotsUsed}/${buffLimits.maxEffects}, 필요: ${requiredSlots})`);
          return;
      }

      const nextCount = buffEffects.length + 1;
      const isAttackSkillWithBuffTab = (customSkillType === SkillType.PHYSICAL || customSkillType === SkillType.MAGIC) && activeTab === ClassTier.FINAL && attackSkillEffectType === 'buff';
      const nextTotalCap = isAttackSkillWithBuffTab
          ? getAttackSkillBuffCap(customTargetType, isFinalActiveTab ? finalBonusSteps : 0)
          : getBuffTotalCap(activeTab, buffTargetType, nextCount, false, false, false, isFinalActiveTab ? finalBonusSteps : 0);
      const currentTotalValue = buffEffects.reduce((sum, ef) => sum + (ef.value || 0), 0);
      const remainingCap = Math.max(0, nextTotalCap - currentTotalValue);
      if (remainingCap <= 0 && selectedBuffType !== 'CLEANSE') {
          alert("설정 가능한 버프 비율 상한에 이미 도달했습니다. 기존 슬롯의 비율을 조정한 후 추가해 주세요.");
          return;
      }
      
      const currentBaseCap = isAttackSkillWithBuffTab
          ? getAttackSkillBuffCap(customTargetType, isFinalActiveTab ? finalBonusSteps : 0)
          : buffBaseCap;
      const initialValue = Math.max(1, Math.min(10, remainingCap, currentBaseCap));

      if (selectedBuffType === 'ELEMENTAL_DMG_BOOST' || selectedBuffType === 'ELEMENTAL_RES_BOOST') {
          const defaultElem = '화염계';
          const newEffect: BuffConfig = { type: selectedBuffType as any, targetElement: defaultElem, value: initialValue };
          setBuffEffects([...buffEffects, newEffect]);
      } else if (selectedBuffType === 'STAT_BOOST') {
          const availableStat = BUFF_STATS.find(stat => !isStatLocked(character, stat, activeTab) && !buffEffects.some(ef => ef.type === 'STAT_BOOST' && ef.targetStat === stat));
          if (!availableStat) {
              alert("현재 습득한 전투계열에 맞는 사용 가능한 버프 능력치가 없거나 이미 모두 선택되었습니다.");
              return;
          }
          const newEffect: BuffConfig = { type: 'STAT_BOOST', targetStat: availableStat, value: Math.max(1, Math.min(5, remainingCap, buffBaseCap)) };
          setBuffEffects([...buffEffects, newEffect]);
      } else {
          const alreadyExists = buffEffects.some(ef => ef.type === selectedBuffType);
          if (alreadyExists) {
              alert("동일한 종류의 버프 옵션은 중복 선택할 수 없습니다.");
              return;
          }

          const newEffect: BuffConfig = { type: selectedBuffType as any, value: initialValue };
          if (selectedBuffType === 'CLEANSE') { newEffect.value = 0; newEffect.ailments = []; }
          setBuffEffects([...buffEffects, newEffect]);
      }
  };

  const removeBuffEffect = (idx: number) => {
      const newEffects = [...buffEffects];
      newEffects.splice(idx, 1);
      setBuffEffects(newEffects);
  };

  const updateBuffEffect = (idx: number, field: keyof BuffConfig, value: any) => {
      const newEffects = [...buffEffects];
      
      if (field === 'targetStat' && value) {
          const alreadyUsed = newEffects.some((ef, i) => i !== idx && ef.type === 'STAT_BOOST' && ef.targetStat === value);
          if (alreadyUsed) {
              alert("이미 다른 슬롯에서 선택된 능력치입니다.");
              return;
          }
      }

      if (field === 'targetElement') {
          const isAttackSkill = (customSkillType === SkillType.PHYSICAL || customSkillType === SkillType.MAGIC) && activeTab === ClassTier.FINAL;
          const isAllElem = value === '모든 속성' || value === '모든속성';
          const otherSum = newEffects.reduce((s, ef, i) => i === idx || ef.type === 'CLEANSE' ? s : s + (ef.value || 0), 0);
          const maxAllowed = isAttackSkill ? Math.max(0, getAttackSkillBuffCap(customTargetType, isFinalActiveTab ? finalBonusSteps : 0) - otherSum) : getBuffSlotMaxAllowed(activeTab, buffTargetType, newEffects.length, otherSum, false, false, isAllElem, isFinalActiveTab ? finalBonusSteps : 0);
          const safeVal = Math.min(newEffects[idx].value || 5, maxAllowed);
          newEffects[idx] = { ...newEffects[idx], targetElement: value, value: safeVal };
      } else if (field === 'value') {
          const isAttackSkill = (customSkillType === SkillType.PHYSICAL || customSkillType === SkillType.MAGIC) && activeTab === ClassTier.FINAL;
          const isStatAccEva = newEffects[idx].type === 'STAT_BOOST' && isAccOrEvaStat(newEffects[idx].targetStat);
          const isAllElem = (newEffects[idx].type === 'ELEMENTAL_DMG_BOOST' || newEffects[idx].type === 'ELEMENTAL_RES_BOOST') && (newEffects[idx].targetElement === '모든 속성' || newEffects[idx].targetElement === '모든속성');
          const otherSum = newEffects.reduce((s, ef, i) => i === idx || ef.type === 'CLEANSE' ? s : s + (ef.value || 0), 0);
          const maxAllowed = isAttackSkill ? Math.max(0, getAttackSkillBuffCap(customTargetType, isFinalActiveTab ? finalBonusSteps : 0) - otherSum) : getBuffSlotMaxAllowed(activeTab, buffTargetType, newEffects.length, otherSum, isStatAccEva, false, isAllElem, isFinalActiveTab ? finalBonusSteps : 0);
          const safeVal = Math.min(Math.max(0, Number(value) || 0), maxAllowed);
          newEffects[idx] = { ...newEffects[idx], value: safeVal };
      } else {
          newEffects[idx] = { ...newEffects[idx], [field]: value };
      }
      setBuffEffects(newEffects);
  };

  const handleAddDebuffEffect = () => {
      if (debuffEffects.length >= debuffLimits.maxEffects) {
          alert(`슬롯이 가득 찼습니다. (최대 ${debuffLimits.maxEffects}개)`);
          return;
      }
      const nextCount = debuffEffects.length + 1;
      const nextTotalCap = getDebuffTotalCap(activeTab, customTargetType, nextCount, isCurrentDebuffAccEva, false, isFinalActiveTab ? finalBonusSteps : 0);
      const statDebuffSum = debuffEffects.reduce((sum, ef) => sum + ((ef.type === 'STAT' || !ef.type) ? (ef.value || 0) : 0), 0);
      const remainingCap = Math.max(0, nextTotalCap - statDebuffSum);
      const availableStat = DEBUFF_STATS.find(s => !debuffEffects.some(ef => (ef.type === 'STAT' || !ef.type) && ef.stat === s)) || DEBUFF_STATS[0];
      const initialVal = Math.max(1, Math.min(5, remainingCap, debuffBaseCap));
      setDebuffEffects([...debuffEffects, { type: 'STAT', stat: availableStat, value: initialVal }]);
  };

  const removeDebuffEffect = (idx: number) => {
      if (debuffEffects.length <= 1) {
          alert("최소 1개의 디버프 슬롯이 유지되어야 합니다.");
          return;
      }
      const newEffects = [...debuffEffects];
      newEffects.splice(idx, 1);
      setDebuffEffects(newEffects);
  };

  const updateDebuffEffect = (idx: number, field: 'type' | 'stat' | 'value' | 'ailment', value: any) => {
      const newEffects = [...debuffEffects];
      if (field === 'type') {
          if (value === 'AILMENT') {
              const availableAilment = STATUS_AILMENTS_LIST.find(a => !newEffects.some((e, i) => i !== idx && e.type === 'AILMENT' && e.ailment === a)) || STATUS_AILMENTS_LIST[0];
              newEffects[idx] = { type: 'AILMENT', ailment: availableAilment, value: 0 };
          } else {
              const statDebuffSum = newEffects.reduce((s, ef, i) => (i === idx || ef.type === 'AILMENT') ? s : s + (ef.value || 0), 0);
              const remainingCap = Math.max(0, debuffStatCap - statDebuffSum);
              const availableStat = DEBUFF_STATS.find(s => !newEffects.some((e, i) => i !== idx && (e.type === 'STAT' || !e.type) && e.stat === s)) || DEBUFF_STATS[0];
              const initialVal = Math.max(1, Math.min(5, remainingCap, debuffBaseCap));
              newEffects[idx] = { type: 'STAT', stat: availableStat, value: initialVal };
          }
      } else if (field === 'stat') {
          const alreadyUsed = newEffects.some((ef, i) => i !== idx && (ef.type === 'STAT' || !ef.type) && ef.stat === value);
          if (alreadyUsed) {
              alert("이미 다른 슬롯에서 선택된 능력치입니다.");
              return;
          }
          newEffects[idx] = { ...newEffects[idx], stat: value };
      } else if (field === 'value') {
          const otherSum = newEffects.reduce((s, ef, i) => (i === idx || ef.type === 'AILMENT') ? s : s + (ef.value || 0), 0);
          const isAccEva = isAccOrEvaStat(newEffects[idx].stat);
          const maxAllowed = getDebuffSlotMaxAllowed(activeTab, customTargetType, newEffects.length, otherSum, isAccEva, false, finalBonusSteps);
          const safeVal = Math.max(1, Math.min(Number(value) || 0, maxAllowed));
          newEffects[idx] = { ...newEffects[idx], value: safeVal };
      } else if (field === 'ailment') {
          const alreadyUsed = newEffects.some((ef, i) => i !== idx && ef.type === 'AILMENT' && ef.ailment === value);
          if (alreadyUsed) {
              alert("이미 다른 슬롯에서 선택된 상태이상입니다.");
              return;
          }
          newEffects[idx] = { ...newEffects[idx], ailment: value };
      }
      setDebuffEffects(newEffects);
  };

  const handleAddPassiveEffect = () => {
      if (passiveEffects.length >= passiveLimits.maxEffects) {
          alert(`슬롯이 가득 찼습니다. (최대 ${passiveLimits.maxEffects}개)`);
          return;
      }
      const currentSum = passiveEffects.reduce((s, ef) => s + (ef.value || 0), 0);
      const remaining = Math.max(0, passiveCap - currentSum);
      const availableTarget = PASSIVE_STAT_TARGETS.find(t => !passiveEffects.some(e => e.target === t)) || PASSIVE_STAT_TARGETS[0];
      const initialVal = Math.max(1, Math.min(5, remaining));
      setPassiveEffects([...passiveEffects, { category: 'STAT', target: availableTarget, value: initialVal }]);
  };

  const removePassiveEffect = (idx: number) => {
      if (passiveEffects.length <= 1) {
          alert("최소 1개의 패시브 슬롯이 유지되어야 합니다.");
          return;
      }
      const newEffects = [...passiveEffects];
      newEffects.splice(idx, 1);
      setPassiveEffects(newEffects);
  };

  const updatePassiveEffect = (idx: number, field: 'category' | 'target' | 'value' | 'element', value: any) => {
      const newEffects = [...passiveEffects];
      if (field === 'category') {
          const newCat = value as 'STAT' | 'COMBAT';
          const targets = newCat === 'STAT' ? PASSIVE_STAT_TARGETS : PASSIVE_COMBAT_TARGETS;
          const newTarget = targets.find(t => !newEffects.some((e, i) => i !== idx && e.target === t)) || targets[0];
          newEffects[idx] = { category: newCat, target: newTarget, value: newEffects[idx].value || 5 };
      } else if (field === 'target') {
          const alreadyUsed = newEffects.some((ef, i) => i !== idx && ef.target === value);
          if (alreadyUsed) {
              alert("이미 다른 슬롯에서 선택된 효과입니다.");
              return;
          }
          let val = newEffects[idx].value || 5;
          if (value === 'CritResist' || value === 'CritDmgResist') {
              val = Math.min(10, val);
          }
          newEffects[idx] = { ...newEffects[idx], target: value, value: val };
      } else if (field === 'value') {
          const otherSum = newEffects.reduce((s, e, i) => i === idx ? s : s + (e.value || 0), 0);
          const isAccEva = isAccOrEvaStat(newEffects[idx].target);
          const capMult = isAccEva ? 1.5 : 1.0;
          const targetBase = newEffects[idx].category === 'COMBAT' ? getFinalPassiveCombatCap(finalBonusSteps) : getFinalPassiveStatCap(finalBonusSteps);
          const effectiveCap = isFinalActiveTab ? Math.floor(targetBase * (passiveHasCondition ? 1.2 : 1.0)) : passiveCap;
          let maxAllowed = Math.max(0, Math.floor(effectiveCap * capMult) - otherSum);
          const isAllElemRes = newEffects[idx].target === 'EleRes' && (newEffects[idx].element === '모든 속성' || newEffects[idx].element === '모든속성');
          if (isAllElemRes) {
              maxAllowed = Math.max(1, Math.floor(maxAllowed / 3));
          }
          if (newEffects[idx].target === 'CritResist' || newEffects[idx].target === 'CritDmgResist') {
              maxAllowed = Math.min(10, maxAllowed);
          }
          const safeVal = Math.max(1, Math.min(Number(value) || 0, maxAllowed));
          newEffects[idx] = { ...newEffects[idx], value: safeVal };
      } else if (field === 'element') {
          const isAllElemRes = newEffects[idx].target === 'EleRes' && (value === '모든 속성' || value === '모든속성');
          let newVal = newEffects[idx].value || 5;
          if (isAllElemRes) {
              const otherSum = newEffects.reduce((s, e, i) => i === idx ? s : s + (e.value || 0), 0);
              const isAccEva = isAccOrEvaStat(newEffects[idx].target);
              const capMult = isAccEva ? 1.5 : 1.0;
              const maxAllowed = Math.max(1, Math.floor((Math.max(0, Math.floor(passiveCap * capMult) - otherSum)) / 3));
              newVal = Math.min(newVal, maxAllowed);
          }
          newEffects[idx] = { ...newEffects[idx], element: value, value: newVal };
      }
      setPassiveEffects(newEffects);
  };

  const toggleBuffAilment = (idx: number, ailment: string) => {
      const newEffects = [...buffEffects];
      const effect = newEffects[idx];
      if (!effect.ailments) effect.ailments = [];
      if (effect.ailments.includes(ailment)) {
          effect.ailments = effect.ailments.filter(a => a !== ailment);
      } else {
          if (effect.ailments.length < cleanseLimit) {
              effect.ailments.push(ailment);
          }
      }
      setBuffEffects(newEffects);
  };

  const handleAutoNameFill = async () => {
    setIsGenerating(true);
    const result = await generateSkillSuggestion(character as Character, activeTab as ClassTier, false);
    if (result) setCustomSkillName(result.name);
    setIsGenerating(false);
  };

  const handleUpdateSkillThumbnail = (skillName: string) => {
      if (!onUpdateCharacter) return;
      
      const isPlayer = !('id' in character);
      const isCustom = (character as any).isCustom === true;
      const requiresManaStone = editImageUrl.trim() !== "" && editImageUrl.trim() !== (character.skills.find(s => s.name === skillName)?.imageUrl || "");
      
      const updatedChar = { ...character };
      
      // 마정석 소모 체크
      if (requiresManaStone) {
          if (!isPlayer && !isCustom) {
              alert("플레이어 또는 커스텀 동료만 커스텀 이미지 URL을 등록할 수 있습니다.");
              return;
          }
          
          const currentManaCrystal = (updatedChar as any).base?.resources?.manaCrystal || 0;
          if (currentManaCrystal < 5) {
              alert(`마정석이 부족합니다. (필요: 5개, 보유: ${currentManaCrystal}개)`);
              return;
          }
          
          // 마정석 5개 차감
          if ((updatedChar as any).base?.resources) {
              (updatedChar as any).base.resources.manaCrystal -= 5;
          } else {
              alert("마정석을 차감할 수 있는 자원 시스템이 존재하지 않습니다.");
              return;
          }
      }
      
      // 스킬 목록 업데이트
      updatedChar.skills = updatedChar.skills.map(s => {
          if (s.name === skillName) {
              const isAttackSkill = s.type === SkillType.PHYSICAL || s.type === SkillType.MAGIC;
              const isElementEditable = isAttackSkill || s.type === SkillType.BUFF || s.type === SkillType.DEBUFF;
              const updatedShinryoku = isElementEditable ? editElement : s.shinryokuType;
              
              let newDesc = (s.description || '').replace(/\s*\[부가 효과:\s*.+?\]/g, '').trim();
              if (isAttackSkill && editAilment) {
                  newDesc += ` [부가 효과: ${editAilment}]`;
              }
              
              let newFormula = s.effectFormula;
              if (newFormula && isAttackSkill) {
                  newFormula = newFormula.replace(/\s*\+\s*\[.+? 부여\]/g, '');
                  if (editAilment) {
                      newFormula += ` + [${editAilment} 부여]`;
                  }
              }

              return {
                  ...s,
                  icon: editIcon,
                  imageUrl: editImageUrl.trim() || undefined,
                  shinryokuType: updatedShinryoku,
                  description: newDesc,
                  effectFormula: newFormula
              };
          }
          return s;
      });
      
      onUpdateCharacter(updatedChar as any);
      setEditingSkillName(null);
      
      setResultOverlay({
          show: true,
          data: {
              type: 'success',
              title: '스킬 정보 및 속성 변경 성공!',
              message: requiresManaStone 
                  ? `마정석 5개를 소모하여 [${skillName}]의 썸네일 이미지를 변경하고, 신력 속성을 [${editElement}]로 갱신했습니다.`
                  : `[${skillName}]의 기본 설정 및 신력 속성을 [${editElement}]로 성공적으로 변경했습니다.`,
              items: [
                  { label: '스킬명', after: skillName },
                  { label: '신력 속성', after: editElement },
                  { label: '소모 마정석', after: requiresManaStone ? '5 개' : '0 개' }
              ]
          }
      });
  };

  const handleOpenShortcutModal = (skill: { name: string; icon?: string; imageUrl?: string }) => {
      setShortcutTarget({
          name: skill.name,
          displayName: skill.name,
          type: 'skill',
          icon: skill.icon,
          imageUrl: skill.imageUrl
      });
  };

  const handleAssignSlot = (slotIndex: number) => {
      if (!shortcutTarget || !onUpdateCharacter) return;
      const current = Array.from({ length: 10 }, (_, i) => (character.skillShortcuts || [])[i] || '');
      
      // 이미 다른 슬롯에 등록되어 있다면 기존 슬롯 비우기
      const prevIdx = current.findIndex(s => s === shortcutTarget.name);
      if (prevIdx !== -1) {
          current[prevIdx] = '';
      }
      
      // 선택한 슬롯 번호에 대상 등록
      current[slotIndex] = shortcutTarget.name;
      
      const updatedChar = {
          ...character,
          skillShortcuts: current
      };
      onUpdateCharacter(updatedChar as any);
  };

  const handleRemoveShortcut = (nameToRemove?: string) => {
      if (!onUpdateCharacter) return;
      const target = nameToRemove || shortcutTarget?.name;
      if (!target) return;
      
      const current = Array.from({ length: 10 }, (_, i) => (character.skillShortcuts || [])[i] || '');
      const prevIdx = current.findIndex(s => s === target);
      if (prevIdx !== -1) {
          current[prevIdx] = '';
      }
      
      const updatedChar = {
          ...character,
          skillShortcuts: current
      };
      onUpdateCharacter(updatedChar as any);
  };

  const handleToggleShortcut = (skillName: string) => {
      // 기존 호출 호환: 스킬 찾아서 숏컷 번호 지정 모달 열기
      const allAvailableSkills = getEntityAllCombatSkills(character as any);
      const foundSkill = allAvailableSkills.find(s => s.name === skillName);
      handleOpenShortcutModal({
          name: skillName,
          icon: foundSkill?.icon,
          imageUrl: foundSkill?.imageUrl
      });
  };

  const handleNameSuggestion = async () => {
      if (!customSkillDesc.trim()) {
          alert("먼저 스킬 설명을 입력해주세요.");
          return;
      }
      setIsNameLoading(true);
      const name = await generateSkillNameOnlySuggestion(character, customSkillDesc, activeTab as ClassTier);
      if (name) {
          setCustomSkillName(name);
      } else {
          alert("이름을 추천받는 중에 오류가 발생했습니다.");
      }
      setIsNameLoading(false);
  };

  const handleDescriptionSuggestion = async () => {
      if (!customSkillName.trim()) {
          alert("먼저 스킬 이름을 입력해주세요.");
          return;
      }
      setIsGenerating(true);
      const description = await generateSkillDescriptionSuggestion(character, customSkillName, activeTab as ClassTier);
      if (description) {
          setCustomSkillDesc(description);
      } else {
          alert("설명을 제안하는 중에 오류가 발생했습니다.");
      }
      setIsGenerating(false);
  };

  const handleFullAIGeneration = async () => {
      setIsGenerating(true);
      let result = await generateSkillSuggestion(character as Character, activeTab as ClassTier, true);
      
      if (!result) {
          // Local fallback
          result = generateLocalSkillSuggestion(character as Character, activeTab as ClassTier);
      }

      if (result) {
          let mult = getMpTierMultiplier(activeTab);
          if (result.type === SkillType.BUFF || (result.type as string) === '버프') {
              if (activeTab === ClassTier.SECOND || activeTab === '세컨드 클래스' || activeTab === 'SECOND') {
                  mult *= 5;
              } else if (activeTab === ClassTier.LAST || activeTab === '라스트 클래스' || activeTab === 'LAST') {
                  mult *= 10;
              } else if (activeTab === ClassTier.FINAL || activeTab === '파이널 클래스' || activeTab === 'FINAL') {
                  mult *= 25;
              }
          }
          const isPassiveGen = result.type === SkillType.PASSIVE || (result.type as string) === '패시브';
          setGeneratedSkill({
              name: result.name,
              description: result.description,
              type: result.type as SkillType,
              powerRatio: result.powerRatio || 100,
              mpCost: isPassiveGen ? 0 : Math.floor((result.mpCost || 10) * mult),
              effectFormula: result.effectFormula || "P.Atk*1.5",
              targetType: (result.targetType as SkillTarget) || 'single'
          });
          setCreationStep('ai_result');
      }
      setIsGenerating(false);
  };

  const isNativeElement = customSkillElement === (character.shinryokuType || '무속성');
  const rawMaxRatio = isNoneTier 
      ? (customTargetType === 'aoe' ? 40 : 100)
      : isFinalActiveTab
      ? getFinalAttackPowerCap(finalBonusSteps, customTargetType === 'aoe', true)
      : (customTargetType === 'aoe' ? Math.floor(currentTierConfig.maxRatio * 0.5) : currentTierConfig.maxRatio);

  const adjustedMaxRatio = isFinalActiveTab
      ? getFinalAttackPowerCap(finalBonusSteps, customTargetType === 'aoe', isNativeElement)
      : (isNativeElement ? rawMaxRatio : Math.floor(rawMaxRatio * 0.65));
  const isNonElemental = customSkillElement === '무속성';
  const currentRequiredShardCount = getRequiredShardCountForTier(activeTab);
  const requiresShard = (customSkillType === SkillType.PHYSICAL || customSkillType === SkillType.MAGIC) && !isNativeElement && !isNonElemental;
  const availableShards = requiresShard ? getShardCount(customSkillElement) : 999;
  const hasEnoughShards = !requiresShard || availableShards >= currentRequiredShardCount;

  const allowedAilments = (customSkillType === SkillType.PHYSICAL || customSkillType === SkillType.MAGIC)
      ? (customSkillElement === '무속성' 
          ? ['출혈', '파열', '속박'] 
          : (SHINRYOKU_STATUS_MAP[customSkillElement] || ['출혈', '파열', '속박']))
      : (SHINRYOKU_STATUS_MAP[character.shinryokuType || ''] || ['출혈', '파열', '속박']);
  const specialPassives = character.shinryokuType ? SHINRYOKU_SPECIAL_PASSIVES[character.shinryokuType] : [];

  const renderEquippedStatBadges = (sb?: StyleEquippedPassive['statBonus']) => {
    if (!sb) return null;
    const badges: React.ReactNode[] = [];
    if (sb.pAtkRate) badges.push(<span key="pAtk" className="px-2 py-0.5 bg-red-950/70 text-red-300 rounded border border-red-800/40 text-[10px] font-mono font-bold">물리 공격력 +{(sb.pAtkRate * 100).toFixed(1)}%</span>);
    if (sb.mAtkRate) badges.push(<span key="mAtk" className="px-2 py-0.5 bg-cyan-950/70 text-cyan-300 rounded border border-cyan-800/40 text-[10px] font-mono font-bold">마법 공격력 +{(sb.mAtkRate * 100).toFixed(1)}%</span>);
    if (sb.pDefRate) badges.push(<span key="pDef" className="px-2 py-0.5 bg-blue-950/70 text-blue-300 rounded border border-blue-800/40 text-[10px] font-mono font-bold">물리 방어력 +{(sb.pDefRate * 100).toFixed(1)}%</span>);
    if (sb.mDefRate) badges.push(<span key="mDef" className="px-2 py-0.5 bg-indigo-950/70 text-indigo-300 rounded border border-indigo-800/40 text-[10px] font-mono font-bold">마법 방어력 +{(sb.mDefRate * 100).toFixed(1)}%</span>);
    if (sb.damageReduction) badges.push(<span key="dmgRed" className="px-2 py-0.5 bg-emerald-950/70 text-emerald-300 rounded border border-emerald-800/40 text-[10px] font-mono font-bold">피해 감소 +{(sb.damageReduction * 100).toFixed(1)}%</span>);
    if (sb.critRate) badges.push(<span key="critR" className="px-2 py-0.5 bg-amber-950/70 text-amber-300 rounded border border-amber-800/40 text-[10px] font-mono font-bold">치명타율 +{(sb.critRate * 100).toFixed(1)}%</span>);
    if (sb.critDmg) badges.push(<span key="critD" className="px-2 py-0.5 bg-orange-950/70 text-orange-300 rounded border border-orange-800/40 text-[10px] font-mono font-bold">치명타 피해 +{(sb.critDmg > 1 ? sb.critDmg : sb.critDmg * 100).toFixed(1)}%</span>);
    if (sb.agiRate) badges.push(<span key="agi" className="px-2 py-0.5 bg-teal-950/70 text-teal-300 rounded border border-teal-800/40 text-[10px] font-mono font-bold">민첩(AGI) +{(sb.agiRate * 100).toFixed(1)}%</span>);
    if (sb.accRate) badges.push(<span key="acc" className="px-2 py-0.5 bg-lime-950/70 text-lime-300 rounded border border-lime-800/40 text-[10px] font-mono font-bold">명중률 +{(sb.accRate * 100).toFixed(1)}%</span>);
    if (sb.evaRate) badges.push(<span key="eva" className="px-2 py-0.5 bg-violet-950/70 text-violet-300 rounded border border-violet-800/40 text-[10px] font-mono font-bold">회피율 +{(sb.evaRate * 100).toFixed(1)}%</span>);
    if (sb.hpAbsorbRate) badges.push(<span key="hpAbs" className="px-2 py-0.5 bg-rose-950/70 text-rose-300 rounded border border-rose-800/40 text-[10px] font-mono font-bold">흡혈 +{(sb.hpAbsorbRate * 100).toFixed(1)}%</span>);
    if (sb.mpRegen) badges.push(<span key="mpReg" className="px-2 py-0.5 bg-sky-950/70 text-sky-300 rounded border border-sky-800/40 text-[10px] font-mono font-bold">매턴 MP회복 +{sb.mpRegen}</span>);
    return badges;
  };

  const renderLearnedStatBadges = (sb?: StyleLearnedPassive['statBonus']) => {
    if (!sb) return null;
    const badges: React.ReactNode[] = [];
    if (sb.pAtkRate) badges.push(<span key="lpAtk" className="px-1.5 py-0.5 bg-red-950/50 text-red-300 rounded text-[9px] font-mono">물공 +{(sb.pAtkRate * 100).toFixed(1)}%</span>);
    if (sb.mAtkRate) badges.push(<span key="lmAtk" className="px-1.5 py-0.5 bg-cyan-950/50 text-cyan-300 rounded text-[9px] font-mono">마공 +{(sb.mAtkRate * 100).toFixed(1)}%</span>);
    if (sb.pDefRate) badges.push(<span key="lpDef" className="px-1.5 py-0.5 bg-blue-950/50 text-blue-300 rounded text-[9px] font-mono">물방 +{(sb.pDefRate * 100).toFixed(1)}%</span>);
    if (sb.mDefRate) badges.push(<span key="lmDef" className="px-1.5 py-0.5 bg-indigo-950/50 text-indigo-300 rounded text-[9px] font-mono">마방 +{(sb.mDefRate * 100).toFixed(1)}%</span>);
    if (sb.str) badges.push(<span key="lstr" className="px-1.5 py-0.5 bg-slate-800 text-amber-300 rounded text-[9px] font-mono">STR +{sb.str}</span>);
    if (sb.int) badges.push(<span key="lint" className="px-1.5 py-0.5 bg-slate-800 text-cyan-300 rounded text-[9px] font-mono">INT +{sb.int}</span>);
    if (sb.wis) badges.push(<span key="lwis" className="px-1.5 py-0.5 bg-slate-800 text-blue-300 rounded text-[9px] font-mono">WIS +{sb.wis}</span>);
    if (sb.def) badges.push(<span key="ldef" className="px-1.5 py-0.5 bg-slate-800 text-emerald-300 rounded text-[9px] font-mono">DEF +{sb.def}</span>);
    if (sb.agi) badges.push(<span key="lagi" className="px-1.5 py-0.5 bg-slate-800 text-teal-300 rounded text-[9px] font-mono">AGI +{sb.agi}</span>);
    if (sb.ctrl) badges.push(<span key="lctrl" className="px-1.5 py-0.5 bg-slate-800 text-purple-300 rounded text-[9px] font-mono">CTRL +{sb.ctrl}</span>);
    if (sb.maxHp) badges.push(<span key="lhp" className="px-1.5 py-0.5 bg-slate-800 text-green-300 rounded text-[9px] font-mono">HP +{sb.maxHp}</span>);
    if (sb.maxMp) badges.push(<span key="lmp" className="px-1.5 py-0.5 bg-slate-800 text-sky-300 rounded text-[9px] font-mono">MP +{sb.maxMp}</span>);
    if (sb.critRate) badges.push(<span key="lcrit" className="px-1.5 py-0.5 bg-amber-950/50 text-amber-300 rounded text-[9px] font-mono">치명타 +{(sb.critRate * 100).toFixed(1)}%</span>);
    if (sb.critDmg) badges.push(<span key="lcdmg" className="px-1.5 py-0.5 bg-orange-950/50 text-orange-300 rounded text-[9px] font-mono">치명피해 +{(sb.critDmg > 1 ? sb.critDmg : sb.critDmg * 100).toFixed(1)}%</span>);
    if (sb.accRate) badges.push(<span key="lacc" className="px-1.5 py-0.5 bg-lime-950/50 text-lime-300 rounded text-[9px] font-mono">명중 +{(sb.accRate * 100).toFixed(1)}%</span>);
    if (sb.evaRate) badges.push(<span key="leva" className="px-1.5 py-0.5 bg-violet-950/50 text-violet-300 rounded text-[9px] font-mono">회피 +{(sb.evaRate * 100).toFixed(1)}%</span>);
    return badges;
  };

  const cumulativePassiveBonus = (() => {
    const sum = {
      pAtkRate: 0, mAtkRate: 0, pDefRate: 0, mDefRate: 0,
      str: 0, int: 0, wis: 0, def: 0, agi: 0, ctrl: 0,
      maxHp: 0, maxMp: 0, critRate: 0, critDmg: 0, accRate: 0, evaRate: 0
    };
    unlockedStyles.forEach((style: CombatStyle) => {
      const tier = COMBAT_STYLE_CONFIG[style]?.tier || 1;
      const skillSet = getCombatStyleSkillSet(style, tier);
      const sb = skillSet?.learnedPassive.statBonus;
      if (!sb) return;
      if (sb.pAtkRate) sum.pAtkRate += sb.pAtkRate;
      if (sb.mAtkRate) sum.mAtkRate += sb.mAtkRate;
      if (sb.pDefRate) sum.pDefRate += sb.pDefRate;
      if (sb.mDefRate) sum.mDefRate += sb.mDefRate;
      if (sb.str) sum.str += sb.str;
      if (sb.int) sum.int += sb.int;
      if (sb.wis) sum.wis += sb.wis;
      if (sb.def) sum.def += sb.def;
      if (sb.agi) sum.agi += sb.agi;
      if (sb.ctrl) sum.ctrl += sb.ctrl;
      if (sb.maxHp) sum.maxHp += sb.maxHp;
      if (sb.maxMp) sum.maxMp += sb.maxMp;
      if (sb.critRate) sum.critRate += sb.critRate;
      if (sb.critDmg) sum.critDmg += sb.critDmg;
      if (sb.accRate) sum.accRate += sb.accRate;
      if (sb.evaRate) sum.evaRate += sb.evaRate;
    });
    return sum;
  })();

  const renderCumulativeBonuses = (sum: typeof cumulativePassiveBonus) => {
    const items: React.ReactNode[] = [];
    if (sum.pAtkRate > 0) items.push(<span key="cpAtk" className="px-2 py-0.5 bg-red-950/70 text-red-300 rounded border border-red-800/40 text-[10px] font-mono font-bold">물공 +{(sum.pAtkRate * 100).toFixed(1)}%</span>);
    if (sum.mAtkRate > 0) items.push(<span key="cmAtk" className="px-2 py-0.5 bg-cyan-950/70 text-cyan-300 rounded border border-cyan-800/40 text-[10px] font-mono font-bold">마공 +{(sum.mAtkRate * 100).toFixed(1)}%</span>);
    if (sum.pDefRate > 0) items.push(<span key="cpDef" className="px-2 py-0.5 bg-blue-950/70 text-blue-300 rounded border border-blue-800/40 text-[10px] font-mono font-bold">물방 +{(sum.pDefRate * 100).toFixed(1)}%</span>);
    if (sum.mDefRate > 0) items.push(<span key="cmDef" className="px-2 py-0.5 bg-indigo-950/70 text-indigo-300 rounded border border-indigo-800/40 text-[10px] font-mono font-bold">마방 +{(sum.mDefRate * 100).toFixed(1)}%</span>);
    if (sum.str > 0) items.push(<span key="cstr" className="px-2 py-0.5 bg-slate-800 text-amber-300 rounded border border-slate-700 text-[10px] font-mono font-bold">STR +{sum.str}</span>);
    if (sum.int > 0) items.push(<span key="cint" className="px-2 py-0.5 bg-slate-800 text-cyan-300 rounded border border-slate-700 text-[10px] font-mono font-bold">INT +{sum.int}</span>);
    if (sum.wis > 0) items.push(<span key="cwis" className="px-2 py-0.5 bg-slate-800 text-blue-300 rounded border border-slate-700 text-[10px] font-mono font-bold">WIS +{sum.wis}</span>);
    if (sum.def > 0) items.push(<span key="cdef" className="px-2 py-0.5 bg-slate-800 text-emerald-300 rounded border border-slate-700 text-[10px] font-mono font-bold">DEF +{sum.def}</span>);
    if (sum.agi > 0) items.push(<span key="cagi" className="px-2 py-0.5 bg-slate-800 text-teal-300 rounded border border-slate-700 text-[10px] font-mono font-bold">AGI +{sum.agi}</span>);
    if (sum.ctrl > 0) items.push(<span key="cctrl" className="px-2 py-0.5 bg-slate-800 text-purple-300 rounded border border-slate-700 text-[10px] font-mono font-bold">CTRL +{sum.ctrl}</span>);
    if (sum.maxHp > 0) items.push(<span key="chp" className="px-2 py-0.5 bg-slate-800 text-green-300 rounded border border-slate-700 text-[10px] font-mono font-bold">HP +{sum.maxHp}</span>);
    if (sum.maxMp > 0) items.push(<span key="cmp" className="px-2 py-0.5 bg-slate-800 text-sky-300 rounded border border-slate-700 text-[10px] font-mono font-bold">MP +{sum.maxMp}</span>);
    if (sum.critRate > 0) items.push(<span key="ccrit" className="px-2 py-0.5 bg-amber-950/70 text-amber-300 rounded border border-amber-800/40 text-[10px] font-mono font-bold">치명타 +{(sum.critRate * 100).toFixed(1)}%</span>);
    if (sum.critDmg > 0) items.push(<span key="ccdmg" className="px-2 py-0.5 bg-orange-950/70 text-orange-300 rounded border border-orange-800/40 text-[10px] font-mono font-bold">치명피해 +{(sum.critDmg > 1 ? sum.critDmg : sum.critDmg * 100).toFixed(1)}%</span>);
    if (sum.accRate > 0) items.push(<span key="cacc" className="px-2 py-0.5 bg-lime-950/70 text-lime-300 rounded border border-lime-800/40 text-[10px] font-mono font-bold">명중 +{(sum.accRate * 100).toFixed(1)}%</span>);
    if (sum.evaRate > 0) items.push(<span key="ceva" className="px-2 py-0.5 bg-violet-950/70 text-violet-300 rounded border border-violet-800/40 text-[10px] font-mono font-bold">회피 +{(sum.evaRate * 100).toFixed(1)}%</span>);
    return items.length > 0 ? items : <span className="text-xs text-slate-500">누적 보너스 없음</span>;
  };

  const tabsToDisplay = [...Object.values(ClassTier).filter(tier => TIER_CONFIG[tier]), 'COMBAT_STYLE'];

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className={`bg-slate-900 w-full max-w-4xl h-[85vh] rounded-2xl border border-slate-700 shadow-2xl flex flex-col md:flex-row overflow-hidden transition-all duration-500 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="w-full md:w-64 bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800 flex md:flex-col overflow-x-auto md:overflow-visible shrink-0">
            <div className="p-6 hidden md:block">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-cinzel text-slate-200 flex items-center"><BookOpen className="mr-2 text-amber-500" /> 스킬북</h2>
                <button
                  type="button"
                  id="btn-sidebar-skill-craft-help"
                  onClick={() => setIsHelpOpen(true)}
                  className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1 transition-all"
                  title="클래스별 스킬 제작 한도 도움말"
                >
                  <HelpCircle size={13} />
                  <span>도움말</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">{character.name}의 기록</p>
            </div>
            <div className="flex md:flex-col w-full">
                {tabsToDisplay.map((tier) => {
                    const config = TIER_CONFIG[tier];
                    if (!config) return null;
                    const isActive = activeTab === tier;
                    return (
                        <button key={tier} onClick={() => { setActiveTab(tier); setCreationStep('none'); }} className={`flex-1 md:flex-none p-3 md:p-4 text-left flex items-center transition-all border-b md:border-b-0 md:border-l-4 ${isActive ? `${config.bg} ${config.color} ${config.border} border-b-2 md:border-b-0` : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-300'}`}>
                            <config.icon size={18} className="mr-2 shrink-0" /><span className="text-sm font-bold whitespace-nowrap">{config.label}</span>
                        </button>
                    );
                })}
            </div>
            <div className="p-4 mt-auto border-t border-slate-800 hidden md:block">
                 {isCombatStyleTab ? (
                     <div className="w-full py-3 px-2 bg-slate-950/80 border border-slate-800 text-slate-400 rounded flex flex-col items-center justify-center text-center">
                         <Crosshair size={16} className="mb-1 text-amber-500" />
                         <span className="font-bold text-xs text-amber-300">전투계열 고유 스킬</span>
                         <span className="text-[10px] mt-1 text-slate-500 leading-tight">전투계열 훈련 및 장착을 통해 스킬과 패시브가 부여됩니다.</span>
                     </div>
                 ) : canCreateSkill ? (
                     isEnhanceTier ? (
                         <div className="space-y-2 w-full">
                             <button onClick={() => { resetForm(); setCreationStep('select'); }} className="w-full py-2.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-200 rounded flex items-center justify-center font-bold text-xs transition-all group">
                                 <PlusCircle size={15} className="mr-1.5 text-rose-400 group-hover:text-rose-200" />
                                 <span>신규 스킬 창조</span>
                             </button>
                             <button onClick={() => setIsFinalEnhanceOpen(true)} className="w-full py-2.5 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 text-amber-200 rounded flex items-center justify-center font-bold text-xs transition-all group shadow-sm">
                                 <Sparkles size={15} className="mr-1.5 text-amber-400 group-hover:text-amber-200" />
                                 <span>기존 스킬 강화</span>
                             </button>
                         </div>
                     ) : (
                         <button onClick={() => { resetForm(); setCreationStep('select'); }} className="w-full py-3 bg-amber-900/20 hover:bg-amber-900/40 border border-amber-800/50 text-amber-200 rounded flex items-center justify-center font-bold text-xs transition-all group animate-pulse"><PlusCircle size={16} className="mr-2 group-hover:text-amber-100" /><span>신규 스킬 창조</span></button>
                     )
                 ) : (
                     <div className="w-full py-3 bg-slate-900 border border-slate-800 text-slate-600 rounded flex flex-col items-center justify-center text-xs">
                        <Lock size={14} className="mb-1 opacity-50" />
                        <span className="font-bold">슬롯 잠김</span>
                        {!isClassUnlocked && (<span className="text-[10px] mt-1 text-amber-500/70">클래스 해방 필요</span>)}
                        {isClassUnlocked && !isLevelUnlocked && (<span className="text-[10px] mt-1 text-red-500/70">Lv.{tierLevels[activeTab as keyof typeof tierLevels]} 달성 필요</span>)}
                        {isTabUnlocked && nextUnlockLevel > 0 && (<span className="text-[10px] mt-1">Lv.{nextUnlockLevel} 달성 시 추가 해방</span>)}
                     </div>
                 )}
            </div>
        </div>

        <div className="flex-1 flex flex-col bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-slate-900 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 backdrop-blur shrink-0">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-lg md:text-xl font-bold ${currentTierConfig.color}`}>
                            {isCombatStyleTab ? '전투계열' : currentTierConfig.label}
                        </h3>
                        {isCurrentTabLockedBonus && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/60 text-purple-300 text-[10px] font-bold flex items-center gap-1">
                                <Lock size={10} /> 잠재력 제한 적용 (레벨 100당 슬롯 +1)
                            </span>
                        )}
                        <button
                            type="button"
                            id="btn-header-skill-craft-help"
                            onClick={() => setIsHelpOpen(true)}
                            className="px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95"
                            title="각 클래스별 스킬 제작 한도 안내"
                        >
                            <HelpCircle size={12} className="text-amber-400" />
                            <span>도움말</span>
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {isCombatStyleTab
                            ? `현재 장착: ${character.combatStyle || '미장착'} | 습득한 계열: ${unlockedStyles.length}종`
                            : isTabUnlocked
                                ? `최대 포텐셜: ${activeTab === ClassTier.NONE ? '100%' : currentTierConfig.maxRatio + '%'} | 슬롯: ${currentSkillCount}/${maxSkills} | 패시브: ${currentTierPassiveCount}/${maxPassivesForTier !== null ? `${maxPassivesForTier}개` : '무제한'}`
                                : `Lv.${tierLevels[activeTab as keyof typeof tierLevels]} 달성 시 해방`
                        }
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    {!isCombatStyleTab && (
                        <button onClick={() => { resetForm(); setCreationStep('select'); }} disabled={!canCreateSkill} className="md:hidden p-2 text-amber-500 hover:text-amber-200 disabled:opacity-30 disabled:text-slate-700 transition-all">
                            {canCreateSkill ? <PlusCircle size={24} className="animate-pulse" /> : <Lock size={24} />}
                        </button>
                    )}
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar relative">
                {!isTabUnlocked ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                        <Lock size={64} className="mb-4 opacity-50" />
                        <p className="text-lg font-cinzel">LOCKED</p>
                        <p className="text-sm mt-2">이 클래스의 권능은 아직 잠들어 있습니다.</p>
                    </div>
                ) : (
                    <>
                    {creationStep === 'none' && (
                        <div className="space-y-4">
                            {/* 전투 숏컷 설정 바 (최대 10개) */}
                            {onUpdateCharacter && (
                                <div className="bg-slate-950/90 p-2 md:p-3 rounded-xl border border-amber-500/40 shadow-lg">
                                    <div className="flex items-center justify-between mb-1.5 px-0.5">
                                        <div className="flex items-center gap-1.5">
                                            <Zap size={14} className="text-amber-400 fill-amber-400 animate-pulse shrink-0" />
                                            <h4 className="text-[11px] md:text-xs font-bold text-slate-100">퀵슬롯</h4>
                                            <span className="text-[9px] text-amber-400 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-800/60 font-mono font-bold">
                                                {(character.skillShortcuts || []).filter(Boolean).length} / 10
                                            </span>
                                        </div>
                                        <span className="text-[9px] text-slate-400 hidden sm:inline">
                                            전투 시 썸네일 클릭으로 바로 실행할 스킬 및 소비 아이템 10개 지정 (원하는 번호에 등록 가능)
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 md:gap-1.5">
                                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((slotIdx) => {
                                            const shortcutName = (character.skillShortcuts || [])[slotIdx];
                                            const allAvailableSkills = getEntityAllCombatSkills(character as any);
                                            const rawName = shortcutName ? shortcutName.replace(/^\[ITEM\]\s*/, '') : '';
                                            const isItem = shortcutName ? (shortcutName.startsWith('[ITEM]') || (character.inventory || []).some(i => i.name === shortcutName && !allAvailableSkills.some(s => s.name === shortcutName))) : false;
                                            const matchingSkill = !isItem && shortcutName
                                                ? allAvailableSkills.find(s => s.name === shortcutName || s.id === shortcutName)
                                                : null;
                                            const matchingItem = isItem
                                                ? (character.inventory || []).find(i => i.name === rawName || i.name === shortcutName)
                                                : null;

                                            return (
                                                <div
                                                    key={slotIdx}
                                                    onClick={() => {
                                                        if (matchingSkill) {
                                                            handleOpenShortcutModal({
                                                                name: matchingSkill.name,
                                                                icon: matchingSkill.icon,
                                                                imageUrl: matchingSkill.imageUrl
                                                            });
                                                        } else if (matchingItem) {
                                                            setShortcutTarget({
                                                                name: `[ITEM] ${matchingItem.name}`,
                                                                displayName: matchingItem.name,
                                                                type: 'item',
                                                                imageUrl: matchingItem.imageUrl
                                                            });
                                                        } else {
                                                            const availableSkills = getEntityAllCombatSkills(character as any);
                                                            if (availableSkills.length > 0) {
                                                                handleOpenShortcutModal({
                                                                    name: availableSkills[0].name,
                                                                    icon: availableSkills[0].icon,
                                                                    imageUrl: availableSkills[0].imageUrl
                                                                });
                                                            }
                                                        }
                                                    }}
                                                    className={`relative p-0.5 sm:p-1 rounded-lg border flex flex-col items-center justify-between min-h-[44px] md:min-h-[54px] transition-all cursor-pointer ${
                                                        matchingSkill || matchingItem
                                                            ? isItem 
                                                                ? 'bg-gradient-to-b from-emerald-950/80 to-slate-950 border-emerald-500/60 hover:border-emerald-400 text-slate-100 shadow-sm'
                                                                : 'bg-gradient-to-b from-indigo-950/80 to-slate-950 border-indigo-500/60 hover:border-indigo-400 text-slate-100 shadow-sm'
                                                            : 'bg-slate-950/50 border-slate-800/80 text-slate-600 border-dashed hover:border-slate-700'
                                                    }`}
                                                >
                                                    <span className="absolute top-0.5 left-0.5 text-[6.5px] md:text-[7.5px] font-mono font-bold text-amber-400/90 z-10">
                                                        #{slotIdx + 1}
                                                    </span>

                                                    {matchingSkill || matchingItem ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRemoveShortcut(shortcutName!);
                                                                }}
                                                                className="absolute -top-1 -right-1 bg-red-950 hover:bg-red-800 text-red-200 rounded-full w-3.5 h-3.5 flex items-center justify-center text-[9px] border border-red-500 transition-colors z-20"
                                                                title="숏컷 해제"
                                                            >
                                                                <X size={8} />
                                                            </button>

                                                            <div className={`w-4 h-4 md:w-5 md:h-5 rounded border ${isItem ? 'border-emerald-400/50' : 'border-indigo-400/50'} overflow-hidden bg-slate-900 flex items-center justify-center shrink-0 mt-0.5 shadow-inner`}>
                                                                {isItem ? (
                                                                    matchingItem ? (
                                                                        <img src={getItemImage(matchingItem)} alt={matchingItem.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                                    ) : (
                                                                        <Package size={10} className="text-emerald-300" />
                                                                    )
                                                                ) : matchingSkill?.imageUrl ? (
                                                                    <img src={matchingSkill.imageUrl} alt={matchingSkill.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                                ) : (
                                                                    (() => {
                                                                        const IconComp = getSkillIconComponent(matchingSkill);
                                                                        return <IconComp size={10} className="text-indigo-300" />;
                                                                    })()
                                                                )}
                                                            </div>
                                                            <span className="text-[7px] md:text-[8px] font-bold text-slate-200 truncate w-full text-center leading-tight">
                                                                {matchingItem ? matchingItem.name : matchingSkill?.name}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center h-full pt-1">
                                                             <span className="text-[6.5px] font-mono text-slate-600">빈 슬롯</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {isCombatStyleTab ? (
                                <div className="space-y-6">
                                    {/* 1. 현재 장착 전투계열 카드 */}
                                    <div className="bg-slate-950/90 border border-amber-500/40 p-4 sm:p-5 rounded-2xl shadow-xl">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-600/50 flex items-center justify-center text-amber-400 shrink-0">
                                                    <Crosshair size={22} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/40">현재 장착 계열</span>
                                                        {equippedStyleConfig && (
                                                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
                                                                {equippedStyleConfig.tier}단계 ({equippedStyleConfig.rootStyle || character.combatStyle})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-lg sm:text-xl font-bold text-amber-200 mt-0.5">
                                                        {character.combatStyle ? `${character.combatStyle} 계열` : '미장착 (전투계열 없음)'}
                                                    </h3>
                                                </div>
                                            </div>
                                            {equippedStyleConfig && (
                                                <p className="text-xs text-slate-400 max-w-md italic">
                                                    "{equippedStyleConfig.description}"
                                                </p>
                                            )}
                                        </div>

                                        {character.combatStyle && equippedSkillSet ? (
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                                                {/* [A] 고유 액티브 오의 스킬 */}
                                                <div className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 rounded-xl p-4 flex flex-col justify-between transition-all">
                                                    <div>
                                                        <div className="flex items-start justify-between gap-2 mb-2.5">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="p-2 rounded-lg bg-amber-950/50 border border-amber-700/50 text-amber-300">
                                                                    <Sword size={18} />
                                                                </div>
                                                                 <div>
                                                                    {(() => {
                                                                        const activeElem = getSkillElement(equippedSkillSet.equippedActive, character.shinryokuType);
                                                                        const activeElemConfig = SHINRYOKU_UI_CONFIG[activeElem] || SHINRYOKU_UI_CONFIG.default;
                                                                        return (
                                                                            <>
                                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                                    <h4 className="font-bold text-base text-amber-300">{equippedSkillSet.equippedActive.name}</h4>
                                                                                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-red-950/60 text-red-400 border border-red-800/60">
                                                                                        {equippedSkillSet.equippedActive.type === SkillType.PHYSICAL ? '물리 공격' : '마법 공격'}
                                                                                    </span>
                                                                                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-950/60 text-amber-400 border border-amber-800/60">
                                                                                        {equippedSkillSet.equippedActive.targetType === 'aoe' ? '전체 적군' : '단일 대상'}
                                                                                    </span>
                                                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border flex items-center gap-1 ${activeElemConfig.bg} ${activeElemConfig.text} ${activeElemConfig.border}`}>
                                                                                        <Sparkles size={9} />
                                                                                        <span>속성: {activeElem}</span>
                                                                                    </span>
                                                                                </div>
                                                                                <span className="text-[10px] text-amber-500/80 font-bold">
                                                                                    [계열 장착 고유 액티브 오의]
                                                                                </span>
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>

                                                            {onUpdateCharacter && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOpenShortcutModal({
                                                                        name: equippedSkillSet.equippedActive.name,
                                                                        icon: equippedSkillSet.equippedActive.icon,
                                                                        imageUrl: (equippedSkillSet.equippedActive as any).imageUrl
                                                                    })}
                                                                    className={`text-[10px] flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-bold transition-all shrink-0 ${
                                                                        (character.skillShortcuts || []).includes(equippedSkillSet.equippedActive.name)
                                                                            ? 'bg-amber-950 border-amber-500 text-amber-300 shadow-sm'
                                                                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border-slate-700'
                                                                    }`}
                                                                    title="전투 스킬 숏컷 번호 지정"
                                                                >
                                                                    <Zap size={11} className={(character.skillShortcuts || []).includes(equippedSkillSet.equippedActive.name) ? 'text-amber-400 fill-amber-400' : ''} />
                                                                    <span>
                                                                        {(character.skillShortcuts || []).includes(equippedSkillSet.equippedActive.name)
                                                                            ? `숏컷 #${(character.skillShortcuts || []).indexOf(equippedSkillSet.equippedActive.name) + 1}`
                                                                            : '숏컷 등록'}
                                                                    </span>
                                                                </button>
                                                            )}
                                                        </div>

                                                        <p className="text-xs text-slate-300 leading-relaxed mb-3">
                                                            {equippedSkillSet.equippedActive.description}
                                                        </p>
                                                    </div>

                                                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-slate-800/80 text-xs">
                                                        <div className="bg-slate-950/90 p-2 rounded-xl border border-slate-800/80 flex flex-col justify-center">
                                                            <span className="text-[10px] text-slate-400 block whitespace-nowrap">소모 MP</span>
                                                            <span className="font-mono font-bold text-blue-400 whitespace-nowrap">{equippedSkillSet.equippedActive.mpCost} MP</span>
                                                        </div>
                                                        <div className="bg-slate-950/90 p-2 rounded-xl border border-slate-800/80 flex flex-col justify-center">
                                                            <span className="text-[10px] text-slate-400 block whitespace-nowrap">위력 계수</span>
                                                            <span className="font-mono font-bold text-amber-400 whitespace-nowrap">{equippedSkillSet.equippedActive.powerRatio}%</span>
                                                        </div>
                                                        <div className="bg-slate-950/90 p-2 rounded-xl border border-slate-800/80 flex flex-col justify-center">
                                                            <span className="text-[10px] text-slate-400 block whitespace-nowrap">신력 속성</span>
                                                            {(() => {
                                                                const activeElem = getSkillElement(equippedSkillSet.equippedActive, character.shinryokuType);
                                                                const activeElemConfig = SHINRYOKU_UI_CONFIG[activeElem] || SHINRYOKU_UI_CONFIG.default;
                                                                return (
                                                                    <span className={`font-mono font-bold whitespace-nowrap ${activeElemConfig.text}`}>{activeElem}</span>
                                                                );
                                                            })()}
                                                        </div>
                                                        <div className="bg-slate-950/90 p-2 rounded-xl border border-slate-800/80 flex flex-col justify-center">
                                                            <span className="text-[10px] text-slate-400 block whitespace-nowrap">스킬 등급</span>
                                                            <span className="font-mono font-bold text-purple-300 text-xs truncate whitespace-nowrap">
                                                                {equippedSkillSet.equippedActive.tier || '전투계열'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* [B] 고유 장착 전용 패시브 */}
                                                <div className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 rounded-xl p-4 flex flex-col justify-between transition-all">
                                                    <div>
                                                        <div className="flex items-start justify-between gap-2 mb-2.5">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="p-2 rounded-lg bg-cyan-950/50 border border-cyan-700/50 text-cyan-300">
                                                                    <Shield size={18} />
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-bold text-base text-cyan-300">{equippedSkillSet.equippedPassive.name}</h4>
                                                                    <span className="text-[10px] text-cyan-500/80 font-bold">
                                                                        [계열 장착 시 활성화되는 전용 패시브]
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <p className="text-xs text-slate-300 leading-relaxed mb-3">
                                                            {equippedSkillSet.equippedPassive.description}
                                                        </p>
                                                    </div>

                                                    {equippedSkillSet.equippedPassive.statBonus && (
                                                        <div className="pt-2 border-t border-slate-800/80">
                                                            <span className="text-[10px] text-slate-400 block mb-1.5 font-bold uppercase">장착 강화 스탯 보정</span>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {renderEquippedStatBadges(equippedSkillSet.equippedPassive.statBonus)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-4 p-4 text-center bg-slate-900/50 border border-slate-800 rounded-xl text-slate-500 text-xs">
                                                장착 중인 전투계열이 없습니다. 전투계열 훈련소나 상태창에서 습득한 계열을 장착하세요.
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. 습득한 모든 전투계열 보유 효과 (누적 상시 적용) */}
                                    <div className="space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="text-amber-400" size={18} />
                                                <h3 className="text-base sm:text-lg font-bold text-slate-200">
                                                    습득한 전투계열 보유 패시브 <span className="text-amber-400 font-mono text-sm">({unlockedStyles.length}종 해금됨)</span>
                                                </h3>
                                            </div>
                                            <span className="text-[11px] text-slate-400">
                                                ※ 장착 여부와 상관없이 <span className="text-amber-300 font-semibold">상시 누적 적용</span>됩니다.
                                            </span>
                                        </div>

                                        {/* 총 누적 보너스 요약 카드 */}
                                        {unlockedStyles.length > 0 && (
                                            <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-amber-500/30 p-3.5 sm:p-4 rounded-xl shadow-md">
                                                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 mb-2">
                                                    <TrendingUp size={13} />
                                                    총 누적 보유 효과 합산 요약
                                                </span>
                                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                                    {renderCumulativeBonuses(cumulativePassiveBonus)}
                                                </div>
                                            </div>
                                        )}

                                        {/* 해금된 전투 계열 목록 카드 그리드 */}
                                        {unlockedStyles.length === 0 ? (
                                            <div className="text-center py-12 text-slate-600 bg-slate-950/30 border border-slate-800/60 rounded-xl">
                                                <p className="text-sm">습득한 전투계열이 없습니다.</p>
                                                <p className="text-xs mt-1">도시의 [전투계열 훈련소]에서 다양한 전투계열을 습득해보세요.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {unlockedStyles.map((style: CombatStyle) => {
                                                    const styleCfg = COMBAT_STYLE_CONFIG[style];
                                                    const tier = styleCfg?.tier || 1;
                                                    const skillSet = getCombatStyleSkillSet(style, tier);
                                                    const isCurrentlyEquipped = character.combatStyle === style;

                                                    return (
                                                        <div
                                                            key={style}
                                                            className={`p-3.5 rounded-xl border transition-all ${
                                                                isCurrentlyEquipped
                                                                    ? 'bg-amber-950/20 border-amber-500/60 shadow-md'
                                                                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-bold text-sm text-slate-100">{style}</h4>
                                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                                                                        {tier}단계
                                                                    </span>
                                                                    {isCurrentlyEquipped && (
                                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold">
                                                                            장착 중
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] text-amber-400 font-bold">
                                                                    {skillSet?.learnedPassive.name}
                                                                </span>
                                                            </div>

                                                            <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                                                                {skillSet?.learnedPassive.description}
                                                            </p>

                                                            {skillSet?.learnedPassive.statBonus && (
                                                                <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-800/60">
                                                                    {renderLearnedStatBadges(skillSet.learnedPassive.statBonus)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">

                                {isEnhanceTier && (
                                    <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 border border-amber-500/30 rounded-xl p-3 sm:p-4 shadow-md space-y-3">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="text-amber-400" size={18} />
                                                <h4 className="font-bold text-sm sm:text-base text-amber-200">
                                                    {currentTierConfig.label} 스킬 슬롯 목록
                                                </h4>
                                                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-950/80 border border-amber-500/40 text-amber-300 font-bold">
                                                    {currentSkillCount} / {maxSkills} 슬롯
                                                </span>
                                            </div>
                                            {currentSkillCount < maxSkills && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => { resetForm(); setCreationStep('select'); }}
                                                        className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-sm active:scale-95"
                                                    >
                                                        <PlusCircle size={13} />
                                                        <span>새 스킬 생성</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsFinalEnhanceOpen(true)}
                                                        className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 transition-all shadow-sm active:scale-95"
                                                    >
                                                        <Sparkles size={13} />
                                                        <span>기존 스킬 강화</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-[11px] text-slate-400 leading-relaxed">
                                            {currentTierConfig.label} 슬롯은 [새 스킬 생성] 또는 [기존 스킬 강화]에 자유롭게 배정할 수 있습니다. 동일 스킬에 여러 번 강화도 가능합니다.
                                        </p>

                                        {/* 슬롯 상태 카드 그리드 */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                            {Array.from({ length: maxSkills }, (_, i) => i + 1).map(slotNum => {
                                                const isFinal = isFinalActiveTab;
                                                const assignedFinal = isFinal ? finalSlotsUsage.assignedSkills.find(a => a.slot === slotNum) : null;
                                                const assignedTier = !isFinal ? tierSlotItems?.find(a => a.slot === slotNum) : null;
                                                
                                                const isOccupied = isFinal ? Boolean(assignedFinal) : Boolean(assignedTier);
                                                const assignedSkill = isFinal ? assignedFinal?.skill : assignedTier?.skill;
                                                const isEnhance = isFinal
                                                    ? (assignedSkill && assignedSkill.finalEnhanceData && (assignedSkill.finalEnhanceData.allocatedSlots || []).includes(slotNum))
                                                    : Boolean(assignedTier?.isEnhance);

                                                return (
                                                    <div 
                                                        key={slotNum} 
                                                        className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between transition-all ${
                                                            isOccupied 
                                                                ? 'bg-slate-950/80 border-amber-900/60 text-slate-200' 
                                                                : 'bg-slate-950/40 border-dashed border-slate-700/70 text-slate-400'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-1 mb-1">
                                                            <span className="font-mono font-bold text-[11px] text-amber-300">
                                                                제 {slotNum}슬롯
                                                            </span>
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                                                isOccupied
                                                                    ? isEnhance ? 'bg-amber-950/80 text-amber-300 border border-amber-600/50' : 'bg-rose-950/80 text-rose-300 border border-rose-600/50'
                                                                    : 'bg-slate-800 text-slate-400'
                                                            }`}>
                                                                {isOccupied ? (isEnhance ? '기존 스킬 강화' : `${currentTierConfig.label} 스킬`) : '빈 슬롯'}
                                                            </span>
                                                        </div>

                                                        {isOccupied && assignedSkill ? (
                                                            <div className="min-w-0">
                                                                <div className="font-bold text-xs truncate text-amber-200">
                                                                    {assignedSkill.name}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                                                    {isEnhance 
                                                                        ? `누적 강화 ${assignedSkill.finalEnhanceData?.totalEnhanceCount || 1}회 적용`
                                                                        : (assignedSkill.type || '액티브')
                                                                    }
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { resetForm(); setCreationStep('select'); }}
                                                                    className="flex-1 py-1 rounded bg-slate-900 hover:bg-rose-950/60 text-rose-300 border border-slate-800 hover:border-rose-700 font-bold text-[10px] transition-colors"
                                                                >
                                                                    새 스킬
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setIsFinalEnhanceOpen(true)}
                                                                    className="flex-1 py-1 rounded bg-slate-900 hover:bg-amber-950/60 text-amber-300 border border-slate-800 hover:border-amber-700 font-bold text-[10px] transition-colors"
                                                                >
                                                                    스킬 강화
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* 스킬 타입 퀵 필터 칩 */}
                                <div className="col-span-full flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80 mb-2 flex-wrap">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {[
                                            { id: 'ALL', label: '전체' },
                                            { id: 'ATTACK', label: '⚔️ 공격' },
                                            { id: 'BUFF', label: '🛡️ 버프' },
                                            { id: 'DEBUFF', label: '💀 디버프' },
                                            { id: 'PASSIVE', label: '🧬 패시브' },
                                        ].map(item => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => setSelectedSkillTypeFilter(item.id as any)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                                                    selectedSkillTypeFilter === item.id
                                                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                                                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                                                }`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                    <span className="text-[11px] text-slate-500 font-mono">
                                        총 <strong className="text-amber-400">{filteredSkills.length}</strong>개 기술
                                    </span>
                                </div>

                                {filteredSkills.length === 0 ? (
                                    <div className="col-span-full text-center py-20 text-slate-600">
                                        <p>조건에 맞는 기술이 없습니다.</p>
                                        <p className="text-xs mt-2">왼쪽 사이드바의 '신규 스킬 창조'를 통해 힘을 얻으세요.</p>
                                    </div>
                                ) : (
                                filteredSkills.map((skill, idx) => {
                                    const TypeIcon = SKILL_TYPE_ICONS[skill.type] || Sword;
                                    const requiredMastery = 20 * (skill.level + 4);
                                    const effectiveMaxLevel = skill.maxLevel || 10;
                                    const isMaxLevel = skill.level >= effectiveMaxLevel;
                                    const masteryPercent = isMaxLevel ? 100 : Math.min(100, Math.max(0, ((skill.currentMastery || 0) / requiredMastery) * 100));
                                    const isAttack = skill.type === SkillType.PHYSICAL || skill.type === SkillType.MAGIC;
                                    const isBuff = skill.type === SkillType.BUFF;
                                    const isDebuff = skill.type === SkillType.DEBUFF;
                                    const isPassive = skill.type === SkillType.PASSIVE;

                                    // Calculate passive vs active power ratio details
                                    let passiveInfo: { target: string, base: number, scale: number, cond?: string, currentPercent: number, isSpecial?: boolean, rawDesc?: string } | null = null;
                                    let baseRatio = skill.powerRatio || (isAttack ? 100 : 30);
                                    const effectiveTier = (skill.isBondSkill || skill.tier === ClassTier.BOND || (skill.tier as any) === '인연' || (skill.tier as any) === '인연스킬')
                                        ? ((skill as any).baseTier || (skill as any).minClassTier || ClassTier.FIRST)
                                        : skill.tier;
                                    const scaleBonus = (skill.finalEnhanceData?.levelScaleBonus || 0) || (() => {
                                        const match = skill.effectFormula?.match(/계수 한계 돌파 \+(\d+)%/);
                                        return match ? parseInt(match[1]) : 0;
                                    })();
                                    const attackScale = (effectiveTier ? (ATTACK_SCALING[effectiveTier] || 1.0) : 1.0) + scaleBonus;
                                    const buffScaleBonus = (skill.finalEnhanceData?.buffScaleBonus || 0) || (skill.finalEnhanceData?.debuffScaleBonus || 0) || (() => {
                                        const match = skill.effectFormula?.match(/(?:버프|디버프) (?:비율 )?계수 증가 \+(\d+(?:\.\d+)?)%/);
                                        return match ? parseFloat(match[1]) : 0;
                                    })();
                                    const buffScale = (effectiveTier ? (BUFF_SCALING[effectiveTier] || 0.1) : 0.1) + buffScaleBonus;
                                    let currentRatio = isAttack 
                                        ? Math.round(baseRatio + ((skill.level || 1) * attackScale))
                                        : (isBuff || isDebuff)
                                        ? +(baseRatio + ((skill.level || 1) - 1) * buffScale).toFixed(2)
                                        : Math.round(baseRatio + ((skill.level || 1) - 1) * 1);
                                    if (isDebuff) {
                                        currentRatio = Math.min(90, currentRatio);
                                    }

                                    if (isPassive && (skill.passiveEffects?.length || skill.effectFormula)) {
                                        const passiveScaleAdd = skill.finalEnhanceData?.passiveScaleBonus || 0;
                                        const condMatch = skill.effectFormula?.match(/\[COND:\s*(.+?)\]/);
                                        const cond = condMatch ? condMatch[1].trim() : undefined;
                                        const scaleMatch = skill.effectFormula?.match(/\(\+(\d+(?:\.\d+)?)% per Lv\)/);
                                        const baseScale = scaleMatch ? parseFloat(scaleMatch[1]) : (PASSIVE_SCALING[effectiveTier] || 0.1);
                                        const scale = +(baseScale + passiveScaleAdd).toFixed(2);

                                        if (skill.effectFormula?.includes('SPECIAL:')) {
                                            const specCode = skill.effectFormula.replace(/.*SPECIAL:([^\]]+).*/, '$1');
                                            passiveInfo = { target: specCode, base: 0, scale: 0, currentPercent: 0, isSpecial: true, rawDesc: skill.effectFormula };
                                        } else if (skill.passiveEffects && skill.passiveEffects.length > 0) {
                                            const totalBase = skill.passiveEffects.reduce((s, e) => s + (e.value || 0), 0);
                                            const currentPercent = +(totalBase + scale * (skill.level || 1)).toFixed(2);
                                            const targetNames = skill.passiveEffects.map(e => {
                                                const label = PASSIVE_LABEL_MAP[e.target] || e.target;
                                                const elStr = e.element ? `${e.element} ` : '';
                                                return `${elStr}${label} +${e.value}%`;
                                            }).join(', ');
                                            passiveInfo = { target: targetNames, base: totalBase, scale, cond, currentPercent };
                                        } else if (skill.effectFormula) {
                                            const regex = /PASSIVE: \[([\s\w가-힣:]+)\] \+(\d+(?:\.\d+)?)% \(\+(\d+(?:\.\d+)?)% per Lv\)(?: \[COND: (.+)\])?/;
                                            const match = skill.effectFormula.match(regex);
                                            if (match) {
                                                const target = match[1];
                                                const base = parseFloat(match[2]);
                                                const sScale = +(parseFloat(match[3]) + passiveScaleAdd).toFixed(2);
                                                const sCond = match[4] || cond;
                                                const currentPercent = +(base + sScale * (skill.level || 1)).toFixed(2);
                                                passiveInfo = { target, base, scale: sScale, cond: sCond, currentPercent };
                                            } else if (skill.effectFormula.includes('MANA_SHIELD')) {
                                                const msMatch = skill.effectFormula.match(/MANA_SHIELD\] (\d+(?:\.\d+)?)% \(\+(\d+(?:\.\d+)?)% per Lv\)/);
                                                if (msMatch) {
                                                    const base = parseFloat(msMatch[1]);
                                                    const msScale = +(parseFloat(msMatch[2]) + passiveScaleAdd).toFixed(2);
                                                    const currentPercent = +(base + msScale * (skill.level || 1)).toFixed(2);
                                                    passiveInfo = { target: '마나 실드 (피해 마나 흡수)', base, scale: msScale, cond, currentPercent };
                                                }
                                            } else {
                                                const percentMatch = skill.effectFormula.match(/(\d+(\.\d+)?)%/);
                                                if (percentMatch) {
                                                    const base = parseFloat(percentMatch[1]);
                                                    const sScale = +(0.1 + passiveScaleAdd).toFixed(2);
                                                    passiveInfo = { target: '상시 효과', base, scale: sScale, cond, currentPercent: +(base + sScale * (skill.level || 1)).toFixed(1) };
                                                }
                                            }
                                        }
                                    } else if (!isPassive && !skill.powerRatio && skill.effectFormula) {
                                        const percentMatch = skill.effectFormula.match(/(\d+(\.\d+)?)%/);
                                        if (percentMatch) {
                                            baseRatio = parseFloat(percentMatch[1]);
                                            currentRatio = isAttack 
                                                ? Math.round(baseRatio + ((skill.level || 1) * attackScale))
                                                : (isBuff || isDebuff)
                                                ? +(baseRatio + ((skill.level || 1) - 1) * buffScale).toFixed(2)
                                                : Math.round(baseRatio + ((skill.level || 1) - 1) * 1);
                                        }
                                    }

                                    return (
                                    <div key={idx} className="bg-slate-900/60 border border-slate-700/60 p-4 rounded-xl hover:border-slate-500 transition-all group shadow-md flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-2.5">
                                                <div className="flex items-center gap-3">
                                                    {/* 스킬 썸네일 */}
                                                    <div className="relative shrink-0">
                                                        {skill.imageUrl ? (
                                                            <div className="w-10 h-10 rounded-lg border border-slate-700 bg-slate-950 overflow-hidden shadow-inner flex items-center justify-center">
                                                                <img src={skill.imageUrl} alt={skill.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 group-hover:${currentTierConfig.color} transition-colors shadow-inner flex items-center justify-center w-10 h-10`}>
                                                                {(() => {
                                                                    const IconComp = getSkillIconComponent(skill);
                                                                    return <IconComp size={20} />;
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {(() => {
                                                        const skillElement = getSkillElement(skill, character.shinryokuType);
                                                        const elemConfig = SHINRYOKU_UI_CONFIG[skillElement] || SHINRYOKU_UI_CONFIG.default;
                                                        return (
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <h4 className={`font-bold text-base ${currentTierConfig.color}`}>{skill.name}</h4>
                                                                    <span className="text-[10px] bg-amber-950/90 text-amber-300 font-bold font-mono px-1.5 py-0.5 rounded border border-amber-600/60 shadow-sm">
                                                                        Lv.{skill.level || 1}
                                                                    </span>
                                                                    {((skill as any).companionName || (skill as any).sourceName || (skill as any).partnerName || activeTab === ClassTier.BOND) && (
                                                                        <span className="text-[10px] bg-pink-950/80 text-pink-300 font-bold px-2 py-0.5 rounded border border-pink-600/60 flex items-center gap-1 shadow-sm">
                                                                            <Heart size={10} className="text-pink-400 fill-pink-400 shrink-0" />
                                                                            <span>인연 파트너: {(skill as any).companionName || (skill as any).sourceName || (skill as any).partnerName || '인연 동료'}</span>
                                                                        </span>
                                                                    )}
                                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                                                                        isAttack ? 'bg-red-950/60 text-red-400 border-red-800/60' :
                                                                        isBuff ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' :
                                                                        isDebuff ? 'bg-purple-950/60 text-purple-400 border-purple-800/60' :
                                                                        'bg-blue-950/60 text-blue-400 border-blue-800/60'
                                                                    }`}>
                                                                        {skill.type}
                                                                    </span>
                                                                    {isLegacySkillFormat(skill) && (
                                                                        <span className="text-[10px] bg-amber-950/90 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/70 flex items-center gap-1 shadow-sm animate-pulse">
                                                                            <RefreshCw size={10} className="text-amber-400 shrink-0" />
                                                                            <span>구버전 형식</span>
                                                                        </span>
                                                                    )}

                                                                    {/* 스킬 강화 배지 */}
                                                                    {skill.finalEnhanceData && (
                                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                                            <span className="text-[10px] bg-rose-950/80 text-rose-300 font-bold px-1.5 py-0.5 rounded border border-rose-600/60 flex items-center gap-1 shadow-sm">
                                                                                <Sparkles size={10} className="text-rose-400" />
                                                                                <span>스킬 강화 +{skill.finalEnhanceData.totalEnhanceCount}단계</span>
                                                                            </span>
                                                                            {Boolean(skill.finalEnhanceData.levelScaleBonus) && (
                                                                                <span className="text-[10px] bg-red-950/80 text-red-300 font-bold px-1.5 py-0.5 rounded border border-red-600/60">
                                                                                    계수 한계 돌파 +{skill.finalEnhanceData.levelScaleBonus}%
                                                                                </span>
                                                                            )}
                                                                            {Boolean(skill.finalEnhanceData.isBattlefieldZone && !skill.finalEnhanceData.buffZoneType) && (
                                                                                 <span className="text-[10px] bg-amber-950/80 text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-500/60">
                                                                                     지속 전장 결계
                                                                                 </span>
                                                                             )}
                                                                            {Boolean(skill.finalEnhanceData.buffZoneType) && (
                                                                                 <span className="text-[10px] bg-emerald-950/80 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-500/60">
                                                                                     지속 회복 결계 ({skill.finalEnhanceData.buffZoneType === 'MP' ? '마나' : '체력'})
                                                                                 </span>
                                                                             )}
                                                                            {Boolean(skill.finalEnhanceData.isFocusFusion) && (
                                                                                 <span className="text-[10px] bg-rose-950/80 text-rose-300 font-bold px-1.5 py-0.5 rounded border border-rose-500/60">
                                                                                     집중 융합
                                                                                 </span>
                                                                             )}
                                                                            {Boolean(skill.finalEnhanceData.isEchoAftershock) && (
                                                                                 <span className="text-[10px] bg-orange-950/80 text-orange-300 font-bold px-1.5 py-0.5 rounded border border-orange-500/60">
                                                                                     신력 여진
                                                                                 </span>
                                                                             )}
                                                                            {Boolean(skill.finalEnhanceData.isMassCleanse) && (
                                                                                 <span className="text-[10px] bg-teal-950/80 text-teal-300 font-bold px-1.5 py-0.5 rounded border border-teal-500/60">
                                                                                     일제 정화
                                                                                 </span>
                                                                             )}
                                                                            {Boolean(skill.finalEnhanceData.isAuraTranscend) && (
                                                                                 <span className="text-[10px] bg-amber-950/80 text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-500/60">
                                                                                     기운 초월
                                                                                 </span>
                                                                             )}
                                                                            {Boolean(skill.finalEnhanceData.isAuraErosion) && (
                                                                                 <span className="text-[10px] bg-fuchsia-950/80 text-fuchsia-300 font-bold px-1.5 py-0.5 rounded border border-fuchsia-500/60">
                                                                                     기운 잠식
                                                                                 </span>
                                                                             )}
                                                                            {Boolean(skill.finalEnhanceData.isDefenseShatter) && (
                                                                                 <span className="text-[10px] bg-rose-950/80 text-rose-300 font-bold px-1.5 py-0.5 rounded border border-rose-500/60">
                                                                                     방어 붕괴
                                                                                 </span>
                                                                             )}
                                                                             {(Boolean(skill.finalEnhanceData.isAoEExpanded) || Boolean(skill.finalEnhanceData.isBuffAlliesExpanded) || Boolean(skill.finalEnhanceData.isDebuffAoEExpanded)) && (
                                                                                <span className="text-[10px] bg-amber-950/80 text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-600/60">
                                                                                    광역화 적용
                                                                                </span>
                                                                            )}
                                                                            {Boolean(skill.finalEnhanceData.armorPenetration) && (
                                                                                <span className="text-[10px] bg-orange-950/80 text-orange-300 font-bold px-1.5 py-0.5 rounded border border-orange-600/60">
                                                                                    방어 관통 +{skill.finalEnhanceData.armorPenetration}%
                                                                                </span>
                                                                            )}
                                                                            {Boolean(skill.finalEnhanceData.overhealShield) && (
                                                                                <span className="text-[10px] bg-emerald-950/80 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-600/60">
                                                                                    초과 치유 보호막
                                                                                </span>
                                                                            )}
                                                                            {Boolean(skill.finalEnhanceData.chainWeakening) && (
                                                                                <span className="text-[10px] bg-purple-950/80 text-purple-300 font-bold px-1.5 py-0.5 rounded border border-purple-600/60">
                                                                                    연쇄 약화
                                                                                </span>
                                                                            )}
                                                                            {(Boolean(skill.finalEnhanceData.durationExtended) || Boolean(skill.finalEnhanceData.debuffDurationExtended)) && (
                                                                                <span className="text-[10px] bg-cyan-950/80 text-cyan-300 font-bold px-1.5 py-0.5 rounded border border-cyan-600/60">
                                                                                    지속 턴 연장
                                                                                </span>
                                                                            )}
                                                                            {Boolean(skill.finalEnhanceData.ctrlSuccessBonus) && (
                                                                                <span className="text-[10px] bg-indigo-950/80 text-indigo-300 font-bold px-1.5 py-0.5 rounded border border-indigo-600/60">
                                                                                    상태이상 성공률 제어력 보너스 +{skill.finalEnhanceData.ctrlSuccessBonus}
                                                                                </span>
                                                                            )}
                                                                            {Boolean(skill.finalEnhanceData.debuffScaleBonus) && (
                                                                                <span className="text-[10px] bg-fuchsia-950/80 text-fuchsia-300 font-bold px-1.5 py-0.5 rounded border border-fuchsia-600/60">
                                                                                    디버프 비율 증가 +{skill.finalEnhanceData.debuffScaleBonus}%
                                                                                </span>
                                                                            )}
                                                                            {Boolean(skill.finalEnhanceData.buffScaleBonus) && (
                                                                                <span className="text-[10px] bg-emerald-950/80 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-600/60">
                                                                                    버프 계수 증가 +{skill.finalEnhanceData.buffScaleBonus}%
                                                                                </span>
                                                                            )}
                                                                            {Boolean(skill.finalEnhanceData.mpReductionStack) && (
                                                                                <span className="text-[10px] bg-cyan-950/80 text-cyan-300 font-bold px-1.5 py-0.5 rounded border border-cyan-600/60">
                                                                                    MP 소모 감소 +{skill.finalEnhanceData.mpReductionStack}단계
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] text-slate-500 uppercase tracking-wide font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                                    <span>MP {isPassive ? 0 : (skill.mpCost || 0)}</span>
                                                                    <span>•</span>
                                                                    <span>{skill.targetType === 'aoe' ? '광역' : '단일'}</span>
                                                                    {!isPassive && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span className={`${elemConfig.text} font-bold`}>[속성: {skillElement} / {getAuraDisplayLabel(skillElement)}]</span>
                                                                        </>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        );
                                                    })()}
                                                 </div>

                                                 {/* 숏컷 번호 지정 등록 버튼 */}
                                                 {onUpdateCharacter && (
                                                     <div className="flex items-center gap-1.5 shrink-0">
                                                         <button
                                                             type="button"
                                                             onClick={() => handleOpenShortcutModal({
                                                                 name: skill.name,
                                                                 icon: skill.icon,
                                                                 imageUrl: (skill as any).imageUrl
                                                             })}
                                                             className={`text-[10px] flex items-center gap-1 px-2.5 py-1.5 rounded-xl border font-bold transition-all shrink-0 ${
                                                                 (character.skillShortcuts || []).includes(skill.name)
                                                                     ? 'bg-amber-950/90 border-amber-500 text-amber-300 shadow-md shadow-amber-950'
                                                                     : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border-slate-800 hover:border-slate-700'
                                                             }`}
                                                             title="전투 스킬 숏컷 번호 지정 등록"
                                                         >
                                                             <Zap size={11} className={(character.skillShortcuts || []).includes(skill.name) ? 'text-amber-400 fill-amber-400 animate-pulse' : ''} />
                                                             <span>
                                                                 {(character.skillShortcuts || []).includes(skill.name)
                                                                     ? `숏컷 #${(character.skillShortcuts || []).findIndex(s => s === skill.name) + 1}`
                                                                     : '숏컷 등록'}
                                                             </span>
                                                         </button>
                                                     </div>
                                                 )}
                                            </div>

                                            {/* Description */}
                                            <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/60 mb-3">
                                                <p className="text-xs text-slate-300 leading-relaxed italic">"{skill.description}"</p>
                                            </div>

                                            {/* Skill Specs (Power Ratio / Passive Scaling + Details) */}
                                            <div className="space-y-2 mb-3">
                                                {/* 0. 신력 속성 상세 바 (패시브 스킬 제외) */}
                                                {!isPassive && (() => {
                                                    const skillElement = getSkillElement(skill, character.shinryokuType);
                                                    const elemConfig = SHINRYOKU_UI_CONFIG[skillElement] || SHINRYOKU_UI_CONFIG.default;
                                                    const auraLabel = getAuraDisplayLabel(skillElement);
                                                    return (
                                                        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs bg-slate-950/70 border-slate-800">
                                                            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                                                                <Sparkles size={13} className={elemConfig.text} />
                                                                <span>신력 속성 및 기운:</span>
                                                            </span>
                                                            <span className={`font-mono font-bold ${elemConfig.text} flex items-center gap-1.5`}>
                                                                <span className={`w-2 h-2 rounded-full ${elemConfig.bg} border ${elemConfig.border}`} />
                                                                {skillElement} ({auraLabel})
                                                            </span>
                                                        </div>
                                                    );
                                                })()}

                                                {/* 1. Attack / Buff / Debuff: Power Ratio for active skills */}
                                                {!isPassive && (
                                                    <div className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${
                                                        isAttack ? 'bg-red-950/20 border-red-900/30' :
                                                        isBuff ? 'bg-emerald-950/20 border-emerald-900/30' :
                                                        'bg-purple-950/20 border-purple-900/30'
                                                     }`}>
                                                        <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                                                            {isAttack && <Sword size={13} className="text-red-400" />}
                                                            {isBuff && <Shield size={13} className="text-emerald-400" />}
                                                            {isDebuff && <Zap size={13} className="text-purple-400" />}
                                                            <span>
                                                                {isAttack ? '위력 계수:' :
                                                                 isBuff ? '버프 계수:' :
                                                                 '디버프 계수:'}
                                                            </span>
                                                        </span>
                                                        <div className="font-mono font-bold">
                                                            <span className={
                                                                isAttack ? 'text-red-300' :
                                                                isBuff ? 'text-emerald-300' :
                                                                'text-purple-300'
                                                            }>
                                                                기본 {baseRatio}%
                                                            </span>
                                                            <span className="text-[11px] text-amber-400 ml-1.5 font-semibold">
                                                                (Lv적용 {currentRatio}%)
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 2. Passive Skill: Specific Constant Passive Scaling & Target details */}
                                                {isPassive && (
                                                    <div className="bg-blue-950/20 border border-blue-900/30 px-3 py-2 rounded-lg text-xs flex flex-col gap-1.5">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                                                                <BookOpen size={13} className="text-blue-400" />
                                                                <span>패시브 상시 보정:</span>
                                                            </span>
                                                            <div className="font-mono font-bold">
                                                                {passiveInfo && !passiveInfo.isSpecial ? (
                                                                    <>
                                                                        <span className="text-blue-300">
                                                                            기본 +{passiveInfo.base}%
                                                                        </span>
                                                                        <span className="text-[11px] text-amber-400 ml-1.5 font-semibold">
                                                                            (Lv적용 +{passiveInfo.currentPercent}%)
                                                                        </span>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-blue-300">
                                                                        {passiveInfo?.rawDesc || '특수 패시브 상시 적용'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {passiveInfo && !passiveInfo.isSpecial && (
                                                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-blue-900/20 font-mono">
                                                                <span className="text-blue-300/90 font-sans">
                                                                    대상: [{passiveInfo.target}]{passiveInfo.cond ? ` (착용조건: ${passiveInfo.cond})` : ''}
                                                                </span>
                                                                <span className="text-slate-400 text-[10px]">
                                                                    (성장: Lv당 +{passiveInfo.scale}%)
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Detailed Effect Breakdown */}
                                                {isBuff && (
                                                    <div className="bg-slate-950/60 px-3 py-1.5 rounded-lg border border-emerald-900/30 flex items-center justify-between gap-2 text-xs">
                                                        <span className="text-slate-400 shrink-0 font-medium">버프 강화 효과:</span>
                                                        <span className="text-emerald-300 font-mono text-right font-medium">
                                                            {skill.effectFormula || `아군 능력치 +${currentRatio}% 강화`}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* HP/MP 회복 예상량 안내 (시전자 WIS·INT 평균 기준) */}
                                                {(() => {
                                                    const hasHpRecov = skill.buffEffects?.some(ef => ef.type === 'HP_RECOV') || 
                                                        skill.type === SkillType.HEAL || 
                                                        Boolean(skill.effectFormula && (skill.effectFormula.includes('HP') || skill.effectFormula.includes('HEAL') || skill.effectFormula.includes('체력')) && skill.effectFormula.includes('회복'));
                                                    const hasMpRecov = skill.buffEffects?.some(ef => ef.type === 'MP_RECOV') || 
                                                        Boolean(skill.effectFormula && (skill.effectFormula.includes('MP') || skill.effectFormula.includes('마나') || skill.effectFormula.includes('마력')) && skill.effectFormula.includes('회복'));
                                                    if (!hasHpRecov && !hasMpRecov) return null;

                                                    let hpEst: number | null = null;
                                                    let mpEst: number | null = null;

                                                    const hpEf = skill.buffEffects?.find(ef => ef.type === 'HP_RECOV');
                                                    if (hpEf) {
                                                        hpEst = Math.max(10, Math.floor(sumWisInt * 4 * ((hpEf.value || 10) + Math.max(0, (skill.level || 1) - 1) * buffScale) / 100));
                                                    } else if (hasHpRecov) {
                                                        const match = skill.effectFormula?.match(/(?:HP|MaxHP|HEAL|RECOV|회복)\s*(\d+)%/i);
                                                        const ratio = match ? parseInt(match[1]) : (skill.powerRatio || 50);
                                                        hpEst = Math.max(10, Math.floor(sumWisInt * 4 * (ratio + Math.max(0, (skill.level || 1) - 1) * buffScale) / 100));
                                                    }

                                                    const mpEf = skill.buffEffects?.find(ef => ef.type === 'MP_RECOV');
                                                    if (mpEf) {
                                                        mpEst = Math.max(5, Math.floor(sumWisInt * ((mpEf.value || 10) + Math.max(0, (skill.level || 1) - 1) * buffScale) / 100));
                                                    } else if (hasMpRecov) {
                                                        const match = skill.effectFormula?.match(/(?:MP|MaxMP)\s*(\d+)%/i);
                                                        const ratio = match ? parseInt(match[1]) : (skill.powerRatio || 50);
                                                        mpEst = Math.max(5, Math.floor(sumWisInt * (ratio + Math.max(0, (skill.level || 1) - 1) * buffScale) / 100));
                                                    }

                                                    return (
                                                        <div className="bg-blue-950/40 px-3 py-1.5 rounded-lg border border-blue-800/40 flex items-center justify-between gap-2 text-xs">
                                                            <span className="text-cyan-300 shrink-0 font-medium">예상 회복량:</span>
                                                            <span className="text-emerald-400 font-mono text-right font-bold">
                                                                {hpEst !== null ? `HP +${hpEst}` : ''}
                                                                {hpEst !== null && mpEst !== null ? ' / ' : ''}
                                                                {mpEst !== null ? `MP +${mpEst}` : ''}
                                                            </span>
                                                        </div>
                                                    );
                                                })()}

                                                {isDebuff && (
                                                    <div className="bg-slate-950/60 px-3 py-1.5 rounded-lg border border-purple-900/30 flex items-center justify-between gap-2 text-xs">
                                                        <span className="text-slate-400 shrink-0 font-medium">디버프 약화 효과:</span>
                                                        <span className="text-purple-300 font-mono text-right font-medium">
                                                            {skill.effectFormula || `적 대상 능력치 -${currentRatio}% 약화`}
                                                        </span>
                                                    </div>
                                                )}

                                                {isAttack && skill.effectFormula && (
                                                    <div className="bg-slate-950/60 px-3 py-1.5 rounded-lg border border-red-900/30 flex items-center justify-between gap-2 text-xs">
                                                        <span className="text-slate-400 shrink-0 font-medium">연산/부가 효과:</span>
                                                        <span className="text-amber-400/90 font-mono text-right font-medium">
                                                            {skill.effectFormula}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Mastery progress */}
                                        <div className="bg-slate-950/80 rounded-lg p-2.5 border border-slate-800 flex flex-col justify-center mt-auto">
                                            <div className="flex justify-between items-center mb-1 text-xs">
                                                <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center">
                                                    <TrendingUp size={11} className="mr-1 text-amber-500"/> 숙련도 (Mastery)
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    {isMaxLevel ? (
                                                        <span className="text-amber-400 font-bold">✨ MAX (마스터 완료)</span>
                                                    ) : (
                                                        `${skill.currentMastery || 0} / ${requiredMastery} (${masteryPercent.toFixed(1)}%)`
                                                    )}
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                                <div 
                                                    className={`h-full transition-all duration-500 ${isMaxLevel ? 'bg-gradient-to-r from-emerald-500 to-amber-400' : 'bg-gradient-to-r from-amber-700 to-amber-500'}`} 
                                                    style={{ width: `${masteryPercent}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                            )}
                        </div>
                        )}
                    </div>
                    )}

                    {creationStep === 'select' && (
                         <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-4">
                             <div className={`grid grid-cols-1 ${isEnhanceTier ? 'md:grid-cols-3 max-w-2xl' : 'md:grid-cols-2 max-w-lg'} gap-4 md:gap-6 w-full`}>
                                 <button onClick={() => { resetForm(); setCreationStep('custom'); }} className="bg-slate-900 border border-slate-700 hover:border-amber-500 hover:bg-slate-800 p-6 md:p-8 rounded-2xl flex flex-col items-center justify-center group transition-all duration-300 shadow-xl hover:shadow-amber-900/20">
                                     <div className="p-4 bg-slate-950 rounded-full mb-4 group-hover:scale-110 transition-transform border border-slate-800 group-hover:border-amber-500/50"><PenTool size={32} className="text-slate-400 group-hover:text-amber-400" /></div>
                                     <h3 className="text-xl font-bold text-slate-200 group-hover:text-amber-400 mb-2">직접 설계</h3>
                                     <p className="text-xs text-slate-500 text-center">이름, 위력, 코스트를<br/>직접 자유롭게 설정합니다.</p>
                                 </button>
                                 <button onClick={handleFullAIGeneration} disabled={isGenerating} className="bg-slate-900 border border-slate-700 hover:border-indigo-500 hover:bg-slate-800 p-6 md:p-8 rounded-2xl flex flex-col items-center justify-center group transition-all duration-300 shadow-xl hover:shadow-indigo-900/20 relative overflow-hidden">
                                     {isGenerating && <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center"><Loader2 size={32} className="animate-spin text-indigo-400"/></div>}
                                     <div className="p-4 bg-slate-950 rounded-full mb-4 group-hover:scale-110 group-hover:rotate-12 transition-transform border border-indigo-500/50"><Dices size={32} className="text-slate-400 group-hover:text-indigo-400" /></div>
                                     <h3 className="text-xl font-bold text-slate-200 group-hover:text-indigo-400 mb-2">AI 자동 생성</h3>
                                     <p className="text-xs text-slate-500 text-center">AI가 캐릭터 컨셉에 맞춰<br/>완벽한 스킬을 제안합니다.</p>
                                 </button>
                                 {isEnhanceTier && (
                                     <button onClick={() => { setCreationStep('none'); setIsFinalEnhanceOpen(true); }} className="bg-slate-900 border border-slate-700 hover:border-rose-500 hover:bg-slate-800 p-6 md:p-8 rounded-2xl flex flex-col items-center justify-center group transition-all duration-300 shadow-xl hover:shadow-rose-900/20">
                                         <div className="p-4 bg-slate-950 rounded-full mb-4 group-hover:scale-110 transition-transform border border-slate-800 group-hover:border-rose-500/50"><Sparkles size={32} className="text-slate-400 group-hover:text-rose-400" /></div>
                                         <h3 className="text-xl font-bold text-slate-200 group-hover:text-rose-400 mb-2">기존 스킬 강화</h3>
                                         <p className="text-xs text-slate-500 text-center">{currentTierConfig.label} 스킬 슬롯을 소모하여<br/>기존 스킬을 대폭 강화합니다.</p>
                                     </button>
                                 )}
                             </div>
                             <button onClick={() => setCreationStep('none')} className="mt-8 text-slate-500 hover:text-white">취소</button>
                         </div>
                    )}

                       {creationStep === 'custom' && (
                        <div className="w-full bg-slate-900 border border-amber-500/30 rounded-xl p-4 md:p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 mb-10">
                            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-amber-100 flex items-center"><PenTool className="mr-2 text-amber-500" size={18}/> 커스텀 스킬</h3><div className="flex gap-2"><button onClick={handleAutoNameFill} disabled={isGenerating} className="text-[10px] flex items-center bg-indigo-900/30 hover:bg-indigo-900/50 text-indigo-300 px-2 py-1 rounded border border-indigo-500/30 transition-colors">{isGenerating ? <Loader2 size={10} className="animate-spin mr-1"/> : <RefreshCw size={10} className="mr-1"/>}이름 추천</button><button onClick={handleDescriptionSuggestion} disabled={isGenerating || !customSkillName} className="text-[10px] flex items-center bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 px-2 py-1 rounded border border-purple-500/30 transition-colors disabled:opacity-30">{isGenerating ? <Loader2 size={10} className="animate-spin mr-1"/> : <Brain size={10} className="mr-1"/>}AI 설명 추천</button></div></div>
                            
                            {isFinalActiveTab && (
                                <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3 sm:p-4 mb-3 text-xs space-y-1.5 shadow-md">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <span className="font-bold text-rose-300 flex items-center gap-1.5 text-xs sm:text-sm">
                                            <Sparkles size={15} className="text-rose-400 shrink-0" />
                                            파이널 클래스 창조 슬롯: 제 {finalNextSlot}슬롯
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-full bg-rose-900/60 border border-rose-600/60 font-mono font-bold text-rose-200 text-[11px]">
                                            적용 기준: {finalEffectiveLevelTier}레벨
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-300 leading-relaxed">
                                        {finalNextSlot <= 5 ? (
                                            <>※ 1~5번째 슬롯 스킬은 1000레벨 기본 비율이 고정 적용됩니다. (스킬 잊기 후 다시 만들더라도 1000레벨 비율 유지)</>
                                        ) : (
                                            <>※ 2000레벨 이상 슬롯(6번째 스킬부터)으로 {finalEffectiveLevelTier}레벨 기준 강화 비율이 적용됩니다. (공격력·버프·패시브 비율 상한 차근차근 증가, 디버프 스킬은 최대 90% 제한)</>
                                        )}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-[10px] uppercase text-slate-500 font-bold">Name</label>
                                            <button 
                                                onClick={handleNameSuggestion} 
                                                disabled={isNameLoading || !customSkillDesc.trim()}
                                                className="text-[8px] bg-slate-800 hover:bg-slate-700 text-amber-400 px-1.5 py-0.5 rounded border border-slate-700 transition-colors disabled:opacity-30"
                                            >
                                                {isNameLoading ? <Loader2 size={8} className="animate-spin inline mr-1"/> : <Sparkles size={8} className="inline mr-1"/>}
                                                설명기반 이름 추천
                                            </button>
                                        </div>
                                        <input type="text" value={customSkillName} onChange={(e) => setCustomSkillName(e.target.value)} placeholder="스킬 이름 입력" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 focus:border-amber-500 outline-none font-bold" />
                                     </div>
                                     <div>
                                        <label className="block text-[10px] uppercase text-slate-500 mb-1 font-bold">Type</label>
                                        <select 
                                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 focus:border-amber-500 outline-none" 
                                            value={customSkillType} 
                                            onChange={(e) => {
                                                const nextType = e.target.value as SkillType;
                                                setCustomSkillType(nextType);
                                                if (nextType !== SkillType.PHYSICAL && nextType !== SkillType.MAGIC) {
                                                    setSelectedAilment('');
                                                }
                                            }}
                                        >
                                            {Object.values(SkillType)
                                                .filter(t => {
                                                    if (t === SkillType.HEAL) return false;
                                                    if (t === SkillType.SUMMON) {
                                                        if ([ClassTier.NONE, ClassTier.FIRST].includes(activeTab as ClassTier)) return false;
                                                        const minTier = getRequiredMinTier(activeTab);
                                                        if (!hasCombatStyleOfRootAndTier(character, SUMMON_ROOTS, minTier)) return false;
                                                    }
                                                    if (t === SkillType.CLONE) {
                                                        if ([ClassTier.NONE, ClassTier.FIRST].includes(activeTab as ClassTier)) return false;
                                                        const { has2ndNinja, has3rdNinja, has4thNinja } = checkNinjaCombatStyleOwnership(character);
                                                        const isNinjaAllowed = 
                                                            (activeTab === ClassTier.SECOND && (has2ndNinja || has3rdNinja || has4thNinja)) ||
                                                            (activeTab === ClassTier.LAST && (has3rdNinja || has4thNinja)) ||
                                                            (activeTab === ClassTier.FINAL && has4thNinja);
                                                        if (!isNinjaAllowed) return false;
                                                    }
                                                    if (isNoneTier) {
                                                        return t === SkillType.PHYSICAL || t === SkillType.MAGIC;
                                                    }
                                                    return true;
                                                })
                                                .map((t, tIdx) => {
                                                    const isPassiveOpt = t === SkillType.PASSIVE;
                                                    const disabled = isPassiveOpt && isPassiveLimitReached;
                                                    let labelSuffix = '';
                                                    if (isPassiveOpt) {
                                                        labelSuffix = maxPassivesForTier !== null 
                                                            ? ` (최대 ${maxPassivesForTier}개 - 현재 ${currentTierPassiveCount}/${maxPassivesForTier}${isPassiveLimitReached ? ' [한도 도달]' : ''})`
                                                            : ' (무제한)';
                                                    }
                                                    return (
                                                        <option key={`${t}-${tIdx}`} value={t} disabled={disabled}>
                                                            {t}{labelSuffix}
                                                        </option>
                                                    );
                                                })
                                            }
                                        </select>
                                        {customSkillType === SkillType.PASSIVE && (
                                            <div className={`text-[10px] rounded p-2.5 mt-2 border flex items-center justify-between ${
                                                isPassiveLimitReached 
                                                    ? 'bg-rose-950/50 border-rose-800 text-rose-200' 
                                                    : 'bg-indigo-950/40 border-indigo-900/50 text-indigo-200'
                                            }`}>
                                                <div className="flex items-center gap-1.5">
                                                    <BookOpen size={13} className={isPassiveLimitReached ? 'text-rose-400' : 'text-indigo-400'} />
                                                    <span>
                                                        {currentTierConfig.label} 패시브 슬롯: <strong>{currentTierPassiveCount} / {maxPassivesForTier !== null ? `${maxPassivesForTier}개` : '무제한'}</strong>
                                                    </span>
                                                </div>
                                                {isPassiveLimitReached ? (
                                                    <span className="text-rose-400 font-bold text-[9px] bg-rose-900/40 px-1.5 py-0.5 rounded border border-rose-800">
                                                        슬롯 한도 도달 (생성 불가)
                                                    </span>
                                                ) : (
                                                    <span className="text-emerald-400 text-[9px] font-semibold">
                                                        생성 가능 ({maxPassivesForTier !== null ? `${maxPassivesForTier - currentTierPassiveCount}자리 남음` : '제한 없음'})
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {customSkillType === SkillType.BUFF && (
                                            <div className="text-[10px] bg-indigo-950/40 border border-indigo-900/50 rounded p-2 mt-2 space-y-1.5 text-indigo-300">
                                                <p className="font-bold flex items-center gap-1"><Info size={10} className="text-indigo-400"/> 버프 스탯 및 옵션 개방 조건 ({activeTab === ClassTier.SECOND ? '세컨드' : activeTab === ClassTier.LAST ? '라스트' : activeTab === ClassTier.FINAL ? '파이널' : '기본'})</p>
                                                <ul className="list-disc pl-3 text-[9px] space-y-0.5 text-slate-400">
                                                    <li>
                                                        <span>회복/정화</span>: 
                                                        {activeTab === ClassTier.SECOND && ` '클레릭' 계열 습득 필요 ${hasCombatStyle(character, CombatStyle.CLERIC) ? '✅' : '❌'}`}
                                                        {activeTab === ClassTier.LAST && ` '프리스트' 계열 습득 필요 ${hasCombatStyle(character, CombatStyle.PRIEST) ? '✅' : '❌'}`}
                                                        {activeTab === ClassTier.FINAL && ` '세인트' 계열 습득 필요 ${hasCombatStyle(character, CombatStyle.SAINT) ? '✅' : '❌'}`}
                                                        {![ClassTier.SECOND, ClassTier.LAST, ClassTier.FINAL].includes(activeTab as ClassTier) && ' 조건 없음 ✅'}
                                                    </li>
                                                    {isSpecialTier && (
                                                        <>
                                                            <li>
                                                                <span>마나 쉴드 (1슬롯)</span>: '마법사'/'에너자이저' {getRequiredMinTier(activeTab)}차 이상 {hasCombatStyleOfRootAndTier(character, MANA_SHIELD_ROOTS, getRequiredMinTier(activeTab)) ? '✅' : '❌'}
                                                            </li>
                                                            <li>
                                                                <span>부활 (2슬롯)</span>: {activeTab === ClassTier.LAST ? "'프리스트' 계열 습득 필요 " + (hasCombatStyle(character, CombatStyle.PRIEST) ? '✅' : '❌') : "'세인트' 계열 습득 필요 " + (hasCombatStyle(character, CombatStyle.SAINT) ? '✅' : '❌')}
                                                            </li>
                                                        </>
                                                    )}
                                                    {getRequiredMinTier(activeTab) > 1 && (
                                                        <>
                                                            <li>
                                                                <span>물리/마법회피율</span>: '도적' {getRequiredMinTier(activeTab)}차 이상 {hasCombatStyleOfRootAndTier(character, EVA_ROOTS, getRequiredMinTier(activeTab)) ? '✅' : '❌'}
                                                            </li>
                                                            <li>
                                                                <span>물리/마법명중률</span>: '궁수'/'거너'/'복서' {getRequiredMinTier(activeTab)}차 이상 {hasCombatStyleOfRootAndTier(character, ACC_ROOTS, getRequiredMinTier(activeTab)) ? '✅' : '❌'}
                                                            </li>
                                                            <li>
                                                                <span>MaxHP</span>: '검사'/'창술사'/'광전사' {getRequiredMinTier(activeTab)}차 이상 {hasCombatStyleOfRootAndTier(character, HP_ROOTS, getRequiredMinTier(activeTab)) ? '✅' : '❌'}
                                                            </li>
                                                            <li>
                                                                <span>MaxMP</span>: '마법사' {getRequiredMinTier(activeTab)}차 이상 {hasCombatStyleOfRootAndTier(character, MP_ROOTS, getRequiredMinTier(activeTab)) ? '✅' : '❌'}
                                                            </li>
                                                        </>
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                     </div>
                                </div>


                                
                                {/* Skill Icon Selection with visual thumbnail */}
                                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                                    <div className="flex justify-between items-center mb-2.5">
                                        <label className="text-[10px] uppercase text-slate-500 font-bold">스킬 아이콘 썸네일 선택</label>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[9px] text-slate-500">미리보기:</span>
                                            <div className="p-1 rounded bg-slate-900 border border-amber-500/50 text-amber-400">
                                                {(() => {
                                                    const found = BASE_ICONS.find(bi => bi.name === selectedIcon);
                                                    const IconComp = found ? found.icon : Sword;
                                                    return <IconComp size={14} />;
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                                        {BASE_ICONS.map((bi) => {
                                            const IconComp = bi.icon;
                                            const isSelected = selectedIcon === bi.name;
                                            return (
                                                <button
                                                    key={bi.name}
                                                    type="button"
                                                    onClick={() => setSelectedIcon(bi.name)}
                                                    className={`p-1.5 rounded border flex flex-col items-center justify-center transition-all ${
                                                        isSelected 
                                                            ? 'bg-amber-950/40 border-amber-500 text-amber-400 font-bold scale-102' 
                                                            : 'bg-slate-900 border-slate-850 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                                                    }`}
                                                >
                                                    <IconComp size={16} />
                                                    <span className="text-[8px] mt-0.5">{bi.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                
                                {/* Target Selection */}
                                {customSkillType !== SkillType.PASSIVE && customSkillType !== SkillType.BUFF && customSkillType !== SkillType.SUMMON && customSkillType !== SkillType.CLONE && (
                                     <div>
                                        <label className="block text-[10px] uppercase text-slate-500 mb-1 font-bold">대상 지정</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => setCustomTargetType('single')} className={`text-[10px] p-2 rounded border flex flex-col items-center ${customTargetType === 'single' ? 'bg-amber-900/40 border-amber-500 text-amber-200' : 'bg-slate-950 border-slate-700 text-slate-500'}`}><Target size={14} className="mb-1"/>단일</button>
                                            <button onClick={() => setCustomTargetType('aoe')} className={`text-[10px] p-2 rounded border flex flex-col items-center ${customTargetType === 'aoe' ? 'bg-amber-900/40 border-amber-500 text-amber-200' : 'bg-slate-950 border-slate-700 text-slate-500'}`}><Crosshair size={14} className="mb-1"/>광역</button>
                                        </div>
                                        {customTargetType === 'aoe' && <p className="text-[10px] text-red-400 mt-1">* 광역 스킬: {customSkillType === SkillType.DEBUFF ? '제한된 효과' : '위력 상한 감소'}, MP 소모 3배.</p>}
                                     </div>
                                )}

                                 {/* Status Ailment or Buff Selection (Phys/Magic) */}
                                 {!isNoneTier && (customSkillType === SkillType.PHYSICAL || customSkillType === SkillType.MAGIC) && (
                                     <div className="bg-purple-900/20 p-3 rounded border border-purple-500/30 space-y-2">
                                         {activeTab === ClassTier.FINAL && (
                                             <div className="grid grid-cols-3 gap-1.5 mb-2 pb-2 border-b border-purple-500/20">
                                                 <button
                                                     type="button"
                                                     onClick={() => {
                                                         setAttackSkillEffectType('ailment');
                                                     }}
                                                     className={`py-1.5 px-1 text-xs font-bold rounded border transition-all text-center ${
                                                         attackSkillEffectType === 'ailment'
                                                             ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                                                             : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                                                     }`}
                                                 >
                                                     상태이상 부여
                                                 </button>
                                                 <button
                                                     type="button"
                                                     onClick={() => {
                                                         setAttackSkillEffectType('buff');
                                                         setSelectedAilment('');
                                                     }}
                                                     className={`py-1.5 px-1 text-xs font-bold rounded border transition-all text-center ${
                                                         attackSkillEffectType === 'buff'
                                                             ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                                                             : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                                                     }`}
                                                 >
                                                     버프 효과 선택
                                                 </button>
                                                 <button
                                                     type="button"
                                                     onClick={() => {
                                                         setAttackSkillEffectType('debuff');
                                                         setSelectedAilment('');
                                                     }}
                                                     className={`py-1.5 px-1 text-xs font-bold rounded border transition-all text-center ${
                                                         attackSkillEffectType === 'debuff'
                                                             ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                                                             : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                                                     }`}
                                                 >
                                                     디버프 효과 선택
                                                 </button>
                                             </div>
                                         )}

                                         {attackSkillEffectType === 'ailment' || activeTab !== ClassTier.FINAL ? (
                                             <>
                                                 <div className="flex justify-between items-center mb-1.5">
                                                     <label className="text-[10px] uppercase text-purple-400 font-bold flex items-center">
                                                         <AlertCircle size={10} className="mr-1"/> 상태이상 부여 ({customSkillElement} 속성 연계)
                                                     </label>
                                                     {selectedAilment && (
                                                         <button 
                                                             type="button" 
                                                             onClick={() => setSelectedAilment('')}
                                                             className="text-[9px] text-slate-400 hover:text-red-400 underline"
                                                         >
                                                             선택 해제
                                                         </button>
                                                     )}
                                                 </div>
                                                 <div className="flex gap-2 flex-wrap">
                                                     {allowedAilments.map((ailment, aIdx) => {
                                                         const restrictedAilments = ['소멸', '월침', '흡정'];
                                                         const isRestricted = restrictedAilments.includes(ailment);
                                                         const canPickRestricted = [ClassTier.LAST, ClassTier.FINAL].includes(activeTab as ClassTier);
                                                         if (isRestricted && !canPickRestricted) return null;
                                                         return (
                                                             <button key={`${ailment}-${aIdx}`} onClick={() => setSelectedAilment(selectedAilment === ailment ? '' : ailment)} className={`text-[10px] px-2 py-1 rounded border transition-colors ${selectedAilment === ailment ? 'bg-purple-600 text-white border-purple-400' : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-purple-500'}`}>{ailment}</button>
                                                         );
                                                     })}
                                                 </div>
                                                 {selectedAilment ? (
                                                     <p className="text-[10px] text-purple-300 mt-1.5">* 스킬 적중 시 확률적으로 '{selectedAilment}' 상태이상을 부여합니다. (MP 소모 +30)</p>
                                                 ) : (
                                                     <p className="text-[9px] text-slate-500 mt-1">* {customSkillElement} 속성에 적합한 상태이상을 스킬에 부여할 수 있습니다. (선택 사항)</p>
                                                 )}
                                             </>
                                         ) : attackSkillEffectType === 'buff' ? (
                                             <div className="space-y-3">
                                                 <div className="flex justify-between items-center">
                                                     <label className="text-[10px] uppercase text-indigo-300 font-bold flex items-center gap-1">
                                                         <Sparkles size={12} className="text-amber-400" /> 공격 부가 버프 설정 (최대 2슬롯)
                                                     </label>
                                                     <span className="text-[10px] text-indigo-300 font-mono">
                                                         {buffEffects.length} / {buffLimits.maxEffects} 슬롯
                                                     </span>
                                                 </div>

                                                 <div className="flex gap-2">
                                                     <select 
                                                         className="flex-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-200 outline-none" 
                                                         value={selectedBuffType} 
                                                         onChange={(e) => setSelectedBuffType(e.target.value)}
                                                     >
                                                         <option value="STAT_BOOST">스탯 증가 (%)</option>
                                                         <option value="ELEMENTAL_DMG_BOOST">속성 피해 증가 (%)</option>
                                                         <option value="ELEMENTAL_RES_BOOST">속성 저항 증가 (%)</option>
                                                         <option value="HP_RECOV">HP 회복 (WIS·INT 합산 * 4 비례)</option>
                                                         <option value="MP_RECOV">MP 회복 (WIS·INT 합산 비례)</option>
                                                     </select>
                                                     <button 
                                                         type="button"
                                                         onClick={handleAddBuffEffect} 
                                                         disabled={buffEffects.length >= buffLimits.maxEffects} 
                                                         className="px-3 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 rounded border border-indigo-600/50 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                     >
                                                         + 버프 추가
                                                     </button>
                                                 </div>

                                                 {(() => {
                                                     const attackBuffCap = getAttackSkillBuffCap(customTargetType, isFinalActiveTab ? finalBonusSteps : 0);
                                                     const attackBuffTotalVal = buffEffects.reduce((s, ef) => s + (ef.value || 0), 0);
                                                     const remainingAttackBuffCap = Math.max(0, attackBuffCap - attackBuffTotalVal);
                                                     return (
                                                         <div className="space-y-2 mt-2">
                                                             <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                                                                 <div className="flex justify-between items-center text-xs">
                                                                     <span className="font-bold text-amber-400">부가 버프 비율 합산</span>
                                                                     <span className="font-mono text-slate-300">
                                                                         <strong className="text-amber-400">{attackBuffTotalVal}%</strong> / {attackBuffCap}% (여유: {remainingAttackBuffCap}%)
                                                                     </span>
                                                                 </div>
                                                                 <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                                                                     <div 
                                                                         className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-300" 
                                                                         style={{ width: `${Math.min(100, (attackBuffTotalVal / Math.max(1, attackBuffCap)) * 100)}%` }}
                                                                     />
                                                                 </div>
                                                                 <div className="flex justify-between text-[10px] text-slate-400">
                                                                     <span>사용 슬롯: {buffEffects.length} / {buffLimits.maxEffects}</span>
                                                                     <span className="text-amber-400/90">* 슬롯당 MP 소모 +150% 증대</span>
                                                                 </div>
                                                             </div>

                                                             <div className="space-y-2">
                                                                 {buffEffects.map((ef, idx) => {
                                                                     const otherSum = buffEffects.reduce((s, e, i) => i === idx ? s : s + (e.value || 0), 0);
                                                                     const slotCap = Math.max(0, attackBuffCap - otherSum);
                                                                     return (
                                                                         <div key={idx} className="bg-slate-950 p-2 rounded border border-slate-800 flex flex-col gap-1.5">
                                                                             <div className="flex justify-between items-center">
                                                                                 <span className="text-[10px] text-amber-400 font-bold">
                                                                                     {ef.type === 'STAT_BOOST' ? (STAT_DISPLAY_NAMES[ef.targetStat || ''] || ef.targetStat || '스탯') : ef.type}
                                                                                 </span>
                                                                                 <button onClick={() => removeBuffEffect(idx)} className="text-red-400 hover:text-red-300"><Trash2 size={12}/></button>
                                                                             </div>

                                                                             {ef.type === 'STAT_BOOST' && (
                                                                                 <div className="flex gap-2 items-center">
                                                                                     <select 
                                                                                         value={ef.targetStat || 'STR'} 
                                                                                         onChange={(e) => updateBuffEffect(idx, 'targetStat', e.target.value)}
                                                                                         className="bg-slate-900 border border-slate-700 rounded text-[10px] p-1 text-slate-200"
                                                                                     >
                                                                                         {BUFF_STATS.map(stat => (
                                                                                             <option key={stat} value={stat}>{STAT_DISPLAY_NAMES[stat] || stat}</option>
                                                                                         ))}
                                                                                     </select>
                                                                                     <input 
                                                                                         type="range" 
                                                                                         min="1" 
                                                                                         max={Math.max(1, slotCap)} 
                                                                                         value={Math.min(ef.value, Math.max(1, slotCap))} 
                                                                                         onChange={(e) => updateBuffEffect(idx, 'value', parseInt(e.target.value))} 
                                                                                         className="flex-1 accent-amber-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                                                                     />
                                                                                     <span className="text-[10px] font-mono text-amber-400 font-bold">{Math.min(ef.value, Math.max(1, slotCap))}%</span>
                                                                                 </div>
                                                                             )}

                                                                             {(ef.type === 'ELEMENTAL_DMG_BOOST' || ef.type === 'ELEMENTAL_RES_BOOST') && (
                                                                                 <div className="flex gap-2 items-center">
                                                                                     <select 
                                                                                         value={ef.targetElement || '화염계'} 
                                                                                         onChange={(e) => updateBuffEffect(idx, 'targetElement', e.target.value)}
                                                                                         className="bg-slate-900 border border-slate-700 rounded text-[10px] p-1 text-slate-200"
                                                                                     >
                                                                                         {SHINRYOKU_TYPES_LIST.map(el => (
                                                                                             <option key={el} value={el}>{el}</option>
                                                                                         ))}
                                                                                     </select>
                                                                                     <input 
                                                                                         type="range" 
                                                                                         min="1" 
                                                                                         max={Math.max(1, slotCap)} 
                                                                                         value={Math.min(ef.value, Math.max(1, slotCap))} 
                                                                                         onChange={(e) => updateBuffEffect(idx, 'value', parseInt(e.target.value))} 
                                                                                         className="flex-1 accent-amber-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                                                                     />
                                                                                     <span className="text-[10px] font-mono text-amber-400 font-bold">{Math.min(ef.value, Math.max(1, slotCap))}%</span>
                                                                                 </div>
                                                                             )}

                                                                             {(ef.type === 'HP_RECOV' || ef.type === 'MP_RECOV') && (
                                                                                 <div className="flex flex-col gap-1 w-full bg-slate-900/60 p-1.5 rounded border border-amber-900/30">
                                                                                     <div className="flex gap-2 items-center">
                                                                                         <input 
                                                                                             type="range" 
                                                                                             min="1" 
                                                                                             max={Math.max(1, slotCap)} 
                                                                                             value={Math.min(ef.value, Math.max(1, slotCap))} 
                                                                                             onChange={(e) => updateBuffEffect(idx, 'value', parseInt(e.target.value))} 
                                                                                             className="flex-1 accent-amber-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                                                                         />
                                                                                         <span className="text-[10px] font-mono text-amber-400 font-bold">{Math.min(ef.value, Math.max(1, slotCap))}%</span>
                                                                                     </div>
                                                                                     <div className="flex justify-between items-center text-[9px] text-slate-400">
                                                                                         <span className="text-cyan-300 font-medium">
                                                                                             예상 회복량: <strong className="text-emerald-400 font-mono">+{Math.max(ef.type === 'HP_RECOV' ? 10 : 5, Math.floor((ef.type === 'HP_RECOV' ? sumWisInt * 4 : sumWisInt) * Math.min(ef.value || 0, Math.max(1, slotCap)) / 100))}</strong> {ef.type === 'HP_RECOV' ? 'HP' : 'MP'}
                                                                                         </span>
                                                                                         <span className="text-slate-500 font-mono">
                                                                                             (시전자 WIS·INT 합산: {sumWisInt}{ef.type === 'HP_RECOV' ? ' [기준x4]' : ''})
                                                                                         </span>
                                                                                     </div>
                                                                                 </div>
                                                                             )}
                                                                         </div>
                                                                     );
                                                                 })}
                                                             </div>
                                                         </div>
                                                     );
                                                 })()}
                                                 <p className="text-[9px] text-indigo-300">
                                                     * 부가 버프 선택 시 단일 대상 스킬은 [버프 아군]과 [타격 적]을 개별 선택할 수 있으며, 레벨당 +0.5%씩 증가합니다.
                                                 </p>
                                             </div>
                                         ) : (
                                             <div className="space-y-3">
                                                 <div className="flex justify-between items-center">
                                                     <label className="text-[10px] uppercase text-rose-300 font-bold flex items-center gap-1">
                                                         <Skull size={12} className="text-rose-400" /> 공격 부가 디버프 설정 (스탯 1종류 선택)
                                                     </label>
                                                     <span className="text-[10px] text-rose-300 font-mono">
                                                         최대 {getAttackSkillDebuffCap(customTargetType, isFinalActiveTab ? finalBonusSteps : 0)}%
                                                     </span>
                                                 </div>

                                                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                                     {ATTACK_DEBUFF_OPTIONS.map((opt) => {
                                                         const isSelected = selectedAttackDebuffStat === opt.key;
                                                         return (
                                                             <button
                                                                 key={opt.key}
                                                                 type="button"
                                                                 onClick={() => setSelectedAttackDebuffStat(opt.key)}
                                                                 className={`text-[10px] py-1.5 px-2 rounded border text-center transition-all ${
                                                                     isSelected
                                                                         ? 'bg-rose-700 text-white border-rose-400 font-bold shadow-md'
                                                                         : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                                                                 }`}
                                                             >
                                                                 {opt.name}
                                                             </button>
                                                         );
                                                     })}
                                                 </div>

                                                 <div className="flex gap-2 items-center bg-slate-950 p-2.5 rounded border border-slate-800">
                                                     <span className="text-xs font-bold text-rose-400 shrink-0">
                                                         {getAttackDebuffKoreanName(selectedAttackDebuffStat)}:
                                                     </span>
                                                     <input
                                                         type="range"
                                                         min="1"
                                                         max={getAttackSkillDebuffCap(customTargetType, isFinalActiveTab ? finalBonusSteps : 0)}
                                                         value={Math.min(attackDebuffValue, getAttackSkillDebuffCap(customTargetType, isFinalActiveTab ? finalBonusSteps : 0))}
                                                         onChange={(e) => setAttackDebuffValue(parseInt(e.target.value))}
                                                         className="flex-1 accent-rose-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                                     />
                                                     <span className="text-xs font-mono text-rose-400 font-bold shrink-0">
                                                         -{Math.min(attackDebuffValue, getAttackSkillDebuffCap(customTargetType, isFinalActiveTab ? finalBonusSteps : 0))}%
                                                     </span>
                                                 </div>

                                                 <p className="text-[9px] text-rose-300">
                                                     * 공격 적중 시 피격된 적에게 {getAttackDebuffKoreanName(selectedAttackDebuffStat)} -{Math.min(attackDebuffValue, getAttackSkillDebuffCap(customTargetType, isFinalActiveTab ? finalBonusSteps : 0))}% 디버프 효과가 부여됩니다.
                                                 </p>
                                             </div>
                                         )}
                                     </div>
                                 )}

                                {/* PASSIVE CONFIG */}
                                {customSkillType === SkillType.PASSIVE ? (
                                    <div className="bg-slate-950/50 p-3 rounded border border-slate-800 space-y-4">
                                        {/* 카테고리 선택: 스탯 / 전투 / 특수(4차 전용) */}
                                        <div>
                                            <label className="block text-[10px] uppercase text-slate-400 mb-1 font-bold">패시브 스킬 카테고리</label>
                                            <div className="flex gap-2 mb-2">
                                                <button 
                                                    type="button"
                                                    onClick={() => { setPassiveCategory('STAT'); setSpecialPassiveCode(''); }}
                                                    className={`flex-1 py-1.5 text-xs font-bold rounded border ${passiveCategory === 'STAT' ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300' : 'bg-slate-900 border border-slate-700 text-slate-500'}`}
                                                >
                                                    스탯 증가
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => { setPassiveCategory('COMBAT'); setSpecialPassiveCode(''); }}
                                                    disabled={activeTab === ClassTier.FIRST || activeTab === ClassTier.NONE}
                                                    className={`flex-1 py-1.5 text-xs font-bold rounded border ${passiveCategory === 'COMBAT' ? 'bg-red-900/50 border-red-500 text-red-300' : 'bg-slate-900 border border-slate-700 text-slate-500'} ${activeTab === ClassTier.FIRST || activeTab === ClassTier.NONE ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                >
                                                    전투 효과 {(activeTab === ClassTier.FIRST || activeTab === ClassTier.NONE) && '🔒'}
                                                </button>
                                                {isFinalTier && specialPassives && specialPassives.length > 0 && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => { setPassiveCategory('SPECIAL'); setSpecialPassiveCode(specialPassives[0].code); setCustomSkillDesc(specialPassives[0].desc); }}
                                                        className={`flex-1 py-1.5 text-xs font-bold rounded border ${passiveCategory === 'SPECIAL' ? 'bg-amber-900/50 border-amber-500 text-amber-300' : 'bg-slate-900 border border-slate-700 text-slate-500'}`}
                                                    >
                                                        신력 특수 개방
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {passiveCategory === 'SPECIAL' ? (
                                            <div className="space-y-2">
                                                {(() => {
                                                    return (
                                                        <>
                                                            <div className="p-2 rounded bg-indigo-950/40 border border-indigo-700/40 text-indigo-300 text-[11px] font-medium">
                                                                신력 특수 패시브는 각 고유 효과별로 1개씩 연구 및 습득할 수 있습니다.
                                                            </div>
                                                            {specialPassives?.map((p, pIdx) => {
                                                                const hasThisSkill = character.skills.some(s => s.effectFormula?.includes(p.code));
                                                                return (
                                                                    <button 
                                                                        key={`${p.code}-${pIdx}`} 
                                                                        type="button"
                                                                        onClick={() => { 
                                                                            if (hasThisSkill) return;
                                                                            setSpecialPassiveCode(p.code); 
                                                                            setCustomSkillDesc(p.desc); 
                                                                            setCustomSkillName(p.name);
                                                                        }}
                                                                        disabled={hasThisSkill}
                                                                        className={`w-full text-left p-2 rounded border text-xs flex flex-col ${specialPassiveCode === p.code ? 'bg-amber-950/50 border-amber-500 text-amber-200' : hasThisSkill ? 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed opacity-50' : 'bg-slate-900 border border-slate-700 text-slate-400 hover:border-amber-500/50'}`}
                                                                    >
                                                                        <span className="font-bold">{p.name} {hasThisSkill ? '보유중' : ''}</span>
                                                                        <span className="text-[9px] opacity-70">{p.desc}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {(() => {
                                                    const totalPassiveVal = passiveEffects.reduce((s, ef) => s + (ef.value || 0), 0);
                                                    const remainingPassiveCap = Math.max(0, passiveCap - totalPassiveVal);
                                                    return (
                                                        <div className="bg-indigo-950/20 p-3 rounded border border-indigo-500/30 space-y-3">
                                                            {/* 슬롯 및 합산 헤더 */}
                                                            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                                                                <div className="flex justify-between items-center text-xs">
                                                                    <span className="font-bold text-indigo-300">패시브 효과 비율 합산</span>
                                                                    <span className="font-mono text-slate-300">
                                                                        <strong className="text-indigo-400">{totalPassiveVal}%</strong> / {passiveCap}% (여유: {remainingPassiveCap}%)
                                                                    </span>
                                                                </div>
                                                                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                                                                    <div 
                                                                        className="h-full bg-gradient-to-r from-indigo-600 to-cyan-400 transition-all duration-300" 
                                                                        style={{ width: `${Math.min(100, (totalPassiveVal / Math.max(1, passiveCap)) * 100)}%` }}
                                                                    />
                                                                </div>
                                                                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                                                                    <span>패시브 슬롯: {passiveEffects.length} / {passiveLimits.maxEffects}</span>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={handleAddPassiveEffect} 
                                                                        disabled={passiveEffects.length >= passiveLimits.maxEffects}
                                                                        className="px-2 py-0.5 bg-indigo-950/80 text-indigo-300 hover:bg-indigo-900 rounded border border-indigo-800 text-[10px] font-bold disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                                                                    >
                                                                        + 슬롯 추가
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* 슬롯 목록 */}
                                                            <div className="space-y-2.5">
                                                                {passiveEffects.map((ef, idx) => {
                                                                    const otherSum = passiveEffects.reduce((s, e, i) => i === idx ? s : s + (e.value || 0), 0);
                                                                    const isAccEva = isAccOrEvaStat(ef.target);
                                                                    const slotCapMult = isAccEva ? 1.5 : 1.0;
                                                                    let maxForSlot = Math.max(1, Math.floor(passiveCap * slotCapMult) - otherSum);
                                                                    const isAllElemRes = ef.target === 'EleRes' && (ef.element === '모든 속성' || ef.element === '모든속성');
                                                                    if (isAllElemRes) {
                                                                        maxForSlot = Math.max(1, Math.floor(maxForSlot / 3));
                                                                    }
                                                                    if (ef.target === 'CritResist' || ef.target === 'CritDmgResist') {
                                                                        maxForSlot = Math.min(10, maxForSlot);
                                                                    }
                                                                    const currentCat = ef.category || passiveCategory;

                                                                    return (
                                                                        <div key={idx} className="bg-slate-900/90 p-2.5 rounded border border-slate-700/80 flex flex-col gap-2">
                                                                            <div className="flex justify-between items-center">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-800">
                                                                                        슬롯 {idx + 1}
                                                                                    </span>
                                                                                    {/* 슬롯 개별 카테고리 선택 */}
                                                                                    <div className="flex gap-1 text-[9px]">
                                                                                        <button 
                                                                                            type="button"
                                                                                            onClick={() => updatePassiveEffect(idx, 'category', 'STAT')}
                                                                                            className={`px-1.5 py-0.5 rounded border font-bold ${currentCat === 'STAT' ? 'bg-indigo-800 text-white border-indigo-400' : 'bg-slate-950 text-slate-500 border-slate-800'}`}
                                                                                        >
                                                                                            스탯
                                                                                        </button>
                                                                                        <button 
                                                                                            type="button"
                                                                                            onClick={() => updatePassiveEffect(idx, 'category', 'COMBAT')}
                                                                                            disabled={activeTab === ClassTier.FIRST || activeTab === ClassTier.NONE}
                                                                                            className={`px-1.5 py-0.5 rounded border font-bold ${currentCat === 'COMBAT' ? 'bg-red-800 text-white border-red-400' : 'bg-slate-950 text-slate-500 border-slate-800'} disabled:opacity-30`}
                                                                                        >
                                                                                            전투
                                                                                        </button>
                                                                                    </div>
                                                                                </div>

                                                                                {passiveEffects.length > 1 && (
                                                                                    <button 
                                                                                        type="button"
                                                                                        onClick={() => removePassiveEffect(idx)} 
                                                                                        className="text-[10px] text-rose-400 hover:text-rose-300 bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-900/50 flex items-center gap-0.5"
                                                                                    >
                                                                                        <Trash2 size={10} /> 삭제
                                                                                    </button>
                                                                                )}
                                                                            </div>

                                                                            {/* 드롭다운 타겟 선택 */}
                                                                            <select 
                                                                                className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-slate-200 outline-none"
                                                                                value={ef.target}
                                                                                onChange={(e) => updatePassiveEffect(idx, 'target', e.target.value)}
                                                                            >
                                                                                {(currentCat === 'STAT' ? PASSIVE_STAT_TARGETS : PASSIVE_COMBAT_TARGETS).map((t, tIdx) => {
                                                                                    const locked = isStatLocked(character, t, activeTab);
                                                                                    const isCritResist = t === 'CritResist';
                                                                                    const isFinal = activeTab === ClassTier.FINAL || activeTab === '파이널 클래스' || activeTab === 'FINAL';
                                                                                    const critResistEligible = isCritResistEligible(character);
                                                                                    const critResistLocked = isCritResist && (!isFinal || !critResistEligible);
                                                                                    const alreadySelected = passiveEffects.some((e, i) => i !== idx && e.target === t);
                                                                                    let suffix = '';
                                                                                    if (locked) {
                                                                                        if (t === 'MaxHP') suffix = ` 🔒 (검/창/광전사 ${getRequiredMinTier(activeTab)}차)`;
                                                                                        else if (t === 'MaxMP') suffix = ` 🔒 (마법사 ${getRequiredMinTier(activeTab)}차)`;
                                                                                        else if (t === 'Acc' || t === 'MAcc') suffix = ` 🔒 (궁수/거너 ${getRequiredMinTier(activeTab)}차)`;
                                                                                        else if (t === 'Eva' || t === 'MEva') suffix = ` 🔒 (도적 ${getRequiredMinTier(activeTab)}차)`;
                                                                                        else if (t === 'ManaShield') suffix = ` 🔒 (마법사/에너자이저 ${getRequiredMinTier(activeTab)}차)`;
                                                                                    } else if (critResistLocked) {
                                                                                        suffix = ' 🔒 (신의 사자, 마신, 마계 제너럴 4차)';
                                                                                    } else if (alreadySelected) {
                                                                                        suffix = ' (선택됨)';
                                                                                    }
                                                                                    return (
                                                                                        <option key={`${t}-${tIdx}`} value={t} disabled={locked || critResistLocked || alreadySelected}>
                                                                                            {(PASSIVE_LABEL_MAP[t] || t) + suffix}
                                                                                        </option>
                                                                                    );
                                                                                })}
                                                                            </select>

                                                                            {/* 속성 세부 선택 (속성 피해/저항 시) */}
                                                                            {currentCat === 'COMBAT' && (ef.target === 'EleAtk' || ef.target === 'EleRes') && (
                                                                                <div className="flex flex-wrap gap-1 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                                                                                    {(isFinalTier && ef.target === 'EleRes' ? [...SHINRYOKU_TYPES_LIST, '모든 속성'] : SHINRYOKU_TYPES_LIST).map((el, elIdx) => (
                                                                                        <button
                                                                                            key={`${el}-${elIdx}`}
                                                                                            type="button"
                                                                                            onClick={() => updatePassiveEffect(idx, 'element', el)}
                                                                                            className={`text-[9px] px-2 py-0.5 rounded border transition-all ${(ef.element || selectedPassiveElement) === el ? 'bg-indigo-600 border-indigo-400 text-white font-bold' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                                                                                        >
                                                                                            {el}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            )}

                                                                            {/* 수치 조절 슬라이더 */}
                                                                            <div className="flex gap-2 items-center bg-slate-950 p-1.5 rounded border border-slate-800">
                                                                                <input 
                                                                                    type="range" 
                                                                                    min="1" 
                                                                                    max={maxForSlot} 
                                                                                    value={Math.min(ef.value || 5, maxForSlot)} 
                                                                                    onChange={(e) => updatePassiveEffect(idx, 'value', parseInt(e.target.value))} 
                                                                                    className="flex-1 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                                                                />
                                                                                <span className="text-xs font-mono text-indigo-300 font-bold w-12 text-right">
                                                                                    +{Math.min(ef.value || 5, maxForSlot)}%
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* 발동 조건 설정 */}
                                                <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[10px] font-bold text-slate-300 flex items-center gap-1.5">
                                                            <input 
                                                                type="checkbox" 
                                                                id="condCheck" 
                                                                checked={passiveHasCondition} 
                                                                onChange={(e) => setPassiveHasCondition(e.target.checked)}
                                                                className="accent-indigo-500 cursor-pointer rounded"
                                                            />
                                                            <span className="cursor-pointer select-none">특정 무기 착용 조건</span>
                                                        </label>
                                                        {passiveHasCondition && <span className="text-emerald-400 text-[9px] font-bold">효과 +20% 보너스 적용</span>}
                                                    </div>
                                                    
                                                    {passiveHasCondition && (
                                                        <select 
                                                            className="w-full bg-slate-950 border border-indigo-900/50 rounded p-1 text-xs text-indigo-300 outline-none"
                                                            value={passiveWeaponCondition}
                                                            onChange={(e) => setPassiveWeaponCondition(e.target.value as WeaponType)}
                                                        >
                                                            {Object.entries(WEAPON_TYPE_KOREAN).map(([key, label], wIdx) => (
                                                                <option key={`${key}-${wIdx}`} value={key}>{label}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-black/40 p-2 rounded border border-slate-800">
                                            <label className="text-[9px] text-slate-400 block mb-0.5 font-bold">적용 공식 미리보기</label>
                                            <span className="text-xs font-mono text-cyan-400 break-words">{getFormulaPreview()}</span>
                                        </div>
                                    </div>
                                ) : customSkillType === SkillType.CLONE ? (
                                      <div className="bg-slate-950/50 p-3 rounded border border-slate-800 space-y-3 animate-in fade-in">
                                          <div>
                                              <label className="block text-[10px] uppercase text-slate-500 mb-1 font-bold">분신 이름</label>
                                              <input 
                                                  type="text" 
                                                  value={summonName} 
                                                  onChange={(e) => setSummonName(e.target.value)} 
                                                  placeholder="예: 그림자 분신, 환영 분신, 무간 분신체" 
                                                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-slate-200 outline-none focus:border-purple-500"
                                              />
                                          </div>

                                          <div className="bg-indigo-950/40 p-3 rounded border border-indigo-500/30 space-y-2 text-indigo-200 animate-in fade-in">
                                              <p className="text-xs font-bold text-indigo-300">👥 그림자 분신 정보</p>
                                              <ul className="text-[11px] list-disc list-inside space-y-1 text-slate-300">
                                                  <li>소환 수량: <strong className="text-indigo-300">최대 {activeTab === ClassTier.SECOND ? 2 : activeTab === ClassTier.LAST ? 3 : 5}마리</strong> 동시 유지</li>
                                                  <li>행동 방식: 전용 턴을 부여받아 <strong className="text-indigo-300">일반 공격만 수행</strong></li>
                                                  <li>소환 유지: <strong className="text-indigo-300">{activeTab === ClassTier.SECOND ? 3 : activeTab === ClassTier.LAST ? 4 : 5}턴</strong> 지속</li>
                                                  <li>체력 상속: <strong className="text-indigo-300">{activeTab === ClassTier.SECOND ? '35%' : activeTab === ClassTier.LAST ? '50%' : '70%'}</strong> 상속</li>
                                                  <li>공격 상속: <strong className="text-indigo-300">{activeTab === ClassTier.SECOND ? '40%' : activeTab === ClassTier.LAST ? '60%' : '85%'}</strong> 상속</li>
                                                  <li>방어 상속: <strong className="text-indigo-300">{activeTab === ClassTier.SECOND ? '30%' : activeTab === ClassTier.LAST ? '45%' : '60%'}</strong> 상속</li>
                                                  <li>민첩 상속: <strong className="text-indigo-300">{activeTab === ClassTier.SECOND ? '50%' : activeTab === ClassTier.LAST ? '70%' : '90%'}</strong> 상속</li>
                                              </ul>
                                              <p className="text-[10px] text-indigo-400 font-medium leading-relaxed bg-indigo-950/60 p-2 rounded border border-indigo-800/40 mt-1">
                                                  * 그림자 분신은 시전자의 현재 외형 이미지를 그대로 복제하여 소환됩니다.
                                              </p>
                                          </div>
                                      </div>
                                 ) : customSkillType === SkillType.SUMMON ? (
                                      <div className="bg-slate-950/50 p-3 rounded border border-slate-800 space-y-3 animate-in fade-in">
                                          <div>
                                              <label className="block text-[10px] uppercase text-slate-500 mb-1 font-bold">소환수 이름</label>
                                              <input 
                                                  type="text" 
                                                  value={summonName} 
                                                  onChange={(e) => setSummonName(e.target.value)} 
                                                  placeholder="예: 불의 정령, 암흑 늑대, 환수 드래곤" 
                                                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-slate-200 outline-none focus:border-purple-500"
                                              />
                                          </div>

                                          <div>
                                              <label className="block text-[10px] uppercase text-slate-500 mb-1 font-bold">
                                                  소환물 수량 (무조건 1마리 고정)
                                              </label>
                                              <div className="flex gap-2">
                                                  <button 
                                                      type="button"
                                                      onClick={() => setSummonCount(1)} 
                                                      className={`flex-1 py-1.5 text-xs font-bold rounded border bg-purple-900/60 border-purple-500 text-purple-200`}
                                                  >
                                                      1마리 소환
                                                  </button>
                                              </div>
                                              <p className="text-[9px] text-purple-400 mt-1">* 밸런스를 위해 소환수는 1마리로 제한됩니다.</p>
                                          </div>

                                          <div>
                                              <label className="block text-[10px] uppercase text-slate-500 mb-1 font-bold">소환수 능력치 수준 (본체 대비)</label>
                                              <div className="flex gap-2">
                                                  <button 
                                                      type="button"
                                                      onClick={() => setSummonPowerLevel('low')} 
                                                      className={`flex-1 py-1.5 text-xs font-bold rounded border ${summonPowerLevel === 'low' ? 'bg-indigo-900/60 border-indigo-500 text-indigo-200' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                                                  >
                                                      세컨드 클래스 (50%)
                                                  </button>
                                                  <button 
                                                       type="button"
                                                       onClick={() => {
                                                           if (activeTab === ClassTier.SECOND) {
                                                               alert("75% 능력치는 라스트 클래스 이상부터 선택 가능합니다.");
                                                               return;
                                                           }
                                                           setSummonPowerLevel('medium');
                                                       }} 
                                                       disabled={activeTab === ClassTier.SECOND}
                                                       className={`flex-1 py-1.5 text-xs font-bold rounded border ${summonPowerLevel === 'medium' ? 'bg-indigo-900/60 border-indigo-500 text-indigo-200' : 'bg-slate-900 border-slate-700 text-slate-500'} disabled:opacity-40 disabled:cursor-not-allowed`}
                                                   >
                                                       라스트 클래스 (75%) {activeTab === ClassTier.SECOND ? '🔒' : ''}
                                                   </button>
                                                  <button 
                                                       type="button"
                                                       onClick={() => {
                                                           if (activeTab === ClassTier.SECOND || activeTab === ClassTier.LAST) {
                                                               alert("100% 능력치는 파이널 클래스에서 선택 가능합니다.");
                                                               return;
                                                           }
                                                           setSummonPowerLevel('high');
                                                       }} 
                                                       disabled={activeTab === ClassTier.SECOND || activeTab === ClassTier.LAST}
                                                       className={`flex-1 py-1.5 text-xs font-bold rounded border ${summonPowerLevel === 'high' ? 'bg-indigo-900/60 border-indigo-500 text-indigo-200' : 'bg-slate-900 border-slate-700 text-slate-500'} disabled:opacity-40 disabled:cursor-not-allowed`}
                                                   >
                                                       파이널 클래스 (100%) {[ClassTier.SECOND, ClassTier.LAST].includes(activeTab as ClassTier) ? '🔒' : ''}
                                                   </button>
                                              </div>
                                              <p className="text-[9px] text-indigo-300 mt-1">* 소환수의 강함에 따라 MP 소모가 증대됩니다.</p>
                                          </div>

                                          <div>
                                              <label className="block text-[10px] uppercase text-slate-500 mb-1 font-bold">소환 유지 기간 ({summonDuration}턴)</label>
                                              <div className="flex gap-2 items-center">
                                                  <input 
                                                      type="range" 
                                                      min="2" 
                                                      max="5" 
                                                      value={summonDuration} 
                                                      onChange={(e) => setSummonDuration(parseInt(e.target.value))} 
                                                      className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                                  />
                                                  <span className="text-xs font-bold text-purple-300 font-mono w-12 text-right">{summonDuration}턴</span>
                                              </div>
                                          </div>

                                          <div>
                                              <label className="block text-[10px] uppercase text-slate-500 mb-1 font-bold">소환수 이미지 선택 (추천 프리셋 또는 직접 입력/업로드)</label>
                                              <div className="flex flex-wrap gap-1.5 mb-2">
                                                  {SUMMON_PRESET_IMAGES.map((preset) => (
                                                      <button
                                                          key={preset.name}
                                                          type="button"
                                                          onClick={() => setSummonImageUrl(preset.url)}
                                                          className={`text-[10px] px-2 py-1 rounded border flex items-center gap-1 transition-all ${
                                                              summonImageUrl === preset.url 
                                                                  ? 'bg-purple-900/80 border-purple-400 text-purple-200 font-bold' 
                                                                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                                                          }`}
                                                      >
                                                          <img src={preset.url} alt={preset.name} className="w-4 h-4 rounded object-cover" />
                                                          <span>{preset.name}</span>
                                                      </button>
                                                  ))}
                                              </div>
                                              <div className="flex flex-col sm:flex-row gap-2 items-center">
                                                  <input 
                                                      type="text" 
                                                      value={summonImageUrl} 
                                                      onChange={(e) => setSummonImageUrl(e.target.value)} 
                                                      placeholder="https://... 이미지 링크 입력" 
                                                      className="flex-1 bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-slate-200 outline-none focus:border-purple-500 w-full"
                                                  />
                                                  <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 px-3 py-1.5 rounded text-xs whitespace-nowrap flex items-center gap-1 shrink-0">
                                                      <Upload size={12} /> 파일 업로드
                                                      <input 
                                                          type="file" 
                                                          accept="image/*" 
                                                          className="hidden" 
                                                          onChange={(e) => {
                                                              const file = e.target.files?.[0];
                                                              if (file) {
                                                                  const reader = new FileReader();
                                                                  reader.onloadend = () => {
                                                                      setSummonImageUrl(reader.result as string);
                                                                  };
                                                                  reader.readAsDataURL(file);
                                                              }
                                                          }}
                                                      />
                                                  </label>
                                              </div>
                                              <div className="mt-2 flex items-center gap-3 bg-slate-900/80 p-2 rounded border border-purple-900/50">
                                                  <img 
                                                      src={summonImageUrl || getDefaultSummonImageUrl(summonName, customSkillElement)} 
                                                      alt="소환수 미리보기" 
                                                      className="w-10 h-10 object-cover rounded border border-purple-500/50" 
                                                  />
                                                  <span className="text-xs text-purple-200 font-bold">
                                                      {summonImageUrl ? '선택한 소환수 이미지' : '자동 프리셋 이미지 적용됨'}
                                                  </span>
                                                  {summonImageUrl && (
                                                      <button type="button" onClick={() => setSummonImageUrl('')} className="ml-auto text-slate-500 hover:text-rose-400 text-xs">선택 해제</button>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                 ) : customSkillType === SkillType.DEBUFF ? (
                                    <div className="bg-slate-950/50 p-3 rounded border border-slate-800 space-y-3">
                                        {(() => {
                                            const totalDebuffVal = debuffEffects.reduce((s, ef) => s + ((ef.type === 'STAT' || !ef.type) ? (ef.value || 0) : 0), 0);
                                            const remainingDebuffCap = Math.max(0, debuffStatCap - totalDebuffVal);
                                            return (
                                                <div className="bg-red-900/10 p-3 rounded border border-red-500/20 space-y-3">
                                                    {/* 헤더 및 슬롯 진행도 바 */}
                                                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                                                        <div className="flex justify-between items-center text-xs">
                                                             <span className="font-bold text-red-400">능력치 감소율 합산</span>
                                                             <span className="font-mono text-slate-300">
                                                                 <strong className="text-red-400">{totalDebuffVal}%</strong> / {debuffStatCap}% (슬롯당 최대: {debuffBaseCap}%, 여유: {remainingDebuffCap}%)
                                                             </span>
                                                        </div>
                                                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                                                             <div 
                                                                 className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-300" 
                                                                 style={{ width: `${Math.min(100, (totalDebuffVal / Math.max(1, debuffStatCap)) * 100)}%` }}
                                                             />
                                                        </div>
                                                        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                                                             <div className="flex items-center gap-1.5">
                                                                 <span>디버프 슬롯: {debuffEffects.length} / {debuffLimits.maxEffects}</span>
                                                                 {debuffEffects.length >= 2 && <span className="text-amber-400 font-bold">* 다중 슬롯 1.5배 합산</span>}
                                                             </div>
                                                             <button 
                                                                 type="button"
                                                                 onClick={handleAddDebuffEffect} 
                                                                 disabled={debuffEffects.length >= debuffLimits.maxEffects}
                                                                 className="px-2 py-0.5 bg-red-950/80 text-red-300 hover:bg-red-900 rounded border border-red-800 text-[10px] font-bold disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                                                             >
                                                                 + 슬롯 추가
                                                             </button>
                                                        </div>
                                                    </div>

                                                    {/* 슬롯 목록 */}
                                                    <div className="space-y-2.5">
                                                         {debuffEffects.map((ef, idx) => {
                                                             const efType = ef.type || 'STAT';
                                                             const otherSum = debuffEffects.reduce((s, e, i) => (i === idx || (e.type && e.type !== 'STAT')) ? s : s + (e.value || 0), 0);
                                                             const isAccEva = isAccOrEvaStat(ef.stat || '');
                                                             const slotMax = getDebuffSlotMaxAllowed(activeTab, customTargetType, debuffEffects.length, otherSum, isAccEva, false, isFinalActiveTab ? finalBonusSteps : 0);
                                                             return (
                                                                 <div key={idx} className="bg-slate-900/90 p-2.5 rounded border border-slate-700/80 flex flex-col gap-2">
                                                                     <div className="flex justify-between items-center">
                                                                         <div className="flex items-center gap-2">
                                                                             <span className="text-[10px] text-slate-400 font-bold">슬롯 {idx + 1}</span>
                                                                             <div className="flex bg-slate-950 rounded border border-slate-800 p-0.5">
                                                                                 <button 
                                                                                     type="button" 
                                                                                     onClick={() => updateDebuffEffect(idx, 'type', 'STAT')}
                                                                                     className={`px-2 py-0.5 text-[10px] rounded transition-colors ${efType === 'STAT' ? 'bg-red-900 text-red-200 font-bold' : 'text-slate-500 hover:text-slate-300'}`}
                                                                                 >
                                                                                     능력치 감소
                                                                                 </button>
                                                                                 <button 
                                                                                     type="button" 
                                                                                     onClick={() => updateDebuffEffect(idx, 'type', 'AILMENT')}
                                                                                     className={`px-2 py-0.5 text-[10px] rounded transition-colors ${efType === 'AILMENT' ? 'bg-purple-900 text-purple-200 font-bold' : 'text-slate-500 hover:text-slate-300'}`}
                                                                                 >
                                                                                     상태이상
                                                                                 </button>
                                                                             </div>
                                                                         </div>
                                                                         {debuffEffects.length > 1 && (
                                                                             <button 
                                                                                 type="button"
                                                                                 onClick={() => removeDebuffEffect(idx)} 
                                                                                 className="text-red-400 hover:text-red-200 p-1"
                                                                                 title="슬롯 삭제"
                                                                             >
                                                                                 <Trash2 size={13}/>
                                                                             </button>
                                                                         )}
                                                                     </div>

                                                                     {efType === 'STAT' ? (
                                                                         <div className="flex flex-col gap-2">
                                                                             <div className="flex items-center gap-2">
                                                                                 <select 
                                                                                     className="bg-slate-950 border border-slate-800 text-xs rounded p-1 text-slate-200 outline-none flex-1"
                                                                                     value={ef.stat || 'P.Atk'}
                                                                                     onChange={(e) => updateDebuffEffect(idx, 'stat', e.target.value)}
                                                                                 >
                                                                                     {DEBUFF_STATS.map(s => {
                                                                                         const alreadyUsed = debuffEffects.some((o, oIdx) => oIdx !== idx && (o.type || 'STAT') === 'STAT' && o.stat === s);
                                                                                         return (
                                                                                             <option key={s} value={s} disabled={alreadyUsed}>
                                                                                                 {s}{alreadyUsed ? ' (선택됨)' : ''}
                                                                                             </option>
                                                                                         );
                                                                                     })}
                                                                                 </select>
                                                                                 {isAccEva && <span className="text-[8px] bg-red-950 text-red-300 px-1 py-0.5 rounded border border-red-800">1.5x</span>}
                                                                             </div>
                                                                             <div className="flex gap-2 items-center">
                                                                                 <input 
                                                                                     type="range" 
                                                                                     min="1" 
                                                                                     max={Math.max(1, slotMax)} 
                                                                                     value={Math.min(ef.value || 1, Math.max(1, slotMax))} 
                                                                                     onChange={(e) => updateDebuffEffect(idx, 'value', parseInt(e.target.value))} 
                                                                                     className="flex-1 accent-red-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer" 
                                                                                 />
                                                                                 <span className="text-xs text-red-300 font-mono w-12 text-right font-bold">-{Math.min(ef.value || 1, Math.max(1, slotMax))}%</span>
                                                                             </div>
                                                                         </div>
                                                                     ) : (
                                                                         <div className="flex items-center gap-2">
                                                                             <select 
                                                                                 className="bg-slate-950 border border-slate-800 text-xs rounded p-1 text-purple-200 outline-none flex-1"
                                                                                 value={ef.ailment || STATUS_AILMENTS_LIST[0]}
                                                                                 onChange={(e) => updateDebuffEffect(idx, 'ailment', e.target.value)}
                                                                             >
                                                                                 {(allowedAilments.length > 0 ? allowedAilments : STATUS_AILMENTS_LIST).map((ailment) => {
                                                                                     const restricted = ['소멸', '월침', '흡정'].includes(ailment);
                                                                                     const allowRestricted = [ClassTier.LAST, ClassTier.FINAL].includes(activeTab as ClassTier);
                                                                                     const alreadyUsed = debuffEffects.some((o, oIdx) => oIdx !== idx && o.type === 'AILMENT' && o.ailment === ailment);
                                                                                     if (restricted && !allowRestricted) return null;
                                                                                     return (
                                                                                         <option key={ailment} value={ailment} disabled={alreadyUsed}>
                                                                                             {ailment}{alreadyUsed ? ' (선택됨)' : ''}
                                                                                         </option>
                                                                                     );
                                                                                 })}
                                                                             </select>
                                                                         </div>
                                                                     )}
                                                                 </div>
                                                             );
                                                         })}
                                                    </div>
                                                    <p className="text-[10px] text-red-400/90">* 슬롯 수({debuffEffects.length}개)에 비례하여 스킬 소모 MP가 {debuffEffects.length}배 증가합니다.</p>
                                                </div>
                                            );
                                        })()}

                                        <div className="bg-black/40 p-2.5 rounded border border-slate-800">
                                            <label className="text-[10px] text-slate-400 block mb-0.5 font-bold">효과 공식 미리보기</label>
                                            <span className="text-xs font-mono text-amber-400 break-all">{getFormulaPreview()}</span>
                                        </div>
                                    </div>
                                ) : customSkillType === SkillType.BUFF ? (
                                    <div className="bg-slate-950/50 p-3 rounded border border-slate-800 space-y-3">
                                        <div>
                                            <label className="block text-[10px] uppercase text-slate-500 mb-1 font-bold">버프 대상</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button type="button" onClick={() => setBuffTargetType('single')} className={`text-xs p-2 rounded border flex flex-col items-center transition-colors ${buffTargetType === 'single' ? 'bg-green-900/40 border-green-500 text-green-200 font-bold' : 'bg-slate-950 border-slate-700 text-slate-500'}`}><UserCheck size={14} className="mb-1"/>아군 단일</button>
                                                <button type="button" onClick={() => setBuffTargetType('aoe')} className={`text-xs p-2 rounded border flex flex-col items-center transition-colors ${buffTargetType === 'aoe' ? 'bg-green-900/40 border-green-500 text-green-200 font-bold' : 'bg-slate-950 border-slate-700 text-slate-500'}`}><Crosshair size={14} className="mb-1"/>아군 전체</button>
                                            </div>
                                            <p className="text-[10px] text-blue-400 mt-1">* {buffTargetType === 'single' ? '단일 대상: 수치 효율 높음' : '전체 대상: 수치 효율 낮음, MP 소모 3배'}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <select className="flex-1 bg-slate-900 border border-slate-700 rounded p-1 text-xs text-slate-300 outline-none" value={selectedBuffType} onChange={(e) => setSelectedBuffType(e.target.value)}>
                                                <option value="STAT_BOOST">스탯 증가 (%)</option>
                                                 <option value="ELEMENTAL_DMG_BOOST">속성 피해 증가 (%)</option>
                                                 <option value="ELEMENTAL_RES_BOOST">속성 저항 증가 (%)</option>
                                                <option 
                                                    value="HP_RECOV"
                                                    disabled={
                                                        (activeTab === ClassTier.SECOND && !hasCombatStyle(character, CombatStyle.CLERIC)) ||
                                                        (activeTab === ClassTier.LAST && !hasCombatStyle(character, CombatStyle.PRIEST)) ||
                                                        (activeTab === ClassTier.FINAL && !hasCombatStyle(character, CombatStyle.SAINT))
                                                    }
                                                >
                                                    HP 회복 (WIS·INT 합산 * 4 비례) {
                                                        activeTab === ClassTier.SECOND && !hasCombatStyle(character, CombatStyle.CLERIC) ? '🔒 (클레릭 필요)' :
                                                        activeTab === ClassTier.LAST && !hasCombatStyle(character, CombatStyle.PRIEST) ? '🔒 (프리스트 필요)' :
                                                        activeTab === ClassTier.FINAL && !hasCombatStyle(character, CombatStyle.SAINT) ? '🔒 (세인트 필요)' : ''
                                                    }
                                                </option>
                                                <option 
                                                    value="MP_RECOV"
                                                    disabled={
                                                        (activeTab === ClassTier.SECOND && !hasCombatStyle(character, CombatStyle.CLERIC)) ||
                                                        (activeTab === ClassTier.LAST && !hasCombatStyle(character, CombatStyle.PRIEST)) ||
                                                        (activeTab === ClassTier.FINAL && !hasCombatStyle(character, CombatStyle.SAINT))
                                                    }
                                                >
                                                    MP 회복 (WIS·INT 합산 비례) {
                                                        activeTab === ClassTier.SECOND && !hasCombatStyle(character, CombatStyle.CLERIC) ? '🔒 (클레릭 필요)' :
                                                        activeTab === ClassTier.LAST && !hasCombatStyle(character, CombatStyle.PRIEST) ? '🔒 (프리스트 필요)' :
                                                        activeTab === ClassTier.FINAL && !hasCombatStyle(character, CombatStyle.SAINT) ? '🔒 (세인트 필요)' : ''
                                                    }
                                                </option>
                                                <option 
                                                    value="CLEANSE"
                                                    disabled={
                                                        (activeTab === ClassTier.SECOND && !hasCombatStyle(character, CombatStyle.CLERIC)) ||
                                                        (activeTab === ClassTier.LAST && !hasCombatStyle(character, CombatStyle.PRIEST)) ||
                                                        (activeTab === ClassTier.FINAL && !hasCombatStyle(character, CombatStyle.SAINT))
                                                    }
                                                >
                                                    상태이상 해제 {
                                                        activeTab === ClassTier.SECOND && !hasCombatStyle(character, CombatStyle.CLERIC) ? '🔒 (클레릭 필요)' :
                                                        activeTab === ClassTier.LAST && !hasCombatStyle(character, CombatStyle.PRIEST) ? '🔒 (프리스트 필요)' :
                                                        activeTab === ClassTier.FINAL && !hasCombatStyle(character, CombatStyle.SAINT) ? '🔒 (세인트 필요)' : ''
                                                    }
                                                </option>
                                                {isSpecialTier && (
                                                    <>
                                                        <option 
                                                            value="MANA_SHIELD"
                                                            disabled={getRequiredMinTier(activeTab) > 1 && !hasCombatStyleOfRootAndTier(character, MANA_SHIELD_ROOTS, getRequiredMinTier(activeTab))}
                                                        >
                                                            마나 쉴드 {
                                                                getRequiredMinTier(activeTab) > 1 && !hasCombatStyleOfRootAndTier(character, MANA_SHIELD_ROOTS, getRequiredMinTier(activeTab)) ? `🔒 (${activeTab === ClassTier.LAST ? '마법사/에너자이저 3차' : '마법사/에너자이저 4차'} 필요)` : ''
                                                            }
                                                        </option>
                                                        <option 
                                                            value="RESURRECTION"
                                                            disabled={
                                                                (activeTab === ClassTier.LAST && !hasCombatStyle(character, CombatStyle.PRIEST)) ||
                                                                (activeTab === ClassTier.FINAL && !hasCombatStyle(character, CombatStyle.SAINT))
                                                            }
                                                        >
                                                            부활 (2슬롯) {
                                                                activeTab === ClassTier.LAST && !hasCombatStyle(character, CombatStyle.PRIEST) ? '🔒 (프리스트 필요)' :
                                                                activeTab === ClassTier.FINAL && !hasCombatStyle(character, CombatStyle.SAINT) ? '🔒 (세인트 필요)' : ''
                                                            }
                                                        </option>
                                                    </>
                                                )}
                                            </select>
                                            <button 
                                                onClick={handleAddBuffEffect} 
                                                disabled={buffEffects.reduce((sum, ef) => sum + (ef.type === 'RESURRECTION' ? 2 : 1), 0) >= buffLimits.maxEffects} 
                                                className="px-3 bg-indigo-900/50 text-indigo-300 rounded border border-indigo-700/50 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                +
                                            </button>
                                        </div>

                                        {/* 버프 비율 합산 진행도 바 */}
                                        <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                                             <div className="flex justify-between items-center text-xs">
                                                 <span className="font-bold text-green-400">버프 비율 합산</span>
                                                 <span className="font-mono text-slate-300">
                                                     <strong className="text-emerald-400">{buffEffects.reduce((s, ef) => s + (ef.value || 0), 0)}%</strong> / {buffValueCap}% (슬롯당 최대: {buffBaseCap}%, 여유: {Math.max(0, buffValueCap - buffEffects.reduce((s, ef) => s + (ef.value || 0), 0))}%)
                                                 </span>
                                             </div>
                                             <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                                                 <div 
                                                     className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-300" 
                                                     style={{ width: `${Math.min(100, (buffEffects.reduce((s, ef) => s + (ef.value || 0), 0) / Math.max(1, buffValueCap)) * 100)}%` }}
                                                 />
                                             </div>
                                             <div className="flex justify-between text-[10px] text-slate-400">
                                                 <span>사용 슬롯: {buffEffects.reduce((sum, ef) => sum + (ef.type === 'RESURRECTION' ? 2 : 1), 0)} / {buffLimits.maxEffects}</span>
                                                 {buffEffects.length >= 2 ? (
                                                     <span className="text-amber-400 font-bold">* 다중 슬롯 1.5배 합산 적용</span>
                                                 ) : (
                                                     <span className="text-amber-400/90">* 슬롯 수 비례 MP 소모 적용</span>
                                                 )}
                                             </div>
                                         </div>

                                         <div className="space-y-3">
                                             {buffEffects.map((ef, idx) => (
                                                 <div key={idx} className="bg-slate-900 p-2 rounded border border-slate-700 flex flex-col gap-2">
                                                     <div className="flex justify-between items-center">
                                                         <div className="flex items-center gap-2">
                                                             <span className="text-[10px] text-amber-500 font-bold">{ef.type.replace('_', ' ')}</span>
                                                             {ef.type === 'RESURRECTION' && <span className="text-[8px] bg-red-900 text-white px-1.5 py-0.5 rounded font-bold">2슬롯 사용</span>}
                                                         </div>
                                                        <button type="button" onClick={() => removeBuffEffect(idx)} className="text-red-500 hover:text-red-300"><Trash2 size={12}/></button>
                                                    </div>
                                                    {ef.type === 'STAT_BOOST' && (() => {
                                                        const isStatAccEva = isAccOrEvaStat(ef.targetStat);
                                                        const otherSum = buffEffects.reduce((s, e, i) => i === idx || e.type === 'CLEANSE' ? s : s + (e.value || 0), 0);
                                                        const slotCap = getBuffSlotMaxAllowed(activeTab, buffTargetType, buffEffects.length, otherSum, isStatAccEva, false, false, isFinalActiveTab ? finalBonusSteps : 0);
                                                        return (
                                                            <div className="flex gap-2 items-center">
                                                                <select 
                                                                    className="bg-slate-950 border border-slate-800 text-[10px] rounded p-1 text-slate-300 w-28" 
                                                                    value={ef.targetStat} 
                                                                    onChange={(e) => {
                                                                        const newStat = e.target.value;
                                                                        const newAccEva = isAccOrEvaStat(newStat);
                                                                        updateBuffEffect(idx, 'targetStat', newStat);
                                                                        const curOther = buffEffects.reduce((s, el, i) => i === idx || el.type === 'CLEANSE' ? s : s + (el.value || 0), 0);
                                                                        const newSlotCap = getBuffSlotMaxAllowed(activeTab, buffTargetType, buffEffects.length, curOther, newAccEva, false, false, isFinalActiveTab ? finalBonusSteps : 0);
                                                                        if ((ef.value || 0) > newSlotCap) updateBuffEffect(idx, 'value', newSlotCap);
                                                                    }}
                                                                >
                                                                    {BUFF_STATS.map((s, bIdx) => {
                                                                        const locked = isStatLocked(character, s, activeTab);
                                                                        let suffix = '';
                                                                        if (locked) {
                                                                            if (s === 'MaxHP') suffix = ` 🔒 (검/창/광전사 ${getRequiredMinTier(activeTab)}차)`;
                                                                            else if (s === 'MaxMP') suffix = ` 🔒 (마법사 ${getRequiredMinTier(activeTab)}차)`;
                                                                            else if (s === 'Acc' || s === 'MAcc') suffix = ` 🔒 (궁수/거너 ${getRequiredMinTier(activeTab)}차)`;
                                                                            else if (s === 'Eva' || s === 'MEva') suffix = ` 🔒 (도적 ${getRequiredMinTier(activeTab)}차)`;
                                                                        }
                                                                        return (
                                                                            <option key={`${s}-${bIdx}`} value={s} disabled={locked}>
                                                                                {(STAT_DISPLAY_NAMES[s] || s) + suffix}
                                                                            </option>
                                                                        );
                                                                    })}
                                                                </select>
                                                                <input 
                                                                    type="range" 
                                                                    min="1" 
                                                                    max={Math.max(1, slotCap)} 
                                                                    value={Math.min(ef.value || 5, Math.max(1, slotCap))} 
                                                                    onChange={(e) => updateBuffEffect(idx, 'value', parseInt(e.target.value))} 
                                                                    className="flex-1 accent-green-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                                                />
                                                                <span className="text-xs text-green-300 font-mono w-10 text-right">{Math.min(ef.value || 5, Math.max(1, slotCap))}%</span>
                                                                {isStatAccEva && <span className="text-[8px] text-amber-400 bg-amber-950/80 px-1 py-0.5 rounded border border-amber-800/40">1.5x</span>}
                                                            </div>
                                                        );
                                                    })()}
                                                    {(ef.type === 'ELEMENTAL_DMG_BOOST' || ef.type === 'ELEMENTAL_RES_BOOST') && (() => {
                                                         const isFinalClass = activeTab === ClassTier.FINAL;
                                                         const isAllElem = ef.targetElement === '모든 속성' || ef.targetElement === '모든속성';
                                                         const otherSum = buffEffects.reduce((s, e, i) => i === idx || e.type === 'CLEANSE' ? s : s + (e.value || 0), 0);
                                                         const slotCap = getBuffSlotMaxAllowed(activeTab, buffTargetType, buffEffects.length, otherSum, false, false, isAllElem, isFinalActiveTab ? finalBonusSteps : 0);
                                                         return (
                                                             <div className="flex gap-2 items-center">
                                                                 <select 
                                                                     className="bg-slate-950 border border-slate-800 text-[10px] rounded p-1 text-slate-300 w-36 outline-none" 
                                                                     value={ef.targetElement || SHINRYOKU_TYPES_LIST[0]} 
                                                                     onChange={(e) => {
                                                                         const val = e.target.value;
                                                                         if (val === '모든 속성' && !isFinalClass) {
                                                                             alert("모든 속성 피해/저항 버프는 파이널 클래스(4차 전직)부터 연구할 수 있습니다.");
                                                                             return;
                                                                         }
                                                                         updateBuffEffect(idx, 'targetElement', val);
                                                                     }}
                                                                 >
                                                                     <option value="모든 속성" disabled={!isFinalClass}>
                                                                         모든 속성 {!isFinalClass ? '🔒 (파이널 클래스 필요)' : ''}
                                                                     </option>
                                                                     {SHINRYOKU_TYPES_LIST.map((t) => (
                                                                         <option key={t} value={t}>
                                                                             {t}
                                                                         </option>
                                                                     ))}
                                                                 </select>
                                                                 <input 
                                                                     type="range" 
                                                                     min="1" 
                                                                     max={Math.max(1, slotCap)} 
                                                                     value={Math.min(ef.value || 10, Math.max(1, slotCap))} 
                                                                     onChange={(e) => updateBuffEffect(idx, 'value', parseInt(e.target.value))} 
                                                                     className="flex-1 accent-green-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                                                 />
                                                                 <span className="text-xs text-green-300 font-mono w-10 text-right">+{Math.min(ef.value || 10, Math.max(1, slotCap))}%</span>
                                                             </div>
                                                         );
                                                     })()}
                                                     {(ef.type === 'HP_RECOV' || ef.type === 'MP_RECOV') && (() => {
                                                        const otherSum = buffEffects.reduce((s, e, i) => i === idx || e.type === 'CLEANSE' ? s : s + (e.value || 0), 0);
                                                        const slotCap = getBuffSlotMaxAllowed(activeTab, buffTargetType, buffEffects.length, otherSum, false);
                                                        return (
                                                            <div className="flex flex-col gap-1 w-full bg-slate-900/60 p-2 rounded border border-blue-900/40">
                                                                <div className="flex gap-2 items-center">
                                                                    <input 
                                                                        type="range" 
                                                                        min="1" 
                                                                        max={Math.max(1, slotCap)} 
                                                                        value={Math.min(ef.value, Math.max(1, slotCap))} 
                                                                        onChange={(e) => updateBuffEffect(idx, 'value', parseInt(e.target.value))} 
                                                                        className="flex-1 accent-blue-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                                                    />
                                                                    <span className="text-xs text-blue-300 font-mono w-10 text-right font-bold">{Math.min(ef.value, Math.max(1, slotCap))}%</span>
                                                                </div>
                                                                <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                                    <span className="text-cyan-300 font-semibold">
                                                                        예상 회복량: <strong className="text-emerald-400 font-bold font-mono">+{Math.max(ef.type === 'HP_RECOV' ? 10 : 5, Math.floor((ef.type === 'HP_RECOV' ? sumWisInt * 4 : sumWisInt) * Math.min(ef.value || 0, Math.max(1, slotCap)) / 100))}</strong> {ef.type === 'HP_RECOV' ? 'HP' : 'MP'}
                                                                    </span>
                                                                    <span className="text-slate-500 font-mono">
                                                                        (시전자 WIS·INT 합산: {sumWisInt}{ef.type === 'HP_RECOV' ? ' [기준x4]' : ''})
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                    {ef.type === 'MANA_SHIELD' && (() => {
                                                        const otherSum = buffEffects.reduce((s, e, i) => i === idx || e.type === 'CLEANSE' ? s : s + (e.value || 0), 0);
                                                        const slotCap = getBuffSlotMaxAllowed(activeTab, buffTargetType, buffEffects.length, otherSum, false);
                                                        return (
                                                            <div className="p-3 bg-cyan-955/20 border border-cyan-500/50 rounded flex flex-col gap-2">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <Shield size={14} className="text-cyan-400" />
                                                                        <span className="text-xs font-bold text-cyan-200">마나 쉴드: {ef.value}% 보호막</span>
                                                                    </div>
                                                                    <div className="text-[9px] text-slate-500 italic">1슬롯 차지</div>
                                                                </div>
                                                                <div className="flex gap-2 items-center">
                                                                    <input 
                                                                        type="range" 
                                                                        min="1" 
                                                                        max={Math.max(1, slotCap)} 
                                                                        value={Math.min(ef.value, Math.max(1, slotCap))} 
                                                                        onChange={(e) => updateBuffEffect(idx, 'value', parseInt(e.target.value))} 
                                                                        className="flex-1 accent-cyan-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                                                    />
                                                                    <span className="text-xs text-cyan-300 font-mono w-8">{Math.min(ef.value, Math.max(1, slotCap))}%</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                    {ef.type === 'RESURRECTION' && (() => {
                                                        const resCap = getResurrectionCap(activeTab, buffTargetType === 'aoe');
                                                        const otherSum = buffEffects.reduce((s, e, i) => i === idx || e.type === 'CLEANSE' ? s : s + (e.value || 0), 0);
                                                        const slotCap = Math.max(1, Math.min(resCap, getBuffSlotMaxAllowed(activeTab, buffTargetType, buffEffects.length, otherSum, false)));
                                                        return (
                                                            <div className="p-3 bg-amber-955/20 border border-amber-500/50 rounded flex flex-col gap-2">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <Star size={14} className="text-amber-400 animate-pulse" />
                                                                        <span className="text-xs font-bold text-amber-200">
                                                                            기적의 권능: {ef.value}% 부활 회복 (최대 {resCap}%)
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-[9px] text-amber-400/90 font-semibold">사망한 아군 전용 (2슬롯 차지)</div>
                                                                </div>
                                                                <div className="flex gap-2 items-center">
                                                                    <input 
                                                                        type="range" 
                                                                        min="1" 
                                                                        max={slotCap} 
                                                                        value={Math.min(ef.value, slotCap)} 
                                                                        onChange={(e) => updateBuffEffect(idx, 'value', parseInt(e.target.value))} 
                                                                        className="flex-1 accent-amber-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                                                                    />
                                                                    <span className="text-[10px] font-mono text-amber-300 w-20 text-right">
                                                                        {ef.value}% / {resCap}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                    {ef.type === 'CLEANSE' && ( <div className="grid grid-cols-4 gap-1">{STATUS_AILMENTS_LIST.map((ailment, cIdx) => (<button key={`${ailment}-${cIdx}`} onClick={() => toggleBuffAilment(idx, ailment)} disabled={!ef.ailments?.includes(ailment) && (ef.ailments?.length || 0) >= cleanseLimit} className={`text-[8px] px-1 py-0.5 rounded border ${ef.ailments?.includes(ailment) ? 'bg-indigo-900 border-indigo-500 text-white' : 'bg-slate-900 border border-slate-800 text-slate-500'} disabled:opacity-30`}>{ailment}</button>))}</div> )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-slate-950/50 p-3 rounded border border-slate-800 space-y-4">
                                        <div><label className="block text-[10px] uppercase text-slate-500 mb-1 font-bold">위력 계수: {customPowerRatio}% <span className="text-amber-500 ml-2 text-[9px]">(등급 상한: {adjustedMaxRatio}%)</span></label><input type="range" min="10" max={adjustedMaxRatio} step="5" value={customPowerRatio} onChange={(e) => setCustomPowerRatio(parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"/></div>
                                        <div className="bg-black/40 p-2 rounded border border-slate-800"><label className="text-[9px] text-slate-500 block mb-0.5">적용 공식 미리보기</label><span className="text-xs font-mono text-amber-500">{getFormulaPreview()}</span></div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 mb-1 font-bold">스킬 설명</label>
                                    <textarea 
                                        value={customSkillDesc}
                                        onChange={(e) => setCustomSkillDesc(e.target.value)}
                                        placeholder="스킬에 대한 설명을 입력하세요 (예: 검에 불꽃을 둘러 강력하게 베어낸다.)"
                                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:border-amber-500 outline-none resize-none h-16"
                                    />
                                </div>

                                <div className="mt-4 pt-4 pb-10 border-t border-slate-700 flex justify-between items-center">
                                    <div className="text-xs font-mono text-blue-400 font-bold bg-blue-950/30 px-2 py-1 rounded border border-blue-900/50">
                                        예상 소모 마나: {customMpCost} <span className="text-[8px] text-slate-500">(자동 계산)</span>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            let finalPower = customPowerRatio;
                                            if (customSkillType === SkillType.BUFF) {
                                                const hasRestricted = buffEffects.some(ef => ['HP_RECOV', 'MP_RECOV', 'CLEANSE', 'RESURRECTION'].includes(ef.type));
                                                if (hasRestricted) {
                                                    if (activeTab === ClassTier.SECOND && !hasCombatStyle(character, CombatStyle.CLERIC)) {
                                                        alert("세컨드 클래스에서 회복/치유/부활 계열 버프 스킬을 배우려면 '클레릭' 전투계열 습득이 필요합니다.");
                                                        return;
                                                    }
                                                    if (activeTab === ClassTier.LAST && !hasCombatStyle(character, CombatStyle.PRIEST)) {
                                                        alert("라스트 클래스에서 회복/치유/부활 계열 버프 스킬을 배우려면 '프리스트' 전투계열 습득이 필요합니다.");
                                                        return;
                                                    }
                                                    if (activeTab === ClassTier.FINAL && !hasCombatStyle(character, CombatStyle.SAINT)) {
                                                        alert("파이널 클래스에서 회복/치유/부활 계열 버프 스킬을 배우려면 '세인트' 전투계열 습득이 필요합니다.");
                                                        return;
                                                    }
                                                }

                                                const hasManaShield = buffEffects.some(ef => ef.type === 'MANA_SHIELD');
                                                const minTier = getRequiredMinTier(activeTab);
                                                if (hasManaShield && minTier > 1 && !hasCombatStyleOfRootAndTier(character, MANA_SHIELD_ROOTS, minTier)) {
                                                    const tierName = activeTab === ClassTier.SECOND ? "세컨드" : activeTab === ClassTier.LAST ? "라스트" : "파이널";
                                                    alert(`${tierName} 클래스에서 마나 쉴드 버프 스킬을 배우려면 '마법사' 또는 '에너자이저' 계열의 ${minTier}차 이상 전투계열 습득이 필요합니다.`);
                                                    return;
                                                }

                                                for (const ef of buffEffects) {
                                                    if (ef.type === 'STAT_BOOST' && isStatLocked(character, ef.targetStat || '', activeTab)) {
                                                        const statName = STAT_DISPLAY_NAMES[ef.targetStat || ''] || ef.targetStat;
                                                        alert(`${activeTab} 클래스에서 ${statName} 버프 스킬을 배우려면 해당 계열의 상위 전투계열 습득이 필요합니다.`);
                                                        return;
                                                    }
                                                    if ((ef.type === 'ELEMENTAL_DMG_BOOST' || ef.type === 'ELEMENTAL_RES_BOOST') && ef.targetElement === '모든 속성' && activeTab !== ClassTier.FINAL) {
                                                        alert("모든 속성 피해/저항 버프 스킬은 파이널 클래스(4차 전직)부터 연구할 수 있습니다.");
                                                        return;
                                                    }
                                                }

                                                finalPower = buffEffects.length > 0 
                                                    ? buffEffects.reduce((s, ef) => s + (ef.type === 'CLEANSE' ? 0 : (ef.value || 0)), 0)
                                                    : 0;
                                            } else if (customSkillType === SkillType.DEBUFF) {
                                                finalPower = debuffStatValue;
                                            } else if (customSkillType === SkillType.PASSIVE) {
                                                if (isPassiveLimitReached) {
                                                    alert(`${currentTierConfig.label}에서는 패시브 스킬을 최대 ${maxPassivesForTier}개까지만 배울 수 있습니다. (현재: ${currentTierPassiveCount}/${maxPassivesForTier}개)`);
                                                    return;
                                                }
                                                if (passiveCategory !== 'SPECIAL') {
                                                    for (const ef of passiveEffects) {
                                                        if (isStatLocked(character, ef.target, activeTab)) {
                                                            const targetLabel = PASSIVE_LABEL_MAP[ef.target] || ef.target;
                                                            alert(`${activeTab} 클래스에서 ${targetLabel} 패시브 스킬을 배우려면 해당 계열의 ${getRequiredMinTier(activeTab)}차 이상 전투계열 습득이 필요합니다.`);
                                                            return;
                                                        }
                                                        if (ef.target === 'CritResist') {
                                                            const isFinal = activeTab === ClassTier.FINAL || activeTab === '파이널 클래스' || activeTab === 'FINAL';
                                                            if (!isFinal) {
                                                                alert("치명타 저항 패시브는 파이널 클래스 이상부터 습득할 수 있습니다.");
                                                                return;
                                                            }
                                                            if (!isCritResistEligible(character)) {
                                                                alert("치명타 저항 패시브는 신의 사자, 마신, 마계 제너럴 직업만 습득할 수 있습니다.");
                                                                return;
                                                            }
                                                            if ((ef.value || 0) > 10) {
                                                                alert("치명타 저항 패시브는 최대 10%까지만 설정할 수 있습니다.");
                                                                return;
                                                            }
                                                        }
                                                        if (ef.target === 'CritDmgResist') {
                                                            if ((ef.value || 0) > 10) {
                                                                alert("치명타 피해 감소 패시브는 최대 10%까지만 설정할 수 있습니다.");
                                                                return;
                                                            }
                                                        }
                                                    }
                                                    finalPower = passiveEffects.reduce((s, ef) => s + (ef.value || 0), 0);
                                                } else {
                                                    finalPower = getPassiveConfig().base;
                                                }
                                             } else if (customSkillType === SkillType.CLONE) {
                                                 if (activeTab === ClassTier.FIRST || activeTab === ClassTier.NONE) {
                                                     alert("분신 스킬은 세컨드 클래스(2차 전직) 이상부터 생성할 수 있습니다.");
                                                     return;
                                                 }
                                                 const { has2ndNinja, has3rdNinja, has4thNinja } = checkNinjaCombatStyleOwnership(character);
                                                 const isNinjaAllowed = 
                                                     (activeTab === ClassTier.SECOND && (has2ndNinja || has3rdNinja || has4thNinja)) ||
                                                     (activeTab === ClassTier.LAST && (has3rdNinja || has4thNinja)) ||
                                                     (activeTab === ClassTier.FINAL && has4thNinja);
                                                 if (!isNinjaAllowed) {
                                                     alert("분신 스킬은 닌자 계열 전투계열 보유자만 창작할 수 있습니다.");
                                                     return;
                                                 }
                                                 finalPower = activeTab === ClassTier.SECOND ? 20 : activeTab === ClassTier.LAST ? 30 : 40;
                                             } else if (customSkillType === SkillType.SUMMON) {
                                                 if (activeTab === ClassTier.FIRST || activeTab === ClassTier.NONE) {
                                                     alert("소환 스킬은 세컨드 클래스(2차 전직) 이상부터 생성할 수 있습니다.");
                                                     return;
                                                 }
                                                 const minTier = getRequiredMinTier(activeTab);
                                                 if (minTier > 1 && !hasCombatStyleOfRootAndTier(character, SUMMON_ROOTS, minTier)) {
                                                     const tierName = activeTab === ClassTier.SECOND ? "세컨드" : activeTab === ClassTier.LAST ? "라스트" : "파이널";
                                                     alert(`${activeTab === ClassTier.SECOND ? "세컨드 클래스(소환사 계열)" : activeTab === ClassTier.LAST ? "라스트 클래스(소환사 계열)" : "파이널 클래스(소환사 계열)"}에서 소환 스킬을 생성하려면 해당 소환사 계열 ${minTier}차 이상 전투계열 습득이 필요합니다.`);
                                                     return;
                                                 }
                                                 finalPower = summonPowerLevel === 'low' ? 20 : summonPowerLevel === 'medium' ? 30 : 40;
                                             }

                                             if (requiresShard && !hasEnoughShards) {
                                                alert(`타속성(${customSkillElement}) 스킬을 연구하려면 [${customSkillElement} 조각] ${currentRequiredShardCount}개가 필요합니다. (보유: ${availableShards}개)`);
                                                return;
                                            }

                                            const isAttackWithBuff = (customSkillType === SkillType.PHYSICAL || customSkillType === SkillType.MAGIC) &&
                                                attackSkillEffectType === 'buff' &&
                                                buffEffects.length > 0;

                                            const isAttackWithDebuff = (customSkillType === SkillType.PHYSICAL || customSkillType === SkillType.MAGIC) &&
                                                attackSkillEffectType === 'debuff' &&
                                                !!selectedAttackDebuffStat;

                                            const calculatedMpCost = customSkillType === SkillType.PASSIVE 
                                                ? 0 
                                                : customMpCost;

                                            handleLearn({
                                                name: customSkillName,
                                                type: customSkillType,
                                                description: customSkillDesc || `${customSkillType} 스킬`,
                                                powerRatio: finalPower,
                                                mpCost: calculatedMpCost,
                                                formulaOverride: getFormulaPreview(),
                                                targetType: customSkillType === SkillType.BUFF ? buffTargetType : customTargetType,
                                                buffType: isAttackWithBuff ? 'STAT_BOOST' : undefined,
                                                buffEffects: isAttackWithBuff 
                                                    ? buffEffects.map(ef => ({ ...ef, value: Math.min(ef.value || 0, getAttackSkillBuffCap(customTargetType, isFinalActiveTab ? finalBonusSteps : 0)) })) 
                                                    : (customSkillType === SkillType.BUFF ? buffEffects.map(ef => ({
                                                        ...ef,
                                                        value: Math.min(ef.value || 0, getBuffValueCap(buffTargetType, false, ef.type === 'STAT_BOOST' && isAccOrEvaStat(ef.targetStat)))
                                                    })) : undefined),
                                                debuffEffects: customSkillType === SkillType.DEBUFF ? debuffEffects : undefined,
                                                passiveEffects: customSkillType === SkillType.PASSIVE ? passiveEffects : undefined,
                                                isAttackWithDebuff: isAttackWithDebuff ? true : undefined,
                                                debuffStat: isAttackWithDebuff ? selectedAttackDebuffStat : (debuffEffects[0]?.stat || debuffStatType),
                                                debuffValue: isAttackWithDebuff ? Math.min(attackDebuffValue, getAttackSkillDebuffCap(customTargetType, isFinalActiveTab ? finalBonusSteps : 0)) : (debuffEffects[0]?.value || debuffStatValue),
                                                finalSkillSlot: isFinalActiveTab ? finalNextSlot : undefined,
                                                icon: selectedIcon,
                                                shinryokuType: (customSkillType === SkillType.PHYSICAL || customSkillType === SkillType.MAGIC || customSkillType === SkillType.BUFF || customSkillType === SkillType.DEBUFF)
                                                    ? (customSkillElement && customSkillElement !== '무속성' ? customSkillElement : (character.shinryokuType || '무속성'))
                                                    : undefined,
                                                consumedShard: requiresShard ? customSkillElement : undefined,
                                                 isSummonSkill: customSkillType === SkillType.SUMMON || customSkillType === SkillType.CLONE,
                                                 summonData: (customSkillType === SkillType.SUMMON || customSkillType === SkillType.CLONE) ? {
                                                     summonCount: customSkillType === SkillType.CLONE ? 1 : summonCount,
                                                     durationTurns: customSkillType === SkillType.CLONE ? (activeTab === ClassTier.SECOND ? 3 : activeTab === ClassTier.LAST ? 4 : 5) : summonDuration,
                                                     powerLevel: summonPowerLevel,
                                                     summonName: summonName || (customSkillType === SkillType.CLONE ? "그림자 분신" : "소환수"),
                                                     summonImageUrl: customSkillType === SkillType.CLONE ? "" : (summonImageUrl || getDefaultSummonImageUrl(summonName || customSkillName || "소환수", customSkillElement)),
                                                     summonType: customSkillType === SkillType.CLONE ? "분신" : "소환수"
                                                 } : undefined
                                            });
                                        }}
                                        disabled={!customSkillName || !customSkillDesc || (customSkillType === SkillType.PASSIVE && isPassiveLimitReached) || (requiresShard && !hasEnoughShards) || isSubmitting}
                                        className="bg-amber-700 hover:bg-amber-600 text-white font-bold py-2 px-6 rounded text-xs shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        스킬 배우기
                                    </button>
                                </div>
                            </div>
                        </div>
                     )}

                     {creationStep === 'ai_result' && generatedSkill && (
                         <div className="flex flex-col items-center justify-center h-full animate-in fade-in zoom-in-95">
                             <div className="bg-slate-900 border border-indigo-500 p-6 rounded-xl max-w-md w-full shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                                 <h3 className="text-xl font-bold text-indigo-400 mb-4 text-center">AI 제안 스킬</h3>
                                 <div className="space-y-3 mb-6">
                                     <div className="bg-slate-950 p-3 rounded border border-slate-800">
                                         <label className="text-[9px] text-slate-500 uppercase font-bold block mb-1">스킬명</label>
                                         <p className="text-slate-200 font-bold">{generatedSkill.name}</p>
                                     </div>
                                     <div className="bg-slate-950 p-3 rounded border border-slate-800">
                                         <label className="text-[9px] text-slate-500 uppercase font-bold block mb-1">스킬 설명</label>
                                         <p className="text-xs text-slate-300 leading-relaxed">"{generatedSkill.description}"</p>
                                     </div>
                                     <div className="flex gap-3">
                                         <div className="flex-1 bg-slate-950 p-3 rounded border border-slate-800">
                                             <label className="text-[9px] text-slate-500 uppercase font-bold block mb-1">타입</label>
                                             <p className="text-xs text-amber-400 font-mono">{generatedSkill.type}</p>
                                         </div> 
                                         <div className="flex-1 bg-slate-950 p-3 rounded border border-slate-800">
                                             <label className="text-[9px] text-slate-500 uppercase font-bold block mb-1">소모</label>
                                             <p className="text-xs text-blue-400 font-mono">{(generatedSkill.type === SkillType.PASSIVE || (generatedSkill.type as string) === '패시브') ? 0 : generatedSkill.mpCost} MP</p>
                                         </div>
                                     </div>
                                     <div className="bg-slate-950 p-3 rounded border border-slate-800">
                                         <label className="text-[9px] text-slate-500 uppercase font-bold block mb-1">스킬 효과</label>
                                         <p className="text-xs text-green-400 font-mono">{generatedSkill.effectFormula}</p>
                                     </div>
                                 </div>
                                 <div className="flex gap-3">
                                     <button onClick={() => setCreationStep('none')} className="flex-1 py-3 text-slate-400 hover:text-white border border-slate-700 rounded">버리기</button>
                                     <button 
                                        onClick={() => handleLearn({
                                            name: generatedSkill.name,
                                            type: generatedSkill.type,
                                            description: generatedSkill.description,
                                            powerRatio: generatedSkill.powerRatio,
                                            mpCost: (generatedSkill.type === SkillType.PASSIVE || (generatedSkill.type as string) === '패시브') ? 0 : generatedSkill.mpCost,
                                            formulaOverride: generatedSkill.effectFormula,
                                            targetType: generatedSkill.targetType,
                                            shinryokuType: (generatedSkill.type !== SkillType.PASSIVE) ? (character.shinryokuType || '무속성') : undefined,
                                            finalSkillSlot: isFinalActiveTab ? finalNextSlot : undefined
                                        })} 
                                        disabled={isSubmitting}
                                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                     >
                                         수락 & 배우기
                                     </button>
                                 </div>
                             </div>
                         </div>
                     )}
                    </>
                )}
            </div>
        </div>
      </div>
      {isGenerating && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-slate-900 border border-amber-500/30 p-6 rounded-2xl w-full max-w-sm text-center space-y-4 shadow-2xl relative overflow-hidden">
                  <div className="absolute -top-10 -left-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl animate-pulse"></div>
                  <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl animate-pulse"></div>

                  <div className="relative flex justify-center">
                      <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin flex items-center justify-center">
                          <Sparkles className="text-amber-400 animate-pulse" size={24} />
                      </div>
                  </div>

                  <div className="space-y-1 relative">
                      <h4 className="text-sm font-black text-amber-200">
                          AI가 신력을 분석하여 연상하는 중
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium h-4 transition-all duration-300">
                          캐릭터의 특징과 조화로운 스킬을 조합하는 중입니다...
                      </p>
                  </div>

                  <div className="space-y-1 relative">
                      <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                          <div 
                              className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 animate-pulse transition-all duration-150"
                              style={{ width: '100%' }}
                          ></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono font-bold">
                          <span>준비</span>
                          <span className="text-amber-400">AI 분석 중</span>
                          <span>완성</span>
                      </div>
                  </div>
              </div>
          </div>
      )}
      {resultOverlay.show && (
          <ActionResultModal 
              data={resultOverlay.data} 
              onClose={() => setResultOverlay({ show: false, data: null })} 
          />
      )}
      {shortcutTarget && (
          <ShortcutAssignModal
              isOpen={Boolean(shortcutTarget)}
              onClose={() => setShortcutTarget(null)}
              targetName={shortcutTarget.name}
              targetDisplayName={shortcutTarget.displayName}
              targetType={shortcutTarget.type}
              targetIcon={shortcutTarget.icon}
              targetImageUrl={shortcutTarget.imageUrl}
              character={character as any}
              onAssignSlot={handleAssignSlot}
              onRemoveShortcut={() => handleRemoveShortcut(shortcutTarget.name)}
          />
      )}
      <SkillCraftHelpModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          currentLevel={character.level}
          currentTier={activeTab}
      />
      <FinalSkillEnhanceModal
          isOpen={isFinalEnhanceOpen}
          onClose={() => setIsFinalEnhanceOpen(false)}
          character={character}
          playerCharacter={playerCharacter}
          targetTier={activeTab}
          onUpdateCharacter={onUpdateCharacter}
      />

    </div>
  );
};

export default SkillBook;
