import React, { useEffect, useMemo, useState } from 'react';
import { Character, Companion, FarmPlot, JobType } from '../../types';
import { FARM_CROPS } from '../../constants';
import { calculateFinalStats, diffDays, FARMER_RANK_CONFIGS, gainProfessionExp } from '../../utils';
import { advanceGameTime } from '../../services/gameTimeService';
import { useActionCooldown } from '../../hooks/useActionCooldown';
import ActionResultModal, { ResultData } from '../ActionResultModal';
import {
    Apple,
    ArrowUpCircle,
    Award,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Droplets,
    Leaf,
    Lock,
    ShoppingCart,
    Shovel,
    Sparkles,
    Sprout,
    Trees,
    TrendingUp,
    User,
    X
} from 'lucide-react';

interface FarmInteriorPanelProps {
    character: Character;
    instanceId: string;
    selectedPlot: number | null;
    onSelectPlot: (idx: number | null) => void;
    onSwitchFarmInstance: (newInstanceId: string) => void;
    onUpdateCharacter: (updatedChar: Character, logMessage: string, dailyReport?: any) => void;
}

const CROP_RESOURCES = [
    'wheat',
    'rice',
    'corn',
    'potato',
    'sweet_potato',
    'onion',
    'garlic',
    'lettuce',
    'mana_fruit',
    'shinryoku_flower',
    'carrot',
    'cabbage',
    'tomato',
    'strawberry',
    'grape',
    'watermelon',
    'ginseng',
    'mandrake',
    'world_tree_branch',
    'golden_apple'
];

