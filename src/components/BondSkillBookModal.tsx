
import React, { useState, useMemo, useEffect } from 'react';
import { Character, Companion, Skill, BondSkill, SkillType, SkillTarget, ClassTier, RelationType } from '../types';
import { X, Sparkles, Sword, Zap, Shield, Activity, Plus, Trash2, Info, User, Users, CheckCircle2, AlertCircle, HelpCircle, ChevronDown, ChevronUp, Flame, Lock } from 'lucide-react';
import { cleanInvalidBondSkills } from '../services/relationService';
import { areSiblings, isHalfSibling } from '../services/siblingService';
import { extractSkillEffectInfo, combineEffectDescriptions, amplifyStatusEffectDescription } from '../services/BondSkillService';

// 신력계통 시너지 매핑 테이블
const SYNERGY_MAP: Record<string, string[]> = {
    '태양계': ['태양계', '광휘계', '화염계'],
    '광휘계': ['광휘계', '태양계', '전격계'],
    '월광계': ['월광계', '암흑계', '무기강화계'],
    '암흑계': ['암흑계', '월광계', '신체강화계'],
    '대지계': ['대지계', '초화계', '빙결계'],
    '초화계': ['초화계', '대지계', '질풍계'],
    '화염계': ['화염계', '태양계', '질풍계'],
    '해수계': ['해수계', '빙결계', '전격계'],
    '질풍계': ['질풍계', '화염계', '초화계'],
    '전격계': ['전격계', '해수계', '빙결계'],
    '빙결계': ['빙결계', '전격계', '해수계', '대지계'],
    '무기강화계': ['무기강화계', '신체강화계', '월광계'],
    '신체강화계': ['신체강화계', '무기강화계', '암흑계']
};

const checkElementSynergy = (elem1?: string, elem2?: string): boolean => {
    if (!elem1 || !elem2 || elem1 === '무속성' || elem2 === '무속성') return false;
    const clean1 = elem1.trim();
    const clean2 = elem2.trim();
    if (clean1 === clean2) return true;
    const list1 = SYNERGY_MAP[clean1] || [];
    const list2 = SYNERGY_MAP[clean2] || [];
    return list1.includes(clean2) || list2.includes(clean1);
};

