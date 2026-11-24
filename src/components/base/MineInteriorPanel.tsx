import React, { useMemo, useState } from 'react';
import { Character, Companion, JobType } from '../../types';
import { MINE_SPECIALIZATIONS, MINE_ZONES } from '../../constants';
import { calculateFinalStats, gainProfessionExp, MINER_RANK_CONFIGS } from '../../utils';
import { advanceGameTime } from '../../services/gameTimeService';
import { useActionCooldown } from '../../hooks/useActionCooldown';
import ActionResultModal, { ResultData } from '../ActionResultModal';
import {
    AlertTriangle,
    ArrowUpCircle,
    Award,
    ChevronLeft,
    ChevronRight,
    Hammer,
    Lock,
    Mountain,
    Pickaxe,
    Sparkles,
    Target,
    TrendingUp,
    X
} from 'lucide-react';

interface MineInteriorPanelProps {
    character: Character;
    instanceId: string;
    selectedZoneId: string | null;
    onSelectZoneId: (zoneId: string | null) => void;
    onSwitchMineInstance: (newInstanceId: string) => void;
    onUpdateCharacter: (updatedChar: Character, logMessage: string, dailyReport?: any) => void;
}

const getMiningMaxUsage = (level: number) => {
    const usageTable: Record<number, number> = { 1: 1, 2: 3, 3: 5, 4: 7, 5: 10 };
    if (usageTable[level] !== undefined) return usageTable[level];
    if (level > 5) return 10 + (level - 5) * 3;
    return 1;
};