const FarmInteriorPanel: React.FC<FarmInteriorPanelProps> = ({
    character,
    instanceId,
    selectedPlot,
    onSelectPlot,
    onSwitchFarmInstance,
    onUpdateCharacter
}) => {
    const { executeWithCooldown } = useActionCooldown(250);
    const base = character.base!;
    const allFarms = useMemo(
        () => (base.layout || []).filter(inst => inst.type === 'farm' && !inst.underConstruction && (inst.level || 0) > 0),
        [base.layout]
    );
    const currentFarmIdx = allFarms.findIndex(inst => inst.id === instanceId);
    const instance = base.layout?.find(inst => inst.id === instanceId) || allFarms[0];
    const farmLevel = instance?.level || 1;
    const gridDimension = farmLevel + 1;
    const totalPlotsCount = gridDimension * gridDimension;

    const initialPlots = base.farmPlots?.[instanceId] || [];
    const plots: FarmPlot[] = useMemo(
        () =>
            Array.from({ length: totalPlotsCount }, (_, i) => {
                if (initialPlots[i]) return initialPlots[i];
                return { id: i, status: 'empty' as const, growthProgress: 0, isWatered: false, quality: 100 };
            }),
        [totalPlotsCount, initialPlots]
    );

    const [showSeedSelection, setShowSeedSelection] = useState(false);
    const [showAutoPlant, setShowAutoPlant] = useState(false);
    const [isMasteryManagerOpen, setIsMasteryManagerOpen] = useState(false);
    const [resultOverlay, setResultOverlay] = useState<{ show: boolean; data: ResultData | null }>({
        show: false,
        data: null
    });

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

    const { totalMasteryYieldBonus, totalYield, foodYield, herbYield } = useMemo(() => {
        let totalMasteryLevel = 0;
        assignees.forEach(a => {
            totalMasteryLevel += a.professions?.farming?.level || 1;
        });
        const avgMastery = assignees.length > 0 ? totalMasteryLevel / assignees.length : 1;
        const masteryBonusMultiplier = 1 + avgMastery * 0.03;
        const bonus = Math.floor(farmLevel * masteryBonusMultiplier) - farmLevel;
        const yieldVal = Math.floor(Math.max(1, farmLevel + bonus) * masteryBonusMultiplier);
        return {
            totalMasteryYieldBonus: bonus,
            totalYield: yieldVal,
            foodYield: yieldVal * 2,
            herbYield: Math.floor((farmLevel * 2 + bonus) * masteryBonusMultiplier)
        };
    }, [assignees, farmLevel]);

    const autoPlantCropId = base.farmAutoPlantConfig?.[instanceId];
    const isHarvestedToday = (base.dailyCounts?.[`farm_harvest_${instanceId}`] || 0) >= 1;
    const readyCountHere = plots.filter(p => p.status === 'ready' || (p.status === 'planted' && p.growthProgress >= 100)).length;

    const allFarmsReadyCount = useMemo(() => {
        let count = 0;
        allFarms.forEach(f => {
            const fPlots = base.farmPlots?.[f.id] || [];
            count += fPlots.filter((p: FarmPlot) => p.status === 'ready' || (p.status === 'planted' && p.growthProgress >= 100)).length;
        });
        return count;
    }, [allFarms, base.farmPlots]);

    const unharvestedFarmsCount = useMemo(
        () => allFarms.filter(f => (base.dailyCounts?.[`farm_harvest_${f.id}`] || 0) < 1).length,
        [allFarms, base.dailyCounts]
    );

    const timeStr = character.currentTime || '08:00';
    const currentHour = parseInt(timeStr.split(':')[0], 10) || 8;
    const isLateNight = currentHour >= 22 || currentHour < 6;

    const updateFarmingExp = (charToUpdate: Character, expAmount: number, targetAssigneeIds?: string[]) => {
        const expResult = gainProfessionExp(charToUpdate, 'farming', expAmount);
        const char = expResult.newChar;
        const allComps = [...(char.companions || []), ...(char.inactiveCompanions || [])];
        const targetIds =
            targetAssigneeIds && targetAssigneeIds.length > 0
                ? targetAssigneeIds
                : allComps
                      .filter(c => c.job === JobType.FARMER || c.job === JobType.SLAVE || (c.job as string) === '노예')
                      .map(c => c.id);

        const updateCompanionFarming = (comp: Companion): Companion => {
            if (!targetIds.includes(comp.id)) return comp;
            if (comp.job !== JobType.FARMER && comp.job !== JobType.SLAVE && (comp.job as string) !== '노예') return comp;
            const c = { ...comp };
            if (!c.professions) c.professions = {};
            if (!c.professions.farming) c.professions.farming = { level: 1, exp: 0, maxExp: 100 };
            const mastery = { ...c.professions.farming };
            const oldLvl = mastery.level || 1;
            if (!mastery.maxExp || mastery.maxExp <= 0) mastery.maxExp = 100;
            mastery.exp = (mastery.exp || 0) + expAmount;
            while (mastery.exp >= mastery.maxExp) {
                mastery.exp -= mastery.maxExp;
                mastery.level = (mastery.level || 1) + 1;
                mastery.maxExp = Math.floor(mastery.maxExp * 1.2);
            }
            if (mastery.level !== oldLvl) {
                let jobTitle = '견습 농부';
                const lv = mastery.level;
                if (lv >= 100) jobTitle = '전설 농부';
                else if (lv >= 80) jobTitle = '명인 농부';
                else if (lv >= 50) jobTitle = '장인 농부';
                else if (lv >= 20) jobTitle = '숙련 농부';
                else if (lv >= 10) jobTitle = '일반 농부';
                const baseClass = c.finalClassName || c.lastClassName || c.secondClassName || c.firstClassName;
                c.classType = baseClass && baseClass !== '미정' ? `${jobTitle} (${baseClass})` : jobTitle;
            }
            c.professions.farming = mastery;
            return c;
        };

        if (char.companions) char.companions = char.companions.map(updateCompanionFarming);
        if (char.inactiveCompanions) char.inactiveCompanions = char.inactiveCompanions.map(updateCompanionFarming);
        return {
            updatedChar: char,
            leveledUp: expResult.leveledUp,
            oldLevel: expResult.oldLevel,
            newLevel: expResult.newLevel
        };
    };

    // 날짜 경과 및 담당자 자동 관리 (FarmModal.tsx와 동일)
    useEffect(() => {
        if (!character.currentDate) return;
        let changed = false;
        const newPlots = [...plots];
        const currentDate = character.currentDate;
        const newBase = JSON.parse(JSON.stringify(base));
        let currentMoney = character.money;

        newPlots.forEach((plot, idx) => {
            let plotChanged = false;
            const currentPlot = { ...plot };

            if (currentPlot.status === 'planted' && currentPlot.plantedDate) {
                const crop = FARM_CROPS.find(c => c.id === currentPlot.cropId);
                if (crop) {
                    if (!currentPlot.isWatered) {
                        if (diffDays(currentPlot.plantedDate, currentDate) >= 3) {
                            currentPlot.status = 'empty';
                            currentPlot.growthProgress = 0;
                            currentPlot.isWatered = false;
                            plotChanged = true;
                        }
                    } else if (assignees.length > 0 || currentPlot.isWatered) {
                        const daysPassed = diffDays(currentPlot.plantedDate, currentDate);
                        const newProgress = Math.min(100, Math.floor((daysPassed / crop.growthDays) * 100));
                        if (newProgress !== currentPlot.growthProgress) {
                            currentPlot.growthProgress = newProgress;
                            if (newProgress >= 100) currentPlot.status = 'ready';
                            plotChanged = true;
                        }
                    }
                }
            }

            if (assignees.length > 0) {
                if (currentPlot.status === 'ready') {
                    const crop = FARM_CROPS.find(c => c.id === currentPlot.cropId);
                    if (crop) {
                        const yieldAmount = crop.yield + totalMasteryYieldBonus;
                        if (crop.id === 'herb') {
                            newBase.resources.herbs = (newBase.resources.herbs || 0) + yieldAmount;
                        } else if (CROP_RESOURCES.includes(crop.id)) {
                            newBase.resources[crop.id] = (newBase.resources[crop.id] || 0) + yieldAmount;
                            newBase.resources.food += yieldAmount;
                        } else {
                            newBase.resources.food += yieldAmount * 2;
                        }
                        currentPlot.status = 'empty';
                        currentPlot.growthProgress = 0;
                        currentPlot.isWatered = false;
                        plotChanged = true;
                    }
                }
                if (currentPlot.status === 'empty') {
                    currentPlot.status = 'plowed';
                    plotChanged = true;
                }
                if (currentPlot.status === 'plowed' && autoPlantCropId) {
                    const crop = FARM_CROPS.find(c => c.id === autoPlantCropId);
                    if (crop && farmLevel >= crop.minLevel && currentMoney >= crop.seedPrice) {
                        currentMoney -= crop.seedPrice;
                        currentPlot.status = 'planted';
                        currentPlot.cropId = autoPlantCropId;
                        currentPlot.plantedDate = currentDate;
                        currentPlot.growthProgress = 0;
                        currentPlot.isWatered = true;
                        plotChanged = true;
                    }
                }
                if (currentPlot.status === 'planted' && !currentPlot.isWatered) {
                    currentPlot.isWatered = true;
                    plotChanged = true;
                }
            }

            if (plotChanged) {
                newPlots[idx] = currentPlot;
                changed = true;
            }
        });

        if (changed) {
            if (!newBase.farmPlots) newBase.farmPlots = {};
            newBase.farmPlots[instanceId] = newPlots;
            onUpdateCharacter({ ...character, money: currentMoney, base: newBase }, '[농장] 작물 성장 및 자동 관리를 동기화했습니다.');
        }
    }, [character.currentDate, instanceId, assignees.length, autoPlantCropId]);

    const updatePlot = (plotId: number, updates: Partial<FarmPlot>, logMsg: string) => {
        const newPlots = [...plots];
        newPlots[plotId] = { ...newPlots[plotId], ...updates };
        const newBase = { ...base, farmPlots: { ...(base.farmPlots || {}), [instanceId]: newPlots } };
        onUpdateCharacter({ ...character, base: newBase }, logMsg);
    };

    const handlePlow = (plotId: number) => {
        updatePlot(plotId, { status: 'plowed' }, `[농장] #${plotId + 1} 밭을 개간했습니다.`);
    };

    const handleWater = (plotId: number) => {
        updatePlot(
            plotId,
            { isWatered: true, growthProgress: Math.min(100, (plots[plotId]?.growthProgress || 0) + 5) },
            `[농장] #${plotId + 1} 작물에 물을 주었습니다.`
        );
    };

    const handlePlant = (plotId: number, cropId: string) => {
        const crop = FARM_CROPS.find(c => c.id === cropId);
        if (!crop || character.money < crop.seedPrice) return;
        const newPlots = [...plots];
        newPlots[plotId] = {
            ...newPlots[plotId],
            status: 'planted',
            cropId,
            plantedDate: character.currentDate || new Date().toISOString().split('T')[0],
            growthProgress: 0,
            isWatered: false
        };
        const newBase = { ...base, farmPlots: { ...(base.farmPlots || {}), [instanceId]: newPlots } };
        onUpdateCharacter(
            { ...character, money: character.money - crop.seedPrice, base: newBase },
            `[농장] #${plotId + 1}에 ${crop.name} 씨앗을 심었습니다.`
        );
        setShowSeedSelection(false);
        onSelectPlot(null);
    };

    const handleHarvest = executeWithCooldown((plotId: number) => {
        if (isLateNight) return;
        const plot = plots[plotId];
        const crop = FARM_CROPS.find(c => c.id === plot?.cropId);
        if (!crop) return;

        const yieldAmount = crop.yield + totalMasteryYieldBonus;
        const newBase = JSON.parse(JSON.stringify(base));
        if (crop.id === 'herb') {
            newBase.resources.herbs = (newBase.resources.herbs || 0) + yieldAmount;
        } else if (CROP_RESOURCES.includes(crop.id)) {
            newBase.resources[crop.id] = (newBase.resources[crop.id] || 0) + yieldAmount;
            newBase.resources.food += yieldAmount;
        } else {
            newBase.resources.food += yieldAmount * 2;
        }

        const newPlots = [...plots];
        newPlots[plotId] = { id: plotId, status: 'empty', growthProgress: 0, isWatered: false, quality: 100 };
        if (!newBase.farmPlots) newBase.farmPlots = {};
        newBase.farmPlots[instanceId] = newPlots;

        let newChar = JSON.parse(JSON.stringify(character)) as Character;
        newChar.base = newBase;
        const expGain = 10 + crop.minLevel * 5 + crop.growthDays * 3;
        const expResult = updateFarmingExp(newChar, expGain, assignees.map(a => a.id));
        newChar = expResult.updatedChar;

        onUpdateCharacter(newChar, `[농장] ${crop.name}을(를) 수확했습니다. (농사 숙련도 +${expGain})`);
        onSelectPlot(null);
        setResultOverlay({
            show: true,
            data: {
                type: 'success',
                title: '작물 수확 완료',
                message: `${crop.name}을(를) 수확했습니다.`,
                items: [
                    { label: '수확량', after: `${yieldAmount}` },
                    { label: '농사 숙련도 EXP', after: `+${expGain}` }
                ]
            }
        });
    });

    const handleHarvestAll = executeWithCooldown(() => {
        if (isLateNight || readyCountHere === 0) return;
        const readyPlotIndices = plots
            .map((p, idx) => ({ plot: p, idx }))
            .filter(item => item.plot.status === 'ready' || (item.plot.status === 'planted' && item.plot.growthProgress >= 100));
        const newBase = JSON.parse(JSON.stringify(base));
        const newPlots = [...plots];
        let totalExpGain = 0;
        const summary: Record<string, number> = {};

        readyPlotIndices.forEach(({ plot, idx }) => {
            const crop = FARM_CROPS.find(c => c.id === plot.cropId);
            if (!crop) return;
            const yieldAmount = crop.yield + totalMasteryYieldBonus;
            summary[crop.name] = (summary[crop.name] || 0) + yieldAmount;
            if (crop.id === 'herb') newBase.resources.herbs = (newBase.resources.herbs || 0) + yieldAmount;
            else if (CROP_RESOURCES.includes(crop.id)) {
                newBase.resources[crop.id] = (newBase.resources[crop.id] || 0) + yieldAmount;
                newBase.resources.food += yieldAmount;
            } else newBase.resources.food += yieldAmount * 2;
            newPlots[idx] = { id: idx, status: 'empty', growthProgress: 0, isWatered: false, quality: 100 };
            totalExpGain += 10 + crop.minLevel * 5 + crop.growthDays * 3;
        });

        if (!newBase.farmPlots) newBase.farmPlots = {};
        newBase.farmPlots[instanceId] = newPlots;
        let newChar = JSON.parse(JSON.stringify(character)) as Character;
        newChar.base = newBase;
        const expResult = updateFarmingExp(newChar, totalExpGain, assignees.map(a => a.id));
        newChar = expResult.updatedChar;
        onUpdateCharacter(newChar, `[농장] 작물 ${readyPlotIndices.length}개를 일괄 수확했습니다. (농사 숙련도 +${totalExpGain})`);
        onSelectPlot(null);
        setResultOverlay({
            show: true,
            data: {
                type: 'success',
                title: '현재 농장 일괄 수확 완료',
                message: `총 ${readyPlotIndices.length}개 작물을 수확했습니다.`,
                items: [
                    ...Object.entries(summary).map(([name, cnt]) => ({ label: name, after: `+${cnt}` })),
                    { label: '농사 숙련도 EXP', after: `+${totalExpGain}` }
                ]
            }
        });
    });

    const handleResourceHarvest = () => {
        if (isLateNight || isHarvestedToday) return;
        const newBase = JSON.parse(JSON.stringify(base));
        if (!newBase.dailyCounts) newBase.dailyCounts = {};
        newBase.dailyCounts[`farm_harvest_${instanceId}`] = 1;
        newBase.resources.food += foodYield;
        newBase.resources.wood += totalYield * 2;
        newBase.resources.herbs = (newBase.resources.herbs || 0) + herbYield;

        let newChar = JSON.parse(JSON.stringify(character)) as Character;
        newChar.base = newBase;
        newChar = updateFarmingExp(newChar, 15, assignees.map(a => a.id)).updatedChar;
        const minutesToAdvance = Math.max(1, Math.floor(60 / Math.max(1, allFarms.length)));
        const timeRes = advanceGameTime(newChar, minutesToAdvance, { activityName: '농장 자원 수확' });
        newChar = timeRes.updatedCharacter;

        onUpdateCharacter(
            newChar,
            `[농장] 일일 자원을 수확했습니다. (시간 +${minutesToAdvance}분, 농사 숙련도 +15)`,
            timeRes.dailyReport
        );
        setResultOverlay({
            show: true,
            data: {
                type: 'success',
                title: '일일 자원 수확 완료',
                message: '농장 주변 자원을 채집했습니다.',
                items: [
                    { label: '식량', after: `+${foodYield}` },
                    { label: '목재', after: `+${totalYield * 2}` },
                    { label: '약초', after: `+${herbYield}` }
                ]
            }
        });
    };

    const handleSetAutoPlant = (cropId: string | null) => {
        const newBase = JSON.parse(JSON.stringify(base));
        if (!newBase.farmAutoPlantConfig) newBase.farmAutoPlantConfig = {};
        if (cropId) newBase.farmAutoPlantConfig[instanceId] = cropId;
        else delete newBase.farmAutoPlantConfig[instanceId];
        onUpdateCharacter({ ...character, base: newBase }, '[농장] 자동 재배 지시를 변경했습니다.');
    };

    const selectedPlotObj = selectedPlot !== null ? plots[selectedPlot] : null;

    return (
        <>
            {/* Top-Left Farm Quick Controls Bar */}
            <div className="absolute top-16 left-2 right-2 z-20 flex flex-wrap items-center gap-1.5 pointer-events-none">
                <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-slate-950/95 border border-emerald-500/40 rounded-xl px-2.5 py-1.5 shadow-xl">
                    {allFarms.length > 1 && (
                        <div className="flex items-center gap-1 mr-1">
                            <button
                                type="button"
                                disabled={currentFarmIdx <= 0}
                                onClick={() => onSwitchFarmInstance(allFarms[currentFarmIdx - 1].id)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white"
                            >
                                <ChevronLeft size={13} />
                            </button>
                            <span className="text-[11px] font-black text-emerald-300 px-1">
                                제 {currentFarmIdx + 1}/{allFarms.length} 농장
                            </span>
                            <button
                                type="button"
                                disabled={currentFarmIdx >= allFarms.length - 1}
                                onClick={() => onSwitchFarmInstance(allFarms[currentFarmIdx + 1].id)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white"
                            >
                                <ChevronRight size={13} />
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        disabled={isHarvestedToday || isLateNight}
                        onClick={handleResourceHarvest}
                        className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-white text-[11px] font-black flex items-center gap-1"
                        title={`식량 +${foodYield}, 목재 +${totalYield * 2}, 약초 +${herbYield}`}
                    >
                        <Leaf size={12} />
                        {isLateNight ? '심야 불가' : isHarvestedToday ? '일일 수확 완료' : `일일 자원 수확 (+${foodYield}식량)`}
                    </button>

                    {readyCountHere > 0 && (
                        <button
                            type="button"
                            disabled={isLateNight}
                            onClick={handleHarvestAll}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 text-[11px] font-black flex items-center gap-1 animate-pulse"
                        >
                            <Sparkles size={12} /> 작물 일괄 수확 ({readyCountHere})
                        </button>
                    )}

                    {assignees.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowAutoPlant(v => !v)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-200 text-[11px] font-black flex items-center gap-1"
                        >
                            <ShoppingCart size={12} /> 자동재배 {autoPlantCropId ? 'ON' : '설정'}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => setIsMasteryManagerOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-[11px] font-black flex items-center gap-1"
                    >
                        <TrendingUp size={12} /> 숙련도 Lv.{character.professions?.farming?.level || 1}
                    </button>

                    {allFarms.length > 1 && (allFarmsReadyCount > 0 || unharvestedFarmsCount > 0) && (
                        <span className="text-[10px] text-slate-400 px-1">
                            전체 농장 수확대기 {allFarmsReadyCount}
                        </span>
                    )}
                </div>
            </div>

            {/* Auto-Plant Dropdown */}
            {showAutoPlant && assignees.length > 0 && (
                <div className="absolute top-28 left-2 z-30 w-80 bg-slate-950 border border-amber-500/50 rounded-2xl p-3 shadow-2xl space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-300">🌾 담당 농부 자동 재배 지시</span>
                        <button type="button" onClick={() => setShowAutoPlant(false)} className="text-slate-400 hover:text-white">
                            <X size={14} />
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {FARM_CROPS.filter(c => farmLevel >= c.minLevel).map(crop => (
                            <button
                                key={crop.id}
                                type="button"
                                onClick={() => handleSetAutoPlant(crop.id)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${
                                    autoPlantCropId === crop.id
                                        ? 'bg-amber-600 border-amber-400 text-white'
                                        : 'bg-slate-900 border-slate-700 text-slate-300'
                                }`}
                            >
                                {crop.name} ({crop.seedPrice}G)
                            </button>
                        ))}
                        {autoPlantCropId && (
                            <button
                                type="button"
                                onClick={() => handleSetAutoPlant(null)}
                                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-900/70 text-rose-200 border border-rose-500/40"
                            >
                                지시 취소
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Selected Plot Action Card (Bottom) */}
            {selectedPlot !== null && selectedPlotObj && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-lg bg-slate-950 border border-emerald-500/60 rounded-2xl p-4 shadow-2xl space-y-3">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="text-sm font-black text-emerald-200 flex items-center gap-2">
                                <Sprout size={15} className="text-emerald-400" />
                                경작지 #{selectedPlot + 1} ({gridDimension}×{gridDimension} 구획)
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                                상태:{' '}
                                {selectedPlotObj.status === 'empty'
                                    ? '황무지 (밭 갈기 필요)'
                                    : selectedPlotObj.status === 'plowed'
                                    ? '개간됨 (씨앗 심기 가능)'
                                    : selectedPlotObj.status === 'ready' || selectedPlotObj.growthProgress >= 100
                                    ? `✨ ${FARM_CROPS.find(c => c.id === selectedPlotObj.cropId)?.name || '작물'} 수확 대기!`
                                    : `🌱 ${FARM_CROPS.find(c => c.id === selectedPlotObj.cropId)?.name || '작물'} 성장 중 (${selectedPlotObj.growthProgress}%)`}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                onSelectPlot(null);
                                setShowSeedSelection(false);
                            }}
                            className="text-slate-400 hover:text-white p-1"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {!showSeedSelection ? (
                        <div className="flex gap-2">
                            {selectedPlotObj.status === 'empty' && (
                                <button
                                    type="button"
                                    onClick={() => handlePlow(selectedPlot)}
                                    className="flex-1 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-xs font-black flex items-center justify-center gap-1.5"
                                >
                                    <Shovel size={15} /> 밭 갈기
                                </button>
                            )}
                            {selectedPlotObj.status === 'plowed' && (
                                <button
                                    type="button"
                                    onClick={() => setShowSeedSelection(true)}
                                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5"
                                >
                                    <Sprout size={15} /> 씨앗 선택 및 심기
                                </button>
                            )}
                            {selectedPlotObj.status === 'planted' && selectedPlotObj.growthProgress < 100 && (
                                <>
                                    <button
                                        type="button"
                                        disabled={selectedPlotObj.isWatered}
                                        onClick={() => handleWater(selectedPlot)}
                                        className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-black flex items-center justify-center gap-1.5"
                                    >
                                        <Droplets size={15} /> {selectedPlotObj.isWatered ? '물 공급 완료' : '물 주기 (+5%)'}
                                    </button>
                                    <span className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold flex items-center gap-1">
                                        <Clock size={14} /> 성장 대기
                                    </span>
                                </>
                            )}
                            {(selectedPlotObj.status === 'ready' ||
                                (selectedPlotObj.status === 'planted' && selectedPlotObj.growthProgress >= 100)) && (
                                <button
                                    type="button"
                                    disabled={isLateNight}
                                    onClick={() => handleHarvest(selectedPlot)}
                                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5"
                                >
                                    <CheckCircle2 size={15} /> {isLateNight ? '심야 시간 수확 불가' : '작물 수확하기'}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                            {FARM_CROPS.map(crop => {
                                const locked = farmLevel < crop.minLevel;
                                const affordable = character.money >= crop.seedPrice;
                                return (
                                    <button
                                        key={crop.id}
                                        type="button"
                                        disabled={locked || !affordable}
                                        onClick={() => handlePlant(selectedPlot, crop.id)}
                                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 disabled:opacity-40 flex items-center justify-between text-left"
                                    >
                                        <div>
                                            <div className="text-xs font-black text-white flex items-center gap-1.5">
                                                {locked ? <Lock size={12} className="text-rose-400" /> : <Sprout size={12} className="text-emerald-400" />}
                                                {crop.name}
                                                {locked && <span className="text-[10px] text-rose-400">(Lv.{crop.minLevel})</span>}
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                성장 {crop.growthDays}일 · 예상 수확 {crop.yield}
                                            </div>
                                        </div>
                                        <span className={`text-xs font-black ${affordable ? 'text-amber-400' : 'text-rose-400'}`}>
                                            {crop.seedPrice} G
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Farmer Mastery Modal */}
            {isMasteryManagerOpen && (
                <div className="absolute inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                            <span className="text-sm font-black text-white flex items-center gap-2">
                                <Award size={16} className="text-amber-400" /> 농부 숙련도 관리
                            </span>
                            <button type="button" onClick={() => setIsMasteryManagerOpen(false)} className="text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-3 overflow-y-auto space-y-2.5">
                            {[...character.companions, ...(character.inactiveCompanions || [])]
                                .filter(c => c.job === JobType.FARMER || c.job === JobType.SLAVE || (c.job as string) === '노예')
                                .map(farmer => {
                                    const mastery = farmer.professions?.farming || { level: 1, exp: 0, maxExp: 100 };
                                    const curCfg =
                                        [...FARMER_RANK_CONFIGS].reverse().find(cfg => mastery.level >= cfg.rankLevel) ||
                                        FARMER_RANK_CONFIGS[0];
                                    const nextIdx = FARMER_RANK_CONFIGS.findIndex(cfg => cfg.rankLevel === curCfg.rankLevel) + 1;
                                    const nextCfg = nextIdx < FARMER_RANK_CONFIGS.length ? FARMER_RANK_CONFIGS[nextIdx] : null;
                                    const str = calculateFinalStats(farmer).finalStats.str || 0;
                                    const canProm = Boolean(nextCfg && mastery.level >= nextCfg.rankLevel && str >= (nextCfg.reqStr || 0));
                                    return (
                                        <div key={farmer.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-xs font-black text-white">{farmer.name}</span>{' '}
                                                    <span className="text-[10px] text-emerald-400">{curCfg.label}</span>
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
                                                                c.id === farmer.id
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
                                                            onUpdateCharacter(nextChar, `[농부 승급] ${farmer.name}이(가) ${nextCfg.label}(으)로 승급했습니다!`);
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

            {resultOverlay.show && (
                <ActionResultModal data={resultOverlay.data} onClose={() => setResultOverlay({ show: false, data: null })} />
            )}
        </>
    );
};

export default FarmInteriorPanel;
