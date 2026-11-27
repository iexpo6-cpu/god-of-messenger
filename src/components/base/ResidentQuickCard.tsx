import React, { useMemo, useState } from 'react';
import { Character, ClassTier, Companion, ItemRarity, JobType, RelationType, SkillType } from '../../types';
import { MAX_PARTY_SIZE } from '../../constants';
import { BaseResidentEntity } from '../../services/baseTilemapEngine';
import { hasDimensionalLeapSkill } from '../../services/travelCalculationService';
import { areSiblings } from '../../services/siblingService';
import { advanceGameTime, applyRestHealing } from '../../services/gameTimeService';
import { addDays } from '../../utils';
import { FlaskConical, Gift, Hammer, Heart, MessageCircle, Moon, Sparkles, UserPlus, Users, X } from 'lucide-react';

interface ResidentQuickCardProps {
    resident: BaseResidentEntity;
    character: Character;
    facilityType?: string;
    onCommissionBlacksmith?: (blacksmithId: string) => void;
    onCommissionAlchemist?: (alchemistId: string) => void;
    onUpdateCharacter?: (updatedChar: Character, logMessage: string) => void;
    onInspectCompanion?: (companionId: string) => void;
    onClose: () => void;
}

interface QuickChatOption {
    id: string;
    label: string;
    tag: string;
    affectionGain: number;
    loyaltyGain?: number;
    reply: string;
}

type QuickChatRelationKind = 'spouse' | 'lover' | 'sibling' | 'family' | 'general';