const MineInteriorPanel: React.FC<MineInteriorPanelProps> = ({
    character,
    instanceId,
    selectedZoneId,
    onSelectZoneId,
    onSwitchMineInstance,
    onUpdateCharacter
}) => {
    const { executeWithCooldown } = useActionCooldown(300);
    const base = character.base!;
    const allMines = useMemo(
        () => (base.layout || []).filter(inst => inst.type === 'mine' && !inst.underConstruction && (inst.level || 0) > 0),
        [base.layout]
    );
    const currentMineIdx = allMines.findIndex(inst => inst.id === instanceId);
    const instance = base.layout?.find(inst => inst.id === instanceId) || allMines[0];
    const mineLevel = instance?.level || 1;

    const assigneeIds = useMemo(
        () =>
            base.multiAssignments?.[instanceId] ||
            (base.assignments?.[instanceId] ? [base.assignments[instanceId] as string] : []),
        [base.multiAssignments, base.assignments, instanceId]
    );
    const assignees = useMemo(
        () => [...character.companions, ...(character.inactiveCompanions || [])].filter(c => assigneeIds.includes(c.id)),
        [character.companions, character.inactiveCompanions, assigneeIds]
    );

    const specializationId = base.mineSpecializations?.[instanceId] || 'general';
    const specialization = MINE_SPECIALIZATIONS.find(s => s.id === specializationId) || MINE_SPECIALIZATIONS[0];
    const miningMastery = character.professions?.mining || { level: 1, exp: 0, maxExp: 100 };

    const currentUsage = base.dailyCounts?.[`mine_harvest_${instanceId}`] || 0;
    const maxUsage = getMiningMaxUsage(mineLevel);
    const remainingUsage = Math.max(0, maxUsage - currentUsage);

    const totalRemainingMiningCount = useMemo(() => {
        let total = 0;
        allMines.forEach(m => {
            const mUsage = base.dailyCounts?.[`mine_harvest_${m.id}`] || 0;
            total += Math.max(0, getMiningMaxUsage(m.level || 1) - mUsage);
        });
        return total;
    }, [allMines, base.dailyCounts]);

    const [mineCount, setMineCount] = useState<number>(1);
    const [isMining, setIsMining] = useState(false);
    const [showSpecMenu, setShowSpecMenu] = useState(false);
    const [isMasteryManagerOpen, setIsMasteryManagerOpen] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);

    const effectiveMineCount = Math.min(Math.max(1, mineCount), Math.max(1, remainingUsage));
    const timeStr = character.currentTime || '08:00';
    const currentHour = parseInt(timeStr.split(':')[0], 10) || 8;
    const isLateNight = currentHour >= 22 || currentHour < 6;

    const handleSetSpecialization = (specId: string) => {
        const newBase = {
            ...base,
            mineSpecializations: { ...(base.mineSpecializations || {}), [instanceId]: specId }
        };
        onUpdateCharacter(
            { ...character, base: newBase },
            `[광산] 채굴 방침을 '${MINE_SPECIALIZATIONS.find(s => s.id === specId)?.name}'으로 변경했습니다.`
        );
        setShowSpecMenu(false);
    };

    const handleMine = executeWithCooldown((zoneId: string, count: number = 1) => {
        if (isLateNight || remainingUsage <= 0) return;
        const actualCount = Math.min(count, remainingUsage);
        const zone = MINE_ZONES.find(z => z.id === zoneId);
        if (!zone || mineLevel < zone.minLevel) return;

        setIsMining(true);
        setTimeout(() => {
            let successCount = 0;
            let failureCount = 0;
            let totalStone = 0,
                totalIron = 0,
                totalManaStone = 0,
                totalManaCrystal = 0,
                totalGold = 0,
                totalSilver = 0,
                totalDiamond = 0,
                totalRuby = 0,
                totalSapphire = 0,
                totalEmerald = 0,
                totalHolyStone = 0,
                totalRareCrystal = 0,
                totalExpGain = 0;

            let totalMasteryLevel = 0;
            assignees.forEach(a => {
                totalMasteryLevel += a.professions?.mining?.level || 1;
            });
            const avgMastery = assignees.length > 0 ? totalMasteryLevel / assignees.length : miningMastery.level;
            const masteryBonus = 1 + avgMastery * 0.03;
            const totalMasteryYieldBonus = Math.floor(totalMasteryLevel * 0.5);
            const specBonus = specialization.bonus as any;

            for (let i = 0; i < actualCount; i++) {
                if (Math.random() < zone.risk / 100) {
                    failureCount++;
                    continue;
                }
                successCount++;
                const stability = Math.min(0.2, avgMastery * 0.002);
                const luck = (0.9 + Math.random() * (0.2 + stability)) * masteryBonus;
                const getYield = (baseYield: number | undefined, bonus: number) => {
                    if (!baseYield) return 0;
                    const ty = baseYield * luck * bonus;
                    return ty < 1 ? (Math.random() < ty ? 1 : 0) : Math.floor(ty);
                };

                totalStone += Math.floor((zone.yields.stone + mineLevel * 3 + totalMasteryYieldBonus) * luck * (specBonus.stone || 1));
                totalIron += Math.floor((zone.yields.iron + mineLevel * 2 + Math.floor(totalMasteryYieldBonus * 0.8)) * luck * (specBonus.iron || 1));
                totalManaStone += Math.floor((zone.yields.manaStone + mineLevel * 2 + Math.floor(totalMasteryYieldBonus * 0.8)) * luck * (specBonus.manaStone || 1));
                totalManaCrystal += getYield(zone.yields.manaCrystal, specBonus.manaCrystal || 1);
                totalGold += getYield((zone.yields as any).gold_ore, specBonus.gold_ore || 1);
                totalSilver += getYield((zone.yields as any).silver_ore, specBonus.silver_ore || 1);

                const gemLuck = luck * (1 + miningMastery.level * 0.01);
                if ((zone.yields as any).diamond && Math.random() < (zone.yields as any).diamond * (specBonus.diamond || 1) * gemLuck) totalDiamond++;
                if ((zone.yields as any).ruby && Math.random() < (zone.yields as any).ruby * (specBonus.ruby || 1) * gemLuck) totalRuby++;
                if ((zone.yields as any).sapphire && Math.random() < (zone.yields as any).sapphire * (specBonus.sapphire || 1) * gemLuck) totalSapphire++;
                if ((zone.yields as any).emerald && Math.random() < (zone.yields as any).emerald * (specBonus.emerald || 1) * gemLuck) totalEmerald++;
                if (base.location?.region === '신계' && zone.id === 'abyss' && Math.random() < 0.1 * gemLuck) totalHolyStone++;
                if (zone.yields.rareCrystal && Math.random() < zone.yields.rareCrystal * gemLuck) totalRareCrystal++;
                totalExpGain += 10 + zone.minLevel * 5;
            }

            const mineTimeMinutes = Math.max(1, Math.floor((actualCount / 10) * (60 / Math.max(1, allMines.length))));
            if (successCount === 0) {
                let newChar = {
                    ...character,
                    base: {
                        ...base,
                        dailyCounts: { ...(base.dailyCounts || {}), [`mine_harvest_${instanceId}`]: currentUsage + actualCount }
                    }
                };
                const timeRes = advanceGameTime(newChar, mineTimeMinutes, { activityName: '광산 채굴' });
                newChar = timeRes.updatedCharacter;
                setResultData({
                    type: 'failure',
                    title: '채굴 실패 (낙반 사고)',
                    message: `${zone.name}에서 ${actualCount}회 채굴을 시도했으나 모두 실패했습니다.`,
                    items: [{ label: '소모 시간', after: `+${mineTimeMinutes}분` }]
                });
                onUpdateCharacter(newChar, `[광산] ${zone.name} 채굴 실패 (낙반 사고)`, timeRes.dailyReport);
                setIsMining(false);
                onSelectZoneId(null);
                return;
            }

            const initialLevel = miningMastery.level;
            const { newChar: charWithExp, leveledUp } = gainProfessionExp(character, 'mining', totalExpGain);
            let newChar = charWithExp;
            const newBase = { ...newChar.base! };
            newBase.dailyCounts = { ...(newBase.dailyCounts || {}), [`mine_harvest_${instanceId}`]: currentUsage + actualCount };
            newBase.resources = {
                ...newBase.resources,
                stone: (newBase.resources.stone || 0) + totalStone,
                iron: (newBase.resources.iron || 0) + totalIron,
                manaStone: (newBase.resources.manaStone || 0) + totalManaStone,
                manaCrystal: (newBase.resources.manaCrystal || 0) + totalManaCrystal,
                rareCrystal: (newBase.resources.rareCrystal || 0) + totalRareCrystal,
                gold_ore: (newBase.resources.gold_ore || 0) + totalGold,
                silver_ore: (newBase.resources.silver_ore || 0) + totalSilver,
                diamond: (newBase.resources.diamond || 0) + totalDiamond,
                ruby: (newBase.resources.ruby || 0) + totalRuby,
                sapphire: (newBase.resources.sapphire || 0) + totalSapphire,
                emerald: (newBase.resources.emerald || 0) + totalEmerald,
                holy_stone: (newBase.resources.holy_stone || 0) + totalHolyStone
            };
            newChar.base = newBase;
            const timeRes = advanceGameTime(newChar, mineTimeMinutes, { activityName: '광산 채굴' });
            newChar = timeRes.updatedCharacter;

            const items: { label: string; after: string }[] = [{ label: '소모 시간', after: `+${mineTimeMinutes}분` }];
            if (totalStone > 0) items.push({ label: '석재', after: `+${totalStone}` });
            if (totalIron > 0) items.push({ label: '철광석', after: `+${totalIron}` });
            if (totalManaStone > 0) items.push({ label: '마석', after: `+${totalManaStone}` });
            if (totalManaCrystal > 0) items.push({ label: '마정석', after: `+${totalManaCrystal}` });
            if (totalGold > 0) items.push({ label: '금광석', after: `+${totalGold}` });
            if (totalDiamond > 0) items.push({ label: '다이아몬드', after: `+${totalDiamond}` });
            if (leveledUp) items.push({ label: '채굴 숙련도 상승', after: `Lv.${initialLevel} → Lv.${newChar.professions!.mining.level}` });

            setResultData({
                type: leveledUp ? 'levelup' : 'success',
                title: `${zone.name} 채굴 완료`,
                message: `${successCount}회 채굴 성공${failureCount > 0 ? ` (${failureCount}회 실패)` : ''}`,
                items
            });
            onUpdateCharacter(newChar, `[광산] ${zone.name} ${actualCount}회 채굴 완료`, timeRes.dailyReport);
            setIsMining(false);
            onSelectZoneId(null);
        }, 900);
    });

    const handleMineAllMines = executeWithCooldown(() => {
        if (isLateNight || totalRemainingMiningCount <= 0) return;
        const availableMines = allMines
            .map(m => ({
                mine: m,
                remaining: Math.max(0, getMiningMaxUsage(m.level || 1) - (base.dailyCounts?.[`mine_harvest_${m.id}`] || 0)),
                level: m.level || 1,
                usage: base.dailyCounts?.[`mine_harvest_${m.id}`] || 0
            }))
            .filter(item => item.remaining > 0);
        if (availableMines.length === 0) return;

        setIsMining(true);
        setTimeout(() => {
            let totalStone = 0,
                totalIron = 0,
                totalManaStone = 0,
                totalManaCrystal = 0,
                totalExp = 0,
                totalTimes = 0;
            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            const newBase = newChar.base!;
            if (!newBase.dailyCounts) newBase.dailyCounts = {};

            availableMines.forEach(({ mine, remaining, level, usage }) => {
                const eligible = MINE_ZONES.filter(z => level >= z.minLevel);
                const zone = eligible[eligible.length - 1] || MINE_ZONES[0];
                const specId = newBase.mineSpecializations?.[mine.id] || 'general';
                const specBonus = (MINE_SPECIALIZATIONS.find(s => s.id === specId) || MINE_SPECIALIZATIONS[0]).bonus as any;
                for (let i = 0; i < remaining; i++) {
                    totalTimes++;
                    if (Math.random() < zone.risk / 100) continue;
                    totalStone += Math.floor((zone.yields.stone + level * 3) * (specBonus.stone || 1));
                    totalIron += Math.floor((zone.yields.iron + level * 2) * (specBonus.iron || 1));
                    totalManaStone += Math.floor((zone.yields.manaStone + level * 2) * (specBonus.manaStone || 1));
                    if (zone.yields.manaCrystal) totalManaCrystal += Math.floor(zone.yields.manaCrystal * (specBonus.manaCrystal || 1));
                    totalExp += 10 + zone.minLevel * 5;
                }
                newBase.dailyCounts[`mine_harvest_${mine.id}`] = usage + remaining;
            });

            newBase.resources.stone = (newBase.resources.stone || 0) + totalStone;
            newBase.resources.iron = (newBase.resources.iron || 0) + totalIron;
            newBase.resources.manaStone = (newBase.resources.manaStone || 0) + totalManaStone;
            newBase.resources.manaCrystal = (newBase.resources.manaCrystal || 0) + totalManaCrystal;
            const { newChar: charWithExp } = gainProfessionExp(newChar, 'mining', totalExp);
            const mins = Math.max(1, Math.floor((totalTimes / 10) * (60 / Math.max(1, allMines.length))));
            const timeRes = advanceGameTime(charWithExp, mins, { activityName: '모든 광산 일괄 채굴' });
            setIsMining(false);
            setResultData({
                type: 'success',
                title: '모든 광산 일괄 채굴 완료',
                message: `${availableMines.length}개 광산에서 총 ${totalTimes}회 채굴을 완료했습니다.`,
                items: [
                    { label: '석재', after: `+${totalStone}` },
                    { label: '철광석', after: `+${totalIron}` },
                    { label: '마석', after: `+${totalManaStone}` },
                    ...(totalManaCrystal > 0 ? [{ label: '마정석', after: `+${totalManaCrystal}` }] : [])
                ]
            });
            onUpdateCharacter(timeRes.updatedCharacter, `[모든 광산] ${totalTimes}회 일괄 채굴 완료`, timeRes.dailyReport);
        }, 900);
    });

    const selectedZone = selectedZoneId ? MINE_ZONES.find(z => z.id === selectedZoneId) : null;

    return (
        <>
            {/* Top Mine HUD */}
            <div className="absolute top-16 left-2 right-2 z-20 flex flex-wrap items-center gap-1.5 pointer-events-none">
                <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-slate-950/95 border border-sky-500/40 rounded-xl px-2.5 py-1.5 shadow-xl">
                    {allMines.length > 1 && (
                        <div className="flex items-center gap-1 mr-1">
                            <button
                                type="button"
                                disabled={currentMineIdx <= 0}
                                onClick={() => onSwitchMineInstance(allMines[currentMineIdx - 1].id)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white"
                            >
                                <ChevronLeft size={13} />
                            </button>
                            <span className="text-[11px] font-black text-sky-300 px-1">
                                제 {currentMineIdx + 1}/{allMines.length} 광산
                            </span>
                            <button
                                type="button"
                                disabled={currentMineIdx >= allMines.length - 1}
                                onClick={() => onSwitchMineInstance(allMines[currentMineIdx + 1].id)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white"
                            >
                                <ChevronRight size={13} />
                            </button>
                        </div>
                    )}

                    <span className="text-[11px] font-black text-amber-300 bg-amber-950/70 border border-amber-500/30 px-2 py-1 rounded-lg">
                        ⛏️ 오늘 남은 채굴 {remainingUsage}/{maxUsage}회
                    </span>

                    <button
                        type="button"
                        onClick={() => setShowSpecMenu(v => !v)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-sky-500/40 text-sky-200 text-[11px] font-black flex items-center gap-1"
                    >
                        <Target size={12} /> 방침: {specialization.name}
                    </button>

                    {allMines.length > 1 && totalRemainingMiningCount > 0 && (
                        <button
                            type="button"
                            disabled={isLateNight || isMining}
                            onClick={handleMineAllMines}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 text-[11px] font-black flex items-center gap-1"
                        >
                            <Sparkles size={12} /> 모든 광산 일괄 채굴 ({totalRemainingMiningCount}회)
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => setIsMasteryManagerOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-[11px] font-black flex items-center gap-1"
                    >
                        <TrendingUp size={12} /> 채굴 Lv.{miningMastery.level}
                    </button>
                </div>
            </div>

            {/* Specialization Dropdown */}
            {showSpecMenu && (
                <div className="absolute top-28 left-2 z-30 w-80 bg-slate-950 border border-sky-500/50 rounded-2xl p-3 shadow-2xl space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-sky-300">⛏️ 광산 채굴 방침 선택</span>
                        <button type="button" onClick={() => setShowSpecMenu(false)} className="text-slate-400 hover:text-white">
                            <X size={14} />
                        </button>
                    </div>
                    <div className="space-y-1.5">
                        {MINE_SPECIALIZATIONS.map(spec => (
                            <button
                                key={spec.id}
                                type="button"
                                onClick={() => handleSetSpecialization(spec.id)}
                                className={`w-full p-2 rounded-xl border text-left ${
                                    specializationId === spec.id
                                        ? 'bg-sky-900/60 border-sky-400 text-white'
                                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                                }`}
                            >
                                <div className="text-xs font-black">{spec.name}</div>
                                <div className="text-[10px] text-slate-400">{spec.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Selected Mining Zone Action Card */}
            {selectedZone && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-lg bg-slate-950 border border-sky-500/60 rounded-2xl p-4 shadow-2xl space-y-3">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="text-sm font-black text-sky-200 flex items-center gap-2">
                                <Mountain size={15} className="text-sky-400" />
                                {selectedZone.name}
                                {mineLevel < selectedZone.minLevel && (
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                                        <Lock size={10} /> 광산 Lv.{selectedZone.minLevel} 필요
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{selectedZone.description}</div>
                            <div className="text-[11px] text-amber-300 mt-1 flex items-center gap-2">
                                <AlertTriangle size={12} /> 붕괴 위험도: {selectedZone.risk}% · 기본 석재 {selectedZone.yields.stone} / 철 {selectedZone.yields.iron} / 마석 {selectedZone.yields.manaStone}
                            </div>
                        </div>
                        <button type="button" onClick={() => onSelectZoneId(null)} className="text-slate-400 hover:text-white p-1">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {[1, 3, 5, remainingUsage].filter((v, idx, arr) => v > 0 && arr.indexOf(v) === idx).map(cnt => (
                            <button
                                key={cnt}
                                type="button"
                                onClick={() => setMineCount(cnt)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                                    effectiveMineCount === cnt
                                        ? 'bg-sky-600 border-sky-400 text-white'
                                        : 'bg-slate-900 border-slate-700 text-slate-300'
                                }`}
                            >
                                {cnt === remainingUsage && cnt > 1 ? `최대 (${cnt}회)` : `${cnt}회`}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        disabled={isLateNight || isMining || remainingUsage <= 0 || mineLevel < selectedZone.minLevel}
                        onClick={() => handleMine(selectedZone.id, effectiveMineCount)}
                        className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-black flex items-center justify-center gap-2"
                    >
                        <Pickaxe size={15} className={isMining ? 'animate-spin' : ''} />
                        {isMining
                            ? '채굴 진행 중...'
                            : isLateNight
                            ? '심야 시간 채굴 불가 (06:00~22:00)'
                            : mineLevel < selectedZone.minLevel
                            ? `광산 Lv.${selectedZone.minLevel} 달성 시 해금`
                            : remainingUsage <= 0
                            ? '오늘 채굴 횟수 소진'
                            : `${selectedZone.name} ${effectiveMineCount}회 채굴 시작`}
                    </button>
                </div>
            )}

            {/* Miner Mastery Modal */}
            {isMasteryManagerOpen && (
                <div className="absolute inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                            <span className="text-sm font-black text-white flex items-center gap-2">
                                <Award size={16} className="text-amber-400" /> 광부 숙련도 관리
                            </span>
                            <button type="button" onClick={() => setIsMasteryManagerOpen(false)} className="text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-3 overflow-y-auto space-y-2.5">
                            {[...character.companions, ...(character.inactiveCompanions || [])]
                                .filter(c => c.job === JobType.MINER || c.job === JobType.SLAVE || (c.job as string) === '노예')
                                .map(miner => {
                                    const mastery = miner.professions?.mining || { level: 1, exp: 0, maxExp: 100 };
                                    const curCfg =
                                        [...MINER_RANK_CONFIGS].reverse().find(cfg => mastery.level >= cfg.rankLevel) ||
                                        MINER_RANK_CONFIGS[0];
                                    const nextIdx = MINER_RANK_CONFIGS.findIndex(cfg => cfg.rankLevel === curCfg.rankLevel) + 1;
                                    const nextCfg = nextIdx < MINER_RANK_CONFIGS.length ? MINER_RANK_CONFIGS[nextIdx] : null;
                                    const str = calculateFinalStats(miner).finalStats.str || 0;
                                    const canProm = Boolean(nextCfg && mastery.level >= nextCfg.rankLevel && str >= (nextCfg.reqStr || 0));
                                    return (
                                        <div key={miner.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-xs font-black text-white">{miner.name}</span>{' '}
                                                    <span className="text-[10px] text-sky-400">{curCfg.label}</span>
                                                </div>
                                                <span className="text-[11px] font-bold text-indigo-300">Lv.{mastery.level}</span>
                                            </div>
                                            {nextCfg && (
                                                <div className="flex items-center justify-between text-[10px] text-slate-400">
                                                    <span>
                                                        다음: {nextCfg.label} (Lv.{nextCfg.rankLevel}, STR {str}/{nextCfg.reqStr})
                                                    </span>
                                                    <button
                                                        type="button"
                                                        disabled={!canProm}
                                                        onClick={() => {
                                                            const nextChar = { ...character };
                                                            const applyProm = (c: Companion) =>
                                                                c.id === miner.id
                                                                    ? {
                                                                          ...c,
                                                                          classType:
                                                                              c.finalClassName && c.finalClassName !== '미정'
                                                                                  ? `${nextCfg.label} (${c.finalClassName})`
                                                                                  : nextCfg.label
                                                                      }
                                                                    : c;
                                                            nextChar.companions = nextChar.companions.map(applyProm);
                                                            if (nextChar.inactiveCompanions)
                                                                nextChar.inactiveCompanions = nextChar.inactiveCompanions.map(applyProm);
                                                            onUpdateCharacter(nextChar, `[광부 승급] ${miner.name}이(가) ${nextCfg.label}(으)로 승급했습니다!`);
                                                        }}
                                                        className="px-2 py-1 rounded bg-amber-600 disabled:bg-slate-800 text-white font-bold flex items-center gap-1"
                                                    >
                                                        <ArrowUpCircle size={12} /> 승급
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}

            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}
        </>
    );
};

export default MineInteriorPanel;
