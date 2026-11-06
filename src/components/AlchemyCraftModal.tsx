import React, { useState, useEffect } from 'react';
import { Character, Companion, Item, ItemRarity, JobType, DispatchMission, AlchemistRank } from '../types';
import { X, FlaskConical, Users, Clock, CheckCircle, ArrowRight, Package, Coins, Sparkles, AlertCircle, PlusCircle, TrendingUp, Heart, Zap, Shield, Sparkle, RefreshCw, Lock } from 'lucide-react';
import { addDays, calculateTotalAlchemyProduction, getAlchemistRankFromLevel, getAlchemyRankLabel, calculateFinalStats } from '../utils';
import ActionResultModal, { ResultData } from './ActionResultModal';

interface Props {
  character: Character;
  onClose: () => void;
  onUpdateCharacter: (newChar: Character, logMsg: string) => void;
}

// [EXPORTED] 연금술사 등급 계수 및 설정 (AlchemyModal 기준 동일 적용)
export const ALCHEMIST_RANK_CONFIG: Record<AlchemistRank, { 
    coef: number, 
    label: string, 
    allowedRarities: ItemRarity[],
    nextRank: AlchemistRank | null,
    reqMastery: number,
    reqWis: number,
    reqCtrl: number
}> = {
    [AlchemistRank.BEGINNER]: { 
        coef: 1, 
        label: '초급 연금술사', 
        allowedRarities: [ItemRarity.NORMAL, ItemRarity.MAGIC],
        nextRank: AlchemistRank.INTERMEDIATE,
        reqMastery: 20,
        reqWis: 20,
        reqCtrl: 15
    },
    [AlchemistRank.INTERMEDIATE]: { 
        coef: 2, 
        label: '중급 연금술사', 
        allowedRarities: [ItemRarity.NORMAL, ItemRarity.MAGIC, ItemRarity.RARE, ItemRarity.EPIC],
        nextRank: AlchemistRank.ADVANCED,
        reqMastery: 50,
        reqWis: 100,
        reqCtrl: 100
    },
    [AlchemistRank.ADVANCED]: { 
        coef: 5, 
        label: '고급(상급) 연금술사', 
        allowedRarities: [ItemRarity.NORMAL, ItemRarity.MAGIC, ItemRarity.RARE, ItemRarity.EPIC, ItemRarity.UNIQUE],
        nextRank: AlchemistRank.MASTER,
        reqMastery: 80,
        reqWis: 250,
        reqCtrl: 250
    },
    [AlchemistRank.MASTER]: { 
        coef: 10, 
        label: '최상급 연금술사', 
        allowedRarities: [ItemRarity.NORMAL, ItemRarity.MAGIC, ItemRarity.RARE, ItemRarity.EPIC, ItemRarity.UNIQUE, ItemRarity.LEGENDARY],
        nextRank: AlchemistRank.GRANDMASTER,
        reqMastery: 100,
        reqWis: 500,
        reqCtrl: 500
    },
    [AlchemistRank.GRANDMASTER]: { 
        coef: 20, 
        label: '대현자', 
        allowedRarities: Object.values(ItemRarity),
        nextRank: null,
        reqMastery: 999,
        reqWis: 1000,
        reqCtrl: 1000
    },
};

export const getRarityLabel = (rarity: ItemRarity): string => {
    switch (rarity) {
        case ItemRarity.NORMAL: return '노말';
        case ItemRarity.MAGIC: return '매직';
        case ItemRarity.RARE: return '레어';
        case ItemRarity.EPIC: return '에픽';
        case ItemRarity.UNIQUE: return '유니크';
        case ItemRarity.LEGENDARY: return '전설';
        case ItemRarity.MYTHTIC: return '신화';
        default: return rarity;
    }
};

export const getRequiredAlchemistRankForRarity = (rarity: ItemRarity): { rank: AlchemistRank, label: string } => {
    switch (rarity) {
        case ItemRarity.MYTHTIC:
            return { rank: AlchemistRank.GRANDMASTER, label: '대현자' };
        case ItemRarity.LEGENDARY:
            return { rank: AlchemistRank.MASTER, label: '최상급 연금술사' };
        case ItemRarity.UNIQUE:
            return { rank: AlchemistRank.ADVANCED, label: '고급 연금술사' };
        case ItemRarity.EPIC:
        case ItemRarity.RARE:
            return { rank: AlchemistRank.INTERMEDIATE, label: '중급 연금술사' };
        case ItemRarity.MAGIC:
        case ItemRarity.NORMAL:
        default:
            return { rank: AlchemistRank.BEGINNER, label: '초급 연금술사' };
    }
};

const MASTERY_GAIN: Record<ItemRarity, number> = {
    [ItemRarity.NORMAL]: 20,
    [ItemRarity.MAGIC]: 50,
    [ItemRarity.RARE]: 150,
    [ItemRarity.EPIC]: 400,
    [ItemRarity.UNIQUE]: 1000,
    [ItemRarity.LEGENDARY]: 2500,
    [ItemRarity.MYTHTIC]: 5000
};

export const RARITY_MULTIPLIERS: Record<ItemRarity, number> = {
    [ItemRarity.NORMAL]: 1,
    [ItemRarity.MAGIC]: 2,
    [ItemRarity.RARE]: 3,
    [ItemRarity.UNIQUE]: 4,
    [ItemRarity.EPIC]: 5,
    [ItemRarity.LEGENDARY]: 10,
    [ItemRarity.MYTHTIC]: 15,
};

export const NET_CONFIG: Record<ItemRarity, { name: string, val: number, img: string }> = {
    [ItemRarity.NORMAL]: { name: '최하급 포획 그물', val: 30, img: "https://i.ibb.co/My5r1njR/Gemini-Generated-Image-lfhpjllfhpjllfhp.png" },
    [ItemRarity.MAGIC]: { name: '하급 포획 그물', val: 70, img: "https://i.ibb.co/PZ2nn4Gp/Gemini-Generated-Image-shn15bshn15bshn1.png" },
    [ItemRarity.RARE]: { name: '중급 포획 그물', val: 120, img: "https://i.ibb.co/tpbhkwLW/Gemini-Generated-Image-vsjruyvsjruyvsjr.png" },
    [ItemRarity.UNIQUE]: { name: '상급 포획 그물', val: 200, img: "https://i.ibb.co/SwhGkwMS/Gemini-Generated-Image-22cot722cot722co.png" },
    [ItemRarity.EPIC]: { name: '특급 포획 그물', val: 250, img: "https://i.ibb.co/FPjZgNK/Gemini-Generated-Image-av5eb8av5eb8av5e.png" },
    [ItemRarity.LEGENDARY]: { name: '최상급 포획 그물', val: 300, img: "https://i.ibb.co/FPjZgNK/Gemini-Generated-Image-av5eb8av5eb8av5e.png" },
    [ItemRarity.MYTHTIC]: { name: '신화급 포획 그물', val: 999, img: "https://i.ibb.co/FPjZgNK/Gemini-Generated-Image-av5eb8av5eb8av5e.png" },
};

export const getPotionRecipe = (category: string, rarity: ItemRarity, mixType: string) => {
    if (category === 'MIX') {
        if (mixType === 'ELIXIR') return { herbs: 60, wood: 10, mana: 10, crystalKey: 'rareCrystal', crystalName: '레어 결정', crystal: 2, rarity: ItemRarity.RARE, garlic: 0, shinryokuFlower: 0, worldTreeBranch: 0, silverOre: 0, goldOre: 0 };
        if (mixType === 'POWER_ELIXIR') return { herbs: 150, wood: 20, mana: 20, crystalKey: 'uniqueCrystal', crystalName: '유니크 결정', crystal: 2, rarity: ItemRarity.UNIQUE, garlic: 0, shinryokuFlower: 0, worldTreeBranch: 0, silverOre: 0, goldOre: 0 };
        if (mixType === 'STONE') return { herbs: 60, wood: 10, mana: 30, crystalKey: 'rareCrystal', crystalName: '레어 결정', crystal: 2, rarity: ItemRarity.RARE, garlic: 0, shinryokuFlower: 0, worldTreeBranch: 0, silverOre: 0, goldOre: 0 };
    }
    if (category === 'SCROLL') {
        return { 
            herbs: 30, 
            wood: 10, 
            mana: 5, 
            crystalKey: 'magicCrystal', 
            crystalName: '매직 결정', 
            crystal: 1, 
            rarity: ItemRarity.MAGIC, 
            garlic: 0, shinryokuFlower: 0, worldTreeBranch: 0, silverOre: 0, goldOre: 0 
        };
    }
    if (category === 'NET') {
        const coef = RARITY_MULTIPLIERS[rarity] || 1;
        const crystalKeyMap: Record<ItemRarity, string> = {
            [ItemRarity.NORMAL]: 'normalCrystal',
            [ItemRarity.MAGIC]: 'magicCrystal',
            [ItemRarity.RARE]: 'rareCrystal',
            [ItemRarity.EPIC]: 'epicCrystal',
            [ItemRarity.UNIQUE]: 'uniqueCrystal',
            [ItemRarity.LEGENDARY]: 'legendaryCrystal',
            [ItemRarity.MYTHTIC]: 'legendaryCrystal', // 신화 등급일 때는 전설 결정을 소모하도록 우회
        };
        const crystalNameMap: Record<ItemRarity, string> = {
            [ItemRarity.NORMAL]: '노말 결정',
            [ItemRarity.MAGIC]: '매직 결정',
            [ItemRarity.RARE]: '레어 결정',
            [ItemRarity.EPIC]: '에픽 결정',
            [ItemRarity.UNIQUE]: '유니크 결정',
            [ItemRarity.LEGENDARY]: '전설 결정',
            [ItemRarity.MYTHTIC]: '전설 결정', // 신화 등급일 때는 전설 결정을 소모하도록 우회
        };
        return {
            herbs: 15 * coef,
            wood: 10 * coef,
            mana: 5 * coef,
            crystalKey: crystalKeyMap[rarity] || 'normalCrystal',
            crystalName: crystalNameMap[rarity] || '노말 결정',
            crystal: rarity === ItemRarity.MYTHTIC ? 100 : 2, // 신화 등급일 때는 100개 요구
            garlic: 0, shinryokuFlower: 0, worldTreeBranch: 0, silverOre: 0, goldOre: 0,
            rarity
        };
    }

    const coef = RARITY_MULTIPLIERS[rarity] || 1;
    const crystalKeyMap: Record<ItemRarity, string> = {
        [ItemRarity.NORMAL]: 'normalCrystal',
        [ItemRarity.MAGIC]: 'magicCrystal',
        [ItemRarity.RARE]: 'rareCrystal',
        [ItemRarity.EPIC]: 'epicCrystal',
        [ItemRarity.UNIQUE]: 'uniqueCrystal',
        [ItemRarity.LEGENDARY]: 'legendaryCrystal',
        [ItemRarity.MYTHTIC]: 'legendaryCrystal', // 신화 등급일 때는 전설 결정을 소모하도록 우회
    };
    const crystalNameMap: Record<ItemRarity, string> = {
        [ItemRarity.NORMAL]: '노말 결정',
        [ItemRarity.MAGIC]: '매직 결정',
        [ItemRarity.RARE]: '레어 결정',
        [ItemRarity.EPIC]: '에픽 결정',
        [ItemRarity.UNIQUE]: '유니크 결정',
        [ItemRarity.LEGENDARY]: '전설 결정',
        [ItemRarity.MYTHTIC]: '전설 결정', // 신화 등급일 때는 전설 결정을 소모하도록 우회
    };

    return {
        herbs: 9 * coef,
        wood: 1 * coef,
        mana: 1 * coef,
        crystalKey: crystalKeyMap[rarity] || 'normalCrystal',
        crystalName: crystalNameMap[rarity] || '노말 결정',
        crystal: rarity === ItemRarity.MYTHTIC ? 100 : 1, // 신화 등급일 때는 100개 요구
        garlic: rarity === ItemRarity.RARE ? 10 : 0,
        shinryokuFlower: rarity === ItemRarity.EPIC ? 2 : (rarity === ItemRarity.UNIQUE ? 4 : (rarity === ItemRarity.LEGENDARY ? 8 : (rarity === ItemRarity.MYTHTIC ? 15 : 0))),
        worldTreeBranch: rarity === ItemRarity.UNIQUE ? 2 : (rarity === ItemRarity.LEGENDARY ? 4 : (rarity === ItemRarity.MYTHTIC ? 8 : 0)),
        silverOre: rarity === ItemRarity.LEGENDARY ? 2 : 0,
        goldOre: rarity === ItemRarity.MYTHTIC ? 2 : 0,
        rarity
    };
};

