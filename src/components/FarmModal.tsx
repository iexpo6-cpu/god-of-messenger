import React, { useState, useEffect, useMemo } from 'react';
import { Character, FarmPlot, WeaponType, JobType, Companion } from '../types';
import { FARM_CROPS, FACILITY_UPGRADE_CONFIG } from '../constants';
import { X, Sprout, Droplets, Shovel, CheckCircle2, AlertCircle, Info, ArrowRight, ShoppingCart, Clock, Leaf, Trees, Apple, ArrowUpCircle, User, Lock, TrendingUp, Award, ChevronRight, ChevronLeft, Sparkles, Hammer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateFinalStats, diffDays, gainProfessionExp, FARMER_RANK_CONFIGS } from '../utils';
import { advanceGameTime } from '../services/gameTimeService';
import { getConstructionRemainingTime } from '../services/baseConstructionService';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { useActionCooldown } from '../hooks/useActionCooldown';

interface Props {
    character: Character;
    instanceId: string;
    onClose: () => void;
    onUpdateBase: (newBase: any) => void;
    onUpdateCharacter: (newChar: Character, message: string, dailyReport?: any) => void;
    onFacilityUpgrade?: (facilityId: string) => void;
    onChangeInstanceId?: (newInstanceId: string) => void;
}