interface Props {
    character: Character;
    companion: Companion;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

const BondSkillBookModal: React.FC<Props> = ({ character, companion, onClose, onUpdateCharacter }) => {
    const [skillName, setSkillName] = useState('');
    const [selectedPlayerSkill, setSelectedPlayerSkill] = useState<Skill | null>(null);
    const [selectedCompanionSkill, setSelectedCompanionSkill] = useState<Skill | null>(null);
    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
    const [showGuide, setShowGuide] = useState(false); // [MODIFIED] Default to collapsed to keep view clean
    const [customSelectedElement, setCustomSelectedElement] = useState<string>('');

    // Clean up any severed bond skills on mount
    useEffect(() => {
        const cleaned = cleanInvalidBondSkills(character);
        if (cleaned.bondSkills?.length !== character.bondSkills?.length) {
            onUpdateCharacter(cleaned, `[인연 정리] 관계가 끊어진 인연 스킬을 자동 정리했습니다.`);
        }
    }, []);

    // Get all valid companions (party + base inactive)
    const allCompanions = useMemo(() => {
        return [...character.companions, ...(character.inactiveCompanions || [])].filter(c => !c.isDead && !c.isPurged);
    }, [character.companions, character.inactiveCompanions]);

    // Helper to parse year and month safely from various date formats
    const parseYearMonth = (dateStr?: string): { year: number, month: number } | null => {
        if (!dateStr) return null;
        const numbers = dateStr.match(/\d+/g);
        if (!numbers || numbers.length === 0) return null;
        const year = parseInt(numbers[0], 10);
        const month = numbers.length >= 2 ? parseInt(numbers[1], 10) : 1;
        if (isNaN(year) || year < 1000) return null;
        return { year, month: isNaN(month) || month < 1 || month > 12 ? 1 : month };
    };

    const getMonthsDiff = (startDate?: string, endDate?: string): number => {
        const start = parseYearMonth(startDate);
        const end = parseYearMonth(endDate);
        if (!start || !end) return 0;
        return Math.max(0, (end.year - start.year) * 12 + (end.month - start.month));
    };

    const getLoverMonths = (c1: Companion, partner?: Companion): number => {
        const rel1 = partner?.id ? (c1.relations?.[partner.id] as any) : undefined;
        const rel2 = partner?.id ? (partner.relations?.[c1.id] as any) : undefined;
        const startDate = c1.loverStartDate || partner?.loverStartDate || 
                          rel1?.loverStartDate || rel1?.sinceDate || rel1?.startDate ||
                          rel2?.loverStartDate || rel2?.sinceDate || rel2?.startDate;
        if (startDate && character.currentDate) {
            return getMonthsDiff(startDate, character.currentDate);
        }
        const current = parseYearMonth(character.currentDate);
        if (current) {
            const currYear = current.year;
            const currMonth = current.month;
            const met1 = c1.metYear || currYear;
            const met2 = partner?.metYear || currYear;
            const startYear = Math.max(met1, met2);
            return Math.max(0, (currYear - startYear) * 12 + (currMonth - 1));
        }
        return 0;
    };

    // Current year and years known with target
    const currentYear = character.currentDate ? (parseYearMonth(character.currentDate)?.year || 2000) : 2000;
    const getYearsKnown = (comp: Companion) => Math.max(0, currentYear - (comp.metYear || currentYear));
    const getYearsTogether = (c1: Companion, c2: Companion) => Math.max(0, currentYear - Math.max(c1.metYear || currentYear, c2.metYear || currentYear));
    
    // Strict relationship check for Player (only if player is actual partner or strong bond)
    const isPlayerSpouse = Boolean(companion.isSpouse && (companion.partnerId === 'player' || (!companion.partnerId && !companion.partnerName)));
    const isPlayerLover = Boolean(companion.isLover && (companion.partnerId === 'player' || (!companion.partnerId && !companion.partnerName)));
    const playerLoverMonths = getLoverMonths(companion);
    const isPlayerLoverQualified = isPlayerLover && (playerLoverMonths >= 12);

    // [NEW] 형제자매 조건 (친형제 90 이상, 이복/이부 100 이상)
    const isSibWithPlayer = companion.relation === RelationType.SIBLING || 
                            companion.relations?.['player']?.type === RelationType.SIBLING || 
                            areSiblings(character, companion, character);
    let isPlayerSiblingQualified = false;
    if (isSibWithPlayer) {
        const isHalf = isHalfSibling(character, companion, character);
        if (isHalf) {
            isPlayerSiblingQualified = (companion.affection || 0) >= 100;
        } else {
            isPlayerSiblingQualified = (companion.affection || 0) >= 90;
        }
    }

    const isSwornSibWithPlayer = companion.relation === RelationType.SWORN_SIBLING || 
                                  companion.relations?.['player']?.type === RelationType.SWORN_SIBLING;

    const isPlayerCloseToTarget = isPlayerSpouse || isPlayerLoverQualified || isPlayerSiblingQualified || isSwornSibWithPlayer || (companion.affection >= 90 && getYearsKnown(companion) >= 10);

    // Eligible sources: Player (if qualified) + Companions with relationship/bond to target
    const eligibleSources = useMemo(() => {
        const sources: { id: string, name: string, skills: Skill[] }[] = [];
        
        // 1. Add Player ONLY if qualified
        if (isPlayerCloseToTarget) {
            sources.push({ id: 'player', name: character.name, skills: character.skills || [] });
        }
        
        // 2. Add other companions if they have a relationship (Spouse, Lover, Sibling, Sworn Sibling, or 10-year shared bond) with target companion
        allCompanions.forEach(c => {
            if (c.id === companion.id) return;

            const isSpouseWithTarget = Boolean(
                (c.isSpouse && (c.partnerId === companion.id || (companion.name && c.partnerName === companion.name))) ||
                (companion.isSpouse && (companion.partnerId === c.id || (c.name && companion.partnerName === c.name))) ||
                c.relations?.[companion.id]?.type === '배우자' ||
                companion.relations?.[c.id]?.type === '배우자' ||
                c.relations?.[companion.id]?.type === RelationType.SPOUSE ||
                companion.relations?.[c.id]?.type === RelationType.SPOUSE
            );

            const isLoverWithTarget = Boolean(
                (c.isLover && (c.partnerId === companion.id || (companion.name && c.partnerName === companion.name))) ||
                (companion.isLover && (companion.partnerId === c.id || (c.name && companion.partnerName === c.name))) ||
                c.relations?.[companion.id]?.type === '연인' ||
                companion.relations?.[c.id]?.type === '연인' ||
                c.relations?.[companion.id]?.type === RelationType.LOVER ||
                companion.relations?.[c.id]?.type === RelationType.LOVER
            );

            // 형제자매 조건
            const isSibWithTarget = c.relations?.[companion.id]?.type === RelationType.SIBLING ||
                                    companion.relations?.[c.id]?.type === RelationType.SIBLING ||
                                    areSiblings(c, companion, character);
            let isCompSiblingQualified = false;
            if (isSibWithTarget) {
                const isHalf = isHalfSibling(c, companion, character);
                const cAff = c.relations?.[companion.id]?.affection ?? c.affection ?? 0;
                if (isHalf) {
                    isCompSiblingQualified = cAff >= 100;
                } else {
                    isCompSiblingQualified = cAff >= 90;
                }
            }

            const isSwornSibWithTarget = c.relations?.[companion.id]?.type === RelationType.SWORN_SIBLING ||
                                         companion.relations?.[c.id]?.type === RelationType.SWORN_SIBLING;

            const yearsTogether = getYearsTogether(c, companion);
            const has10YearsBond = yearsTogether >= 10;

            // Include in sources dropdown if Spouse, Lover, Sibling, Sworn Sibling, or 10-year bond
            if (isSpouseWithTarget || isLoverWithTarget || isCompSiblingQualified || isSwornSibWithTarget || has10YearsBond) {
                sources.push({ id: c.id, name: c.name, skills: c.skills || [] });
            }
        });

        return sources;
    }, [allCompanions, companion, isPlayerCloseToTarget, character.name, character.skills, character.currentDate]);

    // Ensure selectedSourceId is valid and prioritize lover/spouse partner
    useEffect(() => {
        if (eligibleSources.length > 0) {
            if (!selectedSourceId || !eligibleSources.find(s => s.id === selectedSourceId)) {
                // If companion is lovers/spouse with another companion, prioritize selecting that partner
                const partnerSource = eligibleSources.find(s => 
                    s.id === companion.partnerId || 
                    (companion.partnerName && s.name === companion.partnerName)
                );
                setSelectedSourceId(partnerSource ? partnerSource.id : eligibleSources[0].id);
            }
        } else {
            setSelectedSourceId(null);
        }
    }, [eligibleSources, selectedSourceId, companion.partnerId, companion.partnerName]);

    const currentSource = useMemo(() => {
        if (!selectedSourceId) return null;
        if (selectedSourceId === 'player') {
            return isPlayerCloseToTarget ? { id: 'player', name: character.name, skills: character.skills || [] } : null;
        }
        return eligibleSources.find(s => s.id === selectedSourceId) || null;
    }, [selectedSourceId, eligibleSources, isPlayerCloseToTarget, character.name, character.skills]);

    const playerSkills = useMemo(() => {
        return currentSource ? (currentSource.skills || []).filter(s => s.type !== SkillType.PASSIVE) : [];
    }, [currentSource]);

    const companionSkills = useMemo(() => {
        return (companion.skills || []).filter(s => s.type !== SkillType.PASSIVE);
    }, [companion.skills]);

    const existingBondSkills = useMemo(() => {
        return (character.bondSkills || []).filter(bs => {
            if (selectedSourceId === 'player') {
                return (
                    (bs.companionId === companion.id && (!bs.sourceId || bs.sourceId === 'player')) ||
                    (bs.sourceId === companion.id && (!bs.companionId || bs.companionId === 'player'))
                );
            } else {
                return (
                    (bs.companionId === companion.id && bs.sourceId === selectedSourceId) ||
                    (bs.companionId === selectedSourceId && bs.sourceId === companion.id)
                );
            }
        });
    }, [character.bondSkills, companion.id, selectedSourceId]);

    const targetSourceComp = selectedSourceId !== 'player' ? allCompanions.find(c => c.id === selectedSourceId) : null;

    const isSpouse = selectedSourceId === 'player' 
        ? isPlayerSpouse 
        : Boolean(
            targetSourceComp?.relations?.[companion.id]?.type === '배우자' ||
            companion.relations?.[selectedSourceId || '']?.type === '배우자' ||
            targetSourceComp?.relations?.[companion.id]?.type === RelationType.SPOUSE ||
            companion.relations?.[selectedSourceId || '']?.type === RelationType.SPOUSE ||
            (targetSourceComp?.isSpouse && (targetSourceComp.partnerId === companion.id || (companion.name && targetSourceComp.partnerName === companion.name))) ||
            (companion.isSpouse && (companion.partnerId === targetSourceComp?.id || (targetSourceComp?.name && companion.partnerName === targetSourceComp.name)))
        );

    const isLover = selectedSourceId === 'player' 
        ? isPlayerLover 
        : Boolean(
            targetSourceComp?.relations?.[companion.id]?.type === '연인' ||
            companion.relations?.[selectedSourceId || '']?.type === '연인' ||
            targetSourceComp?.relations?.[companion.id]?.type === RelationType.LOVER ||
            companion.relations?.[selectedSourceId || '']?.type === RelationType.LOVER ||
            (targetSourceComp?.isLover && (targetSourceComp.partnerId === companion.id || (companion.name && targetSourceComp.partnerName === companion.name))) ||
            (companion.isLover && (companion.partnerId === targetSourceComp?.id || (targetSourceComp?.name && companion.partnerName === targetSourceComp.name)))
        );

    const maxBondSkills = isSpouse ? 2 : 1;
    const canCreateMore = existingBondSkills.length < maxBondSkills;

    const currentSourceShinryokuType = useMemo(() => {
        if (!selectedSourceId) return '무속성';
        if (selectedSourceId === 'player') return character.shinryokuType || '무속성';
        const comp = allCompanions.find(c => c.id === selectedSourceId);
        return comp?.shinryokuType || '무속성';
    }, [selectedSourceId, character.shinryokuType, allCompanions]);

    // 스킬 속성이 '무속성'이거나 비어있으면 소유 캐릭터의 본래 신력계통 속성을 사용
    const playerSkillEffectiveElem = useMemo(() => {
        if (!selectedPlayerSkill) return '무속성';
        if (selectedPlayerSkill.shinryokuType && selectedPlayerSkill.shinryokuType !== '무속성') {
            return selectedPlayerSkill.shinryokuType;
        }
        return currentSourceShinryokuType !== '무속성' ? currentSourceShinryokuType : '무속성';
    }, [selectedPlayerSkill, currentSourceShinryokuType]);

    const companionSkillEffectiveElem = useMemo(() => {
        if (!selectedCompanionSkill) return '무속성';
        if (selectedCompanionSkill.shinryokuType && selectedCompanionSkill.shinryokuType !== '무속성') {
            return selectedCompanionSkill.shinryokuType;
        }
        return companion.shinryokuType && companion.shinryokuType !== '무속성' ? companion.shinryokuType : '무속성';
    }, [selectedCompanionSkill, companion.shinryokuType]);

    // [NEW] 속성(신력계통) 결정 및 동율 시 사용자 선택
    const calculatedSkillElement = useMemo(() => {
        if (!selectedPlayerSkill || !selectedCompanionSkill) return '';

        const ratio1 = selectedPlayerSkill.powerRatio || 100;
        const ratio2 = selectedCompanionSkill.powerRatio || 100;

        const elem1 = playerSkillEffectiveElem;
        const elem2 = companionSkillEffectiveElem;

        if (ratio1 > ratio2) {
            return elem1;
        } else if (ratio2 > ratio1) {
            return elem2;
        } else {
            if (elem1 === elem2) return elem1;
            return customSelectedElement || elem1;
        }
    }, [selectedPlayerSkill, selectedCompanionSkill, playerSkillEffectiveElem, companionSkillEffectiveElem, customSelectedElement]);

    const isPowerRatioEqual = useMemo(() => {
        if (!selectedPlayerSkill || !selectedCompanionSkill) return false;
        const ratio1 = selectedPlayerSkill.powerRatio || 100;
        const ratio2 = selectedCompanionSkill.powerRatio || 100;
        const elem1 = playerSkillEffectiveElem;
        const elem2 = companionSkillEffectiveElem;
        return ratio1 === ratio2 && elem1 !== elem2;
    }, [selectedPlayerSkill, selectedCompanionSkill, playerSkillEffectiveElem, companionSkillEffectiveElem]);

    // [NEW] 필요 신력계통 조각 개수 계산 (퍼스트: 5, 세컨드: 10, 라스트: 30, 파이널: 100)
    const targetSkillTier = useMemo(() => {
        if (!selectedPlayerSkill || !selectedCompanionSkill) return ClassTier.FIRST;
        const t1 = selectedPlayerSkill.tier;
        const t2 = selectedCompanionSkill.tier;
        const tierPriority = (t: any) => {
            const str = String(t).toUpperCase();
            if (str.includes('FINAL') || str.includes('파이널')) return 4;
            if (str.includes('LAST') || str.includes('라스트')) return 3;
            if (str.includes('SECOND') || str.includes('세컨드')) return 2;
            if (str.includes('FIRST') || str.includes('퍼스트')) return 1;
            return 1;
        };
        return tierPriority(t1) >= tierPriority(t2) ? t1 : t2;
    }, [selectedPlayerSkill, selectedCompanionSkill]);

    const requiredShardCount = useMemo(() => {
        const t = String(targetSkillTier || '').toUpperCase();
        if (t.includes('FINAL') || t.includes('파이널')) return 100;
        if (t.includes('LAST') || t.includes('라스트')) return 30;
        if (t.includes('SECOND') || t.includes('세컨드')) return 10;
        if (t.includes('FIRST') || t.includes('퍼스트')) return 5;
        return 5;
    }, [targetSkillTier]);

    // [NEW] 신력계통 시너지 여부 및 최종 융합 위력 계산 (시너지 발생 시 PowerRatio 1.5배 추가 증폭)
    const hasElementSynergy = useMemo(() => {
        if (!selectedPlayerSkill || !selectedCompanionSkill) return false;
        const elem1 = playerSkillEffectiveElem;
        const elem2 = companionSkillEffectiveElem;
        return checkElementSynergy(elem1, elem2);
    }, [selectedPlayerSkill, selectedCompanionSkill, playerSkillEffectiveElem, companionSkillEffectiveElem]);

    const calculatedSkillType = useMemo(() => {
        if (!selectedPlayerSkill || !selectedCompanionSkill) return SkillType.PHYSICAL;
        const t1 = selectedPlayerSkill.type;
        const t2 = selectedCompanionSkill.type;

        if (t1 === SkillType.BUFF && t2 === SkillType.BUFF) return SkillType.BUFF;
        if (t1 === SkillType.DEBUFF && t2 === SkillType.DEBUFF) return SkillType.DEBUFF;

        const isAttack = (t: SkillType) => t === SkillType.PHYSICAL || t === SkillType.MAGIC || t === SkillType.HEAL || t === SkillType.SUMMON || t === SkillType.CLONE;
        if (isAttack(t1) && (t2 === SkillType.BUFF || t2 === SkillType.DEBUFF)) return t1;
        if (isAttack(t2) && (t1 === SkillType.BUFF || t1 === SkillType.DEBUFF)) return t2;

        if (isAttack(t1) && isAttack(t2)) {
            const ratio1 = selectedPlayerSkill.powerRatio || 100;
            const ratio2 = selectedCompanionSkill.powerRatio || 100;
            return ratio1 >= ratio2 ? t1 : t2;
        }

        return t1;
    }, [selectedPlayerSkill, selectedCompanionSkill]);

    const isBuffDebuffConflict = useMemo(() => {
        if (!selectedPlayerSkill || !selectedCompanionSkill) return false;
        const t1 = selectedPlayerSkill.type;
        const t2 = selectedCompanionSkill.type;
        const isBuff = (t: SkillType) => t === SkillType.BUFF || String(t).includes('버프');
        const isDebuff = (t: SkillType) => t === SkillType.DEBUFF || String(t).includes('디버프');
        return (isBuff(t1) && isDebuff(t2)) || (isDebuff(t1) && isBuff(t2));
    }, [selectedPlayerSkill, selectedCompanionSkill]);

    const calculatedTargetType = useMemo(() => {
        if (!selectedPlayerSkill || !selectedCompanionSkill) return 'single';
        const t1 = selectedPlayerSkill.type;
        const t2 = selectedCompanionSkill.type;

        const isBuff = (t: SkillType) => t === SkillType.BUFF || String(t).includes('버프');
        const isDebuff = (t: SkillType) => t === SkillType.DEBUFF || String(t).includes('디버프');

        // [규칙] 버프+버프 또는 디버프+디버프: 둘 다 광역일 때만 광역, 단일+광역 / 단일+단일은 무조건 단일!
        if ((isBuff(t1) && isBuff(t2)) || (isDebuff(t1) && isDebuff(t2))) {
            const isT1Aoe = (selectedPlayerSkill.targetType as string) === 'aoe' || (selectedPlayerSkill.targetType as string) === 'all';
            const isT2Aoe = (selectedCompanionSkill.targetType as string) === 'aoe' || (selectedCompanionSkill.targetType as string) === 'all';
            return (isT1Aoe && isT2Aoe) ? 'aoe' : 'single';
        }

        const isAttack = (t: SkillType) => t === SkillType.PHYSICAL || t === SkillType.MAGIC || t === SkillType.HEAL || t === SkillType.SUMMON || t === SkillType.CLONE;

        if (isAttack(t1) && (isBuff(t2) || isDebuff(t2))) {
            return selectedPlayerSkill.targetType || 'single';
        }
        if (isAttack(t2) && (isBuff(t1) || isDebuff(t1))) {
            return selectedCompanionSkill.targetType || 'single';
        }

        return (selectedPlayerSkill.targetType === 'aoe' || selectedCompanionSkill.targetType === 'aoe') ? 'aoe' : 'single';
    }, [selectedPlayerSkill, selectedCompanionSkill]);

    const combinationCategory = useMemo(() => {
        if (!selectedPlayerSkill || !selectedCompanionSkill) return null;
        const t1 = selectedPlayerSkill.type;
        const t2 = selectedCompanionSkill.type;

        const isAttack = (t: SkillType) => t === SkillType.PHYSICAL || t === SkillType.MAGIC || t === SkillType.HEAL || t === SkillType.SUMMON || t === SkillType.CLONE;
        const isBuff = (t: SkillType) => t === SkillType.BUFF || String(t).includes('버프');
        const isDebuff = (t: SkillType) => t === SkillType.DEBUFF || String(t).includes('디버프');

        // [규칙] 버프 + 디버프 조합은 불가!
        if ((isBuff(t1) && isDebuff(t2)) || (isDebuff(t1) && isBuff(t2))) {
            return {
                name: "융합 불가 (버프 + 디버프)",
                desc: "버프 스킬과 디버프 스킬은 서로 성질이 상충하여 융합할 수 없습니다.",
                penaltyText: "융합 불가",
                affectionText: "다른 기술 조합을 선택해주세요."
            };
        }

        if (isAttack(t1) && isAttack(t2)) {
            return {
                name: "맹렬 융합 (공격 + 공격)",
                desc: "두 개의 강력한 격투/공격 기술이 부딪혀 위력을 150% 증폭시킵니다.",
                penaltyText: "감쇄 없음 (기본 배율 150%)",
                affectionText: `호감도 보너스: +${companion.affection * 2}% 위력 추가`
            };
        }
        if ((isAttack(t1) && isBuff(t2)) || (isBuff(t1) && isAttack(t2))) {
            const buffSkill = isBuff(t1) ? selectedPlayerSkill : selectedCompanionSkill;
            return {
                name: `융합 버프 연계 - ${buffSkill.name}`,
                desc: `타격을 가함과 동시에 결합된 ${buffSkill.name} 버프를 발동하여 전장의 주도권을 가져옵니다.`,
                penaltyText: "위력 감쇄 15% 적용 (유틸리티 패널티)",
                affectionText: `호감도 보너스: +${companion.affection * 2}% 위력 추가`
            };
        }
        if ((isAttack(t1) && isDebuff(t2)) || (isDebuff(t1) && isAttack(t2))) {
            const debuffSkill = isDebuff(t1) ? selectedPlayerSkill : selectedCompanionSkill;
            return {
                name: `융합 디버프 연계 - ${debuffSkill.name}`,
                desc: `명치를 가격하며 결합된 ${debuffSkill.name} 디버프(성공률 70%)를 주입하여 적을 무력화합니다.`,
                penaltyText: "위력 감쇄 20% 적용 (유틸리티 패널티)",
                affectionText: `호감도 보너스: +${companion.affection * 2}% 위력 추가`
            };
        }
        if (isBuff(t1) && isBuff(t2)) {
            const hasSyn = hasElementSynergy;
            const pEff = extractSkillEffectInfo(selectedPlayerSkill, 1.0);
            const cEff = extractSkillEffectInfo(selectedCompanionSkill, 1.0);
            const combinedDesc = combineEffectDescriptions(pEff?.effect, cEff?.effect);
            const isAoe = ((selectedPlayerSkill.targetType as string) === 'aoe' || (selectedPlayerSkill.targetType as string) === 'all') && 
                          ((selectedCompanionSkill.targetType as string) === 'aoe' || (selectedCompanionSkill.targetType as string) === 'all');
            const targetScope = isAoe ? "아군 전원에게" : "시전자에게";
            return {
                name: `신성 공명 (통합 인연 버프)`,
                desc: hasSyn
                    ? `신력계통 조화 발동! 두 아군의 버프가 하나로 합쳐져 ${targetScope} 1.25배 증폭된 인연 버프(${combinedDesc || '강화 효과'})를 수여합니다.`
                    : `두 아군의 버프가 하나로 합쳐져 ${targetScope} 통합 인연 버프(${combinedDesc || '강화 효과'})를 수여합니다.`,
                penaltyText: hasSyn ? "신력 조화: 위력 증폭 125% 적용" : "증폭 배율 없음 (기본 100%)",
                affectionText: `호감도 보너스: +${companion.affection * 3}% 위력 추가`
            };
        }
        if (isDebuff(t1) && isDebuff(t2)) {
            const hasSyn = hasElementSynergy;
            const pEff = extractSkillEffectInfo(selectedPlayerSkill, 1.0);
            const cEff = extractSkillEffectInfo(selectedCompanionSkill, 1.0);
            const combinedDesc = combineEffectDescriptions(pEff?.effect, cEff?.effect);
            const isAoe = ((selectedPlayerSkill.targetType as string) === 'aoe' || (selectedPlayerSkill.targetType as string) === 'all') && 
                          ((selectedCompanionSkill.targetType as string) === 'aoe' || (selectedCompanionSkill.targetType as string) === 'all');
            const targetScope = isAoe ? "적 전원에게" : "단일 대상에게";
            return {
                name: `저주 각인 (통합 인연 디버프)`,
                desc: hasSyn
                    ? `신력계통 조화 발동! 두 저주가 하나로 합쳐져 ${targetScope} 1.25배 증폭된 인연 저주(${combinedDesc || '약화 효과'}, 성공률 85%)를 각인합니다.`
                    : `두 저주가 하나로 합쳐져 ${targetScope} 통합 인연 저주(${combinedDesc || '약화 효과'}, 성공률 85%)를 각인합니다.`,
                penaltyText: hasSyn ? "신력 조화: 위력 증폭 125% 적용" : "증폭 배율 없음 (기본 100%)",
                affectionText: `호감도 보너스: +${companion.affection * 3}% 위력 추가`
            };
        }

        return {
            name: "하이브리드 융합",
            desc: "서로 다른 스펙의 기술들이 교차 결합됩니다.",
            penaltyText: "기본 배율 적용",
            affectionText: `호감도 보너스: +${companion.affection * 2}% 위력 추가`
        };
    }, [selectedPlayerSkill, selectedCompanionSkill, companion.affection]);

    const calculatedPowerRatio = useMemo(() => {
        if (!selectedPlayerSkill || !selectedCompanionSkill) return 0;
        const t1 = selectedPlayerSkill.type;
        const t2 = selectedCompanionSkill.type;

        const isAttack = (t: SkillType) => t === SkillType.PHYSICAL || t === SkillType.MAGIC || t === SkillType.HEAL || t === SkillType.SUMMON || t === SkillType.CLONE;
        const isBuff = (t: SkillType) => t === SkillType.BUFF;
        const isDebuff = (t: SkillType) => t === SkillType.DEBUFF;

        const ratio1 = selectedPlayerSkill.powerRatio || 100;
        const ratio2 = selectedCompanionSkill.powerRatio || 100;

        let base = 0;
        let affectionBonus = companion.affection * 2;

        if (isAttack(t1) && isAttack(t2)) {
            base = Math.round((ratio1 + ratio2) * 1.5);
        } else if ((isAttack(t1) && isBuff(t2)) || (isBuff(t1) && isAttack(t2))) {
            const atkRatio = isAttack(t1) ? ratio1 : ratio2;
            base = Math.round(atkRatio * 0.85);
        } else if ((isAttack(t1) && isDebuff(t2)) || (isDebuff(t1) && isAttack(t2))) {
            const atkRatio = isAttack(t1) ? ratio1 : ratio2;
            base = Math.round(atkRatio * 0.80);
        } else if (isBuff(t1) && isBuff(t2)) {
            base = Math.round((ratio1 + ratio2) * 1.8);
            affectionBonus = companion.affection * 3;
        } else if (isDebuff(t1) && isDebuff(t2)) {
            base = Math.round((ratio1 + ratio2) * 1.8);
            affectionBonus = companion.affection * 3;
        } else {
            base = Math.round((ratio1 + ratio2) * 1.5);
        }

        if (hasElementSynergy) {
            base = Math.round(base * 1.5);
        }

        return base + affectionBonus;
    }, [selectedPlayerSkill, selectedCompanionSkill, hasElementSynergy, companion.affection]);

    // [NEW] 보유 신력계통 조각 보유 수량 계산 (기지 자원 character.base.elementalShards 연동)
    const ownedShardCount = useMemo(() => {
        if (!calculatedSkillElement || calculatedSkillElement === '무속성') return 99999;
        const cleanKey = calculatedSkillElement.trim();
        const shortKey = cleanKey.endsWith('계') ? cleanKey.slice(0, -1) : cleanKey;

        let total = 0;

        // 1. 기지 신력계통 조각 자원 (character.base.elementalShards)
        const baseShards = character.base?.elementalShards || {};
        total += (baseShards[cleanKey] || 0) + (baseShards[shortKey] || 0);

        // 2. character.shards
        const charShards = (character as any).shards || {};
        total += (charShards[cleanKey] || 0) + (charShards[shortKey] || 0);

        // 3. 인벤토리 내 조각 아이템 (character.inventory)
        const inventory = character.inventory || [];
        inventory.forEach(item => {
            const name = item.name || '';
            if (name === `${cleanKey} 조각` || name === `${shortKey} 조각` || name === cleanKey || name === shortKey) {
                total += (item.quantity || 1);
            }
        });

        return total;
    }, [character.base?.elementalShards, (character as any).shards, character.inventory, calculatedSkillElement]);

    const handleCreateBondSkill = () => {
        if (!skillName.trim() || !selectedPlayerSkill || !selectedCompanionSkill || !canCreateMore || !currentSource) return;

        // 버프 + 디버프 조합 차단
        if (isBuffDebuffConflict) {
            alert("버프 스킬과 디버프 스킬은 서로 성질이 상충하여 융합할 수 없습니다.");
            return;
        }

        // Double protection for relationship
        const isSourcePlayer = selectedSourceId === 'player';
        const isRelationshipMet = isSourcePlayer 
            ? isPlayerCloseToTarget 
            : (isSpouse || (isLover && targetSourceComp && getLoverMonths(targetSourceComp, companion) >= 12) || (targetSourceComp && getYearsTogether(targetSourceComp, companion) >= 10));

        if (!isRelationshipMet) {
            if (isSourcePlayer && isPlayerLover && playerLoverMonths < 12) {
                alert(`연인 관계의 경우 1년(12개월) 이상의 교제 기간이 필요합니다. (현재 교제 기간: ${playerLoverMonths}개월)`);
                return;
            }
            if (!isSourcePlayer && isLover && targetSourceComp && getLoverMonths(targetSourceComp, companion) < 12) {
                const compLoverMonths = getLoverMonths(targetSourceComp, companion);
                alert(`동료 간 연인 관계의 경우 1년(12개월) 이상의 교제 기간이 필요합니다. (현재 교제 기간: ${compLoverMonths}개월)`);
                return;
            }
            alert("선택된 대상과 충분히 깊은 관계가 아닙니다. (배우자, 1년 이상 연인, 또는 10년 세월 유대 필요)");
            return;
        }

        // Check level 10 requirement
        if ((selectedPlayerSkill.level || 1) < 10 || (selectedCompanionSkill.level || 1) < 10) {
            alert("조합하는 스킬의 레벨이 모두 10 이상이어야 합니다.");
            return;
        }

        // [NEW] 신력계통 조각 보유 수량 검증
        if (calculatedSkillElement && calculatedSkillElement !== '무속성') {
            if (ownedShardCount < requiredShardCount) {
                alert(`[${calculatedSkillElement} 조각]이 부족합니다.\n필요 수량: ${requiredShardCount}개 / 현재 보유: ${ownedShardCount}개`);
                return;
            }
        }

        const basePowerRatio = calculatedPowerRatio;

        const getTierRank = (t?: string | ClassTier) => {
            if (!t) return 1;
            if (t === ClassTier.NONE || t === '미해방' || t === '없음') return 0;
            if (t === ClassTier.FIRST || t === '퍼스트 클래스' || t === '퍼스트클래스') return 1;
            if (t === ClassTier.SECOND || t === '세컨드 클래스' || t === '세컨드클래스') return 2;
            if (t === ClassTier.LAST || t === '라스트 클래스' || t === '라스트클래스') return 3;
            if (t === ClassTier.FINAL || t === '파이널 클래스' || t === '파이널클래스') return 4;
            return 1;
        };
        const pRank = getTierRank((selectedPlayerSkill as any).baseTier || selectedPlayerSkill.tier);
        const cRank = getTierRank((selectedCompanionSkill as any).baseTier || selectedCompanionSkill.tier);
        const minRank = Math.min(pRank, cRank);
        const rankToTier: Record<number, ClassTier> = {
            0: ClassTier.NONE,
            1: ClassTier.FIRST,
            2: ClassTier.SECOND,
            3: ClassTier.LAST,
            4: ClassTier.FINAL,
        };
        const minClassTier = rankToTier[minRank] || ClassTier.FIRST;

        // [결합 시점 인식] 버프/디버프 스킬 결합 효과 추출
        const fusedBuffs: { name: string; effect: string; duration: number }[] = [];
        const fusedDebuffs: { name: string; effect: string; duration: number }[] = [];

        // 원본 효과 추출 (기본 1.0배로 추출하고, 전투 시점에 신력계통 조화 여부에 따라 증폭 계산)
        const pEff = extractSkillEffectInfo(selectedPlayerSkill, 1.0);
        const cEff = extractSkillEffectInfo(selectedCompanionSkill, 1.0);

        const isBuffBuff = (calculatedSkillType === SkillType.BUFF) || 
            ((selectedPlayerSkill.type === SkillType.BUFF || String(selectedPlayerSkill.type).includes('버프')) && 
             (selectedCompanionSkill.type === SkillType.BUFF || String(selectedCompanionSkill.type).includes('버프')));

        const isDebuffDebuff = (calculatedSkillType === SkillType.DEBUFF) || 
            ((selectedPlayerSkill.type === SkillType.DEBUFF || String(selectedPlayerSkill.type).includes('디버프')) && 
             (selectedCompanionSkill.type === SkillType.DEBUFF || String(selectedCompanionSkill.type).includes('디버프')));

        if (isBuffBuff) {
            // 버프+버프: 두 아군의 버프 효과를 합쳐서 인연스킬 단일 버프로 완벽 통합! (신력 조화 시 1.25배 증폭)
            const mult = hasElementSynergy ? 1.25 : 1.0;
            const combinedDesc = combineEffectDescriptions(pEff?.effect, cEff?.effect);
            const baseDesc = combinedDesc || "물리 공격력 +25%, 마법 공격력 +25%, 물리 방어력 +15%, 마법 방어력 +15%";
            const finalDesc = mult !== 1.0 ? amplifyStatusEffectDescription(baseDesc, mult) : baseDesc;
            fusedBuffs.push({
                name: `${skillName.trim()} (융합)`,
                effect: finalDesc,
                duration: 4
            });
        } else if (isDebuffDebuff) {
            // 디버프+디버프: 두 적의 디버프 효과를 합쳐서 인연스킬 단일 디버프로 완벽 통합! (신력 조화 시 1.25배 증폭)
            const mult = hasElementSynergy ? 1.25 : 1.0;
            const combinedDesc = combineEffectDescriptions(pEff?.effect, cEff?.effect);
            const baseDesc = combinedDesc || "물리 방어력 -30%, 마법 방어력 -30%, 물리 공격력 -20%, 마법 공격력 -20%";
            const finalDesc = mult !== 1.0 ? amplifyStatusEffectDescription(baseDesc, mult) : baseDesc;
            fusedDebuffs.push({
                name: `${skillName.trim()} (융합)`,
                effect: finalDesc,
                duration: 4
            });
        } else {
            if (pEff) {
                if (pEff.isDebuff) fusedDebuffs.push({ name: `${skillName.trim()} (융합)`, effect: pEff.effect, duration: pEff.duration });
                else fusedBuffs.push({ name: `${skillName.trim()} (융합)`, effect: pEff.effect, duration: pEff.duration });
            }
            if (cEff) {
                if (cEff.isDebuff) fusedDebuffs.push({ name: `${skillName.trim()} (융합)`, effect: cEff.effect, duration: cEff.duration });
                else fusedBuffs.push({ name: `${skillName.trim()} (융합)`, effect: cEff.effect, duration: cEff.duration });
            }
        }

        // [인연스킬 버프 보존] 재료 스킬에 포함된 버프 효과 목록 보존
        const sourcePlayerBuffs = selectedPlayerSkill.buffEffects || [];
        const sourceCompanionBuffs = selectedCompanionSkill.buffEffects || [];
        const combinedBuffEffects = [...sourcePlayerBuffs, ...sourceCompanionBuffs];

        const newBondSkill: BondSkill = {
            id: `bond_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: skillName.trim(),
            description: `${currentSource.name}와(과) ${companion.name}의 유대가 깃든 융합 기술. (${selectedPlayerSkill.name} + ${selectedCompanionSkill.name})`,
            tier: ClassTier.BOND,
            baseTier: minClassTier,
            minClassTier: minClassTier,
            type: calculatedSkillType,
            targetType: calculatedTargetType,
            mpCost: (selectedPlayerSkill.mpCost || 0) + (selectedCompanionSkill.mpCost || 0),
            baseMpCost: (selectedPlayerSkill.mpCost || 0) + (selectedCompanionSkill.mpCost || 0),
            level: 1,
            maxLevel: 10,
            currentMastery: 0,
            effectFormula: `${selectedPlayerSkill.effectFormula || ''} + ${selectedCompanionSkill.effectFormula || ''}`,
            powerRatio: basePowerRatio,
            basePowerRatio: basePowerRatio,
            isBondSkill: true,
            sourceId: selectedSourceId === 'player' ? undefined : selectedSourceId,
            sourceName: selectedSourceId === 'player' ? undefined : currentSource.name,
            companionId: companion.id,
            companionName: companion.name,
            playerSkillName: selectedPlayerSkill.name,
            companionSkillName: selectedCompanionSkill.name,
            playerSkillRatio: selectedPlayerSkill.powerRatio || 100,
            playerSkillType: selectedPlayerSkill.type,
            companionSkillRatio: selectedCompanionSkill.powerRatio || 100,
            companionSkillType: selectedCompanionSkill.type,
            shinryokuType: calculatedSkillElement || undefined,
            playerSkillEffects: selectedPlayerSkill.statusEffects || [],
            companionSkillEffects: selectedCompanionSkill.statusEffects || [],
            buffEffects: combinedBuffEffects.length > 0 ? combinedBuffEffects : undefined,
            fusedBuffEffects: fusedBuffs.length > 0 ? fusedBuffs : undefined,
            fusedDebuffEffects: fusedDebuffs.length > 0 ? fusedDebuffs : undefined,
            hasSynergy: hasElementSynergy,
        };

        // [NEW] 조각 차감 로직 (기지 자원 elementalShards -> shards -> inventory)
        let updatedBase = character.base ? { 
            ...character.base, 
            elementalShards: { ...(character.base.elementalShards || {}) } 
        } : undefined;
        let updatedShards = { ...((character as any).shards || {}) };
        let updatedInventory = [...(character.inventory || [])];

        if (calculatedSkillElement && calculatedSkillElement !== '무속성') {
            const cleanKey = calculatedSkillElement.trim();
            const shortKey = cleanKey.endsWith('계') ? cleanKey.slice(0, -1) : cleanKey;
            let remainingNeeded = requiredShardCount;

            // 1. 기지 신력계통 조각 자원 (character.base.elementalShards) 차감
            if (updatedBase && updatedBase.elementalShards) {
                if (remainingNeeded > 0 && (updatedBase.elementalShards[cleanKey] || 0) > 0) {
                    const avail = updatedBase.elementalShards[cleanKey];
                    const deduct = Math.min(avail, remainingNeeded);
                    updatedBase.elementalShards[cleanKey] -= deduct;
                    remainingNeeded -= deduct;
                }
                if (remainingNeeded > 0 && (updatedBase.elementalShards[shortKey] || 0) > 0) {
                    const avail = updatedBase.elementalShards[shortKey];
                    const deduct = Math.min(avail, remainingNeeded);
                    updatedBase.elementalShards[shortKey] -= deduct;
                    remainingNeeded -= deduct;
                }
            }

            // 2. character.shards 차감
            if (remainingNeeded > 0) {
                if ((updatedShards[cleanKey] || 0) > 0) {
                    const avail = updatedShards[cleanKey];
                    const deduct = Math.min(avail, remainingNeeded);
                    updatedShards[cleanKey] -= deduct;
                    remainingNeeded -= deduct;
                }
                if (remainingNeeded > 0 && (updatedShards[shortKey] || 0) > 0) {
                    const avail = updatedShards[shortKey];
                    const deduct = Math.min(avail, remainingNeeded);
                    updatedShards[shortKey] -= deduct;
                    remainingNeeded -= deduct;
                }
            }

            // 3. 인벤토리 아이템 차감
            if (remainingNeeded > 0) {
                updatedInventory = updatedInventory.map(item => {
                    if (remainingNeeded <= 0) return item;
                    const name = item.name || '';
                    if (name === `${cleanKey} 조각` || name === `${shortKey} 조각` || name === cleanKey || name === shortKey) {
                        const qty = item.quantity || 1;
                        if (qty <= remainingNeeded) {
                            remainingNeeded -= qty;
                            return null;
                        } else {
                            const newQty = qty - remainingNeeded;
                            remainingNeeded = 0;
                            return { ...item, quantity: newQty };
                        }
                    }
                    return item;
                }).filter(Boolean) as any[];
            }
        }

        const updatedChar = {
            ...character,
            base: updatedBase || character.base,
            shards: updatedShards,
            inventory: updatedInventory,
            bondSkills: [...(character.bondSkills || []), newBondSkill]
        };

        const shardMsg = calculatedSkillElement && calculatedSkillElement !== '무속성' ? ` (${calculatedSkillElement} 조각 ${requiredShardCount}개 소모)` : '';
        onUpdateCharacter(updatedChar, `[인연 스킬] ${currentSource.name}와(과) ${companion.name}의 새로운 인연 스킬 [${skillName.trim()}]을(를) 생성했습니다!${shardMsg}`);
        setSkillName('');
        setSelectedPlayerSkill(null);
        setSelectedCompanionSkill(null);
    };

    const handleLevelUpBondSkill = (skillId: string) => {
        const skill = (character.bondSkills || []).find(s => s.id === skillId);
        if (!skill) return;

        if (skill.level >= (skill.maxLevel || 10)) {
            alert("이미 최대 레벨입니다. 기지 연구소에서 한계 돌파를 진행하세요.");
            return;
        }

        const requiredMastery = 20 * (skill.level + 4);
        if (skill.currentMastery < requiredMastery) {
            alert(`숙련도가 부족합니다. (${requiredMastery} 필요)`);
            return;
        }

        const newLevel = skill.level + 1;
        const baseRatio = skill.basePowerRatio || skill.powerRatio || 100;
        const newPowerRatio = Math.round(baseRatio * (1 + (newLevel - 1) / 15));
        const newMpCost = Math.round((skill.baseMpCost || skill.mpCost || 10) * (1 + (newLevel - 1) * 0.1));

        const updatedBondSkills = (character.bondSkills || []).map(s => {
            if (s.id === skillId) {
                return {
                    ...s,
                    level: newLevel,
                    currentMastery: 0,
                    powerRatio: newPowerRatio,
                    mpCost: newMpCost
                };
            }
            return s;
        });

        onUpdateCharacter({ ...character, bondSkills: updatedBondSkills }, `[${skill.name}] 인연 스킬의 레벨이 상승했습니다! (Lv.${newLevel})`);
    };

    const handleDeleteBondSkill = (skillId: string) => {
        const updatedChar = {
            ...character,
            bondSkills: (character.bondSkills || []).filter(s => s.id !== skillId)
        };
        onUpdateCharacter(updatedChar, `인연 스킬을 삭제했습니다.`);
    };

    return (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-pink-500/50 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_40px_rgba(236,72,153,0.3)]">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-slate-900 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-pink-500/20 border border-pink-500/40 rounded-xl shadow-lg">
                            <Sparkles className="text-pink-400" size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black text-white tracking-wide">인연 스킬북</h2>
                                <span className="px-2 py-0.5 bg-pink-900/60 text-pink-300 border border-pink-500/40 rounded-full text-[10px] font-bold">
                                    {companion.name}
                                </span>
                            </div>
                            <p className="text-xs text-pink-300/80">영혼과 유대가 결합된 궁극의 융합 기술을 창조하고 연마합니다.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowGuide(!showGuide)}
                            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                                showGuide 
                                    ? 'bg-pink-600/30 border border-pink-500 text-pink-200' 
                                    : 'bg-slate-800/80 hover:bg-slate-800 border border-pink-500/30 text-pink-300'
                            }`}
                            title="인연 스킬 조건 및 가이드 펼치기/접기"
                        >
                            <HelpCircle size={16} />
                            <span className="hidden sm:inline">시스템 가이드</span>
                            <span className="text-[10px] px-1 py-0.2 bg-slate-900/60 rounded">
                                {showGuide ? '접기' : '펼치기'}
                            </span>
                            {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
                    {/* Collapsible Guide Toggle Banner */}
                    <button 
                        onClick={() => setShowGuide(!showGuide)}
                        className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-pink-950/30 via-purple-950/20 to-slate-900 border border-pink-500/30 hover:border-pink-500/60 rounded-xl text-left transition-all group shadow-sm"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-pink-500/20 text-pink-400 rounded-lg group-hover:scale-105 transition-transform">
                                <Info size={16} />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-pink-300 flex items-center gap-2">
                                    <span>인연(유대) 스킬 생성 조건 및 시스템 가이드</span>
                                    <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-pink-900/50 border border-pink-700/50 rounded text-pink-200">
                                        {showGuide ? '내용 접기' : '자세히 보기'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-400">
                                    {showGuide ? '클릭하여 가이드 설명을 접습니다.' : '연인/배우자/유대 조건, 스킬 Lv.10 융합 규칙 및 위력 150% 공식 확인'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-pink-400 text-xs font-bold bg-slate-900/80 px-2.5 py-1 rounded-lg border border-pink-500/30 group-hover:border-pink-500/60 shrink-0">
                            <span>{showGuide ? '가이드 접기' : '가이드 펼치기'}</span>
                            {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                    </button>

                    {/* [COLLAPSIBLE] Comprehensive Condition & System Guide Panel */}
                    {showGuide && (
                        <div className="bg-gradient-to-br from-slate-950 via-pink-950/20 to-slate-900 border border-pink-500/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between border-b border-pink-900/40 pb-3">
                                <h3 className="text-sm sm:text-base font-bold text-pink-300 flex items-center gap-2">
                                    <Sparkles size={18} className="text-pink-400 shrink-0" />
                                    인연(유대) 스킬 핵심 규칙 안내
                                </h3>
                                <button 
                                    onClick={() => setShowGuide(false)}
                                    className="text-[11px] text-slate-400 hover:text-pink-300 flex items-center gap-1 transition-colors"
                                >
                                    <span>가이드 닫기</span>
                                    <ChevronUp size={14} />
                                </button>
                            </div>

                            {/* 4 Core Pillars Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                {/* 1. Relationship requirement */}
                                <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1.5">
                                    <div className="font-bold text-pink-400 flex items-center gap-1.5">
                                        <Sparkles size={14} /> 1. 관계 및 유대 조건 (택 1 충족)
                                    </div>
                                    <ul className="space-y-1 text-[11px] text-slate-300 pl-1 list-disc list-inside">
                                        <li><strong className="text-pink-300">플레이어 ↔ 동료:</strong> <span className="text-rose-400 font-bold">배우자</span> (즉시) 또는 <span className="text-pink-400 font-bold">연인 (1년/12개월 이상 교제)</span> (또는 호감도 90 이상 & 함께한 시간 10년 이상)</li>
                                        <li><strong className="text-indigo-300">형제자매 관계:</strong> <span className="text-cyan-300 font-bold">친형제자매 (호감도 90 이상)</span> / <span className="text-sky-300 font-bold">이복·이부 형제자매 (호감도 100 이상)</span></li>
                                        <li><strong className="text-purple-300">동료 ↔ 동료:</strong> 동료 간 <span className="text-rose-400 font-bold">배우자</span> (즉시) 또는 <span className="text-pink-400 font-bold">연인 (1년/12개월 이상 교제)</span></li>
                                        <li><strong className="text-purple-300">동료 ↔ 동료 (세월의 유대):</strong> 연인이 아닌 경우 파티에서 함께한 시간 <strong className="text-emerald-400 font-bold">10년 이상</strong> 필요</li>
                                        <li className="text-slate-400 text-[10px]">※ 관계가 끊어지거나 조건 미충족 시 생성된 인연 스킬은 자동으로 소멸됩니다.</li>
                                    </ul>
                                </div>

                                {/* 2. Skill requirement */}
                                <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1.5">
                                    <div className="font-bold text-amber-400 flex items-center gap-1.5">
                                        <Sword size={14} /> 2. 기술 융합 조건 (모두 충족)
                                    </div>
                                    <ul className="space-y-1 text-[11px] text-slate-300 pl-1 list-disc list-inside">
                                        <li>융합할 두 스킬 모두 <strong className="text-amber-300 font-black">레벨 10 (Lv.10) 이상</strong></li>
                                        <li>패시브 및 단순 버프/디버프를 제외한 <strong className="text-indigo-300">액티브 공격/전투 기술</strong></li>
                                        <li>슬롯: 기본 <strong className="text-white">1개</strong> (배우자일 경우 최대 <strong className="text-pink-400 font-bold">2개</strong>)</li>
                                    </ul>
                                </div>

                                {/* 3. Power Formula & Element Synergy */}
                                <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1.5 md:col-span-2">
                                    <div className="font-bold text-purple-400 flex items-center gap-1.5">
                                        <Zap size={14} /> 3. 위력 및 신력계통 시너지 규칙
                                    </div>
                                    <ul className="space-y-1 text-[11px] text-slate-300 pl-1 list-disc list-inside">
                                        <li><strong>기본 융합 위력:</strong> (스킬 1 위력% + 스킬 2 위력%) × <strong className="text-purple-300 font-bold">1.5배 (150%)</strong></li>
                                        <li><strong className="text-amber-300">신력계통 상호 시너지:</strong> 상호 시너지가 발생하는 속성 조합 융합 시 위력이 <strong className="text-amber-400 font-bold">추가 1.5배 증폭</strong></li>
                                        <li><strong className="text-cyan-300">무속성 스킬 속성 적용:</strong> 스킬 속성이 '무속성'이거나 비어있으면 <strong className="text-cyan-200 font-bold">해당 캐릭터의 본래 신력계통 속성</strong>으로 자동 판정됩니다.</li>
                                        <li><strong className="text-emerald-300">신력계통 조각 소모:</strong> 융합 대상 스킬의 최고 등급에 맞춰 조각 소모 (퍼스트: 5개 / 세컨드: 10개 / 라스트: 30개 / 파이널: 100개)</li>
                                    </ul>

                                    <div className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] text-slate-400 space-y-1">
                                        <div className="font-bold text-slate-300">✨ 주요 신력계통 상호 시너지 조합 목록:</div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[10px]">
                                            <div>• <strong className="text-amber-300">태양계:</strong> 광휘계, 화염계</div>
                                            <div>• <strong className="text-amber-300">광휘계:</strong> 태양계, 전격계</div>
                                            <div>• <strong className="text-purple-300">월광계:</strong> 암흑계, 무기강화계</div>
                                            <div>• <strong className="text-purple-300">암흑계:</strong> 월광계, 신체강화계</div>
                                            <div>• <strong className="text-emerald-300">대지계:</strong> 초화계, 빙결계</div>
                                            <div>• <strong className="text-emerald-300">초화계:</strong> 대지계, 질풍계</div>
                                            <div>• <strong className="text-red-300">화염계:</strong> 태양계, 질풍계</div>
                                            <div>• <strong className="text-cyan-300">해수계:</strong> 빙결계, 전격계</div>
                                            <div>• <strong className="text-teal-300">질풍계:</strong> 화염계, 초화계</div>
                                            <div>• <strong className="text-yellow-300">전격계:</strong> 해수계, 빙결계</div>
                                            <div>• <strong className="text-blue-300">빙결계:</strong> 전격계, 해수계, 대지계</div>
                                            <div>• <strong className="text-orange-300">무기강화계:</strong> 무기강화계, 신체강화계, 월광계</div>
                                            <div>• <strong className="text-orange-300">신체강화계:</strong> 신체강화계, 무기강화계, 암흑계</div>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. Mastery & Growth */}
                                <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1.5">
                                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                                        <Flame size={14} /> 4. 성장 및 한계 돌파
                                    </div>
                                    <ul className="space-y-1 text-[11px] text-slate-300 pl-1 list-disc list-inside">
                                        <li>전투에서 인연 스킬을 시전할 때마다 <strong className="text-emerald-300">숙련도 누적</strong></li>
                                        <li>숙련도 100% 달성 시 <strong className="text-white">스킬 레벨업</strong> (위력/계수 강화)</li>
                                        <li>최대 10레벨까지 성장 가능하며, <strong className="text-cyan-300">기지 연구소</strong>에서 추가 한계 돌파 지원</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Compact Target Relationship Status Bar (Always Visible) */}
                    <div className="p-3.5 bg-slate-900/90 border border-pink-500/30 rounded-xl flex flex-wrap items-center justify-between gap-2.5 text-xs shadow-md">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-bold text-slate-200 flex items-center gap-2">
                                <span className="text-sm text-pink-200">{companion.name}</span>
                                {companion.partnerName && (
                                    <span className="text-[11px] text-pink-300 bg-pink-950/80 border border-pink-800/80 px-2 py-0.5 rounded-md font-medium">
                                        파트너: {companion.partnerName} ({companion.isSpouse ? '💖 배우자' : '💘 연인'})
                                    </span>
                                )}
                            </span>
                            {currentSource && (
                                <span className={`px-2.5 py-0.5 rounded-md font-bold text-xs ${isSpouse ? 'bg-rose-950 text-rose-300 border border-rose-800' : isLover ? 'bg-pink-950 text-pink-300 border border-pink-800' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                    {currentSource.name}와(과) {isSpouse ? '💖 부부 (최대 2슬롯)' : isLover ? '💘 연인 (최대 1슬롯)' : '🤝 유대 동료'}
                                </span>
                            )}
                            {selectedSourceId === 'player' ? (
                                <>
                                    {isPlayerLover && !isPlayerSpouse && (
                                        <span className="text-slate-300">
                                            연인 교제 기간: <strong className={playerLoverMonths >= 12 ? 'text-pink-400 font-bold' : 'text-amber-400 font-bold'}>{playerLoverMonths}개월 {playerLoverMonths >= 12 ? '(1년 이상 충족)' : `(${12 - playerLoverMonths}개월 더 필요)`}</strong>
                                        </span>
                                    )}
                                    <span className="text-slate-300">
                                        플레이어 호감도: <strong className={companion.affection >= 90 ? 'text-pink-400 font-bold' : 'text-slate-300'}>{companion.affection} / 100</strong>
                                    </span>
                                    <span className="text-slate-300">
                                        함께한 세월: <strong className={getYearsKnown(companion) >= 10 ? 'text-emerald-400 font-bold' : 'text-slate-300'}>{getYearsKnown(companion)}년</strong>
                                    </span>
                                </>
                            ) : targetSourceComp ? (
                                <>
                                    {isLover && !isSpouse && (
                                        <span className="text-slate-300">
                                            연인 교제 기간: <strong className={getLoverMonths(targetSourceComp, companion) >= 12 ? 'text-pink-400 font-bold' : 'text-amber-400 font-bold'}>
                                                {getLoverMonths(targetSourceComp, companion)}개월 {getLoverMonths(targetSourceComp, companion) >= 12 ? '(1년 이상 충족)' : `(${12 - getLoverMonths(targetSourceComp, companion)}개월 더 필요)`}
                                            </strong>
                                        </span>
                                    )}
                                    <span className="text-slate-300">
                                        상호 호감도: <strong className={((targetSourceComp.relations?.[companion.id]?.affection ?? 0) >= 80 || (companion.relations?.[targetSourceComp.id]?.affection ?? 0) >= 80) ? 'text-pink-400 font-bold' : 'text-slate-300'}>
                                            {Math.max(targetSourceComp.relations?.[companion.id]?.affection ?? 0, companion.relations?.[targetSourceComp.id]?.affection ?? 0)}
                                        </strong>
                                    </span>
                                    <span className="text-slate-300">
                                        함께한 세월: <strong className={getYearsTogether(targetSourceComp, companion) >= 10 ? 'text-emerald-400 font-bold' : 'text-slate-300'}>{getYearsTogether(targetSourceComp, companion)}년</strong>
                                    </span>
                                </>
                            ) : null}
                        </div>
                        <div className="flex items-center gap-1.5">
                            {eligibleSources.length > 0 ? (
                                <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-md text-xs">
                                    <CheckCircle2 size={13} /> 유대 융합 가능 ({eligibleSources.length}명 연계 대상)
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-amber-400 font-bold bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-md text-xs">
                                    <AlertCircle size={13} /> 관계 조건 미충족 (배우자, 1년 이상 연인, 또는 10년 세월 유대 필요)
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Source Selection (Dropdown when multiple eligible partners exist) */}
                    {eligibleSources.length > 1 && (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3.5 sm:p-4 flex items-center gap-4 flex-wrap">
                            <label className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                                <Users size={16} className="text-pink-400" /> 융합 파트너 선택:
                            </label>
                            <select 
                                value={selectedSourceId || ''} 
                                onChange={(e) => {
                                    setSelectedSourceId(e.target.value);
                                    setSelectedPlayerSkill(null);
                                }}
                                className="bg-slate-900 border border-pink-500/40 text-white rounded-lg px-3 py-2 outline-none focus:border-pink-400 text-sm font-medium shadow-inner"
                            >
                                {eligibleSources.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} {s.id === 'player' ? '(플레이어)' : '(동료)'}
                                    </option>
                                ))}
                            </select>
                            <span className="text-xs text-slate-400">
                                {currentSource?.name}와(과) {companion.name}의 스킬을 융합합니다.
                            </span>
                        </div>
                    )}

                    {/* Creation Section */}
                    <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 sm:p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Plus size={20} className="text-pink-400" /> 새로운 인연 스킬 융합 생성
                            </h3>
                            {eligibleSources.length > 0 && (
                                <div className="text-sm text-slate-400">
                                    생성 가능 슬롯: <span className={canCreateMore ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{existingBondSkills.length} / {maxBondSkills}</span>
                                    {isSpouse && <span className="ml-2 text-rose-400 font-bold">(부부 보너스 2슬롯)</span>}
                                </div>
                            )}
                        </div>
                        
                        {eligibleSources.length === 0 ? (
                            <div className="p-6 bg-slate-900/80 border border-amber-500/40 rounded-xl text-center space-y-3">
                                <div className="inline-flex p-3 bg-amber-500/10 rounded-full text-amber-400 border border-amber-500/30">
                                    <Lock size={28} />
                                </div>
                                <h4 className="text-sm font-bold text-amber-300">인연 스킬 생성 잠김</h4>
                                <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
                                    인연 스킬을 생성하려면 <strong className="text-pink-400">{companion.name}</strong>와(과) <strong className="text-rose-300">연인 / 배우자</strong> 관계이거나, 호감도가 <strong className="text-pink-400">90 이상</strong>이면서 <strong className="text-emerald-400">알고 지낸 지 10년 이상</strong>(현재: {getYearsKnown(companion)}년)이어야 합니다.
                                </p>
                                <div className="pt-2">
                                    <span className="text-[11px] text-slate-500">
                                        (데이트, 선물, 지속적인 교류를 통해 유대를 깊게 쌓아보세요.)
                                    </span>
                                </div>
                            </div>
                        ) : !canCreateMore ? (
                            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-300 text-center text-sm">
                                더 이상 인연 스킬을 생성할 수 없습니다. (최대 {maxBondSkills}개 도달) 기존 스킬을 삭제 후 새로 생성할 수 있습니다.
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Source Skills */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                                <User size={14} className="text-indigo-400" /> {currentSource?.name}의 스킬 (Lv.10 이상)
                                            </label>
                                            <span className="text-[10px] text-slate-400 font-medium">Lv.10 이상만 선택 가능</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                                            {playerSkills.length === 0 ? (
                                                <div className="p-4 text-center text-xs text-slate-500 bg-slate-900/40 rounded-lg border border-slate-800">
                                                    사용 가능한 액티브 공격 스킬이 없습니다.
                                                </div>
                                            ) : (
                                                playerSkills.map((skill, idx) => {
                                                    const isLv10 = (skill.level || 1) >= 10;
                                                    const isSelected = selectedPlayerSkill?.name === skill.name;
                                                    return (
                                                        <button
                                                            key={`${skill.id || skill.name}-${idx}`}
                                                            onClick={() => isLv10 && setSelectedPlayerSkill(skill)}
                                                            disabled={!isLv10}
                                                            className={`p-3 rounded-xl border text-left transition-all relative ${
                                                                isSelected
                                                                    ? 'bg-pink-500/20 border-pink-500 text-pink-100 shadow-md'
                                                                    : isLv10
                                                                    ? 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800/60'
                                                                    : 'bg-slate-950/40 border-slate-800/80 text-slate-500 opacity-60 cursor-not-allowed'
                                                            }`}
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-bold text-sm">{skill.name}</span>
                                                                <div className="flex items-center gap-1">
                                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isLv10 ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60' : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'}`}>
                                                                        Lv.{skill.level || 1}
                                                                    </span>
                                                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">{skill.type}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5">
                                                                <span>위력: <strong className="text-pink-400">{skill.powerRatio || 100}%</strong></span>
                                                                <span>MP: <strong className="text-blue-400">{(skill.type === SkillType.PASSIVE || (skill.type as string) === '패시브') ? 0 : (skill.mpCost || 0)}</strong></span>
                                                                <span>범위: <strong className="text-indigo-300">{skill.targetType === 'aoe' ? '광역' : '단일'}</strong></span>
                                                            </div>
                                                            {!isLv10 && (
                                                                <div className="text-[9px] text-amber-400 font-semibold mt-1 flex items-center gap-1">
                                                                    <AlertCircle size={10} /> 융합하려면 Lv.10까지 수련이 필요합니다.
                                                                </div>
                                                            )}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    {/* Companion Skills */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                                <Users size={14} className="text-pink-400" /> {companion.name}의 스킬 (Lv.10 이상)
                                            </label>
                                            <span className="text-[10px] text-slate-400 font-medium">Lv.10 이상만 선택 가능</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                                            {companionSkills.length === 0 ? (
                                                <div className="p-4 text-center text-xs text-slate-500 bg-slate-900/40 rounded-lg border border-slate-800">
                                                    사용 가능한 액티브 공격 스킬이 없습니다.
                                                </div>
                                            ) : (
                                                companionSkills.map((skill, idx) => {
                                                    const isLv10 = (skill.level || 1) >= 10;
                                                    const isSelected = selectedCompanionSkill?.name === skill.name;
                                                    return (
                                                        <button
                                                            key={`${skill.id || skill.name}-${idx}`}
                                                            onClick={() => isLv10 && setSelectedCompanionSkill(skill)}
                                                            disabled={!isLv10}
                                                            className={`p-3 rounded-xl border text-left transition-all relative ${
                                                                isSelected
                                                                    ? 'bg-pink-500/20 border-pink-500 text-pink-100 shadow-md'
                                                                    : isLv10
                                                                    ? 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800/60'
                                                                    : 'bg-slate-950/40 border-slate-800/80 text-slate-500 opacity-60 cursor-not-allowed'
                                                            }`}
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-bold text-sm">{skill.name}</span>
                                                                <div className="flex items-center gap-1">
                                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isLv10 ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60' : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'}`}>
                                                                        Lv.{skill.level || 1}
                                                                    </span>
                                                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">{skill.type}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5">
                                                                <span>위력: <strong className="text-pink-400">{skill.powerRatio || 100}%</strong></span>
                                                                <span>MP: <strong className="text-blue-400">{(skill.type === SkillType.PASSIVE || (skill.type as string) === '패시브') ? 0 : (skill.mpCost || 0)}</strong></span>
                                                                <span>범위: <strong className="text-indigo-300">{skill.targetType === 'aoe' ? '광역' : '단일'}</strong></span>
                                                            </div>
                                                            {!isLv10 && (
                                                                <div className="text-[9px] text-amber-400 font-semibold mt-1 flex items-center gap-1">
                                                                    <AlertCircle size={10} /> 융합하려면 Lv.10까지 수련이 필요합니다.
                                                                </div>
                                                            )}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Name and Result */}
                                <div className="mt-6 pt-5 border-t border-slate-700">
                                    <div className="flex flex-col md:flex-row gap-4 items-end">
                                        <div className="flex-1 space-y-2 w-full">
                                            <label className="text-sm font-bold text-slate-300">인연 스킬 명칭</label>
                                            <input
                                                type="text"
                                                value={skillName}
                                                onChange={(e) => setSkillName(e.target.value)}
                                                placeholder="새로운 융합 인연 스킬의 이름을 입력하세요 (예: 백화요란, 진홍의 맹세)"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 transition-colors text-sm"
                                            />
                                        </div>
                                         <button
                                            onClick={handleCreateBondSkill}
                                            disabled={!skillName.trim() || !selectedPlayerSkill || !selectedCompanionSkill || isBuffDebuffConflict}
                                            className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-pink-900/30 flex items-center justify-center gap-2 shrink-0 active:scale-95"
                                        >
                                            <Sparkles size={18} /> 스킬 융합 생성하기
                                        </button>
                                    </div>

                                     {selectedPlayerSkill && selectedCompanionSkill && (
                                        <div className="mt-4 p-4 bg-gradient-to-r from-pink-950/30 via-purple-950/20 to-slate-900 border border-pink-500/40 rounded-xl shadow-inner space-y-3">
                                            <div className="text-xs text-pink-300 font-bold mb-2 flex items-center gap-1.5">
                                                <Sparkles size={14} /> 융합 스킬 예상 스펙 ({selectedPlayerSkill.name} + {selectedCompanionSkill.name})
                                            </div>

                                            {isBuffDebuffConflict ? (
                                                <div className="p-3 bg-red-950/50 border border-red-500/60 rounded-xl text-xs text-red-200 font-bold flex items-center gap-2">
                                                    <AlertCircle size={18} className="text-red-400 shrink-0" />
                                                    <span>버프 스킬과 디버프 스킬은 서로 성질이 상충하여 융합할 수 없습니다. 다른 스킬 조합을 선택해주세요.</span>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                                                    {/* 1. 융합 위력 / 버프 정도 */}
                                                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-pink-900/30 flex flex-col justify-center">
                                                        <div className="text-slate-400 text-[10px] mb-0.5 flex items-center justify-center gap-1">
                                                            <span>{calculatedSkillType === SkillType.BUFF ? '융합 버프 효과' : calculatedSkillType === SkillType.DEBUFF ? '융합 디버프 효과' : '융합 위력'}</span>
                                                            {(calculatedSkillType === SkillType.BUFF || calculatedSkillType === SkillType.DEBUFF) ? (
                                                                hasElementSynergy && <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-bold">신력 조화 1.25배</span>
                                                            ) : (
                                                                hasElementSynergy && <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-bold">시너지 1.5배</span>
                                                            )}
                                                        </div>
                                                        {(calculatedSkillType === SkillType.BUFF || calculatedSkillType === SkillType.DEBUFF) ? (
                                                            <div className="text-pink-300 font-bold text-[11px] leading-tight line-clamp-2 px-1">
                                                                {(() => {
                                                                    const pEff = extractSkillEffectInfo(selectedPlayerSkill, 1.0);
                                                                    const cEff = extractSkillEffectInfo(selectedCompanionSkill, 1.0);
                                                                    const combined = combineEffectDescriptions(pEff?.effect, cEff?.effect);
                                                                    const mult = hasElementSynergy ? 1.25 : 1.0;
                                                                    if (calculatedSkillType === SkillType.BUFF) {
                                                                        const base = combined || "물리 공격력 +25%, 마법 공격력 +25%, 물리 방어력 +15%, 마법 방어력 +15%";
                                                                        return mult !== 1.0 ? amplifyStatusEffectDescription(base, mult) : base;
                                                                    } else {
                                                                        const base = combined || "물리 방어력 -30%, 마법 방어력 -30%, 물리 공격력 -20%, 마법 공격력 -20%";
                                                                        return mult !== 1.0 ? amplifyStatusEffectDescription(base, mult) : base;
                                                                    }
                                                                })()}
                                                            </div>
                                                        ) : (
                                                            <div className="text-pink-400 font-black text-base sm:text-lg">
                                                                {calculatedPowerRatio}%
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* 2. 총 소모 MP */}
                                                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-pink-900/30 flex flex-col justify-center">
                                                        <div className="text-slate-400 text-[10px] mb-0.5">총 소모 MP</div>
                                                        <div className="text-blue-400 font-black text-base sm:text-lg">
                                                            {(selectedPlayerSkill.mpCost || 0) + (selectedCompanionSkill.mpCost || 0)}
                                                        </div>
                                                    </div>

                                                    {/* 3. 타겟팅 범위 (단일 아군, AOE 아군, 단일 적, AOE 적) */}
                                                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-pink-900/30 flex flex-col justify-center">
                                                        <div className="text-slate-400 text-[10px] mb-0.5">타겟팅 범위</div>
                                                        <div className="text-indigo-300 font-black text-sm sm:text-base">
                                                            {calculatedSkillType === SkillType.BUFF
                                                                ? (calculatedTargetType === 'aoe' ? 'AOE 아군 (전체)' : '단일 아군')
                                                                : calculatedSkillType === SkillType.DEBUFF
                                                                ? (calculatedTargetType === 'aoe' ? 'AOE 적 (전체)' : '단일 적')
                                                                : (calculatedTargetType === 'aoe' ? 'AOE 적 (전체)' : '단일 적')}
                                                        </div>
                                                    </div>

                                                    {/* 4. 융합 신력 계통 */}
                                                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-pink-900/30 flex flex-col justify-center">
                                                        <div className="text-slate-400 text-[10px] mb-0.5">융합 신력 계통</div>
                                                        <div className="text-amber-300 font-black text-sm sm:text-base">
                                                            {calculatedSkillElement || '무속성'}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                             {/* 신력계통 시너지 안내 */}
                                            {hasElementSynergy && (
                                                <div className="p-2.5 bg-amber-950/40 border border-amber-500/40 rounded-lg text-xs text-amber-300 font-bold flex items-center gap-2">
                                                    <Sparkles size={14} className="text-amber-400 shrink-0" />
                                                    <span>상호 시너지가 발생하는 신력계통 조합입니다! (인연스킬 위력 1.5배 추가 증폭 적용)</span>
                                                </div>
                                            )}

                                             {/* PowerRatio 동율 시 속성 선택 UI */}
                                            {isPowerRatioEqual && (
                                                <div className="p-3 bg-slate-900/90 border border-amber-500/50 rounded-lg text-xs space-y-2">
                                                    <div className="text-amber-300 font-bold flex items-center gap-1.5">
                                                        <Info size={14} /> 두 스킬의 위력(PowerRatio)이 동일합니다. 원하는 속성을 선택하세요:
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setCustomSelectedElement(playerSkillEffectiveElem)}
                                                            className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors ${
                                                                (calculatedSkillElement === playerSkillEffectiveElem)
                                                                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                                                                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                                            }`}
                                                        >
                                                            {selectedPlayerSkill.name} 속성 ({playerSkillEffectiveElem})
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setCustomSelectedElement(companionSkillEffectiveElem)}
                                                            className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors ${
                                                                (calculatedSkillElement === companionSkillEffectiveElem)
                                                                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                                                                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                                            }`}
                                                        >
                                                            {selectedCompanionSkill.name} 속성 ({companionSkillEffectiveElem})
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* 신력계통 조각 요구 정보 */}
                                            {calculatedSkillElement && calculatedSkillElement !== '무속성' && (
                                                <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg flex justify-between items-center text-xs">
                                                    <span className="text-slate-300">
                                                        필요 신력계통 조각 (<strong className="text-amber-300">{calculatedSkillElement} 조각</strong>):
                                                    </span>
                                                    <span className="font-bold">
                                                        필요 <span className="text-amber-400">{requiredShardCount}개</span> / 보유 <span className={ownedShardCount >= requiredShardCount ? 'text-emerald-400' : 'text-red-400'}>{ownedShardCount}개</span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </section>

                    {/* Existing Skills Section */}
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Sparkles size={20} className="text-pink-400" /> 보유 중인 인연 스킬
                            </h3>
                            <span className="text-xs text-slate-400">
                                전투 사용 시 숙련도가 올라 레벨업할 수 있습니다.
                            </span>
                        </div>
                        
                        {existingBondSkills.length === 0 ? (
                            <div className="text-center py-10 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
                                <p className="text-slate-500 text-sm">아직 {companion.name}와(과) 생성된 인연 스킬이 없습니다.</p>
                                <p className="text-slate-600 text-xs mt-1">조건을 충족하여 새로운 인연 스킬을 창조해보세요.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {existingBondSkills.map(skill => {
                                    const requiredMastery = 20 * (skill.level + 4);
                                    const canLevelUp = skill.currentMastery >= requiredMastery && skill.level < (skill.maxLevel || 10);
                                    return (
                                        <div key={skill.id} className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 hover:border-pink-500/50 transition-all group shadow-lg">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-pink-300 font-bold text-base">{skill.name}</h4>
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-pink-950 text-pink-300 border border-pink-800 rounded">
                                                            Lv.{skill.level}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2 mt-1">
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-900 rounded text-slate-400">{skill.type}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-pink-900/30 rounded text-pink-300 border border-pink-800/40">인연 융합기</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteBondSkill(skill.id)}
                                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    title="인연 스킬 삭제"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-300 mb-3 line-clamp-2">{skill.description}</p>
                                            
                                            {/* Level & Mastery UI */}
                                            <div className="mb-3 space-y-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                                                <div className="flex justify-between items-center text-[10px]">
                                                    <span className="text-slate-400">성장도: <strong className="text-white">Lv.{skill.level} / {skill.maxLevel || 10}</strong></span>
                                                    <span className="text-slate-400">숙련도: <strong className="text-pink-400">{skill.currentMastery} / {requiredMastery}</strong></span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300" 
                                                        style={{ width: `${Math.min(100, (skill.currentMastery / requiredMastery) * 100)}%` }}
                                                    />
                                                </div>
                                                {canLevelUp && (
                                                    <button 
                                                        onClick={() => handleLevelUpBondSkill(skill.id)}
                                                        className="w-full py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 shadow-md animate-pulse mt-1"
                                                    >
                                                        <Zap size={12} /> 숙련도 달성! 스킬 레벨업
                                                    </button>
                                                )}
                                            </div>

                                             <div className="grid grid-cols-3 gap-2 text-xs text-center">
                                                <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800 flex flex-col justify-center">
                                                    <div className="text-slate-500 text-[10px]">범위</div>
                                                    <div className="text-white font-bold text-[11px]">
                                                        {skill.type === SkillType.BUFF
                                                            ? (skill.targetType === 'aoe' ? 'AOE 아군' : '단일 아군')
                                                            : skill.type === SkillType.DEBUFF
                                                            ? (skill.targetType === 'aoe' ? 'AOE 적' : '단일 적')
                                                            : (skill.targetType === 'aoe' ? 'AOE 적' : '단일 적')}
                                                    </div>
                                                </div>
                                                <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800 flex flex-col justify-center">
                                                    <div className="text-slate-500 text-[10px]">
                                                        {skill.type === SkillType.BUFF ? '버프 효과' : skill.type === SkillType.DEBUFF ? '디버프 효과' : '위력'}
                                                    </div>
                                                    <div 
                                                        className="text-pink-400 font-bold truncate text-[11px] px-1"
                                                        title={
                                                            skill.type === SkillType.BUFF && skill.fusedBuffEffects?.[0]?.effect
                                                                ? skill.fusedBuffEffects[0].effect
                                                                : skill.type === SkillType.DEBUFF && skill.fusedDebuffEffects?.[0]?.effect
                                                                ? skill.fusedDebuffEffects[0].effect
                                                                : `${skill.powerRatio}%`
                                                        }
                                                    >
                                                        {skill.type === SkillType.BUFF && skill.fusedBuffEffects?.[0]?.effect
                                                            ? skill.fusedBuffEffects[0].effect
                                                            : skill.type === SkillType.DEBUFF && skill.fusedDebuffEffects?.[0]?.effect
                                                            ? skill.fusedDebuffEffects[0].effect
                                                            : `${skill.powerRatio}%`}
                                                    </div>
                                                </div>
                                                <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800 flex flex-col justify-center">
                                                    <div className="text-slate-500 text-[10px]">MP 소모</div>
                                                    <div className="text-blue-400 font-bold">{(skill.type === SkillType.PASSIVE || (skill.type as string) === '패시브') ? 0 : (skill.mpCost || 0)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};

export default BondSkillBookModal;