const getQuickChatOptions = (
    comp: Companion,
    playerName: string,
    relationKind: QuickChatRelationKind,
    isSameGender: boolean
): QuickChatOption[] => {
    const aff = comp.affection || 0;
    const job = String(comp.job || comp.classType || '');
    const options: QuickChatOption[] = [];

    // 1. 관계 및 성별·친밀도에 따른 1번 대화
    if (relationKind === 'spouse') {
        options.push({
            id: 'spouse_greet',
            label: '💍 다정하게 서로의 하루 나누기',
            tag: '배우자',
            affectionGain: 2,
            loyaltyGain: 2,
            reply: `${playerName}님, 오늘도 무사히 돌아와 줘서 고마워요. 당신과 함께하는 이 기지가 가장 따뜻한 집이에요.`
        });
    } else if (relationKind === 'lover') {
        options.push({
            id: 'lover_greet',
            label: '💕 다정하게 안부 묻기',
            tag: '연인',
            affectionGain: 2,
            loyaltyGain: 1,
            reply: `${playerName}님, 얼굴 보니까 피로가 싹 풀려요. 오늘도 곁에 있어 줘서 고마워요.`
        });
    } else if (relationKind === 'sibling') {
        options.push({
            id: 'sibling_greet',
            label: isSameGender ? '🤜 동성 형제/자매끼리 장난치며 인사하기' : '🌿 남매/형제끼리 편하게 안부 묻기',
            tag: '혈육',
            affectionGain: 2,
            loyaltyGain: 1,
            reply: isSameGender
                ? `어이 ${playerName}, 오늘도 고생 많네! 우리 집안 체면 세우려면 밥은 꼭 챙겨 먹으라고.`
                : `${playerName}, 별일 없지? 가족끼리 너무 무리하지 말고 힘들면 언제든 말해.`
        });
    } else if (relationKind === 'family') {
        options.push({
            id: 'family_greet',
            label: '🏡 가족의 정을 나누며 인사하기',
            tag: '가족',
            affectionGain: 2,
            loyaltyGain: 1,
            reply: `${playerName}님, 오늘 기지 생활은 어떠신가요? 언제나 건강이 최우선입니다.`
        });
    } else if (aff >= 70) {
        options.push({
            id: 'close_greet',
            label: isSameGender ? '🤜 절친답게 어깨 두드리며 인사하기' : '😊 신뢰 어린 표정으로 일상 수다 떨기',
            tag: isSameGender ? '절친' : '신뢰',
            affectionGain: 2,
            loyaltyGain: 1,
            reply: isSameGender
                ? `야 ${playerName}! 마침 찾고 있었는데 잘 왔다. 오늘 끝나고 한잔이라도 할까?`
                : `${playerName}님! 마침 생각하고 있었는데 잘 오셨어요. 오늘 기지 분위기가 아주 좋네요.`
        });
    } else if (aff >= 30) {
        options.push({
            id: 'friend_greet',
            label: '👋 오늘 컨디션 묻기',
            tag: '우호',
            affectionGain: 1,
            loyaltyGain: 1,
            reply: `덕분에 거뜬합니다, ${playerName}님! 같이 일하다 보니 요즘 기지가 제 집처럼 편하네요.`
        });
    } else {
        options.push({
            id: 'formal_greet',
            label: '🤝 예의 바르게 인사하기',
            tag: '기본',
            affectionGain: 1,
            reply: `안녕하세요, ${playerName}님. 맡겨주신 일은 차질 없이 진행하고 있습니다.`
        });
    }

    // 2. 직업별 특화 대화 선택지 (기존 유지)
    if (job.includes('대장장이') || job === JobType.BLACKSMITH) {
        options.push({
            id: 'job_blacksmith',
            label: '🔨 화로와 장비 제련 이야기하기',
            tag: '직업',
            affectionGain: 2,
            reply: `불꽃 온도가 딱 좋아요! ${playerName}님 장비도 필요하면 언제든 날을 세워 드릴게요.`
        });
    } else if (job.includes('연금술사') || job === JobType.ALCHEMIST) {
        options.push({
            id: 'job_alchemy',
            label: '⚗️ 새 비약과 약초 배합 묻기',
            tag: '직업',
            affectionGain: 2,
            reply: `방금 마정석 순도를 끌어올리는 새 배합을 시험 중이었어요. 다음엔 더 좋은 물약을 만들어 드릴게요!`
        });
    } else if (job.includes('농부') || job === JobType.FARMER) {
        options.push({
            id: 'job_farmer',
            label: '🌾 작물 작황과 밭 상태 살피기',
            tag: '직업',
            affectionGain: 2,
            reply: `햇볕이 좋아서 이번 수확도 풍년일 거예요! 기지 식량 걱정은 붙들어 매세요.`
        });
    } else if (job.includes('광부') || job === JobType.MINER) {
        options.push({
            id: 'job_miner',
            label: '⛏️ 광맥과 희귀 광석 얘기하기',
            tag: '직업',
            affectionGain: 2,
            reply: `안쪽 갱도에서 단단한 철광맥을 새로 찾았어요! 힘쓰는 일이라면 자신 있습니다.`
        });
    } else if (job.includes('요리사') || job === JobType.CHEF) {
        options.push({
            id: 'job_chef',
            label: '🍲 오늘 특식 메뉴 물어보기',
            tag: '직업',
            affectionGain: 2,
            reply: `${playerName}님이 좋아하시는 따끈한 스튜를 끓이고 있어요. 이따 꼭 드시러 오세요!`
        });
    } else if (job.includes('사육사') || job === JobType.BREEDER) {
        options.push({
            id: 'job_breeder',
            label: '🐾 목장 마수들 상태 묻기',
            tag: '직업',
            affectionGain: 2,
            reply: `아이들이 요즘 밥도 잘 먹고 아주 건강해요. ${playerName}님 손길을 기다리는 녀석도 있답니다!`
        });
    } else if (job.includes('용병') || job.includes('군인') || job.includes('모험가') || job.includes('트레이너')) {
        options.push({
            id: 'job_combat',
            label: '⚔️ 전술과 실전 대련 이야기하기',
            tag: '직업',
            affectionGain: 2,
            loyaltyGain: 1,
            reply: `언제든 출격할 준비가 되어 있습니다! 다음 전투에서도 ${playerName}님의 등은 제가 지키죠.`
        });
    } else {
        options.push({
            id: 'job_general',
            label: '☕ 잠시 차 마시며 기지 이야기하기',
            tag: '일상',
            affectionGain: 2,
            reply: `바쁜 와중에도 이렇게 말 걸어 주시니 힘이 나네요. 잠깐 쉬면서 숨 좀 돌리세요!`
        });
    }

    // 3. 관계 & 친밀도 기반 심화 대화 선택지 (연인/배우자 전용 vs 형제/절친/일반 동료 구분)
    if (relationKind === 'spouse' || relationKind === 'lover') {
        options.push({
            id: 'deep_romance',
            label: relationKind === 'spouse' ? '💖 반려자로서 깊은 애정 표현하기' : '💖 둘만의 미래 약속하기',
            tag: relationKind === 'spouse' ? '배우자 심화' : '연인 심화',
            affectionGain: 3,
            loyaltyGain: 2,
            reply: `어떤 시련이 와도 ${playerName}님과 함께라면 두렵지 않아요. 앞으로도 영원히 함께해요.`
        });
    } else if (relationKind === 'sibling') {
        options.push({
            id: 'deep_sibling',
            label: '🛡️ 서로의 등을 맡기는 혈육의 맹세 나누기',
            tag: '혈육 심화',
            affectionGain: 2,
            loyaltyGain: 2,
            reply: `피는 못 속이지. 무슨 일이 생겨도 네 편은 내가 제일 먼저 들어줄게!`
        });
    } else if (aff >= 50) {
        options.push({
            id: 'deep_ally',
            label: isSameGender ? '🔥 동성 전우로서 진솔한 각오 나누기' : '🌟 신뢰하는 동료로서 앞으로의 목표 나누기',
            tag: '친밀도 50+',
            affectionGain: 3,
            loyaltyGain: 2,
            reply: isSameGender
                ? `우리가 마음을 합치면 못 넘을 벽이 없지! 끝까지 같이 가자고, ${playerName}!`
                : `${playerName}님과 함께 걸어온 길에 후회는 없어요. 앞으로도 믿고 따르겠습니다!`
        });
    }

    return options;
};

