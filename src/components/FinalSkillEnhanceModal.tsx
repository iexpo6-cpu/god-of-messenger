import React, { useState, useMemo, useEffect } from 'react';
import { Character, Companion, Skill, SkillType, ClassTier } from '../types';
import { X, Sparkles, Sword, Shield, Skull, Zap, ChevronRight, CheckCircle2, AlertCircle, ArrowLeft, Plus, RotateCcw } from 'lucide-react';
import { getNextAvailableFinalSkillSlot } from '../services/finalClassLevelScalingService';
import { calculateEnhancedSkillMpCost, MP_REDUCTION_PER_LEVEL_PER_STACK } from '../services/aoeSkillEnhanceService';

const BUFF_SLOT_OPTIONS = [
    { key: 'STR', label: 'STR +15%' },
    { key: 'AGI', label: 'AGI +15%' },
    { key: 'INT', label: 'INT +15%' },
    { key: 'CTRL', label: 'CTRL +15%' },
    { key: 'WIS', label: 'WIS +15%' },
    { key: 'DEF', label: 'DEF +15%' },
    { key: 'MaxHP', label: 'MaxHP +15%' },
    { key: 'MaxMP', label: 'MaxMP +15%' },
    { key: '체력 회복', label: '체력 회복 15%' },
    { key: '마나 회복', label: '마나 회복 15%' }
];

const DEBUFF_SLOT_OPTIONS = [
    { key: 'P.Atk', label: 'P.Atk -20%' },
    { key: 'M.Atk', label: 'M.Atk -20%' },
    { key: 'P.Def', label: 'P.Def -20%' },
    { key: 'M.Def', label: 'M.Def -20%' },
    { key: 'Acc', label: 'Acc -15%' },
    { key: 'MAcc', label: 'MAcc -15%' },
    { key: 'Eva', label: 'Eva -15%' },
    { key: 'MEva', label: 'MEva -15%' },
    { key: '출혈', label: '출혈' },
    { key: '중독', label: '중독' },
    { key: '화상', label: '화상' },
    { key: '빙결', label: '빙결' },
    { key: '감전', label: '감전' },
    { key: '속박', label: '속박' },
    { key: '기절', label: '기절' },
    { key: '침묵', label: '침묵' },
    { key: '공포', label: '공포' },
    { key: '암흑', label: '암흑' }
];

interface Props {
    isOpen: boolean;
    onClose: () => void;
    character: Character | Companion;
    playerCharacter?: Character;
    targetTier?: string;
    onUpdateCharacter?: (newChar: Character) => void;
}

interface TierEnhanceConfig {
    tierKey: 'FIRST' | 'SECOND' | 'LAST' | 'FINAL';
    tierName: string;
    attackScaleBonus: number;
    buffScaleBonus: number;
    mpReductionAmount: number;
}

export const normalizeTier = (tier?: any): string => {
    if (!tier || tier === ClassTier.NONE) return ClassTier.NONE;
    const t = String(tier).replace(/\s+/g, '').toLowerCase();
    if (t.includes('combat') || t.includes('전투계열') || t.includes('style')) return 'COMBAT_STYLE';
    if (t.includes('final') || t.includes('파이널') || t.includes('4')) return ClassTier.FINAL;
    if (t.includes('last') || t.includes('라스트') || t.includes('3')) return ClassTier.LAST;
    if (t.includes('second') || t.includes('세컨드') || t.includes('2')) return ClassTier.SECOND;
    if (t.includes('first') || t.includes('퍼스트') || t.includes('1')) return ClassTier.FIRST;
    if (t.includes('bond') || t.includes('인연')) return ClassTier.BOND;
    return ClassTier.NONE;
};

const getTierEnhanceConfig = (tier?: string, skillTier?: string): TierEnhanceConfig => {
    const raw = String(tier || skillTier || '').toUpperCase();
    if (raw.includes('FIRST') || raw.includes('퍼스트') || raw.includes('1')) {
        return {
            tierKey: 'FIRST',
            tierName: '퍼스트 클래스',
            attackScaleBonus: 1,
            buffScaleBonus: 0.1,
            mpReductionAmount: 5
        };
    }
    if (raw.includes('SECOND') || raw.includes('세컨드') || raw.includes('2')) {
        return {
            tierKey: 'SECOND',
            tierName: '세컨드 클래스',
            attackScaleBonus: 5,
            buffScaleBonus: 0.2,
            mpReductionAmount: 10
        };
    }
    if (raw.includes('LAST') || raw.includes('라스트') || raw.includes('3')) {
        return {
            tierKey: 'LAST',
            tierName: '라스트 클래스',
            attackScaleBonus: 20,
            buffScaleBonus: 0.35,
            mpReductionAmount: 25
        };
    }
    return {
        tierKey: 'FINAL',
        tierName: '파이널 클래스',
        attackScaleBonus: 50,
        buffScaleBonus: 0.5,
        mpReductionAmount: 200
    };
};

const getTierDisplayName = (tier?: string): string => {
    return getTierEnhanceConfig(tier).tierName;
};