const FarmModal: React.FC<Props> = ({ character, instanceId, onClose, onUpdateBase, onUpdateCharacter, onFacilityUpgrade, onChangeInstanceId }) => {
    const { executeWithCooldown } = useActionCooldown(250);
    const [currentInstanceId, setCurrentInstanceId] = useState<string>(instanceId);

    useEffect(() => {
        setCurrentInstanceId(instanceId);
    }, [instanceId]);

    const base = character.base!;
    const allFarms = useMemo(() => (base.layout || []).filter(inst => inst.type === 'farm' && !inst.underConstruction && (inst.level || 0) > 0), [base.layout]);
    const currentFarmIdx = allFarms.findIndex(inst => inst.id === currentInstanceId);
    const farmNumber = currentFarmIdx >= 0 ? currentFarmIdx + 1 : 1;

    const instance = base.layout?.find(inst => inst.id === currentInstanceId);

    // 공사 중인 농장이 지정된 경우, 완공된 농장이 있으면 자동 전환
    useEffect(() => {
        if (instance?.underConstruction && allFarms.length > 0) {
            setCurrentInstanceId(allFarms[0].id);
        }
    }, [instance, allFarms]);
    const farmLevel = instance?.level || 1;
    const gridDimension = farmLevel + 1;
    const totalPlotsCount = gridDimension * gridDimension;

    const initialPlots = base.farmPlots?.[currentInstanceId] || [];
    const plots: FarmPlot[] = useMemo(() => {
        return Array.from({ length: totalPlotsCount }, (_, i) => {
            if (initialPlots[i]) return initialPlots[i];
            return {
                id: i,
                status: 'empty' as const,
                growthProgress: 0,
                isWatered: false,
                quality: 100
            };
        });
    }, [totalPlotsCount, initialPlots]);

    const [selectedPlot, setSelectedPlot] = useState<number | null>(null);
    const [showSeedSelection, setShowSeedSelection] = useState(false);
    const [resultOverlay, setResultOverlay] = useState<{ show: boolean, data: ResultData | null }>({ show: false, data: null });
    const [isMasteryManagerOpen, setIsMasteryManagerOpen] = useState(false);
    
    const assigneeIds = useMemo(() => base.multiAssignments?.[currentInstanceId] || (base.assignments?.[currentInstanceId] ? [base.assignments?.[currentInstanceId] as string] : []), [base.multiAssignments, base.assignments, currentInstanceId]);
    const assignees = useMemo(() => [...character.companions, ...(character.inactiveCompanions || [])].filter(c => assigneeIds.includes(c.id)), [character.companions, character.inactiveCompanions, assigneeIds]);
    
    // Calculate total yield bonus from all assignees
    const { totalMasteryYieldBonus, totalYield, foodYield, herbYield } = useMemo(() => {
        let totalMasteryLevel = 0;
        assignees.forEach(a => {
            totalMasteryLevel += a.professions?.farming?.level || 1;
        });

        const avgMastery = assignees.length > 0 ? totalMasteryLevel / assignees.length : 1;
        const masteryBonusMultiplier = 1 + (avgMastery * 0.03);
        const bonus = Math.floor(farmLevel * masteryBonusMultiplier) - farmLevel;
        const yieldVal = Math.floor(Math.max(1, farmLevel + bonus) * masteryBonusMultiplier);
        return {
            totalMasteryYieldBonus: bonus,
            totalYield: yieldVal,
            foodYield: yieldVal * 2,
            herbYield: Math.floor(((farmLevel * 2) + bonus) * masteryBonusMultiplier)
        };
    }, [assignees, farmLevel]);

    const autoPlantCropId = base.farmAutoPlantConfig?.[currentInstanceId];
    const isHarvestedToday = (base.dailyCounts?.[`farm_harvest_${currentInstanceId}`] || 0) >= 1;

    // [NEW] 모든 농장의 수확 가능한 총 작물 수 계산
    const allFarmsReadyCount = useMemo(() => {
        let count = 0;
        allFarms.forEach(f => {
            const fPlots = base.farmPlots?.[f.id] || [];
            count += fPlots.filter((p: FarmPlot) => p.status === 'ready' || (p.status === 'planted' && p.growthProgress >= 100)).length;
        });
        return count;
    }, [allFarms, base.farmPlots]);

    // [NEW] 모든 농장 중 일일 자원 미수확 농장 수
    const unharvestedFarmsCount = useMemo(() => {
        return allFarms.filter(f => (base.dailyCounts?.[`farm_harvest_${f.id}`] || 0) < 1).length;
    }, [allFarms, base.dailyCounts]);

    // 시간대 확인 (주간: 06:00 ~ 21:59, 심야: 22:00 ~ 05:59)
    const timeStr = character.currentTime || '08:00';
    const currentHour = parseInt(timeStr.split(':')[0], 10) || 8;
    const isLateNight = currentHour >= 22 || currentHour < 6;

    const handleSwitchFarm = (newId: string) => {
        setCurrentInstanceId(newId);
        setSelectedPlot(null);
        setShowSeedSelection(false);
        if (onChangeInstanceId) {
            onChangeInstanceId(newId);
        }
    };

    // [NEW] 자동 관리 및 성장 로직
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
            
            // 1. 날짜 기반 성장 업데이트 및 작물 죽음 로직
            if (currentPlot.status === 'planted' && currentPlot.plantedDate) {
                const crop = FARM_CROPS.find(c => c.id === currentPlot.cropId);
                if (crop) {
                    // 물이 없으면 죽음 (3일 이상)
                    if (!currentPlot.isWatered) {
                        const daysUnwatered = diffDays(currentPlot.plantedDate, currentDate);
                        if (daysUnwatered >= 3) {
                            currentPlot.status = 'empty';
                            currentPlot.growthProgress = 0;
                            currentPlot.isWatered = false;
                            plotChanged = true;
                        }
                    } else {
                        // 담당자가 있거나, 물이 주어져 있는 상태여야 성장함
                        if (assignees.length > 0 || currentPlot.isWatered) {
                            const daysPassed = diffDays(currentPlot.plantedDate, currentDate);
                            const newProgress = Math.min(100, Math.floor((daysPassed / crop.growthDays) * 100));
                            
                            if (newProgress !== currentPlot.growthProgress) {
                                currentPlot.growthProgress = newProgress;
                                if (newProgress >= 100) {
                                    currentPlot.status = 'ready';
                                }
                                plotChanged = true;
                            }
                        }
                    }
                }
            }

            // 2. 담당자가 있을 경우 자동 관리
            if (assignees.length > 0) {
                // 2-1. 자동 수확
                if (currentPlot.status === 'ready') {
                    const farmExpGain = 5; 
                    
                    const crop = FARM_CROPS.find(c => c.id === currentPlot.cropId);
                    if (crop) {
                        const yieldAmount = crop.yield + totalMasteryYieldBonus;
                        const cropResources = [
                            'wheat', 'rice', 'corn', 'potato', 'sweet_potato', 'onion', 'garlic', 'lettuce', 'mana_fruit', 'shinryoku_flower',
                            'carrot', 'cabbage', 'tomato', 'strawberry', 'grape', 'watermelon', 'ginseng', 'mandrake', 'world_tree_branch', 'golden_apple'
                        ];
                        
                        if (crop.id === 'herb') {
                            newBase.resources.herbs = (newBase.resources.herbs || 0) + yieldAmount;
                        } else if (cropResources.includes(crop.id)) {
                            // @ts-ignore
                            newBase.resources[crop.id] = (newBase.resources[crop.id] || 0) + yieldAmount;
                            newBase.resources.food += yieldAmount;
                        } else {
                            newBase.resources.food += yieldAmount * 2;
                        }
                        
                        currentPlot.status = 'empty';
                        currentPlot.growthProgress = 0;
                        currentPlot.isWatered = false;
                        plotChanged = true;

                        // [NEW] 숙련도 획득 (모든 참여 농부들에게 경험치 분배)
                        assignees.forEach(a => {
                            if (a.job === JobType.FARMER || a.job === JobType.SLAVE || (a.job as string) === '노예') {
                                if (!a.professions) a.professions = {};
                                if (!a.professions.farming) a.professions.farming = { level: 1, exp: 0, maxExp: 100 };
                                
                                const mastery = a.professions.farming;
                                const oldLevel = mastery.level;
                                mastery.exp += farmExpGain;
                                while (mastery.exp >= mastery.maxExp) {
                                    mastery.exp -= mastery.maxExp;
                                    mastery.level += 1;
                                    mastery.maxExp = Math.floor(mastery.maxExp * 1.2);
                                }
                                
                                // [NEW] 레벨업 시 칭호(ClassType) 갱신
                                if (mastery.level !== oldLevel) {
                                    let jobTitle = "견습 농부";
                                    const level = mastery.level;
                                    if (level >= 100) jobTitle = '전설 농부';
                                    else if (level >= 80) jobTitle = '명인 농부';
                                    else if (level >= 50) jobTitle = '장인 농부';
                                    else if (level >= 20) jobTitle = '숙련 농부';
                                    else if (level >= 10) jobTitle = '일반 농부';
                                    
                                    const baseClass = a.finalClassName || a.lastClassName || a.secondClassName || a.firstClassName;
                                    a.classType = (baseClass && baseClass !== '미정') ? `${jobTitle} (${baseClass})` : jobTitle;
                                }
                                changed = true;
                            }
                        });
                    }
                }

                // 2-2. 자동 밭갈기
                if (currentPlot.status === 'empty') {
                    currentPlot.status = 'plowed';
                    plotChanged = true;
                }

                // 2-3. 자동 씨앗 심기
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

                // 2-4. 자동 물주기
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
            newBase.farmPlots[currentInstanceId] = newPlots;
            
            // [NEW] 캐릭터/동료 데이터 동기화
            const updatedChar = { ...character, money: currentMoney };
            assignees.forEach(a => {
                if (updatedChar.companions.some(c => c.id === a.id)) {
                    updatedChar.companions = updatedChar.companions.map(c => c.id === a.id ? a : c);
                } else if (updatedChar.inactiveCompanions) {
                    updatedChar.inactiveCompanions = updatedChar.inactiveCompanions.map(c => c.id === a.id ? a : c);
                }
            });
            newBase.characterUpdate = updatedChar;
            
            onUpdateBase(newBase);
        }
    }, [character.currentDate, currentInstanceId, assignees.length, autoPlantCropId]);

    /**
     * 플레이어 및 농부 동료들의 농사 숙련도를 동시 상승시키는 헬퍼 함수
     */
    const updateFarmingExp = (
        charToUpdate: Character, 
        expAmount: number, 
        targetAssigneeIds?: string[]
    ): { updatedChar: Character; leveledUp: boolean; oldLevel: number; newLevel: number; updatedFarmersCount: number } => {
        // 1. 플레이어 본인의 농사 숙련도 상승
        const expResult = gainProfessionExp(charToUpdate, 'farming', expAmount);
        let char = expResult.newChar;

        // 2. 배치된 농부 동료들(또는 지정된 농부들)의 농사 숙련도 상승
        const allComps = [...(char.companions || []), ...(char.inactiveCompanions || [])];
        const targetIds = targetAssigneeIds && targetAssigneeIds.length > 0 
            ? targetAssigneeIds 
            : allComps.filter(c => c.job === JobType.FARMER || c.job === JobType.SLAVE || (c.job as string) === '노예').map(c => c.id);

        let updatedFarmersCount = 0;
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
                let jobTitle = "견습 농부";
                const level = mastery.level;
                if (level >= 100) jobTitle = '전설 농부';
                else if (level >= 80) jobTitle = '명인 농부';
                else if (level >= 50) jobTitle = '장인 농부';
                else if (level >= 20) jobTitle = '숙련 농부';
                else if (level >= 10) jobTitle = '일반 농부';

                const baseClass = c.finalClassName || c.lastClassName || c.secondClassName || c.firstClassName;
                c.classType = (baseClass && baseClass !== '미정') ? `${jobTitle} (${baseClass})` : jobTitle;
            }

            c.professions.farming = mastery;
            updatedFarmersCount++;
            return c;
        };

        if (char.companions) {
            char.companions = char.companions.map(updateCompanionFarming);
        }
        if (char.inactiveCompanions) {
            char.inactiveCompanions = char.inactiveCompanions.map(updateCompanionFarming);
        }

        return {
            updatedChar: char,
            leveledUp: expResult.leveledUp,
            oldLevel: expResult.oldLevel,
            newLevel: expResult.newLevel,
            updatedFarmersCount
        };
    };

    const handleResourceHarvest = () => {
        if (isLateNight) return alert("🌙 심야 시간대(22:00 ~ 06:00)에는 일일 자원을 수확할 수 없습니다. 주간 시간대에 이용해 주세요.");
        if (isHarvestedToday) return alert("오늘은 이미 수확했습니다.");

        const newBase = JSON.parse(JSON.stringify(base));
        if (!newBase.dailyCounts) newBase.dailyCounts = {};
        newBase.dailyCounts[`farm_harvest_${currentInstanceId}`] = 1;
        
        newBase.resources.food += foodYield;
        newBase.resources.wood += totalYield * 2;
        newBase.resources.herbs = (newBase.resources.herbs || 0) + herbYield;

        let newChar = JSON.parse(JSON.stringify(character)) as Character;
        newChar.base = newBase;

        const currentAssigneeIds = assignees.map(a => a.id);
        const expResult = updateFarmingExp(newChar, 15, currentAssigneeIds);
        newChar = expResult.updatedChar;

        const allFarmsCount = Math.max(1, allFarms.length);
        const minutesToAdvance = Math.max(1, Math.floor(60 / allFarmsCount));
        const timeRes = advanceGameTime(newChar, minutesToAdvance, { activityName: "농장 자원 수확" });
        newChar = timeRes.updatedCharacter;
        
        if (onUpdateCharacter) {
            onUpdateCharacter(newChar, `[농장] 일일 자원을 수확했습니다. (시간 +${minutesToAdvance}분, 농사 숙련도 +15)`, timeRes.dailyReport);
        } else {
            onUpdateBase(newChar.base!);
        }
        
        setResultOverlay({
            show: true,
            data: {
                type: 'success',
                title: '자원 수확 완료',
                message: `농장 주변에서 자원을 수확했습니다.`,
                items: [
                    { label: '소모 시간', after: minutesToAdvance >= 60 ? `+${Math.floor(minutesToAdvance / 60)}시간${minutesToAdvance % 60 > 0 ? ` ${minutesToAdvance % 60}분` : ''}` : `+${minutesToAdvance}분` },
                    { label: '식량', after: `+${foodYield}` },
                    { label: '목재', after: `+${totalYield * 2}` },
                    { label: '약초', after: `+${herbYield}` },
                    { label: '농사 숙련도 EXP', after: `+15` },
                    ...(expResult.leveledUp ? [{ label: '숙련도 상승!', after: `Lv.${expResult.oldLevel} -> Lv.${expResult.newLevel}`, color: 'text-yellow-400' }] : [])
                ]
            }
        });
    };

    const updatePlot = (plotId: number, updates: Partial<FarmPlot>) => {
        const newPlots = [...plots];
        newPlots[plotId] = { ...newPlots[plotId], ...updates };
        
        const newBase = { ...base };
        if (!newBase.farmPlots) newBase.farmPlots = {};
        newBase.farmPlots[currentInstanceId] = newPlots;
        
        onUpdateBase(newBase);
    };

    const handlePlow = (plotId: number) => {
        updatePlot(plotId, { status: 'plowed' });
    };

    const handlePlant = (plotId: number, cropId: string) => {
        const crop = FARM_CROPS.find(c => c.id === cropId);
        if (!crop) return;
        if (character.money < crop.seedPrice) return alert("골드가 부족합니다.");

        const newBase = { ...base };
        if (!newBase.farmPlots) newBase.farmPlots = {};
        const newPlots = [...plots];
        newPlots[plotId] = { 
            ...newPlots[plotId], 
            status: 'planted', 
            cropId, 
            plantedDate: character.currentDate || new Date().toISOString().split('T')[0],
            growthProgress: 0,
            isWatered: false
        };
        newBase.farmPlots[currentInstanceId] = newPlots;
        
        // Pass character money deduction
        const updatedChar = { ...character, money: character.money - crop.seedPrice };
        newBase.characterUpdate = updatedChar;

        onUpdateBase(newBase);
        setShowSeedSelection(false);
        setSelectedPlot(null);
    };

    const handleWater = (plotId: number) => {
        updatePlot(plotId, { isWatered: true, growthProgress: Math.min(100, plots[plotId].growthProgress + 5) });
    };

    const handleHarvest = executeWithCooldown((plotId: number) => {
        if (isLateNight) return alert("🌙 심야 시간대(22:00 ~ 06:00)에는 작물을 수확할 수 없습니다. 주간 시간대에 이용해 주세요.");
        const plot = plots[plotId];
        const crop = FARM_CROPS.find(c => c.id === plot.cropId);
        if (!crop) return;

        const yieldAmount = crop.yield + totalMasteryYieldBonus;
        const newBase = JSON.parse(JSON.stringify(base));
        
        // 작물 종류에 따라 기지 자원에 추가
        const cropResources = [
            'wheat', 'rice', 'corn', 'potato', 'sweet_potato', 'onion', 'garlic', 'lettuce', 'mana_fruit', 'shinryoku_flower',
            'carrot', 'cabbage', 'tomato', 'strawberry', 'grape', 'watermelon', 'ginseng', 'mandrake', 'world_tree_branch', 'golden_apple'
        ];
        
        if (crop.id === 'herb') {
            newBase.resources.herbs = (newBase.resources.herbs || 0) + yieldAmount;
        } else if (cropResources.includes(crop.id)) {
            // @ts-ignore - 동적 키 접근
            newBase.resources[crop.id] = (newBase.resources[crop.id] || 0) + yieldAmount;
            // 식량 자원도 일부 증가 (보너스)
            newBase.resources.food += yieldAmount;
        } else {
            newBase.resources.food += yieldAmount * 2;
        }
        
        const newPlots = [...plots];
        newPlots[plotId] = { 
            id: plotId,
            status: 'empty',
            growthProgress: 0,
            isWatered: false,
            quality: 100
        };
        if (!newBase.farmPlots) newBase.farmPlots = {};
        newBase.farmPlots[currentInstanceId] = newPlots;

        let newChar = JSON.parse(JSON.stringify(character)) as Character;
        newChar.base = newBase;
        // 작물 수준(minLevel)과 성장 시간(growthDays)을 모두 고려한 경험치 계산
        const expGain = 10 + (crop.minLevel * 5) + (crop.growthDays * 3); 
        const currentAssigneeIds = assignees.map(a => a.id);
        const expResult = updateFarmingExp(newChar, expGain, currentAssigneeIds);
        newChar = expResult.updatedChar;

        if (onUpdateCharacter) {
            onUpdateCharacter(newChar, `[농장] ${crop.name}을(를) 수확했습니다. (농사 숙련도 +${expGain})`);
        } else {
            onUpdateBase(newChar.base!);
        }
        setSelectedPlot(null);

        setResultOverlay({
            show: true,
            data: {
                type: 'success',
                title: '작물 수확 완료',
                message: `${crop.name}을(를) 수확했습니다.`,
                items: [
                    { label: '수확량', after: `${yieldAmount}` },
                    { label: '농사 숙련도 EXP', after: `+${expGain}` },
                    ...(expResult.leveledUp ? [{ label: '숙련도 상승!', after: `Lv.${expResult.oldLevel} -> Lv.${expResult.newLevel}`, color: 'text-yellow-400' }] : [])
                ]
            }
        });
    });

    // [NEW] 수확 가능한 모든 작물 일괄 수확 핸들러
    const handleHarvestAll = executeWithCooldown(() => {
        if (isLateNight) return alert("🌙 심야 시간대(22:00 ~ 06:00)에는 작물을 수확할 수 없습니다. 주간 시간대에 이용해 주세요.");
        const readyPlotIndices = plots.map((p, idx) => ({ plot: p, idx })).filter(item => item.plot.status === 'ready' || (item.plot.status === 'planted' && item.plot.growthProgress >= 100));
        if (readyPlotIndices.length === 0) return alert("수확 가능한 작물이 없습니다.");

        const newBase = JSON.parse(JSON.stringify(base));
        const newPlots = [...plots];
        let totalExpGain = 0;
        const harvestedSummary: Record<string, number> = {};

        const cropResources = [
            'wheat', 'rice', 'corn', 'potato', 'sweet_potato', 'onion', 'garlic', 'lettuce', 'mana_fruit', 'shinryoku_flower',
            'carrot', 'cabbage', 'tomato', 'strawberry', 'grape', 'watermelon', 'ginseng', 'mandrake', 'world_tree_branch', 'golden_apple'
        ];

        readyPlotIndices.forEach(({ plot, idx }) => {
            const crop = FARM_CROPS.find(c => c.id === plot.cropId);
            if (!crop) return;

            const yieldAmount = crop.yield + totalMasteryYieldBonus;
            harvestedSummary[crop.name] = (harvestedSummary[crop.name] || 0) + yieldAmount;

            if (crop.id === 'herb') {
                newBase.resources.herbs = (newBase.resources.herbs || 0) + yieldAmount;
            } else if (cropResources.includes(crop.id)) {
                // @ts-ignore
                newBase.resources[crop.id] = (newBase.resources[crop.id] || 0) + yieldAmount;
                newBase.resources.food += yieldAmount;
            } else {
                newBase.resources.food += yieldAmount * 2;
            }

            newPlots[idx] = {
                id: idx,
                status: 'empty',
                growthProgress: 0,
                isWatered: false,
                quality: 100
            };

            totalExpGain += 10 + (crop.minLevel * 5) + (crop.growthDays * 3);
        });

        if (!newBase.farmPlots) newBase.farmPlots = {};
        newBase.farmPlots[currentInstanceId] = newPlots;

        let newChar = JSON.parse(JSON.stringify(character)) as Character;
        newChar.base = newBase;
        const currentAssigneeIds = assignees.map(a => a.id);
        const expResult = updateFarmingExp(newChar, totalExpGain, currentAssigneeIds);
        newChar = expResult.updatedChar;

        if (onUpdateCharacter) {
            onUpdateCharacter(newChar, `[농장] 작물 ${readyPlotIndices.length}개를 일괄 수확했습니다. (농사 숙련도 +${totalExpGain})`);
        } else {
            onUpdateBase(newChar.base!);
        }
        setSelectedPlot(null);

        const summaryItems = Object.entries(harvestedSummary).map(([name, count]) => ({
            label: name,
            after: `+${count}`
        }));

        setResultOverlay({
            show: true,
            data: {
                type: 'success',
                title: '모든 작물 일괄 수확 완료',
                message: `총 ${readyPlotIndices.length}개의 작물을 모두 수확했습니다.`,
                items: [
                    ...summaryItems,
                    { label: '농사 숙련도 EXP', after: `+${totalExpGain}` },
                    ...(expResult.leveledUp ? [{ label: '숙련도 상승!', after: `Lv.${expResult.oldLevel} -> Lv.${expResult.newLevel}`, color: 'text-yellow-400' }] : [])
                ]
            }
        });
    });

    // [NEW] 기지 내 모든 농장의 작물 일괄 수확 핸들러
    const handleHarvestAllFarms = executeWithCooldown(() => {
        if (isLateNight) return alert("🌙 심야 시간대(22:00 ~ 06:00)에는 작물을 수확할 수 없습니다. 주간 시간대에 이용해 주세요.");
        const newBase = JSON.parse(JSON.stringify(base));
        let totalExpGain = 0;
        let totalHarvestedPlots = 0;
        const harvestedSummary: Record<string, number> = {};

        const cropResources = [
            'wheat', 'rice', 'corn', 'potato', 'sweet_potato', 'onion', 'garlic', 'lettuce', 'mana_fruit', 'shinryoku_flower',
            'carrot', 'cabbage', 'tomato', 'strawberry', 'grape', 'watermelon', 'ginseng', 'mandrake', 'world_tree_branch', 'golden_apple'
        ];

        allFarms.forEach(f => {
            const fPlots: FarmPlot[] = [...(newBase.farmPlots?.[f.id] || [])];
            if (fPlots.length === 0) return;

            const fAssigneeIds = newBase.multiAssignments?.[f.id] || (newBase.assignments?.[f.id] ? [newBase.assignments[f.id] as string] : []);
            const fAssignees = [...character.companions, ...(character.inactiveCompanions || [])].filter(c => fAssigneeIds.includes(c.id));
            let fMasterySum = 0;
            fAssignees.forEach(a => { fMasterySum += a.professions?.farming?.level || 1; });
            const fAvgMastery = fAssignees.length > 0 ? fMasterySum / fAssignees.length : 1;
            const fBonus = Math.floor((f.level || 1) * (1 + fAvgMastery * 0.03)) - (f.level || 1);

            fPlots.forEach((plot, idx) => {
                if (plot.status === 'ready' || (plot.status === 'planted' && plot.growthProgress >= 100)) {
                    const crop = FARM_CROPS.find(c => c.id === plot.cropId);
                    if (!crop) return;

                    totalHarvestedPlots++;
                    const yieldAmount = crop.yield + fBonus;
                    harvestedSummary[crop.name] = (harvestedSummary[crop.name] || 0) + yieldAmount;

                    if (crop.id === 'herb') {
                        newBase.resources.herbs = (newBase.resources.herbs || 0) + yieldAmount;
                    } else if (cropResources.includes(crop.id)) {
                        // @ts-ignore
                        newBase.resources[crop.id] = (newBase.resources[crop.id] || 0) + yieldAmount;
                        newBase.resources.food += yieldAmount;
                    } else {
                        newBase.resources.food += yieldAmount * 2;
                    }

                    fPlots[idx] = {
                        id: idx,
                        status: 'empty',
                        growthProgress: 0,
                        isWatered: false,
                        quality: 100
                    };

                    totalExpGain += 10 + (crop.minLevel * 5) + (crop.growthDays * 3);
                }
            });

            if (!newBase.farmPlots) newBase.farmPlots = {};
            newBase.farmPlots[f.id] = fPlots;
        });

        if (totalHarvestedPlots === 0) return alert("수확 가능한 작물이 있는 농장이 없습니다.");

        let newChar = JSON.parse(JSON.stringify(character)) as Character;
        newChar.base = newBase;
        const expResult = updateFarmingExp(newChar, totalExpGain);
        newChar = expResult.updatedChar;

        if (onUpdateCharacter) {
            onUpdateCharacter(newChar, `[모든 농장] 전체 ${allFarms.length}개 농장에서 작물 ${totalHarvestedPlots}개를 일괄 수확했습니다. (농사 숙련도 +${totalExpGain})`);
        } else {
            onUpdateBase(newChar.base!);
        }
        setSelectedPlot(null);

        const summaryItems = Object.entries(harvestedSummary).map(([name, count]) => ({
            label: name,
            after: `+${count}`
        }));

        setResultOverlay({
            show: true,
            data: {
                type: 'success',
                title: '모든 농장 일괄 수확 완료',
                message: `기지 내 ${allFarms.length}개 농장에서 총 ${totalHarvestedPlots}개의 작물을 일괄 수확했습니다.`,
                items: [
                    ...summaryItems,
                    { label: '농사 숙련도 경험치', after: `+${totalExpGain}` },
                    ...(expResult.leveledUp ? [{ label: '숙련도 상승!', after: `Lv.${expResult.oldLevel} -> Lv.${expResult.newLevel}`, color: 'text-yellow-400' }] : [])
                ]
            }
        });
    });

    // [NEW] 기지 내 모든 농장의 일일 자원 일괄 채집 핸들러
    const handleResourceHarvestAllFarms = executeWithCooldown(() => {
        if (isLateNight) return alert("🌙 심야 시간대(22:00 ~ 06:00)에는 일일 자원을 수확할 수 없습니다. 주간 시간대에 이용해 주세요.");
        const unharvestedFarms = allFarms.filter(f => (base.dailyCounts?.[`farm_harvest_${f.id}`] || 0) < 1);
        if (unharvestedFarms.length === 0) return alert("오늘 이미 모든 농장의 일일 자원을 수확했습니다.");

        const newBase = JSON.parse(JSON.stringify(base));
        if (!newBase.dailyCounts) newBase.dailyCounts = {};

        let totalFood = 0;
        let totalWood = 0;
        let totalHerbs = 0;

        unharvestedFarms.forEach(f => {
            const fAssigneeIds = newBase.multiAssignments?.[f.id] || (newBase.assignments?.[f.id] ? [newBase.assignments[f.id] as string] : []);
            const fAssignees = [...character.companions, ...(character.inactiveCompanions || [])].filter(c => fAssigneeIds.includes(c.id));
            let fMasterySum = 0;
            fAssignees.forEach(a => { fMasterySum += a.professions?.farming?.level || 1; });
            const fAvgMastery = fAssignees.length > 0 ? fMasterySum / fAssignees.length : 1;
            const masteryBonusMultiplier = 1 + (fAvgMastery * 0.03);
            const fLevel = f.level || 1;
            const fBonus = Math.floor(fLevel * masteryBonusMultiplier) - fLevel;
            const fYieldVal = Math.floor(Math.max(1, fLevel + fBonus) * masteryBonusMultiplier);

            const fFood = fYieldVal * 2;
            const fWood = fYieldVal * 2;
            const fHerb = Math.floor(((fLevel * 2) + fBonus) * masteryBonusMultiplier);

            totalFood += fFood;
            totalWood += fWood;
            totalHerbs += fHerb;

            newBase.dailyCounts[`farm_harvest_${f.id}`] = 1;
        });

        newBase.resources.food = (newBase.resources.food || 0) + totalFood;
        newBase.resources.wood = (newBase.resources.wood || 0) + totalWood;
        newBase.resources.herbs = (newBase.resources.herbs || 0) + totalHerbs;

        let newChar: Character = { ...character, base: newBase };
        const totalExpGain = 15 * unharvestedFarms.length;
        const expResult = updateFarmingExp(newChar, totalExpGain);
        newChar = expResult.updatedChar;

        const timeRes = advanceGameTime(newChar, 60, { activityName: "모든 농장 자원 일괄 수확" });
        newChar = timeRes.updatedCharacter;

        if (onUpdateCharacter) {
            onUpdateCharacter(newChar, `[모든 농장] ${unharvestedFarms.length}개 농장의 일일 자원을 일괄 수확했습니다. (시간 +60분, 식량 +${totalFood}, 목재 +${totalWood}, 약초 +${totalHerbs}, 농사 숙련도 +${totalExpGain})`, timeRes.dailyReport);
        } else {
            onUpdateBase(newChar.base!);
        }

        setResultOverlay({
            show: true,
            data: {
                type: 'success',
                title: '모든 농장 자원 일괄 수확 완료',
                message: `총 ${unharvestedFarms.length}개 농장의 일일 자원을 모두 수확했습니다.`,
                items: [
                    { label: '소모 시간', after: '+1시간 (60분)' },
                    { label: '식량', after: `+${totalFood}` },
                    { label: '목재', after: `+${totalWood}` },
                    { label: '약초', after: `+${totalHerbs}` },
                    { label: '농사 숙련도 EXP', after: `+${totalExpGain}` },
                    ...(expResult.leveledUp ? [{ label: '숙련도 상승!', after: `Lv.${expResult.oldLevel} -> Lv.${expResult.newLevel}`, color: 'text-yellow-400' }] : [])
                ]
            }
        });
    });

    const handleSetAutoPlant = (cropId: string | null) => {
        const newBase = JSON.parse(JSON.stringify(base));
        if (!newBase.farmAutoPlantConfig) newBase.farmAutoPlantConfig = {};
        
        if (cropId) {
            newBase.farmAutoPlantConfig[currentInstanceId] = cropId;
        } else {
            delete newBase.farmAutoPlantConfig[currentInstanceId];
        }
        
        onUpdateBase(newBase);
    };

    const upgradeConfig = FACILITY_UPGRADE_CONFIG['farm'];
    const canUpgrade = farmLevel < (upgradeConfig?.maxLevel || 5);

    if (instance?.underConstruction) {
        const rem = getConstructionRemainingTime(character.currentDate, character.currentTime, instance.constructionCompletionDate, instance.constructionCompletionTime);
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6 text-center text-slate-100 flex flex-col items-center"
                >
                    <div className="w-14 h-14 rounded-2xl bg-amber-950/60 border border-amber-600/60 flex items-center justify-center mb-4 text-amber-400">
                        <Hammer size={28} className="animate-bounce" />
                    </div>
                    <h3 className="text-lg font-bold text-amber-300 mb-1">농장 공사 진행 중</h3>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                        현재 농장 공사가 진행 중입니다.<br />완공 전에는 농장에 입장하거나 작물을 재배할 수 없습니다.
                    </p>
                    <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 mb-5 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-400">
                            <span>완공 예정 일시</span>
                            <span className="text-amber-200 font-bold">{instance.constructionCompletionDate} {instance.constructionCompletionTime}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                            <span>남은 시간</span>
                            <span className="text-emerald-400 font-bold">{rem.text}</span>
                        </div>
                    </div>
                    {allFarms.length > 0 ? (
                        <div className="flex gap-2 w-full">
                            <button
                                onClick={() => setCurrentInstanceId(allFarms[0].id)}
                                className="flex-1 py-2.5 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded-xl transition-all"
                            >
                                완공된 농장으로 이동
                            </button>
                            <button
                                onClick={onClose}
                                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all"
                            >
                                닫기
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all"
                        >
                            확인 (닫기)
                        </button>
                    )}
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-900/30 rounded-lg border border-green-500/30">
                            <Sprout className="text-green-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                {allFarms.length > 1 ? `제 ${farmNumber} 농장` : '농장 시뮬레이션'}
                                <span className="text-xs bg-green-900/50 px-2 py-0.5 rounded text-green-400 border border-green-500/30">Lv.{farmLevel}</span>
                            </h2>
                            <p className="text-xs text-slate-400">직접 밭을 갈고 작물을 키워보세요.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {allFarms.length > 1 && (
                            <button
                                type="button"
                                onClick={handleHarvestAllFarms}
                                disabled={allFarmsReadyCount === 0}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-md ${
                                    allFarmsReadyCount > 0
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-amber-500/20 active:scale-95 animate-pulse'
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                }`}
                                title="보유한 모든 농장의 준비된 작물을 일괄 수확합니다."
                            >
                                <Sparkles size={14} />
                                <span>모든 농장 작물 일괄 수확 ({allFarmsReadyCount}개)</span>
                            </button>
                        )}
                        <button 
                            onClick={() => setIsMasteryManagerOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-900/20"
                        >
                            <TrendingUp size={14} />
                            숙련도 관리
                        </button>
                        {canUpgrade && onFacilityUpgrade && (
                            <button 
                                onClick={() => onFacilityUpgrade('farm')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-green-900/20"
                            >
                                <ArrowUpCircle size={14} />
                                레벨업
                            </button>
                        )}
                        <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Farm Switch Navigation (여러 농장 보유 시) */}
                {allFarms.length > 1 && (
                    <div className="bg-slate-950/90 border-b border-slate-800 px-3 py-2 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0">
                        <div className="flex items-center gap-1 shrink-0 text-xs font-bold text-green-400 mr-1">
                            <Sprout size={14} />
                            <span>농장 이동</span>
                        </div>
                        <button
                            type="button"
                            disabled={currentFarmIdx <= 0}
                            onClick={() => handleSwitchFarm(allFarms[currentFarmIdx - 1].id)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded text-xs transition-colors shrink-0 flex items-center"
                            title="이전 농장으로 이동"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                            {allFarms.map((farm, idx) => {
                                const isSelected = farm.id === currentInstanceId;
                                const fPlots = base.farmPlots?.[farm.id] || [];
                                const readyCount = fPlots.filter((p: FarmPlot) => p.status === 'ready' || (p.status === 'planted' && p.growthProgress >= 100)).length;

                                return (
                                    <button
                                        key={farm.id}
                                        type="button"
                                        onClick={() => handleSwitchFarm(farm.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border active:scale-95 ${
                                            isSelected
                                                ? 'bg-green-700 text-white border-green-500 shadow-md shadow-green-950/40'
                                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                                        }`}
                                    >
                                        <span>제 {idx + 1} 농장</span>
                                        <span className="text-[10px] px-1 py-0.2 bg-black/40 rounded font-mono">Lv.{farm.level || 1}</span>
                                        {readyCount > 0 && (
                                            <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[10px] font-extrabold rounded-full animate-pulse">
                                                수확 {readyCount}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            disabled={currentFarmIdx >= allFarms.length - 1}
                            onClick={() => handleSwitchFarm(allFarms[currentFarmIdx + 1].id)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded text-xs transition-colors shrink-0 flex items-center"
                            title="다음 농장으로 이동"
                        >
                            <ChevronRight size={14} />
                        </button>

                        {allFarms.length > 1 && (
                            <button
                                type="button"
                                onClick={handleHarvestAllFarms}
                                disabled={allFarmsReadyCount === 0}
                                className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-md ${
                                    allFarmsReadyCount > 0
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-amber-500/20 active:scale-95 animate-pulse'
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                }`}
                                title="보유한 모든 농장의 준비된 작물을 일괄 수확합니다."
                            >
                                <Sparkles size={14} />
                                <span>모든 농장 작물 일괄 수확</span>
                                {allFarmsReadyCount > 0 && (
                                    <span className="px-1.5 py-0.2 bg-black/30 rounded-full text-[10px]">
                                        {allFarmsReadyCount}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                )}

                {/* Farmer Mastery Management Overlay */}
                <AnimatePresence>
                    {isMasteryManagerOpen && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                            >
                                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Award className="text-amber-400" size={20} />
                                        농부 숙련도 관리
                                    </h2>
                                    <button onClick={() => setIsMasteryManagerOpen(false)} className="p-1 hover:bg-slate-800 rounded-full text-slate-400">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {/* All farmers list */}
                                     {[...character.companions, ...(character.inactiveCompanions || [])]
                                        .filter(c => c.job === JobType.FARMER || c.job === JobType.SLAVE || (c.job as string) === '노예')
                                        .map((farmer, idx) => {
                                            const mastery = farmer.professions?.farming || { level: 1, exp: 0, maxExp: 100 };
                                            
                                            // 현재 부여된 칭호/등급 계산
                                            const currentRankConfig = [...FARMER_RANK_CONFIGS].reverse().find(cfg => mastery.level >= cfg.rankLevel) || FARMER_RANK_CONFIGS[0];
                                            const nextRankIndex = FARMER_RANK_CONFIGS.findIndex(cfg => cfg.rankLevel === currentRankConfig.rankLevel) + 1;
                                            const nextRankConfig = nextRankIndex < FARMER_RANK_CONFIGS.length ? FARMER_RANK_CONFIGS[nextRankIndex] : null;

                                            // 승급 조건 체크: 레벨 조건 && STR 스탯 조건
                                            const farmerStats = calculateFinalStats(farmer).finalStats;
                                            const currentStr = farmerStats.str || 0;
                                            const hasLevelReq = nextRankConfig ? mastery.level >= nextRankConfig.rankLevel : false;
                                            const reqStr = nextRankConfig?.reqStr || 0;
                                            const hasStrReq = currentStr >= reqStr;
                                            const canPromote = hasLevelReq && hasStrReq;

                                            const progress = (mastery.exp / mastery.maxExp) * 100;

                                            const handlePromote = () => {
                                                if (!nextRankConfig) return;
                                                if (!hasLevelReq) {
                                                    alert(`[승급 불가] 레벨 ${nextRankConfig.rankLevel} 이상이 필요합니다. (현재 Lv.${mastery.level})`);
                                                    return;
                                                }
                                                if (!hasStrReq) {
                                                    alert(`[승급 불가] 근력(STR) ${reqStr} 이상이 필요합니다. (현재 ${currentStr}/${reqStr})`);
                                                    return;
                                                }

                                                // 승급 적용: 칭호(ClassType) 갱신
                                                const newChar = { ...character };
                                                const targetInActive = newChar.companions.find(c => c.id === farmer.id);
                                                const targetInInactive = (newChar.inactiveCompanions || []).find(c => c.id === farmer.id);
                                                const target = targetInActive || targetInInactive;

                                                if (target) {
                                                    const baseClass = target.finalClassName || target.lastClassName || target.secondClassName || target.firstClassName;
                                                    const jobTitle = nextRankConfig.label;
                                                    target.classType = (baseClass && baseClass !== '미정') ? `${jobTitle} (${baseClass})` : jobTitle;
                                                    
                                                    onUpdateCharacter(newChar, `[농부 승급] ${target.name}이(가) [${jobTitle}] (으)로 승급했습니다!`);
                                                }
                                            };

                                            return (
                                                <div key={idx} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 shadow-lg">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center text-white font-bold">
                                                                {farmer.name[0]}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-bold text-white">{farmer.name}</h4>
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${currentRankConfig.bg} ${currentRankConfig.color}`}>
                                                                    {currentRankConfig.label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xs font-bold text-indigo-400">Lv.{mastery.level}</div>
                                                            <div className="text-[9px] text-slate-500">Exp: {mastery.exp}/{mastery.maxExp}</div>
                                                        </div>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${progress}%` }}
                                                            className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                                                        />
                                                    </div>
                                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                                        <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                                                            <div className="text-[9px] text-slate-500 mb-0.5">자원 수확량 보너스</div>
                                                            <div className="text-xs font-bold text-green-400">+{Math.floor((mastery.level - 1) * 0.5)}</div>
                                                        </div>
                                                        <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                                                            <div className="text-[9px] text-slate-500 mb-0.5">STR 스탯 (필요 STR)</div>
                                                            <div className={`text-xs font-bold ${nextRankConfig ? (hasStrReq ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-300'}`}>
                                                                STR {currentStr} {nextRankConfig ? `/ ${reqStr}` : ''}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* 승급 버튼 및 요구 조건 안내 */}
                                                    {nextRankConfig ? (
                                                        <div className="mt-3 pt-2 border-t border-slate-900 flex items-center justify-between">
                                                            <div className="text-[10px] text-slate-400">
                                                                다음: <span className="font-semibold text-amber-300">{nextRankConfig.label}</span>
                                                                <span className="ml-1 text-slate-500">(Lv.{nextRankConfig.rankLevel}, STR {reqStr} 필요)</span>
                                                            </div>
                                                            <button
                                                                onClick={handlePromote}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                                                    canPromote 
                                                                        ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-md shadow-amber-900/30' 
                                                                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                                                                }`}
                                                            >
                                                                <ArrowUpCircle size={14} />
                                                                승급
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="mt-3 pt-2 border-t border-slate-900 text-center text-[10px] text-amber-400 font-semibold">
                                                            최고 직급 달성 (전설 농부)
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    
                                    {[...character.companions, ...(character.inactiveCompanions || [])]
                                        .filter(c => c.job === JobType.FARMER || c.job === JobType.SLAVE || (c.job as string) === '노예').length === 0 && (
                                        <div className="py-12 text-center">
                                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-700">
                                                <User className="text-slate-600" size={32} />
                                            </div>
                                            <p className="text-sm text-slate-500">등록된 농부가 없습니다.</p>
                                            <p className="text-[10px] text-slate-600 mt-1">거주민에게 농부 직업을 권유해보세요.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 bg-slate-950 border-t border-slate-800">
                                    <button 
                                        onClick={() => setIsMasteryManagerOpen(false)}
                                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
                                    >
                                        닫기
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50">
                    {/* Late Night Notice Banner */}
                    {isLateNight && (
                        <div className="mb-6 bg-amber-950/80 border border-amber-500/40 rounded-2xl p-4 flex items-center gap-3 text-xs sm:text-sm text-amber-300 font-bold shadow-lg">
                            <span className="text-xl shrink-0">🌙</span>
                            <div>
                                <div className="text-white font-extrabold text-sm mb-0.5">심야 휴식 시간대 ({timeStr})</div>
                                <div className="text-amber-300/90 text-xs">작물 및 자원 수확은 안전과 작물 보전을 위해 주간 시간대(06:00 ~ 22:00)에만 진행할 수 있습니다.</div>
                            </div>
                        </div>
                    )}

                    {/* Resource Harvest Section */}
                    <div className="mb-8 p-4 bg-slate-950 rounded-2xl border border-green-900/30 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-xl border transition-all ${isHarvestedToday ? 'bg-slate-900 border-slate-800 text-slate-600' : 'bg-green-900/20 border-green-500/30 text-green-400'}`}>
                                <Leaf size={24} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">일일 자원 수확</h3>
                                <p className="text-[10px] text-slate-500">농장 주변의 식량, 목재, 약초를 채집합니다.</p>
                                <div className="flex gap-2 mt-1">
                                    <span className="text-[10px] text-green-500 font-bold flex items-center gap-1"><Apple size={10}/> 식량 +{foodYield}</span>
                                    <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1"><Trees size={10}/> 목재 +{totalYield * 2}</span>
                                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1"><Leaf size={10}/> 약초 +{herbYield}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={handleResourceHarvest}
                                disabled={isHarvestedToday || isLateNight}
                                className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                                    isHarvestedToday || isLateNight
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                                    : 'bg-green-700 hover:bg-green-600 text-white shadow-lg shadow-green-900/20 active:scale-95'
                                }`}
                            >
                                {isLateNight ? '심야 수확 불가' : (isHarvestedToday ? '이 농장 수확 완료' : '지금 수확하기')}
                            </button>
                            {allFarms.length > 1 && (
                                <button
                                    onClick={handleResourceHarvestAllFarms}
                                    disabled={unharvestedFarmsCount === 0 || isLateNight}
                                    className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 ${
                                        unharvestedFarmsCount > 0 && !isLateNight
                                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20 active:scale-95'
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                    }`}
                                    title="아직 일일 자원을 수확하지 않은 모든 농장의 자원을 한 번에 채집합니다."
                                >
                                    <Sparkles size={14} />
                                    <span>{isLateNight ? '심야 수확 불가' : '모든 농장 자원 일괄 수확'}</span>
                                    {unharvestedFarmsCount > 0 && !isLateNight && (
                                        <span className="text-[10px] px-1.5 py-0.5 bg-black/30 rounded-full font-mono">
                                            {unharvestedFarmsCount}곳
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Assignee Info */}
                    {assignees.length > 0 && (
                        <div className="mb-8 space-y-4">
                            <div className="p-4 bg-indigo-950/30 rounded-2xl border border-indigo-500/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-900/50 rounded-lg border border-indigo-400/30">
                                        <User className="text-indigo-400" size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white">관리 담당자: {assignees.map(a => (a.name)).join(', ')}</h3>
                                        <p className="text-[10px] text-indigo-300/70">총 {assignees.length}명의 농부가 작물을 관리하고 있으며, 자동 시스템이 활성화되었습니다.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 bg-indigo-900/40 rounded-full border border-indigo-500/20">
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                                    <span className="text-[10px] text-indigo-300 font-bold uppercase">Auto-Active</span>
                                </div>
                            </div>

                            {/* Auto-Plant Configuration */}
                            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <ShoppingCart className="text-amber-500" size={18} />
                                        <h3 className="text-sm font-bold text-white">자동 재배 지시</h3>
                                    </div>
                                    {autoPlantCropId && (
                                        <button 
                                            onClick={() => handleSetAutoPlant(null)}
                                            className="text-[10px] text-red-400 hover:text-red-300 font-bold"
                                        >
                                            지시 취소
                                        </button>
                                    )}
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                    {FARM_CROPS.filter(c => farmLevel >= c.minLevel).map(crop => (
                                        <button
                                            key={crop.id}
                                            onClick={() => handleSetAutoPlant(crop.id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                autoPlantCropId === crop.id
                                                ? 'bg-amber-600 border-amber-400 text-white'
                                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                                            }`}
                                        >
                                            {crop.name}
                                        </button>
                                    ))}
                                    {FARM_CROPS.filter(c => farmLevel >= c.minLevel).length === 0 && (
                                        <p className="text-xs text-slate-500 italic">재배 가능한 작물이 없습니다.</p>
                                    )}
                                </div>
                                <p className="mt-3 text-[10px] text-slate-500">
                                    * 담당자가 밭을 갈고 비어있는 자리에 선택한 작물을 자동으로 심습니다. (골드 소모)
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Farm Plots Header & Harvest All Button */}
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                            <Sprout size={18} className="text-green-400" />
                            <h3 className="text-sm font-bold text-white">경작지 ({gridDimension}x{gridDimension})</h3>
                            <span className="text-[11px] text-slate-400">
                                {plots.filter(p => p.status === 'ready' || (p.status === 'planted' && p.growthProgress >= 100)).length > 0 ? (
                                    <span className="text-amber-400 font-bold">
                                        (수확 가능 작물 {plots.filter(p => p.status === 'ready' || (p.status === 'planted' && p.growthProgress >= 100)).length}개)
                                    </span>
                                ) : (
                                    <span>(총 {totalPlotsCount}구획)</span>
                                )}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {plots.some(p => p.status === 'ready' || (p.status === 'planted' && p.growthProgress >= 100)) && (
                                <button
                                    onClick={handleHarvestAll}
                                    disabled={isLateNight}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-lg active:scale-95 ${
                                        isLateNight
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                            : 'bg-green-600 hover:bg-green-500 text-white shadow-green-600/20'
                                    }`}
                                >
                                    <CheckCircle2 size={14} />
                                    {isLateNight ? '심야 수확 불가' : '현재 농장 일괄 수확'}
                                </button>
                            )}
                            {allFarms.length > 1 && allFarmsReadyCount > 0 && (
                                <button
                                    onClick={handleHarvestAllFarms}
                                    disabled={isLateNight}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-lg transition-all shadow-lg active:scale-95 ${
                                        isLateNight
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                            : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
                                    }`}
                                    title="보유한 모든 농장의 작물을 일괄 수확합니다."
                                >
                                    <Sparkles size={14} />
                                    {isLateNight ? '심야 수확 불가' : `모든 농장 일괄 수확 (${allFarmsReadyCount}개)`}
                                </button>
                            )}
                        </div>
                    </div>

                    <div 
                        className="grid gap-4 mb-8"
                        style={{ 
                            gridTemplateColumns: `repeat(${gridDimension}, minmax(0, 1fr))` 
                        }}
                    >
                        {plots.map((plot) => (
                            <button
                                key={plot.id}
                                onClick={() => setSelectedPlot(plot.id)}
                                className={`aspect-square rounded-xl border-2 transition-all flex flex-col items-center justify-center relative overflow-hidden group
                                    ${selectedPlot === plot.id ? 'border-amber-500 bg-amber-900/20 shadow-lg shadow-amber-500/20' : 'border-slate-800 bg-slate-950 hover:border-slate-600'}
                                `}
                            >
                                {plot.status === 'empty' && (
                                    <div className="text-slate-700 flex flex-col items-center">
                                        <Shovel size={gridDimension > 4 ? 20 : 32} className="mb-2 opacity-20" />
                                        <span className={`${gridDimension > 4 ? 'text-[8px]' : 'text-[10px]'} font-bold uppercase tracking-wider`}>황무지</span>
                                    </div>
                                )}
                                {plot.status === 'plowed' && (
                                    <div className="text-amber-700 flex flex-col items-center">
                                        <div className={`${gridDimension > 4 ? 'w-8 h-8' : 'w-12 h-12'} rounded-full bg-amber-900/30 flex items-center justify-center mb-2`}>
                                            <Shovel size={gridDimension > 4 ? 16 : 24} />
                                        </div>
                                        <span className={`${gridDimension > 4 ? 'text-[8px]' : 'text-[10px]'} font-bold uppercase tracking-wider`}>개간됨</span>
                                    </div>
                                )}
                                {plot.status === 'planted' && (
                                    <div className="flex flex-col items-center w-full px-2">
                                        <Sprout size={gridDimension > 4 ? 24 : 32} className={plot.growthProgress >= 100 ? 'text-amber-400' : 'text-green-500'} />
                                        <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                                            <div 
                                                className="bg-green-500 h-full transition-all duration-500" 
                                                style={{ width: `${plot.growthProgress}%` }}
                                            />
                                        </div>
                                        <span className={`${gridDimension > 4 ? 'text-[8px]' : 'text-[10px]'} font-bold mt-1 text-slate-300 truncate w-full text-center`}>
                                            {FARM_CROPS.find(c => c.id === plot.cropId)?.name}
                                        </span>
                                    </div>
                                )}
                                {plot.status === 'ready' && (
                                    <div className="flex flex-col items-center">
                                        <div className="relative">
                                            <Sprout size={gridDimension > 4 ? 28 : 40} className="text-amber-400 animate-bounce" />
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-950" />
                                        </div>
                                        <span className={`${gridDimension > 4 ? 'text-[8px]' : 'text-[10px]'} font-bold mt-1 text-amber-400`}>수확 가능!</span>
                                    </div>
                                )}

                                {plot.isWatered && plot.status !== 'empty' && (
                                    <div className="absolute top-2 right-2">
                                        <Droplets size={12} className="text-blue-400 animate-pulse" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Action Panel */}
                    <AnimatePresence mode="wait">
                        {selectedPlot !== null ? (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-1">Plot #{selectedPlot + 1} 관리</h3>
                                        <p className="text-xs text-slate-400">현재 상태: {
                                            plots[selectedPlot].status === 'empty' ? '황무지' :
                                            plots[selectedPlot].status === 'plowed' ? '개간됨' :
                                            plots[selectedPlot].status === 'planted' ? '성장 중' : '수확 대기'
                                        }</p>
                                    </div>
                                    <button onClick={() => setSelectedPlot(null)} className="text-slate-500 hover:text-white">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {plots[selectedPlot].status === 'empty' && (
                                        <button 
                                            onClick={() => handlePlow(selectedPlot)}
                                            className="col-span-2 py-4 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                                        >
                                            <Shovel size={20} /> 밭 갈기
                                        </button>
                                    )}

                                    {plots[selectedPlot].status === 'plowed' && !showSeedSelection && (
                                        <button 
                                            onClick={() => setShowSeedSelection(true)}
                                            className="col-span-2 py-4 bg-green-700 hover:bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                                        >
                                            <Sprout size={20} /> 씨앗 뿌리기
                                        </button>
                                    )}

                                    {plots[selectedPlot].status === 'planted' && (
                                        <>
                                            <button 
                                                onClick={() => handleWater(selectedPlot)}
                                                disabled={plots[selectedPlot].isWatered}
                                                className={`py-4 font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                                                    plots[selectedPlot].isWatered 
                                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                                    : 'bg-blue-700 hover:bg-blue-600 text-white'
                                                }`}
                                            >
                                                <Droplets size={20} /> 물 주기
                                            </button>
                                            <button 
                                                disabled
                                                className="py-4 bg-slate-800 text-slate-500 font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                                            >
                                                <Clock size={20} /> 성장 대기
                                            </button>
                                        </>
                                    )}

                                    {(plots[selectedPlot].status === 'ready' || (plots[selectedPlot].status === 'planted' && plots[selectedPlot].growthProgress >= 100)) && (
                                        <button 
                                            onClick={() => handleHarvest(selectedPlot)}
                                            disabled={isLateNight}
                                            className={`col-span-2 py-4 font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                                                isLateNight
                                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                                    : 'bg-amber-500 hover:bg-amber-400 text-slate-900 active:scale-95'
                                            }`}
                                        >
                                            <CheckCircle2 size={20} /> {isLateNight ? '심야 시간 수확 불가' : '수확하기'}
                                        </button>
                                    )}
                                </div>

                                {showSeedSelection && (
                                    <div className="mt-6 space-y-3">
                                        <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                            <ShoppingCart size={16} /> 씨앗 선택
                                        </h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {FARM_CROPS.map(crop => {
                                                const isLevelLocked = farmLevel < crop.minLevel;
                                                const isAffordable = character.money >= crop.seedPrice;
                                                
                                                return (
                                                    <button
                                                        key={crop.id}
                                                        onClick={() => !isLevelLocked && handlePlant(selectedPlot, crop.id)}
                                                        disabled={isLevelLocked || !isAffordable}
                                                        className={`flex items-center justify-between p-3 bg-slate-900 border rounded-xl transition-all group 
                                                            ${isLevelLocked ? 'opacity-40 cursor-not-allowed border-slate-800' : 'border-slate-800 hover:border-green-500'}
                                                            ${!isAffordable && !isLevelLocked ? 'opacity-60 grayscale' : ''}
                                                        `}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center ${isLevelLocked ? 'text-slate-600' : 'text-green-500'}`}>
                                                                {isLevelLocked ? <Lock size={20} /> : <Sprout size={20} />}
                                                            </div>
                                                            <div className="text-left">
                                                                <div className="text-sm font-bold text-white flex items-center gap-2">
                                                                    {crop.name}
                                                                    {isLevelLocked && (
                                                                        <span className="text-[9px] bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30">Lv.{crop.minLevel} 필요</span>
                                                                    )}
                                                                </div>
                                                                <div className="text-[10px] text-slate-500">성장: {crop.growthDays}일 | 예상 수확: {crop.yield}</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`text-xs font-bold ${isAffordable ? 'text-amber-500' : 'text-red-500'}`}>{crop.seedPrice} G</div>
                                                            <div className="text-[10px] text-slate-500">{isLevelLocked ? '잠김' : '구매 및 심기'}</div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button 
                                            onClick={() => setShowSeedSelection(false)}
                                            className="w-full py-2 text-xs text-slate-500 hover:text-slate-300"
                                        >
                                            취소
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <div className="bg-slate-950/30 p-8 rounded-2xl border border-dashed border-slate-800 text-center">
                                <Info size={32} className="mx-auto text-slate-700 mb-3" />
                                <p className="text-sm text-slate-500">관리할 밭을 선택해주세요.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Info */}
                <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap justify-between items-center gap-3 text-xs">
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="flex items-center gap-1.5 text-slate-400">
                            <div className="w-2 h-2 rounded-full bg-amber-700" /> 밭 갈기
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                            <div className="w-2 h-2 rounded-full bg-green-700" /> 씨앗 심기
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                            <div className="w-2 h-2 rounded-full bg-blue-700" /> 물 주기
                        </div>
                        <div className="hidden sm:block h-4 w-px bg-slate-800" />
                        <div className="flex items-center gap-2 text-green-400 font-bold bg-green-950/40 px-2.5 py-1 rounded-lg border border-green-800/40">
                            <TrendingUp size={14} />
                            농사 숙련도 Lv.{character.professions?.farming?.level || 1} ({character.professions?.farming?.exp || 0} / {character.professions?.farming?.maxExp || 100})
                        </div>
                    </div>
                    <div className="text-amber-400 font-bold bg-amber-950/40 px-3 py-1 rounded-lg border border-amber-800/40">
                        보유 골드: {character.money.toLocaleString()} G
                    </div>
                </div>
            </motion.div>
            {resultOverlay.show && (
                <ActionResultModal 
                    data={resultOverlay.data} 
                    onClose={() => setResultOverlay({ show: false, data: null })} 
                />
            )}
        </div>
    );
};

export default React.memo(FarmModal);
