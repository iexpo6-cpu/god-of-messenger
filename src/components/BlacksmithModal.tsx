
import React, { useState, useEffect } from 'react';
import { Character, Companion, Item, ItemRarity, JobType, DispatchMission, Stats, BlacksmithRank } from '../types';
import { X, Hammer, Users, Clock, CheckCircle, ArrowRight, Shield, Sword, Package, Coins, Zap, Loader2, Sparkles, AlertCircle, AlertTriangle, PlusCircle, Utensils, Leaf, Gem, ArrowUpCircle, TrendingUp} from 'lucide-react';
import { WEAPON_TYPES, ARMOR_TYPES, SUB_WEAPON_TYPES, ACCESSORY_TYPES, RARITY_CONFIG, getCrystalKey } from './WorkshopModal';
import { addDays, getWeaponTypeFromItem, generateLocalItemName, generateLocalOptions, generateLocalBaseStats, extractElementalType, getRandomMythicOption, calculateTotalWorkshopCapacity } from '../utils';
import { SHINRYOKU_TYPES_LIST, MAX_PARTY_SIZE } from '../constants';
import ActionResultModal, { ResultData } from './ActionResultModal';
import { applyBlacksmithMasteryToOptions } from '../services/workshopEnhanceService';

// [ADDED] Props interface for BlacksmithModal
interface Props {
  character: Character;
  onClose: () => void;
  onUpdateCharacter: (newChar: Character, logMsg: string) => void;
  initialBlacksmithId?: string | null;
}