export const FinalSkillEnhanceModal: React.FC<Props> = ({
    isOpen,
    onClose,
    character,
    playerCharacter,
    targetTier,
    onUpdateCharacter
}) => {
    // 강화 대상 스킬
    const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
    // 선택한 강화 특화 유형
    const [selectedOption, setSelectedOption] = useState<string>('');
    // 추가 슬롯 선택 (공격 스킬: 버프/디버프 슬롯, 버프 스킬: 버프 슬롯)
    const [extraOptionType, setExtraOptionType] = useState<'buff' | 'debuff'>('buff');
    const [extraBuffStat, setExtraBuffStat] = useState<string>('STR');
    const [extraDebuffStat, setExtraDebuffStat] = useState<string>('P.Atk');
    const [extraPassiveCombatStat, setExtraPassiveCombatStat] = useState<string>('치명타율 +5%');
    const [extraElementalType, setExtraElementalType] = useState<string>('속성 피해 +10%');
    const [extraElementalElement, setExtraElementalElement] = useState<string>('화염계');
    const [extraConditionType, setExtraConditionType] = useState<string>('체력 50% 이하 시 받는 피해 20% 감소');
    const [extraBuffZoneType, setExtraBuffZoneType] = useState<'HP' | 'MP'>('HP');
    const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

    // 모달이 열리거나 대상 티어가 바뀔 때 선택 상태 초기화
    useEffect(() => {
        if (isOpen) {
            setSelectedSkillId(null);
            setSelectedOption('');
            setShowResetConfirm(false);
        }
    }, [isOpen, targetTier]);

    // 해당 클래스 스킬만 강화 가능하도록 정규화 기반 엄격 필터링
    const targetNorm = useMemo(() => normalizeTier(targetTier), [targetTier]);

    const availableSkills = useMemo(() => {
        return (character.skills || []).filter(s => {
            if (!s) return false;
            // 인연 스킬 및 전투계열 스킬은 제외
            if (s.isBondSkill || (s.tier as any) === ClassTier.BOND || (s.tier as any) === '인연') return false;
            if (s.isCombatStyleSkill || s.combatStyleSource || (s.id && s.id.startsWith('combat_style_'))) return false;

            const skillTier = normalizeTier(s.tier || s.baseTier || (s as any).minClassTier || '');

            // targetTier가 지정된 경우 해당 티어와 정확히 일치하는 스킬만 반환
            if (targetNorm !== ClassTier.NONE) {
                // 파이널 스킬 슬롯이 배정된 스킬은 파이널 클래스로 분류
                if (s.finalSkillSlot !== undefined) {
                    return targetNorm === ClassTier.FINAL;
                }
                return skillTier === targetNorm;
            }

            // targetTier가 없을 경우 4대 클래스 스킬 허용
            return [ClassTier.FIRST, ClassTier.SECOND, ClassTier.LAST, ClassTier.FINAL].includes(skillTier as ClassTier);
        });
    }, [character.skills, targetNorm]);

    const selectedSkill = useMemo(() => {
        if (!selectedSkillId) return null;
        return availableSkills.find(s => (s.id || s.name) === selectedSkillId) || null;
    }, [availableSkills, selectedSkillId]);

    // 다음 소모될 파이널 슬롯 번호
    const nextSlot = useMemo(() => {
        return getNextAvailableFinalSkillSlot(character.skills || []);
    }, [character.skills]);

    const isFinalTier = useMemo(() => {
        if (targetNorm !== ClassTier.NONE) {
            return targetNorm === ClassTier.FINAL;
        }
        if (!selectedSkill) return false;
        const skillTier = normalizeTier(selectedSkill.tier || selectedSkill.baseTier || (selectedSkill as any).minClassTier);
        return skillTier === ClassTier.FINAL;
    }, [targetNorm, selectedSkill]);

    const tierConfig = useMemo(() => {
        return getTierEnhanceConfig(targetNorm !== ClassTier.NONE ? targetNorm : selectedSkill?.tier);
    }, [targetNorm, selectedSkill]);

    const currentTierName = tierConfig.tierName;

    if (!isOpen) return null;

    // 현재 선택된 스킬의 누적 강화 횟수 및 데이터
    const enhanceData = selectedSkill?.finalEnhanceData || {
        totalEnhanceCount: 0,
        allocatedSlots: []
    };
    const currentCount = enhanceData.totalEnhanceCount || 0;

    // 스킬 분류 판별
    const isAttack = selectedSkill?.type === SkillType.PHYSICAL || selectedSkill?.type === SkillType.MAGIC;
    const isBuff = selectedSkill?.type === SkillType.BUFF;
    const isDebuff = selectedSkill?.type === SkillType.DEBUFF;
    const isPassive = selectedSkill?.type === SkillType.PASSIVE;

    // 신력특수개방 스킬 판별 (실제 신력전용 패시브 스킬 - 수치 한계 돌파 전용)
    const isShinryokuSpecialPassive = isPassive && Boolean(
        selectedSkill?.shinryokuType ||
        (selectedSkill?.name || '').includes('신력') ||
        (selectedSkill?.name || '').includes('태양의') || (selectedSkill?.name || '').includes('달의') ||
        (selectedSkill?.name || '').includes('성역') || (selectedSkill?.name || '').includes('심판의 빛') ||
        (selectedSkill?.name || '').includes('불의 파동') || (selectedSkill?.name || '').includes('냉기') ||
        (selectedSkill?.name || '').includes('절대 영도') || (selectedSkill?.name || '').includes('번개') ||
        (selectedSkill?.name || '').includes('광합성') || (selectedSkill?.name || '').includes('돌풍') ||
        (selectedSkill?.name || '').includes('지진') || (selectedSkill?.name || '').includes('흡수') ||
        (selectedSkill?.name || '').includes('파도') || (selectedSkill?.name || '').includes('공격 강화') ||
        (selectedSkill?.name || '').includes('수비 강화') || (selectedSkill?.name || '').includes('신체 각성') ||
        (selectedSkill?.name || '').includes('금강 불괴') || (selectedSkill?.name || '').includes('철광') ||
        (selectedSkill?.effectFormula || '').includes('SOLAR_') || (selectedSkill?.effectFormula || '').includes('LUNAR_') ||
        (selectedSkill?.effectFormula || '').includes('RADIANT_') || (selectedSkill?.effectFormula || '').includes('FIRE_') ||
        (selectedSkill?.effectFormula || '').includes('ICE_') || (selectedSkill?.effectFormula || '').includes('ELEC_') ||
        (selectedSkill?.effectFormula || '').includes('NATURE_') || (selectedSkill?.effectFormula || '').includes('WIND_') ||
        (selectedSkill?.effectFormula || '').includes('EARTH_') || (selectedSkill?.effectFormula || '').includes('DARK_') ||
        (selectedSkill?.effectFormula || '').includes('WATER_') || (selectedSkill?.effectFormula || '').includes('ENHANCE_') ||
        (selectedSkill?.effectFormula || '').includes('STEEL_')
    );

    // 강화 적용 핸들러
    const handleApplyEnhance = () => {
        if (!selectedSkill || !selectedOption) {
            alert('강화 특화 효과를 선택해주세요.');
            return;
        }

        // 현재 티어의 슬롯 수 검증 (사용 슬롯 = 해당 티어 스킬 개수 + 해당 티어 스킬 누적 강화 수)
        const getTierMaxSlots = (tierStr: string, level: number): number => {
            const raw = String(tierStr || '').toUpperCase();
            const isLocked = Boolean((character as any).isPotentialLocked && (character as any).isCustom);
            const rawPot = String((character as any).liberationPotential || character.classTier || '').toUpperCase();
            const getRank = (s: string) => {
                if (s.includes('FINAL') || s.includes('파이널') || s.includes('4')) return 4;
                if (s.includes('LAST') || s.includes('라스트') || s.includes('3')) return 3;
                if (s.includes('SECOND') || s.includes('세컨드') || s.includes('2')) return 2;
                if (s.includes('FIRST') || s.includes('퍼스트') || s.includes('1')) return 1;
                return 0;
            };
            const targetRank = getRank(raw);
            const potRank = getRank(rawPot);
            const hasLockedBonus = isLocked && targetRank <= potRank && targetRank < 4;

            if (raw.includes('FIRST') || raw.includes('퍼스트') || raw.includes('1')) {
                if (level < 30) return 0;
                if (level < 50) return 1;
                if (level < 70) return 2;
                if (level < 90) return 3;
                return 4 + (hasLockedBonus ? Math.floor((level - 90) / 100) : 0);
            }
            if (raw.includes('SECOND') || raw.includes('세컨드') || raw.includes('2')) {
                if (level < 100) return 0;
                if (level < 140) return 1;
                if (level < 180) return 2;
                if (level < 220) return 3;
                if (level < 260) return 4;
                return 5 + (hasLockedBonus ? Math.floor((level - 260) / 100) : 0);
            }
            if (raw.includes('LAST') || raw.includes('라스트') || raw.includes('3')) {
                if (level < 300) return 0;
                if (level < 400) return 1;
                if (level < 500) return 2;
                if (level < 600) return 3;
                if (level < 700) return 4;
                if (level < 800) return 5;
                if (level < 900) return 6;
                return 7 + (hasLockedBonus ? Math.floor((level - 900) / 100) : 0);
            }
            // FINAL
            if (level < 1000) return 1;
            return Math.max(1, 1 + Math.floor((Math.max(1000, level) - 1000) / 200));
        };

        const maxAllowedSlots = getTierMaxSlots(tierConfig.tierKey, character.level);
        let currentUsedSlots = 0;
        const normTarget = normalizeTier(tierConfig.tierKey);
        (character.skills || []).forEach(s => {
            if (!s) return;
            const normSkillTier = normalizeTier(s.tier || s.baseTier || (s as any).minClassTier || '');
            let matches = false;
            if (normTarget === ClassTier.FINAL) {
                matches = normSkillTier === ClassTier.FINAL || s.finalSkillSlot !== undefined;
            } else {
                matches = normSkillTier === normTarget;
            }
            if (matches) {
                currentUsedSlots += 1;
                currentUsedSlots += (s.finalEnhanceData?.totalEnhanceCount || 0);
            }
        });

        if (currentUsedSlots >= maxAllowedSlots) {
            alert(`보유 중인 ${currentTierName} 스킬 슬롯이 모두 소모되어 더 이상 강화할 수 없습니다.`);
            return;
        }

        const newCount = currentCount + 1;
        const newAllocatedSlots = [...(enhanceData.allocatedSlots || []), nextSlot];

        // 새로운 강화 데이터 생성
        const nextEnhanceData = {
            ...enhanceData,
            totalEnhanceCount: newCount,
            allocatedSlots: newAllocatedSlots
        };

        let updatedSkillMpCost = selectedSkill.mpCost;

        // 0. 공통 MP 소모 감소 강화 (공격/버프/디버프)
        if (selectedOption === 'mp_cost_reduction') {
            const prevStack = enhanceData.mpReductionStack || 0;
            const nextStack = prevStack + 1;
            nextEnhanceData.mpReductionStack = nextStack;
            nextEnhanceData.mpReductionAmountPerLevel = tierConfig.mpReductionAmount;
            
            const currentLevel = Math.max(1, selectedSkill.level || 1);
            const immediateReduction = currentLevel * tierConfig.mpReductionAmount;
            updatedSkillMpCost = Math.max(1, (selectedSkill.mpCost || 1) - immediateReduction);
        }

        // 1. 공격 스킬 강화 로직
        if (isAttack) {
            if (selectedOption === 'scale_breakthrough') {
                const prevBonus = nextEnhanceData.levelScaleBonus || 0;
                nextEnhanceData.levelScaleBonus = prevBonus + tierConfig.attackScaleBonus;
            } else if (selectedOption === 'aoe_expand') {
                nextEnhanceData.isAoEExpanded = true;
                selectedSkill.targetType = 'aoe';
            } else if (selectedOption === 'aoe_battlefield_zone') {
                nextEnhanceData.isBattlefieldZone = true;
            } else if (selectedOption === 'aoe_focus_fusion') {
                nextEnhanceData.isFocusFusion = true;
            } else if (selectedOption === 'aoe_echo_aftershock') {
                nextEnhanceData.isEchoAftershock = true;
            } else if (selectedOption === 'buff_battlefield_zone') {
                nextEnhanceData.buffZoneType = extraBuffZoneType;
            } else if (selectedOption === 'armor_penetration') {
                const prevPen = nextEnhanceData.armorPenetration || 0;
                nextEnhanceData.armorPenetration = prevPen + 5;
            } else if (selectedOption === 'added_effect') {
                if (extraOptionType === 'buff') {
                    nextEnhanceData.addedEffect = { type: 'buff', stat: extraBuffStat, value: 15 };
                } else {
                    nextEnhanceData.addedEffect = { type: 'debuff', stat: extraDebuffStat, value: 20 };
                }
            }
        }

        // 2. 버프 및 회복 스킬 강화 로직
        if (isBuff) {
            if (selectedOption === 'buff_aoe_expand') {
                nextEnhanceData.isBuffAlliesExpanded = true;
                selectedSkill.targetType = 'aoe';
            } else if (selectedOption === 'buff_battlefield_zone') {
                nextEnhanceData.isBattlefieldZone = true;
                nextEnhanceData.buffZoneType = extraBuffZoneType;
            } else if (selectedOption === 'buff_mass_cleanse') {
                nextEnhanceData.isMassCleanse = true;
            } else if (selectedOption === 'buff_aura_transcend') {
                nextEnhanceData.isAuraTranscend = true;
            } else if (selectedOption === 'buff_scale_increase') {
                const prevScale = nextEnhanceData.buffScaleBonus || 0;
                nextEnhanceData.buffScaleBonus = +(prevScale + tierConfig.buffScaleBonus).toFixed(2);
            } else if (selectedOption === 'overheal_shield') {
                nextEnhanceData.overhealShield = true;
            } else if (selectedOption === 'added_buff_slot') {
                nextEnhanceData.addedBuffSlot = { stat: extraBuffStat, value: 15 };
            } else if (selectedOption === 'duration_extend') {
                nextEnhanceData.durationExtended = true;
            }
        }

        // 3. 디버프 스킬 강화 로직
        if (isDebuff) {
            if (selectedOption === 'ctrl_success_bonus') {
                const prevCtrl = nextEnhanceData.ctrlSuccessBonus || 0;
                nextEnhanceData.ctrlSuccessBonus = prevCtrl + 10;
            } else if (selectedOption === 'chain_weakening') {
                nextEnhanceData.chainWeakening = true;
            } else if (selectedOption === 'debuff_duration_extend') {
                nextEnhanceData.debuffDurationExtended = true;
            } else if (selectedOption === 'debuff_aoe_expand') {
                nextEnhanceData.isDebuffAoEExpanded = true;
                selectedSkill.targetType = 'aoe';
            } else if (selectedOption === 'debuff_battlefield_zone') {
                nextEnhanceData.isBattlefieldZone = true;
            } else if (selectedOption === 'debuff_aura_erosion') {
                nextEnhanceData.isAuraErosion = true;
            } else if (selectedOption === 'debuff_defense_shatter') {
                nextEnhanceData.isDefenseShatter = true;
            } else if (selectedOption === 'debuff_scale_increase') {
                const prevDebuffScale = nextEnhanceData.debuffScaleBonus || 0;
                const nextVal = Math.min(90, +(prevDebuffScale + tierConfig.buffScaleBonus).toFixed(2));
                nextEnhanceData.debuffScaleBonus = nextVal;
            }
        }

        // 4. 패시브 스킬 강화 로직
        if (isPassive) {
            if (selectedOption === 'passive_scale_breakthrough') {
                const prevBonus = nextEnhanceData.passiveScaleBonus || 0;
                nextEnhanceData.passiveScaleBonus = +(prevBonus + tierConfig.buffScaleBonus).toFixed(2);
            } else if (selectedOption === 'passive_added_combat_slot') {
                nextEnhanceData.passiveCombatSlot = { stat: extraPassiveCombatStat, value: 10 };
            } else if (selectedOption === 'passive_elemental_resonance') {
                nextEnhanceData.passiveElementalResonance = { element: extraElementalElement, type: extraElementalType, value: 10 };
            } else if (selectedOption === 'passive_conditional_booster') {
                nextEnhanceData.passiveConditional = { condition: extraConditionType };
            } else if (selectedOption === 'passive_aura_share') {
                nextEnhanceData.passiveAuraShare = true;
            }
        }

        // 누적 태그 및 buffEffects 구조체 갱신
        const tags: string[] = [];
        if (nextEnhanceData.levelScaleBonus) {
            tags.push(`계수 한계 돌파 +${nextEnhanceData.levelScaleBonus}%`);
        }
        if (nextEnhanceData.isAoEExpanded) {
            tags.push(`공격 범위 확장: 광역 타격`);
        }
        if (nextEnhanceData.isBattlefieldZone && !nextEnhanceData.buffZoneType) {
            tags.push(`지속 전장 결계: 매 턴 적 전체 지속 피해`);
        }
        if (nextEnhanceData.isFocusFusion) {
            tags.push(`집중 융합: 적 수 반비례 피해 증폭`);
        }
        if (nextEnhanceData.isEchoAftershock) {
            tags.push(`신력 여진: 즉시 추가 폭발 타격`);
        }
        if (nextEnhanceData.armorPenetration) {
            tags.push(`특수 방어 관통 +${nextEnhanceData.armorPenetration}%`);
        }
        if (nextEnhanceData.addedEffect) {
            const { type, stat, value } = nextEnhanceData.addedEffect;
            if (type === 'buff') {
                const isHeal = stat.includes('회복') || stat.includes('HP') || stat.includes('MP');
                const valStr = isHeal ? '15%' : `+${value || 15}%`;
                tags.push(`추가 버프: ${stat} ${valStr}`);
            } else {
                const valStr = ['출혈', '중독', '화상', '빙결', '감전', '속박', '기절', '침묵', '공포', '암흑'].includes(stat) ? '' : ` -${value || 20}%`;
                tags.push(`추가 디버프: ${stat}${valStr}`);
            }
        }
        if (nextEnhanceData.isBuffAlliesExpanded) {
            tags.push(`아군 전체 광역화`);
        }
        if (nextEnhanceData.buffZoneType) {
            tags.push(`지속 회복 결계: 매 턴 아군 전체 ${nextEnhanceData.buffZoneType === 'MP' ? 'MP' : 'HP'} 회복`);
        }
        if (nextEnhanceData.isMassCleanse) {
            tags.push(`일제 정화: 아군 전체 상태이상 해제`);
        }
        if (nextEnhanceData.isAuraTranscend) {
            tags.push(`기운 초월: 다른 기운 아군 감소 없이 버프 적용`);
        }
        if (nextEnhanceData.buffScaleBonus) {
            tags.push(`버프 계수 증가 +${nextEnhanceData.buffScaleBonus}%`);
        }
        if (nextEnhanceData.overhealShield) {
            tags.push(`초과 치유 마나 보호막 전환`);
        }
        if (nextEnhanceData.addedBuffSlot) {
            const { stat, value } = nextEnhanceData.addedBuffSlot;
            const isHeal = stat.includes('회복') || stat.includes('HP') || stat.includes('MP');
            const valStr = isHeal ? '15%' : `+${value || 15}%`;
            tags.push(`추가 버프: ${stat} ${valStr}`);
        }
        if (nextEnhanceData.durationExtended) {
            tags.push(`지속 턴 수 연장 (+1턴)`);
        }
        if (nextEnhanceData.ctrlSuccessBonus) {
            tags.push(`상태이상 성공률 제어력 보너스 +${nextEnhanceData.ctrlSuccessBonus}`);
        }
        if (nextEnhanceData.chainWeakening) {
            tags.push(`연쇄 약화: 지속 피해량 공격력 비례 대폭 증폭`);
        }
        if (nextEnhanceData.debuffDurationExtended) {
            tags.push(`행동 봉쇄 지속 턴 수 연장 (+1턴)`);
        }
        if (nextEnhanceData.isDebuffAoEExpanded) {
            tags.push(`디버프 광역화: 적 전체 적용`);
        }
        if (nextEnhanceData.isAuraErosion) {
            tags.push(`기운 잠식: 같은 기운 적 감소 없이 디버프 적용`);
        }
        if (nextEnhanceData.isDefenseShatter) {
            tags.push(`방어 붕괴: 적 전체 보호막·버프 1개 해제`);
        }
        if (nextEnhanceData.debuffScaleBonus) {
            tags.push(`디버프 비율 계수 증가 +${nextEnhanceData.debuffScaleBonus}%`);
        }
        if (nextEnhanceData.mpReductionStack) {
            const amountPerLevel = nextEnhanceData.mpReductionAmountPerLevel || tierConfig.mpReductionAmount || MP_REDUCTION_PER_LEVEL_PER_STACK;
            tags.push(`MP 소모 감소: 스킬 레벨당 -${nextEnhanceData.mpReductionStack * amountPerLevel}`);
        }
        if (nextEnhanceData.passiveScaleBonus) {
            tags.push(`수치 한계 돌파 레벨당 +${nextEnhanceData.passiveScaleBonus}%`);
        }
        if (nextEnhanceData.passiveCombatSlot) {
            tags.push(`추가 전투 슬롯: ${nextEnhanceData.passiveCombatSlot.stat}`);
        }
        if (nextEnhanceData.passiveElementalResonance) {
            const el = nextEnhanceData.passiveElementalResonance;
            const elName = el.element || '화염계';
            const elType = el.type || '속성 피해 +10%';
            tags.push(`속성 공명: ${elName} ${elType}`);
        }
        if (nextEnhanceData.passiveConditional) {
            tags.push(`조건부 특화: ${nextEnhanceData.passiveConditional.condition}`);
        }
        if (nextEnhanceData.passiveAuraShare) {
            tags.push(`파티 공유 오라: 50% 오라 적용`);
        }

        const tagContent = tags.length > 0 ? ` [${tags.join(', ')}]` : '';
        const cleanFormula = (selectedSkill.effectFormula || '').replace(/\s*\[(파이널 각성|스킬 강화).*?\]/g, '');
        const updatedEffectFormula = `${cleanFormula} [스킬 강화 +${newCount}단계${tagContent}]`.trim();

        // 버프 효과 객체 배열 갱신
        let updatedBuffEffects = [...(selectedSkill.buffEffects || [])];
        const addedBuffsToMerge = [];
        if (nextEnhanceData.addedEffect?.type === 'buff') {
            addedBuffsToMerge.push(nextEnhanceData.addedEffect);
        }
        if (nextEnhanceData.addedBuffSlot) {
            addedBuffsToMerge.push(nextEnhanceData.addedBuffSlot);
        }

        addedBuffsToMerge.forEach(ab => {
            const { stat, value } = ab;
            if (stat === '체력 회복' || stat === 'HP 회복') {
                if (!updatedBuffEffects.some(e => e.type === 'HP_RECOV')) {
                    updatedBuffEffects.push({ type: 'HP_RECOV', value: 15 });
                }
            } else if (stat === '마나 회복' || stat === 'MP 회복') {
                if (!updatedBuffEffects.some(e => e.type === 'MP_RECOV')) {
                    updatedBuffEffects.push({ type: 'MP_RECOV', value: 15 });
                }
            } else {
                if (!updatedBuffEffects.some(e => e.type === 'STAT_BOOST' && e.targetStat === stat)) {
                    updatedBuffEffects.push({ type: 'STAT_BOOST', targetStat: stat, value: value || 15 });
                }
            }
        });

        const isAttackWithBuff = isAttack && (updatedBuffEffects.length > 0 || nextEnhanceData.addedEffect?.type === 'buff');

        // 캐릭터 스킬 목록 갱신
        const updatedSkills = (character.skills || []).map(s => {
            const isTarget = (s.id && s.id === selectedSkill.id) || s.name === selectedSkill.name;
            if (isTarget) {
                return {
                    ...s,
                    mpCost: updatedSkillMpCost,
                    finalEnhanceData: nextEnhanceData,
                    effectFormula: updatedEffectFormula,
                    buffEffects: updatedBuffEffects,
                    isAttackWithBuff: isAttackWithBuff ? true : (s as any).isAttackWithBuff
                };
            }
            return s;
        });

        if (onUpdateCharacter) {
            onUpdateCharacter({
                ...character,
                skills: updatedSkills
            } as any);
        }

        const slotMsg = isFinalTier ? `파이널 클래스 제 ${nextSlot}슬롯` : `${currentTierName} 스킬 슬롯`;
        alert(`[${selectedSkill.name}] 스킬이 ${slotMsg}을 소모하여 성공적으로 강화되었습니다! (누적 +${newCount}단계)`);
        setSelectedOption('');
        onClose();
    };

    // 강화 취소 (초기화 및 슬롯 반환) 핸들러
    const handleResetEnhance = () => {
        if (!selectedSkill || !currentCount) return;

        let baseMpCost = selectedSkill.mpCost;
        if (enhanceData.mpReductionStack) {
            const reductionRate = enhanceData.mpReductionAmountPerLevel || tierConfig.mpReductionAmount;
            const currentLevel = Math.max(1, selectedSkill.level || 1);
            baseMpCost = selectedSkill.mpCost + (enhanceData.mpReductionStack * currentLevel * reductionRate);
        }

        let restoredTargetType = selectedSkill.targetType;
        if (enhanceData.isAoEExpanded || enhanceData.isBuffAlliesExpanded || enhanceData.isDebuffAoEExpanded) {
            restoredTargetType = 'single';
        }

        const cleanFormula = (selectedSkill.effectFormula || '').replace(/\s*\[(파이널 각성|스킬 강화).*?\]/g, '').trim();

        let cleanedBuffEffects = [...(selectedSkill.buffEffects || [])];
        const addedStats: string[] = [];
        if (enhanceData.addedEffect?.stat) addedStats.push(enhanceData.addedEffect.stat);
        if (enhanceData.addedBuffSlot?.stat) addedStats.push(enhanceData.addedBuffSlot.stat);

        if (addedStats.length > 0) {
            cleanedBuffEffects = cleanedBuffEffects.filter(e => {
                if (e.type === 'STAT_BOOST' && e.targetStat && addedStats.includes(e.targetStat)) return false;
                if (e.type === 'HP_RECOV' && (addedStats.includes('체력 회복') || addedStats.includes('HP 회복'))) return false;
                if (e.type === 'MP_RECOV' && (addedStats.includes('마나 회복') || addedStats.includes('MP 회복'))) return false;
                return true;
            });
        }

        const updatedSkills = (character.skills || []).map(s => {
            const isTarget = (s.id && s.id === selectedSkill.id) || s.name === selectedSkill.name;
            if (isTarget) {
                const copy = { ...s } as any;
                delete copy.finalEnhanceData;
                delete copy.isAttackWithBuff;
                return {
                    ...copy,
                    targetType: restoredTargetType,
                    mpCost: Math.max(0, baseMpCost),
                    effectFormula: cleanFormula,
                    buffEffects: cleanedBuffEffects
                };
            }
            return s;
        });

        if (onUpdateCharacter) {
            onUpdateCharacter({
                ...character,
                skills: updatedSkills
            } as any);
        }

        setShowResetConfirm(false);
        setSelectedOption('');
    };

    return (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
                {/* 헤더 */}
                <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                            <Sparkles size={20} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-extrabold text-sm sm:text-base text-amber-200 truncate">
                                {currentTierName} 스킬 슬롯 강화
                            </h3>
                            <p className="text-[11px] text-slate-400 truncate">
                                {isFinalTier
                                    ? `보유 중인 파이널 슬롯(제 ${nextSlot}슬롯)을 1개 소모하여 기존 스킬을 강화합니다.`
                                    : `보유 중인 ${currentTierName} 스킬 슬롯을 1개 소모하여 기존 스킬을 강화합니다.`}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label="닫기"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 본문 스크롤 영역 */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-4 space-y-4">
                    {/* 1단계: 강화할 기존 스킬 선택 */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] text-amber-400 font-mono">1</span>
                                강화할 스킬 선택
                            </span>
                            <span className="text-[11px] text-slate-400">
                                {selectedSkill ? `선택됨: ${selectedSkill.name}` : '스킬을 선택해주세요'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto custom-scrollbar p-1 bg-slate-950/60 rounded-xl border border-slate-800">
                            {availableSkills.length === 0 ? (
                                <div className="col-span-full text-center py-6 text-slate-500 text-xs">
                                    강화할 수 있는 {currentTierName} 스킬이 없습니다. 먼저 스킬북에서 해당 클래스의 스킬을 습득하세요.
                                </div>
                            ) : (
                                availableSkills.map((sk) => {
                                const isSelected = (selectedSkill?.id || selectedSkill?.name) === (sk.id || sk.name);
                                const count = sk.finalEnhanceData?.totalEnhanceCount || 0;
                                return (
                                    <button
                                        key={sk.id || sk.name}
                                        type="button"
                                        onClick={() => {
                                            setSelectedSkillId(sk.id || sk.name);
                                            setShowResetConfirm(false);
                                            const isShinryoku = sk.type === SkillType.PASSIVE && Boolean(
                                                sk.shinryokuType ||
                                                sk.name.includes('신력') ||
                                                sk.name.includes('태양의') || sk.name.includes('달의') ||
                                                sk.name.includes('성역') || sk.name.includes('심판의 빛') ||
                                                sk.name.includes('불의 파동') || sk.name.includes('냉기') ||
                                                sk.name.includes('절대 영도') || sk.name.includes('번개') ||
                                                sk.name.includes('광합성') || sk.name.includes('돌풍') ||
                                                sk.name.includes('지진') || sk.name.includes('흡수') ||
                                                sk.name.includes('파도') || sk.name.includes('공격 강화') ||
                                                sk.name.includes('수비 강화') || sk.name.includes('신체 각성') ||
                                                sk.name.includes('금강 불괴') || sk.name.includes('철광') ||
                                                (sk.effectFormula || '').includes('SOLAR_') || (sk.effectFormula || '').includes('LUNAR_') ||
                                                (sk.effectFormula || '').includes('RADIANT_') || (sk.effectFormula || '').includes('FIRE_') ||
                                                (sk.effectFormula || '').includes('ICE_') || (sk.effectFormula || '').includes('ELEC_') ||
                                                (sk.effectFormula || '').includes('NATURE_') || (sk.effectFormula || '').includes('WIND_') ||
                                                (sk.effectFormula || '').includes('EARTH_') || (sk.effectFormula || '').includes('DARK_') ||
                                                (sk.effectFormula || '').includes('WATER_') || (sk.effectFormula || '').includes('ENHANCE_') ||
                                                (sk.effectFormula || '').includes('STEEL_')
                                            );
                                            setSelectedOption(isShinryoku ? 'passive_scale_breakthrough' : '');
                                        }}
                                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 min-h-[46px] ${
                                            isSelected
                                                ? 'bg-amber-950/50 border-amber-500 shadow-sm text-amber-200'
                                                : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                                        }`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-xs font-bold truncate">{sk.name}</span>
                                                {count > 0 && (
                                                    <span className="text-[9px] bg-rose-950/80 text-rose-300 px-1 rounded border border-rose-600/60 font-mono font-bold">
                                                        +{count}강화
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-slate-500 mt-0.5">
                                                <span>{sk.type}</span> • <span>Lv.{sk.level || 1}</span> • <span>{sk.targetType === 'aoe' ? '광역' : '단일'}</span>
                                            </div>
                                        </div>
                                        {isSelected && <CheckCircle2 size={16} className="text-amber-400 shrink-0" />}
                                    </button>
                                );
                            })
                            )}
                        </div>
                    </div>

                    {/* 2단계: 특화 강화 효과 선택 */}
                    {selectedSkill && (
                        <div className="space-y-3 pt-2 border-t border-slate-800 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] text-amber-400 font-mono">2</span>
                                    특화 강화 효과 선택 ({selectedSkill.type})
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                    현재 누적: {currentCount}회 강화됨
                                </span>
                            </div>

                            {currentCount > 0 && (
                                <div className="bg-rose-950/40 border border-rose-700/50 p-3 rounded-xl space-y-2.5 shadow-md">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <span className="text-xs font-bold text-rose-300 block">
                                                현재 {currentTierName} +{currentCount}회 강화 적용됨
                                            </span>
                                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                강화를 취소하면 부여된 특화 효과가 해제되고 소모된 {currentTierName} 스킬 슬롯이 즉시 반환됩니다.
                                            </p>
                                        </div>
                                        {!showResetConfirm && (
                                            <button
                                                type="button"
                                                onClick={() => setShowResetConfirm(true)}
                                                className="px-3.5 py-2 bg-rose-900 hover:bg-rose-800 active:scale-95 text-rose-100 rounded-xl font-bold text-xs border border-rose-600 transition-all shrink-0 flex items-center gap-1.5 min-h-[44px] shadow-sm"
                                            >
                                                <RotateCcw size={14} />
                                                <span>강화 취소</span>
                                            </button>
                                        )}
                                    </div>

                                    {showResetConfirm && (
                                        <div className="p-3 bg-rose-950/90 rounded-xl border border-rose-600/80 space-y-2 animate-in fade-in duration-150">
                                            <p className="text-xs font-bold text-rose-200">
                                                정말로 [{selectedSkill.name}] 스킬의 {currentTierName} 강화를 취소하시겠습니까?
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleResetEnhance}
                                                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-extrabold text-xs rounded-lg transition-all min-h-[40px] shadow"
                                                >
                                                    예, 강화 취소 및 슬롯 반환
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowResetConfirm(false)}
                                                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-xs rounded-lg transition-all min-h-[40px]"
                                                >
                                                    아니오
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                             {/* 공격 스킬 전용 선택지 */}
                             {isAttack && (
                                 <div className="space-y-2">
                                     {/* 1) 계수 한계 돌파 */}
                                     <label
                                         onClick={() => setSelectedOption('scale_breakthrough')}
                                         className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                             selectedOption === 'scale_breakthrough'
                                                 ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                                                 : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                                         }`}
                                     >
                                         <input
                                             type="radio"
                                             name="enhance_option"
                                             checked={selectedOption === 'scale_breakthrough'}
                                             onChange={() => setSelectedOption('scale_breakthrough')}
                                             className="mt-1 text-amber-500 focus:ring-0"
                                         />
                                         <div className="flex-1 min-w-0">
                                             <div className="flex items-center justify-between">
                                                 <span className="text-xs font-bold text-white">계수 한계 돌파</span>
                                                 <span className="text-[10px] text-amber-400 font-bold">+{tierConfig.attackScaleBonus}% 증가</span>
                                             </div>
                                             <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                 스킬의 레벨별 공격력 계수 증가량이 강화 횟수당 +{tierConfig.attackScaleBonus}%씩 대폭 증가합니다.
                                             </p>
                                         </div>
                                     </label>

                                     {/* 파이널 클래스 전용 추가 옵션들 */}
                                     {isFinalTier && (
                                         <>
                                             {/* 2) 공격 범위 확장 (단일 스킬) 또는 광역 궁극 특화 3종 택1 (태생 광역 스킬) */}
                                             {(() => {
                                                 const isUnlocked = currentCount >= 10;
                                                 const isNativeAoE = selectedSkill.targetType === 'aoe' && !enhanceData.isAoEExpanded;
                                                 const isSingleConverted = enhanceData.isAoEExpanded;
                                                 const alreadyZone = Boolean(enhanceData.isBattlefieldZone);
                                                 const alreadyFocus = Boolean(enhanceData.isFocusFusion);
                                                 const alreadyAftershock = Boolean(enhanceData.isEchoAftershock);
                                                 const alreadyBuffZone = Boolean(enhanceData.buffZoneType);
                                                 const alreadyAoESpecial = alreadyZone || alreadyFocus || alreadyAftershock || alreadyBuffZone;

                                                 if (isNativeAoE) {
                                                     return (
                                                         <div className="space-y-2 p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/30">
                                                             <div className="flex items-center justify-between px-1">
                                                                 <span className="text-[11px] font-extrabold text-amber-300">
                                                                     광역 공격 궁극 특화 (택1)
                                                                 </span>
                                                                 <span className="text-[10px] text-amber-400 font-bold">
                                                                     {alreadyAoESpecial ? '특화 선택 완료됨' : '10회 강화 시 해금'}
                                                                 </span>
                                                             </div>

                                                             {/* 2-A) 지속 전장 결계 */}
                                                             <label
                                                                 onClick={() => {
                                                                     if (isUnlocked && !alreadyAoESpecial) setSelectedOption('aoe_battlefield_zone');
                                                                 }}
                                                                 className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all ${
                                                                     !isUnlocked || alreadyAoESpecial
                                                                         ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                         : selectedOption === 'aoe_battlefield_zone'
                                                                         ? 'bg-amber-950/40 border-amber-500 text-amber-200 cursor-pointer'
                                                                         : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                                 }`}
                                                             >
                                                                 <input
                                                                     type="radio"
                                                                     name="enhance_option"
                                                                     disabled={!isUnlocked || alreadyAoESpecial}
                                                                     checked={selectedOption === 'aoe_battlefield_zone'}
                                                                     onChange={() => setSelectedOption('aoe_battlefield_zone')}
                                                                     className="mt-1 text-amber-500 focus:ring-0"
                                                                 />
                                                                 <div className="flex-1 min-w-0">
                                                                     <div className="flex items-center justify-between">
                                                                         <span className="text-xs font-bold text-amber-300">지속 전장 결계</span>
                                                                         <span className="text-[10px] text-amber-400 font-bold">
                                                                             {alreadyZone ? '적용됨' : '매 턴 20% 지속 피해'}
                                                                         </span>
                                                                     </div>
                                                                     <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                         시전 후 2~3턴간 전장에 결계를 남겨, 매 턴 적 전체에게 원래 피해의 20% 지속 피해를 입힙니다.
                                                                     </p>
                                                                 </div>
                                                             </label>

                                                             {/* 2-B) 집중 융합 */}
                                                             <label
                                                                 onClick={() => {
                                                                     if (isUnlocked && !alreadyAoESpecial) setSelectedOption('aoe_focus_fusion');
                                                                 }}
                                                                 className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all ${
                                                                     !isUnlocked || alreadyAoESpecial
                                                                         ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                         : selectedOption === 'aoe_focus_fusion'
                                                                         ? 'bg-amber-950/40 border-amber-500 text-amber-200 cursor-pointer'
                                                                         : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                                 }`}
                                                             >
                                                                 <input
                                                                     type="radio"
                                                                     name="enhance_option"
                                                                     disabled={!isUnlocked || alreadyAoESpecial}
                                                                     checked={selectedOption === 'aoe_focus_fusion'}
                                                                     onChange={() => setSelectedOption('aoe_focus_fusion')}
                                                                     className="mt-1 text-amber-500 focus:ring-0"
                                                                 />
                                                                 <div className="flex-1 min-w-0">
                                                                     <div className="flex items-center justify-between">
                                                                         <span className="text-xs font-bold text-rose-300">집집중 융합</span>
                                                                         <span className="text-[10px] text-rose-400 font-bold">
                                                                             {alreadyFocus ? '적용됨' : '적 수 반비례 위력 증폭'}
                                                                         </span>
                                                                     </div>
                                                                     <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                         생존한 적 수에 반비례하여 화력을 집중시킵니다. 적 1명일 때 최종 피해 +50%, 2명일 때 +25% 증폭됩니다.
                                                                     </p>
                                                                 </div>
                                                             </label>

                                                             {/* 2-C) 신력 여진 */}
                                                             <label
                                                                 onClick={() => {
                                                                     if (isUnlocked && !alreadyAoESpecial) setSelectedOption('aoe_echo_aftershock');
                                                                 }}
                                                                 className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all ${
                                                                     !isUnlocked || alreadyAoESpecial
                                                                         ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                         : selectedOption === 'aoe_echo_aftershock'
                                                                         ? 'bg-amber-950/40 border-amber-500 text-amber-200 cursor-pointer'
                                                                         : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                                 }`}
                                                             >
                                                                 <input
                                                                     type="radio"
                                                                     name="enhance_option"
                                                                     disabled={!isUnlocked || alreadyAoESpecial}
                                                                     checked={selectedOption === 'aoe_echo_aftershock'}
                                                                     onChange={() => setSelectedOption('aoe_echo_aftershock')}
                                                                     className="mt-1 text-amber-500 focus:ring-0"
                                                                 />
                                                                 <div className="flex-1 min-w-0">
                                                                     <div className="flex items-center justify-between">
                                                                         <span className="text-xs font-bold text-orange-300">신력 여진</span>
                                                                         <span className="text-[10px] text-orange-400 font-bold">
                                                                             {alreadyAftershock ? '적용됨' : '즉시 추가 폭발 타격'}
                                                                         </span>
                                                                     </div>
                                                                     <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                         광역 공격 적중 직후 신력 여진이 일제히 폭발하여 원래 피해의 50% 추가 광역 타격을 즉시 가합니다.
                                                                     </p>
                                                                 </div>
                                                             </label>

                                                             {/* 2-D) 지속 회복 결계 */}
                                                             <div
                                                                 onClick={() => {
                                                                     if (isUnlocked && !alreadyAoESpecial) setSelectedOption('buff_battlefield_zone');
                                                                 }}
                                                                 className={`p-2.5 rounded-xl border flex flex-col gap-2 transition-all ${
                                                                     !isUnlocked || alreadyAoESpecial
                                                                         ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                         : selectedOption === 'buff_battlefield_zone'
                                                                         ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 cursor-pointer'
                                                                         : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                                 }`}
                                                             >
                                                                 <div className="flex items-start gap-2.5">
                                                                     <input
                                                                         type="radio"
                                                                         name="enhance_option"
                                                                         disabled={!isUnlocked || alreadyAoESpecial}
                                                                         checked={selectedOption === 'buff_battlefield_zone'}
                                                                         onChange={() => setSelectedOption('buff_battlefield_zone')}
                                                                         className="mt-1 text-emerald-500 focus:ring-0"
                                                                     />
                                                                     <div className="flex-1 min-w-0">
                                                                         <div className="flex items-center justify-between">
                                                                             <span className="text-xs font-bold text-emerald-300">지속 회복 결계</span>
                                                                             <span className="text-[10px] text-emerald-400 font-bold">
                                                                                 {alreadyBuffZone ? '적용됨' : '매 턴 아군 전체 회복'}
                                                                             </span>
                                                                         </div>
                                                                         <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                             시전 시 아군 전원에게 2~3턴간 매 턴 체력 또는 마나를 15%씩 지속 회복시키는 결계를 부여합니다.
                                                                         </p>
                                                                     </div>
                                                                 </div>

                                                                 {selectedOption === 'buff_battlefield_zone' && !alreadyAoESpecial && (
                                                                     <div className="mt-1 p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                                                                         <span className="text-slate-400 font-bold">지속 회복 종류 선택:</span>
                                                                         <div className="flex gap-2">
                                                                             <button
                                                                                 type="button"
                                                                                 onClick={(e) => { e.stopPropagation(); setExtraBuffZoneType('HP'); }}
                                                                                 className={`px-3 py-1 font-bold rounded border transition-all ${
                                                                                     extraBuffZoneType === 'HP'
                                                                                         ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200'
                                                                                         : 'bg-slate-900 border-slate-800 text-slate-500'
                                                                                 }`}
                                                                             >
                                                                                 매턴 체력 회복
                                                                             </button>
                                                                             <button
                                                                                 type="button"
                                                                                 onClick={(e) => { e.stopPropagation(); setExtraBuffZoneType('MP'); }}
                                                                                 className={`px-3 py-1 font-bold rounded border transition-all ${
                                                                                     extraBuffZoneType === 'MP'
                                                                                         ? 'bg-cyan-900/60 border-cyan-500 text-cyan-200'
                                                                                         : 'bg-slate-900 border-slate-800 text-slate-500'
                                                                                 }`}
                                                                             >
                                                                                 매턴 마나 회복
                                                                             </button>
                                                                         </div>
                                                                     </div>
                                                                 )}
                                                             </div>
                                                         </div>
                                                     );
                                                 }

                                                 return (
                                                     <label
                                                         onClick={() => {
                                                             if (isUnlocked && !isSingleConverted) setSelectedOption('aoe_expand');
                                                         }}
                                                         className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                                                             !isUnlocked || isSingleConverted
                                                                 ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                 : selectedOption === 'aoe_expand'
                                                                 ? 'bg-amber-950/40 border-amber-500 text-amber-200 cursor-pointer'
                                                                 : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                         }`}
                                                     >
                                                         <input
                                                             type="radio"
                                                             name="enhance_option"
                                                             disabled={!isUnlocked || isSingleConverted}
                                                             checked={selectedOption === 'aoe_expand'}
                                                             onChange={() => setSelectedOption('aoe_expand')}
                                                             className="mt-1 text-amber-500 focus:ring-0"
                                                         />
                                                         <div className="flex-1 min-w-0">
                                                             <div className="flex items-center justify-between">
                                                                 <span className="text-xs font-bold text-white">공격 범위 확장 (광역화)</span>
                                                                 <span className="text-[10px] text-rose-400 font-bold">
                                                                     {isSingleConverted ? '이미 광역 적용됨' : '10회 강화 시 해금'}
                                                                 </span>
                                                             </div>
                                                             <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                 단일 적 대상 스킬을 적 전체 광역 공격으로 범위를 확장합니다. (해당 스킬을 10번 이상 강화한 경우 선택 가능)
                                                             </p>
                                                         </div>
                                                     </label>
                                                 );
                                             })()}

                                             {/* 3) 특수 관통 효과 부여 */}
                                             <label
                                                 onClick={() => setSelectedOption('armor_penetration')}
                                                 className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                                     selectedOption === 'armor_penetration'
                                                         ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                                                         : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                                                 }`}
                                             >
                                                 <input
                                                     type="radio"
                                                     name="enhance_option"
                                                     checked={selectedOption === 'armor_penetration'}
                                                     onChange={() => setSelectedOption('armor_penetration')}
                                                     className="mt-1 text-amber-500 focus:ring-0"
                                                 />
                                                 <div className="flex-1 min-w-0">
                                                     <div className="flex items-center justify-between">
                                                         <span className="text-xs font-bold text-white">특수 관통 효과 부여</span>
                                                         <span className="text-[10px] text-amber-400 font-bold">방어 관통 +5%</span>
                                                     </div>
                                                     <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                         적의 방어력을 관통하여 실질적인 타격 피해를 증폭시킵니다. (강화 횟수당 방어 관통 5% 누적 증가)
                                                     </p>
                                                 </div>
                                             </label>

                                             {/* 4) 원하는 디버프/버프 슬롯 추가 */}
                                             {(() => {
                                                 const alreadyAdded = Boolean(enhanceData.addedEffect);
                                                 return (
                                                     <div
                                                         onClick={() => {
                                                             if (!alreadyAdded) setSelectedOption('added_effect');
                                                         }}
                                                         className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                                                             alreadyAdded
                                                                 ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                 : selectedOption === 'added_effect'
                                                                 ? 'bg-amber-950/40 border-amber-500 text-amber-200 cursor-pointer'
                                                                 : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                         }`}
                                                     >
                                                         <div className="flex items-start gap-3">
                                                             <input
                                                                 type="radio"
                                                                 name="enhance_option"
                                                                 disabled={alreadyAdded}
                                                                 checked={selectedOption === 'added_effect'}
                                                                 onChange={() => setSelectedOption('added_effect')}
                                                                 className="mt-1 text-amber-500 focus:ring-0"
                                                             />
                                                             <div className="flex-1 min-w-0">
                                                                 <div className="flex items-center justify-between">
                                                                     <span className="text-xs font-bold text-white">부가 효과 슬롯 추가</span>
                                                                     <span className="text-[10px] text-amber-400 font-bold">
                                                                         {alreadyAdded ? '1회 추가 완료됨' : '1회 한정'}
                                                                     </span>
                                                                 </div>
                                                                 <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                     공격 적중 시 발동할 버프 또는 디버프 효과 슬롯 1개를 스킬에 새롭게 추가합니다.
                                                                 </p>
                                                             </div>
                                                         </div>

                                                         {selectedOption === 'added_effect' && !alreadyAdded && (
                                                             <div className="mt-1 p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                                                                 <div className="flex gap-2">
                                                                     <button
                                                                         type="button"
                                                                         onClick={() => setExtraOptionType('buff')}
                                                                         className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                                                             extraOptionType === 'buff'
                                                                                 ? 'bg-emerald-900/50 border-emerald-500 text-emerald-200'
                                                                                 : 'bg-slate-900 border-slate-800 text-slate-500'
                                                                         }`}
                                                                     >
                                                                         버프 슬롯 추가
                                                                     </button>
                                                                     <button
                                                                         type="button"
                                                                         onClick={() => setExtraOptionType('debuff')}
                                                                         className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                                                             extraOptionType === 'debuff'
                                                                                 ? 'bg-purple-900/50 border-purple-500 text-purple-200'
                                                                                 : 'bg-slate-900 border-slate-800 text-slate-500'
                                                                         }`}
                                                                     >
                                                                         디버프 슬롯 추가
                                                                     </button>
                                                                 </div>
                                                                 {extraOptionType === 'buff' ? (
                                                                     <div className="flex items-center justify-between text-xs pt-1">
                                                                         <span className="text-slate-400 font-bold">부여할 버프:</span>
                                                                         <select
                                                                             value={extraBuffStat}
                                                                             onChange={(e) => setExtraBuffStat(e.target.value)}
                                                                             className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs outline-none"
                                                                         >
                                                                             {BUFF_SLOT_OPTIONS.map(opt => (
                                                                                 <option key={opt.key} value={opt.key}>{opt.label}</option>
                                                                             ))}
                                                                         </select>
                                                                     </div>
                                                                 ) : (
                                                                     <div className="flex items-center justify-between text-xs pt-1">
                                                                         <span className="text-slate-400 font-bold">부여할 디버프:</span>
                                                                         <select
                                                                             value={extraDebuffStat}
                                                                             onChange={(e) => setExtraDebuffStat(e.target.value)}
                                                                             className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs outline-none"
                                                                         >
                                                                             {DEBUFF_SLOT_OPTIONS.map(opt => (
                                                                                 <option key={opt.key} value={opt.key}>{opt.label}</option>
                                                                             ))}
                                                                         </select>
                                                                     </div>
                                                                 )}
                                                             </div>
                                                         )}
                                                     </div>
                                                 );
                                             })()}
                                         </>
                                     )}

                                     {/* 5) MP 소모 감소 (공통) */}
                                     <label
                                         onClick={() => setSelectedOption('mp_cost_reduction')}
                                         className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                             selectedOption === 'mp_cost_reduction'
                                                 ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                                                 : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                                         }`}
                                     >
                                         <input
                                             type="radio"
                                             name="enhance_option"
                                             checked={selectedOption === 'mp_cost_reduction'}
                                             onChange={() => setSelectedOption('mp_cost_reduction')}
                                             className="mt-1 text-amber-500 focus:ring-0"
                                         />
                                         <div className="flex-1 min-w-0">
                                             <div className="flex items-center justify-between">
                                                 <span className="text-xs font-bold text-cyan-300">MP 소모 감소</span>
                                                 <span className="text-[10px] text-cyan-400 font-bold">
                                                     스킬 레벨당 MP -{tierConfig.mpReductionAmount} 추가 감소
                                                 </span>
                                             </div>
                                             <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                 스킬 레벨에 따른 MP 감소량이 증가합니다. 현재 스킬 레벨(Lv.{selectedSkill.level || 1}) 기준 즉시 {(selectedSkill.level || 1) * tierConfig.mpReductionAmount} MP가 감소하며, 이후 레벨업 시마다 추가로 감소합니다. (현재 MP: {selectedSkill.mpCost})
                                             </p>
                                         </div>
                                     </label>
                                 </div>
                             )}

                            {/* 버프 및 회복 스킬 전용 선택지 */}
                            {isBuff && (
                                <div className="space-y-2">
                                    {/* 1) 버프 비율 계수 증가 (공통) */}
                                    <label
                                        onClick={() => setSelectedOption('buff_scale_increase')}
                                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                            selectedOption === 'buff_scale_increase'
                                                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="enhance_option"
                                            checked={selectedOption === 'buff_scale_increase'}
                                            onChange={() => setSelectedOption('buff_scale_increase')}
                                            className="mt-1 text-emerald-500 focus:ring-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-white">버프 비율 계수 증가</span>
                                                <span className="text-[10px] text-emerald-400 font-bold">+{tierConfig.buffScaleBonus}% 증가</span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                스킬 레벨별 증가량이 강화 횟수당 +{tierConfig.buffScaleBonus}%씩 증가합니다.
                                            </p>
                                        </div>
                                    </label>

                                    {/* 파이널 클래스 전용 추가 옵션들 */}
                                    {isFinalTier && (
                                        <>
                                            {/* 2) 아군 전체 광역화 (단일) 혹은 광역 버프 궁극 특화 3종 택1 (태생 광역) */}
                                            {(() => {
                                                const isUnlocked = currentCount >= 10;
                                                const isNativeAoE = selectedSkill.targetType === 'aoe' && !enhanceData.isBuffAlliesExpanded;
                                                const isSingleConverted = enhanceData.isBuffAlliesExpanded;
                                                const alreadyZone = Boolean(enhanceData.isBattlefieldZone || enhanceData.buffZoneType);
                                                const alreadyCleanse = Boolean(enhanceData.isMassCleanse);
                                                const alreadyTranscend = Boolean(enhanceData.isAuraTranscend);
                                                const alreadyAoESpecial = alreadyZone || alreadyCleanse || alreadyTranscend;

                                                if (isNativeAoE) {
                                                    return (
                                                        <div className="space-y-2 p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/30">
                                                            <div className="flex items-center justify-between px-1">
                                                                <span className="text-[11px] font-extrabold text-emerald-300">
                                                                    광역 버프 궁극 특화 (택1)
                                                                </span>
                                                                <span className="text-[10px] text-emerald-400 font-bold">
                                                                    {alreadyAoESpecial ? '특화 선택 완료됨' : '10회 강화 시 해금'}
                                                                </span>
                                                            </div>

                                                            {/* 1-A) 지속 회복 결계 */}
                                                            <div
                                                                onClick={() => {
                                                                    if (isUnlocked && !alreadyAoESpecial) setSelectedOption('buff_battlefield_zone');
                                                                }}
                                                                className={`p-2.5 rounded-xl border flex flex-col gap-2 transition-all ${
                                                                    !isUnlocked || alreadyAoESpecial
                                                                        ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                        : selectedOption === 'buff_battlefield_zone'
                                                                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 cursor-pointer'
                                                                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                                }`}
                                                            >
                                                                <div className="flex items-start gap-2.5">
                                                                    <input
                                                                        type="radio"
                                                                        name="enhance_option"
                                                                        disabled={!isUnlocked || alreadyAoESpecial}
                                                                        checked={selectedOption === 'buff_battlefield_zone'}
                                                                        onChange={() => setSelectedOption('buff_battlefield_zone')}
                                                                        className="mt-1 text-emerald-500 focus:ring-0"
                                                                    />
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-xs font-bold text-emerald-300">지속 회복 결계</span>
                                                                            <span className="text-[10px] text-emerald-400 font-bold">
                                                                                {alreadyZone ? '적용됨' : '매 턴 아군 전체 회복'}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                            시전 시 아군 전원에게 2~3턴간 매 턴 체력 또는 마나를 15%씩 지속 회복시키는 결계를 부여합니다.
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {selectedOption === 'buff_battlefield_zone' && !alreadyAoESpecial && (
                                                                    <div className="mt-1 p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                                                                        <span className="text-slate-400 font-bold">지속 회복 종류 선택:</span>
                                                                        <div className="flex gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => { e.stopPropagation(); setExtraBuffZoneType('HP'); }}
                                                                                className={`px-3 py-1 font-bold rounded border transition-all ${
                                                                                    extraBuffZoneType === 'HP'
                                                                                        ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200'
                                                                                        : 'bg-slate-900 border-slate-800 text-slate-500'
                                                                                }`}
                                                                            >
                                                                                매턴 체력 회복
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => { e.stopPropagation(); setExtraBuffZoneType('MP'); }}
                                                                                className={`px-3 py-1 font-bold rounded border transition-all ${
                                                                                    extraBuffZoneType === 'MP'
                                                                                        ? 'bg-cyan-900/60 border-cyan-500 text-cyan-200'
                                                                                        : 'bg-slate-900 border-slate-800 text-slate-500'
                                                                                }`}
                                                                            >
                                                                                매턴 마나 회복
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* 1-B) 일제 정화 */}
                                                            <label
                                                                onClick={() => {
                                                                    if (isUnlocked && !alreadyAoESpecial) setSelectedOption('buff_mass_cleanse');
                                                                }}
                                                                className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all ${
                                                                    !isUnlocked || alreadyAoESpecial
                                                                        ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                        : selectedOption === 'buff_mass_cleanse'
                                                                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 cursor-pointer'
                                                                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name="enhance_option"
                                                                    disabled={!isUnlocked || alreadyAoESpecial}
                                                                    checked={selectedOption === 'buff_mass_cleanse'}
                                                                    onChange={() => setSelectedOption('buff_mass_cleanse')}
                                                                    className="mt-1 text-emerald-500 focus:ring-0"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-xs font-bold text-teal-300">일제 정화</span>
                                                                        <span className="text-[10px] text-teal-400 font-bold">
                                                                            {alreadyCleanse ? '적용됨' : '아군 전체 상태이상 해제'}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                        버프 시전과 동시에 아군 전체에게 걸린 모든 해로운 상태이상과 능력치 약화 디버프를 즉시 정화합니다.
                                                                    </p>
                                                                </div>
                                                            </label>

                                                            {/* 1-C) 기운 초월 */}
                                                            <label
                                                                onClick={() => {
                                                                    if (isUnlocked && !alreadyAoESpecial) setSelectedOption('buff_aura_transcend');
                                                                }}
                                                                className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all ${
                                                                    !isUnlocked || alreadyAoESpecial
                                                                        ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                        : selectedOption === 'buff_aura_transcend'
                                                                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 cursor-pointer'
                                                                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name="enhance_option"
                                                                    disabled={!isUnlocked || alreadyAoESpecial}
                                                                    checked={selectedOption === 'buff_aura_transcend'}
                                                                    onChange={() => setSelectedOption('buff_aura_transcend')}
                                                                    className="mt-1 text-emerald-500 focus:ring-0"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-xs font-bold text-amber-300">기운 초월</span>
                                                                        <span className="text-[10px] text-amber-400 font-bold">
                                                                            {alreadyTranscend ? '적용됨' : '기운 불일치 감소 무시'}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                        양과 음의 기운 한계를 초월하여, 다른 기운을 가진 아군에게도 50% 감소 없이 100% 온전한 효율로 버프를 적용합니다.
                                                                    </p>
                                                                </div>
                                                            </label>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <label
                                                        onClick={() => {
                                                            if (isUnlocked && !isSingleConverted) setSelectedOption('buff_aoe_expand');
                                                        }}
                                                        className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                                                            !isUnlocked || isSingleConverted
                                                                ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                : selectedOption === 'buff_aoe_expand'
                                                                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 cursor-pointer'
                                                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                        }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="enhance_option"
                                                            disabled={!isUnlocked || isSingleConverted}
                                                            checked={selectedOption === 'buff_aoe_expand'}
                                                            onChange={() => setSelectedOption('buff_aoe_expand')}
                                                            className="mt-1 text-emerald-500 focus:ring-0"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-bold text-white">아군 전체 광역화</span>
                                                                <span className="text-[10px] text-rose-400 font-bold">
                                                                    {isSingleConverted ? '이미 광역 적용됨' : '10회 강화 시 해금'}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                단일 대상 버프 및 회복 스킬을 아군 파티원 전체에게 동시에 부여합니다. (해당 스킬을 10번 이상 강화 시 선택 가능)
                                                            </p>
                                                        </div>
                                                    </label>
                                                );
                                            })()}

                                            {/* 3) 초과 치유 보호막 전환 */}
                                            {(() => {
                                                const alreadyOverheal = Boolean(enhanceData.overhealShield);
                                                return (
                                                    <label
                                                        onClick={() => {
                                                            if (!alreadyOverheal) setSelectedOption('overheal_shield');
                                                        }}
                                                        className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                                                            alreadyOverheal
                                                                ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                : selectedOption === 'overheal_shield'
                                                                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 cursor-pointer'
                                                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                        }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="enhance_option"
                                                            disabled={alreadyOverheal}
                                                            checked={selectedOption === 'overheal_shield'}
                                                            onChange={() => setSelectedOption('overheal_shield')}
                                                            className="mt-1 text-emerald-500 focus:ring-0"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-bold text-white">초과 치유 보호막 전환</span>
                                                                <span className="text-[10px] text-emerald-400 font-bold">
                                                                    {alreadyOverheal ? '적용 완료됨' : '1회 한정'}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                체력이 가득 찬 아군을 치유할 경우, 초과된 회복량만큼 단단한 마나 보호막을 생성합니다.
                                                            </p>
                                                        </div>
                                                    </label>
                                                );
                                            })()}

                                            {/* 4) 원하는 버프효과 슬롯 추가 */}
                                            {(() => {
                                                const alreadyAdded = Boolean(enhanceData.addedBuffSlot);
                                                return (
                                                    <div
                                                        onClick={() => {
                                                            if (!alreadyAdded) setSelectedOption('added_buff_slot');
                                                        }}
                                                        className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                                                            alreadyAdded
                                                                ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                : selectedOption === 'added_buff_slot'
                                                                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 cursor-pointer'
                                                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                        }`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="radio"
                                                                name="enhance_option"
                                                                disabled={alreadyAdded}
                                                                checked={selectedOption === 'added_buff_slot'}
                                                                onChange={() => setSelectedOption('added_buff_slot')}
                                                                className="mt-1 text-emerald-500 focus:ring-0"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-white">원하는 버프효과 슬롯 추가</span>
                                                                    <span className="text-[10px] text-emerald-400 font-bold">
                                                                        {alreadyAdded ? '추가 완료됨' : '1회 한정'}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                    기존 효과와 겹치지 않는 새로운 버프 슬롯 1개를 스킬에 결합합니다.
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {selectedOption === 'added_buff_slot' && !alreadyAdded && (
                                                            <div className="mt-1 p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                                                                <span className="text-slate-400 font-bold">추가할 버프:</span>
                                                                <select
                                                                    value={extraBuffStat}
                                                                    onChange={(e) => setExtraBuffStat(e.target.value)}
                                                                    className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs outline-none"
                                                                >
                                                                    {BUFF_SLOT_OPTIONS.map(opt => (
                                                                        <option key={opt.key} value={opt.key}>{opt.label}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* 5) 지속 턴 수 연장 */}
                                            {(() => {
                                                const alreadyExtended = Boolean(enhanceData.durationExtended);
                                                return (
                                                    <label
                                                        onClick={() => {
                                                            if (!alreadyExtended) setSelectedOption('duration_extend');
                                                        }}
                                                        className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                                                            alreadyExtended
                                                                ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                : selectedOption === 'duration_extend'
                                                                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 cursor-pointer'
                                                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                        }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="enhance_option"
                                                            disabled={alreadyExtended}
                                                            checked={selectedOption === 'duration_extend'}
                                                            onChange={() => setSelectedOption('duration_extend')}
                                                            className="mt-1 text-emerald-500 focus:ring-0"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-bold text-white">지속 턴 수 연장</span>
                                                                <span className="text-[10px] text-emerald-400 font-bold">
                                                                    {alreadyExtended ? '연장 완료됨' : '+1턴 연장'}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                버프의 유지 시간을 기본 3턴에서 4턴으로 연장합니다. (1회만 선택 가능)
                                                            </p>
                                                        </div>
                                                    </label>
                                                );
                                            })()}
                                        </>
                                    )}

                                    {/* 6) MP 소모 감소 (공통) */}
                                    <label
                                        onClick={() => setSelectedOption('mp_cost_reduction')}
                                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                            selectedOption === 'mp_cost_reduction'
                                                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="enhance_option"
                                            checked={selectedOption === 'mp_cost_reduction'}
                                            onChange={() => setSelectedOption('mp_cost_reduction')}
                                            className="mt-1 text-emerald-500 focus:ring-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-cyan-300">MP 소모 감소</span>
                                                <span className="text-[10px] text-cyan-400 font-bold">
                                                    스킬 레벨당 MP -{tierConfig.mpReductionAmount} 추가 감소
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                스킬 레벨에 따른 MP 감소량이 증가합니다. 현재 스킬 레벨(Lv.{selectedSkill.level || 1}) 기준 즉시 {(selectedSkill.level || 1) * tierConfig.mpReductionAmount} MP가 감소하며, 이후 레벨업 시마다 추가로 감소합니다. (현재 MP: {selectedSkill.mpCost})
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            )}

                            {/* 디버프 스킬 전용 선택지 */}
                            {isDebuff && (
                                <div className="space-y-2">
                                    {/* 파이널 클래스 전용 추가 옵션들 */}
                                    {isFinalTier && (
                                        <>
                                            {/* 1) 상태이상 성공률 증가 */}
                                            <label
                                                onClick={() => setSelectedOption('ctrl_success_bonus')}
                                                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                                    selectedOption === 'ctrl_success_bonus'
                                                        ? 'bg-purple-950/40 border-purple-500 text-purple-200'
                                                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="enhance_option"
                                                    checked={selectedOption === 'ctrl_success_bonus'}
                                                    onChange={() => setSelectedOption('ctrl_success_bonus')}
                                                    className="mt-1 text-purple-500 focus:ring-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-white">상태이상 성공률 증가</span>
                                                        <span className="text-[10px] text-purple-400 font-bold">제어력 보너스 +10</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                        제어력 판정 보너스를 부여하여 적의 상태이상 저항을 효과적으로 무력화합니다.
                                                    </p>
                                                </div>
                                            </label>

                                            {/* 2) 연쇄 약화 */}
                                            {(() => {
                                                const alreadyChain = Boolean(enhanceData.chainWeakening);
                                                return (
                                                    <label
                                                        onClick={() => {
                                                            if (!alreadyChain) setSelectedOption('chain_weakening');
                                                        }}
                                                        className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                                                            alreadyChain
                                                                ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                : selectedOption === 'chain_weakening'
                                                                ? 'bg-purple-950/40 border-purple-500 text-purple-200 cursor-pointer'
                                                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                        }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="enhance_option"
                                                            disabled={alreadyChain}
                                                            checked={selectedOption === 'chain_weakening'}
                                                            onChange={() => setSelectedOption('chain_weakening')}
                                                            className="mt-1 text-purple-500 focus:ring-0"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-bold text-white">연쇄 약화</span>
                                                                <span className="text-[10px] text-purple-400 font-bold">
                                                                    {alreadyChain ? '적용 완료됨' : '지속 피해 증폭'}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                출혈, 중독, 화상 등 지속 피해의 틱당 피해량을 공격력에 비례하여 크게 증폭시킵니다.
                                                            </p>
                                                        </div>
                                                    </label>
                                                );
                                            })()}

                                            {/* 3) 적 행동 봉쇄 강화 */}
                                            {(() => {
                                                const alreadyExt = Boolean(enhanceData.debuffDurationExtended);
                                                return (
                                                    <label
                                                        onClick={() => {
                                                            if (!alreadyExt) setSelectedOption('debuff_duration_extend');
                                                        }}
                                                        className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                                                            alreadyExt
                                                                ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                : selectedOption === 'debuff_duration_extend'
                                                                ? 'bg-purple-950/40 border-purple-500 text-purple-200 cursor-pointer'
                                                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                        }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="enhance_option"
                                                            disabled={alreadyExt}
                                                            checked={selectedOption === 'debuff_duration_extend'}
                                                            onChange={() => setSelectedOption('debuff_duration_extend')}
                                                            className="mt-1 text-purple-500 focus:ring-0"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-bold text-white">적 행동 봉쇄 강화</span>
                                                                <span className="text-[10px] text-purple-400 font-bold">
                                                                    {alreadyExt ? '연장 완료됨' : '+1턴 연장'}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                기절, 침묵, 수면, 빙결 등 행동 불가 디버프의 지속 시간을 +1턴 연장합니다. (1회만 가능)
                                                            </p>
                                                        </div>
                                                    </label>
                                                );
                                            })()}

                                            {/* 4) 단일 -> 광역 전환 (단일 스킬) 혹은 광역 디버프 궁극 특화 3종 택1 (태생 광역 스킬) */}
                                            {(() => {
                                                const isUnlocked = currentCount >= 10;
                                                const isNativeAoE = selectedSkill.targetType === 'aoe' && !enhanceData.isDebuffAoEExpanded;
                                                const isSingleConverted = enhanceData.isDebuffAoEExpanded;
                                                const alreadyZone = Boolean(enhanceData.isBattlefieldZone);
                                                const alreadyErosion = Boolean(enhanceData.isAuraErosion);
                                                const alreadyShatter = Boolean(enhanceData.isDefenseShatter);
                                                const alreadyAoESpecial = alreadyZone || alreadyErosion || alreadyShatter;

                                                if (isNativeAoE) {
                                                    return (
                                                        <div className="space-y-2 p-2.5 rounded-xl bg-slate-950/80 border border-purple-500/30">
                                                            <div className="flex items-center justify-between px-1">
                                                                <span className="text-[11px] font-extrabold text-purple-300">
                                                                    광역 디버프 궁극 특화 (택1)
                                                                </span>
                                                                <span className="text-[10px] text-purple-400 font-bold">
                                                                    {alreadyAoESpecial ? '특화 선택 완료됨' : '10회 강화 시 해금'}
                                                                </span>
                                                            </div>

                                                            {/* 4-A) 지속 전장 결계 */}
                                                            <label
                                                                onClick={() => {
                                                                    if (isUnlocked && !alreadyAoESpecial) setSelectedOption('debuff_battlefield_zone');
                                                                }}
                                                                className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all ${
                                                                    !isUnlocked || alreadyAoESpecial
                                                                        ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                        : selectedOption === 'debuff_battlefield_zone'
                                                                        ? 'bg-purple-950/40 border-purple-500 text-purple-200 cursor-pointer'
                                                                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name="enhance_option"
                                                                    disabled={!isUnlocked || alreadyAoESpecial}
                                                                    checked={selectedOption === 'debuff_battlefield_zone'}
                                                                    onChange={() => setSelectedOption('debuff_battlefield_zone')}
                                                                    className="mt-1 text-purple-500 focus:ring-0"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-xs font-bold text-purple-300">지속 전장 결계</span>
                                                                        <span className="text-[10px] text-purple-400 font-bold">
                                                                            {alreadyZone ? '적용됨' : '매 턴 적 전체 지속 피해'}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                        시전 시 2~3턴간 유지되는 약화 결계를 펼쳐 매 턴 적 전체에게 지속 피해를 입힙니다.
                                                                    </p>
                                                                </div>
                                                            </label>

                                                            {/* 4-B) 기운 잠식 */}
                                                            <label
                                                                onClick={() => {
                                                                    if (isUnlocked && !alreadyAoESpecial) setSelectedOption('debuff_aura_erosion');
                                                                }}
                                                                className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all ${
                                                                    !isUnlocked || alreadyAoESpecial
                                                                        ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                        : selectedOption === 'debuff_aura_erosion'
                                                                        ? 'bg-purple-950/40 border-purple-500 text-purple-200 cursor-pointer'
                                                                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name="enhance_option"
                                                                    disabled={!isUnlocked || alreadyAoESpecial}
                                                                    checked={selectedOption === 'debuff_aura_erosion'}
                                                                    onChange={() => setSelectedOption('debuff_aura_erosion')}
                                                                    className="mt-1 text-purple-500 focus:ring-0"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-xs font-bold text-fuchsia-300">기운 잠식</span>
                                                                        <span className="text-[10px] text-fuchsia-400 font-bold">
                                                                            {alreadyErosion ? '적용됨' : '동일 기운 저항 무시'}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                        적의 기운 내성을 강제로 잠식하여, 같은 기운을 가진 적에게도 50% 감소 없이 100% 효율로 디버프를 적용합니다.
                                                                    </p>
                                                                </div>
                                                            </label>

                                                            {/* 4-C) 방어 붕괴 */}
                                                            <label
                                                                onClick={() => {
                                                                    if (isUnlocked && !alreadyAoESpecial) setSelectedOption('debuff_defense_shatter');
                                                                }}
                                                                className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all ${
                                                                    !isUnlocked || alreadyAoESpecial
                                                                        ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                        : selectedOption === 'debuff_defense_shatter'
                                                                        ? 'bg-purple-950/40 border-purple-500 text-purple-200 cursor-pointer'
                                                                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name="enhance_option"
                                                                    disabled={!isUnlocked || alreadyAoESpecial}
                                                                    checked={selectedOption === 'debuff_defense_shatter'}
                                                                    onChange={() => setSelectedOption('debuff_defense_shatter')}
                                                                    className="mt-1 text-purple-500 focus:ring-0"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-xs font-bold text-rose-300">방어 붕괴</span>
                                                                        <span className="text-[10px] text-rose-400 font-bold">
                                                                            {alreadyShatter ? '적용됨' : '적 전체 보호막·버프 해제'}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                        디버프 시전과 동시에 적 전체의 보호막 또는 이로운 능력치 강화 버프를 1개 즉시 파괴합니다.
                                                                    </p>
                                                                </div>
                                                            </label>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <label
                                                        onClick={() => {
                                                            if (isUnlocked && !isSingleConverted) setSelectedOption('debuff_aoe_expand');
                                                        }}
                                                        className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                                                            !isUnlocked || isSingleConverted
                                                                ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                : selectedOption === 'debuff_aoe_expand'
                                                                ? 'bg-purple-950/40 border-purple-500 text-purple-200 cursor-pointer'
                                                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                        }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="enhance_option"
                                                            disabled={!isUnlocked || isSingleConverted}
                                                            checked={selectedOption === 'debuff_aoe_expand'}
                                                            onChange={() => setSelectedOption('debuff_aoe_expand')}
                                                            className="mt-1 text-purple-500 focus:ring-0"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-bold text-white">단일 → 광역 전환</span>
                                                                <span className="text-[10px] text-rose-400 font-bold">
                                                                    {isSingleConverted ? '이미 광역 적용됨' : '10회 강화 시 해금'}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                단일 대상 디버프를 적 전체 대상 광역 디버프로 전환합니다. (해당 스킬을 10번 이상 강화한 경우 선택 가능)
                                                            </p>
                                                        </div>
                                                    </label>
                                                );
                                            })()}
                                        </>
                                    )}

                                    {/* 5) 디버프 비율 스킬레벨별 증가 */}
                                    <label
                                        onClick={() => setSelectedOption('debuff_scale_increase')}
                                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                            selectedOption === 'debuff_scale_increase'
                                                ? 'bg-purple-950/40 border-purple-500 text-purple-200'
                                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="enhance_option"
                                            checked={selectedOption === 'debuff_scale_increase'}
                                            onChange={() => setSelectedOption('debuff_scale_increase')}
                                            className="mt-1 text-purple-500 focus:ring-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-white">디버프 비율 스킬 레벨별 증가</span>
                                                <span className="text-[10px] text-purple-400 font-bold">+{tierConfig.buffScaleBonus}% 증가 (최대 90%)</span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                디버프 감소 수치가 스킬 레벨당 +{tierConfig.buffScaleBonus}%씩 증가합니다. (디버프 비율은 밸런스를 위해 최대 90%까지만 제한 설정)
                                            </p>
                                        </div>
                                    </label>

                                    {/* 6) MP 소모 감소 (스킬 레벨 비례 감소량 증가) */}
                                    <label
                                        onClick={() => setSelectedOption('mp_cost_reduction')}
                                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                            selectedOption === 'mp_cost_reduction'
                                                ? 'bg-purple-950/40 border-purple-500 text-purple-200'
                                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="enhance_option"
                                            checked={selectedOption === 'mp_cost_reduction'}
                                            onChange={() => setSelectedOption('mp_cost_reduction')}
                                            className="mt-1 text-purple-500 focus:ring-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-cyan-300">MP 소모 감소</span>
                                                <span className="text-[10px] text-cyan-400 font-bold">
                                                    스킬 레벨당 MP -{tierConfig.mpReductionAmount} 추가 감소
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                스킬 레벨에 따른 MP 감소량이 증가합니다. 현재 스킬 레벨(Lv.{selectedSkill.level || 1}) 기준 즉시 {(selectedSkill.level || 1) * tierConfig.mpReductionAmount} MP가 감소하며, 이후 레벨업 시마다 추가로 감소합니다. (현재 MP: {selectedSkill.mpCost})
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            )}

                            {/* 패시브 스킬 전용 선택지 */}
                            {isPassive && (
                                <div className="space-y-2">
                                    {/* 1) 수치 한계 돌파 (스탯 증폭) */}
                                    <label
                                        onClick={() => setSelectedOption('passive_scale_breakthrough')}
                                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                            selectedOption === 'passive_scale_breakthrough'
                                                ? 'bg-blue-950/40 border-blue-500 text-blue-200'
                                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="enhance_option"
                                            checked={selectedOption === 'passive_scale_breakthrough'}
                                            onChange={() => setSelectedOption('passive_scale_breakthrough')}
                                            className="mt-1 text-blue-500 focus:ring-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-white">수치 한계 돌파</span>
                                                <span className="text-[10px] text-blue-400 font-bold">+{tierConfig.buffScaleBonus}% 증가</span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                패시브 스킬의 스킬 레벨별 증가량이 강화 횟수당 +{tierConfig.buffScaleBonus}%씩 증가합니다.
                                            </p>
                                        </div>
                                    </label>

                                    {/* 파이널 클래스 전용 추가 옵션들 */}
                                    {isFinalTier && (
                                        <>
                                            {/* 2) 전투 보조 슬롯 결합 */}
                                            {(() => {
                                                const alreadyAdded = Boolean(enhanceData.passiveCombatSlot);
                                                const isDisabled = alreadyAdded || isShinryokuSpecialPassive;
                                                return (
                                                    <div
                                                        onClick={() => {
                                                            if (!isDisabled) setSelectedOption('passive_added_combat_slot');
                                                        }}
                                                        className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                                                            isDisabled
                                                                ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                : selectedOption === 'passive_added_combat_slot'
                                                                ? 'bg-blue-950/40 border-blue-500 text-blue-200 cursor-pointer'
                                                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                        }`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="radio"
                                                                name="enhance_option"
                                                                disabled={isDisabled}
                                                                checked={selectedOption === 'passive_added_combat_slot'}
                                                                onChange={() => setSelectedOption('passive_added_combat_slot')}
                                                                className="mt-1 text-blue-500 focus:ring-0"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-white">전투 보조 슬롯 결합</span>
                                                                    <span className="text-[10px] text-amber-400 font-bold">
                                                                        {isShinryokuSpecialPassive ? '신력개방 전용 (수치 한계 돌파만 가능)' : (alreadyAdded ? '결합 완료됨' : '1회 한정')}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                    치명타율, 치명타 피해량, 명중률, 회피율, 상태이상 저항 중 원하는 전투 슬롯 1개를 결합합니다.
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {selectedOption === 'passive_added_combat_slot' && !isDisabled && (
                                                            <div className="mt-1 p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                                                                <span className="text-slate-400 font-bold">결합할 슬롯:</span>
                                                                <select
                                                                    value={extraPassiveCombatStat}
                                                                    onChange={(e) => setExtraPassiveCombatStat(e.target.value)}
                                                                    className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs outline-none"
                                                                >
                                                                    <option value="치명타율 +5%">치명타율 +5%</option>
                                                                    <option value="치명타 피해량 +15%">치명타 피해량 +15%</option>
                                                                    <option value="명중률 +10%">명중률 +10%</option>
                                                                    <option value="회피율 +10%">회피율 +10%</option>
                                                                    <option value="상태이상 저항 +15%">상태이상 저항 +15%</option>
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* 3) 신력 및 속성 공명 */}
                                            {(() => {
                                                const alreadyResonance = Boolean(enhanceData.passiveElementalResonance);
                                                const isDisabled = alreadyResonance || isShinryokuSpecialPassive;
                                                return (
                                                    <div
                                                        onClick={() => {
                                                            if (!isDisabled) setSelectedOption('passive_elemental_resonance');
                                                        }}
                                                        className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                                                            isDisabled
                                                                ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                : selectedOption === 'passive_elemental_resonance'
                                                                ? 'bg-blue-950/40 border-blue-500 text-blue-200 cursor-pointer'
                                                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                        }`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="radio"
                                                                name="enhance_option"
                                                                disabled={isDisabled}
                                                                checked={selectedOption === 'passive_elemental_resonance'}
                                                                onChange={() => setSelectedOption('passive_elemental_resonance')}
                                                                className="mt-1 text-blue-500 focus:ring-0"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-white">신력 및 속성 공명</span>
                                                                    <span className="text-[10px] text-amber-400 font-bold">
                                                                        {isShinryokuSpecialPassive ? '신력개방 전용 (수치 한계 돌파만 가능)' : (alreadyResonance ? '공명 완료됨' : '1회 한정')}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                    속성 피해 증가 또는 모든 속성 저항 증가 효과 슬롯을 패시브에 부여합니다.
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {selectedOption === 'passive_elemental_resonance' && !isDisabled && (
                                                            <div className="mt-1 p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-xs">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-slate-400 font-bold shrink-0">신력 계통:</span>
                                                                    <select
                                                                        value={extraElementalElement}
                                                                        onChange={(e) => setExtraElementalElement(e.target.value)}
                                                                        className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs outline-none flex-1 max-w-[180px]"
                                                                    >
                                                                        <option value="화염계">화염계</option>
                                                                        <option value="빙결계">빙결계</option>
                                                                        <option value="전격계">전격계</option>
                                                                        <option value="대지계">대지계</option>
                                                                        <option value="질풍계">질풍계</option>
                                                                        <option value="해수계">해수계</option>
                                                                        <option value="광휘계">광휘계</option>
                                                                        <option value="암흑계">암흑계</option>
                                                                        <option value="태양계">태양계</option>
                                                                        <option value="월광계">월광계</option>
                                                                        <option value="초화계">초화계</option>
                                                                        <option value="무기강화계">무기강화계</option>
                                                                        <option value="신체강화계">신체강화계</option>
                                                                        <option value="강철계">강철계</option>
                                                                        <option value="모든 속성">모든 속성</option>
                                                                    </select>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-slate-400 font-bold shrink-0">공명 효과:</span>
                                                                    <select
                                                                        value={extraElementalType}
                                                                        onChange={(e) => setExtraElementalType(e.target.value)}
                                                                        className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs outline-none flex-1 max-w-[180px]"
                                                                    >
                                                                        <option value="속성 피해 +10%">속성 피해 +10%</option>
                                                                        <option value="속성 저항 +10%">속성 저항 +10%</option>
                                                                        <option value="속성 피해 & 저항 +10%">속성 피해 & 저항 +10%</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* 4) 조건부 특화 효과 결합 */}
                                            {(() => {
                                                const alreadyCond = Boolean(enhanceData.passiveConditional);
                                                const isDisabled = alreadyCond || isShinryokuSpecialPassive;
                                                return (
                                                    <div
                                                        onClick={() => {
                                                            if (!isDisabled) setSelectedOption('passive_conditional_booster');
                                                        }}
                                                        className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                                                            isDisabled
                                                                ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                : selectedOption === 'passive_conditional_booster'
                                                                ? 'bg-blue-950/40 border-blue-500 text-blue-200 cursor-pointer'
                                                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                        }`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="radio"
                                                                name="enhance_option"
                                                                disabled={isDisabled}
                                                                checked={selectedOption === 'passive_conditional_booster'}
                                                                onChange={() => setSelectedOption('passive_conditional_booster')}
                                                                className="mt-1 text-blue-500 focus:ring-0"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-white">조건부 특화 효과 결합</span>
                                                                    <span className="text-[10px] text-amber-400 font-bold">
                                                                        {isShinryokuSpecialPassive ? '신력개방 전용 (수치 한계 돌파만 가능)' : (alreadyCond ? '결합 완료됨' : '1회 한정')}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                    특정 전투 상황에서 발동하는 강력한 조건부 특화 보너스를 결합합니다.
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {selectedOption === 'passive_conditional_booster' && !isDisabled && (
                                                            <div className="mt-1 p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                                                                <span className="text-slate-400 font-bold">조건부 특화:</span>
                                                                <select
                                                                    value={extraConditionType}
                                                                    onChange={(e) => setExtraConditionType(e.target.value)}
                                                                    className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs outline-none"
                                                                >
                                                                    <option value="체력 50% 이하 시 받는 피해 20% 감소">체력 50% 이하 시 받는 피해 20% 감소</option>
                                                                    <option value="마나 80% 이상 시 공격 피해량 15% 증가">마나 80% 이상 시 공격 피해량 15% 증가</option>
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* 5) 파티 공유 오라 전환 */}
                                            {(() => {
                                                const isUnlocked = currentCount >= 10;
                                                const alreadyAura = Boolean(enhanceData.passiveAuraShare);
                                                const isDisabled = !isUnlocked || alreadyAura || isShinryokuSpecialPassive;
                                                return (
                                                    <label
                                                        onClick={() => {
                                                            if (!isDisabled) setSelectedOption('passive_aura_share');
                                                        }}
                                                        className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                                                            isDisabled
                                                                ? 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                                                                : selectedOption === 'passive_aura_share'
                                                                ? 'bg-blue-950/40 border-blue-500 text-blue-200 cursor-pointer'
                                                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                                                        }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="enhance_option"
                                                            disabled={isDisabled}
                                                            checked={selectedOption === 'passive_aura_share'}
                                                            onChange={() => setSelectedOption('passive_aura_share')}
                                                            className="mt-1 text-blue-500 focus:ring-0"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-bold text-white">파티 공유 오라 전환</span>
                                                                <span className="text-[10px] text-amber-400 font-bold">
                                                                    {isShinryokuSpecialPassive ? '신력개방 전용 (수치 한계 돌파만 가능)' : (alreadyAura ? '오라 적용 완료됨' : '10회 강화 시 해금')}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                                                                본인 전용 패시브 효과의 50% 수치를 파티원 전체에게 공유하는 오라 스킬로 전환시킵니다. (10회 이상 강화 시 선택 가능)
                                                            </p>
                                                        </div>
                                                    </label>
                                                );
                                            })()}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 하단 버튼 (모바일 44px 이상 터치 타겟) */}
                <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                    <button
                        type="button"
                        onClick={onClose}
                        className="py-3 px-4 bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-300 rounded-xl font-bold text-xs transition-all min-h-[46px]"
                    >
                        닫기
                    </button>
                    {selectedSkill && currentCount > 0 && (
                        <button
                            type="button"
                            onClick={handleResetEnhance}
                            className="flex-1 py-3 px-3 bg-rose-950/90 hover:bg-rose-900 active:scale-95 text-rose-200 border border-rose-700/60 rounded-xl font-extrabold text-xs transition-all min-h-[46px] shadow-lg flex items-center justify-center gap-1.5"
                        >
                            <RotateCcw size={15} className="text-rose-400" />
                            <span>강화 취소 (슬롯 반환)</span>
                        </button>
                    )}
                    <button
                        type="button"
                        disabled={!selectedSkill || !selectedOption}
                        onClick={handleApplyEnhance}
                        className={`flex-1 py-3 px-3 rounded-xl font-extrabold text-xs transition-all active:scale-95 min-h-[46px] shadow-lg flex items-center justify-center gap-1.5 ${
                            !selectedSkill || !selectedOption
                                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                        }`}
                    >
                        <Sparkles size={15} />
                        <span>{isFinalTier ? ('제 ' + nextSlot + '슬롯 소모하여 강화') : (tierConfig.tierName + ' 슬롯 소모하여 강화')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FinalSkillEnhanceModal;
