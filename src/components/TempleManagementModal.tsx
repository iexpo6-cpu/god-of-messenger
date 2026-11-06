
import React, { useState, useEffect } from 'react';
import { Character, Companion, Item, Quest, JobType, Stats, TemplePersonnel, ClassTier, Enemy } from '../types';
import { X, Landmark, Shield, Users, Brain, Hammer, Package, Sparkles, ScrollText, Sun, Flame, Skull, UserCheck, ArrowUpCircle, Zap, Activity, FlaskConical, Maximize, Heart, Coins, Target, RefreshCw, Sword, Moon, Droplets, Snowflake, Wind, Mountain, Ghost, ShieldCheck, Leaf, CloudSun, TowerControl, ArrowRight, Info, Lock, CheckCircle, Star, UserPlus, MessageCircle, Crown, Globe, User } from 'lucide-react';
import { getBossByLocation, DIVINE_REALM_BOSSES } from '../bossMonsters';
import { addDays } from '../utils';
import ActionResultModal, { ResultData } from './ActionResultModal';
import TransferationModal from './TransferationModal';
import GuardianManagementModal from './GuardianManagementModal';
import TemplePersonnelModal from './TemplePersonnelModal';
import TempleEquipmentModal from './TempleEquipmentModal';
import DivineElementalEnhancementModal from './DivineElementalEnhancementModal';
import DivineOracleModal from './DivineOracleModal'; 
import TempleReceptionModal from './TempleReceptionModal'; 
import TempleForeignAffairsModal from './TempleForeignAffairsModal'; 
import DivineRelationshipModal from './DivineRelationshipModal';
import { TEMPLE_MESSENGER_MAP, SHINRYOKU_TYPES_LIST } from '../constants';
import GodPowerModal from './GodPowerModal'; // [NEW]
import { calculateTempleMajesty } from '../templedefensesystem';
import { checkAndInitializeLiberationEligibility, getCompanionCP, isMonsterCompanion } from '../services/companionGrowthService';

interface Props {
    character: Character;
    onClose: () => void;
    onUpdateCharacter: (newChar: Character, logMsg: string) => void;
    onAction: (action: string) => void;
    onBattle?: (enemy: Enemy | Enemy[], type: string, source: string, targetCity?: string, targetNation?: string) => void;
}

type Tab = 'guardian' | 'personnel' | 'reception' | 'foreign_affairs' | 'facility' | 'equipment' | 'oracle' | 'divine_power'| 'god_power' | 'divine_elemental_enhancement' | 'potential_liberation'; 

const MESSENGER_POWER_CONFIG: Partial<Record<JobType, { 
    powerName: string, 
    itemName: string, 
    boost: number, 
    color: string, 
    bg: string,
    icon: any 
}>> = {
    [JobType.SOLAR_MESSENGER]: { powerName: "태양의 힘", itemName: "태양의 잔재", boost: 10, color: "text-orange-500", bg: "bg-orange-950/40", icon: Sun },
    [JobType.MOONLIGHT_MESSENGER]: { powerName: "달의 힘", itemName: "침묵의 대나무", boost: 10, color: "text-indigo-300", bg: "bg-indigo-900/40", icon: Moon },
    [JobType.FIRE_MESSENGER]: { powerName: "불꽃의 힘", itemName: "태우는 심장", boost: 5, color: "text-red-500", bg: "bg-red-950/40", icon: Flame },
    [JobType.SEA_MESSENGER]: { powerName: "바다의 힘", itemName: "영원한 파도 조각", boost: 5, color: "text-blue-400", bg: "bg-blue-950/40", icon: Droplets },
    [JobType.ICE_MESSENGER]: { powerName: "빙결의 힘", itemName: "동결된 시간", boost: 5, color: "text-cyan-300", bg: "bg-cyan-950/40", icon: Snowflake },
    [JobType.ELECTRIC_MESSENGER]: { powerName: "번개의 힘", itemName: "심판의 벼락 조각", boost: 5, color: "text-yellow-400", bg: "bg-yellow-950/40", icon: Zap },
    [JobType.GALE_MESSENGER]: { powerName: "질풍의 힘", itemName: "응축된 태풍", boost: 5, color: "text-emerald-300", bg: "bg-emerald-950/40", icon: Wind },
    [JobType.EARTH_MESSENGER]: { powerName: "땅의 힘", itemName: "지령의 맥", boost: 5, color: "text-amber-700", bg: "bg-amber-950/40", icon: Mountain },
    [JobType.VOID_MESSENGER]: { powerName: "무의 힘", itemName: "활빈당의 의기", boost: 5, color: "text-slate-400", bg: "bg-slate-800/40", icon: CloudSun },
    [JobType.RADIANT_MESSENGER]: { powerName: "빛의 힘", itemName: "광휘의 조각", boost: 5, color: "text-yellow-100", bg: "bg-yellow-900/40", icon: Sparkles },
    [JobType.STEEL_MESSENGER]: { powerName: "강철의 힘", itemName: "초고강도 합금", boost: 5, color: "text-zinc-400", bg: "bg-zinc-800/40", icon: Hammer },
    [JobType.DARK_MESSENGER]: { powerName: "어둠의 힘", itemName: "공허의 나사", boost: 5, color: "text-purple-500", bg: "bg-purple-950/40", icon: Ghost },
    [JobType.NATURE_MESSENGER]: { powerName: "자연의 힘", itemName: "태고의 씨앗", boost: 5, color: "text-green-500", bg: "bg-green-950/40", icon: Leaf },
};

const TempleManagementModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter, onAction, onBattle }) => {
    const [activeTab, setActiveTab] = useState<Tab>('guardian');
    const [resultData, setResultData] = useState<ResultData | null>(null);
    const [isTransferationOpen, setIsTransferationOpen] = useState(false);
    const [isGuardianManagementOpen, setIsGuardianManagementOpen] = useState(false);
    const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
    const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
    const [isDivineElementalOpen, setIsDivineElementalOpen] = useState(false);
    const [isOracleModalOpen, setIsOracleModalOpen] = useState(false); 
    const [isReceptionOpen, setIsReceptionOpen] = useState(false); 
    const [isForeignAffairsOpen, setIsForeignAffairsOpen] = useState(false); 
    const [isDivineRelModalOpen, setIsDivineRelModalOpen] = useState(false);
    const [isGodPowerOpen, setIsGodPowerOpen] = useState(false); // [NEW]
    const [boostTargetId, setBoostTargetId] = useState<string>('player');
    const [boostTargetSort, setBoostTargetSort] = useState<'default' | 'levelDesc' | 'levelAsc' | 'name' | 'combatPower' | 'affection'>('default');

    const loc = character.currentLocation || { region: "신계", nation: "양의 기운의 성전", city: "태양의 사자의 성전" };
    // 성전 수호수는 MYTHICBOSS(신의 사자)가 아닌 일반 신계 해당 지역 보스(DIVINE_REALM_BOSSES)로 설정
    const divineBoss = DIVINE_REALM_BOSSES[loc.nation]?.[loc.city || "태양의 사자의 성전"];
    const boss = divineBoss || getBossByLocation(loc.nation, loc.city || "태양의 사자의 성전");

    const templeKey = `${loc.nation}_${loc.city || 'Default'}`;
    const personnel: TemplePersonnel = character.base?.templePersonnel?.[templeKey] || {
        knightIds: [], butlerIds: [], maidIds: []
    };

    const templeLevel = character.base?.facilityLevels?.[`temple_size_${templeKey}`] || 1;
    const altarLevel = character.base?.facilityLevels?.[`temple_altar_${templeKey}`] || 1;
    const labLevel = character.base?.facilityLevels?.[`temple_lab_${templeKey}`] || 1;
    
    const allComps = [...character.companions, ...(character.inactiveCompanions || [])];

    const majestyValue = calculateTempleMajesty(character, templeKey);

    const guardianId = `${boss.name}_${loc.nation}`;
    const localGuardian = character.base?.guardianData?.[guardianId] || {
        level: boss.level,
        stats: {
            hp: boss.level * 10000, maxHp: boss.level * 10000, mp: boss.level * 2000, maxMp: boss.level * 2000,
            str: Math.floor(boss.level * 50), int: Math.floor(boss.level * 50), wis: boss.level * 100,
            def: boss.level * 100, agi: Math.floor(boss.level * 25), ctrl: boss.level * 100
        },
        affection: 100, trainCount: 0 
    };

    const requiredMessengerJob = TEMPLE_MESSENGER_MAP[loc.city || ''];
    
    let activeMessenger: any = null;
    if (requiredMessengerJob && character.job === requiredMessengerJob) {
        activeMessenger = character;
    } else if (requiredMessengerJob) {
        activeMessenger = allComps.find(c => c.job === requiredMessengerJob) || null;
    }

    const powerConfig = activeMessenger?.job ? MESSENGER_POWER_CONFIG[activeMessenger.job as JobType] : null;
    const templeElement = (loc.city && SHINRYOKU_TYPES_LIST.find(type => loc.city && loc.city.includes(type.replace('계','')))) || "광휘계";

    const getBoostRequiredCount = (statKey: keyof Stats, targetId: string) => {
        const boostKey = `${templeKey}_${targetId}_${statKey}`;
        return (character.base?.divinePowerBoosts?.[boostKey] || 0) + 1;
    };

    const getPotentialBoostTargets = () => {
        const targets: { id: string, name: string, role: string, entity?: any }[] = [];
        if (activeMessenger) {
            targets.push({ id: activeMessenger.id || 'player', name: activeMessenger.name, role: '담당 사자', entity: activeMessenger });
        }
        const workerIds = [
            personnel.priestId, 
            personnel.subPriestId, 
            ...(personnel.knightIds || []), 
            ...(personnel.butlerIds || []), 
            ...(personnel.maidIds || [])
        ].filter(Boolean) as string[];

        workerIds.forEach(id => {
            const comp = allComps.find(c => c.id === id);
            if (comp) {
                let roleLabel = "성전 근무자";
                if (personnel.priestId === id) roleLabel = "신관";
                else if (personnel.subPriestId === id) roleLabel = "부사제";
                else if (personnel.knightIds?.includes(id)) roleLabel = "수호기사";
                else if (personnel.butlerIds?.includes(id)) roleLabel = "집사";
                else if (personnel.maidIds?.includes(id)) roleLabel = "메이드";
                targets.push({ id: comp.id, name: comp.name, role: roleLabel, entity: comp });
            }
        });

        // 정렬 기준 적용
        return targets.sort((a, b) => {
            if (boostTargetSort === 'levelDesc') {
                return (b.entity?.level || 0) - (a.entity?.level || 0);
            }
            if (boostTargetSort === 'levelAsc') {
                return (a.entity?.level || 0) - (b.entity?.level || 0);
            }
            if (boostTargetSort === 'name') {
                return a.name.localeCompare(b.name, 'ko');
            }
            if (boostTargetSort === 'combatPower') {
                const getCp = (t: any) => {
                    const s = t.entity?.stats || {};
                    return (s.str || 0) + (s.int || 0) + (s.def || 0) + (s.agi || 0) + (s.wis || 0) + (s.ctrl || 0);
                };
                return getCp(b) - getCp(a);
            }
            if (boostTargetSort === 'affection') {
                return (b.entity?.affection ?? 0) - (a.entity?.affection ?? 0);
            }
            return 0;
        });
    };

    const handleStatBoost = (statKey: keyof Stats) => {
        if (!activeMessenger || !powerConfig) return;
        const boostTargets = getPotentialBoostTargets();
        const targetInfo = boostTargets.find(t => t.id === boostTargetId);
        if (!targetInfo) return;
        const isMessengerTarget = targetInfo.role === '담당 사자';
        const actualBoost = isMessengerTarget ? powerConfig.boost * 10 : powerConfig.boost;
        const requiredCount = getBoostRequiredCount(statKey, boostTargetId);
        const currentMaterials = character.inventory.filter(i => i.name === powerConfig.itemName);

        if (currentMaterials.length < requiredCount) {
            setResultData({
                type: 'warning', title: '재료 부족',
                message: `'${powerConfig.itemName}'가 ${requiredCount}개 필요합니다.\n현재 보유: ${currentMaterials.length}개\n해당 계통의 신화급 보스를 처치하여 획득할 수 있습니다.`,
                items: []
            });
            return;
        }

        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        if (!newChar.base) newChar.base = { level: 0, resources: {} as any, residents: [], facilities: [], assignments: {}, storage: [], facilityLevels: {}, dailyCounts: {}, elementalShards: {}, capturedMonsters: [], gridSize: 2, layout: [] };
        if (!newChar.base.divinePowerBoosts) newChar.base.divinePowerBoosts = {};

        let removed = 0;
        newChar.inventory = newChar.inventory.filter(item => {
            if (item.name === powerConfig.itemName && removed < requiredCount) {
                removed++;
                return false;
            }
            return true;
        });

        let finalTargetName = targetInfo.name;
        if (boostTargetId === 'player') {
            newChar.stats[statKey] += actualBoost;
        } else {
            const activeIdx = newChar.companions.findIndex(c => c.id === boostTargetId);
            if (activeIdx !== -1) {
                newChar.companions[activeIdx] = {
                    ...newChar.companions[activeIdx],
                    stats: { ...newChar.companions[activeIdx].stats, [statKey]: newChar.companions[activeIdx].stats[statKey] + actualBoost }
                };
            } else if (newChar.inactiveCompanions) {
                const inactiveIdx = newChar.inactiveCompanions.findIndex(c => c.id === boostTargetId);
                if (inactiveIdx !== -1) {
                    newChar.inactiveCompanions[inactiveIdx] = {
                        ...newChar.inactiveCompanions[inactiveIdx],
                        stats: { ...newChar.inactiveCompanions[inactiveIdx].stats, [statKey]: newChar.inactiveCompanions[inactiveIdx].stats[statKey] + actualBoost }
                    };
                }
            }
        }

        const boostKey = `${templeKey}_${boostTargetId}_${statKey}`;
        newChar.base.divinePowerBoosts[boostKey] = requiredCount;

        onUpdateCharacter(newChar, `[${powerConfig.powerName}] '${powerConfig.itemName}' ${requiredCount}개를 소모하여 ${finalTargetName}의 ${statKey.toUpperCase()}가 ${actualBoost} 상승했습니다.`);
        setResultData({ 
            type: 'success', 
            title: '권능 전수 성공', 
            message: `${powerConfig.itemName}의 정수를 정제하여 ${finalTargetName} 대원에게 전수했습니다.`, 
            items: [ 
                { label: '전수 대상', after: `${finalTargetName} (${targetInfo.role})` }, 
                { label: statKey.toUpperCase(), after: `+${actualBoost}` },
                { label: '누적 강화', after: `${requiredCount}회` }
            ] 
        });
    };

    const handleElementalEnhancement = (type: 'damage' | 'resistance') => {
        if (!boostTargetId) {
            setResultData({ type: 'warning', title: '대상 미선택', message: '강화할 대상을 선택해주세요.', items: [] });
            return;
        }

        const shards = character.base?.elementalShards || {};
        const currentShard = shards[templeElement] || 0;
        const materialName = powerConfig?.itemName || "알 수 없는 재료";
        const currentSpecial = character.inventory.filter(i => i.name === materialName).length;

        // Get current boost level to calculate cost (1% = 0.01)
        const currentBoost = type === 'damage' 
            ? (character.base?.elementalDamageBoosts?.[templeElement] || 0) 
            : (character.base?.elementalResistanceBoosts?.[templeElement] || 0);
        
        const boostLevel = Math.round(currentBoost * 100); // 1% = 0.01, so 1% boost means boostLevel 1
        const nextLevel = boostLevel + 1; // 1강 -> 1개, 2강 -> 2개...

        const costShard = 10 * nextLevel;
        const costSpecial = 1 * nextLevel;

        if (currentShard < costShard || currentSpecial < costSpecial) {
            setResultData({
                type: 'warning',
                title: '재료 부족',
                message: `속성 강화에 필요한 재료가 부족합니다.\n필요: ${templeElement} 조각 ${costShard}개, ${materialName} ${costSpecial}개`,
                items: []
            });
            return;
        }

        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        if (!newChar.base) newChar.base = { level: 0, resources: {} as any, residents: [], facilities: [], assignments: {}, storage: [], facilityLevels: {}, dailyCounts: {}, elementalShards: {}, capturedMonsters: [], gridSize: 2, layout: [] };
        if (!newChar.base.elementalDamageBoosts) newChar.base.elementalDamageBoosts = {};
        if (!newChar.base.elementalResistanceBoosts) newChar.base.elementalResistanceBoosts = {};

        // Deduct materials
        newChar.base.elementalShards = { ...newChar.base.elementalShards, [templeElement]: currentShard - costShard };
        let removedSpecial = 0;
        newChar.inventory = newChar.inventory.filter(item => {
            if (item.name === materialName && removedSpecial < costSpecial) {
                removedSpecial++;
                return false;
            }
            return true;
        });

        // Apply boost (1% = 0.01)
        const target = boostTargetId === 'player' ? newChar : newChar.companions.find(c => c.id === boostTargetId) || newChar.inactiveCompanions?.find(c => c.id === boostTargetId);
        
        if (target) {
            if (!target.base) target.base = { ...character.base, elementalShards: {}, elementalDamageBoosts: {}, elementalResistanceBoosts: {} } as any;
            if (!target.base.elementalDamageBoosts) target.base.elementalDamageBoosts = {};
            if (!target.base.elementalResistanceBoosts) target.base.elementalResistanceBoosts = {};

            if (type === 'damage') {
                target.base.elementalDamageBoosts[templeElement] = (target.base.elementalDamageBoosts[templeElement] || 0) + 0.01;
            } else {
                target.base.elementalResistanceBoosts[templeElement] = (target.base.elementalResistanceBoosts[templeElement] || 0) + 0.01;
            }
        }

        onUpdateCharacter(newChar, `[속성 강화] ${templeElement} ${type === 'damage' ? '피해' : '저항'} 강화 성공! (+1%)`);
        setResultData({
            type: 'success',
            title: '강화 성공!',
            message: `${templeElement} ${type === 'damage' ? '피해' : '저항'}가 1% 상승했습니다.`,
            items: []
        });
    };

    const handleFacilityUpgrade = (facilityId: 'size' | 'altar' | 'lab') => {
        const currentLevel = facilityId === 'size' ? templeLevel : facilityId === 'altar' ? altarLevel : labLevel;
        if (currentLevel >= (facilityId === 'size' ? 3 : 5)) return;
        const crystalCost = 50 * currentLevel;
        const faithCost = 10 * currentLevel;
        const currentCrystals = character.base?.resources.manaCrystal || 0;
        const currentFaith = character.faith || 0;
        if (currentCrystals < crystalCost || currentFaith < faithCost) {
            setResultData({
                type: 'warning', title: '자원 부족',
                message: '시설 업그레이드를 위한 신성한 자원이 부족합니다.',
                items: [
                    { label: '마정석', before: currentCrystals, after: crystalCost },
                    { label: '신앙심', before: currentFaith, after: faithCost }
                ]
            });
            return;
        }
        const newChar = { ...character };
        newChar.base!.resources.manaCrystal -= crystalCost;
        newChar.faith -= faithCost;
        if (!newChar.base!.facilityLevels) newChar.base!.facilityLevels = {};
        const nextLevel = currentLevel + 1;
        const fullId = `temple_${facilityId}_${templeKey}`;
        newChar.base!.facilityLevels[fullId] = nextLevel;
        const facilityName = facilityId === 'size' ? '성전 집무실' : facilityId === 'altar' ? '중앙 제단' : '성전 연구실';
        onUpdateCharacter(newChar, `[성전 관리] ${facilityName}를 Lv.${nextLevel}(으)로 강화했습니다.`);
        setResultData({
            type: 'levelup',
            title: `${facilityName} 강화 완료`,
            message: `성전의 기능이 향상되었습니다.`,
            items: [
                { label: '레벨', before: `Lv.${currentLevel}`, after: `Lv.${nextLevel}` },
                { label: '효과', after: facilityId === 'altar' ? `신앙심 획득 ${1 + (nextLevel - 1) * 0.5}배` : facilityId === 'lab' ? `재료 수량 ${nextLevel}개` : '권능 해방' }
            ]
        });
    };

    const handleAcceptOracle = (oracle: Quest) => { setIsOracleModalOpen(false); };

    const getPotentialUpgradeCost = (currentPot: ClassTier) => {
        switch (currentPot) {
            case ClassTier.LAST:
                return 10; // 파이널 클래스 해방 시 필요 태양의 잔재 10개로 대폭 조정
            default:
                return 0;
        }
    };

    const getNextPotentialTier = (currentPot: ClassTier) => {
        switch (currentPot) {
            case ClassTier.LAST:
                return ClassTier.FINAL; // 파이널 클래스는 성전관리모달에서만 승급 가능
            default:
                return null; // 그 외 등급은 기지 잠재력 돌파소에서만 승급 가능
        }
    };

    const handlePotentialBreakthrough = (companionId: string) => {
        if (!powerConfig) return;
        const comp = allComps.find(c => c.id === companionId);
        if (!comp) return;

        if (comp.isPotentialLocked) {
            setResultData({
                type: 'warning',
                title: '잠재력 제한 설정됨',
                message: '잠재력 제한이 설정된 동료는 더 이상 잠재력을 돌파할 수 없습니다.',
                items: []
            });
            return;
        }

        if (comp.potentialAppraised !== true) {
            setResultData({
                type: 'warning',
                title: '감정 미완료',
                message: '예언가 사바스에게 한계 잠재력을 감정받은 동료만 잠재력 돌파가 가능합니다.',
                items: []
            });
            return;
        }

        const initializedComp = checkAndInitializeLiberationEligibility(JSON.parse(JSON.stringify(comp)), getCompanionCP(comp));
        const currentPot = initializedComp.liberationPotential || ClassTier.NONE;
        const nextPot = getNextPotentialTier(currentPot);
        if (!nextPot) {
            setResultData({
                type: 'warning',
                title: '돌파 불가능',
                message: '이 대원은 현재 이 시설에서 추가적인 잠재력 돌파가 불가능합니다. (라스트 클래스 이하 등급은 기지 잠재력 돌파소 시설을 이용해 주세요.)',
                items: []
            });
            return;
        }

        const requiredCount = getPotentialUpgradeCost(currentPot);
        const materialName = powerConfig.itemName;
        const currentMaterialCount = character.inventory.filter(i => i.name === materialName).length;

        if (currentMaterialCount < requiredCount) {
            setResultData({
                type: 'warning',
                title: '재료 부족',
                message: `잠재력 돌파에 필요한 재료가 부족합니다.\n필요: ${materialName} ${requiredCount}개 (보유: ${currentMaterialCount}개)`,
                items: []
            });
            return;
        }

        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        
        // Deduct materials
        let removedCount = 0;
        newChar.inventory = newChar.inventory.filter(item => {
            if (item.name === materialName && removedCount < requiredCount) {
                removedCount++;
                return false;
            }
            return true;
        });

        // Find and update companion in companions or inactiveCompanions
        let targetCompanion = newChar.companions.find(c => c.id === companionId);
        if (!targetCompanion && newChar.inactiveCompanions) {
            targetCompanion = newChar.inactiveCompanions.find(c => c.id === companionId);
        }

        if (targetCompanion) {
            targetCompanion.liberationPotential = nextPot;
            // Re-initialize eligibility
            const reinitialized = checkAndInitializeLiberationEligibility(targetCompanion, getCompanionCP(targetCompanion));
            targetCompanion.liberationEligibility = reinitialized.liberationEligibility;
        }

        onUpdateCharacter(newChar, `[잠재력 돌파] ${comp.name}의 한계 잠재력이 ${currentPot}에서 ${nextPot}(으)로 돌파되었습니다! (소모: ${materialName} ${requiredCount}개)`);
        
        setResultData({
            type: 'success',
            title: '잠재력 돌파 성공!',
            message: `${comp.name}의 클래스 해방 한계 잠재력이 [파이널 클래스] (으)로 상승했습니다!\n이제 파이널 클래스로 각성할 수 있습니다.`,
            items: []
        });
    };

    const PowerIcon = powerConfig?.icon || Sparkles;
    const boostTargets = getPotentialBoostTargets();

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}
            {isTransferationOpen && activeMessenger?.job && (
                <TransferationModal character={character} messengerJob={activeMessenger.job} onClose={() => setIsTransferationOpen(false)} onUpdateCharacter={onUpdateCharacter} />
            )}
            {isGuardianManagementOpen && (
                <GuardianManagementModal 
                    character={character} bossData={boss} onClose={() => setIsGuardianManagementOpen(false)} 
                    onUpdateCharacter={onUpdateCharacter} materialName={powerConfig?.itemName}
                    messengerName={activeMessenger?.name}
                />
            )}
            {isPersonnelModalOpen && (
                <TemplePersonnelModal 
                    character={character} templeCity={loc.city} templeLevel={templeLevel} onClose={() => setIsPersonnelModalOpen(false)} 
                    onUpdateCharacter={onUpdateCharacter} 
                />
            )}
            {isEquipmentModalOpen && (
                <TempleEquipmentModal 
                    character={character} templeElement={templeElement} onClose={() => setIsEquipmentModalOpen(false)} 
                    onUpdateCharacter={onUpdateCharacter} 
                />
            )}
            {isDivineElementalOpen && (
                <DivineElementalEnhancementModal 
                    character={character} templeElement={templeElement} onClose={() => setIsDivineElementalOpen(false)} 
                    onUpdateCharacter={onUpdateCharacter} 
                />
            )}
            {isOracleModalOpen && (
                <DivineOracleModal 
                    character={character} 
                    templeCity={loc.city} 
                    messengerLevel={activeMessenger?.level || 500}
                    onClose={() => setIsOracleModalOpen(false)}
                    onAccept={handleAcceptOracle}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}
            {isReceptionOpen && (
                <TempleReceptionModal 
                    character={character} 
                    templeCity={loc.city} 
                    onClose={() => setIsReceptionOpen(false)} 
                    onUpdateCharacter={onUpdateCharacter} 
                    onAction={onAction}
                    onBattle={(enemy, type) => onBattle!(enemy, type || 'normal', 'reception')}
                />
            )}
            {isForeignAffairsOpen && (
                <TempleForeignAffairsModal 
                    character={character}
                    templeCity={loc.city}
                    onClose={() => setIsForeignAffairsOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                    onBattle={(enemy, type, source, targetCity, targetNation) => onBattle!(enemy, type, source, targetCity, targetNation)}
                />
            )}
            {isDivineRelModalOpen && (
                <DivineRelationshipModal
                    character={character}
                    onClose={() => setIsDivineRelModalOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                    onBattle={(enemy, type, source, targetCity, targetNation) => onBattle!(enemy, type, source, targetCity, targetNation)}
                />
            )}
   {isGodPowerOpen && ( // [NEW]
                <GodPowerModal 
                    character={character}
                    onClose={() => setIsGodPowerOpen(false)}
                    onUpdateCharacter={onUpdateCharacter}
                />
            )}

            <div className="bg-slate-900 border border-indigo-500 w-full max-w-5xl h-[92vh] md:h-[85vh] rounded-3xl shadow-[0_0_100px_rgba(99,102,241,0.2)] flex flex-col overflow-hidden relative">
                <div className="p-4 md:p-6 border-b border-indigo-900/50 bg-indigo-950/20 flex justify-between items-center shrink-0">
                    <div className="flex items-center">
                        <Landmark size={24} className="text-indigo-400 mr-3 md:mr-4" />
                        <div>
                            <h2 className="text-lg md:text-2xl font-bold text-white font-cinzel">{loc.city} 관리 본부</h2>
                            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 mt-1">
                                <p className="text-[10px] md:text-xs text-slate-400">담당 사자: {activeMessenger?.name || '미정'} | 집무실: <span className="text-indigo-300 font-bold">Lv.{templeLevel}</span></p>
                                <div className="hidden md:block h-4 w-px bg-slate-700"></div>
                                <div className="flex items-center gap-1.5 bg-amber-900/30 px-2 md:px-3 py-0.5 rounded-full border border-amber-500/30 shadow-inner w-fit">
                                    <Crown size={10} className="text-amber-400"/>
                                    <span className="text-[10px] md:text-xs font-bold text-amber-200">위엄도: {Math.floor(majestyValue).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-1.5 md:p-2 rounded-full hover:bg-slate-800 transition-colors"><X className="w-5 h-5 md:w-6 md:h-6" /></button>
                </div>

                <div className="flex border-b border-slate-800 bg-slate-950 shrink-0 overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('guardian')} className={`flex-1 py-4 px-6 text-xs font-bold flex items-center justify-center transition-all border-b-2 whitespace-nowrap ${activeTab === 'guardian' ? 'text-indigo-400 border-indigo-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                        <Shield size={16} className="mr-2"/> 수호수 관리
                    </button>
                    <button onClick={() => setActiveTab('personnel')} className={`flex-1 py-4 px-6 text-xs font-bold flex items-center justify-center transition-all border-b-2 whitespace-nowrap ${activeTab === 'personnel' ? 'text-indigo-400 border-indigo-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                        <Users size={16} className="mr-2"/> 인사 관리
                    </button>
                    <button onClick={() => setActiveTab('reception')} className={`flex-1 py-4 px-6 text-xs font-bold flex items-center justify-center transition-all border-b-2 whitespace-nowrap ${activeTab === 'reception' ? 'text-indigo-400 border-indigo-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                        <MessageCircle size={16} className="mr-2"/> 성전 접견실
                    </button>
                    <button onClick={() => setActiveTab('foreign_affairs')} className={`flex-1 py-4 px-6 text-xs font-bold flex items-center justify-center transition-all border-b-2 whitespace-nowrap ${activeTab === 'foreign_affairs' ? 'text-amber-400 border-amber-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                        <Globe size={16} className="mr-2"/> 대외 관계
                    </button>
                    <button onClick={() => setActiveTab('facility')} className={`flex-1 py-4 px-6 text-xs font-bold flex items-center justify-center transition-all border-b-2 whitespace-nowrap ${activeTab === 'facility' ? 'text-indigo-400 border-indigo-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                        <Hammer size={16} className="mr-2"/> 성전 시설
                    </button>
                    <button 
                        disabled={templeLevel < 2}
                        onClick={() => setActiveTab('equipment')} 
                        className={`flex-1 py-4 px-6 text-xs font-bold flex items-center justify-center transition-all border-b-2 whitespace-nowrap ${activeTab === 'equipment' ? 'text-indigo-400 border-indigo-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'} ${templeLevel < 2 ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                    >
                        <Package size={16} className="mr-2"/> {templeLevel < 2 && <Lock size={10} className="mr-1"/>} 장비 관리
                    </button>
                    <button 
                        disabled={character.isGodDefeated}
                        onClick={() => setActiveTab('oracle')} 
                        className={`flex-1 py-4 px-6 text-xs font-bold flex items-center justify-center transition-all border-b-2 whitespace-nowrap ${activeTab === 'oracle' ? 'text-indigo-400 border-indigo-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'} ${character.isGodDefeated ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
                    >
                        <ScrollText size={16} className="mr-2"/> {character.isGodDefeated && <Skull size={10} className="mr-1"/>} 신탁 수령
                    </button>
                    {powerConfig && (
                        <button 
                            disabled={templeLevel < 3}
                            onClick={() => setActiveTab('divine_power')} 
                            className={`flex-1 py-4 px-6 text-xs font-bold flex items-center justify-center transition-all border-b-2 whitespace-nowrap ${activeTab === 'divine_power' ? `${powerConfig.color} border-${powerConfig.color.split('-')[1]}-500 bg-slate-900` : 'text-slate-500 border-transparent hover:text-slate-300'} ${templeLevel < 3 ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                        >
                            <PowerIcon size={16} className="mr-2"/> {templeLevel < 3 && <Lock size={10} className="mr-1"/>} {powerConfig.powerName}
                        </button>
                    )}
                    {powerConfig && (
                        <button 
                            disabled={templeLevel < 3}
                            onClick={() => setActiveTab('divine_elemental_enhancement')} 
                            className={`flex-1 py-4 px-6 text-xs font-bold flex items-center justify-center transition-all border-b-2 whitespace-nowrap ${activeTab === 'divine_elemental_enhancement' ? 'text-indigo-400 border-indigo-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'} ${templeLevel < 3 ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                        >
                            <Sparkles size={16} className="mr-2"/> {templeLevel < 3 && <Lock size={10} className="mr-1"/>} 속성 강화
                        </button>
                    )}
                    {powerConfig && (
                        <button 
                            disabled={templeLevel < 3}
                            onClick={() => setActiveTab('potential_liberation')} 
                            className={`flex-1 py-4 px-6 text-xs font-bold flex items-center justify-center transition-all border-b-2 whitespace-nowrap ${activeTab === 'potential_liberation' ? 'text-amber-400 border-amber-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'} ${templeLevel < 3 ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                        >
                            <Sparkles size={16} className="mr-2 animate-pulse text-amber-400"/> {templeLevel < 3 && <Lock size={10} className="mr-1"/>} 잠재력 돌파
                        </button>
                    )}
                              {character.isGodDefeated && ( // [NEW] 신 처단 탭
                        <button 
                            onClick={() => setActiveTab('god_power')} 
                            className={`flex-1 py-4 px-6 text-xs font-bold flex items-center justify-center transition-all border-b-2 whitespace-nowrap ${activeTab === 'god_power' ? 'text-amber-500 border-amber-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                        >
                            <Sparkles size={16} className="mr-2"/> 절대 신의 권능
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-900 custom-scrollbar overscroll-contain">
                    {activeTab === 'divine_elemental_enhancement' && (
                        <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-top-4">
                            <div className="text-center bg-slate-950/60 p-5 rounded-2xl border border-indigo-500/30">
                                <div className="p-3 bg-indigo-950/80 rounded-2xl border border-indigo-500/40 mb-3 inline-block shadow-lg">
                                    <Sparkles size={32} className="text-indigo-400 animate-pulse mx-auto" />
                                </div>
                                <h3 className="text-xl font-extrabold text-white">성전 속성 강화</h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    성전 신력 조각과 속성 정수를 조화시켜 신의 기운을 각인합니다. (각 강화당 피해/저항 +1%)
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2 justify-center">
                                    <span className="inline-flex items-center bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-500/30 text-xs text-indigo-300 font-bold">
                                        성전 속성: {templeElement}
                                    </span>
                                    <span className="inline-flex items-center bg-slate-900 px-3 py-1 rounded-full border border-slate-700 text-xs text-slate-300 font-bold">
                                        {templeElement} 조각: {(character.base?.elementalShards?.[templeElement] || 0)}개
                                    </span>
                                    <span className="inline-flex items-center bg-slate-900 px-3 py-1 rounded-full border border-slate-700 text-xs text-slate-300 font-bold">
                                        {powerConfig?.itemName || '특수 재료'}: {(character.inventory || []).filter(i => i.name === (powerConfig?.itemName || '')).length}개
                                    </span>
                                </div>
                            </div>

                            <div className="bg-slate-950 p-5 rounded-2xl border border-indigo-500/30 space-y-3">
                                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <UserPlus size={14}/>
                                    <span>강화 대상 선택</span>
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                    {boostTargets.map(t => (
                                        <button 
                                            key={t.id}
                                            onClick={() => setBoostTargetId(t.id)}
                                            className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden active:scale-98 ${
                                                boostTargetId === t.id 
                                                    ? 'bg-indigo-900/50 border-indigo-400 shadow-md ring-1 ring-indigo-400/50' 
                                                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className={`text-xs font-bold truncate ${boostTargetId === t.id ? 'text-indigo-200' : 'text-slate-300'}`}>{t.name}</span>
                                                {boostTargetId === t.id && <CheckCircle size={12} className="text-indigo-400 shrink-0"/>}
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{t.role}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-slate-950 p-5 rounded-2xl border border-indigo-500/30 flex flex-col justify-between space-y-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-2 bg-indigo-950 rounded-lg border border-indigo-500/40 text-indigo-400">
                                                <Sword size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-base font-bold text-white">속성 피해 강화</h4>
                                                <p className="text-xs text-slate-400">{templeElement} 속성 공격력 강화</p>
                                            </div>
                                        </div>
                                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs text-indigo-300 flex justify-between items-center my-3">
                                            <span>현재 피해 증가량</span>
                                            <strong className="text-indigo-400 text-sm font-bold">
                                                {Math.round(((boostTargetId === 'player' ? character.base?.elementalDamageBoosts?.[templeElement] : (character.companions.find(c => c.id === boostTargetId)?.base?.elementalDamageBoosts?.[templeElement] || 0)) || 0) * 100)}%
                                            </strong>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleElementalEnhancement('damage')} 
                                        className="w-full py-3.5 bg-gradient-to-r from-indigo-700 to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 active:scale-98 text-white rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        <Sparkles size={16} />
                                        <span>속성 피해 1% 강화</span>
                                    </button>
                                </div>

                                <div className="bg-slate-950 p-5 rounded-2xl border border-cyan-500/30 flex flex-col justify-between space-y-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-2 bg-cyan-950 rounded-lg border border-cyan-500/40 text-cyan-400">
                                                <Shield size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-base font-bold text-white">속성 저항 강화</h4>
                                                <p className="text-xs text-slate-400">{templeElement} 속성 피해 감쇄 저항</p>
                                            </div>
                                        </div>
                                        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs text-cyan-300 flex justify-between items-center my-3">
                                            <span>현재 저항 증가량</span>
                                            <strong className="text-cyan-400 text-sm font-bold">
                                                {Math.round(((boostTargetId === 'player' ? character.base?.elementalResistanceBoosts?.[templeElement] : (character.companions.find(c => c.id === boostTargetId)?.base?.elementalResistanceBoosts?.[templeElement] || 0)) || 0) * 100)}%
                                            </strong>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleElementalEnhancement('resistance')} 
                                        className="w-full py-3.5 bg-gradient-to-r from-cyan-700 to-cyan-600 hover:from-cyan-600 hover:to-cyan-500 active:scale-98 text-white rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        <ShieldCheck size={16} />
                                        <span>속성 저항 1% 강화</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'potential_liberation' && templeLevel >= 3 && powerConfig && (
                        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-top-4">
                            <div className="text-center">
                                <div className={`p-4 ${powerConfig.bg} rounded-full border border-amber-500/30 inline-block mb-4 shadow-xl`}>
                                    <Sparkles size={48} className="text-amber-400 animate-pulse" />
                                </div>
                                <h3 className="text-2xl font-bold text-white">동료 클래스 잠재력 돌파</h3>
                                <p className="text-sm text-slate-400 mt-1">
                                    동일한 신력 계통을 가진 동료의 잠재 한계를 영구히 극복하여 상위 클래스로의 해방 가능성을 열어줍니다.
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                    <span className="inline-flex items-center bg-indigo-950/40 px-3 py-1.5 rounded-full border border-indigo-500/30 text-xs text-indigo-300">
                                        <Landmark size={12} className="mr-1.5" />성전 속성: <strong className="ml-1 text-white">{templeElement}</strong>
                                    </span>
                                    <span className="inline-flex items-center bg-amber-950/40 px-3 py-1.5 rounded-full border border-amber-500/30 text-xs text-amber-300">
                                        <Package size={12} className="mr-1.5" />필요 재료: <strong className="ml-1 text-white">{powerConfig.itemName}</strong>
                                    </span>
                                    <span className="inline-flex items-center bg-slate-950/80 px-3 py-1.5 rounded-full border border-slate-700 text-xs text-slate-300">
                                        보유 수량: <strong className={`${(character.inventory || []).filter(i => i.name === powerConfig.itemName).length >= 1 ? 'text-emerald-400' : 'text-rose-400'} ml-1 font-bold`}>{(character.inventory || []).filter(i => i.name === powerConfig.itemName).length}개</strong>
                                    </span>
                                </div>
                            </div>

                            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-4">
                                <h4 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center justify-between">
                                    <span>돌파 가능한 동료 목록</span>
                                    <span className="text-xs font-normal text-slate-500">동일 속성 동료만 표시됩니다</span>
                                </h4>

                                {allComps.filter(c => c.shinryokuType === templeElement && !isMonsterCompanion(c)).length === 0 ? (
                                    <div className="text-center py-12 text-slate-500">
                                        <Users size={40} className="mx-auto mb-3 opacity-30 text-slate-400" />
                                        <p className="text-sm font-bold">성전에 부합하는 '{templeElement}' 계통의 동료가 없습니다.</p>
                                        <p className="text-xs text-slate-600 mt-1">속성이 일치하는 동료만 성전의 기운으로 잠재력을 극복할 수 있습니다.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 divide-y divide-slate-900">
                                        {allComps.filter(c => c.shinryokuType === templeElement && !isMonsterCompanion(c)).map(comp => {
                                            const initialized = checkAndInitializeLiberationEligibility(JSON.parse(JSON.stringify(comp)), getCompanionCP(comp));
                                            const currentPot = initialized.liberationPotential || ClassTier.NONE;
                                            const nextPot = getNextPotentialTier(currentPot);
                                            const cost = getPotentialUpgradeCost(currentPot);
                                            const hasEnough = (character.inventory || []).filter(i => i && i.name === powerConfig.itemName).length >= cost;

                                            return (
                                                <div key={comp.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 first:pt-0">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center">
                                                            {comp.visualUrl ? (
                                                                <img src={comp.visualUrl} alt={comp.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User className="text-slate-500 w-5 h-5" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-white">{comp.name}</span>
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">Lv.{comp.level}</span>
                                                                {comp.potentialAppraised === true ? (
                                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/50 border border-emerald-900 text-emerald-400 font-bold">감정 완료</span>
                                                                ) : (
                                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950/50 border border-rose-900/50 text-rose-400 font-bold">감정 필요</span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-500 mt-0.5">{comp.classType || '동료'} · {comp.job || '직업 없음'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-3 md:gap-6 justify-between md:justify-end">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs text-slate-500">현재 잠재력:</span>
                                                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                                                                currentPot === ClassTier.NONE ? 'text-slate-400 bg-slate-950 border-slate-800' :
                                                                currentPot === ClassTier.FIRST ? 'text-blue-400 bg-blue-950/40 border-blue-900/50' :
                                                                currentPot === ClassTier.SECOND ? 'text-purple-400 bg-purple-950/40 border-purple-900/50' :
                                                                currentPot === ClassTier.LAST ? 'text-red-400 bg-red-950/40 border-red-900/50' :
                                                                'text-amber-400 bg-amber-950/40 border-amber-500/30 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                                                            }`}>
                                                                {currentPot === ClassTier.NONE ? '미지 / 감정 전' : 
                                                                 currentPot === ClassTier.FIRST ? '퍼스트 클래스' : 
                                                                 currentPot === ClassTier.SECOND ? '세컨드 클래스' : 
                                                                 currentPot === ClassTier.LAST ? '라스트 클래스' : 
                                                                 currentPot === ClassTier.FINAL ? '파이널 클래스' : currentPot}
                                                            </span>
                                                        </div>

                                                        {comp.isPotentialLocked ? (
                                                            <span className="text-xs font-bold text-purple-300 bg-purple-950/30 px-3 py-1.5 rounded-lg border border-purple-800/50">
                                                                잠재력 제한 설정됨 (추가 돌파 불가)
                                                            </span>
                                                        ) : comp.potentialAppraised !== true ? (
                                                            <span className="text-xs font-semibold text-rose-400 bg-rose-950/20 px-3 py-1.5 rounded-lg border border-rose-900/30">
                                                                예언가 사바스의 감정 필요
                                                            </span>
                                                        ) : nextPot ? (
                                                            <div className="flex items-center gap-3">
                                                                <div className="text-right hidden sm:block">
                                                                    <div className="text-xs text-amber-400 font-bold">다음: {nextPot}</div>
                                                                    <div className="text-[10px] text-slate-500">소모: {powerConfig.itemName} {cost}개</div>
                                                                </div>
                                                                <button
                                                                    disabled={!hasEnough}
                                                                    onClick={() => handlePotentialBreakthrough(comp.id)}
                                                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                                                        hasEnough 
                                                                            ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-950/40' 
                                                                            : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                                                                    }`}
                                                                >
                                                                    <span>잠재력 돌파</span>
                                                                    <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded font-mono">-{cost}</span>
                                                                </button>
                                                            </div>
                                                        ) : currentPot !== ClassTier.FINAL ? (
                                                            <span className="text-xs font-medium text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                                                                기지 잠재력 돌파소에서 한계 확장 필요
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/20 px-3 py-1.5 rounded-lg border border-emerald-900/30 flex items-center gap-1">
                                                                <CheckCircle size={12} /> 최대 한계 도달 (파이널)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'guardian' && (
                        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
                            <div className="bg-slate-950/80 p-6 rounded-3xl border border-amber-500/20 shadow-xl">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex items-center gap-2">
                                        <Crown size={20} className="text-amber-500" />
                                        <span className="text-sm font-bold text-amber-200 uppercase tracking-widest">성전 위엄도</span>
                                    </div>
                                    <span className="text-2xl font-mono font-bold text-amber-400">{Math.floor(majestyValue).toLocaleString()}</span>
                                </div>
                                <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
                                    <div 
                                        className="h-full bg-gradient-to-r from-amber-700 via-amber-400 to-amber-600 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                                        style={{ width: `${Math.min(100, (majestyValue / 10000) * 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 italic text-center">
                                    "위엄도 10,000을 초과하면 성전은 절대적인 평화를 누리게 되며 더 이상 외부의 침공을 받지 않습니다."
                                </p>
                            </div>

                            <div className="flex flex-col md:flex-row gap-8 items-center bg-slate-950/50 p-8 rounded-3xl border border-indigo-500/20">
                                <div className="w-48 h-48 rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-2xl shrink-0">
                                    <img src={boss.visualUrl} alt="Guardian" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest bg-indigo-950/50 px-3 py-1 rounded-full border border-indigo-800">성전 수호수</span>
                                    <h3 className="text-3xl font-bold text-white mt-3 mb-1">{boss.name}</h3>
                                    <p className="text-indigo-300 font-bold">"{boss.title}"</p>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                                            <span className="text-[10px] text-slate-500 uppercase block">호감도</span>
                                            <span className="text-lg font-bold text-pink-400 font-mono">{localGuardian.affection} / 200</span>
                                        </div>
                                        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                                            <span className="text-[10px] text-slate-500 uppercase block">Power</span>
                                            <span className="text-lg font-bold text-amber-500 font-mono">Lv.{boss.level}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsGuardianManagementOpen(true)} className="p-6 bg-slate-800 hover:bg-indigo-900/30 border border-indigo-500/50 rounded-2xl text-left transition-all group flex items-center justify-between shadow-lg">
                                <div>
                                    <h4 className="font-bold text-white text-lg flex items-center"><TowerControl size={24} className="text-indigo-400 mr-2 group-hover:scale-110 transition-transform" /> 수호수 집중 관리 센터 입장</h4>
                                    <p className="text-sm text-slate-400 mt-1">수호수의 능력치 강화, 교감, 영입 등을 통합 관리합니다.</p>
                                </div>
                                <ArrowRight className="text-indigo-500 group-hover:translate-x-2 transition-transform" />
                            </button>
                        </div>
                    )}

                    {activeTab === 'personnel' && (
                        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-4">
                            <div className="flex flex-col md:flex-row gap-8 items-center bg-slate-950/50 p-8 rounded-3xl border border-indigo-500/20">
                                <div className="p-4 bg-indigo-950 rounded-full border border-indigo-500/50 shrink-0"><Users size={48} className="text-indigo-400" /></div>
                                <div className="flex-1 text-center md:text-left"><h3 className="text-2xl font-bold text-white mb-2">성전 인사 시스템</h3><p className="text-sm text-slate-400 leading-relaxed">성전의 유지를 위해 대원들을 배치합니다. 배치된 대원들은 신앙심을 증폭시키고 성스러운 정수를 정제합니다.</p></div>
                            </div>
                            <button onClick={() => setIsPersonnelModalOpen(true)} className="p-6 bg-slate-800 hover:bg-indigo-900/30 border border-indigo-500/50 rounded-2xl text-left transition-all group flex items-center justify-between shadow-lg">
                                <div><h4 className="font-bold text-white text-lg flex items-center"><UserCheck size={24} className="text-indigo-400 mr-2 group-hover:scale-110 transition-transform" /> 성전 인원 배치 및 관리</h4><p className="text-sm text-slate-400 mt-1">신관, 수호기사, 보좌 인력을 임명하고 해임합니다.</p></div>
                                <ArrowRight className="text-indigo-500 group-hover:translate-x-2 transition-transform" />
                            </button>
                        </div>
                    )}

                    {activeTab === 'reception' && (
                        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-top-4">
                            <div className="flex flex-col md:flex-row gap-8 items-center bg-slate-950/50 p-8 rounded-3xl border border-indigo-500/20">
                                <div className="p-4 bg-indigo-950 rounded-full border border-indigo-500/50 shrink-0"><MessageCircle size={48} className="text-indigo-400" /></div>
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-2xl font-bold text-white mb-2">성전 접견실</h3>
                                    <p className="text-sm text-slate-400 leading-relaxed">성전을 방문한 순례자, 사절단, 그리고 정체불명의 방문객들을 맞이합니다. 집사와 메이드의 보좌를 받아 외교와 포섭 활동을 수행하십시오.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsReceptionOpen(true)} className="p-6 bg-slate-800 hover:bg-indigo-900/30 border border-indigo-500/50 rounded-2xl text-left transition-all group flex items-center justify-between shadow-lg">
                                <div><h4 className="font-bold text-white text-lg flex items-center"><Users size={24} className="text-indigo-400 mr-2 group-hover:scale-110 transition-transform" /> 방문객 접견 및 교류</h4><p className="text-sm text-slate-400 mt-1">현재 대기 중인 방문객과 소통하거나 신의 권능으로 그들을 시험하십시오.</p></div>
                                <ArrowRight className="text-indigo-500 group-hover:translate-x-2 transition-transform" />
                            </button>
                        </div>
                    )}

                    {activeTab === 'foreign_affairs' && (
                        <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in-95">
                            <div className="flex flex-col md:flex-row gap-8 items-center bg-slate-950/50 p-8 rounded-3xl border border-amber-500/20">
                                <div className="p-4 bg-amber-950 rounded-full border border-amber-500/50 shrink-0"><Globe size={48} className="text-amber-400" /></div>
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-2xl font-bold text-white mb-2">성전 대외 관계 관리</h3>
                                    <p className="text-sm text-slate-400 leading-relaxed">사자의 권능을 전 세계로 확장하십시오. 특정 국가를 비호하여 평화를 구축하거나, 신의 이름으로 심판을 내려 영토를 속국화할 수 있습니다.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button onClick={() => setIsForeignAffairsOpen(true)} className="p-6 bg-slate-800 hover:bg-amber-900/30 border border-amber-500/50 rounded-2xl text-left transition-all group flex items-center justify-between shadow-lg">
                                    <div><h4 className="font-bold text-white text-lg flex items-center"><Sparkles size={24} className="text-amber-400 mr-2 group-hover:rotate-12 transition-transform" /> 세계 정세 개입 및 권능 행사</h4><p className="text-sm text-slate-400 mt-1">국가 비호, 침략, 조공 관리 등을 수행합니다.</p></div>
                                    <ArrowRight className="text-amber-500 group-hover:translate-x-2 transition-transform" />
                                </button>
                                <button onClick={() => setIsDivineRelModalOpen(true)} className="p-6 bg-slate-800 hover:bg-indigo-900/30 border border-indigo-500/50 rounded-2xl text-left transition-all group flex items-center justify-between shadow-lg">
                                    <div><h4 className="font-bold text-white text-lg flex items-center"><Users size={24} className="text-indigo-400 mr-2 group-hover:scale-110 transition-transform" /> 신성 관계망 현황 및 관리</h4><p className="text-sm text-slate-400 mt-1">절대신 및 타 성전과의 외교 관계, 호감도, 참회를 관리합니다.</p></div>
                                    <ArrowRight className="text-indigo-500 group-hover:translate-x-2 transition-transform" />
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'facility' && (
                        <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-left-4">
                            <div className="text-center bg-slate-950/60 p-5 rounded-2xl border border-indigo-500/20">
                                <Landmark size={40} className="mx-auto text-indigo-400 mb-2" />
                                <h3 className="text-xl font-extrabold text-white">성전 핵심 시설 관리</h3>
                                <p className="text-xs text-slate-400 mt-1">성전의 핵심 시설을 업그레이드하여 자원 수급 및 인사 효율을 극대화합니다.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="bg-slate-950 p-5 rounded-2xl border border-indigo-500/30 space-y-4 shadow-md">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-indigo-900/40 rounded-xl border border-indigo-500/50"><Maximize size={22} className="text-indigo-300"/></div>
                                            <div>
                                                <h4 className="text-base font-bold text-white">성전 집무실</h4>
                                                <p className="text-xs text-slate-400">인사권 해방 및 기본 효율 상승 (최대 레벨 3)</p>
                                            </div>
                                        </div>
                                        <span className="text-lg font-black text-indigo-400 bg-indigo-950/60 px-3 py-1 rounded-lg border border-indigo-500/30">Lv.{templeLevel}</span>
                                    </div>
                                    {templeLevel < 3 ? (
                                        <button onClick={() => handleFacilityUpgrade('size')} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md">
                                            <ArrowUpCircle size={18}/>
                                            <span>{templeLevel * 50}마정석 / {templeLevel * 10}신앙 소모</span>
                                        </button>
                                    ) : (
                                        <div className="text-center text-xs font-bold text-emerald-400 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/40">
                                            최고 레벨 달성
                                        </div>
                                    )}
                                </div>

                                <div className="bg-slate-950 p-5 rounded-2xl border border-amber-500/30 space-y-4 shadow-md">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-amber-900/40 rounded-xl border border-amber-500/50"><Sun size={22} className="text-amber-300"/></div>
                                            <div>
                                                <h4 className="text-base font-bold text-white">중앙 제단</h4>
                                                <p className="text-xs text-slate-400">신앙심 획득 효율 증가 (최대 레벨 5)</p>
                                            </div>
                                        </div>
                                        <span className="text-lg font-black text-amber-400 bg-amber-950/60 px-3 py-1 rounded-lg border border-amber-500/30">Lv.{altarLevel}</span>
                                    </div>
                                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs text-amber-300 flex items-center justify-between">
                                        <span>현재 신앙심 획득 배율:</span>
                                        <strong className="text-amber-400 text-sm font-bold">{1 + (altarLevel - 1) * 0.5}배</strong>
                                    </div>
                                    {altarLevel < 5 ? (
                                        <button onClick={() => handleFacilityUpgrade('altar')} className="w-full py-3 bg-amber-600 hover:bg-amber-500 active:scale-98 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md">
                                            <ArrowUpCircle size={18}/>
                                            <span>{altarLevel * 50}마정석 / {altarLevel * 10}신앙 소모</span>
                                        </button>
                                    ) : (
                                        <div className="text-center text-xs font-bold text-emerald-400 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/40">
                                            최고 레벨 달성
                                        </div>
                                    )}
                                </div>

                                <div className="bg-slate-950 p-5 rounded-2xl border border-purple-500/30 space-y-4 shadow-md">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-purple-900/40 rounded-xl border border-purple-500/50"><FlaskConical size={22} className="text-purple-300"/></div>
                                            <div>
                                                <h4 className="text-base font-bold text-white">성전 연구실</h4>
                                                <p className="text-xs text-slate-400">정제되는 전용 재료 수량 증가 (최대 레벨 5)</p>
                                            </div>
                                        </div>
                                        <span className="text-lg font-black text-purple-400 bg-purple-950/60 px-3 py-1 rounded-lg border border-purple-500/30">Lv.{labLevel}</span>
                                    </div>
                                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs text-purple-300 flex items-center justify-between">
                                        <span>현재 성공 시 정제 재료 수량:</span>
                                        <strong className="text-purple-400 text-sm font-bold">{labLevel}개</strong>
                                    </div>
                                    {labLevel < 5 ? (
                                        <button onClick={() => handleFacilityUpgrade('lab')} className="w-full py-3 bg-purple-600 hover:bg-purple-500 active:scale-98 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md">
                                            <ArrowUpCircle size={18}/>
                                            <span>{labLevel * 50}마정석 / {labLevel * 10}신앙 소모</span>
                                        </button>
                                    ) : (
                                        <div className="text-center text-xs font-bold text-emerald-400 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/40">
                                            최고 레벨 달성
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'equipment' && templeLevel >= 2 && (
                        <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-top-4">
                            <div className="flex flex-col md:flex-row gap-8 items-center bg-slate-950/50 p-8 rounded-3xl border border-indigo-500/20">
                                <div className="p-4 bg-indigo-950 rounded-full border border-indigo-500/50 shrink-0">
                                    <Package size={48} className="text-indigo-400" />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-2xl font-bold text-white mb-2">성전 신화 장비 관리</h3>
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                        성전의 신성한 기운을 통해 {templeElement} 신화 장비의 능력을 한계까지 끌어올립니다. <br/>
                                        강화 실패 시에도 하락이나 파괴가 발생하지 않습니다.
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button onClick={() => setIsEquipmentModalOpen(true)} className="p-6 bg-slate-800 hover:bg-indigo-900/30 border border-indigo-500/50 rounded-2xl text-left transition-all group flex items-center justify-between shadow-lg">
                                    <div><h4 className="font-bold text-white text-lg flex items-center"><Hammer size={24} className="text-indigo-400 mr-2 group-hover:scale-110 transition-transform" /> 신화 강화 및 초월</h4><p className="text-sm text-slate-400 mt-1">강화도 상승 및 한계 초월 작업을 수행합니다.</p></div>
                                    <ArrowRight className="text-indigo-500 group-hover:translate-x-2 transition-transform" />
                                </button>
                                <button onClick={() => setIsDivineElementalOpen(true)} className="p-6 bg-slate-800 hover:bg-amber-900/30 border border-amber-500/50 rounded-2xl text-left transition-all group flex items-center justify-between shadow-lg">
                                    <div><h4 className="font-bold text-white text-lg flex items-center"><Star size={24} className="text-amber-400 mr-2 group-hover:rotate-12 transition-transform" /> 신성 속성 강화</h4><p className="text-sm text-slate-400 mt-1">장비에 신의 기운을 각인하여 신력 공명 배율을 높입니다.</p></div>
                                    <ArrowRight className="text-amber-500 group-hover:translate-x-2 transition-transform" />
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'oracle' && (
                        <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center animate-in zoom-in-95">
                            <div className="w-24 h-24 rounded-full bg-indigo-900/30 border-2 border-indigo-500 flex items-center justify-center shadow-2xl"><Sparkles size={48} className="text-indigo-400 animate-pulse" /></div>
                            <div><h3 className="text-2xl font-bold text-white mb-2">천상의 신탁</h3><p className="text-sm text-slate-400 max-w-md">신께서 사자에게 직접 내리는 명령입니다. 신계와 마계, 인간계의 균형을 수호하십시오.</p></div>
                            <button 
                                disabled={character.isGodDefeated}
                                onClick={() => setIsOracleModalOpen(true)} 
                                className={`px-12 py-4 rounded-xl shadow-xl transition-all transform flex items-center gap-2 ${character.isGodDefeated ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700' : 'bg-amber-700 hover:bg-amber-600 text-white hover:scale-105 active:scale-95'}`}
                            >
                                {character.isGodDefeated ? <Skull size={20}/> : <ScrollText size={20}/>}
                                {character.isGodDefeated ? '끊어진 신의 계시' : '신탁실 입장'}
                            </button>
                            <p className="text-[10px] text-slate-500 italic">
                                {character.isGodDefeated ? '* 절대신이 소멸하여 더 이상 신탁이 내려오지 않습니다.' : '* 신탁은 매년 한 번만 수령 가능하며, 막대한 보상이 따릅니다.'}
                            </p>
                        </div>
                    )}

                    {activeTab === 'divine_power' && templeLevel >= 3 && powerConfig && (
                        <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-top-4">
                            <div className="text-center bg-slate-950/60 p-5 rounded-2xl border border-amber-500/30 shadow-lg">
                                <div className={`p-3.5 ${powerConfig.bg} rounded-2xl border border-amber-500/30 inline-block mb-3 shadow-xl`}>
                                    <PowerIcon size={36} className={`${powerConfig.color} ${powerConfig.itemName === "태양의 잔재" ? "animate-spin-slow" : "animate-pulse"}`} />
                                </div>
                                <h3 className="text-xl font-extrabold text-white">{powerConfig.powerName} 강화 및 전수</h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    신성한 정수를 정제하여 사자와 성전 대원들의 근본적 신체 스탯을 영구 강화합니다.
                                </p>
                                <div className="mt-3 inline-flex items-center bg-black/60 px-4 py-1.5 rounded-full border border-amber-500/30 text-xs">
                                    <Package size={14} className={`${powerConfig.color} mr-2`}/>
                                    <span className="text-slate-300">보유한 {powerConfig.itemName}: <strong className={`${powerConfig.color} font-bold ml-1`}>{(character.inventory || []).filter(i => i && i.name === powerConfig.itemName).length}개</strong></span>
                                </div>
                            </div>

                            <div className="bg-slate-950 p-5 rounded-2xl border border-indigo-500/30 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <UserPlus size={14}/>
                                        <span>전수 대상 선택</span>
                                        <span className="text-[10px] text-slate-500 font-normal">({boostTargets.length}명)</span>
                                    </h4>
                                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                        <span className="text-[10px] text-slate-400 font-medium">정렬:</span>
                                        <select
                                            value={boostTargetSort}
                                            onChange={(e) => setBoostTargetSort(e.target.value as any)}
                                            className="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                                        >
                                            <option value="default">직책순 (기본)</option>
                                            <option value="levelDesc">레벨 높은 순</option>
                                            <option value="levelAsc">레벨 낮은 순</option>
                                            <option value="combatPower">전투력 높은 순</option>
                                            <option value="affection">호감도 높은 순</option>
                                            <option value="name">이름 가나다 순</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                                    {boostTargets.map(t => {
                                        const lvl = t.entity?.level || (t.id === 'player' ? character.level : 0);
                                        return (
                                            <button 
                                                key={t.id}
                                                onClick={() => setBoostTargetId(t.id)}
                                                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden active:scale-98 ${
                                                    boostTargetId === t.id 
                                                        ? 'bg-indigo-900/50 border-indigo-400 shadow-md ring-1 ring-indigo-400/50' 
                                                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                                }`}
                                            >
                                                <div className="flex justify-between items-center w-full">
                                                    <span className={`text-xs font-bold truncate ${boostTargetId === t.id ? 'text-indigo-200' : 'text-slate-300'}`}>{t.name}</span>
                                                    {boostTargetId === t.id && <CheckCircle size={12} className="text-indigo-400 shrink-0"/>}
                                                </div>
                                                <div className="flex justify-between items-center mt-1 text-[10px] text-slate-500">
                                                    <span>{t.role}</span>
                                                    {lvl > 0 && <span className="text-slate-400 font-bold">레벨 {lvl}</span>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {[
                                    { k: 'str', l: '근력', i: Sword, c: 'text-red-400' }, 
                                    { k: 'agi', l: '민첩', i: Activity, c: 'text-yellow-400' }, 
                                    { k: 'int', l: '지능', i: Zap, c: 'text-purple-400' }, 
                                    { k: 'ctrl', l: '제어', i: Target, c: 'text-cyan-400' }, 
                                    { k: 'wis', l: '지혜', i: Brain, c: 'text-blue-400' }, 
                                    { k: 'def', l: '방어', i: Shield, c: 'text-emerald-400' }
                                ].map((stat) => {
                                    const req = getBoostRequiredCount(stat.k as keyof Stats, boostTargetId);
                                    const isMessengerTarget = boostTargets.find(t => t.id === boostTargetId)?.role === '담당 사자';
                                    const currentActualBoost = isMessengerTarget ? powerConfig.boost * 10 : powerConfig.boost;

                                    return (
                                        <button 
                                            key={stat.k} 
                                            onClick={() => handleStatBoost(stat.k as keyof Stats)} 
                                            className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-amber-500/50 transition-all flex flex-col items-center group relative overflow-hidden active:scale-98 shadow-md"
                                        >
                                            <div className={`absolute inset-0 ${powerConfig.bg} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                                            <stat.i size={24} className={`${stat.c} mb-2 group-hover:scale-110 transition-transform relative z-10`}/>
                                            <span className="text-xs font-bold text-slate-200 relative z-10">{stat.l}</span>
                                            <span className={`text-[10px] ${powerConfig.color} font-bold mt-0.5 relative z-10`}>+{currentActualBoost} 강화</span>
                                            <div className="mt-2 relative z-10 bg-black/60 px-2 py-0.5 rounded border border-white/10 text-[9px] text-slate-400 font-medium">
                                                필요: {req}개
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-800">
                                <button onClick={() => setIsTransferationOpen(true)} className="w-full py-3.5 bg-gradient-to-r from-indigo-950 via-indigo-900 to-indigo-950 hover:from-indigo-900 hover:to-indigo-800 border border-indigo-500/60 text-indigo-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98">
                                    <RefreshCw size={18} className="animate-spin-slow" />
                                    <span>신력 전이</span>
                                </button>
                                <p className="text-[10px] text-slate-500 text-center mt-2">
                                    * 사자의 정수를 사용하여 동료의 신력 계통을 재편합니다. (비용: 대상 레벨 1당 {powerConfig.itemName} 1개)
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'god_power' && character.isGodDefeated && ( // [NEW]
                        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-top-4">
                            <div className="text-center">
                                <div className="p-4 bg-amber-900/40 rounded-full border border-amber-500/50 inline-block mb-4 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                                    <Crown size={48} className="text-amber-400 animate-pulse" />
                                </div>
                                <h3 className="text-2xl font-bold text-white">비어버린 신좌의 권능</h3>
                                <p className="text-sm text-slate-400">절대신을 물리치고 신의 자리에 오른 자만이 가능한 육체 강화입니다.</p>
                            </div>

                            <div className="flex flex-col items-center justify-center py-10 bg-slate-950/50 rounded-[3rem] border border-amber-900/30 space-y-8 shadow-inner relative overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent opacity-50"></div>
                                
                                <div className="text-center relative z-10">
                                    <Sparkles size={64} className="text-amber-500 mx-auto mb-4 animate-bounce-short" />
                                    <h4 className="text-3xl font-black text-white font-cinzel">ULTIMATE AWAKENING</h4>
                                    <p className="text-xs text-slate-400 mt-2">
                                        "태초의 빛을 사용하여 자신 혹은 동료의 영혼을 재조립합니다."
                                    </p>
                                </div>

                                <div className="bg-slate-900/80 p-6 rounded-3xl border border-amber-500/30 text-center max-w-sm w-full relative z-10 backdrop-blur-md">
                                    <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest block mb-2">Cost per application</span>
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-950 border border-amber-500 flex items-center justify-center shadow-lg">
                                            <Star size={24} className="text-amber-400" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm font-bold text-white">태초의 빛 1개</div>
                                            <div className="text-[9px] text-slate-500">현재 보유: {(character.inventory || []).filter(i => i && i.name === "태초의 빛").length}개</div>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-2 text-[10px]">
                                        <div className="text-green-400 font-bold">모든 스탯 +200</div>
                                        <div className="text-red-400 font-bold">HP/MP +2000</div>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => setIsGodPowerOpen(true)}
                                    className="px-12 py-5 bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 hover:from-amber-600 hover:via-amber-400 hover:to-amber-600 text-white font-bold rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 relative z-10"
                                >
                                    <Target size={24} className="animate-pulse" />
                                    <span>권능 행사 인터페이스 개방</span>
                                </button>
                                
                                <p className="text-[9px] text-red-500 font-bold italic relative z-10">
                                    * 경고: 마계의 제너럴이나 마신 등 불경한 존재들에게는 이 권능을 행사할 수 없습니다.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-3 shrink-0">
                    <div className="mr-auto flex gap-4 items-center">
                         <div className="flex items-center text-xs text-indigo-400 font-mono"><Zap size={14} className="mr-1.5"/> 마정석: {character.base?.resources.manaCrystal || 0}</div>
                         <div className="flex items-center text-xs text-amber-400 font-mono"><Sparkles size={14} className="mr-1.5"/> 신앙심: {character.faith || 0}</div>
                    </div>
                    <button onClick={onClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-sm transition-colors">닫기</button>
                </div>
            </div>
        </div>
    );
};

export default TempleManagementModal;