// [EXPORTED] 대장장이 등급 계수 및 설정
export const BS_RANK_CONFIG: Record<BlacksmithRank, { 
    coef: number, 
    label: string, 
    allowedRarities: ItemRarity[],
    nextRank: BlacksmithRank | null,
    reqMastery: number
}> = {
    [BlacksmithRank.BEGINNER]: { 
        coef: 1, 
        label: '초급 대장장이', 
        allowedRarities: [ItemRarity.NORMAL, ItemRarity.MAGIC],
        nextRank: BlacksmithRank.INTERMEDIATE,
        reqMastery: 50
    },
    [BlacksmithRank.INTERMEDIATE]: { 
        coef: 2, 
        label: '중급 대장장이', 
        allowedRarities: [ItemRarity.NORMAL, ItemRarity.MAGIC, ItemRarity.RARE, ItemRarity.EPIC],
        nextRank: BlacksmithRank.ADVANCED,
        reqMastery: 1000
    },
    [BlacksmithRank.ADVANCED]: { 
        coef: 5, 
        label: '상급 대장장이', 
        allowedRarities: [ItemRarity.NORMAL, ItemRarity.MAGIC, ItemRarity.RARE, ItemRarity.EPIC, ItemRarity.UNIQUE],
        nextRank: BlacksmithRank.MASTER,
        reqMastery: 5000
    },
    [BlacksmithRank.MASTER]: { 
        coef: 10, 
        label: '최상급 대장장이', 
        allowedRarities: [ItemRarity.NORMAL, ItemRarity.MAGIC, ItemRarity.RARE, ItemRarity.EPIC, ItemRarity.UNIQUE, ItemRarity.LEGENDARY],
        nextRank: BlacksmithRank.GRANDMASTER,
        reqMastery: 50000
    },
    [BlacksmithRank.GRANDMASTER]: { 
        coef: 20, 
        label: '명공 대장장이', 
        allowedRarities: Object.values(ItemRarity),
        nextRank: null,
        reqMastery: 0
    },
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

const BlacksmithModal: React.FC<Props> = ({ character, onClose, onUpdateCharacter, initialBlacksmithId }) => {
    const [activeTab, setActiveTab] = useState<'new' | 'status'>('new');
    const [selectedBlacksmithId, setSelectedBlacksmithId] = useState<string | null>(initialBlacksmithId || null);
    const [selectedCategory, setSelectedCategory] = useState<'Weapon' | 'SubWeapon' | 'Armor' | 'Accessory'>('Weapon');
    const [selectedMainType, setSelectedMainType] = useState<string>(WEAPON_TYPES[0].label);
    const [selectedSubType, setSelectedSubType] = useState<string>(WEAPON_TYPES[0].subTypes[0]);
    const [selectedRarity, setSelectedRarity] = useState<ItemRarity>(ItemRarity.NORMAL);
    const [customName, setCustomName] = useState('');
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultData, setResultData] = useState<ResultData | null>(null);

    // 제작소 레벨 기반 등급 제한 로직
    const workshopInstances = character.base?.layout?.filter(inst => inst.type === 'workshop') || [];
    const workshopLevel = workshopInstances.reduce((sum, inst) => Math.max(sum, inst.level), 0) || 1; // 등급 제한은 최고 레벨 기준
    const totalWorkshopCapacity = calculateTotalWorkshopCapacity(character.base);
    
    const canCraftRarityByFacility = (r: ItemRarity) => {
        if (r === ItemRarity.NORMAL || r === ItemRarity.MAGIC) return workshopLevel >= 1;
        if (r === ItemRarity.RARE) return workshopLevel >= 2;
        if (r === ItemRarity.EPIC) return workshopLevel >= 3;
        if (r === ItemRarity.UNIQUE) return workshopLevel >= 4;
        if (r === ItemRarity.LEGENDARY) return workshopLevel >= 5;
        if (r === ItemRarity.MYTHTIC) return workshopLevel >= 5;
        return false;
    };

    // Filter available blacksmiths
    const blacksmiths = [...(character.inactiveCompanions || [])].filter(c => 
        c.job === JobType.BLACKSMITH && 
        !c.isDead && 
        !character.base?.dispatched?.some(d => d.companionId === c.id)
    ).map(c => {
        // 데이터 보정: 등급이나 숙련도가 없는 경우 초기값 설정
        if (!c.blacksmithRank) c.blacksmithRank = BlacksmithRank.BEGINNER;
        if (c.blacksmithMastery === undefined) c.blacksmithMastery = 0;
        return c;
    });

    const activeBlacksmithMissions = character.base?.dispatched?.filter(d => d.missionType === 'Blacksmithing') || [];

    useEffect(() => {
        if (initialBlacksmithId) {
            setSelectedBlacksmithId(initialBlacksmithId);
        } else if (!selectedBlacksmithId && blacksmiths.length > 0) {
            setSelectedBlacksmithId(blacksmiths[0].id);
        }
    }, [initialBlacksmithId, blacksmiths.length]);

    const getSubTypes = () => {
        let list = WEAPON_TYPES;
        if (selectedCategory === 'SubWeapon') list = SUB_WEAPON_TYPES;
        if (selectedCategory === 'Armor') list = ARMOR_TYPES;
        if (selectedCategory === 'Accessory') list = ACCESSORY_TYPES;
        return list.find(t => t.label === selectedMainType)?.subTypes || [];
    };

    const getCraftingCost = () => {
        const config = RARITY_CONFIG[selectedRarity];
        const baseIron = selectedCategory === 'Weapon' || selectedCategory === 'SubWeapon' ? 10 : selectedCategory === 'Armor' ? 8 : 5;
        const baseWood = selectedCategory === 'Weapon' || selectedCategory === 'SubWeapon' ? 5 : selectedCategory === 'Armor' ? 2 : 2;
        const baseGold = 1000;
        
        const iron = Math.floor(baseIron * config.multiplier);
        const wood = Math.floor(baseWood * config.multiplier);
        const gold = Math.floor(baseGold * config.multiplier);
        const mana = selectedRarity === ItemRarity.NORMAL ? 0 : Math.floor(config.multiplier); 
        const crystal = config.crystalCost;

        // [NEW] '마력의 정수' 요구 수량 설정 (매직 등급 이상)
        const essenceCount = {
            [ItemRarity.NORMAL]: 0,
            [ItemRarity.MAGIC]: 1,
            [ItemRarity.RARE]: 2,
            [ItemRarity.EPIC]: 4,
            [ItemRarity.UNIQUE]: 8,
            [ItemRarity.LEGENDARY]: 15,
            [ItemRarity.MYTHTIC]: 30
        }[selectedRarity];

        // [NEW] 전설 등급 전용 재료 (수인족의 가죽, 성역의 나뭇가지)
        let beastLeatherCount = 0;
        let sanctuaryBranchCount = 0;

        if (selectedRarity === ItemRarity.LEGENDARY) {
            if (selectedCategory === 'Armor') {
                beastLeatherCount = 10;
            }
            if (selectedCategory === 'Accessory') {
                sanctuaryBranchCount = 5;
            }
        }

        if (selectedRarity === ItemRarity.MYTHTIC) {
            if (selectedCategory === 'Armor') {
                beastLeatherCount = 30;
            }
            if (selectedCategory === 'Accessory') {
                sanctuaryBranchCount = 15;
            }
        }

        // [NEW] 신화 등급 전용 재료
        const primordialCount = selectedRarity === ItemRarity.MYTHTIC ? 1 : 0;
        let worldTreeCount = selectedRarity === ItemRarity.MYTHTIC ? 1 : 0;

        // [NEW] 수확 작물 및 광석 재료 요구량
        let worldTreeBranchCount = 0;
        let shinryokuFlowerCount = 0;
        let goldOreCount = 0;
        let silverOreCount = 0;
        let diamondCount = 0;
        let rubyCount = 0;
        let sapphireCount = 0;
        let emeraldCount = 0;
        let holyStoneCount = 0;

        if (selectedRarity === ItemRarity.RARE) {
            silverOreCount = 5;
        } else if (selectedRarity === ItemRarity.EPIC) {
            goldOreCount = 5;
        } else if (selectedRarity === ItemRarity.UNIQUE) {
            if (selectedCategory === 'Weapon' || selectedCategory === 'SubWeapon') rubyCount = 5;
            else if (selectedCategory === 'Armor') sapphireCount = 5;
            else if (selectedCategory === 'Accessory') emeraldCount = 5;
        } else if (selectedRarity === ItemRarity.LEGENDARY) {
            diamondCount = 5;
        } else if (selectedRarity === ItemRarity.MYTHTIC) {
            holyStoneCount = 5;
        }

        // [NEW] 카테고리별 신성 재료 요구량
        let divineTear = 0;
        let divineCrown = 0;
        let divineWing = 0;

        if (selectedRarity === ItemRarity.MYTHTIC) {
            if (selectedCategory === 'Weapon' || (selectedCategory === 'SubWeapon' && selectedMainType !== '방패')) {
                divineTear = 30;
                worldTreeCount = 5;
            }
            if (selectedCategory === 'Armor' || (selectedCategory === 'SubWeapon' && selectedMainType === '방패')) {
                divineCrown = 10;
            }
            if (selectedCategory === 'Accessory') {
                divineWing = 20;
            }
        }

        return { iron, wood, gold, mana, crystal, essence: essenceCount, primordial: primordialCount, worldTree: worldTreeCount, divineTear, divineCrown, divineWing, beastLeather: beastLeatherCount, sanctuaryBranch: sanctuaryBranchCount, worldTreeBranch: worldTreeBranchCount, shinryokuFlower: shinryokuFlowerCount, goldOre: goldOreCount, silverOre: silverOreCount, diamond: diamondCount, ruby: rubyCount, sapphire: sapphireCount, emerald: emeraldCount, holyStone: holyStoneCount };
    };

    // [MODIFIED] 성공률 계산 공식 변경: 기존성공률 * 0.75 + 등급계수 + 숙련도보너스
    const getSuccessRate = (smith: Companion) => {
        const baseConfig = RARITY_CONFIG[selectedRarity];
        const rank = smith.blacksmithRank || BlacksmithRank.BEGINNER;
        const rankCoef = BS_RANK_CONFIG[rank].coef;
        const mastery = smith.blacksmithMastery || 0;
        
        const rate = (baseConfig.success * 0.75) + rankCoef + (mastery * 0.001);
        return Math.min(100, Math.floor(rate));
    };

    // [MODIFIED] 제작 시간 계산 공식 변경
    // 기준 제작 시간은 유지하되, 대장장이 등급 및 숙련도에 따른 시간 단축 효과를 대폭 강화 (최대 95% 단축)
    const getCraftingDays = (smith: Companion) => {
        const baseTime = RARITY_CONFIG[selectedRarity].time;
        const rank = smith.blacksmithRank || BlacksmithRank.BEGINNER;
        const rankCoef = BS_RANK_CONFIG[rank].coef;
        const mastery = smith.blacksmithMastery || 0;
        
        // 제작소 총 레벨에 따른 시설 보너스 (레벨당 2%, 최대 30%)
        const workshopBonus = Math.min(0.3, totalWorkshopCapacity * 0.02);
        
        // 대장장이 등급별 단축율: 초급(coef 1) 0% ~ 명공(coef 20) 90%
        const rankReduction = ((rankCoef - 1) / (20 - 1)) * 0.90;
        // 추가 숙련도 보너스 (최대 5%)
        const masteryBonus = Math.min(0.05, (mastery / 50000) * 0.05);
        
        const totalReduction = Math.min(0.95, rankReduction + masteryBonus + workshopBonus);
        return Math.max(1, Math.ceil(baseTime * (1 - totalReduction)));
    };
  
  
    const handleStartCraft = () => {
        if (!selectedBlacksmithId) return;
        
        // [NEW] 의뢰 현황 한계치 체크
        if (activeBlacksmithMissions.length >= totalWorkshopCapacity) {
            alert(`의뢰 가능 한계치에 도달했습니다. (현재: ${activeBlacksmithMissions.length} / 최대: ${totalWorkshopCapacity})\n제작소를 더 건설하거나 레벨을 올려 한계치를 늘릴 수 있습니다.`);
            return;
        }

        const smith = blacksmiths.find(s => s.id === selectedBlacksmithId)!;
        // [MODIFIED] 대장장이 등급별 제작 제한 확인
        const smithRankCfg = BS_RANK_CONFIG[smith.blacksmithRank || BlacksmithRank.BEGINNER];
        if (!smithRankCfg.allowedRarities.includes(selectedRarity)) {
            alert(`${smithRankCfg.label}은(는) ${selectedRarity} 등급 장비를 제작할 수 없습니다.`);
            return;
        }

        const cost = getCraftingCost();
        const res = character.base?.resources;
        const crystalKey = getCrystalKey(selectedRarity);

        const missing = [];
        if (character.money < cost.gold) missing.push(`골드 ${(cost.gold - character.money).toLocaleString()}G`);
        if ((res?.iron || 0) < cost.iron) missing.push(`철광석 ${cost.iron - (res?.iron || 0)}개`);
        if ((res?.wood || 0) < cost.wood) missing.push(`목재 ${cost.wood - (res?.wood || 0)}개`);
        if ((res?.manaCrystal || 0) < cost.mana) missing.push(`마정석 ${cost.mana - (res?.manaCrystal || 0)}개`);
        if ((res?.[crystalKey] || 0) < cost.crystal) missing.push(`${selectedRarity === ItemRarity.MYTHTIC ? '전설' : selectedRarity} 결정 ${cost.crystal - (res?.[crystalKey] || 0)}개`);

        // [NEW] 인벤토리 재료 확인
        const essenceOwned = character.inventory.filter(i => i.name === '마력의 정수').length;
        const primordialOwned = character.inventory.filter(i => i.name === '태초의 빛').length;
        const worldTreeOwned = character.inventory.filter(i => i.name === '세계수의 정수').length;
        
        const beastLeatherOwned = character.inventory.filter(i => i.name === '수인족의 가죽').length;
        const sanctuaryBranchOwned = character.inventory.filter(i => i.name === '성역의 나뭇가지').length;

        const divineTearOwned = character.inventory.filter(i => i.name === '신의 눈물 결정').length;
        const divineCrownOwned = character.inventory.filter(i => i.name === '천상의 면류관 조각').length;
        const divineWingOwned = character.inventory.filter(i => i.name === '천사의 날개깃').length;

        if (essenceOwned < cost.essence) missing.push(`마력의 정수 ${cost.essence - essenceOwned}개`);
        if (cost.beastLeather > 0 && beastLeatherOwned < cost.beastLeather) missing.push(`수인족의 가죽 ${cost.beastLeather - beastLeatherOwned}개`);
        if (cost.sanctuaryBranch > 0 && sanctuaryBranchOwned < cost.sanctuaryBranch) missing.push(`성역의 나뭇가지 ${cost.sanctuaryBranch - sanctuaryBranchOwned}개`);

        if (selectedRarity === ItemRarity.MYTHTIC) {
            if (primordialOwned < cost.primordial) missing.push(`태초의 빛 ${cost.primordial - primordialOwned}개`);
            if (worldTreeOwned < cost.worldTree) missing.push(`세계수의 정수 ${cost.worldTree - worldTreeOwned}개`);
            if (cost.divineTear > 0 && divineTearOwned < cost.divineTear) missing.push(`신의 눈물 결정 ${cost.divineTear - divineTearOwned}개`);
            if (cost.divineCrown > 0 && divineCrownOwned < cost.divineCrown) missing.push(`천상의 면류관 조각 ${cost.divineCrown - divineCrownOwned}개`);
            if (cost.divineWing > 0 && divineWingOwned < cost.divineWing) missing.push(`천사의 날개깃 ${cost.divineWing - divineWingOwned}개`);
        }

        // [NEW] 수확 작물 및 광석 확인
        if (((res as any)?.silver_ore || 0) < cost.silverOre) missing.push(`은광석 ${cost.silverOre - ((res as any)?.silver_ore || 0)}개`);
        if (((res as any)?.gold_ore || 0) < cost.goldOre) missing.push(`금광석 ${cost.goldOre - ((res as any)?.gold_ore || 0)}개`);
        if (((res as any)?.diamond || 0) < cost.diamond) missing.push(`다이아몬드 ${cost.diamond - ((res as any)?.diamond || 0)}개`);
        if (((res as any)?.ruby || 0) < cost.ruby) missing.push(`루비 ${cost.ruby - ((res as any)?.ruby || 0)}개`);
        if (((res as any)?.sapphire || 0) < cost.sapphire) missing.push(`사파이어 ${cost.sapphire - ((res as any)?.sapphire || 0)}개`);
        if (((res as any)?.emerald || 0) < cost.emerald) missing.push(`에메랄드 ${cost.emerald - ((res as any)?.emerald || 0)}개`);
        if (((res as any)?.holy_stone || 0) < cost.holyStone) missing.push(`신성석 ${cost.holyStone - ((res as any)?.holy_stone || 0)}개`);
        if (((res as any)?.shinryoku_flower || 0) < cost.shinryokuFlower) missing.push(`신력 꽃 ${cost.shinryokuFlower - ((res as any)?.shinryoku_flower || 0)}개`);
        if (((res as any)?.world_tree_branch || 0) < cost.worldTreeBranch) missing.push(`세계수의 가지 ${cost.worldTreeBranch - ((res as any)?.world_tree_branch || 0)}개`);

        if (missing.length > 0) {
            setResultData({
                type: 'warning',
                title: '재료 부족',
                message: '제작에 필요한 재료나 자금이 부족합니다.',
                items: missing.map(m => ({ label: '부족', after: m }))
            });
            return;
        }

        const successRate = getSuccessRate(smith);
        const days = getCraftingDays(smith);
        const returnDate = addDays(character.currentDate || '2000-01-01', days);

        const newMission: DispatchMission = {
            id: `bs_craft_${Math.random().toString(36).substring(2, 9)}`,
            companionId: smith.id,
            destination: character.currentLocation!,
            startTime: character.currentDate!,
            durationMonths: 0,
            expectedReturnDate: returnDate,
            status: 'Normal',
            dangerCounter: 0,
            successRate: successRate,
            missionType: 'Blacksmithing',
            rewards: { gold: 0, items: [] }
        };

        (newMission as any).craftMetadata = {
            category: selectedCategory,
            mainType: selectedMainType,
            subType: selectedSubType,
            rarity: selectedRarity,
            costGold: cost.gold,
            costIron: cost.iron,
            costWood: cost.wood,
            costMana: cost.mana,
            costCrystal: cost.crystal,
            crystalKey: crystalKey,
            days: days,
            essenceCost: cost.essence,
            beastLeatherCost: cost.beastLeather,
            sanctuaryBranchCost: cost.sanctuaryBranch,
            primordialCost: cost.primordial,
            worldTreeCost: cost.worldTree,
            divineTearCost: cost.divineTear,
            divineCrownCost: cost.divineCrown,
            divineWingCost: cost.divineWing,
            silverOreCost: cost.silverOre,
            goldOreCost: cost.goldOre,
            diamondCost: cost.diamond,
            rubyCost: cost.ruby,
            sapphireCost: cost.sapphire,
            emeraldCost: cost.emerald,
            holyStoneCost: cost.holyStone,
            shinryokuFlowerCost: cost.shinryokuFlower,
            worldTreeBranchCost: cost.worldTreeBranch,
            customName: customName.trim()
        };

        const newChar = { ...character };
        newChar.money -= cost.gold;

        // [NEW] 인벤토리 재료 소모
        let essenceRemoved = 0;
        let beastLeatherRemoved = 0;
        let sanctuaryBranchRemoved = 0;
        let primordialRemoved = 0;
        let worldTreeRemoved = 0;
        let divineTearRemoved = 0;
        let divineCrownRemoved = 0;
        let divineWingRemoved = 0;

        newChar.inventory = character.inventory.filter(item => {
            if (item.name === '마력의 정수' && essenceRemoved < cost.essence) {
                essenceRemoved++;
                return false;
            }
            if (item.name === '수인족의 가죽' && beastLeatherRemoved < cost.beastLeather) {
                beastLeatherRemoved++;
                return false;
            }
            if (item.name === '성역의 나뭇가지' && sanctuaryBranchRemoved < cost.sanctuaryBranch) {
                sanctuaryBranchRemoved++;
                return false;
            }
            if (item.name === '태초의 빛' && primordialRemoved < cost.primordial) {
                primordialRemoved++;
                return false;
            }
            if (item.name === '세계수의 정수' && worldTreeRemoved < cost.worldTree) {
                worldTreeRemoved++;
                return false;
            }
            if (item.name === '신의 눈물 결정' && divineTearRemoved < cost.divineTear) {
                divineTearRemoved++;
                return false;
            }
            if (item.name === '천상의 면류관 조각' && divineCrownRemoved < cost.divineCrown) {
                divineCrownRemoved++;
                return false;
            }
            if (item.name === '천사의 날개깃' && divineWingRemoved < cost.divineWing) {
                divineWingRemoved++;
                return false;
            }
            return true;
        });

        if (newChar.base) {
            newChar.base = {
                ...newChar.base,
                resources: {
                    ...newChar.base.resources,
                    iron: res!.iron - cost.iron,
                    wood: res!.wood - cost.wood,
                    manaCrystal: res!.manaCrystal - cost.mana,
                    [crystalKey]: (res as any)[crystalKey] - cost.crystal,
                    silver_ore: ((res as any)?.silver_ore || 0) - cost.silverOre,
                    gold_ore: ((res as any)?.gold_ore || 0) - cost.goldOre,
                    diamond: ((res as any)?.diamond || 0) - cost.diamond,
                    ruby: ((res as any)?.ruby || 0) - cost.ruby,
                    sapphire: ((res as any)?.sapphire || 0) - cost.sapphire,
                    emerald: ((res as any)?.emerald || 0) - cost.emerald,
                    holy_stone: ((res as any)?.holy_stone || 0) - cost.holyStone,
                    shinryoku_flower: ((res as any)?.shinryoku_flower || 0) - cost.shinryokuFlower,
                    world_tree_branch: ((res as any)?.world_tree_branch || 0) - cost.worldTreeBranch
                },
                dispatched: [...(newChar.base.dispatched || []), newMission]
            };
        }
  onUpdateCharacter(newChar, `[대장장이 의뢰] ${smith.name} (${smithRankCfg.label})가 ${selectedSubType} 제작에 착수했습니다. (소요: ${days}일)`);
        setResultData({
            type: 'success',
            title: '의뢰 수락',
            message: `${smith.name} 대장장이가 작업을 시작했습니다.`,
            items: [
                { label: '목표 아이템', after: customName.trim() || `${selectedRarity} ${selectedSubType}` },
                { label: '성공률', after: `${successRate}%` },
                { label: '소요 시간', after: `${days}일` },
                { label: '완료 예정', after: returnDate }
            ]
        });
        setSelectedBlacksmithId(null);
        setCustomName(''); // [NEW] 필드 초기화
        setActiveTab('status');
    };
      
    const handleCompleteCraft = async (mission: DispatchMission) => {
        const comp = character.inactiveCompanions?.find(c => c.id === mission.companionId);
        if (!comp) return;

        const meta = (mission as any).craftMetadata;
        if (!meta) return;

        setIsProcessing(true);
        const roll = Math.random() * 100;
        const success = roll < (mission.successRate || 50);

        const newChar = { ...character };
        let logMsg = "";
        let result: ResultData;

        // [MODIFIED] 장비 제작 성공 시에만 숙련도 상승 로직 수행
        if (success) {
            let gain = MASTERY_GAIN[meta.rarity as ItemRarity] || 1;
            const isGreatSuccess = Math.random() < 0.1; // 10% 확률로 대성공
            if (isGreatSuccess) gain *= 2;

            const updateSmithInList = (list: Companion[]) => {
                const idx = list.findIndex(c => c.id === comp.id);
                if (idx !== -1) {
                    list[idx] = { 
                        ...list[idx], 
                        blacksmithMastery: (list[idx].blacksmithMastery || 0) + gain 
                    };
                }
            };
            updateSmithInList(newChar.companions);
            if (newChar.inactiveCompanions) updateSmithInList(newChar.inactiveCompanions);

            const optionCount = meta.rarity === ItemRarity.NORMAL ? 1 : 
                              meta.rarity === ItemRarity.MAGIC ? 1 :
                              meta.rarity === ItemRarity.RARE ? 2 :
                              meta.rarity === ItemRarity.EPIC ? 3 :
                              meta.rarity === ItemRarity.UNIQUE ? 3 :
                              meta.rarity === ItemRarity.LEGENDARY? 4 : 5;
            
            // [MODIFIED] 로컬 알고리즘을 사용한 이름 및 옵션 생성
            let finalName = meta.customName || generateLocalItemName(meta.category, meta.subType, meta.rarity as ItemRarity);
            const smithRank = comp.blacksmithRank || BlacksmithRank.BEGINNER;
            const smithCoef = BS_RANK_CONFIG[smithRank].coef;
            const smithMasteryLevel = Math.max(1, Math.floor((comp.blacksmithMastery || 0) / 50 + smithCoef * 5));
            const rawOptions = generateLocalOptions(meta.rarity as ItemRarity, optionCount, meta.category);
            const options = applyBlacksmithMasteryToOptions(rawOptions, meta.rarity as ItemRarity, smithMasteryLevel);

            let finalType: Item['type'] = 'Etc';
            if (meta.category === 'Weapon') finalType = 'Weapon'; 
            if (meta.category === 'SubWeapon') finalType = 'SubWeapon';
            if (meta.category === 'Armor') {
                if (meta.mainType.includes('머리')) finalType = 'Head';
                else if (meta.mainType.includes('상의')) finalType = 'Body';
                else if (meta.mainType.includes('장갑')) finalType = 'Hand';
                else if (meta.mainType.includes('신발')) finalType = 'Feet';
            }
    
            if (meta.category === 'Accessory') finalType = 'Accessory';
 
            // [MODIFIED] 기본 이미지 URL 로직 추가
            let defaultImg = "https://i.ibb.co/6RsrXBZW/image.png";
            if (meta.category === 'Weapon' || meta.category === 'SubWeapon') {
                defaultImg = "https://i.ibb.co/Kz56VGDS/image.png";
            } else if (meta.category === 'Armor' || ['Head', 'Body', 'Hand', 'Feet'].includes(finalType)) {
                defaultImg = "https://i.ibb.co/P9TfV9W1/armor.png";
            }
            
            const elementalType = extractElementalType(options);
            const baseStats = generateLocalBaseStats(meta.category, meta.subType, meta.rarity as ItemRarity, smithCoef);

            const newItem: Item = {
                name: finalName,
                type: finalType,
                rarity: meta.rarity,
                description: `대장장이 ${comp.name}의 역작.`,
                enhancement: 0,
                stats: baseStats as Stats,
                optionLevels: new Array(options.length).fill(1),
                elementalType: elementalType,
                secondaryOptions: options,
                weaponType: (meta.category === 'Weapon' || meta.category === 'SubWeapon') ? getWeaponTypeFromItem({ name: meta.subType, type: 'Weapon' } as Item) : undefined,
                imageUrl: defaultImg,
                mythicOption: meta.rarity === ItemRarity.MYTHTIC ? getRandomMythicOption() : undefined
            };

            newChar.inventory.push(newItem);
            logMsg = `[제작 완료] ${comp.name} 대장장이가 ${newItem.name} 제작에 성공했습니다! (숙련도 +${gain}${isGreatSuccess ? ' [대성공!]' : ''})`;
            result = {
                type: 'success',
                title: isGreatSuccess ? '✨ 제작 대성공! ✨' : '제작 성공',
                message: isGreatSuccess 
                    ? `대성공으로 인해 숙련도가 2배(+${gain}) 상승했습니다!\n${comp.name} 대장장이가 결과물을 완성했습니다.`
                    : `${comp.name} 대장장이가 결과물을 완성했습니다.`,
                items: [
                    { label: '완성 아이템', after: newItem.name },
                    { label: '등급', after: newItem.rarity },
                    { label: '숙련도 상승', after: `+${gain}${isGreatSuccess ? ' (대성공!)' : ''}` }
                ]
            };
        } else {
            // [MODIFIED] 실패 시 숙련도 상승 없음
            logMsg = `[제작 실패] ${comp.name} 대장장이가 제작에 실패했습니다. (숙련도 상승 없음)`;
            result = {
                type: 'failure',
                title: '제작 실패',
                message: `${comp.name} 대장장이가 제작 도중 재료를 소실했습니다.`,
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

    // [NEW] 대장장이 승급 핸들러
    const handlePromoteSmith = (smithId: string) => {
        const smith = blacksmiths.find(s => s.id === smithId);
        if (!smith) return;

        const currentRank = smith.blacksmithRank || BlacksmithRank.BEGINNER;
        const config = BS_RANK_CONFIG[currentRank];
        
        if (!config.nextRank) return;
        if ((smith.blacksmithMastery || 0) < config.reqMastery) {
            alert(`숙련도가 부족합니다. (필요: ${config.reqMastery})`);
            return;
        }

        const newChar = { ...character };
        const updateSmith = (list: Companion[]) => {
            const idx = list.findIndex(c => c.id === smithId);
            if (idx !== -1) {
                list[idx] = { 
                    ...list[idx], 
                    blacksmithRank: config.nextRank!,
                    blacksmithMastery: list[idx].blacksmithMastery // [MODIFIED] 승급 시 숙련도 유지
                };
            }
        };
        updateSmith(newChar.companions);
        if (newChar.inactiveCompanions) updateSmith(newChar.inactiveCompanions);

        const logMsg = `[대장장이 승급] ${smith.name} 대원이 ${config.nextRank} 대장장이로 승급했습니다!`;
        onUpdateCharacter(newChar, logMsg);
        setResultData({
            type: 'levelup',
            title: '대장장이 승급!',
            message: `${smith.name}의 기술이 한 단계 더 높은 경지에 도달했습니다.`,
            items: [
                { label: '등급', before: currentRank, after: config.nextRank },
                { label: '계수(효율)', before: config.coef, after: BS_RANK_CONFIG[config.nextRank].coef }
            ]
        });
    };

     const selectedSmith = selectedBlacksmithId ? blacksmiths.find(s => s.id === selectedBlacksmithId) : null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
            {resultData && <ActionResultModal data={resultData} onClose={() => setResultData(null)} />}
            
            <div className="bg-slate-900 border border-amber-500 w-full max-w-4xl h-[90vh] md:h-[85vh] rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.2)] flex flex-col overflow-hidden relative">
                <div className="p-4 md:p-6 border-b border-amber-900/50 bg-indigo-950/20 flex justify-between items-center shrink-0">
                    <div className="flex items-center">
                        <Hammer size={24} className="text-amber-500 mr-2 md:mr-3 animate-pulse" />
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-white font-cinzel">대장장이 개별 의뢰</h2>
                            <p className="text-[10px] md:text-xs text-slate-500">기지의 숙련된 대장장이들에게 전용 장비 제작을 맡깁니다.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"><X size={24}/></button>
                </div>

                <div className="flex border-b border-slate-800 bg-slate-950 shrink-0">
                    <button onClick={() => setActiveTab('new')} className={`flex-1 py-3 text-xs font-bold flex items-center justify-center transition-all ${activeTab === 'new' ? 'text-amber-400 border-b-2 border-amber-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}><PlusCircle size={16} className="mr-2"/> <span className="hidden md:inline">신규 의뢰</span><span className="md:hidden">신규</span></button>
                    <button onClick={() => setActiveTab('status')} className={`flex-1 py-3 text-xs font-bold flex items-center justify-center transition-all ${activeTab === 'status' ? 'text-amber-400 border-b-2 border-amber-500 bg-slate-900' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                        <Clock size={16} className="mr-2"/> 
                        <span className="hidden md:inline">제작 현황</span><span className="md:hidden">현황</span> 
                        <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${activeBlacksmithMissions.length >= totalWorkshopCapacity ? 'bg-red-900/50 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                            {activeBlacksmithMissions.length} / {totalWorkshopCapacity}
                        </span>
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {activeTab === 'new' ? (
                        <>
                            <div className="w-full md:w-72 h-48 md:h-auto border-b md:border-b-0 md:border-r border-slate-800 p-3 md:p-4 overflow-y-auto custom-scrollbar shrink-0 bg-slate-950/30">
                                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 md:mb-4 flex items-center gap-2"><Users size={14} className="mr-2"/> 가용 대장장이</h3>
                                <div className="space-y-2 md:space-y-3">
                                    {blacksmiths.map(s => {
                                        const rankCfg = BS_RANK_CONFIG[s.blacksmithRank || BlacksmithRank.BEGINNER];
                                        const canPromote = rankCfg.nextRank && (s.blacksmithMastery || 0) >= rankCfg.reqMastery;
                                        
                                        return (
                                            <div key={s.id} className={`p-3 rounded-xl border transition-all flex flex-col gap-2 ${selectedBlacksmithId === s.id ? 'bg-amber-900/30 border-amber-500 shadow-lg' : 'bg-slate-900 border border-slate-800 hover:border-slate-700'}`}>
                                                <button 
                                                    onClick={() => setSelectedBlacksmithId(s.id)}
                                                    className="w-full text-left"
                                                >
                                                    <div className="font-bold text-sm text-slate-200">{s.name}</div>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        <span className="text-[9px] bg-amber-900/50 text-amber-300 px-1.5 py-0.5 rounded border border-amber-700 font-bold">{rankCfg.label}</span>
                                                        {character.base?.layout?.some(inst => 
                                                            inst.type === 'workshop' && (
                                                                character.base?.multiAssignments?.[inst.id]?.includes(s.id) ||
                                                                character.base?.assignments?.[inst.id] === s.id
                                                            )
                                                        ) && (
                                                            <span className="text-[9px] bg-emerald-900/60 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-700 font-bold">제작소 담당</span>
                                                        )}
                                                        <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">숙련도: {s.blacksmithMastery || 0}</span>
                                                    </div>
                                                </button>
                                                {canPromote && (
                                                    <button 
                                                        onClick={() => handlePromoteSmith(s.id)}
                                                        className="w-full py-1.5 bg-green-900/40 hover:bg-green-800/60 text-green-300 border border-green-700/50 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 animate-pulse"
                                                    >
                                                        <ArrowUpCircle size={12}/> 승급 가능 (req: {rankCfg.reqMastery})
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {blacksmiths.length === 0 && <p className="text-xs text-slate-600 text-center py-10 italic">현재 의뢰 가능한 대장장이가 없습니다.</p>}
                                </div>

                                {/* [NEW] 승급 기준표 추가 */}
                                <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-slate-800/50">
                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2 md:mb-3 flex items-center gap-1">
                                        <ArrowUpCircle size={12} className="text-amber-500"/> 
                                        승급 기준표
                                    </h3>
                                    <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
                                        <table className="w-full text-[10px]">
                                            <thead className="bg-slate-950/80 text-slate-500 font-bold uppercase">
                                                <tr>
                                                    <th className="px-2 md:px-3 py-2 text-left">등급</th>
                                                    <th className="px-2 md:px-3 py-2 text-right">필요 숙련도</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/50">
                                                {Object.values(BlacksmithRank).map((rank) => {
                                                    const cfg = BS_RANK_CONFIG[rank];
                                                    const isMax = !cfg.nextRank;
                                                    return (
                                                        <tr key={rank} className={isMax ? "bg-amber-500/5" : ""}>
                                                            <td className={`px-2 md:px-3 py-2 font-medium ${isMax ? "text-amber-500" : "text-slate-300"}`}>
                                                                {cfg.label}
                                                            </td>
                                                            <td className="px-2 md:px-3 py-2 text-right font-mono text-slate-400">
                                                                {isMax ? (
                                                                    <span className="text-amber-500/50 text-[9px]">MAX</span>
                                                                ) : (
                                                                    <span className="text-amber-500">{cfg.reqMastery.toLocaleString()}</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="text-[9px] text-slate-600 mt-2 text-center">
                                        * 숙련도는 장비 제작 성공 시 상승합니다.
                                    </p>
                                </div>
                            </div>
                            <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar bg-slate-900">
                                {selectedSmith ? (
                                    <div className="space-y-6">
                                        <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/30 flex justify-between items-center">
                                            <div>
                                                <h4 className="font-bold text-white text-lg">{selectedSmith.name} <span className="text-sm font-normal text-slate-500">의 공방</span></h4>
                                                <p className="text-xs text-amber-400 font-bold">{BS_RANK_CONFIG[selectedSmith.blacksmithRank!].label} (계수 x{BS_RANK_CONFIG[selectedSmith.blacksmithRank!].coef})</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">Blacksmith Mastery</p>
                                                <p className="text-xl font-mono font-bold text-amber-500">{selectedSmith.blacksmithMastery || 0}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Category</label>
                                                <select value={selectedCategory} onChange={e => {
                                                    const cat = e.target.value as any;
                                                    setSelectedCategory(cat);
                                                    if(cat === 'Weapon') { setSelectedMainType(WEAPON_TYPES[0].label); setSelectedSubType(WEAPON_TYPES[0].subTypes[0]); }
                                                    if(cat === 'SubWeapon') { setSelectedMainType(SUB_WEAPON_TYPES[0].label); setSelectedSubType(SUB_WEAPON_TYPES[0].subTypes[0]); }
                                                    if(cat === 'Armor') { setSelectedMainType(ARMOR_TYPES[0].label); setSelectedSubType(ARMOR_TYPES[0].subTypes[0]); }
                                                    if(cat === 'Accessory') { setSelectedMainType(ACCESSORY_TYPES[0].label); setSelectedSubType(ACCESSORY_TYPES[0].subTypes[0]); }
                                                }} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white">
                                                    <option value="Weapon">Weapon</option>
                                                    <option value="SubWeapon">SubWeapon</option>
                                                    <option value="Armor">Armor</option>
                                                    <option value="Accessory">Accessory</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Rarity</label>
                                                <select value={selectedRarity} onChange={e => setSelectedRarity(e.target.value as ItemRarity)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white">
                                                    {Object.values(ItemRarity).map(r => {
                                                        const isFacilityLocked = !canCraftRarityByFacility(r);
                                                        const isSmithLocked = !BS_RANK_CONFIG[selectedSmith.blacksmithRank!].allowedRarities.includes(r);
                                                        const isLocked = isFacilityLocked || isSmithLocked;
                                                        
                                                        return (
                                                            <option key={r} value={r} disabled={isLocked}>
                                                                {r} {isFacilityLocked ? '(시설 Lv 부족)' : isSmithLocked ? `(${BS_RANK_CONFIG[selectedSmith.blacksmithRank!].label} 불가)` : ''}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                             <div>
                                                <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Item Type</label>
                                                <select value={selectedMainType} onChange={e => { setSelectedMainType(e.target.value); setSelectedSubType((selectedCategory === 'Weapon' ? WEAPON_TYPES : selectedCategory === 'SubWeapon' ? SUB_WEAPON_TYPES : selectedCategory === 'Armor' ? ARMOR_TYPES : ACCESSORY_TYPES).find(t => t.label === e.target.value)?.subTypes[0] || ''); }} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white">
                                                    {(selectedCategory === 'Weapon' ? WEAPON_TYPES : selectedCategory === 'SubWeapon' ? SUB_WEAPON_TYPES : selectedCategory === 'Armor' ? ARMOR_TYPES : ACCESSORY_TYPES).map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">SubType</label>
                                                <select value={selectedSubType} onChange={e => setSelectedSubType(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white">
                                                    {getSubTypes().map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        {/* [NEW] 장비 이름 입력 필드 */}
                                        <div className="mb-2">
                                            <label className="text-xs text-slate-500 font-bold uppercase block mb-1">장비 이름 (선택 사항)</label>
                                            <input 
                                                type="text" 
                                                className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-sm text-slate-200 focus:border-amber-500 outline-none transition-all shadow-inner"
                                                placeholder={`비워둘 경우 AI가 이름을 추천합니다 (예: ${selectedRarity} ${selectedSubType})`}
                                                value={customName}
                                                onChange={(e) => setCustomName(e.target.value)}
                                            />
                                        </div>

                                        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-slate-500 font-bold uppercase flex items-center gap-2"><TrendingUp size={14} className="text-green-400"/> Success Rate</span>
                                                <span className="text-lg font-mono font-bold text-green-400">{getSuccessRate(selectedSmith)}%</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-slate-800 pt-3">
                                                <span className="text-xs text-slate-500 font-bold uppercase flex items-center gap-2"><Clock size={14} className="text-blue-400"/> Estimated Time</span>
                                                <span className="text-lg font-mono font-bold text-blue-400">{getCraftingDays(selectedSmith)} Days</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-slate-800 pt-3">
                                                <span className="text-xs text-slate-500 font-bold uppercase flex items-center gap-2"><Sparkles size={14} className="text-amber-400"/> Exp Gain</span>
                                                <span className="text-sm font-mono font-bold text-amber-400">+{MASTERY_GAIN[selectedRarity] || 1} Pts</span>
                                            </div>
                                        </div>

                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                            <h4 className="text-[10px] text-slate-500 font-bold uppercase mb-3 px-1">Required Resources</h4>
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                                {(() => {
                                                    const cost = getCraftingCost();
                                                    const res = character.base?.resources;
                                                    const crystalKey = getCrystalKey(selectedRarity);
                                                    return (
                                                        <>
                                                            <div className="flex justify-between items-center text-xs"><span className="text-blue-400 flex items-center gap-1"><Package size={12}/> 철광석</span><span className={(res?.iron || 0) >= cost.iron ? 'text-white' : 'text-red-500'}>{cost.iron}</span></div>
                                                            <div className="flex justify-between items-center text-xs"><span className="text-green-400 flex items-center gap-1"><Leaf size={12}/> 목재</span><span className={(res?.wood || 0) >= cost.wood ? 'text-white' : 'text-red-500'}>{cost.wood}</span></div>
                                                            {cost.mana > 0 && <div className="flex justify-between items-center text-xs"><span className="text-purple-400 flex items-center gap-1"><Zap size={12}/> 마정석</span><span className={(res?.manaCrystal || 0) >= cost.mana ? 'text-white' : 'text-red-500'}>{cost.mana}</span></div>}
                                                            <div className="flex justify-between items-center text-xs"><span className="text-pink-400 flex items-center gap-1"><Gem size={12}/> {selectedRarity === ItemRarity.MYTHTIC ? '전설' : selectedRarity} 결정</span><span className={(res?.[crystalKey] || 0) >= cost.crystal ? 'text-white' : 'text-red-500'}>{cost.crystal}</span></div>
                                                            
                                                            {cost.silverOre > 0 && <div className="flex justify-between items-center text-xs"><span className="text-slate-300">은광석</span><span className={((res as any)?.silver_ore || 0) >= cost.silverOre ? 'text-white' : 'text-red-500'}>{cost.silverOre}</span></div>}
                                                            {cost.goldOre > 0 && <div className="flex justify-between items-center text-xs"><span className="text-yellow-500">금광석</span><span className={((res as any)?.gold_ore || 0) >= cost.goldOre ? 'text-white' : 'text-red-500'}>{cost.goldOre}</span></div>}
                                                            {cost.ruby > 0 && <div className="flex justify-between items-center text-xs"><span className="text-red-500">루비</span><span className={((res as any)?.ruby || 0) >= cost.ruby ? 'text-white' : 'text-red-500'}>{cost.ruby}</span></div>}
                                                            {cost.sapphire > 0 && <div className="flex justify-between items-center text-xs"><span className="text-blue-500">사파이어</span><span className={((res as any)?.sapphire || 0) >= cost.sapphire ? 'text-white' : 'text-red-500'}>{cost.sapphire}</span></div>}
                                                            {cost.emerald > 0 && <div className="flex justify-between items-center text-xs"><span className="text-green-500">에메랄드</span><span className={((res as any)?.emerald || 0) >= cost.emerald ? 'text-white' : 'text-red-500'}>{cost.emerald}</span></div>}
                                                            {cost.diamond > 0 && <div className="flex justify-between items-center text-xs"><span className="text-cyan-300">다이아몬드</span><span className={((res as any)?.diamond || 0) >= cost.diamond ? 'text-white' : 'text-red-500'}>{cost.diamond}</span></div>}
                                                            {cost.holyStone > 0 && <div className="flex justify-between items-center text-xs"><span className="text-yellow-200">신성석</span><span className={((res as any)?.holy_stone || 0) >= cost.holyStone ? 'text-white' : 'text-red-500'}>{cost.holyStone}</span></div>}

                                                            {cost.essence > 0 && (
                                                                <div className="flex justify-between items-center text-xs"><span className="text-purple-300 flex items-center gap-1">마력의 정수</span><span className={character.inventory.filter(i => i.name === '마력의 정수').length >= cost.essence ? 'text-white' : 'text-red-500'}>{cost.essence}</span></div>
                                                            )}
                                                            {cost.beastLeather > 0 && (
                                                                <div className="flex justify-between items-center text-xs"><span className="text-orange-300 flex items-center gap-1">수인족의 가죽</span><span className={character.inventory.filter(i => i.name === '수인족의 가죽').length >= cost.beastLeather ? 'text-white' : 'text-red-500'}>{cost.beastLeather}</span></div>
                                                            )}
                                                            {cost.sanctuaryBranch > 0 && (
                                                                <div className="flex justify-between items-center text-xs"><span className="text-emerald-300 flex items-center gap-1">성역의 나뭇가지</span><span className={character.inventory.filter(i => i.name === '성역의 나뭇가지').length >= cost.sanctuaryBranch ? 'text-white' : 'text-red-500'}>{cost.sanctuaryBranch}</span></div>
                                                            )}
                                                            {selectedRarity === ItemRarity.MYTHTIC && (
                                                                <>
                                                                    <div className="flex justify-between items-center bg-slate-900 p-2 rounded col-span-1">
                                                                        <span className="text-amber-400">태초의 빛</span>
                                                                        <span className={character.inventory.filter(i => i.name === '태초의 빛').length >= cost.primordial ? 'text-white' : 'text-red-500'}>{cost.primordial}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center bg-slate-900 p-2 rounded col-span-1">
                                                                        <span className="text-emerald-400">세계수의 정수</span>
                                                                        <span className={character.inventory.filter(i => i.name === '세계수의 정수').length >= cost.worldTree ? 'text-white' : 'text-red-500'}>{cost.worldTree}</span>
                                                                    </div>
                                                                    {/* [NEW] 신성 재료 요구량 표시 */}
                                                                    {cost.divineTear > 0 && (
                                                                        <div className="flex justify-between items-center bg-slate-900 p-2 rounded col-span-1">
                                                                            <span className="text-blue-300">신의 눈물 결정</span>
                                                                            <span className={character.inventory.filter(i => i.name === '신의 눈물 결정').length >= cost.divineTear ? 'text-white' : 'text-red-500'}>{cost.divineTear}</span>
                                                                        </div>
                                                                    )}
                                                                    {cost.divineCrown > 0 && (
                                                                        <div className="flex justify-between items-center bg-slate-900 p-2 rounded col-span-1">
                                                                            <span className="text-amber-500">천상의 면류관 조각</span>
                                                                            <span className={character.inventory.filter(i => i.name === '천상의 면류관 조각').length >= cost.divineCrown ? 'text-white' : 'text-red-500'}>{cost.divineCrown}</span>
                                                                        </div>
                                                                    )}
                                                                    {cost.divineWing > 0 && (
                                                                        <div className="flex justify-between items-center bg-slate-900 p-2 rounded col-span-1">
                                                                            <span className="text-green-300">천사의 날개깃</span>
                                                                            <span className={character.inventory.filter(i => i.name === '천사의 날개깃').length >= cost.divineWing ? 'text-white' : 'text-red-500'}>{cost.divineWing}</span>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}

                                                            {/* [NEW] 수확 작물 및 광석 UI */}
                                                            {cost.silverOre > 0 && (
                                                                <div className="flex justify-between items-center text-xs"><span className="text-slate-300 flex items-center gap-1">은광석</span><span className={((res as any)?.silver_ore || 0) >= cost.silverOre ? 'text-white' : 'text-red-500'}>{cost.silverOre}</span></div>
                                                            )}
                                                            {cost.goldOre > 0 && (
                                                                <div className="flex justify-between items-center text-xs"><span className="text-yellow-500 flex items-center gap-1">금광석</span><span className={((res as any)?.gold_ore || 0) >= cost.goldOre ? 'text-white' : 'text-red-500'}>{cost.goldOre}</span></div>
                                                            )}
                                                            {cost.diamond > 0 && (
                                                                <div className="flex justify-between items-center text-xs"><span className="text-cyan-300 flex items-center gap-1">다이아몬드</span><span className={((res as any)?.diamond || 0) >= cost.diamond ? 'text-white' : 'text-red-500'}>{cost.diamond}</span></div>
                                                            )}
                                                            {cost.shinryokuFlower > 0 && (
                                                                <div className="flex justify-between items-center text-xs"><span className="text-pink-400 flex items-center gap-1">신력 꽃</span><span className={((res as any)?.shinryoku_flower || 0) >= cost.shinryokuFlower ? 'text-white' : 'text-red-500'}>{cost.shinryokuFlower}</span></div>
                                                            )}
                                                            {cost.worldTreeBranch > 0 && (
                                                                <div className="flex justify-between items-center text-xs"><span className="text-emerald-400 flex items-center gap-1">세계수의 가지</span><span className={((res as any)?.world_tree_branch || 0) >= cost.worldTreeBranch ? 'text-white' : 'text-red-500'}>{cost.worldTreeBranch}</span></div>
                                                            )}

                                                            <div className="flex justify-between items-center text-xs col-span-2 border-t border-slate-800 pt-2"><span className="text-amber-400 flex items-center gap-1"><Coins size={12}/> 의뢰 비용</span><span className={character.money >= cost.gold ? 'text-amber-400' : 'text-red-500'}>{cost.gold.toLocaleString()} G</span></div>
                                                        </>
                                                    )
                                                })()}
                                            </div>
                                        </div>

                                        <button onClick={handleStartCraft} className="w-full py-5 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3">
                                            <Hammer size={20}/>
                                            의뢰 개시 (Commission)
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50"><Hammer size={48} className="mb-4"/><p className="text-sm font-bold">작업을 수행할 대장장이를 선택하십시오.</p></div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar bg-slate-900/50">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 md:mb-6 flex items-center"><Clock size={14} className="mr-2"/> 진행 중인 개별 의뢰 목록</h3>
                            {activeBlacksmithMissions.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                    {activeBlacksmithMissions.map(m => {
                                        const comp = [...character.companions, ...(character.inactiveCompanions || [])].find(c => c.id === m.companionId);
                                        const isDone = character.currentDate! >= m.expectedReturnDate;
                                        const meta = (m as any).craftMetadata;
                                        return (
                                            <div key={m.id} className={`p-5 rounded-2xl border-2 transition-all ${isDone ? 'border-amber-500 bg-amber-950/20 shadow-lg' : 'border-slate-800 bg-slate-950'}`}>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="font-bold text-slate-200 text-lg">{comp?.name || 'Unknown'}</div>
                                                        <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest bg-amber-950/30 px-2 py-0.5 rounded border border-amber-900/50 w-fit">{meta?.rarity} {meta?.subType} 제작</div>
                                                    </div>
                                                    {isDone ? (
                                                        <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded font-bold animate-pulse flex items-center gap-1"><CheckCircle size={10}/> 완료</span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-600 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{m.expectedReturnDate} 복귀</span>
                                                    )}
                                                </div>
                                                <div className="space-y-1 mb-4">
                                                    <div className="flex justify-between text-[9px] text-slate-500"><span>Progress</span><span>{isDone ? '100%' : 'In Progress'}</span></div>
                                                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                                                        <div className={`h-full transition-all duration-1000 ${isDone ? 'bg-amber-500' : 'bg-blue-500 w-1/2 animate-pulse'}`} style={{ width: isDone ? '100%' : '50%' }}></div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleCompleteCraft(m)} 
                                                    disabled={!isDone || isProcessing} 
                                                    className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${isDone ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'}`}
                                                >
                                                    {isProcessing ? <Loader2 size={18} className="animate-spin"/> : <><Package size={18}/> {isDone ? '제작물 수령' : '작업 진행 중'}</>}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-20 text-slate-600 border border-dashed border-slate-800 rounded-3xl opacity-50"><AlertCircle size={64} className="mx-auto mb-4"/><p className="text-sm">현재 진행 중인 개인 제작 의뢰가 없습니다.</p></div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BlacksmithModal;
