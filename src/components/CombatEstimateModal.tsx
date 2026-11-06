import React, { useState, useMemo } from 'react';
import { 
    X, Sword, Shield, Heart, Zap, Sparkles, Activity, Target, 
    BarChart2, Users, User, ArrowUpRight, Flame, Droplets, 
    Info, Sliders, ChevronRight, Eye, RefreshCw, Wand2, TrendingUp, CheckCircle2
} from 'lucide-react';
import { Character, Companion, Skill, SkillType, BattleRole, Stats, ClassTier } from '../types';
import { 
    calculateFinalStats, 
    calculateDerivedStats, 
    getEntityAllCombatSkills, 
    getEffectiveBattleRole
} from '../utils';
import { STATUS_AILMENTS_DATA, STATUS_AILMENTS_LIST, SHINRYOKU_TYPES_LIST } from '../constants';
import { getAttackerAilmentProcs } from '../services/equipmentAilmentService';

interface CombatEstimateModalProps {
    character: Character;
    onClose: () => void;
}

// 가상 적 방어력 프리셋 정의
interface DummyEnemyPreset {
    id: string;
    label: string;
    desc: string;
    def: number;
    mDef: number;
    ctrl: number;
    critResist: number; // 치명타 저항률 (%)
}

// 신화 및 보스 마물의 실제 강화된 방어력 및 치명타 저항 수준을 반영한 현실적 프리셋
const DUMMY_ENEMY_PRESETS: DummyEnemyPreset[] = [
    { id: 'dummy', label: '허수아비', desc: '방어력 없음 (순수 기본 피해량 측정)', def: 0, mDef: 0, ctrl: 0, critResist: 0 },
    { id: 'normal', label: '일반 마물', desc: '필드 일반 마물 기준 (초~중반)', def: 500, mDef: 450, ctrl: 30, critResist: 0 },
    { id: 'elite', label: '정예 마물', desc: '던전 정예 및 수호 마물 기준', def: 2500, mDef: 2200, ctrl: 100, critResist: 5 },
    { id: 'boss', label: '보스 마물', desc: '대륙 보스 및 수배 마물 기준 (물리/마법 방어 및 치명타 저항 20%)', def: 15000, mDef: 13500, ctrl: 450, critResist: 20 },
    { id: 'mythic', label: '신화 보스', desc: '신화 사자 분신 및 마계 제너럴 보스 (치명타 저항 30%)', def: 75000, mDef: 68000, ctrl: 2000, critResist: 30 },
    { id: 'supreme_god', label: '절대신/태양·월광', desc: '절대신 엘라, 태양/월광의 사자, 마신 (치명타 저항 50%)', def: 250000, mDef: 220000, ctrl: 6500, critResist: 50 },
];

/**
 * 딜량 및 수치를 한국어 단위(억, 만, 천)로 변환하는 포맷 헬퍼
 */
export const formatKoreanDamage = (num: number): string => {
    if (!num || isNaN(num) || num <= 0) return '0';
    const n = Math.floor(num);
    if (n < 1000) return `${n.toLocaleString()}`;
    if (n < 10000) {
        const cheon = Math.floor(n / 1000);
        const rem = n % 1000;
        return rem > 0 ? `${cheon}천 ${rem.toLocaleString()}` : `${cheon}천`;
    }
    const eok = Math.floor(n / 100000000);
    const man = Math.floor((n % 100000000) / 10000);
    const cheon = Math.floor((n % 10000) / 1000);
    
    const parts: string[] = [];
    if (eok > 0) parts.push(`${eok.toLocaleString()}억`);
    if (man > 0) parts.push(`${man.toLocaleString()}만`);
    if (cheon > 0 && eok === 0) parts.push(`${cheon}천`);
    if (parts.length === 0) return `${n.toLocaleString()}`;
    return parts.join(' ');
};

// 가상 버프 프리셋 정의
interface BuffSimulationPreset {
    id: string;
    name: string;
    desc: string;
    pAtkMod: number;       // 물리 공격력 증가 비율 (0.4 = +40%)
    mAtkMod: number;       // 마법 공격력 증가 비율
    eleDmgMod: number;     // 속성 피해 증가 비율
    critRateMod: number;   // 치명타율 증가 (+30)
    critDmgMod: number;    // 치명 피해량 증가 (+0.5)
}

const BUFF_PRESETS: BuffSimulationPreset[] = [
    { id: 'none', name: '버프 없음 (기본 상태)', desc: '순수 기본 상태로 데미지를 측정합니다.', pAtkMod: 0, mAtkMod: 0, eleDmgMod: 0, critRateMod: 0, critDmgMod: 0 },
    { id: 'patk_boost', name: '물리 공격 강화', desc: '물리 공격력 +40% 증가 버프', pAtkMod: 0.40, mAtkMod: 0, eleDmgMod: 0, critRateMod: 0, critDmgMod: 0 },
    { id: 'matk_boost', name: '마법 공격 강화', desc: '마법 공격력 +40% 증가 버프', pAtkMod: 0, mAtkMod: 0.40, eleDmgMod: 0, critRateMod: 0, critDmgMod: 0 },
    { id: 'element_boost', name: '신력 속성 각성', desc: '속성 피해량 +60% 대폭 증폭', pAtkMod: 0, mAtkMod: 0, eleDmgMod: 0.60, critRateMod: 0, critDmgMod: 0 },
    { id: 'crit_boost', name: '치명 극대화 집중', desc: '치명타율 +30%, 치명타 피해량 +50%', pAtkMod: 0, mAtkMod: 0, eleDmgMod: 0, critRateMod: 30, critDmgMod: 0.50 },
    { id: 'absolute_awakening', name: '절대 신력 해방', desc: '공격력 +70%, 속성 피해 +50%, 치명피해 +50%', pAtkMod: 0.70, mAtkMod: 0.70, eleDmgMod: 0.50, critRateMod: 20, critDmgMod: 0.50 },
];