const BASE_CRAFT_TIME: Record<ItemRarity, number> = {
    [ItemRarity.NORMAL]: 1,
    [ItemRarity.MAGIC]: 2,
    [ItemRarity.RARE]: 4,
    [ItemRarity.EPIC]: 6,
    [ItemRarity.UNIQUE]: 9,
    [ItemRarity.LEGENDARY]: 14,
    [ItemRarity.MYTHTIC]: 21
};

export const AlchemyCraftModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter }) => {
    const [activeTab, setActiveTab] = useState<'new' | 'status'>('new');
    const [selectedAlchemistId, setSelectedAlchemistId] = useState<string | null>(null);
    const [potionCategory, setPotionCategory] = useState<'HP' | 'MP' | 'FATIGUE' | 'BUFF' | 'CURE' | 'MIX' | 'SCROLL' | 'NET'>('HP');
    const [selectedRarity, setSelectedRarity] = useState<ItemRarity>(ItemRarity.NORMAL);
    const [mixType, setMixType] = useState<'ELIXIR' | 'POWER_ELIXIR' | 'STONE'>('ELIXIR');
    const [scrollType, setScrollType] = useState<'TELEPORT' | 'DEF_PHYS' | 'DEF_MAG' | 'RES_FIRE' | 'RES_WATER' | 'RES_ELEC' | 'RES_EARTH' | 'RES_ALL' | 'DEF_ALL'>('TELEPORT');
    const [buffStat, setBuffStat] = useState<'ATK' | 'DEF' | 'SPD' | 'DEX' | 'INT' | 'ALL' | 'EXP' | 'GOLD' | 'DROP' | 'WEAPON' | 'SKILL' | 'RES_FIRE' | 'RES_WATER' | 'RES_ELEC' | 'RES_EARTH' | 'RES_ALL' | 'DEF_PHYS' | 'DEF_MAG'>('ATK');
    const [buffDurationOption, setBuffDurationOption] = useState<number>(10);
    const [customName, setCustomName] = useState('');
    const [craftQuantity, setCraftQuantity] = useState<number>(1);

    useEffect(() => {
        const isTime = ['EXP', 'GOLD', 'DROP', 'WEAPON', 'SKILL'].includes(buffStat);
        if (isTime && ![600, 1800, 3600].includes(buffDurationOption)) {
            setBuffDurationOption(600);
        } else if (!isTime && ![5, 10, 15].includes(buffDurationOption)) {
            setBuffDurationOption(10);
        }
    }, [buffStat, buffDurationOption]);

    useEffect(() => {
        const isLowRarity = selectedRarity === ItemRarity.NORMAL || selectedRarity === ItemRarity.MAGIC;
        if (isLowRarity && (buffStat === 'WEAPON' || buffStat === 'SKILL')) {
            setSelectedRarity(ItemRarity.RARE);
        }
        if (potionCategory === 'SCROLL' && selectedRarity === ItemRarity.NORMAL) {
            setSelectedRarity(ItemRarity.MAGIC);
        }
        if (potionCategory === 'NET' && selectedRarity === ItemRarity.MYTHTIC) {
            setSelectedRarity(ItemRarity.LEGENDARY);
        }
    }, [selectedRarity, buffStat, potionCategory]);
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);

    // 연금술실 용량 및 레벨
    const alchemyInstances = character.base?.layout?.filter(inst => inst.type === 'alchemy') || [];
    const labLevelSum = alchemyInstances.reduce((sum, inst) => sum + inst.level, 0) || 1;
    const totalLabCapacity = Math.max(2, labLevelSum * 2);
    
    // 할당된 연금술사 ID 목록 수집
    const assignedAlchemyIds = alchemyInstances.flatMap(inst => character.base?.multiAssignments?.[inst.id] || []);
    
    // 연금술사 동료 필터링 (AlchemyModal과 연금술 숙련도 레벨 및 등급 동기화, 연금술 실험실 담당자인 경우에만 의뢰 가능)
    const alchemists = [...(character.inactiveCompanions || [])].filter(c => 
        (c.job === JobType.ALCHEMIST || (c.job as any) === '연금술사' || (c.classType && c.classType.includes('연금술사'))) && 
        !c.isDead && 
        !character.base?.dispatched?.some(d => d.companionId === c.id) &&
        assignedAlchemyIds.includes(c.id)
    ).map(c => {
        const alcLevel = c.professions?.alchemy?.level || 1;
        c.alchemistRank = c.alchemistRank || getAlchemistRankFromLevel(alcLevel);
        if (c.alchemistMastery === undefined) c.alchemistMastery = c.professions?.alchemy?.exp || 0;
        return c;
    });

    const activeAlchemyMissions = character.base?.dispatched?.filter(d => d.missionType === 'AlchemyCrafting' || d.missionType === 'Alchemy') || [];

    const effectiveRarity = potionCategory === 'MIX'
        ? (mixType === 'POWER_ELIXIR' ? ItemRarity.UNIQUE : ItemRarity.RARE)
        : potionCategory === 'SCROLL'
            ? ItemRarity.MAGIC
            : selectedRarity;

    // 포션 1개당 기본 제작 비용 및 레시피 계산
    const getSingleRecipe = () => {
        const base = getPotionRecipe(potionCategory, effectiveRarity, mixType);
        if (potionCategory === 'BUFF') {
            const isTime = ['EXP', 'GOLD', 'DROP', 'WEAPON', 'SKILL'].includes(buffStat);
            let durMult = 1;
            if (isTime) {
                durMult = buffDurationOption === 3600 ? 4.5 : buffDurationOption === 1800 ? 2.5 : 1;
            } else {
                durMult = buffDurationOption === 15 ? 4.5 : buffDurationOption === 10 ? 2.5 : 1;
            }
            return {
                ...base,
                herbs: Math.ceil(base.herbs * durMult),
                wood: Math.ceil(base.wood * durMult),
                mana: Math.ceil(base.mana * durMult),
                crystal: Math.ceil(base.crystal * durMult),
                garlic: Math.ceil(base.garlic * durMult),
                shinryokuFlower: Math.ceil(base.shinryokuFlower * durMult),
                worldTreeBranch: Math.ceil(base.worldTreeBranch * durMult),
                silverOre: Math.ceil(base.silverOre * durMult),
                goldOre: Math.ceil(base.goldOre * durMult),
            };
        }
        return base;
    };

    const getSingleGold = () => {
        const baseGold = 500 * (RARITY_MULTIPLIERS[effectiveRarity] || 1);
        if (potionCategory === 'BUFF') {
            const isTime = ['EXP', 'GOLD', 'DROP', 'WEAPON', 'SKILL'].includes(buffStat);
            let durMult = 1;
            if (isTime) {
                durMult = buffDurationOption === 3600 ? 4.5 : buffDurationOption === 1800 ? 2.5 : 1;
            } else {
                durMult = buffDurationOption === 15 ? 4.5 : buffDurationOption === 10 ? 2.5 : 1;
            }
            return Math.ceil(baseGold * durMult);
        }
        return baseGold;
    };

    // 최대 제작 가능 개수 계산
    const getMaxCraftable = () => {
        const recipe = getSingleRecipe();
        const singleGold = getSingleGold();
        const res = (character.base?.resources || {}) as any;

        const limits: number[] = [99];
        if (singleGold > 0) limits.push(Math.floor(character.money / singleGold));
        if (recipe.herbs > 0) limits.push(Math.floor((res.herbs || 0) / recipe.herbs));
        if (recipe.wood > 0) limits.push(Math.floor((res.wood || 0) / recipe.wood));
        if (recipe.mana > 0) limits.push(Math.floor((res.manaCrystal || 0) / recipe.mana));
        if (recipe.crystal > 0) limits.push(Math.floor((res[recipe.crystalKey] || 0) / recipe.crystal));
        if (recipe.garlic > 0) limits.push(Math.floor((res.garlic || 0) / recipe.garlic));
        if (recipe.shinryokuFlower > 0) limits.push(Math.floor((res.shinryoku_flower || 0) / recipe.shinryokuFlower));
        if (recipe.worldTreeBranch > 0) limits.push(Math.floor((res.world_tree_branch || 0) / recipe.worldTreeBranch));
        if (recipe.silverOre > 0) limits.push(Math.floor((res.silver_ore || 0) / recipe.silverOre));
        if (recipe.goldOre > 0) limits.push(Math.floor((res.gold_ore || 0) / recipe.goldOre));

        return Math.max(0, Math.min(...limits));
    };

    // 수량 적용 총 제작 비용 및 레시피 계산
    const getCraftingCost = (qty: number = craftQuantity) => {
        const validQty = Math.max(1, qty);
        const singleRecipe = getSingleRecipe();
        const gold = getSingleGold() * validQty;
        const recipe = {
            ...singleRecipe,
            herbs: singleRecipe.herbs * validQty,
            wood: singleRecipe.wood * validQty,
            mana: singleRecipe.mana * validQty,
            crystal: singleRecipe.crystal * validQty,
            garlic: singleRecipe.garlic * validQty,
            shinryokuFlower: singleRecipe.shinryokuFlower * validQty,
            worldTreeBranch: singleRecipe.worldTreeBranch * validQty,
            silverOre: singleRecipe.silverOre * validQty,
            goldOre: singleRecipe.goldOre * validQty,
        };
        return { 
            gold, 
            herbs: recipe.herbs, 
            wood: recipe.wood, 
            manaCrystal: recipe.mana, 
            recipe 
        };
    };

    // 성공률 계산
    const getSuccessRate = (alchemist: Companion) => {
        const baseSuccess = effectiveRarity === ItemRarity.NORMAL ? 95 :
                            effectiveRarity === ItemRarity.MAGIC ? 88 :
                            effectiveRarity === ItemRarity.RARE ? 80 :
                            effectiveRarity === ItemRarity.EPIC ? 70 :
                            effectiveRarity === ItemRarity.UNIQUE ? 60 :
                            effectiveRarity === ItemRarity.LEGENDARY ? 50 : 40;

        const alcLevel = alchemist.professions?.alchemy?.level || 1;
        const rank = alchemist.alchemistRank || getAlchemistRankFromLevel(alcLevel);
        const rankCoef = ALCHEMIST_RANK_CONFIG[rank]?.coef || 1;
        const masteryExp = alchemist.professions?.alchemy?.exp || alchemist.alchemistMastery || 0;
        
        const rate = (baseSuccess * 0.8) + rankCoef * 2 + (alcLevel * 1.5) + (masteryExp * 0.005);
        return Math.min(100, Math.floor(rate));
    };

    // 제작 소요 일수 계산 (대량 조제 시 묶음 효율 적용)
    const getCraftingDays = (alchemist: Companion, qty: number = craftQuantity) => {
        const baseDays = BASE_CRAFT_TIME[effectiveRarity] || 1;
        const validQty = Math.max(1, qty);
        const batchDays = baseDays * (1 + (validQty - 1) * 0.25);
        const rank = alchemist.alchemistRank || getAlchemistRankFromLevel(alchemist.professions?.alchemy?.level || 1);
        const rankCoef = ALCHEMIST_RANK_CONFIG[rank]?.coef || 1;
        
        // 연금술실 총 레벨 단축 보너스 (레벨당 3%, 최대 50%)
        const labBonus = Math.min(0.5, labLevelSum * 0.03);
        const reducedTime = batchDays * (1 - labBonus);
        
        return Math.max(1, Math.ceil(reducedTime / rankCoef));
    };

    // 기본 이름 및 상세 얻기
    const getPotionDefaults = () => {
        let name = "최하급 HP 포션";
        let desc = "체력을 회복시키는 시약.";

        if (potionCategory === 'HP') {
            const names: Record<ItemRarity, string> = {
                [ItemRarity.NORMAL]: '최하급 HP 포션',
                [ItemRarity.MAGIC]: '하급 HP 포션',
                [ItemRarity.RARE]: '중급 HP 포션',
                [ItemRarity.EPIC]: '최상급 HP 포션',
                [ItemRarity.UNIQUE]: '상급 HP 포션',
                [ItemRarity.LEGENDARY]: '특급 HP 포션',
                [ItemRarity.MYTHTIC]: '신화급 HP 포션'
            };
            name = names[selectedRarity] || 'HP 포션';
            desc = `체력을 대량 회복하는 연금술 시약 (${selectedRarity}).`;
        } else if (potionCategory === 'MP') {
            const names: Record<ItemRarity, string> = {
                [ItemRarity.NORMAL]: '최하급 MP 포션',
                [ItemRarity.MAGIC]: '하급 MP 포션',
                [ItemRarity.RARE]: '중급 MP 포션',
                [ItemRarity.EPIC]: '최상급 MP 포션',
                [ItemRarity.UNIQUE]: '상급 MP 포션',
                [ItemRarity.LEGENDARY]: '특급 MP 포션',
                [ItemRarity.MYTHTIC]: '신화급 MP 포션'
            };
            name = names[selectedRarity] || 'MP 포션';
            desc = `마나를 회복시키는 마법 시약 (${selectedRarity}).`;
        } else if (potionCategory === 'FATIGUE') {
            const names: Record<ItemRarity, string> = {
                [ItemRarity.NORMAL]: '최하급 피로회복제',
                [ItemRarity.MAGIC]: '하급 피로회복제',
                [ItemRarity.RARE]: '중급 피로회복제',
                [ItemRarity.EPIC]: '상급 피로회복제',
                [ItemRarity.UNIQUE]: '특급 피로회복제',
                [ItemRarity.LEGENDARY]: '궁극의 피로회복제',
                [ItemRarity.MYTHTIC]: '신화급 피로회복제'
            };
            const fatigueVals: Record<ItemRarity, number> = {
                [ItemRarity.NORMAL]: 20,
                [ItemRarity.MAGIC]: 35,
                [ItemRarity.RARE]: 50,
                [ItemRarity.EPIC]: 70,
                [ItemRarity.UNIQUE]: 85,
                [ItemRarity.LEGENDARY]: 100,
                [ItemRarity.MYTHTIC]: 100
            };
            name = names[selectedRarity] || '피로회복제';
            desc = `복용 시 피로도를 ${fatigueVals[selectedRarity] || 30} 감소시키는 활력 영약.`;
        } else if (potionCategory === 'BUFF') {
            const isTime = ['EXP', 'GOLD', 'DROP', 'WEAPON', 'SKILL'].includes(buffStat);
            let durText = '10분';
            let durSuffix = '';
            if (isTime) {
                durText = buffDurationOption === 3600 ? '1시간' : buffDurationOption === 1800 ? '30분' : '10분';
                durSuffix = buffDurationOption === 3600 ? ' (1시간)' : buffDurationOption === 1800 ? ' (30분)' : '';
            } else {
                const turns = [5, 10, 15].includes(buffDurationOption) ? buffDurationOption : 10;
                durText = `${turns}턴`;
                durSuffix = turns === 10 ? '' : ` (${turns}턴)`;
            }

            if (buffStat === 'EXP') {
                const mult = (selectedRarity === ItemRarity.NORMAL ? 1.2 : selectedRarity === ItemRarity.MAGIC ? 1.4 : selectedRarity === ItemRarity.RARE ? 1.5 : selectedRarity === ItemRarity.EPIC ? 1.8 : selectedRarity === ItemRarity.UNIQUE ? 2.0 : selectedRarity === ItemRarity.LEGENDARY ? 3.0 : 5.0);
                name = `${selectedRarity} 경험치 비약${durSuffix}`;
                desc = `전투 경험치 획득량 ${mult}배 증가 (${durText})`;
            } else if (buffStat === 'GOLD') {
                const mult = (selectedRarity === ItemRarity.NORMAL ? 1.2 : selectedRarity === ItemRarity.MAGIC ? 1.4 : selectedRarity === ItemRarity.RARE ? 1.5 : selectedRarity === ItemRarity.EPIC ? 1.8 : selectedRarity === ItemRarity.UNIQUE ? 2.0 : selectedRarity === ItemRarity.LEGENDARY ? 3.0 : 5.0);
                name = `${selectedRarity} 골드 획득 비약${durSuffix}`;
                desc = `전투 골드 획득량 ${mult}배 증가 (${durText})`;
            } else if (buffStat === 'DROP') {
                const mult = (selectedRarity === ItemRarity.NORMAL ? 1.2 : selectedRarity === ItemRarity.MAGIC ? 1.5 : selectedRarity === ItemRarity.RARE ? 2.0 : selectedRarity === ItemRarity.UNIQUE ? 3.0 : selectedRarity === ItemRarity.EPIC ? 4.0 : 5.0);
                name = `${selectedRarity} 드롭률 비약${durSuffix}`;
                desc = `전리품 드롭률 ${mult}배 증가 (${durText})`;
            } else if (buffStat === 'WEAPON') {
                const mult = (selectedRarity === ItemRarity.NORMAL || selectedRarity === ItemRarity.MAGIC) ? 1.0 : selectedRarity === ItemRarity.RARE ? 2.0 : selectedRarity === ItemRarity.EPIC ? 3.0 : selectedRarity === ItemRarity.UNIQUE ? 4.0 : 5.0;
                name = `${selectedRarity} 무기숙련도 비약${durSuffix}`;
                desc = `전투 시 획득 무기숙련도 ${mult}배 증가 (${durText})`;
            } else if (buffStat === 'SKILL') {
                const mult = (selectedRarity === ItemRarity.NORMAL || selectedRarity === ItemRarity.MAGIC) ? 1.0 : selectedRarity === ItemRarity.RARE ? 2.0 : selectedRarity === ItemRarity.EPIC ? 3.0 : selectedRarity === ItemRarity.UNIQUE ? 4.0 : 5.0;
                name = `${selectedRarity} 스킬숙련도 비약${durSuffix}`;
                desc = `전투 시 획득 스킬숙련도 ${mult}배 증가 (${durText})`;
            } else if (buffStat === 'RES_FIRE') {
                const bonusVal = selectedRarity === ItemRarity.NORMAL ? 15 : selectedRarity === ItemRarity.MAGIC ? 25 : selectedRarity === ItemRarity.RARE ? 35 : selectedRarity === ItemRarity.EPIC ? 50 : 70;
                name = `${selectedRarity} 화염 속성 저항 ${(potionCategory as string) === 'SCROLL' ? '주문서' : '포션'}${durSuffix}`;
                desc = `화염 속성 저항 +${bonusVal}% 증가 (${durText})`;
            } else if (buffStat === 'RES_WATER') {
                const bonusVal = selectedRarity === ItemRarity.NORMAL ? 15 : selectedRarity === ItemRarity.MAGIC ? 25 : selectedRarity === ItemRarity.RARE ? 35 : selectedRarity === ItemRarity.EPIC ? 50 : 70;
                name = `${selectedRarity} 빙결 속성 저항 ${(potionCategory as string) === 'SCROLL' ? '주문서' : '포션'}${durSuffix}`;
                desc = `빙결 속성 저항 +${bonusVal}% 증가 (${durText})`;
            } else if (buffStat === 'RES_ELEC') {
                const bonusVal = selectedRarity === ItemRarity.NORMAL ? 15 : selectedRarity === ItemRarity.MAGIC ? 25 : selectedRarity === ItemRarity.RARE ? 35 : selectedRarity === ItemRarity.EPIC ? 50 : 70;
                name = `${selectedRarity} 전격 속성 저항 ${(potionCategory as string) === 'SCROLL' ? '주문서' : '포션'}${durSuffix}`;
                desc = `전격 속성 저항 +${bonusVal}% 증가 (${durText})`;
            } else if (buffStat === 'RES_EARTH') {
                const bonusVal = selectedRarity === ItemRarity.NORMAL ? 15 : selectedRarity === ItemRarity.MAGIC ? 25 : selectedRarity === ItemRarity.RARE ? 35 : selectedRarity === ItemRarity.EPIC ? 50 : 70;
                name = `${selectedRarity} 대지 속성 저항 ${(potionCategory as string) === 'SCROLL' ? '주문서' : '포션'}${durSuffix}`;
                desc = `대지 속성 저항 +${bonusVal}% 증가 (${durText})`;
            } else if (buffStat === 'RES_ALL') {
                const bonusVal = selectedRarity === ItemRarity.NORMAL ? 10 : selectedRarity === ItemRarity.MAGIC ? 20 : selectedRarity === ItemRarity.RARE ? 30 : selectedRarity === ItemRarity.EPIC ? 40 : 50;
                name = `${selectedRarity} 모든 속성 저항 ${(potionCategory as string) === 'SCROLL' ? '주문서' : '영약'}${durSuffix}`;
                desc = `모든 속성 저항 +${bonusVal}% 증가 (${durText})`;
            } else if (buffStat === 'DEF_PHYS') {
                const bonusVal = selectedRarity === ItemRarity.NORMAL ? 10 : selectedRarity === ItemRarity.MAGIC ? 20 : selectedRarity === ItemRarity.RARE ? 30 : selectedRarity === ItemRarity.EPIC ? 40 : 50;
                name = `${selectedRarity} 물리 방어 주문서${durSuffix}`;
                desc = `물리 방어력 +${bonusVal}% 증가 (${durText})`;
            } else if (buffStat === 'DEF_MAG') {
                const bonusVal = selectedRarity === ItemRarity.NORMAL ? 10 : selectedRarity === ItemRarity.MAGIC ? 20 : selectedRarity === ItemRarity.RARE ? 30 : selectedRarity === ItemRarity.EPIC ? 40 : 50;
                name = `${selectedRarity} 마법 방어 주문서${durSuffix}`;
                desc = `마법 방어력 +${bonusVal}% 증가 (${durText})`;
            } else {
                const statConfig: Record<string, { label: string; statKey: string }> = {
                    ATK: { label: '공격력', statKey: 'STR' },
                    STR: { label: '공격력', statKey: 'STR' },
                    DEF: { label: '방어력', statKey: 'DEF' },
                    SPD: { label: '민첩 속도', statKey: 'AGI' },
                    DEX: { label: '민첩 속도', statKey: 'AGI' },
                    AGI: { label: '민첩 속도', statKey: 'AGI' },
                    INT: { label: '마력', statKey: 'INT' },
                    WIS: { label: '지혜', statKey: 'WIS' },
                    CTRL: { label: '통제', statKey: 'CTRL' },
                    ALL: { label: '전체 능력치', statKey: 'ALL' }
                };
                const cfg = statConfig[buffStat] || { label: buffStat, statKey: buffStat };
                const bonusVal = selectedRarity === ItemRarity.NORMAL ? 10 :
                                 selectedRarity === ItemRarity.MAGIC ? 20 :
                                 selectedRarity === ItemRarity.RARE ? 35 :
                                 selectedRarity === ItemRarity.EPIC ? 50 :
                                 selectedRarity === ItemRarity.UNIQUE ? 75 :
                                 selectedRarity === ItemRarity.LEGENDARY ? 100 : 150;
                name = `${selectedRarity} ${cfg.label} 강화 영약${durSuffix}`;
                if (cfg.statKey === 'ALL') {
                    desc = `전체 능력치 STR +${bonusVal}%, INT +${bonusVal}%, DEF +${bonusVal}%, AGI +${bonusVal}%, WIS +${bonusVal}%, CTRL +${bonusVal}% 증가 (${durText})`;
                } else {
                    desc = `${cfg.label} ${cfg.statKey} +${bonusVal}% 증가 (${durText})`;
                }
            }
        } else if (potionCategory === 'CURE') {
            name = '만병통치약';
            desc = '모든 해로운 상태이상을 즉시 정화합니다.';
        } else if (potionCategory === 'MIX') {
            if (mixType === 'ELIXIR') { name = "엘릭서"; desc = "체력 50%, 마나 50%를 회복시키는 고급 영약."; }
            else if (mixType === 'POWER_ELIXIR') { name = "파워 엘릭서"; desc = "체력과 마나를 100% 완전 회복시키는 궁극의 영약."; }
            else { name = "부활의 영약"; desc = "전투 불능 상태에서 즉시 부활시키는 연금술의 비약."; }
        } else if (potionCategory === 'SCROLL') {
            if (scrollType === 'TELEPORT') {
                name = "차원이동 주문서 (기지)";
                desc = "사용 시 아군 기지로 즉시 이동합니다.";
            } else if (scrollType === 'DEF_PHYS') {
                const bonusVal = selectedRarity === ItemRarity.NORMAL ? 10 : selectedRarity === ItemRarity.MAGIC ? 20 : selectedRarity === ItemRarity.RARE ? 30 : selectedRarity === ItemRarity.EPIC ? 40 : 50;
                name = `${selectedRarity} 물리 방어 주문서`;
                desc = `전투 시 물리 방어력 +${bonusVal}% 증가 (10턴)`;
            } else if (scrollType === 'DEF_MAG') {
                const bonusVal = selectedRarity === ItemRarity.NORMAL ? 10 : selectedRarity === ItemRarity.MAGIC ? 20 : selectedRarity === ItemRarity.RARE ? 30 : selectedRarity === ItemRarity.EPIC ? 40 : 50;
                name = `${selectedRarity} 마법 방어 주문서`;
                desc = `전투 시 마법 방어력 +${bonusVal}% 증가 (10턴)`;
            } else if (scrollType === 'RES_FIRE') {
                const bonusVal = selectedRarity === ItemRarity.NORMAL ? 15 : selectedRarity === ItemRarity.MAGIC ? 25 : selectedRarity === ItemRarity.RARE ? 35 : selectedRarity === ItemRarity.EPIC ? 50 : 70;
                name = `${selectedRarity} 화염 속성 저항 주문서`;
                desc = `전투 시 화염 속성 저항 +${bonusVal}% 증가 (10턴)`;
            } else if (scrollType === 'RES_WATER') {
                const bonusVal = selectedRarity === ItemRarity.NORMAL ? 15 : selectedRarity === ItemRarity.MAGIC ? 25 : selectedRarity === ItemRarity.RARE ? 35 : selectedRarity === ItemRarity.EPIC ? 50 : 70;
                name = `${selectedRarity} 빙결 속성 저항 주문서`;
                desc = `전투 시 빙결 속성 저항 +${bonusVal}% 증가 (10턴)`;
            } else if (scrollType === 'RES_ELEC') {
                const bonusVal = selectedRarity === ItemRarity.NORMAL ? 15 : selectedRarity === ItemRarity.MAGIC ? 25 : selectedRarity === ItemRarity.RARE ? 35 : selectedRarity === ItemRarity.EPIC ? 50 : 70;
                name = `${selectedRarity} 전격 속성 저항 주문서`;
                desc = `전투 시 전격 속성 저항 +${bonusVal}% 증가 (10턴)`;
            } else if (scrollType === 'RES_EARTH') {
                const bonusVal = selectedRarity === ItemRarity.NORMAL ? 15 : selectedRarity === ItemRarity.MAGIC ? 25 : selectedRarity === ItemRarity.RARE ? 35 : selectedRarity === ItemRarity.EPIC ? 50 : 70;
                name = `${selectedRarity} 대지 속성 저항 주문서`;
                desc = `전투 시 대지 속성 저항 +${bonusVal}% 증가 (10턴)`;
            } else if (scrollType === 'RES_ALL') {
                const bonusVal = selectedRarity === ItemRarity.NORMAL ? 10 : selectedRarity === ItemRarity.MAGIC ? 20 : selectedRarity === ItemRarity.RARE ? 30 : selectedRarity === ItemRarity.EPIC ? 40 : 50;
                name = `${selectedRarity} 모든 속성 저항 주문서`;
                desc = `전투 시 모든 속성 저항 +${bonusVal}% 증가 (10턴)`;
            } else if (scrollType === 'DEF_ALL') {
                const bonusVal = selectedRarity === ItemRarity.NORMAL ? 15 : selectedRarity === ItemRarity.MAGIC ? 25 : selectedRarity === ItemRarity.RARE ? 35 : selectedRarity === ItemRarity.EPIC ? 45 : 60;
                name = `${selectedRarity} 모든 속성 수호 주문서`;
                desc = `전투 시 모든 속성 저항 +${bonusVal}% 및 방어력 +20% 증가 (10턴)`;
            }
        } else if (potionCategory === 'NET') {
            const cfg = NET_CONFIG[selectedRarity] || { name: '포획 그물', val: 30 };
            name = cfg.name;
            desc = `레벨 ${cfg.val}까지의 몬스터를 포획 가능하다. (몬스터 사육소 필요)`;
        }

        return { defaultName: name, desc };
    };

    const handleStartCraft = () => {
        if (!selectedAlchemistId) return;

        if (activeAlchemyMissions.length >= totalLabCapacity) {
            alert(`의뢰 가능 한계치에 도달했습니다. (현재: ${activeAlchemyMissions.length} / 최대: ${totalLabCapacity})\n연금술실을 더 증축하거나 레벨을 올려 한계치를 늘릴 수 있습니다.`);
            return;
        }

        const validQuantity = Math.max(1, Math.floor(craftQuantity || 1));
        const alchemist = alchemists.find(a => a.id === selectedAlchemistId)!;
        const rankCfg = ALCHEMIST_RANK_CONFIG[alchemist.alchemistRank || AlchemistRank.BEGINNER];

        const targetRarity = effectiveRarity;

        if (potionCategory === 'NET' && targetRarity === ItemRarity.MYTHTIC) {
            alert("신화 등급 포획 그물은 의뢰할 수 없습니다.");
            return;
        }

        if (potionCategory === 'SCROLL' || potionCategory === 'NET') {
            const curRank = alchemist.alchemistRank || getAlchemistRankFromLevel(alchemist.professions?.alchemy?.level || 1);
            if (curRank !== AlchemistRank.GRANDMASTER) {
                alert(`${rankCfg.label}은(는) ${potionCategory === 'SCROLL' ? '차원이동 주문서' : '포획 그물'}을(를) 제작할 수 없습니다. 대현자 등급의 연금술사에게 의뢰해주세요.`);
                return;
            }
        }

        if (!rankCfg.allowedRarities.includes(targetRarity)) {
            alert(`${rankCfg.label}은(는) ${targetRarity} 등급 품목을 제작할 수 없습니다. 더 높은 등급의 연금술사에게 의뢰해주세요.`);
            return;
        }

        const { gold, recipe } = getCraftingCost(validQuantity);
        const res = (character.base?.resources || {}) as any;

        const missing: string[] = [];
        if (character.money < gold) missing.push(`골드 ${(gold - character.money).toLocaleString()}G`);
        if ((res.herbs || 0) < recipe.herbs) missing.push(`약초 ${recipe.herbs - (res.herbs || 0)}개`);
        if ((res.wood || 0) < recipe.wood) missing.push(`목재 ${recipe.wood - (res.wood || 0)}개`);
        if ((res.manaCrystal || 0) < recipe.mana) missing.push(`마정석 ${recipe.mana - (res.manaCrystal || 0)}개`);

        const crystalOwned = (res[recipe.crystalKey] || 0);
        if (crystalOwned < recipe.crystal) missing.push(`${recipe.crystalName} ${recipe.crystal - crystalOwned}개`);

        if (recipe.garlic > 0 && (res.garlic || 0) < recipe.garlic) missing.push(`마늘 ${recipe.garlic - (res.garlic || 0)}개`);
        if (recipe.shinryokuFlower > 0 && (res.shinryoku_flower || 0) < recipe.shinryokuFlower) missing.push(`신력 꽃 ${recipe.shinryokuFlower - (res.shinryoku_flower || 0)}개`);
        if (recipe.worldTreeBranch > 0 && (res.world_tree_branch || 0) < recipe.worldTreeBranch) missing.push(`세계수의 가지 ${recipe.worldTreeBranch - (res.world_tree_branch || 0)}개`);
        if (recipe.silverOre > 0 && (res.silver_ore || 0) < recipe.silverOre) missing.push(`은광석 ${recipe.silverOre - (res.silver_ore || 0)}개`);
        if (recipe.goldOre > 0 && (res.gold_ore || 0) < recipe.goldOre) missing.push(`금광석 ${recipe.goldOre - (res.gold_ore || 0)}개`);

        if (missing.length > 0) {
            setResultData({
                type: 'warning',
                title: '재료 부족',
                message: `포션 ${validQuantity}개 의뢰에 필요한 재료나 자금이 부족합니다.`,
                items: missing.map(m => ({ label: '부족', after: m }))
            });
            return;
        }

        const successRate = getSuccessRate(alchemist);
        const days = getCraftingDays(alchemist, validQuantity);
        const returnDate = addDays(character.currentDate || '2000-01-01', days);
        const { defaultName, desc } = getPotionDefaults();
        const finalName = customName.trim() || defaultName;

        const newMission: DispatchMission = {
            id: `alc_craft_${Math.random().toString(36).substring(2, 9)}`,
            companionId: alchemist.id,
            destination: character.currentLocation!,
            startTime: character.currentDate!,
            durationMonths: 0,
            expectedReturnDate: returnDate,
            status: 'Normal',
            dangerCounter: 0,
            successRate: successRate,
            missionType: 'AlchemyCrafting',
            rewards: { gold: 0, items: [] }
        };

        const isTimeBuff = potionCategory === 'BUFF' && ['EXP', 'GOLD', 'DROP', 'WEAPON', 'SKILL'].includes(buffStat);
        const resolvedDuration = potionCategory === 'BUFF'
            ? (isTimeBuff
                ? ([600, 1800, 3600].includes(buffDurationOption) ? buffDurationOption : 600)
                : ([5, 10, 15].includes(buffDurationOption) ? buffDurationOption : 10))
            : (potionCategory === 'SCROLL' && scrollType !== 'TELEPORT' ? 10 : undefined);

        (newMission as any).craftMetadata = {
            potionCategory,
            scrollType,
            rarity: selectedRarity,
            mixType,
            buffStat,
            duration: resolvedDuration,
            finalName,
            desc,
            costGold: gold,
            recipe,
            days,
            quantity: validQuantity
        };

        const newChar = { ...character };
        newChar.money -= gold;

        if (newChar.base) {
            const currentRes = { ...newChar.base.resources } as any;
            currentRes.herbs = (currentRes.herbs || 0) - recipe.herbs;
            currentRes.wood = (currentRes.wood || 0) - recipe.wood;
            currentRes.manaCrystal = (currentRes.manaCrystal || 0) - recipe.mana;
            currentRes[recipe.crystalKey] = (currentRes[recipe.crystalKey] || 0) - recipe.crystal;

            if (recipe.garlic > 0) currentRes.garlic = (currentRes.garlic || 0) - recipe.garlic;
            if (recipe.shinryokuFlower > 0) currentRes.shinryoku_flower = (currentRes.shinryoku_flower || 0) - recipe.shinryokuFlower;
            if (recipe.worldTreeBranch > 0) currentRes.world_tree_branch = (currentRes.world_tree_branch || 0) - recipe.worldTreeBranch;
            if (recipe.silverOre > 0) currentRes.silver_ore = (currentRes.silver_ore || 0) - recipe.silverOre;
            if (recipe.goldOre > 0) currentRes.gold_ore = (currentRes.gold_ore || 0) - recipe.goldOre;

            newChar.base = {
                ...newChar.base,
                resources: currentRes,
                dispatched: [...(newChar.base.dispatched || []), newMission]
            };
        }

        onUpdateCharacter(newChar, `[연금술 의뢰] ${alchemist.name} (${rankCfg.label})가 ${finalName} ${validQuantity}개 조제에 착수했습니다. (소요: ${days}일)`);
        setResultData({
            type: 'success',
            title: '의뢰 수락',
            message: `${alchemist.name} 연금술사가 정밀 조제를 시작했습니다.`,
            items: [
                { label: '목표 시약', after: `${finalName} × ${validQuantity}개` },
                { label: '성공률', after: `${successRate}%` },
                { label: '소요 시간', after: `${days}일` },
                { label: '완료 예정', after: returnDate }
            ]
        });
        setSelectedAlchemistId(null);
        setCustomName('');
        setCraftQuantity(1);
        setActiveTab('status');
    };

    const handleCompleteCraft = async (mission: DispatchMission) => {
        const comp = character.inactiveCompanions?.find(c => c.id === mission.companionId) ||
                     character.companions.find(c => c.id === mission.companionId);
        if (!comp) return;

        const meta = (mission as any).craftMetadata;
        if (!meta) return;

        setIsProcessing(true);
        const roll = Math.random() * 100;
        const success = roll < (mission.successRate || 50);
        const qty = meta.quantity || 1;

        const newChar = { ...character };
        let logMsg = "";
        let result: ResultData;

        if (success) {
            let baseGain = MASTERY_GAIN[meta.rarity as ItemRarity] || 20;
            let gain = Math.floor(baseGain * (1 + (qty - 1) * 0.4));
            const isGreatSuccess = Math.random() < 0.1; // 10% 대성공
            if (isGreatSuccess) gain *= 2;

            const updateAlchemistInList = (list: Companion[]) => {
                const idx = list.findIndex(c => c.id === comp.id);
                if (idx !== -1) {
                    const c = { ...list[idx] };
                    if (!c.professions) c.professions = {};
                    if (!c.professions.alchemy) {
                        c.professions.alchemy = { level: c.level || 1, exp: 0, maxExp: 100 };
                    }
                    const mastery = c.professions.alchemy;
                    mastery.exp += gain;
                    while (mastery.exp >= mastery.maxExp) {
                        mastery.exp -= mastery.maxExp;
                        mastery.level += 1;
                        mastery.maxExp = Math.floor(mastery.maxExp * 1.2);
                    }
                    c.alchemistRank = getAlchemistRankFromLevel(mastery.level);
                    c.alchemistMastery = mastery.exp;
                    list[idx] = c;
                }
            };
            updateAlchemistInList(newChar.companions);
            if (newChar.inactiveCompanions) updateAlchemistInList(newChar.inactiveCompanions);

            const isTeleportScroll = (meta.potionCategory === 'SCROLL' && (!meta.scrollType || meta.scrollType === 'TELEPORT')) || meta.finalName?.includes('차원이동 주문서');
            const isAnyScroll = meta.potionCategory === 'SCROLL' || meta.finalName?.includes('주문서');
            const isNet = meta.potionCategory === 'NET' || meta.finalName?.includes('포획 그물');
            const scrollSecondary = ["['기지' 로 차원이동 주문서]"];
            const netCfg = NET_CONFIG[meta.rarity as ItemRarity] || { name: '포획 그물', val: 30, img: "https://i.ibb.co/FPjZgNK/Gemini-Generated-Image-av5eb8av5eb8av5e.png" };

            const isTime = ['EXP', 'GOLD', 'DROP', 'WEAPON', 'SKILL', '경험치', '골드', '드롭률', '무기숙련도', '스킬숙련도'].some(k => meta.finalName?.includes(k) || meta.desc?.includes(k));
            const isTurnBuff = meta.potionCategory === 'BUFF' && !isTime;
            const isCombatScroll = meta.potionCategory === 'SCROLL' && meta.scrollType && meta.scrollType !== 'TELEPORT';

            let itemDuration: number | undefined = undefined;
            if (isTime) {
                itemDuration = (meta.duration && meta.duration >= 60)
                    ? meta.duration
                    : (meta.desc?.includes('1시간') ? 3600 : meta.desc?.includes('30분') ? 1800 : 600);
            } else if (isTurnBuff || isCombatScroll) {
                itemDuration = (meta.duration && meta.duration <= 50)
                    ? meta.duration
                    : (meta.desc?.includes('15턴') ? 15 : meta.desc?.includes('5턴') ? 5 : 10);
            }
            const newItem: Item = {
                name: meta.finalName,
                type: 'Consumable',
                rarity: meta.rarity,
                description: isTeleportScroll 
                    ? `${meta.finalName}. 효과: 사용 시 기지로 즉시 이동` 
                    : isNet 
                        ? `${meta.finalName}. 효과: 레벨 ${netCfg.val}까지의 몬스터를 포획 가능하다.(몬스터 사육소 있어야 가능)`
                        : (meta.desc || `연금술사 ${comp.name}의 연금술 결정체.`),
                enhancement: 0,
                quantity: qty,
                stats: { hp: 0, mp: 0 },
                duration: itemDuration,
                secondaryOptions: isTeleportScroll ? scrollSecondary : isNet ? [`몬스터 포획(${netCfg.val})`] : (meta.desc ? [meta.desc] : []),
                imageUrl: isAnyScroll 
                    ? "https://i.ibb.co/Zp1VCkcQ/Gemini-Generated-Image-o35is9o35is9o35i.png" 
                    : isNet 
                        ? (netCfg.img || "https://i.ibb.co/FPjZgNK/Gemini-Generated-Image-av5eb8av5eb8av5e.png")
                        : (meta.potionCategory === 'FATIGUE' || meta.finalName?.includes('피로회복제'))
                            ? ({
                                '최하급 피로회복제': 'https://i.ibb.co/7dckmsMV/1.png',
                                '하급 피로회복제': 'https://i.ibb.co/7dckmsMV/1.png',
                                '중급 피로회복제': 'https://i.ibb.co/p6x1061S/2.png',
                                '상급 피로회복제': 'https://i.ibb.co/FLhVqT71/3.png',
                                '특급 피로회복제': 'https://i.ibb.co/d0RXmrDH/4.png',
                                '궁극의 피로회복제': 'https://i.ibb.co/cSZMwD69/5.png',
                                '신화급 피로회복제': 'https://i.ibb.co/cSZMwD69/5.png',
                                '강력한 피로회복제': 'https://i.ibb.co/cSZMwD69/5.png',
                                '피로회복제': 'https://i.ibb.co/FThpY9q/Gemini-Generated-Image-8o5ck98o5ck98o5c.png',
                            }[meta.finalName] || 'https://i.ibb.co/FThpY9q/Gemini-Generated-Image-8o5ck98o5ck98o5c.png')
                            : "https://i.ibb.co/Kz56VGDS/image.png"
            };

            // 인벤토리 시스템 규격(개별 아이템 배열)에 맞게 qty만큼 개별적으로 푸시
            for (let i = 0; i < qty; i++) {
                newChar.inventory.push({
                    ...newItem,
                    id: `alchemy_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
                    quantity: 1
                });
            }

            logMsg = `[연금술 조제 완료] ${comp.name} 연금술사가 ${newItem.name} ${qty}개 조제에 성공했습니다! (숙련도 +${gain}${isGreatSuccess ? ' [대성공!]' : ''})`;
            result = {
                type: 'success',
                title: isGreatSuccess ? '✨ 조제 대성공! ✨' : '조제 성공',
                message: isGreatSuccess 
                    ? `대성공으로 인해 연금 숙련도가 2배(+${gain}) 상승했습니다!\n${comp.name} 연금술사가 완성된 시약 ${qty}개를 전달했습니다.`
                    : `${comp.name} 연금술사가 시약 조제를 완성했습니다.`,
                items: [
                    { label: '완성 아이템', after: `${newItem.name} × ${qty}개` },
                    { label: '등급', after: newItem.rarity },
                    { label: '숙련도 상승', after: `+${gain}${isGreatSuccess ? ' (대성공!)' : ''}` }
                ]
            };
        } else {
            logMsg = `[조제 실패] ${comp.name} 연금술사가 포션 제조에 실패했습니다. (약초 폭발)`;
            result = {
                type: 'failure',
                title: '조제 실패',
                message: `${comp.name} 연금술사가 조제 과정에서 재료를 소실했습니다.`,
                items: [{ label: '결과', after: '실패' }]
            };
        }

        if (newChar.base?.dispatched) {
            newChar.base.dispatched = newChar.base.dispatched.filter(d => d.id !== mission.id);
        }

        onUpdateCharacter(newChar, logMsg);
        setResultData(result);
        setIsProcessing(false);
    };

    const handlePromoteAlchemist = (alchemistId: string) => {
        const alchemist = alchemists.find(a => a.id === alchemistId);
        if (!alchemist) return;

        const currentRank = alchemist.alchemistRank || AlchemistRank.BEGINNER;
        const config = ALCHEMIST_RANK_CONFIG[currentRank];
        
        if (!config.nextRank) return;
        if ((alchemist.alchemistMastery || 0) < config.reqMastery) {
            alert(`숙련도가 부족합니다. (필요 숙련도: ${config.reqMastery})`);
            return;
        }

        const alcStats = calculateFinalStats(alchemist).finalStats;
        if (alcStats.wis < config.reqWis || alcStats.ctrl < config.reqCtrl) {
            alert(`승급 스탯 조건이 부족합니다. (필요 지혜 WIS: ${config.reqWis}, 통제 CTRL: ${config.reqCtrl} / 현재 WIS: ${alcStats.wis}, CTRL: ${alcStats.ctrl})`);
            return;
        }

        const newChar = { ...character };
        const updateAlchemist = (list: Companion[]) => {
            const idx = list.findIndex(c => c.id === alchemistId);
            if (idx !== -1) {
                list[idx] = { 
                    ...list[idx], 
                    alchemistRank: config.nextRank!,
                    alchemistMastery: list[idx].alchemistMastery
                };
            }
        };
        updateAlchemist(newChar.companions);
        if (newChar.inactiveCompanions) updateAlchemist(newChar.inactiveCompanions);

        const logMsg = `[연금술사 승급] ${alchemist.name} 대원이 ${config.nextRank} 연금술사로 승급했습니다!`;
        onUpdateCharacter(newChar, logMsg);
    };

    const selectedAlchemist = selectedAlchemistId ? alchemists.find(a => a.id === selectedAlchemistId) : null;
    const cost = getCraftingCost();

    useEffect(() => {
        if (selectedAlchemist) {
            const currentRank = selectedAlchemist.alchemistRank || AlchemistRank.BEGINNER;
            const allowed = ALCHEMIST_RANK_CONFIG[currentRank]?.allowedRarities || [ItemRarity.NORMAL, ItemRarity.MAGIC];
            if (!allowed.includes(selectedRarity)) {
                const highest = [...allowed].reverse()[0] || ItemRarity.NORMAL;
                setSelectedRarity(highest);
            }
        }
    }, [selectedAlchemistId]);

    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[190] p-2 sm:p-4 animate-in fade-in">
            {resultData && (
                <ActionResultModal
                    data={resultData}
                    onClose={() => setResultData(null)}
                />
            )}

            <div className="bg-slate-900 border border-purple-500/50 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-3 sm:p-5 bg-gradient-to-r from-purple-950 via-slate-900 to-purple-950 border-b border-purple-800/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 bg-purple-900/40 rounded-xl border border-purple-500/40">
                            <FlaskConical className="text-purple-400 w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-xl font-bold text-slate-100 flex items-center gap-2">
                                연금술사 포션 조제 의뢰
                            </h2>
                            <p className="text-[10px] sm:text-xs text-purple-300 font-medium">연금술사 동료에게 고성능 포션과 영약을 주문합니다</p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={onClose}
                        className="p-1.5 sm:p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-800 bg-slate-950/60 shrink-0">
                    <button
                        onClick={() => setActiveTab('new')}
                        className={`flex-1 py-2.5 sm:py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2 ${
                            activeTab === 'new' 
                                ? 'border-purple-500 text-purple-400 bg-purple-950/20' 
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <PlusCircle size={16} />
                        <span>새 의뢰 작성</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('status')}
                        className={`flex-1 py-2.5 sm:py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2 relative ${
                            activeTab === 'status' 
                                ? 'border-purple-500 text-purple-400 bg-purple-950/20' 
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Clock size={16} />
                        <span>의뢰 현황</span>
                        <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeAlchemyMissions.length >= totalLabCapacity ? 'bg-red-900/50 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                            {activeAlchemyMissions.length} / {totalLabCapacity}
                        </span>
                    </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar">
                    {activeTab === 'new' ? (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
                            {/* Left Column: Alchemist Selection */}
                            <div className="md:col-span-5 space-y-4">
                                <h3 className="text-xs sm:text-sm font-bold text-slate-300 flex items-center gap-2">
                                    <Users size={16} className="text-purple-400" />
                                    담당 연금술사 선택 ({alchemists.length}명)
                                </h3>

                                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                                    {alchemists.map(a => {
                                        const alcLevel = a.professions?.alchemy?.level || 1;
                                        const rank = a.alchemistRank || getAlchemistRankFromLevel(alcLevel);
                                        const rankCfg = ALCHEMIST_RANK_CONFIG[rank];
                                        const exp = a.professions?.alchemy?.exp || a.alchemistMastery || 0;
                                        const maxExp = a.professions?.alchemy?.maxExp || 100;
                                        const isSelected = selectedAlchemistId === a.id;

                                        return (
                                            <div 
                                                key={a.id}
                                                className={`p-3 rounded-xl border transition-all flex flex-col gap-2 cursor-pointer ${
                                                    isSelected 
                                                        ? 'bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-950/50' 
                                                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                                }`}
                                                onClick={() => setSelectedAlchemistId(a.id)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-9 h-9 rounded-full bg-purple-900/30 border border-purple-500/30 flex items-center justify-center font-bold text-purple-300 text-sm shrink-0">
                                                            {a.name.slice(0, 1)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-xs sm:text-sm text-slate-200">{a.name}</div>
                                                            <div className="text-[11px] text-purple-400 font-bold flex items-center gap-1.5">
                                                                <span>{rankCfg.label}</span>
                                                                <span className="text-[10px] text-purple-300/80 font-mono">(레벨 {alcLevel})</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                                    <div 
                                                        className="bg-purple-500 h-full transition-all duration-300"
                                                        style={{ width: `${Math.min(100, (exp / maxExp) * 100)}%` }}
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-0.5 text-[10px] text-slate-400">
                                                    <div className="flex justify-between items-center">
                                                        <span>숙련도 경험치: {exp}/{maxExp}</span>
                                                        <span>{rankCfg.nextRank ? `다음 등급 필요 숙련도: ${rankCfg.reqMastery}` : '최고 등급'}</span>
                                                    </div>
                                                    {rankCfg.nextRank && (
                                                        <div className="flex justify-between items-center text-[9px] text-purple-300/80">
                                                            <span>승급 조건 스탯:</span>
                                                            <span>지혜 {rankCfg.reqWis} 이상 / 통제 {rankCfg.reqCtrl} 이상</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="text-[10px] bg-slate-950/80 px-2 py-1 rounded border border-slate-800/80 flex items-center justify-between">
                                                    <span className="text-slate-500">제작 의뢰 가능:</span>
                                                    <span className="text-purple-300 font-bold">
                                                        {rankCfg.allowedRarities[0]} ~ {rankCfg.allowedRarities[rankCfg.allowedRarities.length - 1]}
                                                        {rank === AlchemistRank.GRANDMASTER ? ' (전 등급)' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {alchemists.length === 0 && (
                                        <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                                            대기 중인 연금술사 동료가 없습니다.<br/>
                                            (다른 시설에 배치되지 않은 연금술사 직업 동료 필요)
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Recipe Selection */}
                            <div className="md:col-span-7 space-y-4">
                                <h3 className="text-xs sm:text-sm font-bold text-slate-300 flex items-center gap-2">
                                    <Sparkles size={16} className="text-purple-400" />
                                    포션 주문 상세 정보
                                </h3>

                                <div className="bg-slate-950/60 p-3 sm:p-5 rounded-xl border border-slate-800 space-y-4">
                                    {/* Category */}
                                    <div>
                                        <label className="text-[11px] sm:text-xs text-slate-400 block mb-1.5 font-bold">포션 유형</label>
                                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                                            {(['HP', 'MP', 'FATIGUE', 'BUFF', 'CURE', 'MIX', 'SCROLL', 'NET'] as const).map(cat => (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => setPotionCategory(cat)}
                                                    className={`py-1.5 px-1 sm:px-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all border truncate ${
                                                        potionCategory === cat 
                                                            ? 'bg-purple-600 text-white border-purple-400 shadow-md' 
                                                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                                                    }`}
                                                >
                                                    {cat === 'HP' ? 'HP 포션' : cat === 'MP' ? 'MP 포션' : cat === 'FATIGUE' ? '피로회복제' : cat === 'BUFF' ? '영약/비약' : cat === 'CURE' ? '해독제' : cat === 'MIX' ? '복합' : cat === 'SCROLL' ? '주문서' : '포획 그물'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Sub option for BUFF / MIX */}
                                    {potionCategory === 'BUFF' && (
                                        <div>
                                            <label className="text-[11px] sm:text-xs text-slate-400 block mb-1 font-bold">영약 및 비약 종류 선택</label>
                                             <select 
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs sm:text-sm text-slate-200"
                                                value={buffStat}
                                                onChange={e => {
                                                    const next = e.target.value as any;
                                                    setBuffStat(next);
                                                    const isTime = ['EXP', 'GOLD', 'DROP', 'WEAPON', 'SKILL'].includes(next);
                                                    setBuffDurationOption(isTime ? 600 : 10);
                                                }}
                                            >
                                                <option value="EXP">경험치 비약</option>
                                                <option value="GOLD">골드 획득 비약</option>
                                                <option value="DROP">전리품 드롭률 비약</option>
                                                <option value="SKILL">스킬 숙련도 비약</option>
                                                <option value="WEAPON">무기 숙련도 비약</option>
                                                <option value="ATK">공격력 강화 영약</option>
                                                <option value="DEF">방어력 강화 영약</option>
                                                <option value="SPD">민첩 속도 강화 영약</option>
                                                <option value="INT">마력 강화 영약</option>
                                                <option value="WIS">지혜 강화 영약</option>
                                                <option value="CTRL">통제 강화 영약</option>
                                                <option value="ALL">전체 능력치 강화 영약</option>
                                                <option value="RES_FIRE">화염 속성 저항 포션/주문서</option>
                                                <option value="RES_WATER">빙결 속성 저항 포션/주문서</option>
                                                <option value="RES_ELEC">전격 속성 저항 포션/주문서</option>
                                                <option value="RES_EARTH">대지 속성 저항 포션/주문서</option>
                                                <option value="RES_ALL">모든 속성 저항 포션/영약/주문서</option>
                                                <option value="DEF_PHYS">물리 방어 주문서</option>
                                                <option value="DEF_MAG">마법 방어 주문서</option>
                                            </select>
                                            <div className="mt-3">
                                                <label className="text-[11px] sm:text-xs text-slate-400 block mb-1 font-bold">
                                                    {['EXP', 'GOLD', 'DROP', 'WEAPON', 'SKILL'].includes(buffStat) ? '비약 지속시간 선택 (시간제)' : '비약 지속턴 선택 (턴제)'}
                                                </label>
                                                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                                                    {(['EXP', 'GOLD', 'DROP', 'WEAPON', 'SKILL'].includes(buffStat) ? [
                                                        { dur: 600, label: '10분', sub: '기본 비용' },
                                                        { dur: 1800, label: '30분', sub: '비용 2.5배' },
                                                        { dur: 3600, label: '1시간', sub: '비용 4.5배' }
                                                    ] : [
                                                        { dur: 5, label: '5턴', sub: '기본 비용' },
                                                        { dur: 10, label: '10턴', sub: '비용 2.5배' },
                                                        { dur: 15, label: '15턴', sub: '비용 4.5배' }
                                                    ]).map(item => (
                                                        <button
                                                            key={item.dur}
                                                            type="button"
                                                            onClick={() => setBuffDurationOption(item.dur)}
                                                            className={`py-2 px-1 sm:px-3 rounded-lg border text-center transition-all flex flex-col items-center justify-center ${
                                                                buffDurationOption === item.dur
                                                                    ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-md ring-1 ring-purple-400'
                                                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                                                            }`}
                                                        >
                                                            <span className="text-xs sm:text-sm font-bold">{item.label}</span>
                                                            <span className="text-[10px] opacity-80 mt-0.5">{item.sub}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {potionCategory === 'MIX' && (
                                        <div>
                                            <label className="text-[11px] sm:text-xs text-slate-400 block mb-1 font-bold">복합 비약 종류</label>
                                            <select 
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs sm:text-sm text-slate-200"
                                                value={mixType}
                                                onChange={e => setMixType(e.target.value as any)}
                                            >
                                                <option value="ELIXIR">엘릭서 - 희귀 등급 (체력 50%, 마나 50% 회복 / 중급 이상 필요)</option>
                                                <option value="POWER_ELIXIR">파워 엘릭서 - 유일 등급 (체력 및 마나 100% 완전 회복 / 상급 이상 필요)</option>
                                                <option value="STONE">부활의 영약 - 희귀 등급 (전투 불능 상태 시 부활 / 중급 이상 필요)</option>
                                            </select>
                                            {selectedAlchemist && (
                                                !ALCHEMIST_RANK_CONFIG[selectedAlchemist.alchemistRank || AlchemistRank.BEGINNER].allowedRarities.includes(
                                                    mixType === 'POWER_ELIXIR' ? ItemRarity.UNIQUE : ItemRarity.RARE
                                                ) && (
                                                    <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                                                        <AlertCircle size={12} className="shrink-0" />
                                                        선택한 연금술사의 등급({ALCHEMIST_RANK_CONFIG[selectedAlchemist.alchemistRank || AlchemistRank.BEGINNER].label})으로는 이 비약을 제작할 수 없습니다. ({mixType === 'POWER_ELIXIR' ? '고급(상급) 연금술사' : '중급 연금술사'} 이상 필요)
                                                    </p>
                                                )
                                            )}
                                        </div>
                                    )}

                                     {potionCategory === 'SCROLL' && (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[11px] sm:text-xs text-slate-400 block mb-1 font-bold">주문서 종류 선택</label>
                                                <select 
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs sm:text-sm text-slate-200 outline-none focus:border-purple-500"
                                                    value={scrollType}
                                                    onChange={e => setScrollType(e.target.value as any)}
                                                >
                                                    <option value="TELEPORT">차원이동 주문서 (기지 귀환 / 대현자 전용)</option>
                                                    <option value="DEF_PHYS">물리 방어 주문서 (10턴간 물리 방어력 상승)</option>
                                                    <option value="DEF_MAG">마법 방어 주문서 (10턴간 마법 방어력 상승)</option>
                                                    <option value="RES_FIRE">화염 속성 저항 주문서 (10턴간 화염 저항 상승)</option>
                                                    <option value="RES_WATER">빙결 속성 저항 주문서 (10턴간 빙결 저항 상승)</option>
                                                    <option value="RES_ELEC">전격 속성 저항 주문서 (10턴간 전격 저항 상승)</option>
                                                    <option value="RES_EARTH">대지 속성 저항 주문서 (10턴간 대지 저항 상승)</option>
                                                    <option value="RES_ALL">모든 속성 저항 주문서 (10턴간 모든 속성 저항 상승)</option>
                                                    <option value="DEF_ALL">모든 속성 수호 주문서 (10턴간 속성 저항 & 방어력 상승)</option>
                                                </select>
                                            </div>

                                            <div className="bg-slate-900/60 border border-purple-500/30 rounded-lg p-2.5 text-xs text-slate-300 space-y-1.5">
                                                <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                                                    <Sparkles size={14} className="text-cyan-400" />
                                                    <span>
                                                        {scrollType === 'TELEPORT' ? '차원이동 주문서 (기지)' :
                                                         scrollType === 'DEF_PHYS' ? '물리 방어 주문서' :
                                                         scrollType === 'DEF_MAG' ? '마법 방어 주문서' :
                                                         scrollType === 'RES_FIRE' ? '화염 속성 저항 주문서' :
                                                         scrollType === 'RES_WATER' ? '빙결 속성 저항 주문서' :
                                                         scrollType === 'RES_ELEC' ? '전격 속성 저항 주문서' :
                                                         scrollType === 'RES_EARTH' ? '대지 속성 저항 주문서' :
                                                         scrollType === 'RES_ALL' ? '모든 속성 저항 주문서' : '모든 속성 수호 주문서'}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-300">
                                                    {scrollType === 'TELEPORT'
                                                        ? `사용 시 아군 기지(${character.base?.location ? `${character.base.location.nation} ${character.base.location.city}` : '건설된 기지'})로 즉시 이동합니다.`
                                                        : `전투 중 사용 시 10턴 동안 강력한 방어 및 속성 저항 효과를 제공합니다.`}
                                                </p>
                                                {scrollType === 'TELEPORT' && (
                                                    <p className="text-[10px] text-purple-400">
                                                        ※ 차원이동 주문서는 마법 등급부터 제작 가능하며, 대현자 등급 연금술사에게만 의뢰할 수 있습니다.
                                                    </p>
                                                )}
                                                {selectedAlchemist && scrollType === 'TELEPORT' && (
                                                    ((selectedAlchemist.alchemistRank || getAlchemistRankFromLevel(selectedAlchemist.professions?.alchemy?.level || 1)) !== AlchemistRank.GRANDMASTER) ? (
                                                        <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                                                            <AlertCircle size={12} className="shrink-0" />
                                                            선택한 연금술사의 등급({ALCHEMIST_RANK_CONFIG[selectedAlchemist.alchemistRank || getAlchemistRankFromLevel(selectedAlchemist.professions?.alchemy?.level || 1)]?.label})으로는 차원이동 주문서를 제작할 수 없습니다. (대현자 이상 필요)
                                                        </p>
                                                    ) : (
                                                        <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                                                            <CheckCircle size={12} className="shrink-0" />
                                                            {selectedAlchemist.name} (대현자) 연금술사가 주문서 조제 가능합니다.
                                                        </p>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {potionCategory === 'NET' && (
                                        <div className="bg-slate-900/60 border border-purple-500/30 rounded-lg p-2.5 text-xs text-slate-300 space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                                                <Sparkles size={14} className="text-emerald-400" />
                                                <span>몬스터 포획 그물 ({selectedRarity})</span>
                                            </div>
                                            <p className="text-[11px] text-slate-300">
                                                {NET_CONFIG[selectedRarity]?.name || '포획 그물'}: 레벨 {NET_CONFIG[selectedRarity]?.val || 30} 이하의 몬스터를 포획할 수 있는 특수 그물입니다. (사육소 필요)
                                            </p>
                                            <p className="text-[10px] text-purple-400">
                                                ※ 대현자 등급 연금술사에게만 의뢰할 수 있습니다.
                                            </p>
                                            {selectedAlchemist && (
                                                ((selectedAlchemist.alchemistRank || getAlchemistRankFromLevel(selectedAlchemist.professions?.alchemy?.level || 1)) !== AlchemistRank.GRANDMASTER) ? (
                                                    <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                                                        <AlertCircle size={12} className="shrink-0" />
                                                        선택한 연금술사의 등급({ALCHEMIST_RANK_CONFIG[selectedAlchemist.alchemistRank || getAlchemistRankFromLevel(selectedAlchemist.professions?.alchemy?.level || 1)]?.label})으로는 포획 그물을 제작할 수 없습니다. (대현자 이상 필요)
                                                    </p>
                                                ) : (
                                                    <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                                                        <CheckCircle size={12} className="shrink-0" />
                                                        {selectedAlchemist.name} (대현자) 연금술사가 포획 그물 조제 가능합니다.
                                                    </p>
                                                )
                                            )}
                                        </div>
                                    )}

                                    {/* Rarity */}
                                    {potionCategory === 'MIX' ? (
                                        <div>
                                            <label className="text-[11px] sm:text-xs text-slate-400 block font-bold mb-1">품질 및 희귀도</label>
                                            <div className="bg-slate-900 border border-amber-500/30 rounded-lg p-2.5 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-amber-300">
                                                        {mixType === 'POWER_ELIXIR' ? '유일 (Unique)' : '희귀 (Rare)'} 등급 고정
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        ({mixType === 'POWER_ELIXIR' ? '파워 엘릭서' : mixType === 'ELIXIR' ? '엘릭서' : '부활의 영약'})
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/30">
                                                    특수 배합 고정품
                                                </span>
                                            </div>
                                        </div>
                                    ) : potionCategory === 'SCROLL' ? (
                                        <div>
                                            <label className="text-[11px] sm:text-xs text-slate-400 block font-bold mb-1">품질 및 희귀도</label>
                                            <div className="bg-slate-900 border border-cyan-500/30 rounded-lg p-2.5 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-cyan-300">
                                                        매직 등급 고정
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        (차원이동 주문서)
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-purple-400 font-bold bg-purple-950/50 px-2 py-0.5 rounded border border-purple-500/30">
                                                    대현자 전용
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-[11px] sm:text-xs text-slate-400 block font-bold">품질 및 희귀도</label>
                                                {selectedAlchemist && (
                                                    <span className="text-[10px] text-purple-300">
                                                        {selectedAlchemist.name}: {ALCHEMIST_RANK_CONFIG[selectedAlchemist.alchemistRank || AlchemistRank.BEGINNER].label}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
                                                {Object.values(ItemRarity).filter(r => potionCategory !== 'NET' || r !== ItemRarity.MYTHTIC).map(r => {
                                                    const isGrandmasterLocked = (potionCategory === 'NET') && (
                                                        selectedAlchemist ? (selectedAlchemist.alchemistRank || getAlchemistRankFromLevel(selectedAlchemist.professions?.alchemy?.level || 1)) !== AlchemistRank.GRANDMASTER : false
                                                    );
                                                    const isAlchemistLocked = selectedAlchemist 
                                                        ? (!ALCHEMIST_RANK_CONFIG[selectedAlchemist.alchemistRank || getAlchemistRankFromLevel(selectedAlchemist.professions?.alchemy?.level || 1)]?.allowedRarities.includes(r) || isGrandmasterLocked)
                                                        : false;
                                                    const isLocked = isAlchemistLocked;
                                                    const reqInfo = getRequiredAlchemistRankForRarity(r);

                                                    return (
                                                        <button
                                                            key={r}
                                                            type="button"
                                                            disabled={isLocked}
                                                            onClick={() => setSelectedRarity(r)}
                                                            className={`py-1.5 px-1 text-[10px] sm:text-xs font-bold rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5 relative ${
                                                                isLocked
                                                                    ? 'bg-slate-950/80 border-slate-800/80 text-slate-600 cursor-not-allowed opacity-50'
                                                                    : selectedRarity === r 
                                                                        ? 'bg-purple-900/60 border-purple-400 text-purple-200 shadow-md shadow-purple-950/40' 
                                                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                                            }`}
                                                        >
                                                            <span className="flex items-center gap-1">
                                                                {isLocked && <Lock size={10} className="text-slate-500 shrink-0" />}
                                                                <span>{getRarityLabel(r)}</span>
                                                            </span>
                                                            {isGrandmasterLocked ? (
                                                                <span className="text-[8px] text-purple-400/80 font-normal">
                                                                    대현자 필요
                                                                </span>
                                                            ) : isAlchemistLocked ? (
                                                                <span className="text-[8px] text-purple-400/80 font-normal">
                                                                    {reqInfo.label} 필요
                                                                </span>
                                                            ) : (
                                                                <span className="text-[8px] text-emerald-400/80 font-normal">
                                                                    제작 가능
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Custom Name */}
                                    <div>
                                        <label className="text-[11px] sm:text-xs text-slate-400 block mb-1 font-bold">시약 각인 명칭 (선택)</label>
                                        <input 
                                            type="text"
                                            placeholder={getPotionDefaults().defaultName}
                                            value={customName}
                                            onChange={e => setCustomName(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs sm:text-sm text-slate-200 focus:border-purple-500 outline-none"
                                        />
                                    </div>

                                    {/* Craft Quantity Setting */}
                                    <div className="bg-slate-900/90 p-3 rounded-xl border border-purple-900/50 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[11px] sm:text-xs text-slate-300 font-bold flex items-center gap-1.5">
                                                <Package size={14} className="text-purple-400" />
                                                <span>제작 수량 설정</span>
                                            </label>
                                            {(() => {
                                                const maxCraft = getMaxCraftable();
                                                return (
                                                    <span className="text-[10px] text-purple-300">
                                                        보유 재료 기준 제작 가능: <strong className="text-emerald-400 font-bold">{maxCraft}개</strong>
                                                    </span>
                                                );
                                            })()}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setCraftQuantity(prev => Math.max(1, prev - 1))}
                                                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center transition-colors active:scale-95 text-base cursor-pointer"
                                            >
                                                -
                                            </button>
                                            <div className="flex-1 relative">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="999"
                                                    value={craftQuantity}
                                                    onChange={e => {
                                                        const val = parseInt(e.target.value, 10);
                                                        if (isNaN(val) || val < 1) {
                                                            setCraftQuantity(1);
                                                        } else {
                                                            setCraftQuantity(Math.min(999, val));
                                                        }
                                                    }}
                                                    className="w-full bg-slate-950 border border-purple-500/50 rounded-lg py-1.5 px-3 text-center text-sm font-bold text-purple-200 outline-none focus:border-purple-400"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
                                                    개
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setCraftQuantity(prev => Math.min(999, prev + 1))}
                                                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center transition-colors active:scale-95 text-base cursor-pointer"
                                            >
                                                +
                                            </button>
                                        </div>

                                        {/* Quick quantity buttons */}
                                        <div className="grid grid-cols-5 gap-1.5 pt-0.5">
                                            {[1, 5, 10, 20].map(qty => (
                                                <button
                                                    key={qty}
                                                    type="button"
                                                    onClick={() => setCraftQuantity(qty)}
                                                    className={`py-1 rounded-lg text-[10px] sm:text-xs font-bold border transition-colors cursor-pointer ${
                                                        craftQuantity === qty
                                                            ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                                                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                                                    }`}
                                                >
                                                    {qty}개
                                                </button>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const maxCraft = getMaxCraftable();
                                                    setCraftQuantity(Math.max(1, maxCraft));
                                                }}
                                                className={`py-1 rounded-lg text-[10px] sm:text-xs font-bold border transition-colors cursor-pointer ${
                                                    craftQuantity === Math.max(1, getMaxCraftable()) && getMaxCraftable() > 0
                                                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                                                        : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800'
                                                }`}
                                            >
                                                최대
                                            </button>
                                        </div>
                                    </div>

                                    {/* Crafting Requirements & Info */}
                                    <div className="bg-slate-900/80 p-3 rounded-xl border border-purple-900/40 space-y-2">
                                        <div className="text-xs font-bold text-purple-300 flex items-center justify-between">
                                            <span>요구 재료 및 비용 ({craftQuantity}개 기준)</span>
                                            {selectedAlchemist && (
                                                <span className="text-[10px] text-emerald-400 font-bold">
                                                    예상 소요: {getCraftingDays(selectedAlchemist, craftQuantity)}일 (성공률: {getSuccessRate(selectedAlchemist)}%)
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px]">
                                            <div className="flex items-center justify-between p-1.5 bg-slate-950/40 rounded-lg border border-slate-800/40 text-slate-300">
                                                <div className="flex items-center gap-1">
                                                    <Coins size={12} className="text-amber-400" />
                                                    <span>공임비: {cost.gold.toLocaleString()}G</span>
                                                </div>
                                                <span className={character.money >= cost.gold ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                                    보유 {character.money.toLocaleString()}G
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between p-1.5 bg-slate-950/40 rounded-lg border border-slate-800/40 text-slate-300">
                                                <div className="flex items-center gap-1">
                                                    <Package size={12} className="text-emerald-400" />
                                                    <span>약초: {cost.recipe.herbs}개</span>
                                                </div>
                                                <span className={(character.base?.resources?.herbs || 0) >= cost.recipe.herbs ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                                    보유 {character.base?.resources?.herbs || 0}개
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between p-1.5 bg-slate-950/40 rounded-lg border border-slate-800/40 text-slate-300">
                                                <div className="flex items-center gap-1">
                                                    <Package size={12} className="text-amber-600" />
                                                    <span>목재: {cost.recipe.wood}개</span>
                                                </div>
                                                <span className={(character.base?.resources?.wood || 0) >= cost.recipe.wood ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                                    보유 {character.base?.resources?.wood || 0}개
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between p-1.5 bg-slate-950/40 rounded-lg border border-slate-800/40 text-slate-300">
                                                <div className="flex items-center gap-1">
                                                    <Zap size={12} className="text-cyan-400" />
                                                    <span>마정석: {cost.recipe.mana}개</span>
                                                </div>
                                                <span className={(character.base?.resources?.manaCrystal || 0) >= cost.recipe.mana ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                                    보유 {character.base?.resources?.manaCrystal || 0}개
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between p-1.5 bg-slate-950/40 rounded-lg border border-slate-800/40 text-slate-300">
                                                <div className="flex items-center gap-1">
                                                    <Sparkles size={12} className="text-purple-400" />
                                                    <span>{cost.recipe.crystalName}: {cost.recipe.crystal}개</span>
                                                </div>
                                                <span className={(character.base?.resources?.[cost.recipe.crystalKey] || 0) >= cost.recipe.crystal ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                                    보유 {character.base?.resources?.[cost.recipe.crystalKey] || 0}개
                                                </span>
                                            </div>
                                            {cost.recipe.garlic > 0 && (
                                                <div className="flex items-center justify-between p-1.5 bg-slate-950/40 rounded-lg border border-slate-800/40 text-slate-300">
                                                    <div className="flex items-center gap-1">
                                                        <Sparkle size={12} className="text-yellow-200" />
                                                        <span>마늘: {cost.recipe.garlic}개</span>
                                                    </div>
                                                    <span className={(character.base?.resources?.garlic || 0) >= cost.recipe.garlic ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                                        보유 {character.base?.resources?.garlic || 0}개
                                                    </span>
                                                </div>
                                            )}
                                            {cost.recipe.shinryokuFlower > 0 && (
                                                <div className="flex items-center justify-between p-1.5 bg-slate-950/40 rounded-lg border border-slate-800/40 text-slate-300">
                                                    <div className="flex items-center gap-1">
                                                        <Sparkle size={12} className="text-pink-400" />
                                                        <span>신력 꽃: {cost.recipe.shinryokuFlower}개</span>
                                                    </div>
                                                    <span className={(character.base?.resources?.shinryoku_flower || 0) >= cost.recipe.shinryokuFlower ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                                        보유 {character.base?.resources?.shinryoku_flower || 0}개
                                                    </span>
                                                </div>
                                            )}
                                            {cost.recipe.worldTreeBranch > 0 && (
                                                <div className="flex items-center justify-between p-1.5 bg-slate-950/40 rounded-lg border border-slate-800/40 text-slate-300">
                                                    <div className="flex items-center gap-1">
                                                        <Sparkle size={12} className="text-emerald-300" />
                                                        <span>세계수의 가지: {cost.recipe.worldTreeBranch}개</span>
                                                    </div>
                                                    <span className={(character.base?.resources?.world_tree_branch || 0) >= cost.recipe.worldTreeBranch ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                                        보유 {character.base?.resources?.world_tree_branch || 0}개
                                                    </span>
                                                </div>
                                            )}
                                            {cost.recipe.silverOre > 0 && (
                                                <div className="flex items-center justify-between p-1.5 bg-slate-950/40 rounded-lg border border-slate-800/40 text-slate-300">
                                                    <div className="flex items-center gap-1">
                                                        <Sparkle size={12} className="text-slate-300" />
                                                        <span>은광석: {cost.recipe.silverOre}개</span>
                                                    </div>
                                                    <span className={(character.base?.resources?.silver_ore || 0) >= cost.recipe.silverOre ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                                        보유 {character.base?.resources?.silver_ore || 0}개
                                                    </span>
                                                </div>
                                            )}
                                            {cost.recipe.goldOre > 0 && (
                                                <div className="flex items-center justify-between p-1.5 bg-slate-950/40 rounded-lg border border-slate-800/40 text-slate-300">
                                                    <div className="flex items-center gap-1">
                                                        <Sparkle size={12} className="text-yellow-400" />
                                                        <span>금광석: {cost.recipe.goldOre}개</span>
                                                    </div>
                                                    <span className={(character.base?.resources?.gold_ore || 0) >= cost.recipe.goldOre ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                                        보유 {character.base?.resources?.gold_ore || 0}개
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    {(() => {
                                        const targetRarity = potionCategory === 'MIX' 
                                            ? (mixType === 'POWER_ELIXIR' ? ItemRarity.UNIQUE : ItemRarity.RARE)
                                            : (potionCategory === 'SCROLL' ? (selectedRarity === ItemRarity.NORMAL ? ItemRarity.MAGIC : selectedRarity) : selectedRarity);

                                        const isScrollRankRestricted = potionCategory === 'SCROLL' && Boolean(
                                            selectedAlchemist && (
                                                (selectedAlchemist.alchemistRank || AlchemistRank.BEGINNER) === AlchemistRank.BEGINNER ||
                                                (selectedAlchemist.alchemistRank || AlchemistRank.BEGINNER) === AlchemistRank.INTERMEDIATE
                                            )
                                        );
                                        const isRarityRestricted = Boolean(
                                            selectedAlchemist && !ALCHEMIST_RANK_CONFIG[selectedAlchemist.alchemistRank || AlchemistRank.BEGINNER].allowedRarities.includes(targetRarity)
                                        );
                                        const isRankLocked = isScrollRankRestricted || isRarityRestricted;

                                        return (
                                            <button
                                                onClick={handleStartCraft}
                                                disabled={!selectedAlchemistId || isRankLocked}
                                                className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                                                    selectedAlchemistId && !isRankLocked
                                                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-950 cursor-pointer' 
                                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                                }`}
                                            >
                                                {isScrollRankRestricted ? (
                                                    <>
                                                        <Lock size={18} />
                                                        <span>고급 연금술사 이상 필요 (현재: {selectedAlchemist ? ALCHEMIST_RANK_CONFIG[selectedAlchemist.alchemistRank || AlchemistRank.BEGINNER].label : '미선택'})</span>
                                                    </>
                                                ) : isRarityRestricted ? (
                                                    <>
                                                        <Lock size={18} />
                                                        <span>연금술사 등급 부족 ({targetRarity} 등급 제작 불가)</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <FlaskConical size={18} />
                                                        <span>조제 의뢰 시작하기</span>
                                                    </>
                                                )}
                                            </button>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Status Tab */
                        <div className="space-y-4">
                            <h3 className="text-xs sm:text-sm font-bold text-slate-300 flex items-center gap-2">
                                <Clock size={16} className="text-purple-400" />
                                진행 중인 연금술 조제 의뢰 목록 ({activeAlchemyMissions.length}건)
                            </h3>

                            <div className="space-y-3">
                                {activeAlchemyMissions.map(m => {
                                    const meta = (m as any).craftMetadata;
                                    const comp = character.inactiveCompanions?.find(c => c.id === m.companionId) ||
                                                 character.companions.find(c => c.id === m.companionId);
                                    
                                    const isDone = m.expectedReturnDate && character.currentDate 
                                        ? m.expectedReturnDate <= character.currentDate 
                                        : false;

                                    return (
                                        <div key={m.id} className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-purple-900/30 rounded-xl border border-purple-500/30 text-purple-400">
                                                    <FlaskConical size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-xs sm:text-sm text-slate-200 flex items-center gap-2">
                                                        <span>{meta?.finalName || '포션 조제 작업'}</span>
                                                        {meta?.quantity && meta.quantity > 1 && (
                                                            <span className="text-[11px] font-bold text-purple-400 bg-purple-950/70 border border-purple-800/80 px-1.5 py-0.5 rounded">
                                                                {meta.quantity}개
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                        <span>연금술사: {comp?.name || '동료'}</span>
                                                        <span>|</span>
                                                        <span>성공률: {m.successRate}%</span>
                                                        <span>|</span>
                                                        <span>완료 예정: {m.expectedReturnDate}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                {isDone ? (
                                                    <button
                                                        onClick={() => handleCompleteCraft(m)}
                                                        disabled={isProcessing}
                                                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950 flex items-center gap-1.5 animate-pulse"
                                                    >
                                                        <CheckCircle size={14} />
                                                        <span>완성품 수령하기</span>
                                                    </button>
                                                ) : (
                                                    <div className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 text-xs font-medium flex items-center gap-1.5">
                                                        <RefreshCw size={12} className="animate-spin text-purple-400" />
                                                        <span>조제 진행 중...</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {activeAlchemyMissions.length === 0 && (
                                    <div className="p-10 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs space-y-2">
                                        <FlaskConical size={32} className="mx-auto text-slate-700" />
                                        <p>진행 중인 포션 조제 의뢰가 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AlchemyCraftModal;
