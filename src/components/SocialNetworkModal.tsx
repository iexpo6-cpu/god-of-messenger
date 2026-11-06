
import React, { useState } from 'react';
import { Character, Companion, RelationType, CompanionRelation, SimpleStudent, SkillType, ClassTier, TempleVisitor, Enemy, Stats, JobType, CombatStyle, GameLocation } from '../types';
import { COMBAT_STYLE_CONFIG } from '../constants';
import { X, Users, Heart, Sword, Shield, AlertTriangle, Users2, User, Sparkles, TrendingUp, HeartCrack, Smile, Crown, UserCheck, MessageCircle, Handshake, Dumbbell, Loader2, GraduationCap, Landmark, LayoutGrid, Info, Send, Mail, UserMinus, Skull, Target, Layers, History, Medal, Award, Gavel, GitBranch, ArrowLeft, Zap, Calendar, MapPin, ChevronDown, ChevronUp, ArrowUpDown, CheckCircle2, AlertCircle, HelpCircle, Lock } from 'lucide-react';
import { mediateCompanionRelation } from '../services/relationService';
import ActionResultModal, { ResultData } from './ActionResultModal';
import MessageModal from './MessageModal';
import { addDays, calculateTotalStats, getBondBonus, getPersonLocation, calculateAgeFromYear, getYear } from '../utils';
import CompanionFamilyTreeModal from './CompanionFamilyTreeModal';
import BondSkillBookModal from './BondSkillBookModal';
import EternalRivalModal from './EternalRivalModal';
import { AppointmentModal } from './AppointmentModal';
import { Flame } from 'lucide-react';
import { fixStudentJobIfAdult, sanitizeCharacterStudentJobs } from '../services/npcJobSanitizer';
import { areSiblings, isHalfSibling } from '../services/siblingService';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onBattle?: (enemy: Enemy | Enemy[], type: string, source: string) => void;
    onTimeSkip?: (newChar: Character, days: number, logMsg: string) => void;
    initialSelectedId?: string;
}

const RELATION_STYLE: Record<RelationType, { color: string, icon: any, bg: string, label: string }> = {
    [RelationType.ALLY]: { color: 'text-slate-400', icon: User, bg: 'bg-slate-900', label: '동료' },
    [RelationType.FRIEND]: { color: 'text-blue-400', icon: Smile, bg: 'bg-blue-900/20', label: '친구' },
    [RelationType.BEST_FRIEND]: { color: 'text-cyan-400', icon: Sparkles, bg: 'bg-cyan-900/30', label: '절친' },
    [RelationType.RIVAL]: { color: 'text-amber-500', icon: Sword, bg: 'bg-amber-900/20', label: '라이벌' },
    [RelationType.CONFLICT]: { color: 'text-red-400', icon: AlertTriangle, bg: 'bg-red-950/30', label: '갈등' },
    [RelationType.ENEMY]: { color: 'text-red-600', icon: Skull, bg: 'bg-red-950/50', label: '원수' },
    [RelationType.FLIRT]: { color: 'text-purple-400', icon: Heart, bg: 'bg-purple-900/20', label: '썸' },
    [RelationType.LOVER]: { color: 'text-pink-400', icon: Heart, bg: 'bg-pink-900/20', label: '연인' },
    [RelationType.SPOUSE]: { color: 'text-rose-500', icon: Heart, bg: 'bg-rose-900/30', label: '배우자' },
    [RelationType.SWORN_SIBLING]: { color: 'text-indigo-400', icon: Handshake, bg: 'bg-indigo-900/30', label: '의형제/의자매' },
    [RelationType.SIBLING]: { color: 'text-emerald-400', icon: Users, bg: 'bg-emerald-900/30', label: '형제자매' },
    [RelationType.PAST_CONNECTION]: { color: 'text-purple-400', icon: History, bg: 'bg-purple-900/20', label: '과거 인연' },
};

type ListType = 'all' | 'companions' | 'npcs' | 'past' | 'purged';
type SortOption = 
    | 'default' 
    | 'custom_first' 
    | 'custom_only' 
    | 'lover_first' 
    | 'bond_eligible' 
    | 'affection_desc' 
    | 'affection_asc' 
    | 'age_desc' 
    | 'age_asc' 
    | 'level_desc' 
    | 'name_asc';

const SocialNetworkModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter, onBattle, onTimeSkip, initialSelectedId }) => {
    const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId || 'player');
    const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
    const [zoomScale, setZoomScale] = useState<number>(1.0);
    const [panOffset, setPanOffset] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [dragStart, setDragStart] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
    const [graphFilter, setGraphFilter] = useState<'all' | 'romantic' | 'friendly' | 'conflict' | 'rival'>('all');
    const [showMobileList, setShowMobileList] = useState(true);
    const [listType, setListType] = useState<ListType>('all');
    const [sortBy, setSortBy] = useState<SortOption>('default');
    const [isMediating, setIsMediating] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [messagingNpc, setMessagingNpc] = useState<any | null>(null);
    const [isNpcFamilyTreeOpen, setIsNpcFamilyTreeOpen] = useState(false);
    const [isBondSkillBookOpen, setIsBondSkillBookOpen] = useState(false);
    const [isBondGuideModalOpen, setIsBondGuideModalOpen] = useState(false);
    const [isEternalRivalModalOpen, setIsEternalRivalModalOpen] = useState(false);
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [appointmentModalType, setAppointmentModalType] = useState<'meet' | 'duel'>('meet');
    const [collapsedSections, setCollapsedSections] = useState<{
        companions?: boolean;
        activeNpcs?: boolean;
        pastNpcs?: boolean;
        purgedNpcs?: boolean;
    }>({});

    const toggleSection = (section: 'companions' | 'activeNpcs' | 'pastNpcs' | 'purgedNpcs') => {
        setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const currentYear = character.currentDate ? getYear(character.currentDate) : 2000;

    const getPersonAgeText = (person: any): string => {
        if (!person) return '';
        if (person.birthYear !== undefined && person.birthYear !== null) {
            return calculateAgeFromYear(person.birthYear, currentYear);
        }
        if (person.age !== undefined && person.age !== null && person.age !== '') {
            const ageStr = String(person.age).trim();
            return ageStr.endsWith('세') ? ageStr : `${ageStr}세`;
        }
        return '';
    };

    const getNumericAge = (person: any): number => {
        if (!person) return 0;
        if (person.birthYear !== undefined && person.birthYear !== null) {
            return Math.max(0, currentYear - Number(person.birthYear));
        }
        if (person.age !== undefined && person.age !== null && person.age !== '') {
            const parsed = parseInt(String(person.age).replace(/[^0-9]/g, ''), 10);
            if (!isNaN(parsed)) return parsed;
        }
        return 0;
    };

    // 20세 이상 학생 무직 전환 보정
    const getSanitizedJob = (person: any): string => {
        if (!person) return '무직';
        fixStudentJobIfAdult(person, currentYear);
        return person.job || person.classType || '무직';
    };

    React.useEffect(() => {
        const changed = sanitizeCharacterStudentJobs(character);
        if (changed) {
            onUpdateCharacter({ ...character }, '');
        }
    }, []);

    const allComps = [...character.companions, ...(character.inactiveCompanions || [])].filter(c => !c.isMonster && !c.isDead);
    const activeCompanionIds = new Set(character.companions.map(c => c.id));

    const getInteractedNpcs = () => {
        const npcs: any[] = [];
        const companionIds = new Set(allComps.map(c => c.id));
        const severedIds = new Set(character.severedRelations || []);

        if (character.schoolData?.classmates) {
            character.schoolData.classmates.forEach(s => {
                fixStudentJobIfAdult(s, currentYear);
                if (!s.isDead && !s.isPurged && !companionIds.has(s.id) && !severedIds.has(s.id) && (s.affection !== 0 || (s.chatHistory && s.chatHistory.length > 0) || s.isRival)) {
                    npcs.push({ ...s, origin: 'School', originName: character.schoolData?.schoolName });
                }
            });
        }

        if (character.clubData?.clubMembers) {
            character.clubData.clubMembers.forEach(m => {
                fixStudentJobIfAdult(m, currentYear);
                if (!m.isDead && !m.isPurged && !companionIds.has(m.id) && !severedIds.has(m.id) && (m.affection !== 0 || (m.chatHistory && m.chatHistory.length > 0))) {
                    npcs.push({ ...m, origin: 'Club', originName: character.clubData?.joinedClub });
                }
            });
        }

        if (character.base?.templeVisitors) {
            Object.values(character.base.templeVisitors).forEach((visitorList: any) => {
                if (Array.isArray(visitorList)) {
                    visitorList.forEach((v: TempleVisitor) => {
                        fixStudentJobIfAdult(v, currentYear);
                        if (!v.isDead && !v.isPurged && !companionIds.has(v.id) && !severedIds.has(v.id) && (v.affection !== 0 || (v.templeChatHistory && v.templeChatHistory.length > 0))) {
                            npcs.push({ ...v, origin: 'Temple', originName: '성전 접견실' });
                        }
                    });
                }
            });
        }

        return npcs;
    };

    const getPastNpcs = () => {
        if (!character.socialNetwork) return [];
        const currentIds = new Set([
            ...allComps.map(c => c.id),
            ...getInteractedNpcs().map(n => n.id)
        ]);
        const severedIds = new Set(character.severedRelations || []);
         
        // [MODIFIED] 플레이어와 상호작용이 있는 인물만 표시하도록 필터링 강화
        // NPC의 가족 등 플레이어가 모르는 인물은 목록에서 제외됩니다.
        return character.socialNetwork.filter(n => {
            fixStudentJobIfAdult(n, currentYear);
            return (
                !n.isPurged && 
                !n.isDead &&
                !currentIds.has(n.id) && 
                !severedIds.has(n.id) &&
                (n.affection !== 0 || (n.chatHistory && n.chatHistory.length > 0) || n.isRival || n.isPastConnection)
            );
        });
    };

    const getYearsKnown = (target: any) => {
        if (!target) return 0;
        const metYear = target.metYear || currentYear;
        return Math.max(0, currentYear - metYear);
    };

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

    const getLoverMonths = (c1: any, partner?: any): number => {
        const rel1 = partner?.id ? c1?.relations?.[partner.id] : undefined;
        const rel2 = partner?.id ? partner?.relations?.[c1?.id] : undefined;
        const startDate = c1?.loverStartDate || partner?.loverStartDate || 
                          rel1?.loverStartDate || rel1?.sinceDate || rel1?.startDate ||
                          rel2?.loverStartDate || rel2?.sinceDate || rel2?.startDate;
        if (startDate && character.currentDate) {
            return getMonthsDiff(startDate, character.currentDate);
        }
        const current = parseYearMonth(character.currentDate);
        if (current) {
            const currYear = current.year;
            const currMonth = current.month;
            const met1 = c1?.metYear || currYear;
            const met2 = partner?.metYear || currYear;
            const startYear = Math.max(met1, met2);
            return Math.max(0, (currYear - startYear) * 12 + (currMonth - 1));
        }
        return 0;
    };

    const getYearsTogether = (c1: any, c2: any) => {
        if (!c1 || !c2) return 0;
        const met1 = c1.metYear || currentYear;
        const met2 = c2.metYear || currentYear;
        return Math.max(0, currentYear - Math.max(met1, met2));
    };

    const isEligibleForBondSkill = (target: any) => {
        if (!target || target.isPurged || target.isDead) return false;
        
        // Only companions have skills to combine
        const isCompanion = allComps.some(c => c.id === target.id);
        if (!isCompanion) return false;

        // Check player relationship
        const isPlayerSpouse = Boolean(target.isSpouse && (target.partnerId === 'player' || (!target.partnerId && !target.partnerName)));
        const isPlayerLover = Boolean(target.isLover && (target.partnerId === 'player' || (!target.partnerId && !target.partnerName)));
        const playerLoverMonths = getLoverMonths(target);
        const isPlayerLover1Year = isPlayerLover && playerLoverMonths >= 12;
        const yearsKnown = getYearsKnown(target);

        // [NEW] 형제자매 조건
        const isSib = target.relation === RelationType.SIBLING || 
                      target.relations?.['player']?.type === RelationType.SIBLING || 
                      areSiblings(character, target, character);
        let isSiblingClose = false;
        if (isSib) {
            const isHalf = isHalfSibling(character, target, character);
            if (isHalf) {
                // 이복/이부 형제자매: 호감도 100 이상
                isSiblingClose = (target.affection || 0) >= 100;
            } else {
                // 친형제자매: 호감도 90 이상
                isSiblingClose = (target.affection || 0) >= 90;
            }
        }

        const isPlayerClose = isPlayerSpouse || isPlayerLover1Year || isSiblingClose || (target.affection >= 90 && yearsKnown >= 10);
        if (isPlayerClose) return true;

        // Check companion-to-companion relationship (spouses, lovers 1+ year, or 10-year shared bond)
        const hasCompanionBond = allComps.some(other => {
            if (other.id === target.id) return false;
            const isSpouseWithOther = (other.isSpouse && (other.partnerId === target.id || (target.name && other.partnerName === target.name))) ||
                                      (target.isSpouse && (target.partnerId === other.id || (other.name && target.partnerName === other.name))) ||
                                      other.relations?.[target.id]?.type === '배우자' ||
                                      target.relations?.[other.id]?.type === '배우자' ||
                                      other.relations?.[target.id]?.type === RelationType.SPOUSE ||
                                      target.relations?.[other.id]?.type === RelationType.SPOUSE;
            const isLoverWithOther = (other.isLover && (other.partnerId === target.id || (target.name && other.partnerName === target.name))) ||
                                     (target.isLover && (target.partnerId === other.id || (other.name && target.partnerName === other.name))) ||
                                     other.relations?.[target.id]?.type === '연인' ||
                                     target.relations?.[other.id]?.type === '연인' ||
                                     other.relations?.[target.id]?.type === RelationType.LOVER ||
                                     target.relations?.[other.id]?.type === RelationType.LOVER;
            const compLoverMonths = getLoverMonths(other, target);
            const isLover1YearWithOther = isLoverWithOther && compLoverMonths >= 12;
            const yearsTogether = getYearsTogether(other, target);
            const has10YearsBond = yearsTogether >= 10;
            return isSpouseWithOther || isLover1YearWithOther || has10YearsBond;
        });

        return hasCompanionBond;
    };

    const getPurgedNpcs = () => {
        const deadList: any[] = [];
        const seenIds = new Set<string>();

        // 1. 파티, 대기 동료 및 고인 명단 중 사망한 동료
        const allCompanions = [...(character.companions || []), ...(character.inactiveCompanions || []), ...(character.deceasedCompanions || [])];
        allCompanions.forEach(c => {
            if (c.isDead && !seenIds.has(c.id)) {
                seenIds.add(c.id);
                deadList.push({
                    ...c,
                    isPurged: true,
                    isDead: true,
                    purgedReason: c.purgedReason || '전사 또는 노환으로 별세',
                    origin: 'Companion',
                    originName: '동료'
                });
            }
        });

        // 2. socialNetwork 중 고인/사망자
        if (character.socialNetwork) {
            character.socialNetwork.forEach(n => {
                if ((n.isPurged || n.isDead) && !seenIds.has(n.id)) {
                    seenIds.add(n.id);
                    deadList.push({
                        ...n,
                        isPurged: true,
                        isDead: true,
                        purgedReason: n.purgedReason || '노환으로 별세'
                    });
                }
            });
        }

        // 3. 학교/동아리/성전 중 사망자
        if (character.schoolData?.classmates) {
            character.schoolData.classmates.forEach(s => {
                if ((s.isDead || s.isPurged) && !seenIds.has(s.id)) {
                    seenIds.add(s.id);
                    deadList.push({
                        ...s,
                        isPurged: true,
                        isDead: true,
                        purgedReason: s.purgedReason || '사망',
                        origin: 'School',
                        originName: character.schoolData?.schoolName
                    });
                }
            });
        }

        if (character.clubData?.clubMembers) {
            character.clubData.clubMembers.forEach(m => {
                if ((m.isDead || m.isPurged) && !seenIds.has(m.id)) {
                    seenIds.add(m.id);
                    deadList.push({
                        ...m,
                        isPurged: true,
                        isDead: true,
                        purgedReason: m.purgedReason || '사망',
                        origin: 'Club',
                        originName: character.clubData?.joinedClub
                    });
                }
            });
        }

        if (character.base?.templeVisitors) {
            Object.values(character.base.templeVisitors).forEach((visitorList: any) => {
                if (Array.isArray(visitorList)) {
                    visitorList.forEach((v: TempleVisitor) => {
                        if ((v.isDead || v.isPurged) && !seenIds.has(v.id)) {
                            seenIds.add(v.id);
                            deadList.push({
                                ...v,
                                isPurged: true,
                                isDead: true,
                                purgedReason: v.purgedReason || '사망',
                                origin: 'Temple',
                                originName: '성전 접견실'
                            });
                        }
                    });
                }
            });
        }

        return deadList;
    };

    const interactedNpcs = getInteractedNpcs();
    const pastNpcs = getPastNpcs();
    const purgedNpcs = getPurgedNpcs();

    const sortPeople = <T extends any>(list: T[]): T[] => {
        let copy = [...list];
        if (sortBy === 'custom_only') {
            const customFiltered = copy.filter((a: any) => !!a.isCustom);
            return customFiltered;
        }

        switch (sortBy) {
            case 'custom_first':
                return copy.sort((a: any, b: any) => {
                    const aCustom = !!a.isCustom ? 1 : 0;
                    const bCustom = !!b.isCustom ? 1 : 0;
                    if (bCustom !== aCustom) return bCustom - aCustom;
                    return (b.affection ?? 0) - (a.affection ?? 0);
                });
            case 'lover_first':
                return copy.sort((a: any, b: any) => {
                    const aLover = (a.isSpouse || a.isLover || !!a.partnerName) ? 1 : 0;
                    const bLover = (b.isSpouse || b.isLover || !!b.partnerName) ? 1 : 0;
                    if (bLover !== aLover) return bLover - aLover;
                    return (b.affection ?? 0) - (a.affection ?? 0);
                });
            case 'bond_eligible':
                return copy.sort((a: any, b: any) => {
                    const aEligible = isEligibleForBondSkill(a) ? 1 : 0;
                    const bEligible = isEligibleForBondSkill(b) ? 1 : 0;
                    if (bEligible !== aEligible) return bEligible - aEligible;
                    return (b.affection ?? 0) - (a.affection ?? 0);
                });
            case 'affection_desc':
                return copy.sort((a: any, b: any) => (b.affection ?? 0) - (a.affection ?? 0));
            case 'affection_asc':
                return copy.sort((a: any, b: any) => (a.affection ?? 0) - (b.affection ?? 0));
            case 'age_desc':
                return copy.sort((a: any, b: any) => getNumericAge(b) - getNumericAge(a));
            case 'age_asc':
                return copy.sort((a: any, b: any) => getNumericAge(a) - getNumericAge(b));
            case 'level_desc':
                return copy.sort((a: any, b: any) => (b.level ?? 1) - (a.level ?? 1));
            case 'name_asc':
                return copy.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', 'ko'));
            default:
                return copy;
        }
    };

    const sortedAllComps = sortPeople(allComps);
    const sortedInteractedNpcs = sortPeople(interactedNpcs);
    const sortedPastNpcs = sortPeople(pastNpcs);
    const sortedPurgedNpcs = sortPeople(purgedNpcs);

    const getPlayerRelationType = (c: any): RelationType => {
        if (!c) return RelationType.ALLY;
        if (c.relations?.['player']?.type) return c.relations['player'].type;
        if (c.relation === RelationType.SIBLING || (character && areSiblings(character, c, character))) return RelationType.SIBLING;
        if (c.isSpouse && (c.partnerId === 'player' || (!c.partnerId && !c.partnerName))) return RelationType.SPOUSE;
        if (c.isLover && (c.partnerId === 'player' || (!c.partnerId && !c.partnerName))) return RelationType.LOVER;
        
        if (c.affection <= -80) return RelationType.ENEMY;
        if (c.affection < 0) return RelationType.CONFLICT;
        
        if (c.affection >= 80) return RelationType.BEST_FRIEND;
        if (c.affection >= 50) return RelationType.FRIEND;
        if (c.isRival) return RelationType.RIVAL;
        return RelationType.ALLY;
    };

    const getBondBuffLabel = (c: Companion) => {
        if (!activeCompanionIds.has(c.id)) return null;
        
        const currentYear = character.currentDate ? parseInt(character.currentDate.split('-')[0]) : 0;
        const metYear = c.metYear || currentYear;
        const yearsKnown = Math.max(0, currentYear - metYear);
        
        let bestRel = { label: '', effect: '', color: '', priority: 0 };
        
        // 1. Check relationship with player
        const relType = getPlayerRelationType(c);
        if (relType === RelationType.SPOUSE) {
            const effect = yearsKnown >= 20 ? '공격력 +20%' : '공격력 +15%';
            bestRel = { label: '배우자의 가호', effect, color: 'text-rose-400', priority: 3 };
        } else if (relType === RelationType.LOVER) {
            bestRel = { label: '연인의 응원', effect: '공격력 +10%', color: 'text-pink-400', priority: 2 };
        } else if (relType === RelationType.SIBLING) {
            const aff = c.affection !== undefined ? c.affection : 75;
            if (aff <= 30) {
                bestRel = { label: '형제자매 (소원함)', effect: '버프 비활성화', color: 'text-slate-400', priority: 1 };
            } else {
                const isHalf = isHalfSibling(character, c, character);
                bestRel = { label: isHalf ? '이복/이부 형제 시너지' : '친형제자매 시너지', effect: isHalf ? '모든 능력치 +2.5%' : '모든 능력치 +6%', color: 'text-emerald-400', priority: 2 };
            }
        } else if (relType === RelationType.BEST_FRIEND && yearsKnown >= 10) {
            const effect = yearsKnown >= 20 ? '공격력 +10%' : '공격력 +5%';
            bestRel = { label: '절친의 우정', effect, color: 'text-cyan-400', priority: 1 };
        } else if (c.respect && c.respect >= 70) {
            bestRel = { label: '라이벌의 존중', effect: '공격력 +5%', color: 'text-amber-400', priority: 1 };
        }
        
        // 2. Check relationship with other active companions
        character.companions.forEach(c2 => {
            if (c2.id === c.id || c2.isMonster || c2.isDead || !activeCompanionIds.has(c2.id)) return;
            
            const rel = c.relations ? c.relations[c2.id] : undefined;
            if (rel) {
                const relMetYear = rel.metYear || currentYear;
                const relYearsKnown = Math.max(0, currentYear - relMetYear);
                
                if (rel.type === RelationType.SPOUSE && 3 >= bestRel.priority) {
                    const effect = relYearsKnown >= 20 ? '공격력 +20%' : '공격력 +15%';
                    bestRel = { label: `배우자(${c2.name})의 가호`, effect, color: 'text-rose-400', priority: 3 };
                } else if (rel.type === RelationType.LOVER && 2 >= bestRel.priority) {
                    bestRel = { label: `연인(${c2.name})의 응원`, effect: '공격력 +10%', color: 'text-pink-400', priority: 2 };
                } else if (rel.type === RelationType.SIBLING && 2 >= bestRel.priority) {
                    const aff = rel.affection !== undefined ? rel.affection : 75;
                    if (aff > 30) {
                        const isHalf = rel.isHalf || isHalfSibling(c, c2, character);
                        bestRel = { label: isHalf ? `형제(${c2.name}) 시너지` : `친형제(${c2.name}) 시너지`, effect: isHalf ? '모든 능력치 +2.5%' : '모든 능력치 +6%', color: 'text-emerald-400', priority: 2 };
                    }
                } else if (rel.type === RelationType.BEST_FRIEND && relYearsKnown >= 10 && 1 >= bestRel.priority) {
                    const effect = relYearsKnown >= 20 ? '공격력 +10%' : '공격력 +5%';
                    bestRel = { label: `절친(${c2.name})의 우정`, effect, color: 'text-cyan-400', priority: 1 };
                }
            } else if (areSiblings(c, c2, character) && 2 >= bestRel.priority) {
                const isHalf = isHalfSibling(c, c2, character);
                bestRel = { label: isHalf ? `형제(${c2.name}) 시너지` : `친형제(${c2.name}) 시너지`, effect: isHalf ? '모든 능력치 +2.5%' : '모든 능력치 +6%', color: 'text-emerald-400', priority: 2 };
            }
        });
        
        return bestRel.priority > 0 ? bestRel : null;
    };

    const isPlayerSelected = selectedId === 'player';
    const playerPerson = {
        id: 'player',
        name: `${character.name} (나)`,
        visualUrl: character.visualUrl,
        affection: 100,
        level: character.level,
        isPlayer: true
    };
    const allKnownPeople = [playerPerson, ...allComps, ...interactedNpcs, ...pastNpcs, ...purgedNpcs, ...(character.socialNetwork || [])];
    const selectedComp = isPlayerSelected ? null : allComps.find(c => c.id === selectedId);
    const selectedNpc = isPlayerSelected ? null : allKnownPeople.find(n => n.id === selectedId && !('isPlayer' in n));
    
    const activeTarget = selectedComp || selectedNpc;

    const relationList: (CompanionRelation & { name: string })[] = isPlayerSelected
        ? [...allComps, ...interactedNpcs, ...pastNpcs, ...purgedNpcs].map(c => ({
            targetId: c.id,
            name: c.name,
            affection: c.affection,
            type: getPlayerRelationType(c)
          }))
        : (() => {
            if (!activeTarget) return [];
            const rawRels = (Object.values(activeTarget.relations || {}) as CompanionRelation[]);
            const hasPlayer = rawRels.some(r => r.targetId === 'player');
            const combined = [...rawRels];
            if (!hasPlayer) {
                combined.unshift({
                    targetId: 'player',
                    affection: activeTarget.affection !== undefined ? activeTarget.affection : 50,
                    type: getPlayerRelationType(activeTarget)
                });
            }
            return combined.map(rel => {
                const target = allKnownPeople.find(ac => ac.id === rel.targetId);
                return { ...rel, name: target?.name || '알 수 없음' };
            });
          })();

    const handleMediate = (targetComp: Companion, type: 'RECONCILE' | 'JOINT_TRAIN') => {
        if (!selectedComp) return;
        setIsMediating(true);
        setTimeout(() => {
            const result = mediateCompanionRelation(character, selectedComp.id, targetComp.id, type);
            if (result.success) {
                const newChar = { ...character };
                const updateRel = (c: Companion, targetId: string, newType: RelationType, affBoost: number) => {
                    if (!c.relations) c.relations = {};
                    const rel = c.relations[targetId] || { targetId, affection: 0, type: RelationType.ALLY };
                    rel.type = newType;
                    rel.affection = Math.min(100, rel.affection + affBoost);
                    c.relations[targetId] = rel;
                    c.loyalty = Math.min(100, c.loyalty + 5); 
                };
                const nextType = type === 'RECONCILE' ? RelationType.FRIEND : RelationType.BEST_FRIEND;
                const affBoost = type === 'RECONCILE' ? 20 : 10;
                const findAndUpdate = (list: Companion[]) => {
                    return list.map(c => {
                        if (c.id === selectedComp.id) updateRel(c, targetComp.id, nextType, affBoost);
                        if (c.id === targetComp.id) updateRel(c, selectedComp.id, nextType, affBoost);
                        return c;
                    });
                };
                newChar.companions = findAndUpdate(newChar.companions);
                if (newChar.inactiveCompanions) newChar.inactiveCompanions = findAndUpdate(newChar.inactiveCompanions);
                
                if (onTimeSkip) {
                    onTimeSkip(newChar, 1, `[관계 중재] ${result.log}`);
                } else {
                    newChar.currentDate = addDays(newChar.currentDate || '2000-01-01', 1);
                    onUpdateCharacter(newChar, `[관계 중재] ${result.log}`);
                }
                setResultData({
                    type: 'success', title: type === 'RECONCILE' ? '갈등 중재 성공' : '합동 훈련 성공', message: result.log,
                    items: [{ label: '관계 변화', after: RELATION_STYLE[nextType].label }, { label: '플레이어 충성도', after: '+5 (양측)' }, { label: '소요 시간', after: '1일' }]
                });
            } else {
                const newChar = { ...character };
                if (onTimeSkip) {
                    onTimeSkip(newChar, 1, `[관계 중재] ${result.log}`);
                } else {
                    newChar.currentDate = addDays(newChar.currentDate || '2000-01-01', 1);
                    onUpdateCharacter(newChar, `[관계 중재] ${result.log}`);
                }
                setResultData({ 
                    type: 'failure', title: '중재 실패', message: result.log, 
                    items: [{ label: '성공 확률', after: `${result.chance}%` }, { label: '소요 시간', after: '1일' }] 
                });
            }
            setIsMediating(false);
        }, 1500);
    };

    const handleSeverTies = () => {
        if (!activeTarget || isPlayerSelected) return;
        
        if (window.confirm(`${activeTarget.name}와(과)의 모든 인연을 끊으시겠습니까? 이 인물은 더 이상 명단에 나타나지 않으며, 모든 과거가 말소됩니다.`)) {
            const newChar = { ...character };
            if (!newChar.severedRelations) newChar.severedRelations = [];
            newChar.severedRelations.push(activeTarget.id);
            
            // Remove any bond skills associated with this companion
            if (newChar.bondSkills) {
                newChar.bondSkills = newChar.bondSkills.filter(bs => 
                    bs.companionId !== activeTarget.id && bs.sourceId !== activeTarget.id
                );
            }
            
            onUpdateCharacter(newChar, `[인연 단절] ${activeTarget.name}와(과)의 관계를 완전히 끊어버렸습니다.`);
            setResultData({
                type: 'destroy',
                title: '인연 단절',
                message: `${activeTarget.name}와의 모든 연줄을 끊었습니다. 이제 그는 당신의 인생에서 없는 사람이 되었습니다.`,
                items: [{ label: '상태', after: '영구 삭제' }]
            });
            setSelectedId('player');
        }
    };

    const handleStartRelationBattle = () => {
        if (!activeTarget || !onBattle || isPlayerSelected) return;

        const targetLocation = getPersonLocation(activeTarget, character);
        const isSameLocation = character.currentLocation && 
                               character.currentLocation.nation === targetLocation.nation && 
                               character.currentLocation.city === targetLocation.city;

        // 같은 도시 거주구역에 있지 않거나 약속을 잡아야 하는 경우 결투 약속 모달 오픈
        if (!isSameLocation) {
            setAppointmentModalType('duel');
            setIsAppointmentModalOpen(true);
            return;
        }

        const relType = getPlayerRelationType(activeTarget);
        const isEnemy = relType === RelationType.ENEMY;

        const baseStats = activeTarget.stats || {};
        const normalizedStats: Stats = {
            hp: baseStats.hp || 100,
            maxHp: baseStats.maxHp || 100,
            mp: baseStats.mp || 50,
            maxMp: baseStats.maxMp || 50,
            str: baseStats.str || 10,
            int: baseStats.int || 10,
            wis: baseStats.wis || 10,
            def: baseStats.def || 10,
            agi: baseStats.agi || 10,
            ctrl: baseStats.ctrl || 10
        };

        // 인연 전투 보정: 실제 인물 스탯보다 훨씬 강하게 등장 (원수/적대 관계 시 체력 35배 및 스탯 3.5배, 일반 인연 결투 시 체력 20배 및 스탯 2.5배)
        const hpMult = isEnemy ? 35.0 : 20.0;
        const statMult = isEnemy ? 3.5 : 2.5;
        const defMult = isEnemy ? 3.0 : 2.2;
        const ctrlMult = isEnemy ? 4.0 : 3.0;
        const finalMaxHp = Math.floor(normalizedStats.maxHp * hpMult);

        const battleStats: Stats = {
            hp: finalMaxHp,
            maxHp: finalMaxHp,
            mp: Math.floor(normalizedStats.maxMp * 2.5),
            maxMp: Math.floor(normalizedStats.maxMp * 2.5),
            str: Math.floor(normalizedStats.str * statMult),
            int: Math.floor(normalizedStats.int * statMult),
            wis: Math.floor(normalizedStats.wis * statMult),
            def: Math.floor(normalizedStats.def * defMult),
            agi: Math.floor(normalizedStats.agi * statMult),
            ctrl: Math.floor(normalizedStats.ctrl * ctrlMult)
        };

        const enemy: Enemy = {
            name: `${activeTarget.name}`,
            visualUrl: activeTarget.visualUrl,
            level: activeTarget.level,
            hp: finalMaxHp,
            maxHp: finalMaxHp,
            stats: battleStats,
            statusEffects: activeTarget.statusEffects || [],
            shinryokuType: activeTarget.shinryokuType || '무속성',
            description: isEnemy ? `${activeTarget.name}와의 목숨을 건 혈투입니다. 상대는 당신에 대한 극심한 증오를 품고 있습니다.` : `${activeTarget.name}와의 거친 충돌입니다. 실력 행사를 통해 우위를 점하십시오.`,
            skills: activeTarget.skills && activeTarget.skills.length > 0 ? activeTarget.skills : [
                {
                    name: "숙명적 타격",
                    description: "인연의 굴레에서 벗어나기 위한 강력한 공격입니다.",
                    type: SkillType.PHYSICAL,
                    tier: ClassTier.SECOND,
                    mpCost: 30,
                    level: 10,
                    maxLevel: 10,
                    currentMastery: 0,
                    effectFormula: "STR*2.5",
                    powerRatio: 250,
                    targetType: 'single'
                }
            ]
        };

        onBattle(enemy, 'relation_battle', activeTarget.id);
        onClose();
    };

    const getOriginIcon = (origin: string) => {
        switch(origin) {
            case 'School': return GraduationCap;
            case 'Club': return LayoutGrid;
            case 'Temple': return Landmark;
            case 'Past': return History;
            default: return User;
        }
    };

    const renderNpcButton = (n: any, isPast = false) => {
        const Icon = n.isPurged ? Skull : isPast ? History : getOriginIcon(n.origin);
        const relType = getPlayerRelationType(n);
        const style = RELATION_STYLE[relType];
        const isCompanion = allComps.some(c => c.id === n.id);
        const pendingAppt = !n.isPurged ? (character.socialAppointments || []).find(a => a.targetId === n.id && a.status === 'pending') : null;
        const loc = !n.isPurged && isCompanion ? getPersonLocation(n, character) : null;

        return (
            <button
                key={n.id}
                onClick={() => { setSelectedId(n.id); setShowMobileList(false); }}
                className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${selectedId === n.id ? 'bg-indigo-900/40 border-indigo-500 shadow-lg' : 'bg-slate-900 border border-slate-800 hover:border-slate-700'} ${relType === RelationType.ENEMY ? 'border-red-900/50' : ''} ${n.isPurged ? 'grayscale opacity-60' : ''}`}
            >
                <div className={`w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden ${n.isPurged ? 'bg-slate-950' : ''}`}>
                    {n.visualUrl ? (
                        <img src={n.visualUrl} alt={n.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                        <Icon size={18} className={n.isPurged ? 'text-slate-600' : style.color} />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-bold text-sm truncate ${n.isPurged ? 'text-slate-500' : style.color}`}>{n.name}</span>
                        {getPersonAgeText(n) && (
                            <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded-md shrink-0">
                                {getPersonAgeText(n)}
                            </span>
                        )}
                    </div>
                    <div className="text-[9px] text-slate-500 truncate">{n.isPurged ? `고인 (${n.purgedReason})` : isPast ? '과거의 인연' : n.originName || '기타 인물'}</div>
                    {isCompanion && loc && !n.isPurged && (() => {
                        const isActive = (character.companions || []).some(c => c.id === n.id);
                        const isDispatched = character.base?.dispatched?.some(d => d.companionId === n.id);
                        const statusText = isActive ? '' : (isDispatched ? ' (파견)' : ' (대기)');
                        return (
                            <div className="flex items-center gap-1 text-[9px] text-emerald-400 font-medium truncate mt-0.5">
                                <MapPin size={9} className="shrink-0 text-emerald-400" />
                                <span className="truncate">{loc.nation} {loc.city}{statusText}</span>
                            </div>
                        );
                    })()}
                    {!isCompanion && pendingAppt && !n.isPurged && (
                        <div className="flex items-center gap-1 text-[9px] text-indigo-400 font-medium truncate mt-0.5">
                            <Calendar size={9} className="shrink-0 text-indigo-400" />
                            <span className="truncate">약속 장소: {pendingAppt.location.nation} {pendingAppt.location.city}</span>
                        </div>
                    )}
                </div>
                <div className="text-right shrink-0">
                    {!n.isPurged && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-pink-400">
                            <Heart size={10} className="fill-current"/> {n.affection}
                        </div>
                    )}
                    {n.isRival && !n.isPurged && <div className="text-[8px] bg-red-900/50 text-red-400 px-1 rounded border border-red-800 font-bold mt-1">라이벌</div>}
                    {n.isPurged && <div className="text-[8px] bg-slate-800 text-slate-500 px-1 rounded border border-slate-700 font-bold mt-1">고인</div>}
                </div>
            </button>
        );
    };

    const getClassTierBadge = (target: Companion) => {
        const tier = target.classTier || ClassTier.NONE;
        if (tier === ClassTier.FINAL) {
            return (
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/80 text-amber-300 border border-amber-500/50 font-bold flex items-center gap-1 shadow-sm shrink-0">
                    <Sparkles size={9} className="text-amber-400" /> 파이널 클래스 ({target.finalClassName || '각성'})
                </span>
            );
        }
        if (tier === ClassTier.LAST) {
            return (
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-950/80 text-red-300 border border-red-800/60 font-bold flex items-center gap-1 shrink-0">
                    <Shield size={9} className="text-red-400" /> 라스트 클래스 ({target.lastClassName || '각성'})
                </span>
            );
        }
        if (tier === ClassTier.SECOND) {
            return (
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-950/80 text-purple-300 border border-purple-800/60 font-bold flex items-center gap-1 shrink-0">
                    <Zap size={9} className="text-purple-400" /> 세컨드 클래스 ({target.secondClassName || '각성'})
                </span>
            );
        }
        if (tier === ClassTier.FIRST) {
            return (
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-950/80 text-blue-300 border border-blue-800/60 font-bold flex items-center gap-1 shrink-0">
                    <Sword size={9} className="text-blue-400" /> 퍼스트 클래스 ({target.firstClassName || '발현'})
                </span>
            );
        }
        return (
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800/80 text-slate-400 border border-slate-700/60 font-medium shrink-0">
                미해방
            </span>
        );
    };

    const renderCompanionButton = (c: Companion) => {
        const relType = getPlayerRelationType(c);
        const style = RELATION_STYLE[relType];
        return (
            <button
                key={c.id}
                onClick={() => { setSelectedId(c.id); setShowMobileList(false); }}
                className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${selectedId === c.id ? 'bg-amber-900/40 border-amber-500 shadow-lg' : 'bg-slate-900 border border-slate-800 hover:border-slate-700'}`}
            >
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 relative overflow-hidden">
                    {c.visualUrl ? (
                        <img src={c.visualUrl} alt={c.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                        <span className="text-lg">👤</span>
                    )}
                    {c.isLover && <Heart size={10} className="absolute -top-1 -right-1 text-pink-500 fill-pink-500" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-200 truncate">{c.name}</span>
                        {c.isCustom && (
                            <span className="text-[9px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/50 px-1.5 py-0.5 rounded shadow-sm shrink-0">
                                ⭐ 커스텀
                            </span>
                        )}
                        {getPersonAgeText(c) && (
                            <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded-md shrink-0">
                                {getPersonAgeText(c)}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <div className="text-[10px] text-slate-400 truncate">{getSanitizedJob(c)}</div>
                        {getClassTierBadge(c)}
                        {getBondBuffLabel(c) && (
                            <div className={`text-[9px] font-bold ${getBondBuffLabel(c)?.color} flex items-center gap-0.5 animate-pulse`}>
                                <Sparkles size={8}/> {getBondBuffLabel(c)?.label}
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-pink-400">
                        <Heart size={10} className="fill-current"/> {c.affection}
                    </div>
                    <div className={`text-[8px] font-bold ${style.color} uppercase`}>{style.label}</div>
                </div>
            </button>
        );
    };

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}
            {messagingNpc && (
                <MessageModal 
                    character={character} 
                    npc={messagingNpc} 
                    onClose={() => setMessagingNpc(null)} 
                    onUpdateCharacter={onUpdateCharacter} 
                />
            )}
            {isNpcFamilyTreeOpen && activeTarget && (
                <CompanionFamilyTreeModal 
                    character={character} 
                    companion={activeTarget} 
                    onClose={() => setIsNpcFamilyTreeOpen(false)} 
                />
            )}

            {isBondSkillBookOpen && activeTarget && (
                <BondSkillBookModal
                    character={character}
                    companion={allComps.find(c => c.id === activeTarget.id) as Companion}
                    onClose={() => setIsBondSkillBookOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}

            {/* 인연(유대) 스킬 시스템 & 해금 조건 안내 팝업 모달 */}
            {isBondGuideModalOpen && (
                <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-pink-500/50 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_40px_rgba(236,72,153,0.3)]">
                        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-pink-950/50 via-purple-950/40 to-slate-900 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-pink-500/20 border border-pink-500/40 rounded-xl">
                                    <Sparkles className="text-pink-400" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                                        인연(유대) 스킬 시스템 및 해금 조건
                                    </h3>
                                    <p className="text-[11px] text-pink-300/80">영혼과 유대가 결합된 융합 무공 및 연계 마법의 발동 규칙</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsBondGuideModalOpen(false)}
                                className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar text-xs">
                            {/* 1. 관계 조건 */}
                            <div className="p-3.5 bg-slate-950/70 border border-pink-900/40 rounded-xl space-y-2">
                                <div className="font-bold text-pink-300 flex items-center gap-1.5 text-sm">
                                    <Heart size={15} className="text-pink-400" /> 1. 인연 및 관계 조건 (택 1 충족 시 해금)
                                </div>
                                <ul className="space-y-1.5 text-[11px] text-slate-300 pl-2 list-disc list-inside">
                                    <li><strong className="text-pink-300">플레이어 ↔ 동료:</strong> <span className="text-rose-300 font-bold">배우자</span> (즉시) 또는 <span className="text-pink-300 font-bold">연인 (1년/12개월 이상 교제)</span> (또는 호감도 90 이상 & 함께한 기간 10년 이상)</li>
                                    <li><strong className="text-purple-300">동료 ↔ 동료:</strong> 동료 간 <span className="text-rose-300 font-bold">배우자</span> (즉시) 또는 <span className="text-pink-300 font-bold">연인 (1년/12개월 이상 교제)</span></li>
                                    <li><strong className="text-purple-300">동료 ↔ 동료 (세월의 유대):</strong> 연인이 아닌 경우 파티에서 함께한 기간 <strong className="text-emerald-400 font-bold">10년 이상</strong> 충족 시 해금</li>
                                </ul>
                            </div>

                            {/* 2. 스킬 융합 조건 */}
                            <div className="p-3.5 bg-slate-950/70 border border-amber-900/40 rounded-xl space-y-2">
                                <div className="font-bold text-amber-300 flex items-center gap-1.5 text-sm">
                                    <Sword size={15} className="text-amber-400" /> 2. 기술 융합 조건
                                </div>
                                <ul className="space-y-1.5 text-[11px] text-slate-300 pl-2 list-disc list-inside">
                                    <li>융합할 두 대상의 스킬이 모두 <strong className="text-amber-300 font-black">레벨 10 (Lv.10) 이상</strong>이어야 합니다.</li>
                                    <li>패시브, 단순 버프/디버프를 제외한 <strong className="text-indigo-300 font-bold">액티브 공격 및 전투 기술</strong>만 융합 가능합니다.</li>
                                    <li>슬롯 제한: 연인은 대상당 <strong className="text-white">1개</strong>, 배우자는 대상당 최대 <strong className="text-pink-300 font-bold">2개</strong>까지 창작 가능합니다.</li>
                                </ul>
                            </div>

                            {/* 3. 위력 및 특성 공식 */}
                            <div className="p-3.5 bg-slate-950/70 border border-purple-900/40 rounded-xl space-y-2">
                                <div className="font-bold text-purple-300 flex items-center gap-1.5 text-sm">
                                    <Zap size={15} className="text-purple-400" /> 3. 위력 및 특성 공식
                                </div>
                                <ul className="space-y-1.5 text-[11px] text-slate-300 pl-2 list-disc list-inside">
                                    <li>융합 위력: (기술 1 위력% + 기술 2 위력%) × <strong className="text-purple-300 font-black">1.5배 (150%)</strong>의 위력 계수</li>
                                    <li>소모 MP: 두 기술의 소모 MP 합산</li>
                                    <li>공격 범위: 조합된 두 기술이 모두 광역기(AOE)일 경우 광역으로 시전</li>
                                </ul>
                            </div>

                            {/* 4. 자동 소멸 및 데이터 무결성 규칙 */}
                            <div className="p-3.5 bg-slate-950/70 border border-red-900/40 rounded-xl space-y-2">
                                <div className="font-bold text-red-300 flex items-center gap-1.5 text-sm">
                                    <HeartCrack size={15} className="text-red-400" /> 4. 관계 단절 시 자동 소멸 규칙
                                </div>
                                <p className="text-[11px] text-slate-300 leading-relaxed pl-1">
                                    인연 스킬은 두 인물의 영혼과 유대로 유지되는 기술입니다. <br/>
                                    만약 <strong className="text-red-400">연인/배우자 관계가 해소(이별/해방)되거나 인연이 단절될 경우</strong>, 해당 대상과의 인연 스킬은 데이터 무결성을 위해 <strong className="text-amber-300 font-bold">시스템에 의해 자동으로 안전하게 삭제</strong>됩니다.
                                </p>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
                            <button
                                onClick={() => setIsBondGuideModalOpen(false)}
                                className="px-5 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg"
                            >
                                확인 및 닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isEternalRivalModalOpen && (
                <EternalRivalModal
                    character={character}
                    onClose={() => setIsEternalRivalModalOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                    onBattle={(enemy, type, source) => {
                        if (onBattle) onBattle(enemy, type || 'eternal_rival_duel', source || '');
                    }}
                />
            )}

            {isAppointmentModalOpen && activeTarget && (
                <AppointmentModal
                    character={character}
                    target={activeTarget}
                    isOpen={isAppointmentModalOpen}
                    onClose={() => setIsAppointmentModalOpen(false)}
                    onUpdateCharacter={(updater) => {
                        const updated = updater(character);
                        onUpdateCharacter(updated, '만남 약속 일정이 갱신되었습니다.');
                    }}
                    initialType={appointmentModalType}
                />
            )}

            <div className="bg-slate-900 border border-indigo-500/30 w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center shrink-0 gap-2">
                    <div className="flex items-center">
                        <div className="p-2 bg-indigo-900/20 rounded-lg border border-indigo-500/30 mr-3">
                            <Users2 size={24} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-white font-cinzel">인물 관계망</h2>
                            <p className="text-[10px] md:text-xs text-slate-500 hidden sm:block">대원들 및 교류 중인 인물들의 관계를 확인하십시오.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsBondGuideModalOpen(true)}
                            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-pink-950 via-purple-950 to-pink-950 hover:from-pink-900 hover:to-purple-900 border border-pink-500/60 text-pink-200 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg transition-all"
                            title="인연(유대) 스킬 생성 조건 및 시스템 가이드"
                        >
                            <Sparkles size={14} className="text-pink-400" />
                            <span>인연스킬 안내</span>
                        </button>
                        <button
                            onClick={() => setIsEternalRivalModalOpen(true)}
                            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-red-950 via-red-900 to-red-950 hover:from-red-900 hover:to-red-800 border border-red-600/70 text-red-200 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg transition-all animate-pulse"
                            title="단 한 명의 영원의 라이벌 현황 및 결사대 조회"
                        >
                            <Flame size={15} className="text-red-400" />
                            <span>영원의 라이벌</span>
                        </button>
                        <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                    <div className={`w-full md:w-80 border-r border-slate-800 p-2 md:p-4 overflow-y-auto custom-scrollbar shrink-0 bg-slate-950/30 flex-col flex-1 md:flex-none ${showMobileList ? 'flex' : 'hidden md:flex'}`}>
                        <div className="flex flex-wrap gap-1 p-1 bg-slate-900 rounded-xl mb-4 border border-slate-800">
                            <button 
                                onClick={() => { setListType('all'); }}
                                className={`flex-1 min-w-[60px] px-2 py-2 text-[10px] font-bold rounded-lg transition-all ${listType === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                전체
                            </button>
                            <button 
                                onClick={() => { setListType('companions'); }}
                                className={`flex-1 min-w-[60px] px-2 py-2 text-[10px] font-bold rounded-lg transition-all ${listType === 'companions' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                동료
                            </button>
                            <button 
                                onClick={() => { setListType('npcs'); }}
                                className={`flex-1 min-w-[60px] px-2 py-2 text-[10px] font-bold rounded-lg transition-all ${listType === 'npcs' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                현재
                            </button>
                            <button 
                                onClick={() => { setListType('past'); }}
                                className={`flex-1 min-w-[60px] px-2 py-2 text-[10px] font-bold rounded-lg transition-all ${listType === 'past' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                과거
                            </button>
                            <button 
                                onClick={() => { setListType('purged'); }}
                                className={`flex-1 min-w-[60px] px-2 py-2 text-[10px] font-bold rounded-lg transition-all ${listType === 'purged' ? 'bg-red-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                고인
                            </button>
                        </div>

                        {/* 정렬 셀렉터 */}
                        <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 mb-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs">
                            <span className="text-slate-400 font-bold flex items-center gap-1 text-[11px] shrink-0">
                                <ArrowUpDown size={12} className="text-indigo-400" /> 정렬:
                            </span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                className="bg-slate-950 border border-slate-700 text-slate-200 text-[11px] rounded-lg px-2 py-1 outline-none focus:border-indigo-500 cursor-pointer font-medium w-full max-w-[170px]"
                            >
                                <option value="default">기본 순</option>
                                <option value="custom_first">⭐ 커스텀 동료 우선</option>
                                <option value="custom_only">⭐ 커스텀 동료만</option>
                                <option value="lover_first">💕 연인/배우자 우선</option>
                                <option value="bond_eligible">✨ 인연스킬 해금 가능</option>
                                <option value="affection_desc">💖 호감도 높은 순</option>
                                <option value="affection_asc">🤍 호감도 낮은 순</option>
                                <option value="age_desc">⏳ 나이 많은 순</option>
                                <option value="age_asc">🌱 나이 적은 순</option>
                                <option value="level_desc">⚔️ 레벨 높은 순</option>
                                <option value="name_asc">🔤 이름 가나다순</option>
                            </select>
                        </div>

                        <div className="space-y-2 flex-1">
                            {(() => {
                                const renderSectionHeader = (
                                    title: string,
                                    count: number,
                                    sectionKey: 'companions' | 'activeNpcs' | 'pastNpcs' | 'purgedNpcs',
                                    colorClass: string = 'text-slate-300'
                                ) => {
                                    const isCollapsed = !!collapsedSections[sectionKey];
                                    return (
                                        <button
                                            type="button"
                                            onClick={() => toggleSection(sectionKey)}
                                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-left transition-all my-2 group active:scale-[0.99]"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-black tracking-wide ${colorClass}`}>{title}</span>
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                                    {count}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-slate-500 group-hover:text-slate-300 transition-colors">
                                                <span className="text-[10px] font-medium">{isCollapsed ? '펼치기' : '접기'}</span>
                                                {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                            </div>
                                        </button>
                                    );
                                };

                                const renderPlayerCard = () => (
                                    <button
                                        onClick={() => { setSelectedId('player'); setShowMobileList(false); }}
                                        className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${selectedId === 'player' ? 'bg-amber-900/40 border-amber-500 shadow-lg' : 'bg-slate-900 border border-slate-800 hover:border-slate-700'}`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-amber-900/20 border border-amber-500/50 flex items-center justify-center shrink-0 overflow-hidden">
                                            {character.visualUrl ? (
                                                <img src={character.visualUrl} alt={character.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            ) : (
                                                <Crown size={20} className="text-amber-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-bold text-sm text-slate-200 truncate">{character.name} (나)</span>
                                                {getPersonAgeText(character) && (
                                                    <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded-md shrink-0">
                                                        {getPersonAgeText(character)}
                                                    </span>
                                                )}
                                            </div>
                                            {getBondBonus(character) > 0 && (
                                                <div className="text-[10px] text-pink-400 font-bold flex items-center gap-1">
                                                    <Heart size={10} className="fill-current"/> 인연 버프 활성화 (공격력 +{Math.round(getBondBonus(character) * 100)}%)
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );

                                if (listType === 'all') {
                                    return (
                                        <>
                                            {renderPlayerCard()}
                                            
                                            {/* 동료 목록 */}
                                            {renderSectionHeader('동료 목록', sortedAllComps.length, 'companions', 'text-indigo-400')}
                                            {!collapsedSections.companions && (
                                                <div className="space-y-1.5 animate-in fade-in duration-150">
                                                    {sortedAllComps.length > 0 ? (
                                                        sortedAllComps.map(c => renderCompanionButton(c))
                                                    ) : (
                                                        <div className="text-center py-3 text-xs text-slate-500">동료가 없습니다.</div>
                                                    )}
                                                </div>
                                            )}

                                            {/* 현재 인연 */}
                                            {renderSectionHeader('현재 인연', sortedInteractedNpcs.length, 'activeNpcs', 'text-cyan-400')}
                                            {!collapsedSections.activeNpcs && (
                                                <div className="space-y-1.5 animate-in fade-in duration-150">
                                                    {sortedInteractedNpcs.length > 0 ? (
                                                        sortedInteractedNpcs.map(n => renderNpcButton(n))
                                                    ) : (
                                                        <div className="text-center py-3 text-xs text-slate-500">현재 인연이 없습니다.</div>
                                                    )}
                                                </div>
                                            )}

                                            {/* 과거 인연 */}
                                            {sortedPastNpcs.length > 0 && (
                                                <>
                                                    {renderSectionHeader('과거 인연', sortedPastNpcs.length, 'pastNpcs', 'text-purple-400')}
                                                    {!collapsedSections.pastNpcs && (
                                                        <div className="space-y-1.5 animate-in fade-in duration-150">
                                                            {sortedPastNpcs.map(n => renderNpcButton(n, true))}
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* 고인 목록 */}
                                            {sortedPurgedNpcs.length > 0 && (
                                                <>
                                                    {renderSectionHeader('고인 목록', sortedPurgedNpcs.length, 'purgedNpcs', 'text-red-400')}
                                                    {!collapsedSections.purgedNpcs && (
                                                        <div className="space-y-1.5 animate-in fade-in duration-150">
                                                            {sortedPurgedNpcs.map(n => renderNpcButton(n, false))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    );
                                }

                                if (listType === 'companions') {
                                    return (
                                        <>
                                            {renderPlayerCard()}
                                            {renderSectionHeader('동료 목록', sortedAllComps.length, 'companions', 'text-indigo-400')}
                                            {!collapsedSections.companions && (
                                                <div className="space-y-1.5 animate-in fade-in duration-150">
                                                    {sortedAllComps.length > 0 ? (
                                                        sortedAllComps.map(c => renderCompanionButton(c))
                                                    ) : (
                                                        <div className="text-center py-4 text-xs text-slate-500">동료가 없습니다.</div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    );
                                }

                                if (listType === 'npcs') {
                                    return (
                                        <>
                                            {renderSectionHeader('현재 인연', sortedInteractedNpcs.length, 'activeNpcs', 'text-cyan-400')}
                                            {!collapsedSections.activeNpcs && (
                                                <div className="space-y-1.5 animate-in fade-in duration-150">
                                                    {sortedInteractedNpcs.length > 0 ? (
                                                        sortedInteractedNpcs.map(n => renderNpcButton(n))
                                                    ) : (
                                                        <div className="text-center py-4 text-xs text-slate-500">현재 인연이 없습니다.</div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    );
                                }

                                if (listType === 'past') {
                                    return (
                                        <>
                                            {renderSectionHeader('과거 인연', sortedPastNpcs.length, 'pastNpcs', 'text-purple-400')}
                                            {!collapsedSections.pastNpcs && (
                                                <div className="space-y-1.5 animate-in fade-in duration-150">
                                                    {sortedPastNpcs.length > 0 ? (
                                                        sortedPastNpcs.map(n => renderNpcButton(n, true))
                                                    ) : (
                                                        <div className="text-center py-4 text-xs text-slate-500">과거 인연이 없습니다.</div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    );
                                }

                                if (listType === 'purged') {
                                    return (
                                        <>
                                            {renderSectionHeader('고인 목록', sortedPurgedNpcs.length, 'purgedNpcs', 'text-red-400')}
                                            {!collapsedSections.purgedNpcs && (
                                                <div className="space-y-1.5 animate-in fade-in duration-150">
                                                    {sortedPurgedNpcs.length > 0 ? (
                                                        sortedPurgedNpcs.map(n => renderNpcButton(n, false))
                                                    ) : (
                                                        <div className="text-center py-4 text-xs text-slate-500">고인 기록이 없습니다.</div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    );
                                }

                                return null;
                            })()}
                        </div>
                    </div>

                    <div className={`flex-1 p-3 md:p-6 overflow-y-auto custom-scrollbar bg-slate-900 ${showMobileList ? 'hidden md:block' : 'block'}`}>
                        {selectedId ? (
                            <div className="space-y-8 animate-in slide-in-from-right-4">
                                <button onClick={() => setShowMobileList(true)} className="md:hidden flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800/50 px-3 py-2 rounded-lg mb-4 w-fit">
                                    <ArrowLeft size={14} /> 목록으로 돌아가기
                                </button>
                                <div className="border-b border-slate-800 pb-6 space-y-4">
                                    {/* 상단 행: 아바타 + 기본 정보 + 액션 버튼 그룹 */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className={`w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-full border-2 flex items-center justify-center shadow-2xl text-3xl sm:text-4xl overflow-hidden ${isPlayerSelected ? 'bg-amber-900/20 border-amber-500' : 'bg-indigo-900/20 border-indigo-500'} ${activeTarget?.isPurged ? 'grayscale opacity-50 border-slate-700' : ''}`}>
                                                {activeTarget?.visualUrl ? (
                                                    <img src={activeTarget.visualUrl} alt={activeTarget.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                ) : (
                                                    isPlayerSelected ? '👑' : '👤'
                                                )}
                                            </div>
                                            <div className="min-w-0 text-left">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <h3 className={`text-xl sm:text-2xl font-bold truncate ${activeTarget?.isPurged ? 'text-slate-500' : 'text-white'}`}>
                                                        {isPlayerSelected ? `${character.name} (나)` : activeTarget?.name}
                                                    </h3>
                                                    {getPersonAgeText(isPlayerSelected ? character : activeTarget) && (
                                                        <span className="text-xs sm:text-sm font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded-full shadow-sm shrink-0">
                                                            {getPersonAgeText(isPlayerSelected ? character : activeTarget)}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {!isPlayerSelected && activeTarget && !activeTarget.isPurged && (
                                                    <div className="text-[11px] sm:text-xs text-slate-400 mb-1 font-medium">
                                                        플레이어와 알고 지낸 지 <span className="text-pink-400 font-bold">{Math.max(0, (character.currentDate ? parseInt(character.currentDate.split('-')[0]) : 0) - (activeTarget.metYear || (character.currentDate ? parseInt(character.currentDate.split('-')[0]) : 0)))}년</span>
                                                    </div>
                                                )}

                                                {isPlayerSelected && getBondBonus(character) > 0 && (
                                                    <div className="text-[10px] sm:text-xs text-pink-400 font-bold flex items-center gap-1 mb-1 bg-pink-950/20 px-2 py-1 rounded border border-pink-900/30 w-fit">
                                                        <Heart size={12} className="fill-current"/> 인연 버프 활성화 (공격력 +{Math.round(getBondBonus(character) * 100)}%)
                                                    </div>
                                                )}
                                                
                                                {!isPlayerSelected && activeTarget && getBondBuffLabel(activeTarget) && (
                                                    <div className={`text-[10px] sm:text-xs ${getBondBuffLabel(activeTarget)?.color} font-bold flex items-center gap-1 mb-1 bg-slate-950/50 px-2 py-1 rounded border border-slate-800 w-fit animate-pulse`}>
                                                        <Sparkles size={12}/> {getBondBuffLabel(activeTarget)?.label} ({getBondBuffLabel(activeTarget)?.effect})
                                                    </div>
                                                )}

                                                {activeTarget?.origin && (
                                                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-indigo-400 font-bold mb-1">
                                                        {React.createElement(getOriginIcon(activeTarget.origin), { size: 14, className: 'shrink-0' })}
                                                        <span className="truncate">{activeTarget.originName}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 액션 버튼 그룹 (우측 상단 독립 배치) */}
                                        {!isPlayerSelected && !activeTarget?.isPurged && (
                                            <div className="flex flex-wrap gap-2 items-center justify-start sm:justify-end shrink-0 pt-1">
                                                {/* 약속 잡기 버튼 */}
                                                {!allComps.some(c => c.id === activeTarget?.id) && (
                                                    <button 
                                                        onClick={() => { setAppointmentModalType('meet'); setIsAppointmentModalOpen(true); }}
                                                        className="px-3.5 py-2 bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg active:scale-95"
                                                    >
                                                        <Calendar size={15}/> 약속잡기
                                                    </button>
                                                )}

                                                {/* 가계도 버튼 */}
                                                <button 
                                                    onClick={() => setIsNpcFamilyTreeOpen(true)}
                                                    className="px-3.5 py-2 bg-amber-900/40 hover:bg-amber-800/60 border border-amber-500/50 text-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg active:scale-95"
                                                >
                                                    <GitBranch size={15}/> 가계도
                                                </button>

                                                {/* 인연 스킬북 버튼 (조건 충족 시 활성화, 미충족 시 잠금 상태 및 클릭 시 상세 조건 안내) */}
                                                {allComps.some(c => c.id === activeTarget?.id) && (
                                                    isEligibleForBondSkill(activeTarget) ? (
                                                        <button 
                                                            onClick={() => setIsBondSkillBookOpen(true)}
                                                            className="px-3.5 py-2 bg-pink-900/40 hover:bg-pink-800/60 border border-pink-500/50 text-pink-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg active:scale-95"
                                                            title="인연 스킬북 열기 (조건 충족)"
                                                        >
                                                            <Sparkles size={15}/> 인연 스킬북
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => {
                                                                const years = getYearsKnown(activeTarget);
                                                                const aff = activeTarget.affection ?? 0;
                                                                const isPlayerPartner = (activeTarget.isSpouse || activeTarget.isLover) && (activeTarget.partnerId === 'player' || (!activeTarget.partnerId && !activeTarget.partnerName));
                                                                const partnerDisplay = activeTarget.partnerName
                                                                    ? `\n • 현재 파트너: ${activeTarget.partnerName} (${activeTarget.isSpouse ? '배우자' : '연인'})`
                                                                    : '';
                                                                const playerRelStr = isPlayerPartner 
                                                                    ? (activeTarget.isSpouse ? '배우자' : '연인') 
                                                                    : '일반';
                                                                alert(`[인연 스킬 생성 조건 안내]\n\n1. 관계 조건 (택 1 충족 시 해금)\n • 플레이어와 연인/배우자 또는 동료 간 연인/배우자\n • 친형제자매: 호감도 90 이상\n • 이복/이부 형제자매: 호감도 100 이상\n • 플레이어와 호감도 90 이상 & 함께한 기간 10년 이상\n • 동료 간 상호 호감도 80 이상\n\n2. 스킬 조건\n • 융합할 두 스킬 모두 Lv.10 이상\n\n현재 ${activeTarget.name} 상태:${partnerDisplay}\n • 플레이어와의 관계: ${playerRelStr}\n • 플레이어 호감도: ${aff}/90 ${aff >= 90 ? '✅' : '❌'}\n • 함께한 기간: ${years}년/10년 ${years >= 10 ? '✅' : '❌'}`);
                                                            }}
                                                            className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-400 hover:text-pink-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                                                            title="인연 스킬 조건 미충족 (클릭하여 해금 조건 및 달성 현황 확인)"
                                                        >
                                                            <Lock size={14} className="text-slate-500" />
                                                            <span>인연 스킬북</span>
                                                        </button>
                                                    )
                                                )}

                                                {(interactedNpcs.some(n => n.id === activeTarget?.id) || pastNpcs.some(n => n.id === activeTarget?.id)) && (
                                                    <>
                                                        <button 
                                                            onClick={() => setMessagingNpc(activeTarget)}
                                                            className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all active:scale-95"
                                                        >
                                                            <Mail size={15}/> 메시지
                                                        </button>
                                                        <button 
                                                            onClick={handleSeverTies}
                                                            className="px-3.5 py-2 bg-slate-800 hover:bg-red-950/40 text-red-400 border border-red-900/30 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all active:scale-95"
                                                        >
                                                            <UserMinus size={15}/> 손절하기
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* 위치 정보 */}
                                    {!isPlayerSelected && !activeTarget?.isPurged && (() => {
                                        const isCompanion = allComps.some(c => c.id === activeTarget.id);
                                        const pendingAppt = (character.socialAppointments || []).find(
                                            a => a.targetId === activeTarget.id && a.status === 'pending'
                                        );

                                        if (isCompanion) {
                                            const loc = getPersonLocation(activeTarget, character);
                                            const isActive = (character.companions || []).some(c => c.id === activeTarget.id);
                                            const isDispatched = character.base?.dispatched?.some(d => d.companionId === activeTarget.id);
                                            const statusText = isActive ? '동행 중' : (isDispatched ? '파견 중' : '기지 대기 중');
                                            
                                            return (
                                                <div className="flex flex-wrap items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-800/40 w-fit">
                                                    <MapPin size={13} className="shrink-0 text-emerald-400" />
                                                    <span>현재 위치: <strong className="text-emerald-300 font-bold">{loc.nation} {loc.city}</strong> ({statusText})</span>
                                                </div>
                                            );
                                        }

                                        if (pendingAppt) {
                                            return (
                                                <div className="flex flex-wrap items-center justify-between gap-2 bg-indigo-950/70 border border-indigo-500/50 px-3.5 py-2 rounded-xl text-xs text-indigo-200 w-full">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-indigo-400 shrink-0" />
                                                        <span className="font-medium">
                                                            약속 장소: <strong className="text-indigo-300 font-bold">{pendingAppt.location.nation} {pendingAppt.location.city} 거주구역</strong> ({pendingAppt.type === 'duel' ? '결투' : '만남'} 대기 중)
                                                        </span>
                                                    </div>
                                                    <button 
                                                        onClick={() => { setAppointmentModalType(pendingAppt.type); setIsAppointmentModalOpen(true); }}
                                                        className="text-[11px] bg-indigo-800 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg font-bold transition-all"
                                                    >
                                                        약속 관리
                                                    </button>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 w-fit">
                                                <MapPin size={13} className="shrink-0 text-slate-500" />
                                                <span>위치 정보: <span className="text-slate-500 font-normal">약속을 잡아 현재 위치를 확인하세요</span></span>
                                            </div>
                                        );
                                    })()}

                                    {/* 하단 상세 정보: w-full 너비를 온전히 사용하여 직업, 나이 등이 절대 잘리지 않음 */}
                                    <div className="w-full space-y-2.5">
                                        {!isPlayerSelected && !activeTarget?.isPurged && (
                                            <div className="grid grid-cols-5 gap-2 bg-black/40 p-3 rounded-2xl border border-white/5">
                                                <div className="text-center px-1">
                                                    <p className="text-[10px] text-slate-500 font-bold tracking-wider">나이</p>
                                                    <p className="text-xs sm:text-sm font-bold text-emerald-400 font-mono mt-0.5">{getPersonAgeText(activeTarget) || '미상'}</p>
                                                </div>
                                                <div className="text-center px-1 border-l border-white/5">
                                                    <p className="text-[10px] text-slate-500 font-bold tracking-wider">레벨</p>
                                                    <p className="text-xs sm:text-sm font-bold text-amber-400 font-mono mt-0.5">Lv.{activeTarget.level}</p>
                                                </div>
                                                <div className="text-center px-1 border-l border-white/5">
                                                    <p className="text-[10px] text-slate-500 font-bold tracking-wider">직업</p>
                                                    <p className="text-xs sm:text-sm font-bold text-indigo-400 truncate mt-0.5" title={getSanitizedJob(activeTarget)}>{getSanitizedJob(activeTarget)}</p>
                                                </div>
                                                <div className="text-center px-1 border-l border-white/5">
                                                    <p className="text-[10px] text-slate-500 font-bold tracking-wider">
                                                        {activeTarget.job === JobType.SOLDIER ? '공적' : '명성'}
                                                    </p>
                                                    <p className="text-xs sm:text-sm font-bold text-blue-400 font-mono mt-0.5">
                                                        {(activeTarget.job === JobType.SOLDIER ? (activeTarget.merit || 0) : (activeTarget.reputation || 0)).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="text-center px-1 border-l border-white/5">
                                                    <p className="text-[10px] text-slate-500 font-bold tracking-wider">악명</p>
                                                    <p className="text-xs sm:text-sm font-bold text-red-500 font-mono mt-0.5">{activeTarget.infamy || 0}</p>
                                                </div>
                                            </div>
                                        )}

                                        {isPlayerSelected && (
                                            <div className="grid grid-cols-4 gap-2 bg-black/40 p-3 rounded-2xl border border-white/5">
                                                <div className="text-center px-1">
                                                    <p className="text-[10px] text-slate-500 font-bold tracking-wider">나이</p>
                                                    <p className="text-xs sm:text-sm font-bold text-emerald-400 font-mono mt-0.5">{getPersonAgeText(character) || '미상'}</p>
                                                </div>
                                                <div className="text-center px-1 border-l border-white/5">
                                                    <p className="text-[10px] text-slate-500 font-bold tracking-wider">레벨</p>
                                                    <p className="text-xs sm:text-sm font-bold text-amber-400 font-mono mt-0.5">Lv.{character.level}</p>
                                                </div>
                                                <div className="text-center px-1 border-l border-white/5">
                                                    <p className="text-[10px] text-slate-500 font-bold tracking-wider">직업</p>
                                                    <p className="text-xs sm:text-sm font-bold text-indigo-400 truncate mt-0.5">{character.job || character.classType || '모험가'}</p>
                                                </div>
                                                <div className="text-center px-1 border-l border-white/5">
                                                    <p className="text-[10px] text-slate-500 font-bold tracking-wider">
                                                        {character.job === JobType.SOLDIER ? '공적' : '명성'}
                                                    </p>
                                                    <p className="text-xs sm:text-sm font-bold text-blue-400 font-mono mt-0.5">
                                                        {(character.job === JobType.SOLDIER ? (character.militaryData?.merit || 0) : (character.mercenaryData?.reputation || character.fame || 0)).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {!isPlayerSelected && !activeTarget?.isPurged && (
                                            <div className="bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                                                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                                                    <Sparkles size={14} className="text-amber-400" /> 클래스 해방 상태
                                                </span>
                                                <div>
                                                    {getClassTierBadge(activeTarget)}
                                                </div>
                                            </div>
                                        )}

                                        {!isPlayerSelected && !activeTarget?.isPurged && (
                                            <div className="bg-cyan-950/40 px-3.5 py-2 rounded-xl border border-cyan-500/30 flex items-center justify-between text-xs">
                                                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                                                    <Flame size={14} className="text-cyan-400" /> 신력 계통 속성
                                                </span>
                                                <span className={`font-bold ${activeTarget?.shinryokuType && activeTarget.shinryokuType !== '미개방' && activeTarget.shinryokuType !== '무속성' ? 'text-cyan-300' : 'text-slate-500'}`}>
                                                    {activeTarget?.shinryokuType && activeTarget.shinryokuType !== '미개방' && activeTarget.shinryokuType !== '무속성' 
                                                        ? activeTarget.shinryokuType 
                                                        : '미개방'}
                                                </span>
                                            </div>
                                        )}

                                        {!isPlayerSelected && !activeTarget?.isPurged && activeTarget?.combatStyle && COMBAT_STYLE_CONFIG[activeTarget.combatStyle as CombatStyle] && (
                                            <div className="bg-indigo-950/40 px-3.5 py-2 rounded-xl border border-indigo-500/30 flex items-center justify-between text-xs">
                                                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                                                    <Sword size={14} className="text-indigo-400" /> 전투 계열
                                                </span>
                                                <span className="text-amber-400 font-bold">
                                                    {COMBAT_STYLE_CONFIG[activeTarget.combatStyle as CombatStyle].label}
                                                </span>
                                            </div>
                                        )}

                                        {!isPlayerSelected && !activeTarget?.isPurged && (
                                            <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-2 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-400 font-bold flex items-center gap-1.5">
                                                        <Sparkles size={14} className="text-amber-400" /> 세력 영향력 및 성향
                                                    </span>
                                                    {(activeTarget.infamy || 0) >= 200 ? (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-950 text-red-300 border border-red-700 animate-pulse">
                                                            ☠️ 칠흑의 악도 (악행 전념)
                                                        </span>
                                                    ) : (activeTarget.goodWill || 0) >= 200 ? (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-700 animate-pulse">
                                                            🌟 확고한 선의 (선행 전념)
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                                            ⚖️ 중립 성향
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-center pt-0.5">
                                                    <div className="p-2 bg-black/40 border border-emerald-500/20 rounded-xl">
                                                        <div className="text-[10px] text-emerald-400 font-bold">선한 영향력</div>
                                                        <div className="text-xs font-black text-emerald-300 mt-0.5">
                                                            {activeTarget.goodWill || 0} / 200
                                                        </div>
                                                    </div>
                                                    <div className="p-2 bg-black/40 border border-red-500/20 rounded-xl">
                                                        <div className="text-[10px] text-red-400 font-bold">악명도</div>
                                                        <div className="text-xs font-black text-red-300 mt-0.5">
                                                            {activeTarget.infamy || 0} / 200
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {activeTarget?.isPurged && (
                                            <div className="mt-4 p-4 bg-slate-950 border border-red-900/30 rounded-2xl text-center">
                                                <p className="text-red-400 font-bold text-sm flex items-center justify-center gap-2">
                                                    <Skull size={16}/> {activeTarget.purgedReason}
                                                </p>
                                                <p className="text-[10px] text-slate-600 mt-1 italic">"이미 세상을 떠났거나 다시는 만날 수 없는 인연입니다."</p>
                                            </div>
                                        )}

                                        {!isPlayerSelected && !activeTarget?.isPurged && !interactedNpcs.some(n => n.id === activeTarget?.id) && !allComps.some(c => c.id === activeTarget?.id) && (
                                            <div className="flex items-center gap-1.5 text-xs text-purple-400 font-bold pt-1">
                                                <History size={14}/>
                                                <span>{pastNpcs.some(n => n.id === activeTarget?.id) ? '과거의 인연' : '동료의 지인'}</span>
                                            </div>
                                        )}

                                        {/* 동료 전용: 인연(유대) 스킬 생성 상태 & 조건 요약 배너 */}
                                        {!isPlayerSelected && !activeTarget?.isPurged && allComps.some(c => c.id === activeTarget?.id) && (() => {
                                            const isEligible = isEligibleForBondSkill(activeTarget);
                                            const years = getYearsKnown(activeTarget);
                                            const aff = activeTarget.affection ?? 0;
                                            const isPlayerPartner = (activeTarget.isSpouse || activeTarget.isLover) && (activeTarget.partnerId === 'player' || (!activeTarget.partnerId && !activeTarget.partnerName));
                                            
                                            // 동료 파트너 조회
                                            const otherPartner = allComps.find(c => c.id !== activeTarget.id && (
                                                (c.isSpouse && (c.partnerId === activeTarget.id || (activeTarget.name && c.partnerName === activeTarget.name))) ||
                                                (activeTarget.isSpouse && (activeTarget.partnerId === c.id || (c.name && activeTarget.partnerName === c.name))) ||
                                                (c.isLover && (c.partnerId === activeTarget.id || (activeTarget.name && c.partnerName === activeTarget.name))) ||
                                                (activeTarget.isLover && (activeTarget.partnerId === c.id || (c.name && activeTarget.partnerName === c.name))) ||
                                                c.relations?.[activeTarget.id]?.type === '배우자' ||
                                                activeTarget.relations?.[c.id]?.type === '배우자' ||
                                                c.relations?.[activeTarget.id]?.type === '연인' ||
                                                activeTarget.relations?.[c.id]?.type === '연인'
                                            ));

                                            const otherTenYearComp = allComps.find(c => c.id !== activeTarget.id && getYearsTogether(c, activeTarget) >= 10);

                                            const lv10Skills = (activeTarget.skills || []).filter((s: any) => (s.level || 1) >= 10 && s.type !== SkillType.PASSIVE && s.type !== SkillType.BUFF && s.type !== SkillType.DEBUFF);
                                            const targetBondSkills = (character.bondSkills || []).filter((bs: any) => bs.companionId === activeTarget.id || bs.sourceId === activeTarget.id);

                                            return (
                                                <div className={`mt-3 p-3.5 rounded-2xl border ${isEligible ? 'bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-slate-900 border-pink-500/40' : 'bg-slate-950/60 border-slate-800'}`}>
                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                        <div className="flex items-center gap-1.5 font-bold text-xs">
                                                             <Sparkles size={14} className={isEligible ? 'text-pink-400' : 'text-slate-500'} />
                                                             <span className={isEligible ? 'text-pink-200' : 'text-slate-300'}>인연(유대) 스킬 상태</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            {isEligible ? (
                                                                <span className="px-2 py-0.5 bg-pink-900/60 text-pink-300 border border-pink-500/40 rounded-full text-[10px] font-bold flex items-center gap-1">
                                                                    <CheckCircle2 size={11} className="text-pink-400" /> 해금 가능
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-full text-[10px] font-bold flex items-center gap-1">
                                                                    <Lock size={11} className="text-slate-500" /> 조건 미달성
                                                                </span>
                                                            )}
                                                            <button
                                                                onClick={() => setIsBondGuideModalOpen(true)}
                                                                className="text-[10px] text-pink-400 hover:text-pink-300 underline font-semibold flex items-center gap-0.5 ml-1"
                                                            >
                                                                <HelpCircle size={11} /> 조건 가이드
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Checklist */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] mb-2.5">
                                                        <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80 flex items-center justify-between">
                                                            <span className="text-slate-400">관계/유대:</span>
                                                            <span className="font-bold">
                                                                {isPlayerPartner ? (
                                                                    <span className="text-rose-400">💖 플레이어 {activeTarget.isSpouse ? '배우자' : `연인 (${getLoverMonths(activeTarget)}개월 / 12개월)`}</span>
                                                                ) : otherPartner ? (
                                                                    <span className="text-pink-400">💖 {otherPartner.name}와 {activeTarget.isSpouse ? '배우자' : `연인 (${getLoverMonths(activeTarget, otherPartner)}개월 / 12개월)`}</span>
                                                                ) : (aff >= 90 && years >= 10) ? (
                                                                    <span className="text-emerald-400">✨ 10년 세월 유대</span>
                                                                ) : otherTenYearComp ? (
                                                                    <span className="text-emerald-400">✨ {otherTenYearComp.name}와 10년 유대</span>
                                                                ) : (
                                                                    <span className="text-slate-400">일반 (호감 {aff}/90, {years}/10년)</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80 flex items-center justify-between">
                                                            <span className="text-slate-400">Lv.10 융합 무공:</span>
                                                            <span className={`font-bold ${lv10Skills.length > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                                                {lv10Skills.length > 0 ? `${lv10Skills.length}개 보유` : '0개 (Lv.10 필요)'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Existing bond skills badge if any */}
                                                    {targetBondSkills.length > 0 && (
                                                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] mb-2">
                                                            <span className="text-slate-400 font-medium">활성 인연스킬:</span>
                                                            {targetBondSkills.map((bs: any) => (
                                                                <span key={bs.id} className="px-2 py-0.5 bg-purple-950/80 text-purple-300 border border-purple-800/80 rounded-md font-bold text-[10px] flex items-center gap-1">
                                                                    <Zap size={10} className="text-purple-400" /> {bs.name} (Lv.{bs.level || 1})
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Quick action button */}
                                                    {isEligible && (
                                                        <button
                                                            onClick={() => setIsBondSkillBookOpen(true)}
                                                            className="w-full py-1.5 bg-gradient-to-r from-pink-900/60 via-purple-900/50 to-pink-900/60 hover:from-pink-800/80 hover:to-purple-800/80 border border-pink-500/50 text-pink-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                                                        >
                                                            <Sparkles size={14} className="text-pink-300" />
                                                            <span>인연 스킬북 열기</span>
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                        <h4 className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                            <Users size={16} /> {isPlayerSelected ? '전체 인물 목록' : '사회적 관계망'}
                                        </h4>
                                        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                                            <button
                                                onClick={() => setViewMode('graph')}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                                    viewMode === 'graph' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                                                }`}
                                            >
                                                <GitBranch size={13} />
                                                <span>네트워크 그래프</span>
                                            </button>
                                            <button
                                                onClick={() => setViewMode('list')}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                                    viewMode === 'list' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                                                }`}
                                            >
                                                <LayoutGrid size={13} />
                                                <span>리스트 뷰</span>
                                            </button>
                                        </div>
                                    </div>

                                    {viewMode === 'graph' ? (
                                        <div className="space-y-4">
                                            {/* 그래프 제어 툴바: 필터 칩 & 줌 컨트롤 */}
                                            <div className="flex flex-col gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
                                                {/* 관계 필터 칩 */}
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1.5">인맥 필터 :</span>
                                                    {[
                                                        { id: 'all', label: '전체', count: relationList.length },
                                                        { id: 'romantic', label: '💕 연인/배우자', count: relationList.filter(r => r.type === RelationType.SPOUSE || r.type === RelationType.LOVER || r.type === RelationType.FLIRT).length },
                                                        { id: 'friendly', label: '🤝 친구/절친', count: relationList.filter(r => r.type === RelationType.BEST_FRIEND || r.type === RelationType.FRIEND).length },
                                                        { id: 'rival', label: '🔥 라이벌', count: relationList.filter(r => r.type === RelationType.RIVAL).length },
                                                        { id: 'conflict', label: '💀 갈등/원수', count: relationList.filter(r => r.type === RelationType.ENEMY || r.type === RelationType.CONFLICT).length },
                                                    ].map(chip => (
                                                        <button
                                                            key={chip.id}
                                                            onClick={() => setGraphFilter(chip.id as any)}
                                                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                                                                graphFilter === chip.id 
                                                                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/50' 
                                                                    : 'bg-slate-900/40 text-slate-400 border border-slate-800/60 hover:text-slate-300 hover:border-slate-700'
                                                            }`}
                                                        >
                                                            {chip.label} ({chip.count})
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* 범례 및 안내선 */}
                                                <div className="flex flex-col gap-2 pt-2 border-t border-slate-900/60">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold">
                                                            <div className="flex items-center gap-1"><span className="w-2 h-1 bg-pink-500 rounded-full"></span><span className="text-slate-400">연인</span></div>
                                                            <div className="flex items-center gap-1"><span className="w-2 h-1 bg-blue-400 rounded-full"></span><span className="text-slate-400">친구</span></div>
                                                            <div className="flex items-center gap-1"><span className="w-2 h-1 bg-amber-500 rounded-full"></span><span className="text-slate-400">라이벌</span></div>
                                                            <div className="flex items-center gap-1"><span className="w-2 h-1 bg-red-600 rounded-full"></span><span className="text-slate-400">적대</span></div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-slate-400">
                                                            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border border-indigo-500/60 bg-indigo-500/10"></span><span>내측 (핵심 인물)</span></div>
                                                            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border border-slate-700/60 bg-slate-700/10"></span><span>외측 (2단계 그룹)</span></div>
                                                        </div>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 italic flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                                                        <span>💡 드래그로 이동, 휠/버튼으로 확대/축소, 노드를 클릭해 해당 인물 관계 추적</span>
                                                        <span className="text-indigo-400 font-bold flex items-center gap-1">🎯 이중 클러스터링 모드 상시 활성화 됨</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 인터랙티브 줌 및 드래그 캔버스 */}
                                            {(() => {
                                                const filteredRelationList = relationList.filter(rel => {
                                                    if (graphFilter === 'all') return true;
                                                    if (graphFilter === 'romantic') {
                                                        return rel.type === RelationType.SPOUSE || rel.type === RelationType.LOVER || rel.type === RelationType.FLIRT;
                                                    }
                                                    if (graphFilter === 'friendly') {
                                                        return rel.type === RelationType.BEST_FRIEND || rel.type === RelationType.FRIEND;
                                                    }
                                                    if (graphFilter === 'conflict') {
                                                        return rel.type === RelationType.ENEMY || rel.type === RelationType.CONFLICT;
                                                    }
                                                    if (graphFilter === 'rival') {
                                                        return rel.type === RelationType.RIVAL;
                                                    }
                                                    return true;
                                                });

                                                // 1단계 핵심 세력 (배우자, 연인, 썸, 절친, 라이벌 또는 호감도 절대값 50 이상)
                                                const primaryRelations = filteredRelationList.filter(rel => {
                                                    return rel.type === RelationType.SPOUSE || 
                                                           rel.type === RelationType.LOVER || 
                                                           rel.type === RelationType.FLIRT || 
                                                           rel.type === RelationType.BEST_FRIEND || 
                                                           rel.type === RelationType.RIVAL ||
                                                           Math.abs(rel.affection) >= 50;
                                                });
                                                
                                                // 2단계 서브 세력 (그 외 인연들)
                                                const secondaryRelations = filteredRelationList.filter(rel => !primaryRelations.some(p => p.targetId === rel.targetId));

                                                const N_pri = primaryRelations.length;
                                                const N_sec = secondaryRelations.length;

                                                // 이중 궤도 좌표 계산 및 노드 크기 스케일 조절
                                                const mappedNodes = filteredRelationList.map(rel => {
                                                    const isPrimary = primaryRelations.some(p => p.targetId === rel.targetId);
                                                    let orbitR = 180;
                                                    let idx = 0;
                                                    let totalInOrbit = 1;
                                                    
                                                    if (isPrimary) {
                                                        orbitR = 100;
                                                        idx = primaryRelations.findIndex(p => p.targetId === rel.targetId);
                                                        totalInOrbit = N_pri;
                                                    } else {
                                                        orbitR = 185;
                                                        idx = secondaryRelations.findIndex(p => p.targetId === rel.targetId);
                                                        totalInOrbit = N_sec;
                                                    }
                                                    
                                                    // 고른 각 분산 및 오버랩 방지 오프셋 보정
                                                    const baseTheta = (idx * (2 * Math.PI) / (totalInOrbit || 1)) - (Math.PI / 2);
                                                    const offsetTheta = isPrimary ? baseTheta : baseTheta + (Math.PI / (totalInOrbit || 1) * 0.35);
                                                    
                                                    const tx = 250 + orbitR * Math.cos(offsetTheta);
                                                    const ty = 200 + orbitR * Math.sin(offsetTheta);
                                                    const nodeRad = isPrimary ? 18 : 13;
                                                    
                                                    return {
                                                        rel,
                                                        tx,
                                                        ty,
                                                        orbitR,
                                                        isPrimary,
                                                        nodeRad
                                                    };
                                                });

                                                const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
                                                    setIsDragging(true);
                                                    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
                                                };

                                                const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
                                                    if (!isDragging) return;
                                                    setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                                                };

                                                const handleMouseUpOrLeave = () => {
                                                    setIsDragging(false);
                                                };

                                                const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
                                                    if (e.touches[0]) {
                                                        setIsDragging(true);
                                                        setDragStart({ x: e.touches[0].clientX - panOffset.x, y: e.touches[0].clientY - panOffset.y });
                                                    }
                                                };

                                                const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
                                                    if (!isDragging || !e.touches[0]) return;
                                                    setPanOffset({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
                                                };

                                                const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
                                                    e.preventDefault();
                                                    const zoomFactor = 0.05;
                                                    const newScale = e.deltaY < 0 
                                                        ? Math.min(zoomScale + zoomFactor, 3.0) 
                                                        : Math.max(zoomScale - zoomFactor, 0.4);
                                                    setZoomScale(newScale);
                                                };

                                                return (
                                                    <div className="relative bg-slate-950/40 border border-slate-800/80 rounded-3xl p-4 flex items-center justify-center overflow-hidden shadow-inner group">
                                                        {/* 줌/이동 콘트롤러 */}
                                                        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl shadow-lg">
                                                            <button
                                                                onClick={() => setZoomScale(prev => Math.min(prev + 0.15, 3.0))}
                                                                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold flex items-center justify-center transition-colors border border-slate-700"
                                                                title="확대"
                                                            >
                                                                +
                                                            </button>
                                                            <button
                                                                onClick={() => setZoomScale(prev => Math.max(prev - 0.15, 0.4))}
                                                                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold flex items-center justify-center transition-colors border border-slate-700"
                                                                title="축소"
                                                            >
                                                                -
                                                            </button>
                                                            <button
                                                                onClick={() => { setZoomScale(1.0); setPanOffset({ x: 0, y: 0 }); }}
                                                                className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center transition-colors border border-indigo-500"
                                                                title="초기화"
                                                            >
                                                                1:1
                                                            </button>
                                                        </div>

                                                        {/* 드래그 유도 가이드 오버레이 */}
                                                        <div className="absolute top-4 left-4 text-[10px] text-slate-500 bg-slate-950/80 px-2 py-1 rounded-md border border-slate-900 flex items-center gap-1 pointer-events-none">
                                                            <span>🔍 줌 배율: {Math.round(zoomScale * 100)}%</span>
                                                            {(panOffset.x !== 0 || panOffset.y !== 0) && <span className="text-indigo-400 font-bold">• 드래그 이동 됨</span>}
                                                        </div>

                                                        <svg 
                                                            viewBox="0 0 500 400" 
                                                            className={`w-full max-w-2xl h-[330px] md:h-[400px] select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                                                            onMouseDown={handleMouseDown}
                                                            onMouseMove={handleMouseMove}
                                                            onMouseUp={handleMouseUpOrLeave}
                                                            onMouseLeave={handleMouseUpOrLeave}
                                                            onTouchStart={handleTouchStart}
                                                            onTouchMove={handleTouchMove}
                                                            onTouchEnd={handleMouseUpOrLeave}
                                                            onWheel={handleWheel}
                                                        >
                                                            <defs>
                                                                <clipPath id="center-avatar-clip">
                                                                    <circle cx="250" cy="200" r="26" />
                                                                </clipPath>
                                                                {mappedNodes.map(node => (
                                                                    <clipPath key={`clip-graph-${node.rel.targetId}`} id={`clip-graph-${node.rel.targetId}`}>
                                                                        <circle cx="0" cy="0" r={node.nodeRad} />
                                                                    </clipPath>
                                                                ))}
                                                            </defs>

                                                            {/* 줌 & 팬 트랜스폼 컨테이너 */}
                                                            <g transform={`translate(${panOffset.x}, ${panOffset.y}) translate(250, 200) scale(${zoomScale}) translate(-250, -200)`}>
                                                                
                                                                {/* 가상 궤도 서클 (이중 구조) */}
                                                                {N_pri > 0 && (
                                                                    <circle cx="250" cy="200" r="100" fill="none" stroke="#6366f1" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                                                                )}
                                                                {N_sec > 0 && (
                                                                    <circle cx="250" cy="200" r="185" fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" opacity="0.2" />
                                                                )}

                                                                {/* 관계 선 그리기 */}
                                                                {mappedNodes.map((node) => {
                                                                    const rel = node.rel;
                                                                    const tx = node.tx;
                                                                    const ty = node.ty;

                                                                    let strokeColor = '#475569';
                                                                    let isDashed = false;
                                                                    let textColor = '#cbd5e1';

                                                                    if (rel.type === RelationType.SPOUSE || rel.type === RelationType.LOVER || rel.type === RelationType.FLIRT) {
                                                                        strokeColor = '#ec4899';
                                                                        textColor = '#f472b6';
                                                                    } else if (rel.type === RelationType.SIBLING) {
                                                                        strokeColor = '#10b981';
                                                                        textColor = '#34d399';
                                                                    } else if (rel.type === RelationType.BEST_FRIEND || rel.type === RelationType.FRIEND) {
                                                                        strokeColor = '#38bdf8';
                                                                        textColor = '#38bdf8';
                                                                    } else if (rel.type === RelationType.RIVAL) {
                                                                        strokeColor = '#f59e0b';
                                                                        textColor = '#f59e0b';
                                                                    } else if (rel.type === RelationType.ENEMY || rel.type === RelationType.CONFLICT) {
                                                                        strokeColor = '#dc2626';
                                                                        textColor = '#ef4444';
                                                                        isDashed = true;
                                                                    }

                                                                    const mx = (250 + tx) / 2;
                                                                    const my = (200 + ty) / 2;

                                                                    return (
                                                                        <g key={`link-${rel.targetId}`}>
                                                                            <line
                                                                                x1="250"
                                                                                y1="200"
                                                                                x2={tx}
                                                                                y2={ty}
                                                                                stroke={strokeColor}
                                                                                strokeWidth={node.isPrimary ? (rel.type === RelationType.SPOUSE || rel.type === RelationType.LOVER ? 3 : 1.8) : 1.0}
                                                                                strokeDasharray={isDashed ? "3 3" : undefined}
                                                                                opacity={node.isPrimary ? "0.75" : "0.4"}
                                                                                className="transition-all duration-300"
                                                                            />
                                                                            <g>
                                                                                <rect
                                                                                    x={mx - 14}
                                                                                    y={my - 5}
                                                                                    width="28"
                                                                                    height="10"
                                                                                    rx="5"
                                                                                    fill="#020617"
                                                                                    stroke={strokeColor}
                                                                                    strokeWidth="0.5"
                                                                                    opacity={node.isPrimary ? "0.9" : "0.75"}
                                                                                />
                                                                                <text
                                                                                    x={mx}
                                                                                    y={my + 2.5}
                                                                                    textAnchor="middle"
                                                                                    fontSize="6.5"
                                                                                    fill={textColor}
                                                                                    fontWeight="bold"
                                                                                    className="font-mono"
                                                                                >
                                                                                    {rel.affection > 0 ? `+${rel.affection}` : rel.affection}
                                                                                </text>
                                                                            </g>
                                                                        </g>
                                                                    );
                                                                })}

                                                                {/* 관계 타겟 노드 그리기 */}
                                                                {mappedNodes.map((node) => {
                                                                    const rel = node.rel;
                                                                    const tx = node.tx;
                                                                    const ty = node.ty;
                                                                    const nodeRadius = node.nodeRad;
                                                                    const avatarSize = nodeRadius * 2;
                                                                    const avatarOffset = -nodeRadius;

                                                                    const target = allKnownPeople.find(ac => ac.id === rel.targetId);
                                                                    if (!target) return null;

                                                                    let color = '#64748b';
                                                                    if (rel.type === RelationType.SPOUSE || rel.type === RelationType.LOVER || rel.type === RelationType.FLIRT) {
                                                                        color = '#ec4899';
                                                                    } else if (rel.type === RelationType.SIBLING) {
                                                                        color = '#10b981';
                                                                    } else if (rel.type === RelationType.BEST_FRIEND || rel.type === RelationType.FRIEND) {
                                                                        color = '#38bdf8';
                                                                    } else if (rel.type === RelationType.RIVAL) {
                                                                        color = '#f59e0b';
                                                                    } else if (rel.type === RelationType.ENEMY || rel.type === RelationType.CONFLICT) {
                                                                        color = '#dc2626';
                                                                    }

                                                                    return (
                                                                        <g
                                                                            key={`node-${rel.targetId}`}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedId(rel.targetId);
                                                                            }}
                                                                            className="cursor-pointer group animate-fade-in"
                                                                        >
                                                                            <title>{target.name}{getPersonAgeText(target) ? ` (${getPersonAgeText(target)})` : ''}</title>
                                                                            <circle
                                                                                cx={tx}
                                                                                cy={ty}
                                                                                r={nodeRadius + (node.isPrimary ? 4 : 3)}
                                                                                fill={color}
                                                                                opacity="0"
                                                                                className="group-hover:opacity-20 transition-all duration-200"
                                                                            />
                                                                            <g transform={`translate(${tx}, ${ty})`}>
                                                                                <circle cx="0" cy="0" r={nodeRadius} fill="#111827" stroke={color} strokeWidth={node.isPrimary ? "1.5" : "1.0"} className="group-hover:stroke-white transition-colors duration-200" />
                                                                                {target.visualUrl ? (
                                                                                    <image
                                                                                        href={target.visualUrl}
                                                                                        x={avatarOffset}
                                                                                        y={avatarOffset}
                                                                                        width={avatarSize}
                                                                                        height={avatarSize}
                                                                                        clipPath={`url(#clip-graph-${rel.targetId})`}
                                                                                    />
                                                                                ) : (
                                                                                    <text x="0" y="3.5" textAnchor="middle" fontSize={node.isPrimary ? "12" : "10"}>👤</text>
                                                                                )}
                                                                            </g>
                                                                            <circle
                                                                                cx={tx}
                                                                                cy={ty}
                                                                                r={nodeRadius}
                                                                                fill="none"
                                                                                stroke={color}
                                                                                strokeWidth={node.isPrimary ? "1.5" : "1.0"}
                                                                                className="group-hover:stroke-white transition-colors duration-200"
                                                                            />
                                                                            
                                                                            <g transform={`translate(${tx}, ${ty + nodeRadius + (node.isPrimary ? 9 : 7)})`}>
                                                                                <rect
                                                                                    x={node.isPrimary ? "-26" : "-20"}
                                                                                    y="-5"
                                                                                    width={node.isPrimary ? "52" : "40"}
                                                                                    height={node.isPrimary ? "11" : "9"}
                                                                                    rx="3"
                                                                                    fill="#020617"
                                                                                    stroke={color}
                                                                                    strokeWidth="0.5"
                                                                                    opacity={node.isPrimary ? "0.9" : "0.75"}
                                                                                />
                                                                                <text
                                                                                    x="0"
                                                                                    y={node.isPrimary ? "2" : "1.5"}
                                                                                    textAnchor="middle"
                                                                                    fontSize={node.isPrimary ? "6.5" : "5.5"}
                                                                                    fill="#f1f5f9"
                                                                                    fontWeight="bold"
                                                                                >
                                                                                    {target.name.length > 5 ? `${target.name.slice(0, 4)}..` : target.name}
                                                                                </text>
                                                                            </g>
                                                                        </g>
                                                                    );
                                                                })}

                                                                {/* 중앙 노드 (주인공) */}
                                                                <g className="filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]">
                                                                    <circle
                                                                        cx="250"
                                                                        cy="200"
                                                                        r="32"
                                                                        fill="none"
                                                                        stroke={isPlayerSelected ? '#eab308' : '#6366f1'}
                                                                        strokeWidth="1.5"
                                                                        opacity="0.3"
                                                                        className="animate-ping"
                                                                        style={{ transformOrigin: '250px 200px', animationDuration: '3.5s' }}
                                                                    />
                                                                    
                                                                    <circle
                                                                        cx="250"
                                                                        cy="200"
                                                                        r="28"
                                                                        fill="#0f172a"
                                                                        stroke={isPlayerSelected ? '#eab308' : '#6366f1'}
                                                                        strokeWidth="2.5"
                                                                    />
                                                                    
                                                                    {isPlayerSelected ? (
                                                                        character.visualUrl ? (
                                                                            <image
                                                                                href={character.visualUrl}
                                                                                x="222"
                                                                                y="172"
                                                                                width="56"
                                                                                height="56"
                                                                                clipPath="url(#center-avatar-clip)"
                                                                            />
                                                                        ) : (
                                                                            <text x="250" y="208" textAnchor="middle" fontSize="22">👑</text>
                                                                        )
                                                                    ) : (
                                                                        activeTarget?.visualUrl ? (
                                                                            <image
                                                                                href={activeTarget.visualUrl}
                                                                                x="222"
                                                                                y="172"
                                                                                width="56"
                                                                                height="56"
                                                                                clipPath="url(#center-avatar-clip)"
                                                                            />
                                                                        ) : (
                                                                            <text x="250" y="208" textAnchor="middle" fontSize="22">👤</text>
                                                                        )
                                                                    )}

                                                                    <g transform="translate(250, 238)">
                                                                        <rect
                                                                            x="-36"
                                                                            y="-7"
                                                                            width="72"
                                                                            height="14"
                                                                            rx="3"
                                                                            fill="#020617"
                                                                            stroke={isPlayerSelected ? '#eab308' : '#6366f1'}
                                                                            strokeWidth="1"
                                                                            opacity="0.95"
                                                                        />
                                                                        <text
                                                                            x="0"
                                                                            y="3"
                                                                            textAnchor="middle"
                                                                            fontSize="8"
                                                                            fill="#f8fafc"
                                                                            fontWeight="bold"
                                                                        >
                                                                            {isPlayerSelected ? character.name : activeTarget?.name}
                                                                        </text>
                                                                    </g>
                                                                </g>
                                                            </g>
                                                        </svg>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    ) : (
                                        /* 기존 리스트 보기 */
                                        <div className="grid grid-cols-1 gap-4">
                                            {relationList.length > 0 ? relationList.map(rel => {
                                                const target = allKnownPeople.find(ac => ac.id === rel.targetId);
                                                if (!target) return null;
                                                const isFateBond = rel.type === RelationType.LOVER || rel.type === RelationType.SPOUSE;
                                                const style = RELATION_STYLE[rel.type];
                                                const RelIcon = style.icon;
                                                const isNpcTarget = interactedNpcs.some(n => n.id === target.id) || pastNpcs.some(n => n.id === target.id) || (character.socialNetwork || []).some(n => n.id === target.id);
                                                const isPurgedTarget = target.isPurged;
                                                const showBondEffect = !isNpcTarget && !isPlayerSelected && !isPurgedTarget && target.id !== 'player';

                                                return (
                                                    <div key={rel.targetId} onClick={() => setSelectedId(rel.targetId)} className={`p-4 rounded-2xl border cursor-pointer hover:border-indigo-500/60 transition-all ${isFateBond ? 'bg-pink-900/10 border-pink-500/50 shadow-lg' : isPurgedTarget ? 'bg-slate-950 border-slate-900 opacity-60' : `${style.bg} border-white/5`} flex flex-col md:flex-row items-center justify-between gap-6 group relative overflow-hidden`}>
                                                        <div className="flex items-center gap-4 w-full md:w-auto">
                                                            <div className={`w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-lg relative overflow-hidden ${rel.type === RelationType.ENEMY ? 'border-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]' : ''} ${isPurgedTarget ? 'grayscale' : ''}`}>
                                                                {target.visualUrl ? (
                                                                    <img src={target.visualUrl} alt={target.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                                ) : (
                                                                    isPurgedTarget ? <Skull size={20} className="text-slate-600"/> : isNpcTarget ? '👤' : '👥'
                                                                )}
                                                                {isFateBond && !isPurgedTarget && <Heart size={12} className="absolute -top-1 -right-1 text-pink-500 fill-pink-500 animate-bounce" />}
                                                                {rel.type === RelationType.ENEMY && !isPurgedTarget && <Skull size={12} className="absolute -top-1 -right-1 text-red-600 animate-pulse" />}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className={`text-sm font-bold flex items-center gap-2 flex-wrap ${isPurgedTarget ? 'text-slate-500' : 'text-white'}`}>
                                                                    {target.name}
                                                                    {getPersonAgeText(target) && (
                                                                        <span className="text-[10px] text-emerald-400 font-semibold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40">
                                                                            {getPersonAgeText(target)}
                                                                        </span>
                                                                    )}
                                                                    {target.id === 'player' && (<span className="text-[8px] bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-700/50 font-semibold">주인공</span>)}
                                                                    {interactedNpcs.some(n => n.id === target.id) && !isPurgedTarget && <span className="text-[8px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-slate-700 font-normal">외부인</span>}
                                                                    {pastNpcs.some(n => n.id === target.id) && <span className="text-[8px] bg-purple-900/30 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/50 font-normal">과거</span>}
                                                                    {!pastNpcs.some(n => n.id === target.id) && !interactedNpcs.some(n => n.id === target.id) && !allComps.some(c => c.id === target.id) && target.id !== 'player' && !isPurgedTarget && (
                                                                        <span className="text-[8px] bg-indigo-950/80 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-700/50 font-semibold">동료의 지인</span>
                                                                    )}
                                                                    {isPurgedTarget && <span className="text-[8px] bg-red-950 text-red-500 px-1.5 py-0.5 rounded border border-red-900 font-bold">고인</span>}
                                                                </div>
                                                                <div className={`text-[10px] font-bold flex items-center gap-1 ${isPurgedTarget ? 'text-slate-600' : style.color}`}><RelIcon size={10} /> {style.label} (호감 {rel.affection})</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 w-full md:w-auto shrink-0">
                                                            {!isPlayerSelected && !isNpcTarget && !isPurgedTarget && (rel.type === RelationType.CONFLICT || rel.type === RelationType.ENEMY) && (
                                                                <button onClick={(e) => { e.stopPropagation(); handleMediate(target as Companion, 'RECONCILE'); }} disabled={isMediating} className="flex-1 md:flex-none px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all">{isMediating ? <Loader2 size={14} className="animate-spin"/> : <Handshake size={14}/>} 화해 중재 (1일)</button>
                                                            )}
                                                            {!isPlayerSelected && !isNpcTarget && !isPurgedTarget && rel.type === RelationType.RIVAL && (
                                                                <button onClick={(e) => { e.stopPropagation(); handleMediate(target as Companion, 'JOINT_TRAIN'); }} disabled={isMediating} className="flex-1 md:flex-none px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all">{isMediating ? <Loader2 size={14} className="animate-spin"/> : <Dumbbell size={14}/>} 합동 훈련 (1일)</button>
                                                            )}
                                                            {showBondEffect && (
                                                                <div className="text-right min-w-[80px]">
                                                                    <div className="text-[9px] text-slate-500 uppercase font-bold">인연 효과</div>
                                                                    <div className={`text-[10px] font-bold ${isFateBond ? 'text-pink-400' : (rel.type === RelationType.SIBLING && (rel.affection ?? 75) <= 30) ? 'text-slate-500' : rel.type === RelationType.SIBLING ? 'text-emerald-400' : (rel.type === RelationType.CONFLICT || rel.type === RelationType.ENEMY) ? 'text-red-500' : 'text-green-400'}`}>
                                                                        {rel.type === RelationType.RIVAL ? 'ATK +10%' : rel.type === RelationType.LOVER ? 'ATK +8%' : rel.type === RelationType.SPOUSE ? 'ALL +8%' : rel.type === RelationType.SIBLING ? ((rel.affection ?? 75) <= 30 ? '효과 없음 (소원함)' : rel.isHalf ? 'ALL +2.5% (이복/이부)' : 'ALL +6% (친)') : rel.type === RelationType.BEST_FRIEND ? 'ALL +5%' : (rel.type === RelationType.CONFLICT || rel.type === RelationType.ENEMY) ? 'DEF -10%' : '정상'}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }) : <p className="text-center py-10 text-slate-700 italic">기록된 인연이 없습니다.</p>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 gap-4"><Users size={64} /><p className="text-sm">대상을 선택하십시오.</p></div>}
                    </div>
                </div>
            </div>

            {/* 약속 잡기 모달 */}
            {isAppointmentModalOpen && activeTarget && (
                <AppointmentModal
                    character={character}
                    target={activeTarget}
                    isOpen={isAppointmentModalOpen}
                    onClose={() => setIsAppointmentModalOpen(false)}
                    onUpdateCharacter={(updater) => {
                        const updatedChar = updater(character);
                        onUpdateCharacter(updatedChar, `${activeTarget.name}님과의 약속 일정이 등록되었습니다.`);
                    }}
                    initialType={appointmentModalType}
                />
            )}
        </div>
    );
};

export default SocialNetworkModal;