export const CombatEstimateModal: React.FC<CombatEstimateModalProps> = ({ character, onClose }) => {
    // 1. 가상 적 설정 상태
    const [selectedPresetId, setSelectedPresetId] = useState<string>('boss');
    const [customDef, setCustomDef] = useState<number>(15000);
    const [customMDef, setCustomMDef] = useState<number>(13500);
    const [targetCtrl, setTargetCtrl] = useState<number>(450);
    const [targetCritResist, setTargetCritResist] = useState<number>(20); // 가상 적 치명타 저항률 (%)
    const [affinityMultiplier, setAffinityMultiplier] = useState<number>(1.0); // 1.0 기본, 1.5 상성 우위, 0.5 상성 열세

    // 2. 가상 버프 시뮬레이션 상태
    const [selectedBuffId, setSelectedBuffId] = useState<string>('none');

    // 3. 화면 보기 탭: 'party' (파티 종합 분석) 또는 캐릭터 ID ('player', companion.id)
    const [activeTab, setActiveTab] = useState<string>('party');

    // 4. 스킬 분류 필터 및 정렬
    const [skillTypeFilter, setSkillTypeFilter] = useState<'all' | 'attack' | 'heal' | 'buff' | 'passive'>('all');
    const [skillSortBy, setSkillSortBy] = useState<'damageDesc' | 'mpAsc' | 'efficiencyDesc' | 'name'>('damageDesc');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // 프리셋 선택 시 수치 동기화
    const handleSelectPreset = (preset: DummyEnemyPreset) => {
        setSelectedPresetId(preset.id);
        setCustomDef(preset.def);
        setCustomMDef(preset.mDef);
        setTargetCtrl(preset.ctrl);
        setTargetCritResist(preset.critResist);
    };

    // 활성 버프 정보 조회
    const activeBuff = useMemo(() => {
        return BUFF_PRESETS.find(b => b.id === selectedBuffId) || BUFF_PRESETS[0];
    }, [selectedBuffId]);

    // 참전 파티원 목록 구성 (주인공 + 활성 파티 동료)
    const partyMembers = useMemo(() => {
        const members: { id: string; name: string; isPlayer: boolean; entity: Character | Companion }[] = [
            { id: 'player', name: character.name, isPlayer: true, entity: character },
            ...(character.companions || []).map(c => ({
                id: c.id,
                name: c.name,
                isPlayer: false,
                entity: c
            }))
        ];
        return members;
    }, [character]);

    // 각 파티원별 상세 전투 수치 및 스킬 계산
    const evaluatedMembers = useMemo(() => {
        return partyMembers.map(member => {
            const entity = member.entity;
            const finalStats = calculateFinalStats(entity).finalStats;
            const role = getEffectiveBattleRole(entity);
            const shinryokuType = (entity as any).shinryokuType || '';

            const derived = calculateDerivedStats(
                finalStats,
                entity.statusEffects || [],
                undefined, undefined, false,
                'skills' in entity ? entity.skills : undefined,
                'equipment' in entity ? entity.equipment : undefined,
                shinryokuType,
                undefined, undefined,
                (entity as any).base?.elementalDamageBoosts,
                (entity as any).base?.elementalResistanceBoosts,
                (entity as any).battlePosition,
                (entity as any).combatStyle
            );

            // 역할군 보너스 계산
            let rolePAtkBonus = 1.0;
            let roleMAtkBonus = 1.0;
            let rolePDefBonus = 1.0;
            let roleMDefBonus = 1.0;
            let roleAccuracyBonus = 0;

            if (role === BattleRole.DEALER) {
                rolePAtkBonus = 1.08;
                roleMAtkBonus = 1.08;
                roleAccuracyBonus = 8;
            } else if (role === BattleRole.TANKER) {
                rolePDefBonus = 1.10;
                roleMDefBonus = 1.10;
            }

            // 기본 능력치
            const basePAtk = Math.floor(derived.pAtk * rolePAtkBonus);
            const baseMAtk = Math.floor(derived.mAtk * roleMAtkBonus);
            const pDef = Math.floor(derived.pDef * rolePDefBonus);
            const mDef = Math.floor(derived.mDef * roleMDefBonus);
            const baseCritChance = Math.min(100, Math.max(0, derived.critChance));
            const baseCritDamage = Math.max(1.0, derived.critDamage);
            // 가상 적의 치명타 저항(critResist)을 차감한 실효 치명타율 (최대 저항 100%, 최소 5% 치명타율 보장)
            const effectiveCritResist = Math.min(100, Math.max(0, targetCritResist));
            const effectiveCritChance = Math.max(5, baseCritChance - effectiveCritResist);

            // 속성 피해 및 속성 저항 수치 추출
            let elementalDmgMultiplier = 1.0;
            let myElementResMultiplier = 1.0;
            if (derived.elemental && shinryokuType && derived.elemental[shinryokuType]) {
                elementalDmgMultiplier = Math.max(1.0, derived.elemental[shinryokuType].atk || 1.0);
                myElementResMultiplier = Math.max(1.0, derived.elemental[shinryokuType].res || 1.0);
            } else if (derived.elemental) {
                // 특정 신력계통이 없으면 전체 속성 중 최댓값 반영
                const maxAtk = Math.max(1.0, ...Object.values(derived.elemental).map((e: any) => e.atk || 1.0));
                elementalDmgMultiplier = maxAtk;
            }

            // 모든 속성 저항 현황 분석
            const allElementList = SHINRYOKU_TYPES_LIST.map(type => {
                const el = derived.elemental?.[type];
                return {
                    type,
                    atk: el ? el.atk : 1.0,
                    res: el ? el.res : 1.0,
                    resPercent: el ? Math.round(((el.res || 1.0) - 1.0) * 100) : 0
                };
            });
            const avgElementResPercent = Math.round(allElementList.reduce((sum, el) => sum + el.resPercent, 0) / (allElementList.length || 1));
            const highestResElement = [...allElementList].sort((a, b) => b.resPercent - a.resPercent)[0];

            // 장비 속성 공명 시너지 확인
            const eqWeapon = (entity as any).equipment?.weapon;
            const wElem = eqWeapon?.elementalType || '';
            const hasElementalResonance = Boolean(shinryokuType && wElem && wElem === shinryokuType);

            // 가상 버프 적용 후 능력치 계산
            const buffPAtk = Math.floor(basePAtk * (1 + activeBuff.pAtkMod));
            const buffMAtk = Math.floor(baseMAtk * (1 + activeBuff.mAtkMod));
            const buffCritChance = Math.min(100, baseCritChance + activeBuff.critRateMod);
            const buffCritDamage = baseCritDamage + activeBuff.critDmgMod;
            const effectiveBuffCritChance = Math.max(5, buffCritChance - targetCritResist);
            const buffElementalMultiplier = elementalDmgMultiplier * (1 + activeBuff.eleDmgMod);

            // 장비 부가 효과 수집
            const equipAilments = getAttackerAilmentProcs(entity);

            // 1. 일반 공격 (평타) 예상 피해량 계산 (속성 피해 곱연산 및 실효 치명타율 반영)
            // 기본 상태
            const basicDefRatio = (basePAtk * 2) / (basePAtk + Math.max(1, customDef));
            const basicBaseDmg = Math.max(1, basePAtk * basicDefRatio * affinityMultiplier * elementalDmgMultiplier);
            const basicMinDmg = Math.max(1, Math.floor(basicBaseDmg * 0.95));
            const basicMaxDmg = Math.max(1, Math.floor(basicBaseDmg * 1.05));
            const basicCritDmg = Math.max(1, Math.floor(basicBaseDmg * baseCritDamage));
            const basicAvgDmg = Math.max(1, Math.floor(basicBaseDmg * (1 + (effectiveCritChance / 100) * (baseCritDamage - 1))));

            // 버프 적용 상태
            const buffedDefRatio = (buffPAtk * 2) / (buffPAtk + Math.max(1, customDef));
            const buffedBaseDmg = Math.max(1, buffPAtk * buffedDefRatio * affinityMultiplier * buffElementalMultiplier);
            const buffedBasicAvgDmg = Math.max(1, Math.floor(buffedBaseDmg * (1 + (effectiveBuffCritChance / 100) * (buffCritDamage - 1))));
            const basicBuffDiffPercent = basicAvgDmg > 0 ? Math.round(((buffedBasicAvgDmg - basicAvgDmg) / basicAvgDmg) * 1000) / 10 : 0;

            // 2. 전체 보유 스킬 목록 평가
            const allSkills = getEntityAllCombatSkills(entity);
            const evaluatedSkills = allSkills.map(skill => {
                const isPassive = skill.type === SkillType.PASSIVE;
                const isHeal = skill.type === SkillType.HEAL || 
                               Boolean(skill.description?.includes('회복') || 
                               skill.effectFormula?.includes('HEAL') || 
                               skill.effectFormula?.includes('RECOV') || 
                               (skill.effectFormula && skill.effectFormula.includes('HP') && skill.effectFormula.includes('%')));
                const isMagic = skill.type === SkillType.MAGIC;
                const isPhysical = skill.type === SkillType.PHYSICAL;
                const isBuff = skill.type === SkillType.BUFF || Boolean(skill.effectFormula?.includes('BUFF'));
                const isDebuff = skill.type === SkillType.DEBUFF || Boolean(skill.effectFormula?.includes('Debuff'));
                const isAoE = skill.targetType === 'aoe' || Boolean(skill.description?.includes('전체') || skill.description?.includes('모든 적'));

                const mpCost = isPassive ? 0 : (skill.mpCost || 0);
                const skillTier = skill.tier || ClassTier.FIRST;
                const tierScaleMap: Record<string, number> = {
                    [ClassTier.NONE]: 0.5,
                    [ClassTier.FIRST]: 1.0,
                    [ClassTier.SECOND]: 5.0,
                    [ClassTier.LAST]: 20.0,
                    [ClassTier.FINAL]: 100.0,
                };
                const scale = tierScaleMap[skillTier] || 1.0;
                const powerRatio = ((skill.powerRatio || 100) + ((skill.level || 1) * scale)) / 100;

                let estMinDamage = 0;
                let estMaxDamage = 0;
                let estCritDamage = 0;
                let estAvgDamage = 0;
                let estBuffedAvgDamage = 0;
                let buffDiffPercent = 0;

                let estHeal = 0;
                let estMpHeal = 0;
                let buffDesc = '';
                const ailmentProcs: { name: string; chance: number; duration: number }[] = [];

                if (!isPassive) {
                    // 데미지 계산 (속성 피해 온전 반영)
                    if (isPhysical || isMagic) {
                        const atkVal = isMagic ? baseMAtk : basePAtk;
                        const defVal = isMagic ? Math.max(1, customMDef) : Math.max(1, customDef);
                        const defRatio = (atkVal * 2) / (atkVal + defVal);
                        const rawBase = Math.max(1, atkVal * powerRatio * defRatio * affinityMultiplier * elementalDmgMultiplier);

                        estMinDamage = Math.max(1, Math.floor(rawBase * 0.95));
                        estMaxDamage = Math.max(1, Math.floor(rawBase * 1.05));
                        estCritDamage = Math.max(1, Math.floor(rawBase * baseCritDamage));
                        estAvgDamage = Math.max(1, Math.floor(rawBase * (1 + (effectiveCritChance / 100) * (baseCritDamage - 1))));

                        // 버프 시뮬레이션 피해 계산
                        const buffAtkVal = isMagic ? buffMAtk : buffPAtk;
                        const buffDefRatio = (buffAtkVal * 2) / (buffAtkVal + defVal);
                        const buffRawBase = Math.max(1, buffAtkVal * powerRatio * buffDefRatio * affinityMultiplier * buffElementalMultiplier);
                        estBuffedAvgDamage = Math.max(1, Math.floor(buffRawBase * (1 + (effectiveBuffCritChance / 100) * (buffCritDamage - 1))));
                        buffDiffPercent = estAvgDamage > 0 ? Math.round(((estBuffedAvgDamage - estAvgDamage) / estAvgDamage) * 1000) / 10 : 0;
                    }

                    // 힐량 계산
                    if (isHeal) {
                        const formula = skill.effectFormula || '';
                        const hpMatch = formula.match(/(?:HP|MaxHP|HEAL|RECOV|회복)\s*(\d+)%/i);
                        const hpRatio = hpMatch ? parseInt(hpMatch[1], 10) : (skill.powerRatio || 50);
                        const targetHpRef = finalStats.maxHp || 1000;
                        estHeal = Math.floor(targetHpRef * (hpRatio + (skill.level || 1)) / 100) + 10;

                        if (formula.includes('MP')) {
                            const mpMatch = formula.match(/(?:MP|MaxMP)\s*(\d+)%/i);
                            const mpRatio = mpMatch ? parseInt(mpMatch[1], 10) : 30;
                            estMpHeal = Math.floor((finalStats.maxMp || 200) * mpRatio / 100) + 5;
                        }
                    }

                    // 버프 / 디버프 효과 추출
                    if (isBuff || isDebuff) {
                        buffDesc = skill.description || '능력치 강화 또는 약화 효과';
                    }

                    // 스킬 부가 효과 분석
                    const tagMatch = skill.description ? skill.description.match(/\[부가\s*효과:\s*([^\]]+)\]/) : null;
                    if (tagMatch) {
                        const inner = tagMatch[1].trim();
                        const matchedAilment = STATUS_AILMENTS_LIST.find(a => inner.includes(a));
                        if (matchedAilment) {
                            let duration = 3;
                            if (['빙결', '속박', '소멸', '혼란', '감전'].includes(matchedAilment)) {
                                duration = 2;
                            }
                            ailmentProcs.push({
                                name: matchedAilment,
                                chance: 35,
                                duration
                            });
                        }
                    }
                }

                // 마나 1당 피해 효율
                const damageEfficiency = mpCost > 0 ? Math.round((estAvgDamage / mpCost) * 10) / 10 : estAvgDamage;
                const healEfficiency = mpCost > 0 ? Math.round((estHeal / mpCost) * 10) / 10 : estHeal;

                return {
                    skill,
                    isPassive,
                    isHeal,
                    isPhysical,
                    isMagic,
                    isBuff,
                    isDebuff,
                    isAoE,
                    mpCost,
                    estMinDamage,
                    estMaxDamage,
                    estCritDamage,
                    estAvgDamage,
                    estBuffedAvgDamage,
                    buffDiffPercent,
                    estHeal,
                    estMpHeal,
                    buffDesc,
                    ailmentProcs,
                    damageEfficiency,
                    healEfficiency
                };
            });

            // 캐릭터의 최고 주력 딜 스킬 (가장 높은 평균 피해량)
            const highestDamageSkill = evaluatedSkills
                .filter(s => !s.isPassive && (s.isPhysical || s.isMagic))
                .sort((a, b) => b.estAvgDamage - a.estAvgDamage)[0];

            // 캐릭터의 최고 힐 스킬
            const highestHealSkill = evaluatedSkills
                .filter(s => !s.isPassive && s.isHeal)
                .sort((a, b) => b.estHeal - a.estHeal)[0];

            // 1턴 최대 폭딜 기대치 (주력기 발동 시)
            const burstDamage = highestDamageSkill ? highestDamageSkill.estAvgDamage : basicAvgDmg;
            const buffedBurstDamage = highestDamageSkill ? highestDamageSkill.estBuffedAvgDamage : buffedBasicAvgDmg;
            const turnHeal = highestHealSkill ? highestHealSkill.estHeal : 0;

            return {
                id: member.id,
                name: member.name,
                isPlayer: member.isPlayer,
                entity,
                role,
                position: (entity as any).battlePosition || { row: 1, col: 1 },
                shinryokuType,
                elementalDmgMultiplier,
                myElementResMultiplier,
                allElementList,
                avgElementResPercent,
                highestResElement,
                hasElementalResonance,
                finalStats,
                derived,
                pAtk: basePAtk,
                mAtk: baseMAtk,
                buffPAtk,
                buffMAtk,
                pDef,
                mDef,
                critChance: baseCritChance,
                critDamage: baseCritDamage,
                effectiveCritChance,
                effectiveBuffCritChance,
                targetCritResist,
                equipAilments,
                basicAvgDmg,
                basicMinDmg,
                basicMaxDmg,
                basicCritDmg,
                buffedBasicAvgDmg,
                basicBuffDiffPercent,
                skills: evaluatedSkills,
                burstDamage,
                buffedBurstDamage,
                turnHeal,
                highestDamageSkill,
                highestHealSkill
            };
        });
    }, [partyMembers, customDef, customMDef, targetCtrl, targetCritResist, affinityMultiplier, activeBuff]);

    // 파티 전체 통합 통계
    const partySummary = useMemo(() => {
        const totalBurstDamage = evaluatedMembers.reduce((sum, m) => sum + m.burstDamage, 0);
        const totalBuffedBurstDamage = evaluatedMembers.reduce((sum, m) => sum + m.buffedBurstDamage, 0);
        const totalBasicDamage = evaluatedMembers.reduce((sum, m) => sum + m.basicAvgDmg, 0);
        const totalBuffedBasicDamage = evaluatedMembers.reduce((sum, m) => sum + m.buffedBasicAvgDmg, 0);
        const totalTurnHeal = evaluatedMembers.reduce((sum, m) => sum + m.turnHeal, 0);
        const totalHp = evaluatedMembers.reduce((sum, m) => sum + (m.finalStats.maxHp || 0), 0);

        const burstDiffPercent = totalBurstDamage > 0 ? Math.round(((totalBuffedBurstDamage - totalBurstDamage) / totalBurstDamage) * 1000) / 10 : 0;

        // 파티원별 딜 지분율 계산
        const damageShares = evaluatedMembers.map(m => ({
            id: m.id,
            name: m.name,
            role: m.role,
            damage: m.burstDamage,
            buffedDamage: m.buffedBurstDamage,
            percent: totalBurstDamage > 0 ? Math.round((m.burstDamage / totalBurstDamage) * 100) : 0
        }));

        // 역할군 밸런스 집계
        const dealerCount = evaluatedMembers.filter(m => m.role === BattleRole.DEALER).length;
        const tankerCount = evaluatedMembers.filter(m => m.role === BattleRole.TANKER).length;
        const supporterCount = evaluatedMembers.filter(m => m.role === BattleRole.SUPPORTER).length;
        const noneCount = evaluatedMembers.filter(m => m.role === BattleRole.NONE).length;

        let balanceVerdict = '균형 잡힌 표준 전술';
        let balanceDesc = '딜러, 탱커, 서포터가 고루 배치되어 안정적인 전투 수행이 가능합니다.';

        if (dealerCount >= 3) {
            balanceVerdict = '화력 집중 공격 전술';
            balanceDesc = '단기 결전과 강력한 선제 공격에 특화되었으나 아군 방어와 회복에 취약할 수 있습니다.';
        } else if (tankerCount >= 2) {
            balanceVerdict = '철벽 방어 지구전 전술';
            balanceDesc = '생존력과 전열 유지력이 뛰어나 장기전이나 강력한 단일 보스 공략에 유리합니다.';
        } else if (supporterCount >= 2) {
            balanceVerdict = '지속 유지 마력 전술';
            balanceDesc = '매 턴 회복과 버프 중첩으로 아군의 유지력이 우수합니다.';
        }

        return {
            totalBurstDamage,
            totalBuffedBurstDamage,
            burstDiffPercent,
            totalBasicDamage,
            totalBuffedBasicDamage,
            totalTurnHeal,
            totalHp,
            damageShares,
            dealerCount,
            tankerCount,
            supporterCount,
            noneCount,
            balanceVerdict,
            balanceDesc
        };
    }, [evaluatedMembers]);

    // 현재 선택된 개별 캐릭터 데이터
    const selectedMember = useMemo(() => {
        if (activeTab === 'party') return null;
        return evaluatedMembers.find(m => m.id === activeTab) || evaluatedMembers[0];
    }, [activeTab, evaluatedMembers]);

    // 선택된 캐릭터의 필터링 및 정렬된 스킬 목록
    const filteredSkills = useMemo(() => {
        if (!selectedMember) return [];
        let list = selectedMember.skills;

        // 분류 필터
        if (skillTypeFilter === 'attack') {
            list = list.filter(s => !s.isPassive && (s.isPhysical || s.isMagic));
        } else if (skillTypeFilter === 'heal') {
            list = list.filter(s => !s.isPassive && s.isHeal);
        } else if (skillTypeFilter === 'buff') {
            list = list.filter(s => !s.isPassive && (s.isBuff || s.isDebuff));
        } else if (skillTypeFilter === 'passive') {
            list = list.filter(s => s.isPassive);
        }

        // 검색어 필터
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(s => 
                s.skill.name.toLowerCase().includes(q) || 
                (s.skill.description || '').toLowerCase().includes(q)
            );
        }

        // 정렬
        return [...list].sort((a, b) => {
            if (skillSortBy === 'damageDesc') return b.estAvgDamage - a.estAvgDamage;
            if (skillSortBy === 'mpAsc') return a.mpCost - b.mpCost;
            if (skillSortBy === 'efficiencyDesc') return b.damageEfficiency - a.damageEfficiency;
            if (skillSortBy === 'name') return a.skill.name.localeCompare(b.skill.name);
            return 0;
        });
    }, [selectedMember, skillTypeFilter, skillSortBy, searchQuery]);

    const getRoleBadge = (role: BattleRole) => {
        if (role === BattleRole.DEALER) return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-950/80 border border-red-700/80 text-red-300">딜러</span>;
        if (role === BattleRole.TANKER) return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-950/80 border border-blue-700/80 text-blue-300">탱커</span>;
        if (role === BattleRole.SUPPORTER) return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 border border-emerald-700/80 text-emerald-300">서포터</span>;
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-400">역할 없음</span>;
    };

    return (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/85 backdrop-blur-md p-1.5 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[94vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                
                {/* 상단 헤더 */}
                <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-400">
                            <BarChart2 size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm sm:text-base md:text-lg font-bold text-white flex flex-wrap items-center gap-2">
                                <span>전투 통계 및 예상 분석기</span>
                                <span className="text-[10px] sm:text-xs font-normal text-rose-300 bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded-full">
                                    실시간 시뮬레이션
                                </span>
                            </h2>
                            <p className="text-[10px] sm:text-xs text-slate-400">
                                억, 만, 천 단위 딜량 산출 · 속성 피해 및 저항 종합 평가 · 버프 적용 시 딜량 변화 실시간 비교
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        title="닫기"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 가상 적 환경 설정 및 버프 시뮬레이션 컨트롤러 바 */}
                <div className="bg-slate-900/60 border-b border-slate-800 p-2.5 sm:p-3 space-y-2 shrink-0 text-xs">
                    
                    {/* 가상 적 프리셋 선택 행 */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                            <span className="text-slate-400 font-bold shrink-0 flex items-center gap-1 mr-1 text-[11px]">
                                <Target size={13} className="text-rose-400" /> 가상 적 방어력:
                            </span>
                            {DUMMY_ENEMY_PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => handleSelectPreset(preset)}
                                    className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all border shrink-0 ${
                                        selectedPresetId === preset.id
                                            ? 'bg-rose-600 border-rose-400 text-white shadow-sm'
                                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                    }`}
                                    title={preset.desc}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>

                        {/* 방어력 수치 표시 및 미세 조절 */}
                        <div className="flex flex-wrap items-center gap-2.5 text-[11px] bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800/80 self-start md:self-auto">
                            <div className="flex items-center gap-1">
                                <span className="text-slate-400">물리방어:</span>
                                <span className="font-mono font-bold text-amber-300">{formatKoreanDamage(customDef)}</span>
                                <span className="text-[10px] text-slate-500">({customDef.toLocaleString()})</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-slate-400">마법방어:</span>
                                <span className="font-mono font-bold text-cyan-300">{formatKoreanDamage(customMDef)}</span>
                                <span className="text-[10px] text-slate-500">({customMDef.toLocaleString()})</span>
                            </div>
                            <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
                                <span className="text-slate-400">치명타 저항:</span>
                                <input 
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={targetCritResist}
                                    onChange={(e) => {
                                        const v = parseInt(e.target.value) || 0;
                                        setTargetCritResist(Math.min(100, Math.max(0, v)));
                                    }}
                                    className="w-11 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center font-mono font-bold text-rose-400 text-xs outline-none focus:border-rose-500"
                                    title="치명타 저항 (최대 100%)"
                                />
                                <span className="text-rose-400 font-bold text-xs">%</span>
                                <span className="text-[10px] text-slate-500">(최대 100%)</span>
                            </div>
                        </div>
                    </div>

                    {/* 버프 스킬 시뮬레이션 행 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                            <span className="text-slate-300 font-bold shrink-0 flex items-center gap-1 mr-1 text-[11px]">
                                <Wand2 size={13} className="text-indigo-400" /> 버프 효과 시뮬레이션:
                            </span>
                            {BUFF_PRESETS.map(b => (
                                <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => setSelectedBuffId(b.id)}
                                    className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold transition-all border shrink-0 ${
                                        selectedBuffId === b.id
                                            ? 'bg-indigo-600 border-indigo-400 text-white'
                                            : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200'
                                    }`}
                                    title={b.desc}
                                >
                                    {b.name}
                                </button>
                            ))}
                        </div>

                        {selectedBuffId !== 'none' && (
                            <div className="flex items-center gap-1.5 text-[11px] text-indigo-300 bg-indigo-950/60 border border-indigo-800/80 px-2 py-0.5 rounded self-start sm:self-auto">
                                <TrendingUp size={12} className="text-emerald-400" />
                                <span>적용 효과: <strong>{activeBuff.desc}</strong></span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 탭 네비게이션 (파티 종합 vs 개별 파티원) */}
                <div className="bg-slate-950 border-b border-slate-800 px-3 sm:px-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 py-1.5">
                    <button
                        type="button"
                        onClick={() => setActiveTab('party')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                            activeTab === 'party'
                                ? 'bg-rose-600 text-white shadow-md'
                                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                    >
                        <Users size={14} />
                        <span>파티 종합 분석</span>
                    </button>

                    <div className="w-[1px] h-4 bg-slate-800 mx-1 shrink-0" />

                    {evaluatedMembers.map(m => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => setActiveTab(m.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                                activeTab === m.id
                                    ? 'bg-slate-800 text-rose-300 border border-rose-500/50 shadow-sm'
                                    : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                            }`}
                        >
                            <User size={13} />
                            <span>{m.name}</span>
                            {m.isPlayer && <span className="text-[9px] bg-rose-950 text-rose-400 px-1 rounded">주인공</span>}
                            {getRoleBadge(m.role)}
                        </button>
                    ))}
                </div>

                {/* 중앙 메인 컨텐츠 영역 */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-5 custom-scrollbar space-y-4">
                    
                    {/* [1] 파티 종합 분석 화면 */}
                    {activeTab === 'party' && (
                        <div className="space-y-4">
                            {/* 파티 총합 요약 카드 그리드 (억, 만, 천 단위 표기) */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                                <div className="bg-slate-900/60 p-3 sm:p-4 rounded-xl border border-slate-800">
                                    <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                                        <div className="flex items-center gap-1.5">
                                            <Sword size={14} className="text-red-400" />
                                            <span>파티 1턴 최대 폭딜</span>
                                        </div>
                                        {selectedBuffId !== 'none' && (
                                            <span className="text-[10px] text-emerald-400 font-bold">
                                                +{partySummary.burstDiffPercent}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-base sm:text-xl md:text-2xl font-black text-red-400 font-mono">
                                        {formatKoreanDamage(selectedBuffId !== 'none' ? partySummary.totalBuffedBurstDamage : partySummary.totalBurstDamage)}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        {(selectedBuffId !== 'none' ? partySummary.totalBuffedBurstDamage : partySummary.totalBurstDamage).toLocaleString()} 피해
                                    </p>
                                </div>

                                <div className="bg-slate-900/60 p-3 sm:p-4 rounded-xl border border-slate-800">
                                    <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                                        <div className="flex items-center gap-1.5">
                                            <Activity size={14} className="text-amber-400" />
                                            <span>파티 평타 총합 피해</span>
                                        </div>
                                    </div>
                                    <div className="text-base sm:text-xl md:text-2xl font-black text-amber-300 font-mono">
                                        {formatKoreanDamage(selectedBuffId !== 'none' ? partySummary.totalBuffedBasicDamage : partySummary.totalBasicDamage)}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        {(selectedBuffId !== 'none' ? partySummary.totalBuffedBasicDamage : partySummary.totalBasicDamage).toLocaleString()} 피해
                                    </p>
                                </div>

                                <div className="bg-slate-900/60 p-3 sm:p-4 rounded-xl border border-slate-800">
                                    <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                                        <Heart size={14} className="text-emerald-400" />
                                        <span>파티 턴당 회복 기대량</span>
                                    </div>
                                    <div className="text-base sm:text-xl md:text-2xl font-black text-emerald-400 font-mono">
                                        +{formatKoreanDamage(partySummary.totalTurnHeal)}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        +{partySummary.totalTurnHeal.toLocaleString()} 회복
                                    </p>
                                </div>

                                <div className="bg-slate-900/60 p-3 sm:p-4 rounded-xl border border-slate-800">
                                    <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                                        <Shield size={14} className="text-blue-400" />
                                        <span>파티 총합 생명력</span>
                                    </div>
                                    <div className="text-base sm:text-xl md:text-2xl font-black text-blue-400 font-mono">
                                        {formatKoreanDamage(partySummary.totalHp)}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        {partySummary.totalHp.toLocaleString()} 체력
                                    </p>
                                </div>
                            </div>

                            {/* 버프 시뮬레이션 적용 시 비교 카드 */}
                            {selectedBuffId !== 'none' && (
                                <div className="bg-indigo-950/40 border border-indigo-800/80 p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-indigo-200 text-sm">[{activeBuff.name}] 적용 시 파티 화력 변동</span>
                                            <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-500/40">
                                                +{partySummary.burstDiffPercent}% 증폭
                                            </span>
                                        </div>
                                        <p className="text-slate-400 text-[11px]">{activeBuff.desc}</p>
                                    </div>
                                    <div className="flex items-center gap-3 font-mono">
                                        <div className="text-right">
                                            <span className="text-[10px] text-slate-500 block">버프 전 1턴 폭딜</span>
                                            <span className="text-slate-300 font-bold">{formatKoreanDamage(partySummary.totalBurstDamage)}</span>
                                        </div>
                                        <ArrowUpRight size={16} className="text-emerald-400" />
                                        <div className="text-right">
                                            <span className="text-[10px] text-emerald-400 block">버프 후 1턴 폭딜</span>
                                            <span className="text-emerald-300 font-bold text-sm sm:text-base">{formatKoreanDamage(partySummary.totalBuffedBurstDamage)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 파티 딜 지분율 분석 바 차트 */}
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
                                <h3 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <BarChart2 size={16} className="text-indigo-400" />
                                        <span>파티원별 예상 피해량 지분율</span>
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-normal">
                                        (가상 적 방어력 {formatKoreanDamage(customDef)} 기준)
                                    </span>
                                </h3>

                                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                                    {partySummary.damageShares.map((share, idx) => {
                                        const colors = ['bg-rose-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500'];
                                        const color = colors[idx % colors.length];
                                        return (
                                            <div 
                                                key={share.id} 
                                                style={{ width: `${Math.max(2, share.percent)}%` }} 
                                                className={`${color} h-full transition-all`}
                                                title={`${share.name}: ${formatKoreanDamage(share.damage)} (${share.percent}%)`}
                                            />
                                        );
                                    })}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                                    {partySummary.damageShares.map((share, idx) => {
                                        const dotColors = ['text-rose-400', 'text-amber-400', 'text-blue-400', 'text-emerald-400', 'text-purple-400'];
                                        const dotColor = dotColors[idx % dotColors.length];
                                        return (
                                            <div key={share.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-base leading-none ${dotColor}`}>●</span>
                                                    <span className="font-bold text-slate-200">{share.name}</span>
                                                    {getRoleBadge(share.role)}
                                                </div>
                                                <div className="text-right font-mono">
                                                    <span className="text-white font-bold">{formatKoreanDamage(selectedBuffId !== 'none' ? share.buffedDamage : share.damage)}</span>
                                                    <span className="text-[10px] text-slate-400 ml-1">({share.percent}%)</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 전술 밸런스 점검 및 역할군 평가 */}
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-2.5">
                                <h3 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
                                    <Sparkles size={16} className="text-amber-400" />
                                    <span>파티 역할군 밸런스 평가</span>
                                </h3>
                                <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-slate-400">딜러:</span>
                                        <span className="font-bold text-red-400">{partySummary.dealerCount}명</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-slate-400">탱커:</span>
                                        <span className="font-bold text-blue-400">{partySummary.tankerCount}명</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-slate-400">서포터:</span>
                                        <span className="font-bold text-emerald-400">{partySummary.supporterCount}명</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs space-y-1">
                                    <span className="text-amber-300 font-bold">전술 판정: {partySummary.balanceVerdict}</span>
                                    <p className="text-slate-400">{partySummary.balanceDesc}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* [2] 개별 캐릭터 상세 분석 화면 */}
                    {selectedMember && (
                        <div className="space-y-4">
                            {/* 캐릭터 기본 스탯 & 전투 지표 배너 */}
                            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base sm:text-lg font-bold text-white">{selectedMember.name}</span>
                                        {getRoleBadge(selectedMember.role)}
                                        {selectedMember.shinryokuType && (
                                            <span className="text-xs font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                                                {selectedMember.shinryokuType}
                                            </span>
                                        )}
                                        <span className="text-xs text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                            진형: {selectedMember.position.row === 0 ? '전열' : selectedMember.position.row === 1 ? '중열' : '후열'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="text-slate-400">최대 생명력: <strong className="text-red-400">{formatKoreanDamage(selectedMember.finalStats.maxHp || 0)}</strong></span>
                                        <span className="text-slate-400">최대 마력: <strong className="text-blue-400">{formatKoreanDamage(selectedMember.finalStats.maxMp || 0)}</strong></span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                                        <span className="text-slate-400 text-[11px] block mb-0.5">물리 공격력</span>
                                        <span className="text-sm sm:text-base font-bold text-amber-300 font-mono">
                                            {formatKoreanDamage(selectedBuffId !== 'none' ? selectedMember.buffPAtk : selectedMember.pAtk)}
                                        </span>
                                        <span className="text-[10px] text-slate-500 block">
                                            ({(selectedBuffId !== 'none' ? selectedMember.buffPAtk : selectedMember.pAtk).toLocaleString()})
                                        </span>
                                    </div>
                                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                                        <span className="text-slate-400 text-[11px] block mb-0.5">마법 공격력</span>
                                        <span className="text-sm sm:text-base font-bold text-cyan-300 font-mono">
                                            {formatKoreanDamage(selectedBuffId !== 'none' ? selectedMember.buffMAtk : selectedMember.mAtk)}
                                        </span>
                                        <span className="text-[10px] text-slate-500 block">
                                            ({(selectedBuffId !== 'none' ? selectedMember.buffMAtk : selectedMember.mAtk).toLocaleString()})
                                        </span>
                                    </div>
                                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                                        <span className="text-slate-400 text-[11px] block mb-0.5">물리 / 마법 방어</span>
                                        <span className="text-sm sm:text-base font-bold text-blue-300 font-mono">
                                            {formatKoreanDamage(selectedMember.pDef)} / {formatKoreanDamage(selectedMember.mDef)}
                                        </span>
                                        <span className="text-[10px] text-slate-500 block">
                                            ({selectedMember.pDef.toLocaleString()} / {selectedMember.mDef.toLocaleString()})
                                        </span>
                                    </div>
                                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                                        <span className="text-slate-400 text-[11px] block mb-0.5">치명타율 / 치명피해</span>
                                        <span className="text-sm sm:text-base font-bold text-rose-300 font-mono">
                                            {selectedMember.critChance}% / {Math.round(selectedMember.critDamage * 100)}%
                                        </span>
                                        <span className="text-[10px] text-slate-400 block">
                                            적 저항 적용 실효 {selectedMember.effectiveCritChance}% (기대배율 {Math.round((1 + (selectedMember.effectiveCritChance / 100) * (selectedMember.critDamage - 1)) * 100) / 100}배)
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* [속성 피해 및 속성 저항 종합 평가 섹션] */}
                            <div className="bg-gradient-to-r from-amber-950/30 to-slate-900/60 p-4 rounded-xl border border-amber-800/50 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-900/40 pb-2">
                                    <div className="flex items-center gap-2">
                                        <Flame size={16} className="text-amber-400" />
                                        <h3 className="font-bold text-xs sm:text-sm text-amber-200">
                                            속성 피해 및 속성 저항 반영 종합 평가
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80">
                                            <CheckCircle2 size={13} />
                                            실제 딜량에 속성 피해 곱연산 적용 중
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                                    <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                                        <span className="text-slate-400 text-[11px] block mb-1">신력 계통 속성 피해 증폭</span>
                                        <div className="text-base sm:text-lg font-black text-amber-400 font-mono">
                                            +{Math.round((selectedMember.elementalDmgMultiplier - 1.0) * 100)}%
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            {selectedMember.shinryokuType 
                                                ? `${selectedMember.shinryokuType} 계통에 부여된 피해량 증폭치 (배율 ${Math.round(selectedMember.elementalDmgMultiplier * 100) / 100}배)`
                                                : '고유 신력 미보유 (기본 속성 배율 적용)'}
                                        </p>
                                    </div>

                                    <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                                        <span className="text-slate-400 text-[11px] block mb-1">모든 속성 평균 저항률</span>
                                        <div className="text-base sm:text-lg font-black text-cyan-400 font-mono">
                                            +{selectedMember.avgElementResPercent}%
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            최고 저항: {selectedMember.highestResElement ? `${selectedMember.highestResElement.type} (+${selectedMember.highestResElement.resPercent}%)` : '없음'}
                                        </p>
                                    </div>

                                    <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                                        <span className="text-slate-400 text-[11px] block mb-1">무기 속성 공명 시너지</span>
                                        <div className={`text-base sm:text-lg font-black font-mono ${selectedMember.hasElementalResonance ? 'text-emerald-400' : 'text-slate-500'}`}>
                                            {selectedMember.hasElementalResonance ? '공명 발동 중 (+50%~)' : '비공명 (일반)'}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            {selectedMember.hasElementalResonance
                                                ? '신력 속성과 무기 속성 일치로 공격력 추가 가산'
                                                : '무기 속성과 신력 속성이 다릅니다'}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-2.5 bg-slate-950/60 rounded-lg border border-amber-900/30 text-[11px] text-slate-300">
                                    <strong className="text-amber-300">평가 진단: </strong>
                                    {selectedMember.shinryokuType ? (
                                        <span>
                                            현재 캐릭터의 <strong>{selectedMember.shinryokuType}</strong> 속성 피해 보너스가 일반 평타 및 공격 기술 전체에 100% 곱연산 반영되고 있습니다.
                                            속성 저항 또한 모든 속성에 걸쳐 종합적으로 집계되어 전투력 및 실질 방어 성능에 정상 기여하고 있습니다.
                                        </span>
                                    ) : (
                                        <span>
                                            신력 속성이 설정되지 않아 기본 속성 보정치만 적용 중입니다. 신력 개방 시 해당 계통의 속성 피해가 온전히 실질 피해량에 가산됩니다.
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* 기본 일반 공격(평타) 예상 카드 */}
                            <div className="bg-slate-900/40 p-3 sm:p-4 rounded-xl border border-slate-800 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="p-1.5 bg-slate-800 text-slate-300 rounded-lg">
                                            <Sword size={16} />
                                        </span>
                                        <div>
                                            <h4 className="font-bold text-sm text-slate-200">기본 일반 공격 (평타)</h4>
                                            <p className="text-[10px] text-slate-400">마나 소모 없음 / 1회 타격 (속성 피해 포함)</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-slate-400">예상 평균 피해량:</span>
                                        <div className="text-base sm:text-lg md:text-xl font-black text-amber-300 font-mono">
                                            {formatKoreanDamage(selectedBuffId !== 'none' ? selectedMember.buffedBasicAvgDmg : selectedMember.basicAvgDmg)}
                                        </div>
                                        {selectedBuffId !== 'none' && (
                                            <span className="text-[10px] text-emerald-400 font-bold block">
                                                버프 전 대비 +{selectedMember.basicBuffDiffPercent}% ({formatKoreanDamage(selectedMember.basicAvgDmg)} → {formatKoreanDamage(selectedMember.buffedBasicAvgDmg)})
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800/60">
                                    <span>피해 범위: <strong className="text-slate-300">{formatKoreanDamage(selectedMember.basicMinDmg)} ~ {formatKoreanDamage(selectedMember.basicMaxDmg)}</strong></span>
                                    <span>치명타 시: <strong className="text-rose-400">{formatKoreanDamage(selectedMember.basicCritDmg)}</strong></span>
                                    <span>적 방어 감쇄율: <strong className="text-blue-300">{Math.round((customDef / (selectedMember.pAtk + customDef)) * 100)}%</strong></span>
                                </div>
                            </div>

                            {/* 스킬 목록 필터 & 검색 툴바 */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2">
                                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                                    {[
                                        { id: 'all', label: '전체' },
                                        { id: 'attack', label: '공격 스킬' },
                                        { id: 'heal', label: '회복 스킬' },
                                        { id: 'buff', label: '버프/디버프' },
                                        { id: 'passive', label: '패시브' }
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => setSkillTypeFilter(f.id as any)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border shrink-0 ${
                                                skillTypeFilter === f.id
                                                    ? 'bg-indigo-600 border-indigo-400 text-white'
                                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                            }`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text"
                                        placeholder="스킬 이름 검색..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-slate-900 border border-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded-lg outline-none focus:border-indigo-500 w-36"
                                    />
                                    <select
                                        value={skillSortBy}
                                        onChange={(e) => setSkillSortBy(e.target.value as any)}
                                        className="bg-slate-900 border border-slate-800 text-slate-300 text-xs px-2 py-1 rounded-lg outline-none cursor-pointer"
                                    >
                                        <option value="damageDesc">예상 딜량 높은순</option>
                                        <option value="efficiencyDesc">마나 대비 효율순</option>
                                        <option value="mpAsc">마나 소모 적은순</option>
                                        <option value="name">이름순</option>
                                    </select>
                                </div>
                            </div>

                            {/* 스킬 목록 카드 그리드 */}
                            <div className="space-y-2.5">
                                {filteredSkills.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 text-xs bg-slate-900/30 rounded-xl border border-slate-800">
                                        해당 조건에 일치하는 보유 스킬이 없습니다.
                                    </div>
                                ) : (
                                    filteredSkills.map(({ skill, isPassive, isHeal, isPhysical, isMagic, isBuff, isDebuff, isAoE, mpCost, estMinDamage, estMaxDamage, estCritDamage, estAvgDamage, estBuffedAvgDamage, buffDiffPercent, estHeal, estMpHeal, buffDesc, ailmentProcs, damageEfficiency, healEfficiency }) => (
                                        <div 
                                            key={skill.name}
                                            className="bg-slate-900/50 hover:bg-slate-900/80 p-3 sm:p-4 rounded-xl border border-slate-800 transition-all space-y-2.5"
                                        >
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-sm sm:text-base text-white">{skill.name}</h4>
                                                        {isPassive ? (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">패시브</span>
                                                        ) : isPhysical ? (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-950 border border-red-800 text-red-300">물리 공격</span>
                                                        ) : isMagic ? (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-950 border border-cyan-800 text-cyan-300">마법 공격</span>
                                                        ) : isHeal ? (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 border border-emerald-800 text-emerald-300">회복</span>
                                                        ) : (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-950 border border-purple-800 text-purple-300">보조</span>
                                                        )}
                                                        {isAoE && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 border border-amber-800 text-amber-300">광역</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-400 line-clamp-2">{skill.description}</p>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="text-right">
                                                        <span className="text-[10px] text-slate-500 block">소모 마력</span>
                                                        <span className="text-xs font-mono font-bold text-blue-300">{mpCost} MP</span>
                                                    </div>

                                                    {(isPhysical || isMagic) && estAvgDamage > 0 && (
                                                        <div className="text-right pl-3 border-l border-slate-800">
                                                            <span className="text-[10px] text-slate-500 block">
                                                                {selectedBuffId !== 'none' ? '버프 적용 평균 피해' : '예상 평균 피해'}
                                                            </span>
                                                            <div className="text-sm sm:text-base font-black text-rose-400 font-mono">
                                                                {formatKoreanDamage(selectedBuffId !== 'none' ? estBuffedAvgDamage : estAvgDamage)}
                                                            </div>
                                                            {selectedBuffId !== 'none' && (
                                                                <span className="text-[10px] text-emerald-400 font-bold block">
                                                                    +{buffDiffPercent}% ({formatKoreanDamage(estAvgDamage)} → {formatKoreanDamage(estBuffedAvgDamage)})
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {isHeal && estHeal > 0 && (
                                                        <div className="text-right pl-3 border-l border-slate-800">
                                                            <span className="text-[10px] text-slate-500 block">예상 회복량</span>
                                                            <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">
                                                                +{formatKoreanDamage(estHeal)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 스킬 세부 계산 지표 바 */}
                                            {!isPassive && (
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800/70">
                                                    {(isPhysical || isMagic) ? (
                                                        <>
                                                            <div>
                                                                <span className="text-slate-500 text-[10px] block">일반 피해 범위</span>
                                                                <span className="text-slate-300 font-mono font-bold">
                                                                    {formatKoreanDamage(estMinDamage)} ~ {formatKoreanDamage(estMaxDamage)}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500 text-[10px] block">치명타 시 피해</span>
                                                                <span className="text-rose-400 font-mono font-bold">
                                                                    {formatKoreanDamage(estCritDamage)}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500 text-[10px] block">마나 효율 (마나 1당)</span>
                                                                <span className="text-amber-300 font-mono font-bold">
                                                                    {formatKoreanDamage(damageEfficiency)} 딜
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500 text-[10px] block">타겟 범위</span>
                                                                <span className="text-slate-300 font-bold">
                                                                    {isAoE ? '적 전체 (광역 타격)' : '단일 대상'}
                                                                </span>
                                                            </div>
                                                        </>
                                                    ) : isHeal ? (
                                                        <>
                                                            <div>
                                                                <span className="text-slate-500 text-[10px] block">체력 회복 기대치</span>
                                                                <span className="text-emerald-400 font-mono font-bold">
                                                                    +{formatKoreanDamage(estHeal)} HP
                                                                </span>
                                                            </div>
                                                            {estMpHeal > 0 && (
                                                                <div>
                                                                    <span className="text-slate-500 text-[10px] block">마나 회복 기대치</span>
                                                                    <span className="text-blue-400 font-mono font-bold">
                                                                        +{formatKoreanDamage(estMpHeal)} MP
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <span className="text-slate-500 text-[10px] block">회복 효율 (마나 1당)</span>
                                                                <span className="text-emerald-300 font-mono font-bold">
                                                                    {formatKoreanDamage(healEfficiency)} 힐
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500 text-[10px] block">대상</span>
                                                                <span className="text-slate-300 font-bold">
                                                                    {skill.targetType === 'aoe' ? '아군 전체' : '아군 1인'}
                                                                </span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="col-span-full">
                                                            <span className="text-slate-500 text-[10px] block">버프 및 상태이상 효과</span>
                                                            <span className="text-purple-300 font-bold">{buffDesc}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* 스킬 부가 상태이상 발동 정보 */}
                                            {ailmentProcs.length > 0 && (
                                                <div className="flex items-center gap-2 text-xs pt-0.5">
                                                    <span className="text-slate-500">부가 효과:</span>
                                                    {ailmentProcs.map((proc, i) => (
                                                        <span key={i} className="text-amber-300 font-bold bg-amber-950/40 border border-amber-900/60 px-1.5 py-0.5 rounded text-[11px]">
                                                            [{proc.name}] {proc.duration}턴 지속 (기본 확률 {proc.chance}%)
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 하단 닫기 바 */}
                <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2 shrink-0">
                    <div className="text-[11px] text-slate-400 hidden sm:block">
                        * 피해량 공식: 공격력 × 스킬계수 × 속성피해배율 × 방어감쇄(공격력 × 2 / (공격력 + 적 방어력))
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors border border-slate-700"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};