const RARITY_AFFECTION_GAINS: Record<string, number> = {
    [ItemRarity.NORMAL]: 1,
    [ItemRarity.MAGIC]: 2,
    [ItemRarity.RARE]: 5,
    [ItemRarity.EPIC]: 10,
    [ItemRarity.UNIQUE]: 20,
    [ItemRarity.LEGENDARY]: 30,
    [ItemRarity.MYTHTIC]: 50
};

const ResidentQuickCard: React.FC<ResidentQuickCardProps> = ({
    resident,
    character,
    facilityType,
    onCommissionBlacksmith,
    onCommissionAlchemist,
    onUpdateCharacter,
    onInspectCompanion,
    onClose
}) => {
    const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
    const [showChatChoices, setShowChatChoices] = useState(false);
    const [showGiftMenu, setShowGiftMenu] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const isDimensionalSage = resident.id === 'npc_dimensional_sage';
    const hasDimensionalLeap = hasDimensionalLeapSkill(character);

    if (isDimensionalSage) {
        const handleLearnDimensionalLeap = () => {
            if (!onUpdateCharacter || hasDimensionalLeap) return;
            const nextSkills = [
                ...(character.skills || []),
                {
                    id: 'skill_dimensional_leap',
                    name: '차원 도약',
                    tier: ClassTier.LAST,
                    type: SkillType.TELEPORT,
                    targetType: 'self' as any,
                    mpCost: 100,
                    baseMpCost: 100,
                    level: 1,
                    maxLevel: 10,
                    currentMastery: 0,
                    effectFormula: '차원의 경계를 넘어 신계와 인간계를 자유롭게 오가는 초월 이동 비기',
                    description: '차원의 경계를 넘어 신계로 진입하거나 신계 내부를 이동할 때 사용하는 초월 이동 스킬입니다. (Map 모달 신계 차원 도약 해금)'
                }
            ];
            onUpdateCharacter(
                { ...character, skills: nextSkills },
                '[차원 현자 아스트라] 초월 이동 비기 [차원 도약]을 전수받았습니다! 이제 Map 모달에서 신계 차원 도약을 사용할 수 있습니다.'
            );
            setFeedbackMsg('✨ [차원 도약] 스킬을 습득했습니다! 이제 신계로 차원 도약할 수 있습니다.');
        };

        return (
            <div className="fixed bottom-4 right-4 z-[90] w-[92vw] max-w-sm bg-slate-950/95 border-2 border-amber-400/70 rounded-2xl shadow-2xl p-4 space-y-3 animate-in slide-in-from-bottom-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300">
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-amber-200">{resident.name}</h4>
                            <p className="text-[11px] text-indigo-300 font-bold">{resident.role}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                        <X size={16} />
                    </button>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                    {hasDimensionalLeap
                        ? `"${character.name}, 그대는 이미 [차원 도약]의 이치를 깨우쳤소. 언제든 세계 지도(Map)에서 신계로 차원 도약할 수 있을 것이오."`
                        : `"라스트 클래스와 500레벨의 경지에 오른 자여, 내 그대에게 신계와 인간계를 잇는 초월 이동 비기 [차원 도약]을 전수하러 왔소."`}
                </p>
                {feedbackMsg && (
                    <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-xs text-emerald-200 font-bold">
                        {feedbackMsg}
                    </div>
                )}
                <div className="flex gap-2">
                    {!hasDimensionalLeap && (
                        <button
                            onClick={handleLearnDimensionalLeap}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-black text-xs shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            <Sparkles size={14} />
                            <span>차원 도약 스킬 배우기</span>
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                    >
                        닫기
                    </button>
                </div>
            </div>
        );
    }

    const isInActiveParty = character.companions.some(c => c.id === resident.id);
    const liveComp: Companion =
        character.companions.find(c => c.id === resident.id) ||
        character.inactiveCompanions?.find(c => c.id === resident.id) ||
        resident.companionRef;

    const isBlacksmithHere =
        Boolean(onCommissionBlacksmith) &&
        (facilityType === 'workshop' || facilityType === 'forge' || liveComp.job === JobType.BLACKSMITH);
    const isAlchemistHere =
        Boolean(onCommissionAlchemist) &&
        (facilityType === 'alchemy' || liveComp.job === JobType.ALCHEMIST);

    const busyReason = useMemo(() => {
        const base = character.base;
        if (!base) return null;
        if (base.dispatched?.some(m => m.companionId === resident.id || (m as any).participants?.includes(resident.id))) {
            return '파견 임무 수행 중';
        }
        if (character.mercenaryData?.groupMissions?.some(m => m.memberIds.includes(resident.id))) {
            return '용병단 임무 수행 중';
        }
        if (
            Object.values(base.assignments || {}).includes(resident.id) ||
            Object.values(base.multiAssignments || {}).some(list => list.includes(resident.id))
        ) {
            return '기지 시설 담당 근무 중';
        }
        if (base.houses?.some(h => h.assignedChefId === resident.id)) {
            return '숙소 전담 셰프 근무 중';
        }
        if (base.houses?.some(h => h.assignedHousekeeperId === resident.id)) {
            return '숙소 하우스키퍼 근무 중';
        }
        if ((base as any).trainingSlots?.some((t: any) => t?.companionId === resident.id || t?.targetId === resident.id)) {
            return '훈련소 훈련 진행 중';
        }
        return null;
    }, [character.base, character.mercenaryData, resident.id]);

    const isPartyFull = character.companions.length >= MAX_PARTY_SIZE;

    const giftableItems = useMemo(() => {
        return (character.inventory || [])
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item && (item.type as string) !== 'key_item' && !(item as any).isQuestItem)
            .slice(0, 12);
    }, [character.inventory]);

    const updateCompanionInChar = (
        mutator: (comp: Companion, draft: Character) => string | null,
        fallbackLog: string
    ) => {
        if (!onUpdateCharacter) return;
        const draft: Character = JSON.parse(JSON.stringify(character));
        let target = draft.companions.find(c => c.id === resident.id);
        if (!target && draft.inactiveCompanions) {
            target = draft.inactiveCompanions.find(c => c.id === resident.id);
        }
        if (!target) return;
        const customLog = mutator(target, draft);
        onUpdateCharacter(draft, customLog || fallbackLog);
    };

    const todayDateStr = character.currentDate || '1026-01-01';
    const hasChattedToday = (liveComp as any).lastQuickChatDate === todayDateStr;
    const isSpouse = Boolean(
        liveComp.relation === RelationType.SPOUSE ||
        liveComp.relations?.['player']?.type === RelationType.SPOUSE ||
        (liveComp as any).isSpouse
    );
    const isLover = Boolean(
        !isSpouse &&
        (liveComp.relation === RelationType.LOVER ||
            liveComp.relations?.['player']?.type === RelationType.LOVER ||
            (liveComp as any).isLover)
    );
    const isSibling = Boolean(
        liveComp.relation === RelationType.SIBLING ||
        liveComp.relations?.['player']?.type === RelationType.SIBLING ||
        areSiblings(character, liveComp, character)
    );
    const isFamily = Boolean(
        liveComp.relation === RelationType.PARENT ||
        liveComp.relation === RelationType.CHILD ||
        liveComp.relations?.['player']?.type === RelationType.PARENT ||
        liveComp.relations?.['player']?.type === RelationType.CHILD ||
        liveComp.classType?.includes('자녀') ||
        liveComp.classType?.includes('Child')
    );
    const relationKind: QuickChatRelationKind = isSpouse
        ? 'spouse'
        : isLover
            ? 'lover'
            : isSibling
                ? 'sibling'
                : isFamily
                    ? 'family'
                    : 'general';
    const isSameGender = Boolean(character.gender && liveComp.gender && character.gender === liveComp.gender);
    const canConfess = !isSpouse && !isLover && !isSibling && !isFamily && (liveComp.affection || 0) >= 70;
    const isInHousing = facilityType === 'housing';
    const canOfferSleep = isInHousing && (isLover || isSpouse);

    const isFemaleGender = (g?: string) => g === '여성' || g === '여자' || g === 'female' || g === 'Female';

    const handleOfferSleep = () => {
        if (!canOfferSleep || !onUpdateCharacter) return;
        const draft: Character = JSON.parse(JSON.stringify(character));
        let targetComp = draft.companions.find(c => c.id === resident.id);
        if (!targetComp && draft.inactiveCompanions) {
            targetComp = draft.inactiveCompanions.find(c => c.id === resident.id);
        }
        if (!targetComp) return;

        targetComp.affection = Math.min(100, (targetComp.affection || 0) + 5);
        if (targetComp.loyalty !== undefined) {
            targetComp.loyalty = Math.min(100, targetComp.loyalty + 3);
        }

        const curDate = draft.currentDate || '1026-01-01';
        const partnerIsFemale = isFemaleGender(targetComp.gender);
        const playerIsFemale = isFemaleGender(draft.gender);
        const isOppositeSex = partnerIsFemale !== playerIsFemale;
        let pregnancyMsg = '';

        if (isSpouse && isOppositeSex) {
            const conceptionChance = 0.2;
            if (partnerIsFemale && !targetComp.pregnancy?.isPregnant && Math.random() < conceptionChance) {
                const dueDate = addDays(curDate, 300);
                targetComp.pregnancy = {
                    isPregnant: true,
                    conceptionDate: curDate,
                    dueDate,
                    partnerId: 'player',
                    partnerName: draft.name
                };
                if (!targetComp.memories) targetComp.memories = [];
                targetComp.memories.push(`[${curDate}] ${draft.name}와(과) 숙소에서 함께 밤을 보내어 아이를 잉태함.`);
                pregnancyMsg = ` 🍼 (${targetComp.name} 임신!)`;
            } else if (playerIsFemale && !draft.pregnancy?.isPregnant && Math.random() < conceptionChance) {
                const dueDate = addDays(curDate, 300);
                draft.pregnancy = {
                    isPregnant: true,
                    conceptionDate: curDate,
                    dueDate,
                    partnerId: targetComp.id,
                    partnerName: targetComp.name
                };
                if (!draft.memories) draft.memories = [];
                draft.memories.push(`[${curDate}] ${targetComp.name}와(과) 숙소에서 함께 밤을 보내어 아이를 잉태함.`);
                pregnancyMsg = ' 🍼 (플레이어 임신!)';
            }
        }

        const healedRes = applyRestHealing(draft, 8);
        const timeRes = advanceGameTime(healedRes.updatedCharacter, 480, {
            isRest: true,
            activityName: '동침 휴식'
        });

        setShowChatChoices(false);
        setShowGiftMenu(false);
        setFeedbackMsg(
            `🌙 ${targetComp.name}와(과) 8시간 동안 따뜻한 밤을 보내며 휴식했습니다. (호감도 +5, 피로도·HP/MP 회복${pregnancyMsg})`
        );
        onUpdateCharacter(
            timeRes.updatedCharacter,
            `[숙소 동침] ${targetComp.name}와(과) 8시간 휴식을 취하며 깊은 밤을 보냈습니다. (호감도 +5)${pregnancyMsg}`
        );
    };

    const quickChatOptions = useMemo(
        () => getQuickChatOptions(liveComp, character.name || '플레이어', relationKind, isSameGender),
        [liveComp, character.name, relationKind, isSameGender]
    );

    const handleQuickConfess = () => {
        if (!canConfess) return;
        const aff = liveComp.affection || 70;
        const successRate = aff >= 95 ? 100 : Math.min(95, 50 + (aff - 70) * 1.5);
        const success = Math.random() * 100 < successRate;
        setShowChatChoices(false);
        setShowGiftMenu(false);
        if (success) {
            setFeedbackMsg(`💘 고백 성공! "${character.name}님... 저도 계속 같은 마음이었어요!" (연인 관계 성립, 호감도 +5)`);
            updateCompanionInChar(comp => {
                comp.relation = RelationType.LOVER;
                (comp as any).isLover = true;
                comp.affection = Math.min(100, (comp.affection || 70) + 5);
                comp.relations = {
                    ...(comp.relations || {}),
                    player: {
                        targetId: 'player',
                        targetName: character.name || '플레이어',
                        type: RelationType.LOVER,
                        affection: comp.affection
                    }
                };
                return `[고백 성공] 💕 ${comp.name}에게 진심을 고백해 연인이 되었습니다!`;
            }, `[고백 성공] ${resident.name}와(과) 연인이 되었습니다.`);
        } else {
            setFeedbackMsg(`💔 "${character.name}님, 마음은 고맙지만 아직은 조금 더 시간이 필요해요..." (호감도 -3)`);
            updateCompanionInChar(comp => {
                comp.affection = Math.max(0, (comp.affection || 70) - 3);
                return `[고백 거절] ${comp.name}에게 고백했으나 정중히 거절당했습니다.`;
            }, `[고백 거절] ${resident.name}에게 고백했으나 거절당했습니다.`);
        }
    };

    const handleSelectQuickChat = (opt: QuickChatOption) => {
        if (hasChattedToday) {
            setFeedbackMsg('💬 오늘은 이미 대화를 나눴습니다. (1일 1회 가능)');
            setShowChatChoices(false);
            return;
        }
        const loyaltyText = opt.loyaltyGain ? `, 충성도 +${opt.loyaltyGain}` : '';
        setFeedbackMsg(`💬 "${opt.reply}" (호감도 +${opt.affectionGain}${loyaltyText})`);
        setShowChatChoices(false);
        setShowGiftMenu(false);
        updateCompanionInChar(comp => {
            comp.affection = Math.min(100, (comp.affection || 0) + opt.affectionGain);
            if (opt.loyaltyGain) {
                comp.loyalty = Math.min(100, (comp.loyalty || 0) + opt.loyaltyGain);
            }
            (comp as any).lastQuickChatDate = todayDateStr;
            return `[기지 대화] ${comp.name}와(과) '${opt.label.replace(/^[^\s]+\s*/, '')}' 대화를 나눴습니다. (호감도 +${opt.affectionGain}${loyaltyText})`;
        }, `[기지 대화] ${resident.name}와(과) 대화했습니다.`);
    };

    const handleGiveInventoryGift = (invIndex: number) => {
        const item = character.inventory?.[invIndex];
        if (!item || !onUpdateCharacter) return;
        const gain = RARITY_AFFECTION_GAINS[item.rarity] || 1;
        setFeedbackMsg(`🎁 ${item.name} 선물 완료! "정말 고마워요!" (호감도 +${gain})`);
        setShowGiftMenu(false);
        updateCompanionInChar((comp, draft) => {
            const invItem = draft.inventory[invIndex];
            if (!invItem) return null;
            if ((invItem.quantity || 1) > 1) {
                invItem.quantity = (invItem.quantity || 1) - 1;
            } else {
                draft.inventory.splice(invIndex, 1);
            }
            comp.affection = Math.min(100, (comp.affection || 0) + gain);
            comp.loyalty = Math.min(100, (comp.loyalty || 0) + Math.floor(gain / 2));
            return `[선물 전달] ${comp.name}에게 ${item.name} 1개를 선물했습니다. (호감도 +${gain})`;
        }, `[선물 전달] ${resident.name}에게 ${item.name}을(를) 선물했습니다.`);
    };

    const handleJoinActiveParty = () => {
        if (!onUpdateCharacter || isInActiveParty) return;
        if (isPartyFull) {
            setFeedbackMsg(`⚠️ 현재 파티가 가득 찼습니다! (최대 ${MAX_PARTY_SIZE}명)`);
            return;
        }
        if (busyReason) {
            setFeedbackMsg(`⚠️ ${busyReason}이라 바로 합류할 수 없습니다.`);
            return;
        }
        const isChild = liveComp.classType?.includes('자녀') || liveComp.classType?.includes('Child');
        const ageNum = parseInt(String(liveComp.age || '20').replace(/[^0-9]/g, ''), 10) || 20;
        if (isChild && ageNum < 11) {
            setFeedbackMsg(`⚠️ 자녀는 11세부터 모험 파티에 합류할 수 있습니다. (현재 ${ageNum})`);
            return;
        }
        const draft: Character = JSON.parse(JSON.stringify(character));
        const idx = (draft.inactiveCompanions || []).findIndex(c => c.id === resident.id);
        if (idx === -1 || !draft.inactiveCompanions) return;
        const [joined] = draft.inactiveCompanions.splice(idx, 1);
        draft.companions.push(joined);
        onUpdateCharacter(draft, `[동료 합류] ${joined.name}이(가) 현재 모험 파티에 합류했습니다.`);
        onClose();
    };

    const canJoinNow = !isInActiveParty && !isPartyFull && !busyReason;

    return (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-md bg-slate-950/95 border border-indigo-500/60 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    {liveComp.visualUrl ? (
                        <img
                            src={liveComp.visualUrl}
                            alt={liveComp.name}
                            className="w-16 h-16 rounded-xl object-cover border border-indigo-500/40 shrink-0 bg-slate-900"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-xl border border-indigo-500/40 bg-slate-900 flex items-center justify-center shrink-0">
                            <Users size={24} className="text-indigo-400" />
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-white flex items-center gap-2 flex-wrap">
                            <span>{liveComp.name}</span>
                            <span className="text-[11px] font-bold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded">
                                Lv.{liveComp.level || 1}
                            </span>
                            <span className="text-[11px] font-bold text-rose-300 bg-rose-950/70 px-2 py-0.5 rounded flex items-center gap-1">
                                <Heart size={10} className="text-rose-400" /> {liveComp.affection ?? 0} / 100
                            </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                            {resident.role} · {isInActiveParty ? '현재 파티 동행 중' : busyReason ? busyReason : '기지 대기 동료'}
                        </div>
                        <div className="text-xs text-indigo-200 mt-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                            {feedbackMsg || resident.activityBubble}
                        </div>
                    </div>
                </div>
                <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1 shrink-0">
                    <X size={16} />
                </button>
            </div>

            {showGiftMenu && (
                <div className="mt-2.5 p-2 rounded-xl bg-slate-900/90 border border-amber-500/40 space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                    <div className="text-[11px] font-black text-amber-300">
                        🎁 보유 인벤토리 선물 선택 ({giftableItems.length}종)
                    </div>
                    {giftableItems.length === 0 ? (
                        <div className="text-xs text-slate-400 py-2 text-center">
                            가방에 선물할 수 있는 아이템이 없습니다.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-1">
                            {giftableItems.map(({ item, index }) => {
                                const gain = RARITY_AFFECTION_GAINS[item.rarity] || 1;
                                return (
                                    <button
                                        key={`${item.name}_${index}`}
                                        type="button"
                                        onClick={() => handleGiveInventoryGift(index)}
                                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-950/70 border border-slate-700 hover:border-amber-400/50 text-xs text-slate-100 transition-colors"
                                    >
                                        <span className="font-bold truncate">
                                            {item.name} {item.quantity && item.quantity > 1 ? `x${item.quantity}` : ''}
                                        </span>
                                        <span className="text-[11px] text-amber-300 font-black shrink-0 ml-2">
                                            호감도 +{gain}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {showChatChoices && !hasChattedToday && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900/95 border border-sky-500/40 space-y-1.5">
                    <div className="text-[11px] font-bold text-sky-300 flex items-center justify-between">
                        <span>💬 대화 주제 선택 (1일 1회)</span>
                        <button
                            type="button"
                            onClick={() => setShowChatChoices(false)}
                            className="text-slate-400 hover:text-white text-[10px]"
                        >
                            닫기
                        </button>
                    </div>
                    <div className="space-y-1">
                        {quickChatOptions.map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleSelectQuickChat(opt)}
                                className="w-full text-left px-2.5 py-2 rounded-lg bg-slate-950/80 hover:bg-sky-950/60 border border-slate-800 hover:border-sky-500/50 transition-colors flex items-center justify-between gap-2"
                            >
                                <span className="text-[11px] font-bold text-slate-100 truncate">{opt.label}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-900/60 text-sky-300 border border-sky-700/50 shrink-0">
                                    {opt.tag} · +{opt.affectionGain}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-wrap gap-1.5 mt-3">
                {isBlacksmithHere && onCommissionBlacksmith && (
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onCommissionBlacksmith(resident.id);
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md"
                    >
                        <Hammer size={13} /> 대장장이 의뢰하기
                    </button>
                )}
                {isAlchemistHere && onCommissionAlchemist && (
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onCommissionAlchemist(resident.id);
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md"
                    >
                        <FlaskConical size={13} /> 연금술사 의뢰하기
                    </button>
                )}
                {onUpdateCharacter && (
                    <>
                        <button
                            type="button"
                            disabled={hasChattedToday}
                            onClick={() => {
                                if (hasChattedToday) return;
                                setShowGiftMenu(false);
                                setShowChatChoices(v => !v);
                            }}
                            className={`flex-1 min-w-[96px] py-2 px-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-1 ${
                                hasChattedToday
                                    ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                                    : 'bg-sky-700 hover:bg-sky-600 text-white'
                            }`}
                        >
                            <MessageCircle size={13} /> {hasChattedToday ? '오늘 대화 완료' : '간단 대화'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowGiftMenu(v => !v)}
                            className="flex-1 min-w-[96px] py-2 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-black flex items-center justify-center gap-1"
                        >
                            <Gift size={13} /> 선물주기
                        </button>
                        {canConfess && (
                            <button
                                type="button"
                                onClick={handleQuickConfess}
                                className="flex-1 min-w-[96px] py-2 px-2.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-black flex items-center justify-center gap-1 shadow-md"
                                title="호감도 70 이상 시 고백 가능"
                            >
                                <Heart size={13} /> 고백하기
                            </button>
                        )}
                        {canOfferSleep && (
                            <button
                                type="button"
                                onClick={handleOfferSleep}
                                className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-rose-700 to-indigo-700 hover:from-rose-600 hover:to-indigo-600 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md"
                                title="연인/배우자와 8시간 휴식 (HP/MP·피로도 회복, 임신 가능성)"
                            >
                                <Moon size={13} /> 잠자리 제안 (8시간 휴식)
                            </button>
                        )}
                        {!isInActiveParty && (
                            <button
                                type="button"
                                onClick={handleJoinActiveParty}
                                disabled={!canJoinNow}
                                className={`w-full py-2 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 ${
                                    canJoinNow
                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                        : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                                }`}
                            >
                                <UserPlus size={13} />
                                {isPartyFull
                                    ? `파티 정원 초과 (${character.companions.length}/${MAX_PARTY_SIZE}명)`
                                    : busyReason
                                        ? `합류 불가 (${busyReason})`
                                        : '현재 동료(파티)로 합류하기'}
                            </button>
                        )}
                    </>
                )}
                <button
                    type="button"
                    onClick={() => {
                        if (isInActiveParty && onInspectCompanion) {
                            const cid = resident.id;
                            onClose();
                            onInspectCompanion(cid);
                        } else {
                            setShowDetailModal(true);
                        }
                    }}
                    className="flex-1 py-2 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black"
                >
                    상세 정보
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                >
                    닫기
                </button>
            </div>

            {showDetailModal && (
                <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-slate-950 border-2 border-indigo-500/60 rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-3">
                                {liveComp.visualUrl ? (
                                    <img
                                        src={liveComp.visualUrl}
                                        alt={liveComp.name}
                                        className="w-16 h-16 rounded-xl object-cover border border-indigo-500/50 bg-slate-900 shrink-0"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-xl border border-indigo-500/50 bg-slate-900 flex items-center justify-center shrink-0">
                                        <Users size={24} className="text-indigo-400" />
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-base font-black text-white">{liveComp.name}</h3>
                                        <span className="text-[11px] font-bold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded">
                                            Lv.{liveComp.level || 1}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-0.5">
                                        {liveComp.job || resident.role} · {liveComp.gender || '미상'} · {liveComp.age || '?'} · {liveComp.nation || '무소속'}
                                    </div>
                                    <div className="text-xs text-rose-300 font-bold mt-1 flex items-center gap-1">
                                        <Heart size={11} className="text-rose-400" /> 호감도 {liveComp.affection ?? 0} / 100
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDetailModal(false)}
                                className="text-slate-400 hover:text-white p-1"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                                <div className="text-slate-400 text-[10px]">HP</div>
                                <div className="text-emerald-300 font-black">
                                    {(liveComp.stats?.hp || 0).toLocaleString()} / {(liveComp.stats?.maxHp || liveComp.stats?.hp || 100).toLocaleString()}
                                </div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                                <div className="text-slate-400 text-[10px]">MP</div>
                                <div className="text-sky-300 font-black">
                                    {(liveComp.stats?.mp || 0).toLocaleString()} / {(liveComp.stats?.maxMp || liveComp.stats?.mp || 50).toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                            {[
                                { label: '근력 (STR)', val: liveComp.stats?.str ?? 0, color: 'text-rose-300' },
                                { label: '지력 (INT)', val: liveComp.stats?.int ?? 0, color: 'text-sky-300' },
                                { label: '지혜 (WIS)', val: liveComp.stats?.wis ?? 0, color: 'text-violet-300' },
                                { label: '민첩 (AGI)', val: liveComp.stats?.agi ?? 0, color: 'text-emerald-300' },
                                { label: '방어 (DEF)', val: liveComp.stats?.def ?? 0, color: 'text-amber-300' },
                                { label: '제어 (CTRL)', val: liveComp.stats?.ctrl ?? 0, color: 'text-cyan-300' },
                            ].map(s => (
                                <div key={s.label} className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                                    <div className="text-[10px] text-slate-400">{s.label}</div>
                                    <div className={`text-sm font-black ${s.color}`}>{s.val.toLocaleString()}</div>
                                </div>
                            ))}
                        </div>

                        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5 text-xs">
                            <div>
                                <span className="text-slate-400">성격:</span>{' '}
                                <span className="text-slate-200 font-semibold">{liveComp.personality || '알 수 없음'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400">전투 스타일:</span>{' '}
                                <span className="text-indigo-300 font-semibold">{liveComp.combatStyle || '일반'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400">기지 상태:</span>{' '}
                                <span className="text-amber-300 font-semibold">{busyReason || '기지 대기 거주민'}</span>
                            </div>
                            {liveComp.appearance && (
                                <div className="text-slate-300 text-[11px] leading-relaxed pt-1 border-t border-slate-800">
                                    {liveComp.appearance}
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowDetailModal(false)}
                            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black"
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResidentQuickCard;
