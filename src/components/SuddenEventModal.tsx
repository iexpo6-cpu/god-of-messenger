import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, Swords, Hammer, Flame, Shield, Zap, Award, X,
    ChevronRight, User, Users, AlertTriangle, BookOpen
} from 'lucide-react';
import { Character, Companion, Item, WeaponType } from '../types';
import { WEAPON_TYPE_KOREAN } from '../constants';
import {
    SuddenEventData,
    applyAncientBlacksmithEnhance,
    applyAncientBlacksmithMasteryLevelUp
} from '../services/suddenEventService';
import { ResultData } from './ActionResultModal';

interface SuddenEventModalProps {
    event: SuddenEventData | null;
    character: Character;
    onClose: () => void;
    onStartSuddenCombat: (event: SuddenEventData) => void;
    onUpdateCharacter: (newChar: Character, logMsg?: string) => void;
    setResultModalData: (data: ResultData | null) => void;
}

const ALL_WEAPON_TYPES: WeaponType[] = [
    'Sword', 'Spear', 'Blunt', 'Axe', 'Knuckle',
    'Bow', 'Crossbow', 'Thrown', 'Firearm', 'Heavy',
    'Staff', 'Energy', 'Grimoire',
    'Shield', 'Orb', 'SubSword'
];

export const SuddenEventModal: React.FC<SuddenEventModalProps> = ({
    event,
    character,
    onClose,
    onStartSuddenCombat,
    onUpdateCharacter,
    setResultModalData
}) => {
    const [blacksmithMode, setBlacksmithMode] = useState<'enhance' | 'teach'>('enhance');
    const [selectedTargetId, setSelectedTargetId] = useState<string>('player');
    const [teachSubTab, setTeachSubTab] = useState<'skill' | 'mastery'>('skill');
    const [selectedEquipKey, setSelectedEquipKey] = useState<string>('player:weapon');
    const [selectedSkillIdx, setSelectedSkillIdx] = useState<number>(0);
    const [selectedWeaponType, setSelectedWeaponType] = useState<WeaponType>('Sword');

    if (!event) return null;

    // 장착 장비 목록 수집 (플레이어 및 동료의 무기/보조무기/장비)
    const equippedGearList: {
        key: string;
        ownerId: string;
        ownerName: string;
        slot: keyof Character['equipment'];
        slotLabel: string;
        item: Item;
    }[] = [];

    const slotLabels: Record<string, string> = {
        weapon: '주무기',
        subWeapon: '보조무기',
        head: '투구',
        body: '갑옷',
        hand: '장갑',
        feet: '신발',
        accessory: '장신구'
    };

    const collectEquip = (ownerId: string, ownerName: string, equip?: Character['equipment']) => {
        if (!equip) return;
        (['weapon', 'subWeapon', 'head', 'body', 'hand', 'feet', 'accessory'] as (keyof Character['equipment'])[]).forEach(slot => {
            const it = equip[slot];
            if (it) {
                equippedGearList.push({
                    key: `${ownerId}:${slot}`,
                    ownerId,
                    ownerName,
                    slot,
                    slotLabel: slotLabels[slot] || slot,
                    item: it
                });
            }
        });
    };

    collectEquip('player', character.name, character.equipment);
    (character.companions || []).forEach(comp => {
        collectEquip(comp.id, comp.name, comp.equipment);
    });

    const activeEquipEntry =
        equippedGearList.find(e => e.key === selectedEquipKey) ||
        equippedGearList[0] ||
        null;

    const targetEntity: Character | Companion =
        selectedTargetId === 'player'
            ? character
            : character.companions.find(c => c.id === selectedTargetId) || character;

    // 고대 대장장이: 무료 +1~+3 강화 실행
    const handleBlacksmithEnhance = () => {
        if (!activeEquipEntry) return;
        const newChar: Character = JSON.parse(JSON.stringify(character));
        const target =
            activeEquipEntry.ownerId === 'player'
                ? newChar
                : newChar.companions.find(c => c.id === activeEquipEntry.ownerId);

        if (!target || !target.equipment) return;
        const currentItem = target.equipment[activeEquipEntry.slot];
        if (!currentItem) return;

        const { updatedItem, gain, oldEnh, newEnh, unlockedOptions } = applyAncientBlacksmithEnhance(currentItem);
        target.equipment[activeEquipEntry.slot] = updatedItem;

        const logMsg = `[고대 대장장이의 축복] ${activeEquipEntry.ownerName}의 [${updatedItem.name}]에 고대의 불꽃이 깃들어 무료 +${gain} 강화(+${oldEnh} ➔ +${newEnh})에 성공했습니다!`;
        onUpdateCharacter(newChar, logMsg);
        onClose();

        setResultModalData({
            type: 'levelup',
            title: '🔨 고대 대장장이의 불꽃 주입 대성공!',
            message: `고대 대장장이가 망치를 내리치자 황금빛 불꽃이 솟구치며 [${updatedItem.name}]의 강화 단계가 단숨에 +${gain} 상승했습니다!`,
            items: [
                { label: '대상 장비', after: `${activeEquipEntry.ownerName} - ${updatedItem.name}` },
                { label: '강화 단계 상승', before: `+${oldEnh}`, after: `+${newEnh} (+${gain} UP!)` },
                ...(unlockedOptions.length > 0
                    ? [{ label: '추가 개방 옵션', after: unlockedOptions.join(', ') }]
                    : [])
            ]
        });
    };

    // 고대 대장장이: 스킬 또는 무기숙련도 +1레벨 전수 실행
    const handleBlacksmithTeach = () => {
        const newChar: Character = JSON.parse(JSON.stringify(character));
        const target =
            selectedTargetId === 'player'
                ? newChar
                : newChar.companions.find(c => c.id === selectedTargetId);

        if (!target) return;

        if (teachSubTab === 'skill') {
            const skills = target.skills || [];
            const targetSkill = skills[selectedSkillIdx] || skills[0];
            if (!targetSkill) return;

            const oldLv = targetSkill.level || 1;
            const newLv = oldLv + 1;
            targetSkill.level = newLv;
            if ((targetSkill.maxLevel || 10) < newLv) {
                targetSkill.maxLevel = newLv;
            }

            const logMsg = `[고대 대장장이의 비전 전수] ${target.name}의 스킬 [${targetSkill.name}] 레벨이 즉시 +1 상승(Lv.${oldLv} ➔ Lv.${newLv})했습니다!`;
            onUpdateCharacter(newChar, logMsg);
            onClose();

            setResultModalData({
                type: 'levelup',
                title: '⚡ 고대의 스킬 비전 전수 완료!',
                message: `고대 대장장이의 가르침으로 ${target.name}의 [${targetSkill.name}] 경지가 한 단계 돌파되었습니다!`,
                items: [
                    { label: '전수 대상', after: target.name },
                    { label: '전수 스킬', after: targetSkill.name },
                    { label: '스킬 레벨', before: `Lv.${oldLv}`, after: `Lv.${newLv} (+1 UP!)` }
                ]
            });
        } else {
            const { oldLevel, newLevel, weaponName } = applyAncientBlacksmithMasteryLevelUp(target, selectedWeaponType);
            const logMsg = `[고대 대장장이의 비전 전수] ${target.name}의 [${weaponName}] 무기 숙련도가 즉시 +1레벨 상승(Lv.${oldLevel} ➔ Lv.${newLevel})했습니다!`;
            onUpdateCharacter(newChar, logMsg);
            onClose();

            setResultModalData({
                type: 'levelup',
                title: '⚔️ 고대의 무기 비전 전수 완료!',
                message: `고대 대장장이가 무기를 다루는 극의를 전수하여 ${target.name}의 [${weaponName}] 숙련도가 즉시 상승했습니다!`,
                items: [
                    { label: '전수 대상', after: target.name },
                    { label: '무기 계통', after: `${weaponName} 숙련도` },
                    { label: '숙련도 레벨', before: `Lv.${oldLevel}`, after: `Lv.${newLevel} (+1 UP!)` }
                ]
            });
        }
    };

    const getThemeConfig = () => {
        switch (event.type) {
            case 'rift_crystal':
                return {
                    border: 'border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.3)]',
                    headerBg: 'from-cyan-950/90 via-indigo-950/80 to-slate-950',
                    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
                    badgeText: '🌌 차원의 균열 돌발 발생',
                    icon: <Sparkles size={24} className="text-cyan-400 animate-spin" style={{ animationDuration: '5s' }} />,
                    accentText: 'text-cyan-300'
                };
            case 'rival_ambush':
                return {
                    border: 'border-rose-500/60 shadow-[0_0_40px_rgba(244,63,94,0.3)]',
                    headerBg: 'from-rose-950/90 via-red-950/80 to-slate-950',
                    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-400/40',
                    badgeText: '⚔️ 숙적의 기습 난입',
                    icon: <Swords size={24} className="text-rose-400 animate-pulse" />,
                    accentText: 'text-rose-300'
                };
            case 'ancient_blacksmith':
                return {
                    border: 'border-amber-500/60 shadow-[0_0_40px_rgba(245,158,11,0.3)]',
                    headerBg: 'from-amber-950/90 via-orange-950/80 to-slate-950',
                    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
                    badgeText: '🔨 신비한 NPC 조우',
                    icon: <Hammer size={24} className="text-amber-400 animate-bounce" />,
                    accentText: 'text-amber-300'
                };
            case 'monster_frenzy':
            default:
                return {
                    border: 'border-orange-500/60 shadow-[0_0_40px_rgba(249,115,22,0.3)]',
                    headerBg: 'from-orange-950/90 via-red-950/80 to-slate-950',
                    badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-400/40',
                    badgeText: '🔥 연쇄 토벌 보너스 발생',
                    icon: <Flame size={24} className="text-orange-400 animate-pulse" />,
                    accentText: 'text-orange-300'
                };
        }
    };

    const theme = getThemeConfig();

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 15 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className={`relative w-full max-w-lg bg-slate-950 border-2 ${theme.border} rounded-2xl overflow-hidden flex flex-col max-h-[90vh]`}
                >
                    {/* 상단 헤더 */}
                    <div className={`p-5 bg-gradient-to-b ${theme.headerBg} border-b border-slate-800/80 relative`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-center shrink-0 shadow-lg">
                                    {theme.icon}
                                </div>
                                <div>
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${theme.badgeBg} mb-1`}>
                                        {theme.badgeText}
                                    </span>
                                    <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                                        {event.title}
                                    </h2>
                                    <p className={`text-xs font-bold ${theme.accentText} mt-0.5`}>
                                        {event.subtitle}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* 본문 영역 */}
                    <div className="p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
                        {/* 공통 내러티브 메시지 */}
                        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-line shadow-inner">
                            {event.message}
                        </div>

                        {/* 1. 차원의 균열 (폭주하는 신력 결정체) */}
                        {event.type === 'rift_crystal' && (
                            <div className="space-y-3">
                                {event.enemies?.[0]?.visualUrl && (
                                    <div className="flex justify-center">
                                        <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-cyan-400/50 shadow-lg shadow-cyan-500/20 bg-slate-900">
                                            <img
                                                src={event.enemies[0].visualUrl}
                                                alt={event.enemies[0].name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex flex-col items-center text-center">
                                        <Award size={20} className="text-cyan-400 mb-1" />
                                        <span className="text-[11px] text-slate-400 font-semibold">처치 시 경험치 보상</span>
                                        <span className="text-base sm:text-lg font-black text-cyan-300 mt-0.5">
                                            일반 전투의 {event.expMultiplier}배!
                                        </span>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex flex-col items-center text-center">
                                        <Swords size={20} className="text-indigo-400 mb-1" />
                                        <span className="text-[11px] text-slate-400 font-semibold">착용 무기 숙련도 보너스</span>
                                        <span className="text-base sm:text-lg font-black text-indigo-300 mt-0.5">
                                            +{event.masteryBonus} EXP 대량 획득!
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                                    <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                                    <span>
                                        <strong className="text-amber-300">[폭주하는 신력 결정체]</strong>는 공격력이 매우 약하지만, 시간이 오래 걸리면 차원 균열 너머로 도망칠 수 있습니다!
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* 2. 라이벌 / 수배범 / 타락한 사자 기습 난입 */}
                        {event.type === 'rival_ambush' && (
                            <div className="space-y-3">
                                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 flex items-center justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="text-[11px] text-rose-300 font-bold flex items-center gap-1">
                                            <Swords size={13} /> 기습 난입 대상
                                        </div>
                                        <div className="text-base font-black text-white">
                                            {event.rivalName} <span className="text-xs text-rose-400 font-extrabold">(Lv.{event.enemyLevel})</span>
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                            {event.enemies && event.enemies.length > 1
                                                ? `정예 호위 및 결사대 포함 총 ${event.enemies.length}명 출현`
                                                : '단독 기습 결투'}
                                        </div>
                                    </div>
                                    <div className="px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-400/50 text-center shrink-0">
                                        <div className="text-[10px] text-amber-200 font-bold">승리 시 특별 보상</div>
                                        <div className="text-sm sm:text-base font-black text-amber-300">
                                            즉시 +{event.levelUpCount}레벨업 EXP!
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-400 px-1">
                                    • 승리 시 현재 레벨에서 <strong className="text-amber-300">즉시 {event.levelUpCount}회 연속 레벨업</strong>할 수 있는 막대한 경험치(+{
                                        (() => {
                                            let total = 0;
                                            const cnt = event.levelUpCount || 1;
                                            for (let i = 0; i < cnt; i++) {
                                                const lv = (character.level || 1) + i;
                                                const mult = lv < 30 ? 100 : lv < 100 ? 200 : lv < 200 ? 500 : lv < 300 ? 1000 : lv < 400 ? 1500 : lv < 500 ? 2000 : lv < 600 ? 3000 : lv < 700 ? 4000 : lv < 800 ? 5000 : lv < 900 ? 6000 : lv < 1000 ? 7500 : lv < 1500 ? 10000 : lv < 2000 ? 15000 : lv < 3000 ? 16000 : lv < 5000 ? 18000 : 20000;
                                                total += lv * mult;
                                            }
                                            return total.toLocaleString();
                                        })()
                                    } EXP)를 단번에 획득합니다.
                                </p>
                            </div>
                        )}

                        {/* 3. 떠돌이 고대 대장장이 조우 */}
                        {event.type === 'ancient_blacksmith' && (
                            <div className="space-y-4">
                                {/* 두 가지 선택지 탭 */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setBlacksmithMode('enhance')}
                                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                            blacksmithMode === 'enhance'
                                                ? 'bg-amber-950/50 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                                                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm">
                                            <Hammer size={15} className="text-amber-400 shrink-0" />
                                            <span>무료 +1~+3 강화</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            골드/재료 소모 및 실패 패널티 없이 즉시 +1~+3 강화
                                        </p>
                                    </button>
                                    <button
                                        onClick={() => setBlacksmithMode('teach')}
                                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                            blacksmithMode === 'teach'
                                                ? 'bg-indigo-950/50 border-indigo-400 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                                                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm">
                                            <Zap size={15} className="text-indigo-400 shrink-0" />
                                            <span>비전 전수 (+1 Lv)</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            원하는 스킬 또는 무기숙련도 즉시 +1레벨 상승
                                        </p>
                                    </button>
                                </div>

                                {blacksmithMode === 'enhance' ? (
                                    <div className="space-y-3 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5">
                                        <div className="text-xs font-bold text-amber-300 flex items-center justify-between">
                                            <span>🔥 불꽃을 주입할 장착 장비 선택</span>
                                            <span className="text-[10px] text-emerald-400 font-semibold">실패/파괴 확률 0%</span>
                                        </div>
                                        {equippedGearList.length === 0 ? (
                                            <div className="p-4 text-center text-xs text-slate-500">
                                                현재 장착 중인 장비가 없습니다. 우측의 [비전 전수]를 선택해 주세요!
                                            </div>
                                        ) : (
                                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                                                {equippedGearList.map(entry => {
                                                    const isSelected = activeEquipEntry?.key === entry.key;
                                                    return (
                                                        <button
                                                            key={entry.key}
                                                            onClick={() => setSelectedEquipKey(entry.key)}
                                                            className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                                                                isSelected
                                                                    ? 'bg-amber-950/40 border-amber-400/80 text-white'
                                                                    : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 shrink-0">
                                                                    {entry.ownerName} · {entry.slotLabel}
                                                                </span>
                                                                <span className="text-xs font-extrabold truncate">
                                                                    {entry.item.name}
                                                                </span>
                                                            </div>
                                                            <span className="text-xs font-black text-amber-400 shrink-0 ml-2">
                                                                +{entry.item.enhancement || 0} ➔ +{(entry.item.enhancement || 0) + 1}~{(entry.item.enhancement || 0) + 3}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-3 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5">
                                        {/* 1. 전수받을 대상 선택 */}
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                                <Users size={12} className="text-indigo-400" /> 1. 전수받을 대상 선택 (플레이어 / 동료)
                                            </label>
                                            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                                                <button
                                                    onClick={() => { setSelectedTargetId('player'); setSelectedSkillIdx(0); }}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border whitespace-nowrap cursor-pointer transition-all ${
                                                        selectedTargetId === 'player'
                                                            ? 'bg-indigo-600 border-indigo-400 text-white'
                                                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                                    }`}
                                                >
                                                    👑 {character.name} (리더)
                                                </button>
                                                {(character.companions || []).map(comp => (
                                                    <button
                                                        key={comp.id}
                                                        onClick={() => { setSelectedTargetId(comp.id); setSelectedSkillIdx(0); }}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border whitespace-nowrap cursor-pointer transition-all ${
                                                            selectedTargetId === comp.id
                                                                ? 'bg-indigo-600 border-indigo-400 text-white'
                                                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                                        }`}
                                                    >
                                                        🛡️ {comp.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 2. 스킬 vs 무기숙련도 선택 */}
                                        <div className="flex gap-2 pt-1">
                                            <button
                                                onClick={() => setTeachSubTab('skill')}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                                                    teachSubTab === 'skill'
                                                        ? 'bg-emerald-950/60 border-emerald-400 text-emerald-300'
                                                        : 'bg-slate-950 border-slate-800 text-slate-400'
                                                }`}
                                            >
                                                <BookOpen size={13} /> 원하는 스킬 +1레벨
                                            </button>
                                            <button
                                                onClick={() => setTeachSubTab('mastery')}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                                                    teachSubTab === 'mastery'
                                                        ? 'bg-amber-950/60 border-amber-400 text-amber-300'
                                                        : 'bg-slate-950 border-slate-800 text-slate-400'
                                                }`}
                                            >
                                                <Swords size={13} /> 원하는 무기숙련도 +1레벨
                                            </button>
                                        </div>

                                        {/* 3. 세부 항목 목록 */}
                                        {teachSubTab === 'skill' ? (
                                            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                                                {(targetEntity.skills || []).length === 0 ? (
                                                    <div className="text-center py-4 text-xs text-slate-500">
                                                        보유한 스킬이 없습니다. 무기숙련도 전수를 선택해 주세요.
                                                    </div>
                                                ) : (
                                                    (targetEntity.skills || []).map((sk, idx) => (
                                                        <button
                                                            key={`${sk.name}_${idx}`}
                                                            onClick={() => setSelectedSkillIdx(idx)}
                                                            className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-all ${
                                                                selectedSkillIdx === idx
                                                                    ? 'bg-emerald-950/40 border-emerald-400/80 text-white'
                                                                    : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                                                            }`}
                                                        >
                                                            <span className="text-xs font-bold truncate">{sk.name}</span>
                                                            <span className="text-xs font-black text-emerald-400 shrink-0 ml-2">
                                                                Lv.{sk.level || 1} ➔ Lv.{(sk.level || 1) + 1}
                                                            </span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                                                {ALL_WEAPON_TYPES.map(wType => {
                                                    const curLv = targetEntity.weaponMastery?.[wType]?.level || 0;
                                                    const wName = WEAPON_TYPE_KOREAN[wType] || wType;
                                                    return (
                                                        <button
                                                            key={wType}
                                                            onClick={() => setSelectedWeaponType(wType)}
                                                            disabled={curLv >= 100}
                                                            className={`p-2 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-all ${
                                                                selectedWeaponType === wType
                                                                    ? 'bg-amber-950/40 border-amber-400/80 text-white'
                                                                    : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                                                            } ${curLv >= 100 ? 'opacity-40 cursor-not-allowed' : ''}`}
                                                        >
                                                            <span className="text-xs font-bold">{wName}</span>
                                                            <span className="text-[11px] font-black text-amber-400">
                                                                {curLv >= 100 ? 'MAX' : `Lv.${curLv}➔${curLv + 1}`}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 4. 몬스터 군락의 광폭화 (연쇄 토벌 보너스) */}
                        {event.type === 'monster_frenzy' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 flex flex-col items-center text-center">
                                        <Sparkles size={20} className="text-amber-400 mb-1" />
                                        <span className="text-[11px] text-slate-400 font-semibold">연쇄 토벌 승리 보상</span>
                                        <span className="text-base sm:text-lg font-black text-amber-300 mt-0.5">
                                            EXP · 골드 · 드랍 5배!
                                        </span>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 flex flex-col items-center text-center">
                                        <Flame size={20} className="text-rose-400 mb-1" />
                                        <span className="text-[11px] text-slate-400 font-semibold">광폭화 군락 위험도</span>
                                        <span className="text-base sm:text-lg font-black text-rose-300 mt-0.5">
                                            적 스탯 · 체력 2.5배
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
                                    <div className="text-[11px] font-bold text-orange-300">
                                        출현 광폭화 군락 ({event.enemies?.length || 0}마리)
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(event.enemies || []).map((e, idx) => (
                                            <span
                                                key={e.id || idx}
                                                className="px-2 py-0.5 rounded bg-orange-950/60 border border-orange-500/30 text-[11px] text-orange-200 font-bold"
                                            >
                                                {e.name} (Lv.{e.level})
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-slate-400 pt-1">
                                        • 승리 시 <strong className="text-amber-300">5번 사냥할 분량의 경험치, 골드, 전리품 드랍 판정(5회분)</strong>을 단 한 판에 몰아서 획득합니다!
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 하단 액션 버튼 */}
                    <div className="p-4 border-t border-slate-800/80 bg-slate-950/95 flex flex-col sm:flex-row gap-2.5">
                        {event.type === 'ancient_blacksmith' ? (
                            <>
                                {blacksmithMode === 'enhance' ? (
                                    <button
                                        onClick={handleBlacksmithEnhance}
                                        disabled={!activeEquipEntry}
                                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 disabled:opacity-40 text-slate-950 font-black text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        <Hammer size={18} />
                                        <span>고대의 불꽃 주입 (+1~+3 무료 강화)</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleBlacksmithTeach}
                                        disabled={teachSubTab === 'skill' && (targetEntity.skills || []).length === 0}
                                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-500 hover:from-indigo-500 hover:to-purple-400 disabled:opacity-40 text-white font-black text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        <Zap size={18} />
                                        <span>고대의 비전 전수받기 (즉시 +1 Lv)</span>
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-all cursor-pointer"
                                >
                                    정중히 사양한다
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => onStartSuddenCombat(event)}
                                    className={`flex-1 py-3 px-4 rounded-xl font-black text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                                        event.type === 'rift_crystal'
                                            ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white'
                                            : event.type === 'rival_ambush'
                                            ? 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white'
                                            : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white'
                                    }`}
                                >
                                    <Swords size={18} />
                                    <span>
                                        {event.type === 'rift_crystal'
                                            ? `결정체 처치 돌입! (EXP ×${event.expMultiplier}배)`
                                            : event.type === 'rival_ambush'
                                            ? `기습에 맞서 결투 개시! (+${event.levelUpCount}레벨업 EXP)`
                                            : '광폭화 군락 연쇄 토벌! (보상 5배)'}
                                    </span>
                                </button>
                                <button
                                    onClick={onClose}
                                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-all cursor-pointer"
                                >
                                    {event.type === 'rift_crystal' ? '무시하고 지나간다' : '자리를 피한다'}
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
