import React, { useState, useEffect, useMemo } from 'react';
import { Character, Stats, JobType } from '../types';
import { MINE_ZONES, MINE_SPECIALIZATIONS, FACILITY_UPGRADE_CONFIG } from '../constants';
import { X, Pickaxe, Mountain, Gem, Zap, AlertTriangle, Info, Award, ArrowUpCircle, User, Clock, Hammer, Layers, Target, Sparkles, Coins, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateFinalStats, gainProfessionExp, MINER_RANK_CONFIGS } from '../utils';
import { advanceGameTime } from '../services/gameTimeService';
import { getConstructionRemainingTime } from '../services/baseConstructionService';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { useActionCooldown } from '../hooks/useActionCooldown';

interface Props {
    character: Character;
    instanceId: string;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, message: string, dailyReport?: any) => void;
    onFacilityUpgrade?: (facilityId: string) => void;
    onChangeInstanceId?: (newInstanceId: string) => void;
}

const MineModal: React.FC<Props> = ({ character, instanceId, onClose, onUpdateCharacter, onFacilityUpgrade, onChangeInstanceId }) => {
    const { executeWithCooldown } = useActionCooldown(300);
    const [currentInstanceId, setCurrentInstanceId] = useState<string>(instanceId);

    useEffect(() => {
        setCurrentInstanceId(instanceId);
    }, [instanceId]);

    const base = character.base!;
    const allMines = useMemo(() => (base.layout || []).filter(inst => inst.type === 'mine' && !inst.underConstruction && (inst.level || 0) > 0), [base.layout]);
    const currentMineIdx = allMines.findIndex(inst => inst.id === currentInstanceId);
    const mineNumber = currentMineIdx >= 0 ? currentMineIdx + 1 : 1;

    const instance = base.layout?.find(inst => inst.id === currentInstanceId);

    // 공사 중인 광산이 지정된 경우, 완공된 광산이 있으면 자동 전환
    useEffect(() => {
        if (instance?.underConstruction && allMines.length > 0) {
            setCurrentInstanceId(allMines[0].id);
        }
    }, [instance, allMines]);
    const mineLevel = instance?.level || 1;
    
    // [MODIFIED] Support multiple miners
    const assigneeIds = useMemo(() => base.multiAssignments?.[currentInstanceId] || (base.assignments?.[currentInstanceId] ? [base.assignments?.[currentInstanceId] as string] : []), [base.multiAssignments, base.assignments, currentInstanceId]);
    const assignees = useMemo(() => (character.inactiveCompanions || []).filter(c => assigneeIds.includes(c.id)), [character.inactiveCompanions, assigneeIds]);
    
    const specializationId = base.mineSpecializations?.[currentInstanceId] || 'general';
    const specialization = MINE_SPECIALIZATIONS.find(s => s.id === specializationId) || MINE_SPECIALIZATIONS[0];

    const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
    const [isMining, setIsMining] = useState(false);
    const [showSpecMenu, setShowSpecMenu] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [isMasteryManagerOpen, setIsMasteryManagerOpen] = useState(false);

    const miningMastery = character.professions?.mining || { level: 1, exp: 0, maxExp: 100 };

    const currentUsage = base.dailyCounts?.[`mine_harvest_${currentInstanceId}`] || 0;
    // [MODIFIED] 레벨별 채굴 가능 횟수: Lv 1 -> 1회, Lv 2 -> 3회, Lv 3 -> 5회, Lv 4 -> 7회, Lv 5 -> 10회
    const getMiningMaxUsage = (level: number) => {
        const usageTable: Record<number, number> = { 1: 1, 2: 3, 3: 5, 4: 7, 5: 10 };
        if (usageTable[level] !== undefined) return usageTable[level];
        if (level > 5) return 10 + (level - 5) * 3;
        return 1;
    };
    const maxUsage = getMiningMaxUsage(mineLevel);
    const remainingUsage = Math.max(0, maxUsage - currentUsage);

    // [NEW] 모든 광산의 남은 채굴 횟수 합계 계산
    const totalRemainingMiningCount = useMemo(() => {
        let total = 0;
        allMines.forEach(m => {
            const mLevel = m.level || 1;
            const mUsage = base.dailyCounts?.[`mine_harvest_${m.id}`] || 0;
            const mMax = getMiningMaxUsage(mLevel);
            total += Math.max(0, mMax - mUsage);
        });
        return total;
    }, [allMines, base.dailyCounts]);

    // [NEW] 한 번에 여러 번 채굴하기 위한 횟수 설정
    const [mineCount, setMineCount] = useState<number>(1);
    const effectiveMineCount = Math.min(Math.max(1, mineCount), Math.max(1, remainingUsage));

    // 시간대 확인 (주간: 06:00 ~ 21:59, 심야: 22:00 ~ 05:59)
    const timeStr = character.currentTime || '08:00';
    const currentHour = parseInt(timeStr.split(':')[0], 10) || 8;
    const isLateNight = currentHour >= 22 || currentHour < 6;

    const handleSwitchMine = (newId: string) => {
        setCurrentInstanceId(newId);
        setSelectedZoneId(null);
        setShowSpecMenu(false);
        if (onChangeInstanceId) {
            onChangeInstanceId(newId);
        }
    };

    const handleSetSpecialization = (specId: string) => {
        const newChar = { ...character };
        const newBase = { ...newChar.base! };
        newBase.mineSpecializations = {
            ...(newBase.mineSpecializations || {}),
            [currentInstanceId]: specId
        };
        newChar.base = newBase;
        onUpdateCharacter(newChar, `[광산] 채굴 방침을 '${MINE_SPECIALIZATIONS.find(s => s.id === specId)?.name}'으로 변경했습니다.`);
        setShowSpecMenu(false);
    };

    const handleMine = executeWithCooldown((zoneId: string, count: number = 1) => {
        if (isLateNight) return alert("🌙 심야 시간대(22:00 ~ 06:00)에는 안전사고 방지를 위해 채굴 작업을 진행할 수 없습니다. 주간 시간대에 이용해 주세요.");
        const actualCount = Math.min(count, Math.max(1, remainingUsage));
        if (currentUsage >= maxUsage || actualCount <= 0) return alert("오늘의 채굴 횟수를 모두 소진했습니다.");
        
        const zone = MINE_ZONES.find(z => z.id === zoneId);
        if (!zone) return;

        setIsMining(true);

        // 시뮬레이션 지연 (실제 게임에서는 즉시 처리하거나 짧은 연출)
        setTimeout(() => {
            let successCount = 0;
            let failureCount = 0;

            let totalStoneYield = 0;
            let totalIronYield = 0;
            let totalManaStoneYield = 0;
            let totalManaCrystalYield = 0;
            let totalGoldYield = 0;
            let totalSilverYield = 0;
            let totalDiamondYield = 0;
            let totalRubyYield = 0;
            let totalSapphireYield = 0;
            let totalEmeraldYield = 0;
            let totalHolyStoneYield = 0;
            let totalRareCrystalYield = 0;

            let totalExpGain = 0;

            // [MODIFIED] Accumulate bonuses from all assigned miners, primarily driven by mastery
            let totalMasteryLevel = 0;
            assignees.forEach(a => {
                const mastery = a.professions?.mining?.level || 1;
                totalMasteryLevel += mastery;
            });

            // 숙련도 평균 보너스 (레벨당 3% 증가 - 가중치 상향)
            const avgMastery = assignees.length > 0 ? totalMasteryLevel / assignees.length : (miningMastery.level);
            const masteryBonus = 1 + (avgMastery * 0.03);
            const totalMasteryYieldBonus = Math.floor(totalMasteryLevel * 0.5);
            const specBonus = specialization.bonus as any;

            for (let i = 0; i < actualCount; i++) {
                // 위험도에 따른 실패 확률 체크
                const isFailed = Math.random() < (zone.risk / 100);
                if (isFailed) {
                    failureCount++;
                    continue;
                }

                successCount++;

                // 행운 요소 (0.9 ~ 1.1) - 숙련도가 높을수록 편차가 줄어들고 고점이 높아짐
                const stability = Math.min(0.2, avgMastery * 0.002);
                const luck = (0.9 + Math.random() * (0.2 + stability)) * masteryBonus;

                const getYield = (baseYield: number | undefined, bonus: number) => {
                    if (!baseYield) return 0;
                    const ty = baseYield * luck * bonus;
                    if (ty < 1) {
                        return Math.random() < ty ? 1 : 0;
                    }
                    return Math.floor(ty);
                };

                const stoneYield = Math.floor((zone.yields.stone + (mineLevel * 3) + totalMasteryYieldBonus) * luck * (specBonus.stone || 1));
                const ironYield = Math.floor((zone.yields.iron + (mineLevel * 2) + Math.floor(totalMasteryYieldBonus * 0.8)) * luck * (specBonus.iron || 1));
                const manaStoneYield = Math.floor((zone.yields.manaStone + (mineLevel * 2) + Math.floor(totalMasteryYieldBonus * 0.8)) * luck * (specBonus.manaStone || 1));
                const manaCrystalYield = getYield(zone.yields.manaCrystal, specBonus.manaCrystal || 1);

                const goldYield = getYield((zone.yields as any).gold_ore, specBonus.gold_ore || 1);
                const silverYield = getYield((zone.yields as any).silver_ore, specBonus.silver_ore || 1);

                // Gems (숙련도에 따라 획득 확률 증가)
                const gemLuck = luck * (1 + miningMastery.level * 0.01);
                const diamondYield = ((zone.yields as any).diamond && Math.random() < (zone.yields as any).diamond * (specBonus.diamond || 1) * gemLuck) ? 1 : 0;
                const rubyYield = ((zone.yields as any).ruby && Math.random() < (zone.yields as any).ruby * (specBonus.ruby || 1) * gemLuck) ? 1 : 0;
                const sapphireYield = ((zone.yields as any).sapphire && Math.random() < (zone.yields as any).sapphire * (specBonus.sapphire || 1) * gemLuck) ? 1 : 0;
                const emeraldYield = ((zone.yields as any).emerald && Math.random() < (zone.yields as any).emerald * (specBonus.emerald || 1) * gemLuck) ? 1 : 0;
                const holyStoneYield = (base.location?.region === "신계" && zone.id === 'abyss' && Math.random() < 0.1 * gemLuck) ? 1 : 0;

                let rareCrystalYield = 0;
                if (zone.yields.rareCrystal && Math.random() < zone.yields.rareCrystal * gemLuck) {
                    rareCrystalYield = 1;
                }

                totalStoneYield += stoneYield;
                totalIronYield += ironYield;
                totalManaStoneYield += manaStoneYield;
                totalManaCrystalYield += manaCrystalYield;
                totalGoldYield += goldYield;
                totalSilverYield += silverYield;
                totalDiamondYield += diamondYield;
                totalRubyYield += rubyYield;
                totalSapphireYield += sapphireYield;
                totalEmeraldYield += emeraldYield;
                totalHolyStoneYield += holyStoneYield;
                totalRareCrystalYield += rareCrystalYield;

                totalExpGain += (10 + zone.minLevel * 5);
            }

            // 전회 실패한 경우
            if (successCount === 0) {
                let newChar = { ...character };
                const newBase = { ...newChar.base! };
                newBase.dailyCounts = {
                    ...(newBase.dailyCounts || {}),
                    [`mine_harvest_${currentInstanceId}`]: currentUsage + actualCount
                };
                newChar.base = newBase;

                const allMinesCount = Math.max(1, allMines.length);
                const mineTimeMinutes = Math.max(1, Math.floor((actualCount / 10) * (60 / allMinesCount)));
                const timeRes = advanceGameTime(newChar, mineTimeMinutes, { activityName: "광산 채굴" });
                newChar = timeRes.updatedCharacter;

                setResultData({
                    type: 'failure',
                    title: '채굴 실패',
                    message: actualCount > 1 
                        ? `${zone.name}에서 ${actualCount}회 채굴을 시도했으나 모두 낙반 사고로 실패했습니다.`
                        : `${zone.name}에서 채굴 중 낙반 사고가 발생하여 아무것도 얻지 못했습니다.`,
                    items: [
                        { label: '시도 횟수', after: `${actualCount}회` },
                        { label: '상태', after: '전회 실패 (낙반 사고)', color: 'text-red-500' },
                        { label: '소모 시간', after: mineTimeMinutes >= 60 ? `+${Math.floor(mineTimeMinutes / 60)}시간${mineTimeMinutes % 60 > 0 ? ` ${mineTimeMinutes % 60}분` : ''}` : `+${mineTimeMinutes}분` }
                    ]
                });

                onUpdateCharacter(newChar, `[광산] ${zone.name}에서 ${actualCount}회 채굴 실패 (시간 +${mineTimeMinutes}분, 낙반 사고)`, timeRes.dailyReport);
                setIsMining(false);
                setSelectedZoneId(null);
                return;
            }

            // 숙련도 획득 및 레벨업 체크
            const initialLevel = character.professions?.mining?.level || 1;
            const { newChar: charWithExp, leveledUp } = gainProfessionExp(character, 'mining', totalExpGain);
            let newChar = charWithExp;
            
            // 모든 참여 광부들에게 경험치 분배
            const updatedAssignees = [...assignees];
            updatedAssignees.forEach(a => {
                if (a.job === JobType.MINER || a.job === JobType.SLAVE || (a.job as string) === '노예') {
                    if (!a.professions) a.professions = {};
                    if (!a.professions.mining) a.professions.mining = { level: 1, exp: 0, maxExp: 100 };
                    
                    const mastery = a.professions.mining;
                    const oldLevel = mastery.level;
                    mastery.exp += totalExpGain;
                    while (mastery.exp >= mastery.maxExp) {
                        mastery.exp -= mastery.maxExp;
                        mastery.level += 1;
                        mastery.maxExp = Math.floor(mastery.maxExp * 1.2);
                    }
                    
                    if (mastery.level !== oldLevel) {
                        let jobTitle = "견습 광부";
                        const level = mastery.level;
                        if (level >= 100) jobTitle = '전설 광부';
                        else if (level >= 80) jobTitle = '명인 광부';
                        else if (level >= 50) jobTitle = '장인 광부';
                        else if (level >= 20) jobTitle = '숙련 광부';
                        else if (level >= 10) jobTitle = '일반 광부';
                        
                        const baseClass = a.finalClassName || a.lastClassName || a.secondClassName || a.firstClassName;
                        a.classType = (baseClass && baseClass !== '미정') ? `${jobTitle} (${baseClass})` : jobTitle;
                    }
                }
            });

            // 동료 데이터 업데이트
            updatedAssignees.forEach(a => {
                if (newChar.companions.some(c => c.id === a.id)) {
                    newChar.companions = newChar.companions.map(c => c.id === a.id ? a : c);
                } else if (newChar.inactiveCompanions) {
                    newChar.inactiveCompanions = newChar.inactiveCompanions.map(c => c.id === a.id ? a : c);
                }
            });

            const newBase = { ...newChar.base! };
            newBase.dailyCounts = {
                ...(newBase.dailyCounts || {}),
                [`mine_harvest_${currentInstanceId}`]: currentUsage + actualCount
            };
            
            newBase.resources = {
                ...newBase.resources,
                stone: newBase.resources.stone + totalStoneYield,
                iron: newBase.resources.iron + totalIronYield,
                manaStone: (newBase.resources.manaStone || 0) + totalManaStoneYield,
                manaCrystal: (newBase.resources.manaCrystal || 0) + totalManaCrystalYield,
                rareCrystal: (newBase.resources.rareCrystal || 0) + totalRareCrystalYield,
                gold_ore: (newBase.resources.gold_ore || 0) + totalGoldYield,
                silver_ore: (newBase.resources.silver_ore || 0) + totalSilverYield,
                diamond: (newBase.resources.diamond || 0) + totalDiamondYield,
                ruby: (newBase.resources.ruby || 0) + totalRubyYield,
                sapphire: (newBase.resources.sapphire || 0) + totalSapphireYield,
                emerald: (newBase.resources.emerald || 0) + totalEmeraldYield,
                holy_stone: (newBase.resources.holy_stone || 0) + totalHolyStoneYield,
            };
            
            newChar.base = newBase;

            const allMinesCount = Math.max(1, allMines.length);
            const mineTimeMinutes = Math.max(1, Math.floor((actualCount / 10) * (60 / allMinesCount)));
            const timeRes = advanceGameTime(newChar, mineTimeMinutes, { activityName: "광산 채굴" });
            newChar = timeRes.updatedCharacter;
            
            const items: { label: string; after: string; color?: string }[] = [];
            items.push({ label: '소모 시간', after: mineTimeMinutes >= 60 ? `+${Math.floor(mineTimeMinutes / 60)}시간${mineTimeMinutes % 60 > 0 ? ` ${mineTimeMinutes % 60}분` : ''}` : `+${mineTimeMinutes}분` });
            if (actualCount > 1) {
                items.push({
                    label: '채굴 결과',
                    after: failureCount > 0 ? `${successCount}회 성공 / ${failureCount}회 실패` : `${successCount}회 전회 성공`,
                    color: failureCount > 0 ? 'text-amber-400' : 'text-emerald-400'
                });
            }
            if (totalStoneYield > 0) items.push({ label: '석재', after: `+${totalStoneYield.toLocaleString()}` });
            if (totalIronYield > 0) items.push({ label: '철광석', after: `+${totalIronYield.toLocaleString()}` });
            if (totalManaStoneYield > 0) items.push({ label: '마석', after: `+${totalManaStoneYield.toLocaleString()}` });
            if (totalManaCrystalYield > 0) items.push({ label: '마정석', after: `+${totalManaCrystalYield.toLocaleString()}` });
            if (totalGoldYield > 0) items.push({ label: '금광석', after: `+${totalGoldYield.toLocaleString()}` });
            if (totalSilverYield > 0) items.push({ label: '은광석', after: `+${totalSilverYield.toLocaleString()}` });
            if (totalDiamondYield > 0) items.push({ label: '다이아몬드', after: `+${totalDiamondYield.toLocaleString()}` });
            if (totalRubyYield > 0) items.push({ label: '루비', after: `+${totalRubyYield.toLocaleString()}` });
            if (totalSapphireYield > 0) items.push({ label: '사파이어', after: `+${totalSapphireYield.toLocaleString()}` });
            if (totalEmeraldYield > 0) items.push({ label: '에메랄드', after: `+${totalEmeraldYield.toLocaleString()}` });
            if (totalHolyStoneYield > 0) items.push({ label: '신성석', after: `+${totalHolyStoneYield.toLocaleString()}` });
            if (totalRareCrystalYield > 0) items.push({ label: '레어 결정', after: `+${totalRareCrystalYield.toLocaleString()}` });

            if (leveledUp) {
                items.push({ label: '채굴 숙련도', after: `Lv.${initialLevel} -> Lv.${newChar.professions!.mining.level}` });
            } else {
                items.push({ label: '채굴 숙련도 경험치', after: `+${totalExpGain}` });
            }

            setResultData({
                type: leveledUp ? 'levelup' : 'success',
                title: leveledUp ? '채굴 숙련도 상승!' : (actualCount > 1 ? `${actualCount}회 채굴 완료` : '채굴 완료'),
                message: actualCount > 1 
                    ? `${zone.name}에서 ${actualCount}회 채굴을 진행했습니다. (${successCount}회 성공${failureCount > 0 ? `, ${failureCount}회 낙반 사고` : ''})`
                    : `${zone.name}에서 채굴을 무사히 마쳤습니다.`,
                items: items
            });

            onUpdateCharacter(newChar, `[광산] ${zone.name}에서 ${actualCount}회 채굴 완료 (성공 ${successCount}회)`, timeRes.dailyReport);
            setIsMining(false);
            setSelectedZoneId(null);
        }, 1500);
    });

    // [NEW] 기지 내 모든 광산 일괄 채굴/수확 핸들러
    const handleMineAllMines = executeWithCooldown(() => {
        if (isLateNight) return alert("🌙 심야 시간대(22:00 ~ 06:00)에는 안전사고 방지를 위해 채굴 작업을 진행할 수 없습니다. 주간 시간대에 이용해 주세요.");
        const availableMines = allMines.map(m => {
            const mLevel = m.level || 1;
            const mUsage = base.dailyCounts?.[`mine_harvest_${m.id}`] || 0;
            const mMax = getMiningMaxUsage(mLevel);
            const mRemaining = Math.max(0, mMax - mUsage);
            return { mine: m, remaining: mRemaining, level: mLevel, usage: mUsage };
        }).filter(item => item.remaining > 0);

        if (availableMines.length === 0) return alert("오늘 채굴 가능한 광산이 없습니다.");

        setIsMining(true);

        setTimeout(() => {
            let totalSuccess = 0;
            let totalFailure = 0;
            let totalExp = 0;
            let totalMinedTimes = 0;

            let totalStone = 0;
            let totalIron = 0;
            let totalManaStone = 0;
            let totalManaCrystal = 0;
            let totalGold = 0;
            let totalSilver = 0;
            let totalDiamond = 0;
            let totalRuby = 0;
            let totalSapphire = 0;
            let totalEmerald = 0;
            let totalHolyStone = 0;
            let totalRareCrystal = 0;

            const newChar = JSON.parse(JSON.stringify(character)) as Character;
            const newBase = newChar.base!;
            if (!newBase.dailyCounts) newBase.dailyCounts = {};

            const allMinersList = [...newChar.companions, ...(newChar.inactiveCompanions || [])];

            availableMines.forEach(({ mine, remaining, level, usage }) => {
                const specId = newBase.mineSpecializations?.[mine.id] || 'general';
                const mineSpec = MINE_SPECIALIZATIONS.find(s => s.id === specId) || MINE_SPECIALIZATIONS[0];
                const specBonus = mineSpec.bonus as any;

                const eligibleZones = MINE_ZONES.filter(z => level >= z.minLevel);
                const zone = (selectedZoneId && eligibleZones.find(z => z.id === selectedZoneId)) || eligibleZones[eligibleZones.length - 1] || MINE_ZONES[0];

                const mAssigneeIds = newBase.multiAssignments?.[mine.id] || (newBase.assignments?.[mine.id] ? [newBase.assignments[mine.id] as string] : []);
                const mAssignees = allMinersList.filter(c => mAssigneeIds.includes(c.id));

                let totalMasteryLevel = 0;
                mAssignees.forEach(a => {
                    totalMasteryLevel += a.professions?.mining?.level || 1;
                });

                const avgMastery = mAssignees.length > 0 ? totalMasteryLevel / mAssignees.length : (miningMastery.level);
                const masteryBonus = 1 + (avgMastery * 0.03);
                const totalMasteryYieldBonus = Math.floor(totalMasteryLevel * 0.5);

                let mineExpGain = 0;

                for (let i = 0; i < remaining; i++) {
                    totalMinedTimes++;
                    const isFailed = Math.random() < (zone.risk / 100);
                    if (isFailed) {
                        totalFailure++;
                        continue;
                    }

                    totalSuccess++;
                    const stability = Math.min(0.2, avgMastery * 0.002);
                    const luck = (0.9 + Math.random() * (0.2 + stability)) * masteryBonus;

                    const getYield = (baseYield: number | undefined, bonus: number) => {
                        if (!baseYield) return 0;
                        const ty = baseYield * luck * bonus;
                        return ty < 1 ? (Math.random() < ty ? 1 : 0) : Math.floor(ty);
                    };

                    totalStone += Math.floor((zone.yields.stone + (level * 3) + totalMasteryYieldBonus) * luck * (specBonus.stone || 1));
                    totalIron += Math.floor((zone.yields.iron + (level * 2) + Math.floor(totalMasteryYieldBonus * 0.8)) * luck * (specBonus.iron || 1));
                    totalManaStone += Math.floor((zone.yields.manaStone + (level * 2) + Math.floor(totalMasteryYieldBonus * 0.8)) * luck * (specBonus.manaStone || 1));
                    totalManaCrystal += getYield(zone.yields.manaCrystal, specBonus.manaCrystal || 1);

                    totalGold += getYield((zone.yields as any).gold_ore, specBonus.gold_ore || 1);
                    totalSilver += getYield((zone.yields as any).silver_ore, specBonus.silver_ore || 1);

                    const gemLuck = luck * (1 + miningMastery.level * 0.01);
                    if ((zone.yields as any).diamond && Math.random() < (zone.yields as any).diamond * (specBonus.diamond || 1) * gemLuck) totalDiamond++;
                    if ((zone.yields as any).ruby && Math.random() < (zone.yields as any).ruby * (specBonus.ruby || 1) * gemLuck) totalRuby++;
                    if ((zone.yields as any).sapphire && Math.random() < (zone.yields as any).sapphire * (specBonus.sapphire || 1) * gemLuck) totalSapphire++;
                    if ((zone.yields as any).emerald && Math.random() < (zone.yields as any).emerald * (specBonus.emerald || 1) * gemLuck) totalEmerald++;
                    if (newBase.location?.region === "신계" && zone.id === 'abyss' && Math.random() < 0.1 * gemLuck) totalHolyStone++;
                    if (zone.yields.rareCrystal && Math.random() < zone.yields.rareCrystal * gemLuck) totalRareCrystal++;

                    const stepExp = 10 + zone.minLevel * 5;
                    mineExpGain += stepExp;
                    totalExp += stepExp;
                }

                newBase.dailyCounts[`mine_harvest_${mine.id}`] = usage + remaining;

                mAssignees.forEach(a => {
                    if (a.job === JobType.MINER || a.job === JobType.SLAVE || (a.job as string) === '노예') {
                        if (!a.professions) a.professions = {};
                        if (!a.professions.mining) a.professions.mining = { level: 1, exp: 0, maxExp: 100 };
                        const mastery = a.professions.mining;
                        const oldLevel = mastery.level;
                        mastery.exp += mineExpGain;
                        while (mastery.exp >= mastery.maxExp) {
                            mastery.exp -= mastery.maxExp;
                            mastery.level += 1;
                            mastery.maxExp = Math.floor(mastery.maxExp * 1.2);
                        }
                        if (mastery.level !== oldLevel) {
                            let jobTitle = "견습 광부";
                            const lvl = mastery.level;
                            if (lvl >= 100) jobTitle = '전설 광부';
                            else if (lvl >= 80) jobTitle = '명인 광부';
                            else if (lvl >= 50) jobTitle = '장인 광부';
                            else if (lvl >= 20) jobTitle = '숙련 광부';
                            else if (lvl >= 10) jobTitle = '일반 광부';
                            const baseClass = a.finalClassName || a.lastClassName || a.secondClassName || a.firstClassName;
                            a.classType = (baseClass && baseClass !== '미정') ? `${jobTitle} (${baseClass})` : jobTitle;
                        }
                    }
                });
            });

            newBase.resources.stone = (newBase.resources.stone || 0) + totalStone;
            newBase.resources.iron = (newBase.resources.iron || 0) + totalIron;
            newBase.resources.manaStone = (newBase.resources.manaStone || 0) + totalManaStone;
            newBase.resources.manaCrystal = (newBase.resources.manaCrystal || 0) + totalManaCrystal;
            newBase.resources.rareCrystal = (newBase.resources.rareCrystal || 0) + totalRareCrystal;
            newBase.resources.gold_ore = (newBase.resources.gold_ore || 0) + totalGold;
            newBase.resources.silver_ore = (newBase.resources.silver_ore || 0) + totalSilver;
            newBase.resources.diamond = (newBase.resources.diamond || 0) + totalDiamond;
            newBase.resources.ruby = (newBase.resources.ruby || 0) + totalRuby;
            newBase.resources.sapphire = (newBase.resources.sapphire || 0) + totalSapphire;
            newBase.resources.emerald = (newBase.resources.emerald || 0) + totalEmerald;
            newBase.resources.holy_stone = (newBase.resources.holy_stone || 0) + totalHolyStone;

            const { newChar: charWithExp, leveledUp } = gainProfessionExp(newChar, 'mining', totalExp);
            
            const allMinesCount = Math.max(1, allMines.length);
            const totalMinedMinutes = Math.max(1, Math.floor((totalMinedTimes / 10) * (60 / allMinesCount)));
            const timeRes = advanceGameTime(charWithExp, totalMinedMinutes, { activityName: "모든 광산 일괄 채굴" });
            const finalChar = timeRes.updatedCharacter;

            setIsMining(false);
            onUpdateCharacter(finalChar, `[모든 광산] 총 ${availableMines.length}개 광산에서 ${totalMinedTimes}회 일괄 채굴 완료! (시간 +${totalMinedMinutes}분, 성공 ${totalSuccess}회, 실패 ${totalFailure}회)`, timeRes.dailyReport);

            const resultItems: { label: string; after: string; color?: string }[] = [];
            resultItems.push({ label: '소모 시간', after: totalMinedMinutes >= 60 ? `+${Math.floor(totalMinedMinutes / 60)}시간${totalMinedMinutes % 60 > 0 ? ` ${totalMinedMinutes % 60}분` : ''}` : `+${totalMinedMinutes}분` });
            resultItems.push({ label: '진행 광산', after: `${availableMines.length}개소 (총 ${totalMinedTimes}회 채굴)` });
            resultItems.push({ label: '채굴 결과', after: `성공 ${totalSuccess}회 / 낙반 ${totalFailure}회`, color: totalFailure > 0 ? 'text-amber-400' : 'text-emerald-400' });
            if (totalStone > 0) resultItems.push({ label: '석재', after: `+${totalStone.toLocaleString()}` });
            if (totalIron > 0) resultItems.push({ label: '철광석', after: `+${totalIron.toLocaleString()}` });
            if (totalManaStone > 0) resultItems.push({ label: '마석', after: `+${totalManaStone.toLocaleString()}` });
            if (totalManaCrystal > 0) resultItems.push({ label: '마정석', after: `+${totalManaCrystal.toLocaleString()}` });
            if (totalRareCrystal > 0) resultItems.push({ label: '희귀 마정석', after: `+${totalRareCrystal.toLocaleString()}`, color: 'text-purple-400' });
            if (totalGold > 0) resultItems.push({ label: '금광석', after: `+${totalGold.toLocaleString()}` });
            if (totalSilver > 0) resultItems.push({ label: '은광석', after: `+${totalSilver.toLocaleString()}` });
            if (totalDiamond > 0) resultItems.push({ label: '다이아몬드', after: `+${totalDiamond}` });
            if (totalRuby > 0) resultItems.push({ label: '루비', after: `+${totalRuby}` });
            if (totalSapphire > 0) resultItems.push({ label: '사파이어', after: `+${totalSapphire}` });
            if (totalEmerald > 0) resultItems.push({ label: '에메랄드', after: `+${totalEmerald}` });
            if (totalHolyStone > 0) resultItems.push({ label: '신성석', after: `+${totalHolyStone}`, color: 'text-cyan-400' });
            resultItems.push({ label: '채광 숙련도 경험치', after: `+${totalExp.toLocaleString()}` });
            if (leveledUp) {
                resultItems.push({ label: '숙련도 상승!', after: `Lv.${charWithExp.professions?.mining?.level}`, color: 'text-yellow-400' });
            }

            setResultData({
                type: totalSuccess > 0 ? 'success' : 'failure',
                title: '모든 광산 일괄 채굴 완료',
                message: `총 ${availableMines.length}개 광산에서 남은 채굴 횟수(${totalMinedTimes}회)를 모두 일괄 채굴했습니다.`,
                items: resultItems
            });
        }, 1500);
    });

    const upgradeConfig = FACILITY_UPGRADE_CONFIG['mine'];
    const canUpgrade = mineLevel < (upgradeConfig?.maxLevel || 5);

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
                    <h3 className="text-lg font-bold text-amber-300 mb-1">광산 공사 진행 중</h3>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                        현재 광산 공사가 진행 중입니다.<br />완공 전에는 광산에 입장하거나 채굴 작업을 진행할 수 없습니다.
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
                    {allMines.length > 0 ? (
                        <div className="flex gap-2 w-full">
                            <button
                                onClick={() => setCurrentInstanceId(allMines[0].id)}
                                className="flex-1 py-2.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all"
                            >
                                완공된 광산으로 이동
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
                        <div className="p-2 bg-amber-900/30 rounded-lg border border-amber-500/30">
                            <Pickaxe className="text-amber-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                {allMines.length > 1 ? `제 ${mineNumber} 광산` : '광산 관리'}
                                <span className="text-xs bg-amber-900/50 px-2 py-0.5 rounded text-amber-400 border border-amber-500/30">Lv.{mineLevel}</span>
                            </h2>
                            <p className="text-xs text-slate-400">지하 깊은 곳의 자원을 채굴합니다.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setIsMasteryManagerOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-900/20"
                        >
                            <TrendingUp size={14} />
                            숙련도 관리
                        </button>
                        <button 
                            onClick={() => setShowSpecMenu(!showSpecMenu)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-900/20"
                        >
                            <Target size={14} />
                            채굴 방침: {specialization.name}
                        </button>
                        {canUpgrade && onFacilityUpgrade && (
                            <button 
                                onClick={() => onFacilityUpgrade('mine')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-amber-900/20"
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

                {/* Mine Switch Navigation (여러 광산 보유 시) */}
                {allMines.length > 1 && (
                    <div className="bg-slate-950/90 border-b border-slate-800 px-3 py-2 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0">
                        <div className="flex items-center gap-1 shrink-0 text-xs font-bold text-amber-400 mr-1">
                            <Pickaxe size={14} />
                            <span>광산 이동</span>
                        </div>
                        <button
                            type="button"
                            disabled={currentMineIdx <= 0}
                            onClick={() => handleSwitchMine(allMines[currentMineIdx - 1].id)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded text-xs transition-colors shrink-0 flex items-center"
                            title="이전 광산으로 이동"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                            {allMines.map((m, idx) => {
                                const isSelected = m.id === currentInstanceId;
                                const mLevel = m.level || 1;
                                const mUsage = base.dailyCounts?.[`mine_harvest_${m.id}`] || 0;
                                const mMaxUsage = getMiningMaxUsage(mLevel);
                                const mRemaining = Math.max(0, mMaxUsage - mUsage);

                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => handleSwitchMine(m.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border active:scale-95 ${
                                            isSelected
                                                ? 'bg-amber-700 text-white border-amber-500 shadow-md shadow-amber-950/40'
                                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                                        }`}
                                    >
                                        <span>제 {idx + 1} 광산</span>
                                        <span className="text-[10px] px-1 py-0.2 bg-black/40 rounded font-mono">Lv.{mLevel}</span>
                                        {mRemaining > 0 ? (
                                            <span className="text-[10px] text-amber-300 font-mono font-bold">
                                                (남은 {mRemaining}회)
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-slate-500">완료</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            disabled={currentMineIdx >= allMines.length - 1}
                            onClick={() => handleSwitchMine(allMines[currentMineIdx + 1].id)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded text-xs transition-colors shrink-0 flex items-center"
                            title="다음 광산으로 이동"
                        >
                            <ChevronRight size={14} />
                        </button>

                        {allMines.length > 1 && (
                            <button
                                type="button"
                                onClick={handleMineAllMines}
                                disabled={totalRemainingMiningCount === 0 || isMining}
                                className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-md ${
                                    totalRemainingMiningCount > 0 && !isMining
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-amber-500/20 active:scale-95 animate-pulse'
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                }`}
                                title="보유한 모든 광산의 남은 채굴을 일괄 진행합니다."
                            >
                                <Sparkles size={14} />
                                <span>모든 광산 일괄 채굴</span>
                                {totalRemainingMiningCount > 0 && (
                                    <span className="px-1.5 py-0.5 bg-black/30 rounded-full text-[10px] font-mono">
                                        {totalRemainingMiningCount}회
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                )}

                {/* Mining Mastery Management Overlay */}
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
                                        광부 숙련도 관리
                                    </h2>
                                    <button onClick={() => setIsMasteryManagerOpen(false)} className="p-1 hover:bg-slate-800 rounded-full text-slate-400">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {/* All miners list */}
                                     {[...character.companions, ...(character.inactiveCompanions || [])]
                                         .filter(c => c.job === JobType.MINER || c.job === JobType.SLAVE || (c.job as string) === '노예')
                                         .map((miner, idx) => {
                                             const mastery = miner.professions?.mining || { level: 1, exp: 0, maxExp: 100 };
                                             
                                             // 현재 부여된 칭호/등급 계산
                                             const currentRankConfig = [...MINER_RANK_CONFIGS].reverse().find(cfg => mastery.level >= cfg.rankLevel) || MINER_RANK_CONFIGS[0];
                                             const nextRankIndex = MINER_RANK_CONFIGS.findIndex(cfg => cfg.rankLevel === currentRankConfig.rankLevel) + 1;
                                             const nextRankConfig = nextRankIndex < MINER_RANK_CONFIGS.length ? MINER_RANK_CONFIGS[nextRankIndex] : null;

                                             // 승급 조건 체크: 레벨 조건 && STR 스탯 조건
                                             const minerStats = calculateFinalStats(miner).finalStats;
                                             const currentStr = minerStats.str || 0;
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
                                                 const targetInActive = newChar.companions.find(c => c.id === miner.id);
                                                 const targetInInactive = (newChar.inactiveCompanions || []).find(c => c.id === miner.id);
                                                 const target = targetInActive || targetInInactive;

                                                 if (target) {
                                                     const baseClass = target.finalClassName || target.lastClassName || target.secondClassName || target.firstClassName;
                                                     const jobTitle = nextRankConfig.label;
                                                     target.classType = (baseClass && baseClass !== '미정') ? `${jobTitle} (${baseClass})` : jobTitle;
                                                     
                                                     onUpdateCharacter(newChar, `[광부 승급] ${target.name}이(가) [${jobTitle}] (으)로 승급했습니다!`);
                                                 }
                                             };

                                             return (
                                                 <div key={idx} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 shadow-lg">
                                                     <div className="flex justify-between items-start mb-3">
                                                         <div className="flex items-center gap-2">
                                                             <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center text-white font-bold">
                                                                 {miner.name[0]}
                                                             </div>
                                                             <div>
                                                                 <h4 className="text-sm font-bold text-white">{miner.name}</h4>
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
                                                             <div className="text-[9px] text-slate-500 mb-0.5">STR 스탯 (필요 STR)</div>
                                                             <div className={`text-xs font-bold ${nextRankConfig ? (hasStrReq ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-300'}`}>
                                                                 STR {currentStr} {nextRankConfig ? `/ ${reqStr}` : ''}
                                                             </div>
                                                         </div>
                                                         <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                                                             <div className="text-[9px] text-slate-500 mb-0.5">상태</div>
                                                             <div className="text-xs font-bold text-slate-300">
                                                                 {character.companions.some(c => c.id === miner.id) ? '파티 참여 중' : (assigneeIds.includes(miner.id) ? '현재 광산 배치 중' : '대기 중')}
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
                                                             최고 직급 달성 (전설 광부)
                                                         </div>
                                                     )}
                                                 </div>
                                             );
                                         })}
                                    
                                    {[...character.companions, ...(character.inactiveCompanions || [])]
                                        .filter(c => c.job === JobType.MINER || c.job === JobType.SLAVE || (c.job as string) === '노예').length === 0 && (
                                        <div className="py-12 text-center">
                                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-700">
                                                <User className="text-slate-600" size={32} />
                                            </div>
                                            <p className="text-sm text-slate-500">등록된 광부가 없습니다.</p>
                                            <p className="text-[10px] text-slate-600 mt-1">거주민에게 광부 직업을 권유해보세요.</p>
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
                <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50 relative">
                    <AnimatePresence>
                        {showSpecMenu && (
                            <motion.div 
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="absolute inset-x-6 top-6 z-20 bg-slate-950 border border-indigo-500/50 rounded-2xl p-4 shadow-2xl"
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                                        <Target size={16} /> 채굴 특화 방침 설정
                                    </h3>
                                    <button onClick={() => setShowSpecMenu(false)} className="text-slate-500 hover:text-white">
                                        <X size={16} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {MINE_SPECIALIZATIONS.map(spec => (
                                        <button
                                            key={spec.id}
                                            onClick={() => handleSetSpecialization(spec.id)}
                                            className={`p-3 rounded-xl border text-left transition-all ${specializationId === spec.id ? 'bg-indigo-900/30 border-indigo-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                                        >
                                            <div className="text-sm font-bold text-white mb-1">{spec.name}</div>
                                            <div className="text-[10px] text-slate-500">{spec.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {isMining && (
                        <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                            <motion.div 
                                animate={{ rotate: [0, -20, 0] }}
                                transition={{ repeat: Infinity, duration: 0.5 }}
                                className="text-amber-500 mb-4"
                            >
                                <Pickaxe size={64} />
                            </motion.div>
                            <p className="text-xl font-bold text-white animate-pulse">채굴 중...</p>
                        </div>
                    )}

                    {/* Late Night Notice Banner */}
                    {isLateNight && (
                        <div className="mb-6 p-4 bg-amber-950/80 border border-amber-500/40 rounded-2xl flex items-center gap-3 text-xs sm:text-sm text-amber-300 font-bold shadow-lg">
                            <span className="text-xl shrink-0">🌙</span>
                            <div>
                                <div className="text-white font-extrabold text-sm mb-0.5">심야 휴식 시간대 ({timeStr})</div>
                                <div className="text-amber-300/90 text-xs">안전사고 방지와 야간 휴식을 위해 광산 채굴 작업은 주간 시간대(06:00 ~ 22:00)에만 진행할 수 있습니다.</div>
                            </div>
                        </div>
                    )}

                    {/* Divine Realm Notice */}
                    {base.location?.region === "신계" && (
                        <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-2xl flex items-center gap-4 shadow-lg shadow-yellow-900/10">
                            <div className="p-2 bg-yellow-500/20 rounded-lg">
                                <Sparkles className="text-yellow-400" size={20} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-yellow-100">신계의 축복: 신성석 채굴 가능</div>
                                <p className="text-[11px] text-yellow-400/80">현재 기지가 신계에 위치하여 '심연' 구역에서 낮은 확률로 신성석을 획득할 수 있습니다.</p>
                            </div>
                        </div>
                    )}

                    {/* Stats & Assignee */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                            <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
                                <Clock size={16} className="text-blue-400" /> 오늘의 채굴 현황
                            </h3>
                            <div className="flex items-end justify-between">
                                <div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-bold text-white">{currentUsage}</span>
                                        <span className="text-slate-500">/ {maxUsage} 회</span>
                                    </div>
                                    <span className="text-[11px] text-amber-400 font-medium">잔여 {remainingUsage}회 가능</span>
                                </div>
                                <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-500 transition-all" 
                                        style={{ width: `${(currentUsage / maxUsage) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                            <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
                                <TrendingUp size={16} className="text-amber-400" /> 채굴 숙련도
                            </h3>
                            <div className="flex items-end justify-between">
                                <div>
                                    <span className="text-3xl font-bold text-white">Lv.{miningMastery.level}</span>
                                    <span className="text-slate-500 ml-1">({Math.floor((miningMastery.exp / miningMastery.maxExp) * 100)}%)</span>
                                </div>
                                <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-amber-500 transition-all" 
                                        style={{ width: `${(miningMastery.exp / miningMastery.maxExp) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                            <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
                                <User size={16} className="text-indigo-400" /> 담당자 정보 ({assignees.length})
                            </h3>
                            {assignees.length > 0 ? (
                                <div className="space-y-2 max-h-[60px] overflow-y-auto pr-1 custom-scrollbar">
                                    {assignees.map(a => (
                                        <div key={a.id} className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-indigo-900/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-[10px]">
                                                {a.name[0]}
                                            </div>
                                            <div className="text-[11px] font-bold text-white truncate max-w-[80px]">{a.name}</div>
                                            <div className="text-[9px] text-amber-500">광석+마석 보너스: +{Math.floor((a.professions?.mining?.level || 1) * 0.5)}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-600 italic">배치된 담당자가 없습니다.</p>
                            )}
                        </div>
                    </div>

                    {/* Mine Zones */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Mountain size={16} className="text-amber-600" /> 채굴 구역 선택
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            {MINE_ZONES.map(zone => {
                                const isLocked = mineLevel < zone.minLevel;
                                const isSelected = selectedZoneId === zone.id;
                                
                                return (
                                    <button
                                        key={zone.id}
                                        onClick={() => !isLocked && setSelectedZoneId(zone.id)}
                                        disabled={isLocked || isMining}
                                        className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between group
                                            ${isLocked ? 'bg-slate-950/50 border-slate-800 opacity-50 cursor-not-allowed' : 
                                              isSelected ? 'bg-amber-900/20 border-amber-500 shadow-lg shadow-amber-900/20' : 
                                              'bg-slate-950 border-slate-800 hover:border-slate-600'}
                                        `}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all
                                                ${isLocked ? 'bg-slate-900 border-slate-800 text-slate-700' : 
                                                  isSelected ? 'bg-amber-500 border-amber-400 text-slate-900' : 
                                                  'bg-slate-900 border-slate-800 text-amber-500 group-hover:border-amber-500/50'}
                                            `}>
                                                {zone.id === 'surface' && <Mountain size={24} />}
                                                {zone.id === 'tunnel' && <Hammer size={24} />}
                                                {zone.id === 'deep' && <Gem size={24} />}
                                                {zone.id === 'abyss' && <Zap size={24} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-white">{zone.name}</span>
                                                    {isLocked && (
                                                        <span className="text-[9px] bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30">Lv.{zone.minLevel} 필요</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500">{zone.desc}</p>
                                            </div>
                                        </div>
                                        
                                        {!isLocked && (
                                            <div className="text-right">
                                                <div className="flex flex-wrap gap-1 justify-end mb-1 max-w-[200px]">
                                                    {zone.yields.stone > 0 && <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">석재</span>}
                                                    {zone.yields.iron > 0 && <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-blue-400">철</span>}
                                                    {zone.yields.manaStone > 0 && <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-indigo-400">마석</span>}
                                                    {zone.yields.manaCrystal > 0 && <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-purple-400">마정석</span>}
                                                    {(zone.yields as any).silver_ore > 0 && <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-200">은</span>}
                                                    {(zone.yields as any).gold_ore > 0 && <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-yellow-500">금</span>}
                                                    {(zone.yields as any).ruby > 0 && <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-red-500">보석</span>}
                                                    {base.location?.region === "신계" && zone.id === 'abyss' && (
                                                        <span className="text-[9px] bg-yellow-900/40 px-1.5 py-0.5 rounded text-yellow-200 border border-yellow-500/30 animate-pulse">
                                                            신성석
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-red-400 font-bold">위험도: {zone.risk}%</div>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <ActionResultModal 
                    data={resultData}
                    onClose={() => setResultData(null)}
                />

                {/* Footer / Action */}
                <div className="p-4 sm:p-6 bg-slate-950 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-slate-500 max-w-md text-center md:text-left">
                        구역을 선택하고 채굴을 시작하세요. 깊은 곳일수록 더 희귀한 자원을 얻을 수 있지만, 장비가 손상되거나 부상을 입을 위험이 있습니다.
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto justify-center md:justify-end">
                        {/* 다회 채굴 횟수 조절 컨트롤 (남은 횟수가 2회 이상일 때 표시) */}
                        {remainingUsage > 1 && (
                            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl w-full sm:w-auto justify-between sm:justify-start">
                                <span className="text-xs font-bold text-slate-400 mr-1">채굴 횟수</span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setMineCount(Math.max(1, effectiveMineCount - 1))}
                                        disabled={isMining || effectiveMineCount <= 1}
                                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold flex items-center justify-center text-sm transition-colors active:scale-95"
                                    >
                                        -
                                    </button>
                                    <span className="font-bold text-amber-300 text-sm px-1 min-w-[2.5rem] text-center font-mono">
                                        {effectiveMineCount}회
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setMineCount(Math.min(remainingUsage, effectiveMineCount + 1))}
                                        disabled={isMining || effectiveMineCount >= remainingUsage}
                                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold flex items-center justify-center text-sm transition-colors active:scale-95"
                                    >
                                        +
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMineCount(remainingUsage)}
                                        disabled={isMining || effectiveMineCount === remainingUsage}
                                        className="ml-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 transition-colors disabled:opacity-40 active:scale-95"
                                    >
                                        최대
                                    </button>
                                </div>
                                {/* 퀵 프리셋 버튼 */}
                                <div className="hidden sm:flex items-center gap-1 ml-1 pl-2 border-l border-slate-700">
                                    {[3, 5, 10].filter(n => n <= remainingUsage && n !== effectiveMineCount).map(preset => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setMineCount(preset)}
                                            disabled={isMining}
                                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-colors active:scale-95"
                                        >
                                            {preset}회
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {allMines.length > 1 && (
                            <button
                                onClick={handleMineAllMines}
                                disabled={isMining || totalRemainingMiningCount <= 0 || isLateNight}
                                className={`px-5 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px] ${
                                    isMining || totalRemainingMiningCount <= 0 || isLateNight
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                        : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 active:scale-95 animate-pulse'
                                }`}
                                title="보유한 모든 광산의 남은 채굴 횟수를 일괄 진행합니다."
                            >
                                <Sparkles size={18} />
                                <span>{isLateNight ? '심야 시간 채굴 불가' : `모든 광산 일괄 채굴 (${totalRemainingMiningCount}회)`}</span>
                            </button>
                        )}

                        <button
                            onClick={() => selectedZoneId && handleMine(selectedZoneId, effectiveMineCount)}
                            disabled={!selectedZoneId || isMining || currentUsage >= maxUsage || isLateNight}
                            className={`px-8 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px]
                                ${!selectedZoneId || isMining || currentUsage >= maxUsage || isLateNight
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20 active:scale-95'}
                            `}
                        >
                            <Pickaxe size={20} />
                            {isLateNight
                                ? '심야 시간 채굴 불가'
                                : currentUsage >= maxUsage 
                                ? '채굴 횟수 소진' 
                                : effectiveMineCount > 1 
                                ? `${effectiveMineCount}회 채굴 시작` 
                                : '채굴 시작'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default React.memo(MineModal);
