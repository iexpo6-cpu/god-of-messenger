import React, { useMemo, useState } from 'react';
import { Character, Companion, ItemRarity, JobType } from '../../types';
import { MAX_PARTY_SIZE } from '../../constants';
import { BaseResidentEntity } from '../../services/baseTilemapEngine';
import { FlaskConical, Gift, Hammer, Heart, MessageCircle, UserPlus, Users, X } from 'lucide-react';

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

const QUICK_CHAT_LINES = [
    '오늘도 기지가 평화롭네요. 사자님 덕분에 마음이 놓입니다!',
    '방금 전까지 맡은 일을 정리하고 있었어요. 혹시 필요한 게 있으신가요?',
    '기지 동료들과 함께 지내다 보니 하루가 금세 지나가네요.',
    '다음 원정도 사자님과 함께라면 분명 좋은 결과가 있을 거예요!',
    '잠깐 쉬면서 차라도 한 잔 하실래요? 언제든 환영입니다.'
];

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
    const [showGiftMenu, setShowGiftMenu] = useState(false);

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

    const handleQuickChat = () => {
        const line = QUICK_CHAT_LINES[Math.floor(Math.random() * QUICK_CHAT_LINES.length)];
        setFeedbackMsg(`💬 "${line}" (호감도 +1)`);
        setShowGiftMenu(false);
        updateCompanionInChar(comp => {
            comp.affection = Math.min(100, (comp.affection || 0) + 1);
            return `[기지 대화] ${comp.name}와(과) 가벼운 대화를 나눴습니다. (호감도 +1)`;
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
            setFeedbackMsg(`⚠️ 자녀는 11세부터 모험 파티에 합류할 수 있습니다. (현재 ${ageNum}세)`);
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
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-white flex items-center gap-2 flex-wrap">
                        <Users size={15} className="text-indigo-400 shrink-0" />
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
                            onClick={handleQuickChat}
                            className="flex-1 min-w-[96px] py-2 px-2.5 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-xs font-black flex items-center justify-center gap-1"
                        >
                            <MessageCircle size={13} /> 간단 대화
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowGiftMenu(v => !v)}
                            className="flex-1 min-w-[96px] py-2 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-black flex items-center justify-center gap-1"
                        >
                            <Gift size={13} /> 선물주기
                        </button>
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
                {onInspectCompanion && (
                    <button
                        type="button"
                        onClick={() => {
                            const cid = resident.id;
                            onClose();
                            onInspectCompanion(cid);
                        }}
                        className="flex-1 py-2 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black"
                    >
                        상세 정보
                    </button>
                )}
                <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                >
                    닫기
                </button>
            </div>
        </div>
    );
};

export default ResidentQuickCard;
