
import React, { useState, useEffect } from 'react';
import { Character, Item, ItemRarity, WeaponType, Stats, BaseResources, JobType, BlacksmithRank } from '../types';
import { X, Hammer, Zap, Shield, Sword, Anchor, Target, Sparkles, AlertCircle, AlertTriangle, RefreshCw, Star, Loader2, ArrowUp, ArrowRight, Dices, Layers, ChevronsUp, DollarSign, Package, CheckCircle, Gem, Recycle, ArrowDown, Lock, Trash2, Users, ArrowUpCircle } from 'lucide-react';
import { calculateItemPrice, addDays, getWeaponTypeFromItem, getEnhancedStatValue, generateLocalItemName, generateLocalOptions, generateLocalBaseStats, extractElementalType, getRandomMythicOption, calculateTotalWorkshopCapacity, gainProfessionExp, calculateItemCPDelta, calculateItemCombatPowerContribution } from '../utils';
import { ENHANCEMENT_CAPS, ENHANCEMENT_CONFIG, SHINRYOKU_TYPES_LIST } from '../constants';
import ActionResultModal, { ResultData } from './ActionResultModal';
import BlacksmithModal, { BS_RANK_CONFIG } from './BlacksmithModal';
import BulkDismantleModal from './BulkDismantleModal';
import { EquipmentEvolutionModal } from './EquipmentEvolutionModal';
import { RerollOptionPoolModal } from './RerollOptionPoolModal';
import { ItemTooltip } from './CharacterSheet';
import { executeBatchItemEnhanceUntilSuccess, executeBatchOptionEnhanceUntilSuccess, getItemEnhanceCost, getOptionRarityMultiplier, getOptionRerollCost, getOptionEnhanceCost, applyBlacksmithMasteryToOptions } from '../services/workshopEnhanceService';

interface Props {
  character: Character;
  instanceId?: string;
  onClose: () => void;
  onUpdateCharacter: (newChar: Character, logMsg: string) => void;
  onFacilityUpgrade?: (facilityId: string, instanceId?: string) => void;
}

export const WEAPON_TYPES = [
    { label: '검', subTypes: ['대검', '단검', '쌍검', '소검', '도', '레이피어', '카타나'] },
    { label: '창', subTypes: ['장창', '폴암', '언월도', '랜스'] },
    { label: '둔기', subTypes: ['철퇴', '해머', '메이스', '몽둥이'] },
    { label: '도끼', subTypes: ['쌍도끼', '토마호크', '할버드'] },
    { label: '너클', subTypes: ['너클', '클로', '권투글러브', '건틀릿'] },
    { label: '활/석궁', subTypes: ['롱보우', '숏보우', '석궁'] },
    { label: '투척무기', subTypes: ['표창', '수리검', '투창', '다트', '부메랑'] },
    { label: '총기/중화기', subTypes: ['권총', '소총', '샷건', '기관총', '대포', '로켓런처', '핸드캐넌'] },
    { label: '마법무기', subTypes: ['지팡이', '완드', '마법서', '마법책'] },
    { label: '에너지무기', subTypes: ['레일건', '플라즈마', '광선검'] },
];

export const SUB_WEAPON_TYPES = [
    { label: '방패', subTypes: ['방패'] },
    { label: '보주', subTypes: ['보주', '오브', '수정구', '부적', '토템'] },
    { label: '보조검', subTypes: ['보조검', '단도'] },
];

export const ARMOR_TYPES = [
    { label: '머리', subTypes: ['헬멧', '모자', '투구', '서클릿'] },
    { label: '상의/하의', subTypes: ['갑옷', '로브', '가죽옷', '천옷', '옷'] },
    { label: '장갑', subTypes: ['장갑', '건틀릿'] },
    { label: '신발', subTypes: ['부츠', '신발'] },
];

export const ACCESSORY_TYPES = [
    { label: '장신구', subTypes: ['반지', '목걸이', '허리띠', '귀걸이'] },
];

// Helper to map rarity to resource key
export const getCrystalKey = (rarity: ItemRarity): keyof BaseResources => {
    switch (rarity) {
        case ItemRarity.NORMAL: return 'normalCrystal';
        case ItemRarity.MAGIC: return 'magicCrystal';
        case ItemRarity.RARE: return 'rareCrystal';
        case ItemRarity.EPIC: return 'epicCrystal';
        case ItemRarity.UNIQUE: return 'uniqueCrystal';
        case ItemRarity.LEGENDARY: return 'legendaryCrystal';
        case ItemRarity.MYTHTIC: return 'legendaryCrystal';
        default: return 'normalCrystal';
    }
};

import { getItemImage as getRpgItemImage } from '../services/rpgIconService';

export const getItemImage = (item: Item) => getRpgItemImage(item);

export const RARITY_CONFIG: Record<ItemRarity, { success: number, time: number, multiplier: number, color: string, crystalCost: number }> = {
    [ItemRarity.NORMAL]: { success: 100, time: 1, multiplier: Math.floor(Math.random() * 1) + 1, color: 'text-slate-400', crystalCost: 15 },
    [ItemRarity.MAGIC]: { success: 95, time: 3, multiplier: Math.floor(Math.random() * 3) + 2, color: 'text-blue-400', crystalCost: 10 },
    [ItemRarity.RARE]: { success: 85, time: 6, multiplier: Math.floor(Math.random() * 8) + 5, color: 'text-yellow-400', crystalCost: 10 },
    [ItemRarity.EPIC]: { success: 65, time: 12,  multiplier: Math.floor(Math.random() * 10) + 10, color: 'text-purple-400', crystalCost: 5 },
    [ItemRarity.UNIQUE]: { success: 40, time: 24, multiplier: Math.floor(Math.random() * 20) + 20, color: 'text-pink-400', crystalCost: 5 },
    [ItemRarity.LEGENDARY]: { success: 20, time: 48, multiplier: Math.floor(Math.random() * 50) + 50, color: 'text-amber-500', crystalCost: 5 },
    [ItemRarity.MYTHTIC]: {success: 10, time: 120, multiplier: Math.floor(Math.random() * 100) + 100, color: 'text-red-700', crystalCost: 150 }
};

// Helper interface for grouped items
interface GroupedItem {
    item: Item;
    indices: number[];
}

const PROMOTION_RULES: Partial<Record<ItemRarity, { next: ItemRarity, cost: number, resKey: keyof BaseResources, resName: string }>> = {
    [ItemRarity.NORMAL]: { next: ItemRarity.MAGIC, cost: 25, resKey: 'magicCrystal', resName: '마법 결정' },
    [ItemRarity.MAGIC]: { next: ItemRarity.RARE, cost: 25, resKey: 'rareCrystal', resName: '레어 결정' },
    [ItemRarity.RARE]: { next: ItemRarity.EPIC, cost: 10, resKey: 'epicCrystal', resName: '에픽 결정' },
    [ItemRarity.EPIC]: { next: ItemRarity.UNIQUE, cost: 5, resKey: 'uniqueCrystal', resName: '유니크 결정' },
    [ItemRarity.UNIQUE]: { next: ItemRarity.LEGENDARY, cost: 5, resKey: 'legendaryCrystal', resName: '전설 결정' }
};

const WorkshopModal: React.FC<Props> = ({ character, instanceId, onClose, onUpdateCharacter, onFacilityUpgrade }) => {
  const [activeTab, setActiveTab] = useState<'craft' | 'refine' | 'dismantle'>('craft');
  const [refineSubTab, setRefineSubTab] = useState<'item_enhance' | 'reroll' | 'enhance' | 'promote'>('item_enhance');
  
  // Crafting State
  const [selectedCategory, setSelectedCategory] = useState<'Weapon' | 'SubWeapon' | 'Armor' | 'Accessory'>('Weapon');
  const [selectedMainType, setSelectedMainType] = useState<string>(WEAPON_TYPES[0].label);
  const [selectedSubType, setSelectedSubType] = useState<string>(WEAPON_TYPES[0].subTypes[0]);
  const [selectedRarity, setSelectedRarity] = useState<ItemRarity>(ItemRarity.NORMAL);
  const [customName, setCustomName] = useState('');
  const [isCrafting, setIsCrafting] = useState(false);

  // Refinement State
  const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
  const [refineSort, setRefineSort] = useState<'rarity_desc' | 'rarity_asc' | 'name_asc' | 'enhancement_desc' | 'cp_desc'>('rarity_desc');
  const [lockedOptionIndices, setLockedOptionIndices] = useState<number[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceFx, setEnhanceFx] = useState<'none' | 'success' | 'failure'>('none');
  const [isRefining, setIsRefining] = useState(false);
  const [refineFx, setRefineFx] = useState<'none' | 'success' | 'failure'>('none');
  
  // Dismantle State
  const [selectedDismantleGroup, setSelectedDismantleGroup] = useState<GroupedItem | null>(null);
  const [dismantleAmount, setDismantleAmount] = useState<number>(1);
  const [dismantleCategory, setDismantleCategory] = useState<'equipment' | 'etc'>('equipment');
  const [dismantleSort, setDismantleSort] = useState<'rarity_desc' | 'rarity_asc' | 'name_asc' | 'count_desc' | 'count_asc'>('rarity_desc');
  const [isBulkDismantleOpen, setIsBulkDismantleOpen] = useState<boolean>(false);
  const [equipmentEvolutionData, setEquipmentEvolutionData] = useState<{ prevItem: Item; nextItem: Item; } | null>(null);

  // [NEW] Blacksmith Modal State
  const [isBlacksmithModalOpen, setIsBlacksmithModalOpen] = useState(false);
  const [selectedSmithForModal, setSelectedSmithForModal] = useState<string | null>(null);
  const [showRerollPoolModal, setShowRerollPoolModal] = useState(false);

  // Result Overlay State
  const [resultOverlay, setResultOverlay] = useState<{
      show: boolean;
      data: ResultData | null;
  }>({ show: false, data: null });

  const craftingLevel = character.professions?.crafting?.level || 1;
  const craftingExp = character.professions?.crafting?.exp || 0;
  const craftingMaxExp = character.professions?.crafting?.maxExp || 100;
  
  // [NEW] 대장장이 등급 계산 (BlacksmithModal과 동일한 로직)
  const getCraftingRank = (level: number): string => {
      if (level >= 100) return '명공 대장장이';
      if (level >= 80) return '최상급 대장장이';
      if (level >= 50) return '상급 대장장이';
      if (level >= 20) return '중급 대장장이';
      return '초급 대장장이';
  };
  const craftingRankLabel = getCraftingRank(craftingLevel);

  // Workshop Level & Multi-Assignee Blacksmiths
  const currentInstance = character.base?.layout?.find(inst => inst.id === instanceId);
  const workshopLevel = currentInstance ? currentInstance.level : (character.base?.layout?.filter(inst => inst.type === 'workshop').reduce((max, inst) => Math.max(max, inst.level), 0) || 1);
  const totalWorkshopLevel = calculateTotalWorkshopCapacity(character.base);
  
  const assignedIds = currentInstance 
    ? (character.base?.multiAssignments?.[currentInstance.id] || (character.base?.assignments?.[currentInstance.id] ? [character.base.assignments[currentInstance.id]] : [])) 
    : (character.base?.assignments?.['workshop'] ? [character.base.assignments['workshop']] : []);
  const assignedBlacksmiths = (character.inactiveCompanions || []).filter(c => assignedIds.includes(c.id) && c.job === JobType.BLACKSMITH);
  const assignee = assignedBlacksmiths[0];

  // [MODIFIED] 대장장이 숙련도에 따른 제작 시간 단축 효과 대폭 강화
  // 기준 제작 시간(초급 1레벨 시 기본 일수)은 유지하되, 숙련도와 등급이 상승할수록 단축 효과를 극대화 (최대 95%~98% 단축)
  const bestCompanionSmith = assignedBlacksmiths.reduce<any>((best, smith) => {
      if (!best) return smith;
      const bestRankVal = BS_RANK_CONFIG[best.blacksmithRank || BlacksmithRank.BEGINNER]?.coef || 1;
      const smithRankVal = BS_RANK_CONFIG[smith.blacksmithRank || BlacksmithRank.BEGINNER]?.coef || 1;
      if (smithRankVal !== bestRankVal) return smithRankVal > bestRankVal ? smith : best;
      return (smith.blacksmithMastery || 0) > (best.blacksmithMastery || 0) ? smith : best;
  }, assignee || null);

  const companionEffectiveLevel = bestCompanionSmith ? (() => {
      const rank = bestCompanionSmith.blacksmithRank || BlacksmithRank.BEGINNER;
      const mastery = bestCompanionSmith.blacksmithMastery || 0;
      if (rank === BlacksmithRank.GRANDMASTER) {
          return 100 + Math.min(50, Math.floor(mastery / 1000));
      } else if (rank === BlacksmithRank.MASTER) {
          return 80 + Math.min(19, Math.floor((mastery / 50000) * 19));
      } else if (rank === BlacksmithRank.ADVANCED) {
          return 50 + Math.min(29, Math.floor((mastery / 5000) * 29));
      } else if (rank === BlacksmithRank.INTERMEDIATE) {
          return 20 + Math.min(29, Math.floor((mastery / 1000) * 29));
      } else {
          return 1 + Math.min(18, Math.floor((mastery / 50) * 18));
      }
  })() : 1;

  // 플레이어 제작 레벨과 배치된 최고 대장장이 레벨 중 더 높은 수치를 숙련도 기준으로 활용
  const effectiveSmithLevel = Math.max(craftingLevel, companionEffectiveLevel);

  const masterySuccessBonus = (effectiveSmithLevel - 1) * 1.5; // 1.5% bonus per level
  
  // 기본 기준(초급 1레벨)은 0% 단축으로 기존 제작 시간 유지, 숙련도가 증가할수록 최대 95%~98%까지 가속
  const masteryTimeReduction = (() => {
      if (effectiveSmithLevel <= 1) return 0;
      const progress = Math.min(1, (effectiveSmithLevel - 1) / 99);
      let reduction = Math.pow(progress, 0.82) * 0.95;
      if (effectiveSmithLevel > 100) {
          reduction += Math.min(0.03, (effectiveSmithLevel - 100) * 0.0006);
      }
      return Math.min(0.98, Math.max(0, reduction));
  })();

  const currentCraftingTime = Math.max(1, Math.ceil(RARITY_CONFIG[selectedRarity].time * (1 - masteryTimeReduction)));
  
  const totalSmithCtrl = assignedBlacksmiths.reduce((sum, c) => sum + (c.stats.ctrl || 0), 0);
  const smithBonusPercent = assignedBlacksmiths.length * 5;
  const workshopRateBonus = totalWorkshopLevel * 0.5; // [NEW] 제작소 총 레벨당 0.5% 보너스
  const bonusRate = (totalSmithCtrl * 0.01) + smithBonusPercent + workshopRateBonus;

  const getBaseOptionCount = (rarity: ItemRarity) => {
    switch (rarity) {
      case ItemRarity.NORMAL: return 1;
      case ItemRarity.MAGIC: return 1;
      case ItemRarity.RARE: return 2;
      case ItemRarity.EPIC: return 3;
      case ItemRarity.UNIQUE: return 3;
      case ItemRarity.LEGENDARY: return 4;
      case ItemRarity.MYTHTIC: return 5;
      default: return 0;
    }
  };

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

      // [NEW] 카테고리별 신성 재료 요구량 (신의 눈물 결정, 천상의 면류관 조각, 천사의 날개깃)
      let divineTear = 0;
      let divineCrown = 0;
      let divineWing = 0;

      if (selectedRarity === ItemRarity.MYTHTIC) {
          // 무기 또는 공격성 보조무기 (보주, 보조검)
          if (selectedCategory === 'Weapon' || (selectedCategory === 'SubWeapon' && selectedMainType !== '방패')) {
              divineTear = 30;
              worldTreeCount = 5;
          }
          // 방어구 또는 방어성 보조무기 (방패)
          if (selectedCategory === 'Armor' || (selectedCategory === 'SubWeapon' && selectedMainType === '방패')) {
              divineCrown = 10;
          }
          // 악세사리
          if (selectedCategory === 'Accessory') {
              divineWing = 20;
          }
      }

      return { iron, wood, gold, mana, crystal, essence: essenceCount, primordial: primordialCount, worldTree: worldTreeCount, divineTear, divineCrown, divineWing, beastLeather: beastLeatherCount, sanctuaryBranch: sanctuaryBranchCount, worldTreeBranch: worldTreeBranchCount, shinryokuFlower: shinryokuFlowerCount, goldOre: goldOreCount, silverOre: silverOreCount, diamond: diamondCount, ruby: rubyCount, sapphire: sapphireCount, emerald: emeraldCount, holyStone: holyStoneCount };
  };


  const getItemEnhanceRate = (item: Item) => {
      const currentEnh = item.enhancement || 0;
      let baseRate = ENHANCEMENT_CONFIG.baseSuccess(currentEnh + 1);
      const penalty = (currentEnh + 1) * 2;
      const rarityMod = ENHANCEMENT_CONFIG.rarityMod[item.rarity] || 0;
      const pityBonus = (item.failureCount || 0) * 2;
      
      let finalSuccessRate = baseRate - penalty + rarityMod + pityBonus + bonusRate;
      if ((item.failureCount || 0) >= 5) finalSuccessRate = 100;
      return Math.max(1, Math.min(100, finalSuccessRate));
  };

  const getCrystalIcon = (rarity: ItemRarity) => {
      const colors = {
          [ItemRarity.NORMAL]: 'text-slate-400',
          [ItemRarity.MAGIC]: 'text-blue-400',
          [ItemRarity.RARE]: 'text-yellow-400',
          [ItemRarity.EPIC]: 'text-purple-400',
          [ItemRarity.UNIQUE]: 'text-pink-400',
          [ItemRarity.LEGENDARY]: 'text-amber-500',
          [ItemRarity.MYTHTIC]: 'text-amber-500', // Mythic uses Legendary icon
      };
      return <Gem size={14} className={colors[rarity]} />;
  };

  const RARITY_WEIGHT: Record<string, number> = {
      [ItemRarity.NORMAL]: 1,
      [ItemRarity.MAGIC]: 2,
      [ItemRarity.RARE]: 3,
      [ItemRarity.EPIC]: 4,
      [ItemRarity.UNIQUE]: 5,
      [ItemRarity.LEGENDARY]: 6,
      [ItemRarity.MYTHTIC]: 7,
  };

  const isEquipmentItem = (item: Item): boolean => {
      const equipTypes = ['Weapon', 'Armor', 'Accessory', 'Head', 'Body', 'Hand', 'Feet', 'SubWeapon'];
      return equipTypes.some(t => item.type?.includes(t));
  };

  const getAllDismantlableGroups = (): GroupedItem[] => {
      const grouped: Record<string, GroupedItem> = {};
      character.inventory.forEach((item, idx) => {
          if (!item) return;
          if (item.rarity === ItemRarity.MYTHTIC) return;
          if ((item as any).isEquipped) return;
          if (item.locked) return;

          const isDismantlable = ['Weapon', 'Armor', 'Accessory', 'Head', 'Body', 'Hand', 'Feet', 'SubWeapon', 'Etc'].some(t => item.type?.includes(t));
          if (!isDismantlable) return;

          const key = `${item.name}-${item.rarity}`;
          if (!grouped[key]) {
              grouped[key] = { item, indices: [] };
          }
          grouped[key].indices.push(idx);
      });
      return Object.values(grouped);
  };

  const getDismantlableGroups = (): GroupedItem[] => {
      const allGroups = getAllDismantlableGroups();
      const filtered = allGroups.filter(g => {
          const isEquip = isEquipmentItem(g.item);
          return dismantleCategory === 'equipment' ? isEquip : !isEquip;
      });

      return filtered.sort((a, b) => {
          if (dismantleSort === 'rarity_desc') {
              const diff = (RARITY_WEIGHT[b.item.rarity] || 0) - (RARITY_WEIGHT[a.item.rarity] || 0);
              if (diff !== 0) return diff;
              return a.item.name.localeCompare(b.item.name);
          }
          if (dismantleSort === 'rarity_asc') {
              const diff = (RARITY_WEIGHT[a.item.rarity] || 0) - (RARITY_WEIGHT[b.item.rarity] || 0);
              if (diff !== 0) return diff;
              return a.item.name.localeCompare(b.item.name);
          }
          if (dismantleSort === 'name_asc') {
              return a.item.name.localeCompare(b.item.name);
          }
          if (dismantleSort === 'count_desc') {
              const diff = b.indices.length - a.indices.length;
              if (diff !== 0) return diff;
              return a.item.name.localeCompare(b.item.name);
          }
          if (dismantleSort === 'count_asc') {
              const diff = a.indices.length - b.indices.length;
              if (diff !== 0) return diff;
              return a.item.name.localeCompare(b.item.name);
          }
          return 0;
      });
  };

  interface RefineItemEntry {
      item: Item;
      idx: number;
  }

  const getSortedRefineEquipments = (): RefineItemEntry[] => {
      const equipEntries: RefineItemEntry[] = [];
      character.inventory.forEach((item, idx) => {
          if (!item) return;
          const isEquip = ['Weapon', 'SubWeapon', 'Head', 'Body', 'Feet', 'Hand', 'Accessory'].some(t => item.type?.includes(t));
          if (!isEquip) return;
          equipEntries.push({ item, idx });
      });

      return equipEntries.sort((a, b) => {
          if (refineSort === 'rarity_desc') {
              const diff = (RARITY_WEIGHT[b.item.rarity] || 0) - (RARITY_WEIGHT[a.item.rarity] || 0);
              if (diff !== 0) return diff;
              return a.item.name.localeCompare(b.item.name);
          }
          if (refineSort === 'rarity_asc') {
              const diff = (RARITY_WEIGHT[a.item.rarity] || 0) - (RARITY_WEIGHT[b.item.rarity] || 0);
              if (diff !== 0) return diff;
              return a.item.name.localeCompare(b.item.name);
          }
          if (refineSort === 'name_asc') {
              return a.item.name.localeCompare(b.item.name);
          }
          if (refineSort === 'enhancement_desc') {
              const diff = (b.item.enhancement || 0) - (a.item.enhancement || 0);
              if (diff !== 0) return diff;
              return (RARITY_WEIGHT[b.item.rarity] || 0) - (RARITY_WEIGHT[a.item.rarity] || 0);
          }
          if (refineSort === 'cp_desc') {
              const cpA = calculateItemCombatPowerContribution(a.item, character).itemCP;
              const cpB = calculateItemCombatPowerContribution(b.item, character).itemCP;
              const diff = cpB - cpA;
              if (diff !== 0) return diff;
              return (RARITY_WEIGHT[b.item.rarity] || 0) - (RARITY_WEIGHT[a.item.rarity] || 0);
          }
          return 0;
      });
  };

  
  const handleCraft = async () => {
      // [MODIFIED] 대장장이 직업 동료만 제작 가능하도록 강화된 체크
      if (!assignee || assignee.job !== JobType.BLACKSMITH) {
          setResultOverlay({
              show: true,
              data: {
                  type: 'warning',
                  title: '제작 불가',
                  message: '장비 제작은 [대장장이] 직업을 가진 거주민 동료에게만 의뢰할 수 있습니다.\n기지 관리 메뉴에서 대장장이를 제작소 담당자로 배치해야 합니다.',
                  items: [
                      { label: '현재 담당자', after: assignee ? `${assignee.name} (${assignee.job})` : '미배치' },
                      { label: '필요 직업', after: '대장장이', color: 'text-amber-400' }
                  ]
              }
          });
          return;
      }

      const cost = getCraftingCost();
      const res = character.base?.resources;
      const crystalKey = getCrystalKey(selectedRarity);
      
      const missing = [];
      if ((res?.iron || 0) < cost.iron) missing.push(`철광석 ${cost.iron - (res?.iron || 0)}개`);
      if ((res?.wood || 0) < cost.wood) missing.push(`목재 ${cost.wood - (res?.wood || 0)}개`);
      if ((res?.manaCrystal || 0) < cost.mana) missing.push(`마정석 ${cost.mana - (res?.manaCrystal || 0)}개`);
      if ((res?.[crystalKey] || 0) < cost.crystal) missing.push(`${selectedRarity === ItemRarity.MYTHTIC ? '전설' : selectedRarity} 결정 ${cost.crystal - (res?.[crystalKey] || 0)}개`);
      if (character.money < cost.gold) missing.push(`골드 ${(cost.gold - character.money).toLocaleString()}G`);

      // [NEW] 인벤토리 재료 확인 (마력의 정수, 태초의 빛, 세계수의 정수)
      const essenceOwned = character.inventory.filter(i => i.name === '마력의 정수').length;
      const primordialOwned = character.inventory.filter(i => i.name === '태초의 빛').length;
      const worldTreeOwned = character.inventory.filter(i => i.name === '세계수의 정수').length;
      
      const beastLeatherOwned = character.inventory.filter(i => i.name === '수인족의 가죽').length;
      const sanctuaryBranchOwned = character.inventory.filter(i => i.name === '성역의 나뭇가지').length;

      // [NEW] 신성 재료 확인
      const divineTearOwned = character.inventory.filter(i => i.name === '신의 눈물 결정').length;
      const divineCrownOwned = character.inventory.filter(i => i.name === '천상의 면류관 조각').length;
      const divineWingOwned = character.inventory.filter(i => i.name === '천사의 날개깃').length;

      // [NEW] 수확 작물 및 광석 재료 확인
      if ((res as any)?.world_tree_branch < cost.worldTreeBranch) missing.push(`세계수의 가지 ${cost.worldTreeBranch - ((res as any)?.world_tree_branch || 0)}개`);
      if ((res as any)?.shinryoku_flower < cost.shinryokuFlower) missing.push(`신력 꽃 ${cost.shinryokuFlower - ((res as any)?.shinryoku_flower || 0)}개`);
      if ((res as any)?.gold_ore < cost.goldOre) missing.push(`금광석 ${cost.goldOre - ((res as any)?.gold_ore || 0)}개`);
      if ((res as any)?.silver_ore < cost.silverOre) missing.push(`은광석 ${cost.silverOre - ((res as any)?.silver_ore || 0)}개`);
      if ((res as any)?.diamond < cost.diamond) missing.push(`다이아몬드 ${cost.diamond - ((res as any)?.diamond || 0)}개`);
      if ((res as any)?.ruby < cost.ruby) missing.push(`루비 ${cost.ruby - ((res as any)?.ruby || 0)}개`);
      if ((res as any)?.sapphire < cost.sapphire) missing.push(`사파이어 ${cost.sapphire - ((res as any)?.sapphire || 0)}개`);
      if ((res as any)?.emerald < cost.emerald) missing.push(`에메랄드 ${cost.emerald - ((res as any)?.emerald || 0)}개`);
      if ((res as any)?.holy_stone < cost.holyStone) missing.push(`신성석 ${cost.holyStone - ((res as any)?.holy_stone || 0)}개`);

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

      if (missing.length > 0) {
          setResultOverlay({
              show: true,
              data: {
                  type: 'warning',
                  title: '재료 부족',
                  message: '제작에 필요한 재료가 부족합니다.',
                  items: missing.map(m => ({ label: '부족', after: m }))
              }
          });
          return;
      }

      setIsCrafting(true);
      const config = RARITY_CONFIG[selectedRarity];
      const craftingTime = Math.max(1, Math.ceil(config.time * (1 - masteryTimeReduction)));
      
      const roll = Math.random() * 100;
      const success = roll < (config.success + bonusRate + masterySuccessBonus);
      
      let newChar = JSON.parse(JSON.stringify(character)) as Character;
      newChar.base = {
          ...newChar.base!,
          resources: {
              ...newChar.base!.resources,
              iron: (res?.iron || 0) - cost.iron,
              wood: (res?.wood || 0) - cost.wood,
              manaCrystal: (res?.manaCrystal || 0) - cost.mana,
              [crystalKey]: (res?.[crystalKey] || 0) - cost.crystal,
              world_tree_branch: ((res as any)?.world_tree_branch || 0) - cost.worldTreeBranch,
              shinryoku_flower: ((res as any)?.shinryoku_flower || 0) - cost.shinryokuFlower,
              gold_ore: ((res as any)?.gold_ore || 0) - cost.goldOre,
              silver_ore: ((res as any)?.silver_ore || 0) - cost.silverOre,
              diamond: ((res as any)?.diamond || 0) - cost.diamond,
              ruby: ((res as any)?.ruby || 0) - cost.ruby,
              sapphire: ((res as any)?.sapphire || 0) - cost.sapphire,
              emerald: ((res as any)?.emerald || 0) - cost.emerald,
              holy_stone: ((res as any)?.holy_stone || 0) - cost.holyStone
          }
      };
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
      
      newChar.currentDate = addDays(newChar.currentDate || '2000-01-01', craftingTime);

      if (success) {
          // [MODIFIED] 장비 단계에 따른 숙련도 제공 (노말 +20 ~ 신화 +5000)
          const MASTERY_GAIN: Record<ItemRarity, number> = {
              [ItemRarity.NORMAL]: 20,
              [ItemRarity.MAGIC]: 50,
              [ItemRarity.RARE]: 150,
              [ItemRarity.EPIC]: 400,
              [ItemRarity.UNIQUE]: 1000,
              [ItemRarity.LEGENDARY]: 2500,
              [ItemRarity.MYTHTIC]: 5000
          };
          
          let expGain = MASTERY_GAIN[selectedRarity] || 50;
          const isGreatSuccess = Math.random() < 0.1; // 10% 확률로 대성공
          if (isGreatSuccess) expGain *= 2;

          const expResult = gainProfessionExp(newChar, 'crafting', expGain);
          newChar = expResult.newChar; // 숙련도가 업데이트된 캐릭터 객체로 교체

          const optionCount = selectedRarity === ItemRarity.NORMAL ? 1 : 
                              selectedRarity === ItemRarity.MAGIC ? 1 :
                              selectedRarity === ItemRarity.RARE ? 2 :
                              selectedRarity === ItemRarity.EPIC ? 3 :
                              selectedRarity === ItemRarity.UNIQUE ? 3 : 
                              selectedRarity === ItemRarity.LEGENDARY ? 4 : 5
          
              // [MODIFIED] 로컬 알고리즘을 사용한 이름 및 옵션 생성
          let finalName = customName.trim() || generateLocalItemName(selectedCategory, selectedSubType, selectedRarity);
          const rawOptions = generateLocalOptions(selectedRarity, optionCount, selectedCategory);
          const options = applyBlacksmithMasteryToOptions(rawOptions, selectedRarity, effectiveSmithLevel);

          let finalType: Item['type'] = 'Etc';
          if (selectedCategory === 'Weapon') finalType = 'Weapon'; 
          if (selectedCategory === 'SubWeapon') finalType = 'SubWeapon';
          if (selectedCategory === 'Armor') {
              if (selectedMainType.includes('머리')) finalType = 'Head';
              else if (selectedMainType.includes('상의')) finalType = 'Body';
              else if (selectedMainType.includes('장갑')) finalType = 'Hand';
              else if (selectedMainType.includes('신발')) finalType = 'Feet';
          }
          if (selectedCategory === 'Accessory') finalType = 'Accessory';

          const elementalType = extractElementalType(options);
          
          // [MODIFIED] 로컬 알고리즘을 사용한 기본 스탯 생성
          const baseStats = generateLocalBaseStats(selectedCategory, selectedSubType, selectedRarity, 1);

          let defaultImg = "https://i.ibb.co/6RsrXBZW/image.png";
          if (selectedCategory === 'Weapon' || selectedCategory === 'SubWeapon') {
              defaultImg = "https://i.ibb.co/Kz56VGDS/image.png";
          } else if (selectedCategory === 'Armor' || ['Head', 'Body', 'Hand', 'Feet'].includes(finalType)) {
              defaultImg = "https://i.ibb.co/P9TfV9W1/armor.png";
          }

          const newItem: Item = {
              name: finalName,
              type: finalType,
              rarity: selectedRarity,
              description: `제작된 ${selectedSubType}.`,
              enhancement: 0,
              secondaryOptions: options,
              optionLevels: new Array(options.length).fill(1),
              weaponType: (selectedCategory === 'Weapon' || selectedCategory === 'SubWeapon') ? getWeaponTypeFromItem({ name: selectedSubType, type: 'Weapon' } as Item) : undefined,
              elementalType: elementalType,
              stats: baseStats as Stats,
              imageUrl: defaultImg,
              mythicOption: selectedRarity === ItemRarity.MYTHTIC ? getRandomMythicOption() : undefined
          };

          newChar.inventory.push(newItem);
          setResultOverlay({
              show: true,
              data: {
                  type: 'success',
                  title: isGreatSuccess ? '✨ 장비 제작 대성공! ✨' : '장비 제작 성공!',
                  message: isGreatSuccess 
                    ? `대성공으로 인해 숙련도 경험치를 2배(${expGain}) 획득했습니다!\n${newItem.name} (${selectedRarity})을(를) 획득했습니다.`
                    : `${newItem.name} (${selectedRarity})을(를) 획득했습니다.`,
                  items: [
                      { label: '소요 시간', after: `${craftingTime}일` },
                      { label: '제작자', after: assignee?.name || '대장장이' },
                      ...options.map((opt, i) => ({ label: `옵션 ${i+1}`, after: opt })),
                      ...(expResult.leveledUp ? [{ label: '숙련도 상승!', after: `Lv.${expResult.oldLevel} -> Lv.${expResult.newLevel}`, color: 'text-yellow-400' }] : [])
                  ]
              }
          });
          onUpdateCharacter(newChar, `[시스템] ${assignee?.name} 대장장이가 장비 제작에 성공했습니다: ${newItem.name}`);
      } else {
          setResultOverlay({
              show: true,
              data: {
                  type: 'failure',
                  title: '장비 제작 실패...',
                  message: '제작에 실패하여 자원만 소모되었습니다.',
                  items: [{ label: '소요 시간', after: `${craftingTime}일` }]
              }
          });
          onUpdateCharacter(newChar, `[시스템] ${assignee?.name} 대장장이가 장비 제작에 실패했습니다. 자원만 소모되었습니다. (소요시간: ${craftingTime}일)`);
      }
      setIsCrafting(false);
  };

  const CRYSTAL_LABEL_MAP: Record<string, { label: string; color: string }> = {
      normalCrystal: { label: '일반 결정', color: 'text-slate-300' },
      magicCrystal: { label: '마법 결정', color: 'text-blue-400' },
      rareCrystal: { label: '희귀 결정', color: 'text-yellow-400' },
      epicCrystal: { label: '에픽 결정', color: 'text-purple-400' },
      uniqueCrystal: { label: '유니크 결정', color: 'text-pink-400' },
      legendaryCrystal: { label: '전설 결정', color: 'text-amber-400' },
  };

  const calculateBulkWorkshopYield = (items: Item[]) => {
      const counts: Record<string, number> = {};
      items.forEach(item => {
          const key = getCrystalKey(item.rarity);
          const isEquip = ['Weapon', 'SubWeapon', 'Head', 'Body', 'Feet', 'Hand', 'Accessory'].some(t => item.type.includes(t));
          const amount = isEquip ? 1.5 : 1;
          counts[key] = (counts[key] || 0) + amount;
      });

      return Object.entries(counts).map(([key, count]) => {
          const info = CRYSTAL_LABEL_MAP[key] || { label: '결정', color: 'text-slate-300' };
          return {
              label: info.label,
              value: `약 ${Math.round(count)}개`,
              color: info.color,
              icon: <Gem size={14} className={info.color} />
          };
      });
  };

  const handleBulkWorkshopDismantle = (targetIndices: number[]) => {
      if (targetIndices.length === 0) return;

      const targetItems = targetIndices.map(idx => character.inventory[idx]).filter(Boolean);
      const resourceDeltas: Record<string, number> = {};

      targetItems.forEach(item => {
          const crystalKey = getCrystalKey(item.rarity);
          const isEquip = ['Weapon', 'SubWeapon', 'Head', 'Body', 'Feet', 'Hand', 'Accessory'].some(t => item.type.includes(t));
          const gained = isEquip ? Math.floor(Math.random() * 2) + 1 : 1;
          resourceDeltas[crystalKey] = (resourceDeltas[crystalKey] || 0) + gained;
      });

      let newChar = { ...character };
      newChar.inventory = newChar.inventory.filter((_, idx) => !targetIndices.includes(idx));

      newChar.base = {
          ...newChar.base!,
          resources: {
              ...newChar.base!.resources,
          }
      };
      Object.entries(resourceDeltas).forEach(([key, amount]) => {
          (newChar.base!.resources as any)[key] = ((newChar.base!.resources as any)[key] || 0) + amount;
      });

      const summaryList = Object.entries(resourceDeltas).map(([key, amount]) => {
          const info = CRYSTAL_LABEL_MAP[key] || { label: '결정' };
          return `${info.label} +${amount}개`;
      });

      setResultOverlay({
          show: true,
          data: {
              type: 'success',
              title: '일괄 분해 완료',
              message: `아이템 ${targetIndices.length}개를 분해하여 결정을 획득했습니다.`,
              items: [
                  { label: '분해 아이템 수', after: `${targetIndices.length}개` },
                  ...Object.entries(resourceDeltas).map(([key, amount]) => ({
                      label: CRYSTAL_LABEL_MAP[key]?.label || '획득 자원',
                      after: `+${amount}개`,
                      color: CRYSTAL_LABEL_MAP[key]?.color
                  }))
              ]
          }
      });

      setSelectedDismantleGroup(null);
      setDismantleAmount(1);
      setIsBulkDismantleOpen(false);
      onUpdateCharacter(newChar, `[시스템] 아이템 ${targetIndices.length}개 일괄 분해 완료. (${summaryList.join(', ')})`);
  };

  const handleDismantle = () => {
         if (!selectedDismantleGroup) return;
      const { item, indices } = selectedDismantleGroup;
      
      const quantity = Math.min(dismantleAmount, indices.length);
      if (quantity <= 0) return;

      const rarity = item.rarity;
      const crystalKey = getCrystalKey(rarity);
      const isEquip = ['Weapon', 'SubWeapon', 'Head', 'Body', 'Feet', 'Hand', 'Accessory'].includes(item.type);
      
      let totalAmount = 0;
      for (let i = 0; i < quantity; i++) {
          if (isEquip) {
              totalAmount += Math.floor(Math.random() * 2) + 1;
          } else {
              totalAmount += 1;
          }
      }

      let newChar = { ...character };
      const indicesToRemove = indices.slice(0, quantity);
      const newInventory = newChar.inventory.filter((_, idx) => !indicesToRemove.includes(idx));
      newChar.inventory = newInventory;
      
      newChar.base = {
          ...newChar.base!,
          resources: {
              ...newChar.base!.resources,
              [crystalKey]: (newChar.base!.resources[crystalKey] || 0) + totalAmount
          }
      };

      setResultOverlay({
          show: true,
          data: {
              type: 'success',
              title: '분해 완료',
              message: `${item.name} ${quantity}개를 분해하여 마력 결정을 추출했습니다.`,
              items: [
                  { label: '소모 아이템', after: `${item.name} x${quantity}` },
                  { label: '획득 자원', after: `${rarity === ItemRarity.MYTHTIC ? '전설' : rarity} 결정 x${totalAmount}` }
              ]
          }
      });

      setSelectedDismantleGroup(null);
      setDismantleAmount(1);
      onUpdateCharacter(newChar, `[시스템] ${item.name} x${quantity} 분해 완료. (${rarity === ItemRarity.MYTHTIC ? '전설' : rarity} 결정 +${totalAmount})`);
  };

  const handleItemEnhanceLocal = () => {
      if (selectedItemIdx === null) return;
      const item = character.inventory[selectedItemIdx];
      if (!item) return;

      const currentEnh = item.enhancement || 0;
      const maxEnh = ENHANCEMENT_CAPS[item.rarity] || 5;
      if (currentEnh >= maxEnh) return alert("이미 최대 강화 수치입니다.");

      const cost = getItemEnhanceCost(item);
      const res = character.base?.resources;

      const missing = [];
      if ((res?.iron || 0) < cost.iron) missing.push(`철광석 ${cost.iron - (res?.iron || 0)}개`);
      if (character.money < cost.gold) missing.push(`골드 ${(cost.gold - character.money).toLocaleString()}G`);
      if ((res?.manaCrystal || 0) < cost.mana) missing.push(`마정석 ${cost.mana - (res?.manaCrystal || 0)}개`);

      if (missing.length > 0) {
          setResultOverlay({
              show: true,
              data: {
                  type: 'warning',
                  title: '자원 부족',
                  message: '강화에 필요한 재료가 부족합니다.',
                  items: missing.map(m => ({ label: '부족', after: m }))
              }
          });
          return;
      }

      if (isEnhancing) return;
      setIsEnhancing(true);
      setEnhanceFx('none');

      setTimeout(() => {
          setIsEnhancing(false);

          const rate = getItemEnhanceRate(item) + masterySuccessBonus;
          const roll = Math.random() * 100;
          const success = roll < rate;

          let newChar = JSON.parse(JSON.stringify(character)) as Character;
          newChar.money -= cost.gold;
          newChar.base = {
              ...newChar.base!,
              resources: {
                  ...newChar.base!.resources,
                  iron: (res?.iron || 0) - cost.iron,
                  manaCrystal: (res?.manaCrystal || 0) - cost.mana
              }
          };

          const newInventory = [...newChar.inventory];
          let msg = "";

          if (success) {
              setEnhanceFx('success');
              const nextLevel = currentEnh + 1;
              const expResult = gainProfessionExp(newChar, 'crafting', 10 + currentEnh * 2);
              let updatedItem = { ...item, enhancement: nextLevel, failureCount: 0 };
              
              if (!updatedItem.stats || Object.keys(updatedItem.stats).length === 0) {
                  const possibleStats = ['str', 'int', 'def', 'agi', 'wis', 'ctrl'];
                  const randomStat = possibleStats[Math.floor(Math.random() * possibleStats.length)];
                  updatedItem.stats = { [randomStat]: 1 };
              }

              const newSecondaryOptions = [...(updatedItem.secondaryOptions || [])];
              let unlockedOpt = "";

              const secondaryOptionPool: Record<number, string[]> = {
                  5: ["물리 공격력 +3%", "마법 공격력 +3%", "치명타 확률 +2%", "치명타 피해량 +3%", "모든 속성 피해 +3%", "모든 속성 저항 +3%"],
                  8: ["치명타 확률 +5%", "치명타 피해량 +5%", "물리 공격력 +5%", "마법 공격력 +5%", "모든 속성 피해 +5%", "모든 속성 저항 +5%"],
                  10: ["최종 능력치 +5%", "치명타 확률 +8%", "치명타 피해량 +8%", "물리 공격력 +8%", "마법 공격력 +8%", "모든 속성 피해 +8%", "모든 속성 저항 +5%"],
                  15: ["상태이상 저항 +10%", "물리 공격력 +10%", "마법 공격력 +10%", "모든 속성 저항 +10%", "치명타 피해량 +10%", "모든 속성 피해 +10%"],
                  20: ["최종 능력치 +13%", "치명타 피해량 +15%", "모든 속성 피해 +15%", "모든 속성 저항 +15%", "물리 공격력 +15%", "마법 공격력 +15%"]
              };

              const pool = secondaryOptionPool[nextLevel];
              if (pool && pool.length > 0) {
                  const availableOptions = pool.filter(option => !newSecondaryOptions.includes(option));
                  if (availableOptions.length > 0) {
                      const randomIndex = Math.floor(Math.random() * availableOptions.length);
                      unlockedOpt = availableOptions[randomIndex];
                      newSecondaryOptions.push(unlockedOpt);
                  }
              }
              
              updatedItem.secondaryOptions = newSecondaryOptions;
              newInventory[selectedItemIdx] = updatedItem;
              msg = `[시스템] ${item.name} 강화 성공! (+${nextLevel})`;
              
              const cpDelta = calculateItemCPDelta(item, updatedItem, character);
              const cpSign = cpDelta.diff >= 0 ? `+${cpDelta.diff.toLocaleString()}` : `${cpDelta.diff.toLocaleString()}`;
              const resultItems: NonNullable<ResultData['items']> = [{ label: '강화 수치', before: `+${currentEnh}`, after: `+${nextLevel}` }];
              if (unlockedOpt) resultItems.push({ label: '옵션 개방', after: unlockedOpt, before: undefined });
              resultItems.push({
                  label: '전투력 변동',
                  before: `${cpDelta.oldCP.toLocaleString()}`,
                  after: `${cpDelta.newCP.toLocaleString()} (${cpSign})`,
                  color: cpDelta.diff >= 0 ? 'text-emerald-400' : 'text-red-400'
              });

              newChar.inventory = newInventory;
              onUpdateCharacter(newChar, msg);

              setResultOverlay({
                  show: true,
                  data: {
                      type: 'success',
                      title: '★ 강화 성공! ★',
                      message: `${item.name}의 마법 기운이 강화되어 성능이 더욱 상승했습니다.`,
                      items: [
                          ...resultItems,
                          ...(expResult.leveledUp ? [{ label: '숙련도 상승!', after: `Lv.${expResult.oldLevel} -> Lv.${expResult.newLevel}`, color: 'text-yellow-400' }] : [])
                      ]
                  }
              });
          } else {
              setEnhanceFx('failure');
              const safetyZone = ENHANCEMENT_CONFIG.safetyZone[item.rarity];
              const canBreak = currentEnh >= 6; 
              let resultType: 'failure' | 'destroy' = "failure"; 
              let detailMessage = "수치는 유지되었습니다.";
              let before = `+${currentEnh}`;
              let after = `+${currentEnh}`;
              let cpFailDelta: { oldCP: number; newCP: number; diff: number } | null = null;
              
              let nextInventoryOptions = [...(item.secondaryOptions || [])];

              if (canBreak) {
                  const destructionRate = ENHANCEMENT_CONFIG.destructionRate(currentEnh);
                  if (Math.random() * 100 < destructionRate) {
                      resultType = "destroy";
                  }
              } 
              
              if (resultType !== "destroy") {
                 if (currentEnh >= safetyZone && canBreak) { 
                     const newLevel = Math.max(0, currentEnh - 1);
                     const milestones = [5, 8, 10, 15, 20];
                     let lostOpt = "";
                     if (milestones.includes(currentEnh)) {
                         lostOpt = nextInventoryOptions.pop() || "";
                     }

                     const downgradedItem = { 
                         ...item, 
                         enhancement: newLevel, 
                         secondaryOptions: nextInventoryOptions,
                         failureCount: (item.failureCount || 0) + 1 
                     };
                     newInventory[selectedItemIdx] = downgradedItem;
                     cpFailDelta = calculateItemCPDelta(item, downgradedItem, character);
                     msg = `[시스템] 강화 실패... 수치 하락 (+${currentEnh} -> +${newLevel})`;
                     detailMessage = "강화에 실패하여 수치가 떨어졌습니다.";
                     if (lostOpt) detailMessage += `\n옵션 [${lostOpt}]이 소실되었습니다.`;
                     after = `+${newLevel}`;
                 } else {
                     newInventory[selectedItemIdx] = { ...item, failureCount: (item.failureCount || 0) + 1 };
                     msg = `[시스템] 강화 실패... (안전 구간 유지)`;
                 }
              }

              if (resultType === "destroy") {
                  const destroyCPDelta = calculateItemCPDelta(item, null, character);
                  newInventory.splice(selectedItemIdx, 1);
                  msg = `[시스템] 대실패! ${item.name}이(가) 파괴되었습니다...`;
                  newChar.inventory = newInventory;
                  onUpdateCharacter(newChar, msg);

                  setResultOverlay({ 
                      show: true, 
                      data: {
                          type: 'destroy', 
                          title: '장비 파괴...', 
                          message: '강화 대실패로 인해 장비가 소멸했습니다.', 
                          items: [
                              { label: '결과', after: '파괴됨' },
                              { label: '전투력 변동', before: `${destroyCPDelta.oldCP.toLocaleString()}`, after: `0 (${destroyCPDelta.diff.toLocaleString()})`, color: 'text-red-500' }
                          ]
                      } 
                  });
                  setSelectedItemIdx(null);
              } else {
                  newChar.inventory = newInventory;
                  onUpdateCharacter(newChar, msg);

                  const failItems: { label: string; before?: string; after: string; color?: string }[] = [
                      { label: '강화 수치', before, after }
                  ];
                  if (cpFailDelta) {
                      const cpSign = cpFailDelta.diff >= 0 ? `+${cpFailDelta.diff.toLocaleString()}` : `${cpFailDelta.diff.toLocaleString()}`;
                      failItems.push({
                          label: '전투력 변동',
                          before: `${cpFailDelta.oldCP.toLocaleString()}`,
                          after: `${cpFailDelta.newCP.toLocaleString()} (${cpSign})`,
                          color: cpFailDelta.diff >= 0 ? 'text-emerald-400' : 'text-red-400'
                      });
                  } else {
                      failItems.push({
                          label: '전투력 변동',
                          after: '변동 없음',
                          color: 'text-slate-400'
                      });
                  }

                  setResultOverlay({ 
                      show: true, 
                      data: {
                          type: 'failure', 
                          title: '강화 실패', 
                          message: detailMessage,
                          items: failItems
                      } 
                  });
              }
          }
      }, 1000);
  };

  // [NEW] 기본 장비 강화: 성공할 때까지 자동 연속 강화 핸들러
  const handleBatchItemEnhanceLocal = () => {
      if (selectedItemIdx === null) return;
      const item = character.inventory[selectedItemIdx];
      if (!item) return;

      const currentEnh = item.enhancement || 0;
      const maxEnh = ENHANCEMENT_CAPS[item.rarity] || 5;
      if (currentEnh >= maxEnh) return alert("이미 최대 강화 수치입니다.");

      if (isEnhancing || isRefining) return;
      setIsEnhancing(true);
      setEnhanceFx('none');

      setTimeout(() => {
          setIsEnhancing(false);
          const result = executeBatchItemEnhanceUntilSuccess(character, selectedItemIdx, masterySuccessBonus);

          if (result.destroyed) {
              setEnhanceFx('failure');
              setResultOverlay({
                  show: true,
                  data: {
                      type: 'destroy',
                      title: '장비 파괴...',
                      message: `${result.attempts}회 연속 강화 시도 중 강화 대실패로 인해 장비가 소멸했습니다.`,
                      items: [
                          { label: '시도 횟수', after: `${result.attempts}회` },
                          { label: '소모 골드', after: `${result.goldSpent.toLocaleString()}G` },
                          { label: '소모 철광석', after: `${result.ironSpent}개` },
                          { label: '소모 마정석', after: `${result.manaSpent}개` },
                          { label: '결과', after: '장비 파괴됨', color: 'text-red-500' }
                      ]
                  }
              });
              setSelectedItemIdx(null);
          } else if (result.success) {
              setEnhanceFx('success');
              const cpDelta = result.newCP - result.oldCP;
              const cpSign = cpDelta >= 0 ? `+${cpDelta.toLocaleString()}` : `${cpDelta.toLocaleString()}`;
              const items: NonNullable<ResultData['items']> = [
                  { label: '시도 횟수', after: `${result.attempts}회 만에 성공!` },
                  { label: '강화 수치', before: `+${result.startEnhancement}`, after: `+${result.finalEnhancement}` },
                  { label: '소모 골드', after: `${result.goldSpent.toLocaleString()}G` },
                  { label: '소모 철광석', after: `${result.ironSpent}개` },
                  { label: '소모 마정석', after: `${result.manaSpent}개` }
              ];
              if (result.unlockedOption) {
                  items.push({ label: '옵션 개방', after: result.unlockedOption });
              }
              items.push({
                  label: '전투력 변동',
                  before: `${result.oldCP.toLocaleString()}`,
                  after: `${result.newCP.toLocaleString()} (${cpSign})`,
                  color: cpDelta >= 0 ? 'text-emerald-400' : 'text-red-400'
              });

              setResultOverlay({
                  show: true,
                  data: {
                      type: 'success',
                      title: '★ 연속 강화 성공! ★',
                      message: `${item.name}이(가) ${result.attempts}회 시도 만에 +${result.finalEnhancement} 강화에 성공했습니다!`,
                      items
                  }
              });
          } else {
              setEnhanceFx('failure');
              setResultOverlay({
                  show: true,
                  data: {
                      type: 'warning',
                      title: '연속 강화 재료 소진 중단',
                      message: result.stopReason === 'no_resources'
                          ? `재료가 소진되어 연속 강회가 중단되었습니다. (${result.attempts}회 시도 진행됨)`
                          : `연속 강회가 종료되었습니다. (${result.attempts}회 시도 진행됨)`,
                      items: [
                          { label: '시도 횟수', after: `${result.attempts}회` },
                          { label: '강화 수치', before: `+${result.startEnhancement}`, after: `+${result.finalEnhancement}` },
                          { label: '소모 골드', after: `${result.goldSpent.toLocaleString()}G` },
                          { label: '소모 철광석', after: `${result.ironSpent}개` },
                          { label: '소모 마정석', after: `${result.manaSpent}개` }
                      ]
                  }
              });
          }

          onUpdateCharacter(result.updatedCharacter, result.message);
      }, 700);
  };

  // [NEW] 개별 옵션 수치 강화: 성공할 때까지 자동 연속 강화 핸들러
  const handleBatchOptionEnhanceLocal = (optionIdx: number) => {
      if (selectedItemIdx === null) return;
      const item = character.inventory[selectedItemIdx];
      if (!item) return;

      if (isRefining || isEnhancing || isCrafting) return;
      setIsRefining(true);
      setRefineFx('none');

      setTimeout(() => {
          setIsRefining(false);
          const profession = character.professions?.crafting || { level: 1, exp: 0 };
          const bonusRate = Math.min(15, (profession.level - 1) * 0.5);

          const result = executeBatchOptionEnhanceUntilSuccess(character, selectedItemIdx, optionIdx, bonusRate);

          if (result.success) {
              setRefineFx('success');
              const cpDelta = result.newCP - result.oldCP;
              const cpSign = cpDelta >= 0 ? `+${cpDelta.toLocaleString()}` : `${cpDelta.toLocaleString()}`;

              setResultOverlay({
                  show: true,
                  data: {
                      type: 'success',
                      title: '★ 옵션 연속 강화 성공! ★',
                      message: `${result.attempts}회 시도 끝에 옵션이 성공적으로 강화되었습니다.`,
                      items: [
                          { label: '시도 횟수', after: `${result.attempts}회 만에 성공!` },
                          { label: '옵션 수치', before: `${result.oldOptionText} (Lv.${result.startLevel})`, after: `${result.newOptionText} (Lv.${result.finalLevel})` },
                          { label: '소모 골드', after: `${result.goldSpent.toLocaleString()}G` },
                          { label: '소모 마정석', after: `${result.manaSpent}개` },
                          {
                              label: '전투력 변동',
                              before: `${result.oldCP.toLocaleString()}`,
                              after: `${result.newCP.toLocaleString()} (${cpSign})`,
                              color: cpDelta >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }
                      ]
                  }
              });
          } else {
              setRefineFx('failure');
              setResultOverlay({
                  show: true,
                  data: {
                      type: 'warning',
                      title: '옵션 연속 강화 재료 소진',
                      message: result.stopReason === 'no_resources'
                          ? `재료가 소진되어 옵션 연속 강회가 중단되었습니다. (${result.attempts}회 시도 진행됨)`
                          : `옵션 연속 강회가 종료되었습니다. (${result.attempts}회 시도 진행됨)`,
                      items: [
                          { label: '시도 횟수', after: `${result.attempts}회` },
                          { label: '옵션 레벨', after: `Lv.${result.finalLevel}` },
                          { label: '소모 골드', after: `${result.goldSpent.toLocaleString()}G` },
                          { label: '소모 마정석', after: `${result.manaSpent}개` }
                      ]
                  }
              });
          }

          onUpdateCharacter(result.updatedCharacter, result.message);
      }, 700);
  };

  // [NEW] 옵션 최대 레벨 한계 개방 확률 처리 핸들러
  const handleOptionMaxLevelUnlock = (optionIdx: number) => {
      if (selectedItemIdx === null) return;
      const item = character.inventory[selectedItemIdx];
      if (!item || !item.secondaryOptions || !item.secondaryOptions[optionIdx]) return;

      const currentMaxLevel = item.optionMaxLevels?.[optionIdx] || 5;
      const nextMaxLevel = currentMaxLevel + 1;
      if (nextMaxLevel > 10) return;

      const ironCost = 5000 * (currentMaxLevel - 4);
      const manaCost = 500 * (currentMaxLevel - 4);
      const hasIron = (character.base?.resources?.iron || 0) >= ironCost;
      const hasMana = (character.base?.resources?.manaCrystal || 0) >= manaCost;

      if (!hasIron || !hasMana) {
          setResultOverlay({
              show: true,
              data: {
                  type: 'warning',
                  title: '재료 부족',
                  message: '옵션 최대 레벨 개방에 필요한 재료가 부족합니다.',
                  items: [
                      { label: '필요 철광석', after: `${ironCost.toLocaleString()}개 (보유: ${character.base?.resources?.iron || 0}개)` },
                      { label: '필요 마정석', after: `${manaCost.toLocaleString()}개 (보유: ${character.base?.resources?.manaCrystal || 0}개)` }
                  ]
              }
          });
          return;
      }

      if (isRefining || isEnhancing || isCrafting) return;
      setIsRefining(true);

      const baseRates: Record<number, number> = { 6: 70, 7: 55, 8: 40, 9: 25, 10: 15 };
      const craftingProf = character.professions?.crafting || { level: 1, exp: 0 };
      const craftingBonusRate = Math.min(10, (craftingProf.level - 1) * 0.2);
      const baseRate = baseRates[nextMaxLevel] || 20;
      const finalRate = Math.min(95, Math.max(5, Math.round(baseRate + bonusRate + craftingBonusRate)));

      setTimeout(() => {
          setIsRefining(false);

          const roll = Math.random() * 100;
          const success = roll < finalRate;

          const newChar = JSON.parse(JSON.stringify(character)) as Character;
          if (newChar.base?.resources) {
              newChar.base.resources.iron = (newChar.base.resources.iron || 0) - ironCost;
              newChar.base.resources.manaCrystal = (newChar.base.resources.manaCrystal || 0) - manaCost;
          }

          const optName = item.secondaryOptions[optionIdx];

          if (success) {
              const newInventory = [...newChar.inventory];
              const newItem = { ...item };
              if (!newItem.optionMaxLevels) {
                  newItem.optionMaxLevels = new Array(item.secondaryOptions.length).fill(5);
              } else {
                  newItem.optionMaxLevels = [...newItem.optionMaxLevels];
              }
              newItem.optionMaxLevels[optionIdx] = nextMaxLevel;
              newInventory[selectedItemIdx] = newItem;
              newChar.inventory = newInventory;

              setResultOverlay({
                  show: true,
                  data: {
                      type: 'success',
                      title: '★ 최대 레벨 개방 성공! ★',
                      message: `${optName} 옵션의 최대 레벨 한계가 Lv.${nextMaxLevel}(으)로 성공적으로 개방되었습니다!`,
                      items: [
                          { label: '옵션명', after: optName },
                          { label: '최대 레벨', before: `Lv.${currentMaxLevel}`, after: `Lv.${nextMaxLevel}` },
                          { label: '소모 철광석', after: `${ironCost.toLocaleString()}개` },
                          { label: '소모 마정석', after: `${manaCost.toLocaleString()}개` }
                      ]
                  }
              });
              onUpdateCharacter(newChar, `[시스템] ${optName} 옵션 최대 레벨 Lv.${nextMaxLevel} 개방 성공!`);
          } else {
              setResultOverlay({
                  show: true,
                  data: {
                      type: 'failure',
                      title: '최대 레벨 개방 실패...',
                      message: `한계 개방에 실패하여 재료만 소모되었습니다. (현재 최대 Lv.${currentMaxLevel} 유지)`,
                      items: [
                          { label: '옵션명', after: optName },
                          { label: '최대 레벨', after: `Lv.${currentMaxLevel} (변화 없음)` },
                          { label: '소모 철광석', after: `${ironCost.toLocaleString()}개` },
                          { label: '소모 마정석', after: `${manaCost.toLocaleString()}개` }
                      ]
                  }
              });
              onUpdateCharacter(newChar, `[시스템] ${optName} 옵션 최대 레벨 개방 실패... (재료 소모됨)`);
          }
      }, 700);
  };

  const handleRefine = async (type: 'reroll' | 'enhance' | 'promote' | 'reset_reroll', optionIdx?: number) => {
      if (selectedItemIdx === null) return;
      const item = character.inventory[selectedItemIdx];
      if (!item) return;

      if (isRefining || isEnhancing || isCrafting) return;
      setIsRefining(true);
      setRefineFx('none');

      setTimeout(() => {
          setIsRefining(false);

          let newChar = JSON.parse(JSON.stringify(character)) as Character;
          const newInventory = [...newChar.inventory];
          const res = newChar.base?.resources;
          const optionCount = item.secondaryOptions?.length || 0;
          const profession = newChar.professions?.crafting || { level: 1, exp: 0 };
          const bonusRate = Math.min(15, (profession.level - 1) * 0.5);

      if (type === 'reroll') {
          const currentRerollCount = item.rerollCount || 0;
          if (currentRerollCount >= 10) {
              setResultOverlay({
                  show: true,
                  data: {
                      type: 'warning',
                      title: '재설정 횟수 초과',
                      message: '이 아이템은 더 이상 옵션을 재설정할 수 없습니다. (최대 10회)',
                      items: [{ label: '현재 횟수', after: `${currentRerollCount}/10` }]
                  }
              });
              return;
          }

          const oldOptions = [...(item.secondaryOptions || [])];
          const oldLevels = [...(item.optionLevels || [])];
          const baseCount = getBaseOptionCount(item.rarity);

          const isOptionLocked = (i: number) => i >= baseCount || lockedOptionIndices.includes(i);
          const unlockedCount = oldOptions.filter((_, i) => !isOptionLocked(i)).length;

          if (unlockedCount === 0) {
              setResultOverlay({
                  show: true,
                  data: {
                      type: 'warning',
                      title: '모든 옵션 고정됨',
                      message: '변경할 옵션이 없습니다. 고정을 해제할 옵션을 선택해 주세요.',
                      items: []
                  }
              });
              return;
          }

          const userLockCount = lockedOptionIndices.filter(i => i < baseCount).length;
          const { lockCostPerOption, baseManaCost, totalManaCost } = getOptionRerollCost(item, userLockCount);

          if ((res?.manaCrystal || 0) < totalManaCost) {
              setResultOverlay({
                  show: true,
                  data: {
                      type: 'warning',
                      title: '자원 부족',
                      message: '옵션 재설정에 필요한 마정석이 부족합니다.',
                      items: [
                          { label: '필요 마정석', after: `${totalManaCost}개 (기본 ${baseManaCost}개 + 고정 ${userLockCount}개 x ${lockCostPerOption}개)` },
                          { label: '보유 마정석', after: `${res?.manaCrystal || 0}개` }
                      ]
                  }
              });
              return;
          }

          setIsCrafting(true);

          const rawFreshOptions = generateLocalOptions(item.rarity, unlockedCount, item.type);
          const freshOptions = applyBlacksmithMasteryToOptions(rawFreshOptions, item.rarity, effectiveSmithLevel);
          let freshIdx = 0;

          const newOptions: string[] = [];
          const newLevels: number[] = [];

          for (let i = 0; i < oldOptions.length; i++) {
              if (isOptionLocked(i)) {
                  newOptions.push(oldOptions[i]);
                  newLevels.push(oldLevels[i] || 1);
              } else {
                  newOptions.push(freshOptions[freshIdx] || '추가 공격력 +3%');
                  newLevels.push(1);
                  freshIdx++;
              }
          }

          const rerolledItem: Item = { 
              ...item, 
              secondaryOptions: newOptions, 
              optionLevels: newLevels,
              elementalType: item.elementalType || extractElementalType(newOptions),
              rerollCount: currentRerollCount + 1
          };
          newInventory[selectedItemIdx] = rerolledItem;
          newChar.inventory = newInventory;
          newChar.base!.resources.manaCrystal -= totalManaCost;

          const cpDelta = calculateItemCPDelta(item, rerolledItem, character);
          const cpSign = cpDelta.diff >= 0 ? `+${cpDelta.diff.toLocaleString()}` : `${cpDelta.diff.toLocaleString()}`;

          setResultOverlay({
              show: true,
              data: {
                  type: 'success',
                  title: '옵션 재설정 완료',
                  message: `${item.name}의 옵션이 변경되었습니다. ${userLockCount > 0 ? `(선택 고정 ${userLockCount}개 유지)` : ''}`,
                  items: [
                      { label: '소모 마정석', after: `${totalManaCost}개` },
                      { label: '재설정 횟수', before: `${currentRerollCount}/10`, after: `${currentRerollCount + 1}/10` },
                      ...(rerolledItem.elementalType ? [{ label: '장비 속성', after: rerolledItem.elementalType, color: 'text-cyan-300' }] : []),
                      { 
                          label: '전투력 변동', 
                          before: `${cpDelta.oldCP.toLocaleString()}`, 
                          after: `${cpDelta.newCP.toLocaleString()} (${cpSign})`,
                          color: cpDelta.diff >= 0 ? 'text-emerald-400' : 'text-red-400'
                      },
                      ...newOptions.map((opt, i) => {
                          const isUserLocked = lockedOptionIndices.includes(i) && i < baseCount;
                          const isMilestoneLocked = i >= baseCount;
                          let lockBadge = '';
                          if (isUserLocked) lockBadge = ' [선택 고정]';
                          else if (isMilestoneLocked) lockBadge = ' [강화 고정]';

                          return {
                              label: (i < baseCount ? `옵션 ${i+1}` : `강화 옵션 (+${[5, 8, 10, 15, 20][i - baseCount]})`) + lockBadge, 
                              before: oldOptions[i] || '없음', 
                              after: opt 
                          };
                      })
                  ]
              }
          });
          onUpdateCharacter(newChar, `[시스템] ${item.name} 옵션 재설정 완료. (마정석 ${totalManaCost}개 소모${userLockCount > 0 ? `, ${userLockCount}개 고정` : ''})`);
          setIsCrafting(false);
      } 
      else if (type === 'reset_reroll') {
          const resetCost = 200; // Reset cost: 200 mana crystals
          if ((res?.manaCrystal || 0) < resetCost) {
              setResultOverlay({
                  show: true,
                  data: {
                      type: 'warning',
                      title: '자원 부족',
                      message: '재설정 횟수 초기화에 필요한 마정석이 부족합니다.',
                      items: [{ label: '부족', after: `마정석 ${resetCost - (res?.manaCrystal || 0)}개` }]
                  }
              });
              return;
          }
          
          newInventory[selectedItemIdx] = { ...item, rerollCount: 0 };
          newChar.inventory = newInventory;
          newChar.base!.resources.manaCrystal -= resetCost;
          setLockedOptionIndices([]);
          
          setResultOverlay({
              show: true,
              data: {
                  type: 'success',
                  title: '초기화 완료',
                  message: `${item.name}의 옵션 재설정 횟수가 초기화되었습니다.`,
                  items: [{ label: '재설정 횟수', before: `${item.rerollCount || 0}/10`, after: '0/10' }]
              }
          });
          onUpdateCharacter(newChar, `[시스템] ${item.name} 옵션 재설정 횟수 초기화 완료.`);
      } 
      else if (type === 'enhance' && typeof optionIdx === 'number') {
          const currentLevel = item.optionLevels?.[optionIdx] || 1;
          const maxLevel = item.optionMaxLevels?.[optionIdx] || newChar.optionMaxLevel || 5;
          if (currentLevel >= maxLevel) {
              setResultOverlay({
                  show: true,
                  data: {
                      type: 'warning',
                      title: '최대 레벨 달성',
                      message: `이미 최대 레벨(Lv.${maxLevel})입니다.`,
                      items: []
                  }
              });
              return;
          }
          
          const { goldCost, manaCost } = getOptionEnhanceCost(item, currentLevel);
          
          const missing = [];
          if (newChar.money < goldCost) missing.push(`골드 ${(goldCost - newChar.money).toLocaleString()}G`);
          if ((res?.manaCrystal || 0) < manaCost) missing.push(`마정석 ${manaCost - (res?.manaCrystal || 0)}개`);

          if (missing.length > 0) {
              setResultOverlay({
                  show: true,
                  data: {
                      type: 'warning',
                      title: '자원 부족',
                      message: '옵션 강화에 필요한 자원이 부족합니다.',
                      items: missing.map(m => ({ label: '부족', after: m }))
                  }
              });
              return;
          }
          
          const roll = Math.random() * 100;
          newChar.money -= goldCost;
          newChar.base!.resources.manaCrystal -= manaCost;

          if (roll < ((20 - (currentLevel * 2)) + bonusRate)) {
              const updatedEnhancedItem: Item = {
                  ...item,
                  optionLevels: [...(item.optionLevels || [])],
                  secondaryOptions: [...(item.secondaryOptions || [])]
              };
              if (!updatedEnhancedItem.optionLevels || updatedEnhancedItem.optionLevels.length === 0) {
                  updatedEnhancedItem.optionLevels = new Array(optionCount).fill(1);
              }
              updatedEnhancedItem.optionLevels[optionIdx] = currentLevel + 1;
              
              const oldOpt = item.secondaryOptions![optionIdx];
              const valMatch = oldOpt.match(/(\d+)/);
              let newOpt = oldOpt;
              if (valMatch) {
                  const val = parseInt(valMatch[1]);
                  const newVal = Math.floor(val * 1.1) + 1; 
                  newOpt = oldOpt.replace(val.toString(), newVal.toString());
                  updatedEnhancedItem.secondaryOptions![optionIdx] = newOpt;
              }
              
              newInventory[selectedItemIdx] = updatedEnhancedItem;
              newChar.inventory = newInventory;

              const cpDelta = calculateItemCPDelta(item, updatedEnhancedItem, character);
              const cpSign = cpDelta.diff >= 0 ? `+${cpDelta.diff.toLocaleString()}` : `${cpDelta.diff.toLocaleString()}`;

              setResultOverlay({ 
                  show: true, 
                  data: {
                      type: 'success', 
                      title: '옵션 강화 성공!', 
                      message: '옵션의 효과가 강화되었습니다.',
                      items: [
                          { label: '옵션', before: `${oldOpt} (Lv.${currentLevel})`, after: `${newOpt} (Lv.${currentLevel+1})` },
                          { 
                              label: '전투력 변동', 
                              before: `${cpDelta.oldCP.toLocaleString()}`, 
                              after: `${cpDelta.newCP.toLocaleString()} (${cpSign})`,
                              color: cpDelta.diff >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }
                      ]
                  } 
              });
              onUpdateCharacter(newChar, `[시스템] 옵션 강화 성공! (${updatedEnhancedItem.secondaryOptions![optionIdx]})`);
          } else {
              setResultOverlay({ 
                  show: true, 
                  data: {
                      type: 'failure', 
                      title: '옵션 강화 실패...', 
                      message: '강화에 실패하여 옵션 레벨이 유지되었습니다.',
                      items: [
                          { label: '결과', after: '변화 없음' },
                          { label: '전투력 변동', after: '변동 없음', color: 'text-slate-400' }
                      ]
                  } 
              });
              onUpdateCharacter(newChar, `[시스템] 옵션 강화 실패...`);
          }
      }
      else if (type === 'promote') {
          if (item.isPromoted) {
              setResultOverlay({
                  show: true,
                  data: {
                      type: 'warning',
                      title: '승급 불가',
                      message: '이미 승급을 완료한 장비는 더 이상 승급할 수 없습니다. (장비당 1회 제한)',
                      items: [{ label: '승급 상태', after: '이미 승급 완료됨' }]
                  }
              });
              return;
          }

          if (item.rarity === ItemRarity.LEGENDARY || item.rarity === ItemRarity.MYTHTIC) {
              setResultOverlay({
                  show: true,
                  data: {
                      type: 'warning',
                      title: '승급 불가',
                      message: '전설 및 신화 등급 아이템은 더 이상 승급할 수 없습니다.',
                      items: [{ label: '현재 등급', after: item.rarity }]
                  }
              });
              return;
          }

          const canPromote = (item.enhancement || 0) >= 5 && item.optionLevels?.every(l => l >= 5);
          if (!canPromote) {
              setResultOverlay({
                  show: true,
                  data: {
                      type: 'warning',
                      title: '승급 조건 미달',
                      message: '장비 승급을 위한 조건이 충족되지 않았습니다.',
                      items: [
                          { label: '필요 강화', before: `+${item.enhancement}`, after: '+5 이상' },
                          { label: '필요 옵션', before: '일부 미달', after: '모든 옵션 Lv.5' }
                      ]
                  }
              });
              return;
          }

          const promoConfig = PROMOTION_RULES[item.rarity];
          if (!promoConfig) return;

          const currentRes = res?.[promoConfig.resKey] || 0;
          if (currentRes < promoConfig.cost) {
              setResultOverlay({
                  show: true,
                  data: {
                      type: 'warning',
                      title: '승급 재료 부족',
                      message: '승급에 필요한 결정이 부족합니다.',
                      items: [{ label: '부족', after: `${promoConfig.resName} ${promoConfig.cost - currentRes}개` }]
                  }
              });
              return;
          }
          
          const rates = { [ItemRarity.NORMAL]: 80, [ItemRarity.MAGIC]: 60, [ItemRarity.RARE]: 40, [ItemRarity.EPIC]: 20, [ItemRarity.UNIQUE]: 10, [ItemRarity.LEGENDARY]: 0 };
          const successRate = rates[item.rarity] + bonusRate;
          const roll = Math.random() * 100;
          
          newChar.base!.resources[promoConfig.resKey] -= promoConfig.cost;

          if (roll < successRate) {
              const prevItemInfo = { ...newInventory[selectedItemIdx] };
              
              const nextRarity = promoConfig.next;
              const oldRarity = item.rarity;
              item.rarity = nextRarity;
              item.isPromoted = true;
              item.optionLevels = new Array(item.secondaryOptions?.length || 0).fill(1);
              
              const nextItemInfo = { ...item };
              newInventory[selectedItemIdx] = nextItemInfo;
              newChar.inventory = newInventory;
              
              setEquipmentEvolutionData({
                  prevItem: prevItemInfo,
                  nextItem: nextItemInfo
              });
              onUpdateCharacter(newChar, `[시스템] 장비 승급 성공! ${nextRarity} 등급이 되었습니다.`);
          } else {
              if (item.rarity === ItemRarity.UNIQUE || item.rarity === ItemRarity.EPIC) {
                  if (Math.random() < 0.05) {
                      const destroyCPDelta = calculateItemCPDelta(item, null, character);
                      newInventory.splice(selectedItemIdx, 1);
                      newChar.inventory = newInventory;
                      setResultOverlay({ 
                          show: true, 
                          data: {
                              type: 'destroy', 
                              title: '장비 파괴...', 
                              message: '승급 대실패로 인해 장비가 소멸했습니다.',
                              items: [
                                  { label: '결과', after: '파괴됨' },
                                  { label: '전투력 변동', before: `${destroyCPDelta.oldCP.toLocaleString()}`, after: `0 (${destroyCPDelta.diff.toLocaleString()})`, color: 'text-red-500' }
                              ]
                          } 
                      });
                      onUpdateCharacter(newChar, `[시스템] 장비 승급 대실패... 장비가 파괴되었습니다.`);
                      setSelectedItemIdx(null);
                      return;
                  }
              }
              setResultOverlay({ 
                  show: true, 
                  data: {
                      type: 'failure', 
                      title: '장비 승급 실패...', 
                      message: '승급에 실패하여 등급이 유지되었습니다.',
                      items: [
                          { label: '결과', after: '등급 유지' },
                          { label: '전투력 변동', after: '변동 없음', color: 'text-slate-400' }
                      ]
                  } 
              });
              onUpdateCharacter(newChar, `[시스템] 장비 승급 실패...`);
          }
      }
      }, 1000);
  };


  const canCraftRarity = (rarity: ItemRarity) => {
      // [MODIFIED] 제작소 레벨이 아닌 플레이어의 제작 숙련도 레벨에 따른 개방
      if (rarity === ItemRarity.NORMAL) return true;
      if (rarity === ItemRarity.MAGIC) return craftingLevel >= 5;
      if (rarity === ItemRarity.RARE) return craftingLevel >= 15;
      if (rarity === ItemRarity.EPIC) return craftingLevel >= 30;
      if (rarity === ItemRarity.UNIQUE) return craftingLevel >= 50;
      if (rarity === ItemRarity.LEGENDARY) return craftingLevel >= 80;
      if (rarity === ItemRarity.MYTHTIC) return craftingLevel >= 100;
      return false;
  };

  const getRefinementTabs = () => {
      const tabs = [];
      if (workshopLevel >= 1) tabs.push({ id: 'item_enhance', label: '기본 강화' });
      if (workshopLevel >= 2) tabs.push({ id: 'enhance', label: '옵션 강화' });
      if (workshopLevel >= 3) tabs.push({ id: 'reroll', label: '옵션 재설정' });
      if (workshopLevel >= 4) tabs.push({ id: 'promote', label: '장비 승급' });
      if (workshopLevel >= 5) tabs.push({ id: 'option_max_level', label: '옵션 최대 레벨 개방' });
      return tabs;
  };

  const renderItemCombatPowerCard = (targetItem: Item) => {
      const cpInfo = calculateItemCombatPowerContribution(targetItem, character);
      return (
          <div className="bg-slate-950 p-3.5 rounded-xl border border-purple-500/25 mb-3.5 space-y-2.5">
              <div className="flex items-center justify-between group relative">
                  <ItemTooltip item={targetItem} character={character} />
                  <div className="flex items-center gap-2.5 cursor-pointer">
                      <div className={`w-9 h-9 rounded-lg bg-slate-900 border flex items-center justify-center p-1 shrink-0 ${
                          targetItem.rarity === ItemRarity.MYTHTIC ? 'border-amber-400' :
                          targetItem.rarity === ItemRarity.LEGENDARY ? 'border-yellow-500' :
                          targetItem.rarity === ItemRarity.EPIC ? 'border-purple-500' :
                          targetItem.rarity === ItemRarity.RARE ? 'border-blue-500' : 'border-slate-800'
                      }`}>
                          <img src={getItemImage(targetItem)} alt={targetItem.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-100">{targetItem.name}</span>
                              {targetItem.enhancement ? (
                                  <span className="text-[10px] font-black text-amber-400 bg-amber-950/60 px-1 py-0.2 rounded border border-amber-800/60">
                                      +{targetItem.enhancement}
                                  </span>
                              ) : null}
                              {targetItem.elementalType && (
                                  <span className="text-[9px] font-bold text-cyan-300 bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-800/60">
                                      {targetItem.elementalType}
                                  </span>
                              )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-400">아이템 고유 전투력</span>
                              <span className="text-[9px] text-purple-400 font-medium">(마우스 오버 시 상세 툴팁)</span>
                          </div>
                      </div>
                  </div>
                  <span className="text-xs font-black font-mono text-amber-400">
                      {cpInfo.itemCP.toLocaleString()} CP
                  </span>
              </div>

              {/* 장착 상태 및 장착 가정 시뮬레이션 */}
              {cpInfo.isEquipped ? (
                  <div className="flex items-center justify-between text-xs bg-purple-950/40 px-3 py-2 rounded-lg border border-purple-800/30">
                      <span className="text-purple-300 font-semibold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          현재 착용 중인 장비
                      </span>
                      <span className="text-emerald-400 font-mono font-bold">
                          캐릭터 기여: +{(cpInfo.contributionCP ?? cpInfo.itemCP).toLocaleString()} CP
                      </span>
                  </div>
              ) : (
                  <div className="text-xs bg-slate-900/90 px-3 py-2.5 rounded-lg border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                          <span className="text-amber-400 font-bold flex items-center gap-1.5 text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                              장착 시뮬레이션 (미착용 장비)
                          </span>
                          <span className="text-slate-400 text-[10px]">
                              {cpInfo.equippedItem ? `기존 착용: ${cpInfo.equippedItem.name}` : '기존 슬롯 비어있음'}
                          </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 font-mono text-xs">
                          <span className="text-slate-400 text-[11px]">장착 시 예상 총 전투력</span>
                          <div className="flex items-center gap-1.5 font-bold">
                              <span className="text-slate-400">{cpInfo.currentCP?.toLocaleString()}</span>
                              <ArrowRight size={11} className="text-amber-400" />
                              <span className={(cpInfo.diffCP || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                  {cpInfo.newCP?.toLocaleString()} ({(cpInfo.diffCP || 0) >= 0 ? `+${(cpInfo.diffCP || 0).toLocaleString()}` : (cpInfo.diffCP || 0).toLocaleString()} CP)
                              </span>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 sm:p-4 font-sans">
      {isBlacksmithModalOpen && (
          <BlacksmithModal 
              character={character} 
              initialBlacksmithId={selectedSmithForModal}
              onClose={() => {
                  setIsBlacksmithModalOpen(false);
                  setSelectedSmithForModal(null);
              }} 
              onUpdateCharacter={onUpdateCharacter} 
          />
      )}
      <div className="bg-slate-950 w-full max-w-5xl h-[95vh] sm:h-[85vh] rounded-2xl border border-amber-600/30 shadow-2xl flex flex-col overflow-hidden relative">
        
        <div className="bg-slate-900 border-b border-slate-800 p-2 flex justify-between items-center text-xs font-mono overflow-x-auto no-scrollbar">
            <div className="flex items-center text-slate-400">
                <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 mr-2 text-amber-500">제작소 Lv.{workshopLevel}</span>
                {assignedBlacksmiths.length > 0 ? (
                    <span className="text-green-400 flex items-center gap-1">
                        <Hammer size={12} className="inline text-amber-400" />
                        담당 대장장이 ({assignedBlacksmiths.length}명): {assignedBlacksmiths.map(c => c.name).join(', ')} | 보너스: +{bonusRate.toFixed(1)}%
                    </span>
                ) : (
                    <span className="text-amber-500/80">담당 대장장이 미배치 (기지에서 대장장이 배치 가능)</span>
                )}
            </div>
            <div className="flex gap-4 items-center">
                <div className="flex items-center text-amber-400 shrink-0"><DollarSign size={12} className="mr-1"/> {character.money.toLocaleString()} G</div>
                <div className="flex items-center text-blue-400 shrink-0"><Package size={12} className="mr-1"/> 철: {character.base?.resources.iron || 0}</div>
                <div className="flex items-center text-purple-400 shrink-0"><Zap size={12} className="mr-1"/> 마정석: {character.base?.resources.manaCrystal || 0}</div>
                <div className="flex items-center gap-2 text-blue-400 font-bold border-l border-slate-700 pl-4 shrink-0">
                    <Hammer size={14} />
                    {craftingRankLabel} (Lv.{craftingLevel}) : {craftingExp} / {craftingMaxExp}
                </div>
                <div className="flex items-center space-x-2 border-l border-slate-700 pl-4 shrink-0">
                    <div className="flex items-center text-slate-400" title="노말 결정"><Gem size={10} className="mr-1"/> {character.base?.resources.normalCrystal || 0}</div>
                    <div className="flex items-center text-blue-400" title="마법 결정"><Gem size={10} className="mr-1"/> {character.base?.resources.magicCrystal || 0}</div>
                    <div className="flex items-center text-yellow-400" title="레어 결정"><Gem size={10} className="mr-1"/> {character.base?.resources.rareCrystal || 0}</div>
                    <div className="flex items-center text-purple-400" title="에픽 결정"><Gem size={10} className="mr-1"/> {character.base?.resources.epicCrystal || 0}</div>
                    <div className="flex items-center text-pink-400" title="유니크 결정"><Gem size={10} className="mr-1"/> {character.base?.resources.uniqueCrystal || 0}</div>
                    <div className="flex items-center text-amber-500" title="전설 결정"><Gem size={10} className="mr-1"/> {character.base?.resources.legendaryCrystal || 0}</div>
                </div>
            </div>
        </div>

        <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-amber-500 font-cinzel flex items-center">
                    <Hammer className="mr-2"/> 기지 제작소
                </h2>
                {onFacilityUpgrade && workshopLevel < 5 && (
                    <button 
                        onClick={() => onFacilityUpgrade('workshop', instanceId)}
                        className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded text-xs font-bold flex items-center transition-all shadow-lg shadow-green-900/20"
                    >
                        <ArrowUpCircle size={14} className="mr-1"/> 레벨업
                    </button>
                )}
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors">
                <X size={24} />
            </button>
        </div>

        <div className="flex border-b border-slate-800 bg-slate-900/50 shrink-0">
            <button onClick={() => setActiveTab('craft')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center transition-colors ${activeTab === 'craft' ? 'text-amber-400 border-b-2 border-amber-500 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}>
                <Anchor size={16} className="mr-2" /> 장비 제작 의뢰
            </button>
            <button onClick={() => setActiveTab('refine')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center transition-all border-b-2 ${activeTab === 'refine' ? 'text-purple-400 border-b-2 border-purple-500 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}>
                <Sparkles size={16} className="mr-2" /> 장비 개조/재련
            </button>
            <button onClick={() => setActiveTab('dismantle')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center transition-colors ${activeTab === 'dismantle' ? 'text-green-400 border-b-2 border-green-500 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}>
                <Recycle size={16} className="mr-2" /> 분해
            </button>
        </div>

        <div className="flex-1 overflow-hidden relative flex">
            
            {resultOverlay.show && (
                <ActionResultModal 
                    data={resultOverlay.data} 
                    onClose={() => setResultOverlay({ show: false, data: null })} 
                />
            )}

            {activeTab === 'craft' && (
                <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
                    <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-800 p-3 sm:p-4 overflow-y-auto custom-scrollbar bg-slate-900/50 max-h-[35vh] xs:max-h-[40vh] md:max-h-none shrink-0">
                        <div className="mb-6 bg-slate-950 p-4 rounded-xl border border-amber-500/30">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold text-amber-500 uppercase flex items-center gap-2">
                                    <Users size={14}/> 담당 대장장이 의뢰
                                </h4>
                                <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800/50 px-2 py-0.5 rounded-full font-bold">
                                    {assignedBlacksmiths.length}명 배치됨
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
                                제작소에 배치된 대장장이 동료들에게 전용 장비 제작을 직접 의뢰할 수 있습니다.
                            </p>
                            
                            {assignedBlacksmiths.length > 0 ? (
                                <div className="space-y-2 mb-3">
                                    {assignedBlacksmiths.map(smith => {
                                        const rankCfg = BS_RANK_CONFIG[smith.blacksmithRank || BlacksmithRank.BEGINNER];
                                        return (
                                            <div key={smith.id} className="p-2.5 bg-slate-900/90 border border-amber-700/40 rounded-lg flex items-center justify-between gap-2 hover:border-amber-500 transition-colors">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-bold text-slate-200 truncate">{smith.name}</span>
                                                        <span className="text-[9px] bg-amber-900/60 text-amber-300 px-1.5 py-0.5 rounded border border-amber-700 font-bold shrink-0">
                                                            {rankCfg.label}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                                        숙련도: {smith.blacksmithMastery || 0}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setSelectedSmithForModal(smith.id);
                                                        setIsBlacksmithModalOpen(true);
                                                    }}
                                                    className="px-2.5 py-1.5 bg-amber-700 hover:bg-amber-600 text-white rounded text-[11px] font-bold flex items-center gap-1 transition-transform active:scale-95 shadow shrink-0"
                                                >
                                                    <Hammer size={12}/> 의뢰하기
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 text-[11px] text-slate-500 mb-3 text-center">
                                    배치된 대장장이가 없습니다.<br/>기지에서 대장장이 동료를 제작소에 배치해주세요.
                                </div>
                            )}

                            <button 
                                onClick={() => {
                                    setSelectedSmithForModal(assignedBlacksmiths[0]?.id || null);
                                    setIsBlacksmithModalOpen(true);
                                }}
                                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <Hammer size={13}/> 전체 대장장이 의뢰 창 열기
                            </button>
                        </div>

                        <div className="mb-4">
                            <label className="text-xs text-slate-500 font-bold uppercase mb-2 block">카테고리</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Weapon', 'SubWeapon', 'Armor', 'Accessory'].map((cat, catIdx) => (
                                    <button 
                                        key={`${cat}-${catIdx}`}
                                        onClick={() => {
                                            setSelectedCategory(cat as any);
                                            if(cat === 'Weapon') { setSelectedMainType(WEAPON_TYPES[0].label); setSelectedSubType(WEAPON_TYPES[0].subTypes[0]); }
                                            if(cat === 'SubWeapon') { setSelectedMainType(SUB_WEAPON_TYPES[0].label); setSelectedSubType(SUB_WEAPON_TYPES[0].subTypes[0]); }
                                            if(cat === 'Armor') { setSelectedMainType(ARMOR_TYPES[0].label); setSelectedSubType(ARMOR_TYPES[0].subTypes[0]); }
                                            if(cat === 'Accessory') { setSelectedMainType(ACCESSORY_TYPES[0].label); setSelectedSubType(ACCESSORY_TYPES[0].subTypes[0]); }
                                        }}
                                        className={`py-2 px-3 text-xs rounded border transition-colors ${selectedCategory === cat ? 'bg-amber-900/50 border-amber-500 text-amber-200' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="text-xs text-slate-500 font-bold uppercase mb-2 block">아이템 타입</label>
                            <div className="space-y-1">
                                {(selectedCategory === 'Weapon' ? WEAPON_TYPES : selectedCategory === 'SubWeapon' ? SUB_WEAPON_TYPES : selectedCategory === 'Armor' ? ARMOR_TYPES : ACCESSORY_TYPES).map((t, tIdx) => (
                                    <button 
                                        key={`${t.label}-${tIdx}`} 
                                        onClick={() => { setSelectedMainType(t.label); setSelectedSubType(t.subTypes[0]); }}
                                        className={`w-full text-left py-2 px-3 text-xs rounded transition-colors ${selectedMainType === t.label ? 'bg-slate-800 text-white font-bold' : 'text-slate-500 hover:bg-slate-800/50'}`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-slate-500 font-bold uppercase mb-2 block">세부 사항</label>
                            <div className="flex flex-wrap gap-2">
                                {getSubTypes().map((sub, subIdx) => (
                                    <button 
                                        key={`${sub}-${subIdx}`} 
                                        onClick={() => setSelectedSubType(sub)}
                                        className={`py-1 px-3 text-xs rounded border transition-colors ${selectedSubType === sub ? 'bg-indigo-900/50 border-indigo-500 text-indigo-200' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                                    >
                                        {sub}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 p-6 flex flex-col overflow-y-auto bg-slate-900">
                        <h3 className="text-lg font-bold text-amber-500 mb-6 flex items-center">
                            <Anchor size={20} className="mr-2"/> 장비 제작 설정
                        </h3>

                        {(!assignee || assignee.job !== JobType.BLACKSMITH) && (
                            <div className="bg-red-900/20 border border-red-500 p-4 rounded-xl mb-6 flex gap-3 animate-pulse">
                                <AlertTriangle className="text-red-500 shrink-0" size={20}/>
                                <div>
                                    <p className="text-sm font-bold text-red-200">대장장이 부재</p>
                                    <p className="text-xs text-red-400">장비 제작을 의뢰하려면 [대장장이] 직업의 동료를 제작소 담당자로 배치해야 합니다.</p>
                                </div>
                            </div>
                        )}
                        
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-bold text-slate-300">제작할 아이템</span>
                                <span className="text-xs text-slate-500">{selectedCategory} / {selectedSubType}</span>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                                <div>
                                    <label className="text-xs text-slate-500 uppercase block mb-1">장비 단계</label>
                                    <select 
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-amber-500 outline-none"
                                        value={selectedRarity}
                                        onChange={(e) => setSelectedRarity(e.target.value as ItemRarity)}
                                    >
                                        {Object.values(ItemRarity).map(r => {
                                            const locked = !canCraftRarity(r);
                                            let reqLevel = 1;
                                            if (r === ItemRarity.MAGIC) reqLevel = 5;
                                            if (r === ItemRarity.RARE) reqLevel = 15;
                                            if (r === ItemRarity.EPIC) reqLevel = 30;
                                            if (r === ItemRarity.UNIQUE) reqLevel = 50;
                                            if (r === ItemRarity.LEGENDARY) reqLevel = 80;
                                            if (r === ItemRarity.MYTHTIC) reqLevel = 100;
                                            
                                            return (
                                                <option key={r} value={r} disabled={locked}>
                                                    {r} {locked ? `(제작 Lv.${reqLevel} 필요)` : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase block mb-1">성공률</label>
                                    <div className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-green-400 font-mono">
                                        {Math.min(100, Math.round((RARITY_CONFIG[selectedRarity].success + bonusRate) * 10) / 10)}%
                                    </div>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="text-xs text-slate-500 uppercase block mb-1">소요 기간</label>
                                    <div className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-amber-400 font-mono flex items-center justify-between">
                                        <span>{currentCraftingTime}일</span>
                                        {masteryTimeReduction > 0 && (
                                            <span className="text-[10px] text-emerald-400 font-sans font-bold">
                                                (-{Math.round(masteryTimeReduction * 100)}%)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mb-2">
                                <label className="text-xs text-slate-500 uppercase block mb-1">이름 설정 (선택 사항)</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-amber-500 outline-none"
                                    placeholder={`${selectedRarity} ${selectedSubType}`}
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">필요 자원</h4>
                            <div className="grid grid-cols-3 gap-3 text-xs">
                                {(() => {
                                    const cost = getCraftingCost();
                                    const res = character.base?.resources;
                                    const crystalKey = getCrystalKey(selectedRarity);
                                    
                                    return (
                                        <>
                                            <div className="flex justify-between items-center bg-slate-900 p-2 rounded">
                                                <span className="text-blue-400">철광석</span>
                                                <span className={(res?.iron || 0) >= cost.iron ? 'text-white' : 'text-red-500'}>{cost.iron}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-slate-900 p-2 rounded">
                                                <span className="text-green-400">목재</span>
                                                <span className={(res?.wood || 0) >= cost.wood ? 'text-white' : 'text-red-500'}>{cost.wood}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-slate-900 p-2 rounded">
                                                <span className="text-amber-400">골드</span>
                                                <span className={character.money >= cost.gold ? 'text-white' : 'text-red-500'}>{cost.gold.toLocaleString()}</span>
                                            </div>
                                                   {cost.mana > 0 && (
                                                <div className="flex justify-between items-center bg-slate-900 p-2 rounded">
                                                    <span className="text-purple-400">마정석</span>
                                                    <span className={(res?.manaCrystal || 0) >= cost.mana ? 'text-white' : 'text-red-500'}>{cost.mana}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center bg-slate-900 p-2 rounded col-span-2">
                                                <span className="text-pink-400 flex items-center">{getCrystalIcon(selectedRarity)} <span className="ml-1">{selectedRarity === ItemRarity.MYTHTIC ? '전설' : selectedRarity} 결정</span></span>
                                                <span className={(res?.[crystalKey] || 0) >= cost.crystal ? 'text-white' : 'text-red-500'}>{cost.crystal}</span>
                                            </div>
                                            
                                            {cost.silverOre > 0 && <div className="flex justify-between items-center text-xs"><span className="text-slate-300">은광석</span><span className={((res as any)?.silver_ore || 0) >= cost.silverOre ? 'text-white' : 'text-red-500'}>{cost.silverOre}</span></div>}
                                      {cost.goldOre > 0 && <div className="flex justify-between items-center text-xs"><span className="text-yellow-500">금광석</span><span className={((res as any)?.gold_ore || 0) >= cost.goldOre ? 'text-white' : 'text-red-500'}>{cost.goldOre}</span></div>}
                                      {cost.ruby > 0 && <div className="flex justify-between items-center text-xs"><span className="text-red-500">루비</span><span className={((res as any)?.ruby || 0) >= cost.ruby ? 'text-white' : 'text-red-500'}>{cost.ruby}</span></div>}
                                      {cost.sapphire > 0 && <div className="flex justify-between items-center text-xs"><span className="text-blue-500">사파이어</span><span className={((res as any)?.sapphire || 0) >= cost.sapphire ? 'text-white' : 'text-red-500'}>{cost.sapphire}</span></div>}
                                      {cost.emerald > 0 && <div className="flex justify-between items-center text-xs"><span className="text-green-500">에메랄드</span><span className={((res as any)?.emerald || 0) >= cost.emerald ? 'text-white' : 'text-red-500'}>{cost.emerald}</span></div>}
                                      {cost.diamond > 0 && <div className="flex justify-between items-center text-xs"><span className="text-cyan-300">다이아몬드</span><span className={((res as any)?.diamond || 0) >= cost.diamond ? 'text-white' : 'text-red-500'}>{cost.diamond}</span></div>}
                                      {cost.holyStone > 0 && <div className="flex justify-between items-center text-xs"><span className="text-yellow-200">신성석</span><span className={((res as any)?.holy_stone || 0) >= cost.holyStone ? 'text-white' : 'text-red-500'}>{cost.holyStone}</span></div>}
                                      
                                      {cost.essence > 0 && (
                                                <div className="flex justify-between items-center bg-slate-900 p-2 rounded col-span-1">
                                                    <span className="text-purple-300">마력의 정수</span>
                                                    <span className={character.inventory.filter(i => i.name === '마력의 정수').length >= cost.essence ? 'text-white' : 'text-red-500'}>{cost.essence}</span>
                                                </div>
                                            )}
                                            {cost.beastLeather > 0 && (
                                                <div className="flex justify-between items-center bg-slate-900 p-2 rounded col-span-1">
                                                    <span className="text-orange-300">수인족의 가죽</span>
                                                    <span className={character.inventory.filter(i => i.name === '수인족의 가죽').length >= cost.beastLeather ? 'text-white' : 'text-red-500'}>{cost.beastLeather}</span>
                                                </div>
                                            )}
                                            {cost.sanctuaryBranch > 0 && (
                                                <div className="flex justify-between items-center bg-slate-900 p-2 rounded col-span-1">
                                                    <span className="text-emerald-300">성역의 나뭇가지</span>
                                                    <span className={character.inventory.filter(i => i.name === '성역의 나뭇가지').length >= cost.sanctuaryBranch ? 'text-white' : 'text-red-500'}>{cost.sanctuaryBranch}</span>
                                                </div>
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
                                                    
                                                    {/* [NEW] 수확 작물 및 광석 UI */}
                                                    {cost.worldTreeBranch > 0 && (
                                                        <div className="flex justify-between items-center bg-slate-900 p-2 rounded col-span-1">
                                                            <span className="text-emerald-400">세계수의 가지</span>
                                                            <span className={((res as any)?.world_tree_branch || 0) >= cost.worldTreeBranch ? 'text-white' : 'text-red-500'}>{cost.worldTreeBranch}</span>
                                                        </div>
                                                    )}
                                                    {cost.shinryokuFlower > 0 && (
                                                        <div className="flex justify-between items-center bg-slate-900 p-2 rounded col-span-1">
                                                            <span className="text-pink-400">신력 꽃</span>
                                                            <span className={((res as any)?.shinryoku_flower || 0) >= cost.shinryokuFlower ? 'text-white' : 'text-red-500'}>{cost.shinryokuFlower}</span>
                                                        </div>
                                                    )}
                                                    {cost.goldOre > 0 && (
                                                        <div className="flex justify-between items-center bg-slate-900 p-2 rounded col-span-1">
                                                            <span className="text-yellow-500">금광석</span>
                                                            <span className={((res as any)?.gold_ore || 0) >= cost.goldOre ? 'text-white' : 'text-red-500'}>{cost.goldOre}</span>
                                                        </div>
                                                    )}
                                                    {cost.silverOre > 0 && (
                                                        <div className="flex justify-between items-center bg-slate-900 p-2 rounded col-span-1">
                                                            <span className="text-slate-300">은광석</span>
                                                            <span className={((res as any)?.silver_ore || 0) >= cost.silverOre ? 'text-white' : 'text-red-500'}>{cost.silverOre}</span>
                                                        </div>
                                                    )}
                                                    {cost.diamond > 0 && (
                                                        <div className="flex justify-between items-center bg-slate-900 p-2 rounded col-span-1">
                                                            <span className="text-cyan-300">다이아몬드</span>
                                                            <span className={((res as any)?.diamond || 0) >= cost.diamond ? 'text-white' : 'text-red-500'}>{cost.diamond}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
       <div className="mt-auto">
                            <button 
                                onClick={handleCraft} 
                                disabled={isCrafting || !assignee || assignee.job !== JobType.BLACKSMITH}
                                className="w-full py-4 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-lg shadow-lg flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCrafting ? <Loader2 className="animate-spin mr-2"/> : <Hammer className="mr-2"/>}
                                {isCrafting ? '제작 진행 중...' : '의뢰 개시'}
                            </button>
                            <p className="text-xs text-slate-500 text-center mt-2">
                                * 제작 의뢰 시 동료는 작업에 집중하며 {currentCraftingTime}일이 소요됩니다.{masteryTimeReduction > 0 ? ` (대장장이 숙련도로 ${Math.round(masteryTimeReduction * 100)}% 단축)` : ''}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'refine' && (
                <div className="flex-1 flex flex-col h-full">
                    <div className="flex border-b border-slate-800 bg-slate-900 shrink-0">
                        {getRefinementTabs().map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setRefineSubTab(tab.id as any)}
                                className={`flex-1 py-3 text-xs font-bold transition-colors ${refineSubTab === tab.id ? 'text-purple-400 bg-slate-800 border-b-2 border-purple-500' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        <div className="w-full md:w-2/5 border-b md:border-b-0 md:border-r border-slate-800 p-2.5 sm:p-3 overflow-y-auto custom-scrollbar bg-slate-950/60 shrink-0 max-h-[35vh] xs:max-h-[40vh] md:max-h-none flex flex-col">
                            <div className="text-[11px] font-bold text-purple-400 mb-2 flex items-center justify-between px-1 flex-wrap gap-1">
                                <span>개조/재련 대상 장비 ({getSortedRefineEquipments().length}개)</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-500 font-bold shrink-0">정렬</span>
                                    <select
                                        value={refineSort}
                                        onChange={(e) => setRefineSort(e.target.value as any)}
                                        className="bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-medium rounded-lg px-2 py-0.5 outline-none focus:border-purple-500 cursor-pointer"
                                    >
                                        <option value="rarity_desc">등급 높은 순</option>
                                        <option value="rarity_asc">등급 낮은 순</option>
                                        <option value="name_asc">이름 순</option>
                                        <option value="enhancement_desc">강화 높은 순</option>
                                        <option value="cp_desc">전투력 높은 순</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-1.5 flex-1 overflow-y-auto custom-scrollbar">
                                {getSortedRefineEquipments().map(({ item, idx }) => {
                                    const isSelected = selectedItemIdx === idx;
                                    
                                    return (
                                        <div 
                                            key={idx} 
                                            onClick={() => { setSelectedItemIdx(idx); setEnhanceFx('none'); setLockedOptionIndices([]); }}
                                            className={`group relative p-2 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                                                isSelected 
                                                    ? 'bg-purple-950/60 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.25)]' 
                                                    : 'bg-slate-900/80 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
                                            }`}
                                        >
                                            <ItemTooltip item={item} character={character} />
                                            <div className={`w-10 h-10 rounded-lg bg-slate-950 border shrink-0 overflow-hidden flex items-center justify-center p-1 relative ${
                                                item.rarity === ItemRarity.MYTHTIC ? 'border-amber-400' :
                                                item.rarity === ItemRarity.LEGENDARY ? 'border-yellow-500' :
                                                item.rarity === ItemRarity.EPIC ? 'border-purple-500' :
                                                item.rarity === ItemRarity.RARE ? 'border-blue-500' : 'border-slate-800'
                                            }`}>
                                                <img src={getItemImage(item)} alt={item.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-purple-200' : 'text-slate-200'}`}>
                                                        {item.name}
                                                    </span>
                                                    {item.enhancement ? (
                                                        <span className="text-[10px] font-black text-amber-400 bg-amber-950/60 px-1 py-0.2 rounded border border-amber-800/60 shrink-0">
                                                            +{item.enhancement}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <span>{item.type}</span>
                                                    <span>•</span>
                                                    <span className="text-slate-500">{item.rarity}</span>
                                                    {item.elementalType && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-cyan-400 font-bold bg-cyan-950/50 px-1 rounded border border-cyan-800/50">{item.elementalType}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {getSortedRefineEquipments().length === 0 && (
                                    <p className="text-center py-12 text-slate-600 text-xs italic">
                                        개조/재련 가능한 장비 아이템이 없습니다.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 p-4 sm:p-6 bg-slate-900 overflow-y-auto custom-scrollbar">
                            {selectedItemIdx !== null && character.inventory[selectedItemIdx] ? (
                                (() => {
                                    const item = character.inventory[selectedItemIdx];
                                    
                                    if (refineSubTab === 'item_enhance') {
                                        const cost = getItemEnhanceCost(item);
                                        const rate = getItemEnhanceRate(item) + masterySuccessBonus;
                                        const currentEnh = item.enhancement || 0;
                                        const maxEnh = ENHANCEMENT_CAPS[item.rarity] || 5;
                                        const isMax = currentEnh >= maxEnh;

                                        const res = character.base?.resources;
                                        const hasIron = (res?.iron || 0) >= cost.iron;
                                        const hasGold = character.money >= cost.gold;
                                        const hasMana = (res?.manaCrystal || 0) >= cost.mana;
                                        const canAfford = hasIron && hasGold && hasMana && !isMax;

                                        return (
                                            <div className="space-y-5 animate-in fade-in duration-300">
                                                {/* BLACKSMITH ENHANCEMENT FORGE CARD */}
                                                <div className={`relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-2xl border p-4 sm:p-6 shadow-2xl overflow-hidden transition-all duration-300 ${
                                                    enhanceFx === 'success' 
                                                        ? 'border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)]' 
                                                        : enhanceFx === 'failure' 
                                                        ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]' 
                                                        : 'border-purple-500/30 shadow-purple-950/30'
                                                }`}>
                                                    {/* Background Ambient Forge Glow */}
                                                    <div className="absolute -top-16 -left-16 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
                                                    <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                                                    {/* SUCCESS / FAILURE FLOATING BANNER */}
                                                    {enhanceFx === 'success' && (
                                                        <div className="absolute inset-x-0 top-3 z-20 flex justify-center animate-in zoom-in-90 duration-300">
                                                            <div className="bg-amber-500 text-slate-950 font-black px-4 py-1 rounded-full text-xs shadow-lg shadow-amber-500/40 border-2 border-white flex items-center gap-1.5">
                                                                <Sparkles size={14} /> ★ 강화 성공! (+{currentEnh}) ★
                                                            </div>
                                                        </div>
                                                    )}
                                                    {enhanceFx === 'failure' && (
                                                        <div className="absolute inset-x-0 top-3 z-20 flex justify-center animate-in zoom-in-90 duration-300">
                                                            <div className="bg-red-600 text-white font-black px-4 py-1 rounded-full text-xs shadow-lg shadow-red-900/50 border-2 border-red-300 flex items-center gap-1.5">
                                                                <AlertCircle size={14} /> ⚡ 강화 실패...
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* ANIMATION OVERLAY */}
                                                    {isEnhancing && (
                                                        <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 rounded-2xl animate-in fade-in duration-200">
                                                            <div className="relative mb-3">
                                                                <div className="absolute -inset-4 rounded-full bg-purple-500/30 animate-ping" />
                                                                <div className="w-16 h-16 rounded-full bg-purple-900/80 border-2 border-purple-400 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                                                                    <Hammer size={32} className="text-purple-200 animate-spin" />
                                                                </div>
                                                            </div>
                                                            <p className="text-sm font-bold text-purple-200 animate-pulse">대장장이의 망치질 진행 중...</p>
                                                            <p className="text-[11px] text-slate-400 mt-1">마법의 불길이 장비에 스며듭니다</p>
                                                        </div>
                                                    )}

                                                    {/* ITEM STAGE */}
                                                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-6">
                                                        <div className="relative shrink-0 group cursor-pointer">
                                                            <ItemTooltip item={item} character={character} />
                                                            <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-950 border-2 p-2 flex items-center justify-center overflow-hidden transition-all shadow-inner ${
                                                                item.rarity === ItemRarity.MYTHTIC ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]' :
                                                                item.rarity === ItemRarity.LEGENDARY ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.25)]' :
                                                                item.rarity === ItemRarity.EPIC ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.25)]' :
                                                                item.rarity === ItemRarity.RARE ? 'border-blue-500' : 'border-slate-800'
                                                            }`}>
                                                                <img 
                                                                    src={getItemImage(item)} 
                                                                    alt={item.name} 
                                                                    className={`w-full h-full object-contain transition-transform duration-300 ${enhanceFx === 'success' ? 'scale-110 rotate-3' : ''}`} 
                                                                    referrerPolicy="no-referrer" 
                                                                />
                                                            </div>
                                                            <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black px-2.5 py-0.5 rounded-lg text-xs border border-white/40 shadow-md">
                                                                +{currentEnh}
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 text-center sm:text-left min-w-0">
                                                            <div className="flex flex-wrap items-center gap-1.5 justify-center sm:justify-start">
                                                                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                                                                    item.rarity === ItemRarity.MYTHTIC ? 'text-amber-400' :
                                                                    item.rarity === ItemRarity.LEGENDARY ? 'text-yellow-400' :
                                                                    item.rarity === ItemRarity.EPIC ? 'text-purple-400' :
                                                                    item.rarity === ItemRarity.RARE ? 'text-blue-400' : 'text-slate-400'
                                                                }`}>
                                                                    {item.rarity} • {item.type}
                                                                </span>
                                                                {item.elementalType && (
                                                                    <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-800/80">
                                                                        {item.elementalType}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <h3 className="text-lg sm:text-xl font-bold text-white truncate mt-0.5">{item.name}</h3>
                                                            
                                                            {/* STAT PREVIEW */}
                                                            <div className="mt-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                                                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center justify-between">
                                                                    <span>능력치 수치</span>
                                                                    <span className="text-amber-400">강화 한도: +{maxEnh}</span>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                                    {item.stats && Object.entries(item.stats).map(([k, v], sIdx) => {
                                                                        const curVal = getEnhancedStatValue(Number(v), currentEnh, k);
                                                                        const nextVal = getEnhancedStatValue(Number(v), currentEnh + 1, k);
                                                                        const diff = nextVal - curVal;
                                                                        return (
                                                                            <div key={`${k}-${sIdx}`} className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800 flex justify-between items-center">
                                                                                <span className="text-slate-400 uppercase font-bold text-[10px]">{k}</span>
                                                                                <div className="flex items-center gap-1 font-mono">
                                                                                    <span className="text-slate-300">{curVal}</span>
                                                                                    {!isMax && (
                                                                                        <>
                                                                                            <ArrowRight size={10} className="text-slate-500" />
                                                                                            <span className="text-green-400 font-bold">{nextVal} {diff > 0 ? `(+${diff})` : ''}</span>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>

                                                                {/* ITEM COMBAT POWER PREVIEW */}
                                                                {(() => {
                                                                    const nextPreviewItem = { ...item, enhancement: currentEnh + 1 };
                                                                    const cpDelta = calculateItemCPDelta(item, nextPreviewItem, character);
                                                                    const cpInfo = calculateItemCombatPowerContribution(item, character);
                                                                    return (
                                                                        <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-1">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                                                                                    <Sword size={12} className="text-amber-400" />
                                                                                    {cpInfo.isEquipped ? '전투력 변동' : '장착 시뮬레이션 전투력'}
                                                                                </span>
                                                                                <div className="flex items-center gap-1.5 font-mono text-xs">
                                                                                    <span className="text-slate-300">{cpDelta.oldCP.toLocaleString()}</span>
                                                                                    {!isMax && (
                                                                                        <>
                                                                                            <ArrowRight size={11} className="text-indigo-400" />
                                                                                            <span className="text-emerald-400 font-bold">
                                                                                                {cpDelta.newCP.toLocaleString()} (+{cpDelta.diff.toLocaleString()})
                                                                                            </span>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            {!cpInfo.isEquipped && (
                                                                                <div className="text-[10px] text-amber-400/80 flex items-center justify-end">
                                                                                    * 미착용 장비 (장착 가정 비교)
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* SUCCESS RATE GAUGE */}
                                                    <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 mb-4">
                                                        <div className="flex justify-between items-center mb-1.5 text-xs">
                                                            <span className="font-bold text-slate-300 flex items-center gap-1"><Sparkles size={13} className="text-amber-400" /> 강화 성공 확률</span>
                                                            <span className={`font-mono font-bold text-sm ${rate > 70 ? 'text-green-400' : rate > 40 ? 'text-amber-400' : 'text-red-400'}`}>
                                                                {isMax ? '최대 레벨' : `${rate.toFixed(1)}%`}
                                                            </span>
                                                        </div>
                                                        {!isMax && (
                                                            <div className="w-full bg-slate-900 rounded-full h-2.5 border border-slate-800 overflow-hidden p-0.5">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                                        rate > 70 ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
                                                                        rate > 40 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                                                                        'bg-gradient-to-r from-red-600 to-orange-500'
                                                                    }`} 
                                                                    style={{ width: `${Math.min(100, Math.max(0, rate))}%` }} 
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* RESOURCE REQUIREMENT CHECKLIST */}
                                                    <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 mb-5">
                                                        <span className="text-[11px] font-bold text-slate-400 block mb-2">필요 재료</span>
                                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                                            <div className={`p-2 rounded-lg border flex flex-col items-center justify-center text-center ${hasIron ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300' : 'bg-red-950/30 border-red-800/60 text-red-400'}`}>
                                                                <span className="text-[10px] text-slate-400">철광석</span>
                                                                <span className="font-bold font-mono mt-0.5">{cost.iron}개</span>
                                                            </div>
                                                            <div className={`p-2 rounded-lg border flex flex-col items-center justify-center text-center ${hasGold ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300' : 'bg-red-950/30 border-red-800/60 text-red-400'}`}>
                                                                <span className="text-[10px] text-slate-400">골드</span>
                                                                <span className="font-bold font-mono mt-0.5">{cost.gold.toLocaleString()}G</span>
                                                            </div>
                                                            <div className={`p-2 rounded-lg border flex flex-col items-center justify-center text-center ${hasMana ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300' : 'bg-red-950/30 border-red-800/60 text-red-400'}`}>
                                                                <span className="text-[10px] text-slate-400">마정석</span>
                                                                <span className="font-bold font-mono mt-0.5">{cost.mana}개</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* ACTION BUTTONS */}
                                                    <div className="flex flex-col sm:flex-row gap-2.5">
                                                        <button 
                                                            onClick={handleItemEnhanceLocal}
                                                            disabled={isEnhancing || isMax}
                                                            className={`flex-1 py-3.5 sm:py-4 rounded-xl font-black text-white text-sm sm:text-base shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 ${
                                                                isMax
                                                                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                                                    : canAfford 
                                                                    ? 'bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 shadow-purple-900/30 border border-purple-400/30' 
                                                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                                            }`}
                                                        >
                                                            <Hammer size={18} className={isEnhancing ? 'animate-bounce' : ''} />
                                                            {isMax ? '최대 강화 달성' : `1회 강화 (+${currentEnh + 1})`}
                                                        </button>

                                                        {!isMax && (
                                                            <button 
                                                                onClick={handleBatchItemEnhanceLocal}
                                                                disabled={isEnhancing || !canAfford}
                                                                className="flex-1 py-3.5 sm:py-4 rounded-xl font-black text-white text-sm sm:text-base shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 shadow-amber-950/40 border border-amber-400/50 animate-pulse disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-none"
                                                                title="성공할 때까지 자동으로 연속 강화를 진행합니다."
                                                            >
                                                                <Sparkles size={18} className="text-yellow-200" />
                                                                <span>성공할 때까지 연속 강화</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (refineSubTab === 'reroll') {
                                        const baseCount = getBaseOptionCount(item.rarity);
                                        const rerollCount = item.rerollCount || 0;
                                        const optionCount = item.secondaryOptions?.length || 0;
                                        const userLockCount = lockedOptionIndices.filter(i => i < baseCount).length;
                                        const { lockCostPerOption, baseManaCost, totalManaCost } = getOptionRerollCost(item, userLockCount);
                                        const ownedManaCrystals = character.base?.resources?.manaCrystal || 0;
                                        const hasEnoughMana = ownedManaCrystals >= totalManaCost;

                                        const toggleLock = (i: number) => {
                                            if (i >= baseCount) return;
                                            if (lockedOptionIndices.includes(i)) {
                                                setLockedOptionIndices(lockedOptionIndices.filter(idx => idx !== i));
                                            } else {
                                                setLockedOptionIndices([...lockedOptionIndices, i]);
                                            }
                                        };

                                        return (
                                            <div className="space-y-5 relative">
                                                {isRefining && (
                                                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center rounded-2xl animate-in fade-in duration-300">
                                                        <div className="relative mb-6">
                                                            <div className="absolute -inset-4 rounded-full bg-purple-500/20 animate-ping"></div>
                                                            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-500 flex items-center justify-center shadow-2xl shadow-purple-500/50 animate-spin" style={{ animationDuration: '2.5s' }}>
                                                                <Sparkles size={36} className="text-amber-300 animate-pulse" />
                                                            </div>
                                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl">
                                                                🔮
                                                            </div>
                                                        </div>
                                                        <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-purple-300 to-indigo-300 mb-2">
                                                            마법 연금 룬 합성 중...
                                                        </h3>
                                                        <p className="text-xs text-slate-400 max-w-xs animate-pulse">
                                                            고대 마나 결정의 에너지로 옵션을 재구성하고 승급 오라를 주입하고 있습니다.
                                                        </p>
                                                    </div>
                                                )}
                                                <h3 className="text-lg font-bold text-purple-400 mb-2">옵션 재설정</h3>
                                                
                                                {/* ITEM COMBAT POWER INDICATOR */}
                                                {renderItemCombatPowerCard(item)}

                                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h4 className="text-xs text-slate-400 font-bold uppercase">현재 옵션 목록</h4>
                                                            {item.elementalType && (
                                                                <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-800/60">
                                                                    속성: {item.elementalType}
                                                                </span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowRerollPoolModal(true)}
                                                                className="text-[10px] bg-purple-950/80 hover:bg-purple-900 text-purple-300 hover:text-white px-2 py-0.5 rounded border border-purple-500/50 flex items-center gap-1 font-bold transition-all shadow-sm"
                                                            >
                                                                <Sparkles size={11} className="text-amber-400" /> 옵션 목록 확인
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <span className={`text-xs font-bold ${(item.rerollCount || 0) >= 10 ? 'text-red-400' : 'text-slate-400'}`}>
                                                                재설정: {item.rerollCount || 0}/10
                                                            </span>
                                                            {(item.rerollCount || 0) > 0 && (
                                                                <button 
                                                                    onClick={() => handleRefine('reset_reroll')}
                                                                    className="text-[10px] bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 hover:bg-indigo-800"
                                                                >
                                                                    초기화 (마정석 200개)
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {item.secondaryOptions?.map((opt, i) => {
                                                            const isMilestoneFixed = i >= baseCount;
                                                            const isUserFixed = lockedOptionIndices.includes(i) && !isMilestoneFixed;

                                                            return (
                                                                <div 
                                                                    key={i} 
                                                                    onClick={() => !isMilestoneFixed && toggleLock(i)}
                                                                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                                                                        isMilestoneFixed
                                                                            ? 'bg-amber-950/20 border-amber-800/40'
                                                                            : isUserFixed
                                                                            ? 'bg-purple-950/40 border-purple-500/60 cursor-pointer shadow-sm'
                                                                            : 'bg-slate-900 border-slate-800 hover:border-slate-700 cursor-pointer'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0 pr-2">
                                                                        <span className={`font-medium truncate ${isMilestoneFixed ? 'text-amber-300' : isUserFixed ? 'text-purple-200 font-bold' : 'text-slate-200'}`}>
                                                                            • {opt}
                                                                        </span>
                                                                    </div>
                                                                    <div className="shrink-0">
                                                                        {isMilestoneFixed ? (
                                                                            <span className="flex items-center gap-1 text-[10px] bg-amber-900/40 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                                                                                <Lock size={10} /> 강화 고정
                                                                            </span>
                                                                        ) : isUserFixed ? (
                                                                            <button 
                                                                                type="button"
                                                                                onClick={(e) => { e.stopPropagation(); toggleLock(i); }}
                                                                                className="flex items-center gap-1 text-[10px] bg-purple-600 hover:bg-purple-500 text-white font-bold px-2.5 py-0.5 rounded border border-purple-400 shadow-sm"
                                                                            >
                                                                                <Lock size={10} /> 고정됨 (+{lockCostPerOption} 마정석)
                                                                            </button>
                                                                        ) : (
                                                                            <button 
                                                                                type="button"
                                                                                onClick={(e) => { e.stopPropagation(); toggleLock(i); }}
                                                                                className="flex items-center gap-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-0.5 rounded border border-slate-700"
                                                                            >
                                                                                고정하기
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                                                    <div className="flex justify-between items-center text-slate-400">
                                                        <span>기본 재설정 비용 ({optionCount}개 옵션)</span>
                                                        <span className="font-mono text-purple-300">{baseManaCost} 마정석</span>
                                                    </div>
                                                    {userLockCount > 0 && (
                                                        <div className="flex justify-between items-center text-purple-300">
                                                            <span>고정 옵션 추가 비용 ({userLockCount}개 x {lockCostPerOption})</span>
                                                            <span className="font-mono text-purple-300">+{userLockCount * lockCostPerOption} 마정석</span>
                                                        </div>
                                                    )}
                                                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center font-bold">
                                                        <span className="text-slate-200">총 소모 마정석</span>
                                                        <span className={`font-mono text-sm ${hasEnoughMana ? 'text-amber-400' : 'text-red-400'}`}>
                                                            {totalManaCost}개 <span className="text-xs font-normal text-slate-400">(보유: {ownedManaCrystals}개)</span>
                                                        </span>
                                                    </div>
                                                </div>

                                                <button 
                                                    onClick={() => handleRefine('reroll')}
                                                    disabled={isRefining || isCrafting || (item.rerollCount || 0) >= 10 || !hasEnoughMana}
                                                    className="w-full py-4 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 hover:from-indigo-600 hover:to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-900/40 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                >
                                                    <RefreshCw className={`mr-2 ${isRefining ? 'animate-spin' : ''}`}/> 옵션 재설정 실행 (마정석 {totalManaCost}개)
                                                </button>
                                            </div>
                                        );
                                    }

                                    if (refineSubTab === 'enhance') {
                                        return (
                                            <div className="space-y-4 relative">
                                                {isRefining && (
                                                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center rounded-2xl animate-in fade-in duration-300">
                                                        <div className="relative mb-6">
                                                            <div className="absolute -inset-4 rounded-full bg-purple-500/20 animate-ping"></div>
                                                            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-500 flex items-center justify-center shadow-2xl shadow-purple-500/50 animate-spin" style={{ animationDuration: '2.5s' }}>
                                                                <Sparkles size={36} className="text-amber-300 animate-pulse" />
                                                            </div>
                                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl">
                                                                ⚡
                                                            </div>
                                                        </div>
                                                        <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-purple-300 to-indigo-300 mb-2">
                                                            옵션 한계 돌파 주입 중...
                                                        </h3>
                                                        <p className="text-xs text-slate-400 max-w-xs animate-pulse">
                                                            마정석과 연금술 마법을 이용하여 옵션 수치를 한 단계 끌어올립니다.
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="flex items-center space-x-2 mb-2">
                                                    <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
                                                        <Sparkles size={18} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base font-bold text-slate-100">개별 옵션 수치 강화</h3>
                                                        <p className="text-xs text-slate-400">골드와 마정석을 소모하여 특정 옵션의 레벨을 상승시킵니다.</p>
                                                    </div>
                                                </div>

                                                {/* ITEM COMBAT POWER INDICATOR */}
                                                {renderItemCombatPowerCard(item)}

                                                <div className="space-y-2.5">
                                                    {item.secondaryOptions?.map((opt, i) => {
                                                        const lvl = item.optionLevels?.[i] || 1;
                                                        const maxLvl = item.optionMaxLevels?.[i] || 5;
                                                        const isMax = lvl >= maxLvl;
                                                        const { goldCost: costGold, manaCost: costMana } = getOptionEnhanceCost(item, lvl);
                                                        const canAfford = (character.money >= costGold) && ((character.base?.resources?.manaCrystal || 0) >= costMana);

                                                        // 옵션 강화 성공 확률 계산 (제작 전문기술 보너스 포함)
                                                        const craftingProf = character.professions?.crafting || { level: 1, exp: 0 };
                                                        const craftingBonusRate = Math.min(15, (craftingProf.level - 1) * 0.5);
                                                        const successRate = Math.max(1, Math.min(100, Math.round(((20 - (lvl * 2)) + craftingBonusRate) * 10) / 10));

                                                        // Calculate expected CP delta if this option is upgraded
                                                        let previewCPDiff = 0;
                                                        if (!isMax) {
                                                            const valMatch = opt.match(/(\d+)/);
                                                            if (valMatch) {
                                                                const val = parseInt(valMatch[1]);
                                                                const newVal = Math.floor(val * 1.1) + 1;
                                                                const newOpt = opt.replace(val.toString(), newVal.toString());
                                                                const simOpts = [...(item.secondaryOptions || [])];
                                                                simOpts[i] = newOpt;
                                                                const simLevels = [...(item.optionLevels || [])];
                                                                simLevels[i] = lvl + 1;
                                                                const simItem = {
                                                                    ...item,
                                                                    secondaryOptions: simOpts,
                                                                    optionLevels: simLevels
                                                                };
                                                                const previewDelta = calculateItemCPDelta(item, simItem, character);
                                                                previewCPDiff = previewDelta.diff;
                                                            }
                                                        }

                                                        return (
                                                            <div key={i} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex justify-between items-center hover:border-purple-500/30 transition-colors">
                                                                <div className="space-y-1">
                                                                    <div className="text-sm font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                                                                        <span>{opt}</span>
                                                                        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/40 font-bold">
                                                                            Lv.{lvl} / {maxLvl}
                                                                        </span>
                                                                        {!isMax && (
                                                                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/40 font-bold">
                                                                                성공률 {successRate}%
                                                                            </span>
                                                                        )}
                                                                        {!isMax && previewCPDiff > 0 && (
                                                                            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                                                                                +{previewCPDiff.toLocaleString()} CP
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[11px] text-slate-400 flex items-center gap-3 flex-wrap">
                                                                        <span>골드: <strong className={character.money >= costGold ? 'text-amber-400' : 'text-red-400'}>{costGold.toLocaleString()}G</strong></span>
                                                                        <span>마정석: <strong className={(character.base?.resources?.manaCrystal || 0) >= costMana ? 'text-purple-400' : 'text-red-400'}>{costMana}개</strong></span>
                                                                        {!isMax && (
                                                                            <span>강화 확률: <strong className={successRate >= 20 ? 'text-emerald-400' : successRate >= 12 ? 'text-amber-400' : 'text-red-400'}>{successRate}%</strong></span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                                                                        <button 
                                                                            onClick={() => handleRefine('enhance', i)}
                                                                            disabled={isMax || isRefining || !canAfford}
                                                                            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1 ${
                                                                                isMax 
                                                                                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                                                                    : canAfford 
                                                                                    ? 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-purple-100 border border-purple-500/40 shadow-md shadow-purple-900/20' 
                                                                                    : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                                                                            }`}
                                                                        >
                                                                            {isMax ? 'MAX' : `1회 강화 (${successRate}%)`}
                                                                        </button>

                                                                        {!isMax && (
                                                                            <button 
                                                                                onClick={() => handleBatchOptionEnhanceLocal(i)}
                                                                                disabled={isRefining || !canAfford}
                                                                                className="px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white border border-amber-400/40 shadow-md shadow-amber-950/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                title="성공할 때까지 자동으로 연속 강화를 진행합니다."
                                                                            >
                                                                                <Sparkles size={12} className="text-yellow-200" />
                                                                                <span>연속 강화</span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (refineSubTab === 'promote') {
                                        const promoConfig = PROMOTION_RULES[item.rarity];
                                        const isLegendary = item.rarity === ItemRarity.LEGENDARY || item.rarity === ItemRarity.MYTHTIC;
                                        const hasEnhancementReq = (item.enhancement || 0) >= 5;
                                        const hasMaxOptionsReq = item.optionLevels?.every(l => l >= 5) || false;
                                        const currentRes = character.base?.resources?.[promoConfig?.resKey || 'magicCrystal'] || 0;
                                        const hasResReq = currentRes >= (promoConfig?.cost || 0);

                                        return (
                                            <div className="space-y-5 relative">
                                                {isRefining && (
                                                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center rounded-2xl animate-in fade-in duration-300">
                                                        <div className="relative mb-6">
                                                            <div className="absolute -inset-4 rounded-full bg-amber-500/20 animate-ping"></div>
                                                            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-600 via-orange-600 to-yellow-500 flex items-center justify-center shadow-2xl shadow-amber-500/50 animate-spin" style={{ animationDuration: '2.5s' }}>
                                                                <Sparkles size={36} className="text-amber-200 animate-pulse" />
                                                            </div>
                                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl">
                                                                👑
                                                            </div>
                                                        </div>
                                                        <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-200 mb-2">
                                                            장비 한계 승급 주입 중...
                                                        </h3>
                                                        <p className="text-xs text-slate-400 max-w-xs animate-pulse">
                                                            장비의 잠재력을 해제하고 상위 희귀도 클래스로 승격시키고 있습니다.
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="flex items-center space-x-2">
                                                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                                                        <ArrowRight size={18} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base font-bold text-slate-100">장비 한계 승급</h3>
                                                        <p className="text-xs text-slate-400">장비의 희귀도를 한 단계 높여 기본 능력을 대폭 끌어올립니다.</p>
                                                    </div>
                                                </div>

                                                {renderItemCombatPowerCard(item)}

                                                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                                                    <div className="flex items-center justify-around bg-slate-900/80 p-4 rounded-xl border border-slate-800/80">
                                                        <div className="text-center space-y-1">
                                                            <span className="text-[10px] text-slate-500 uppercase block">현재 등급</span>
                                                            <span className="text-sm font-black px-3 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200">
                                                                {item.rarity}
                                                            </span>
                                                        </div>
                                                        <ArrowRight size={24} className="text-amber-500 animate-pulse" />
                                                        <div className="text-center space-y-1">
                                                            <span className="text-[10px] text-amber-500 uppercase block font-bold">승급 등급</span>
                                                            <span className={`text-sm font-black px-3 py-1 rounded border shadow-lg ${isLegendary ? 'bg-slate-950 text-slate-500 border-slate-800' : 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-amber-900/30'}`}>
                                                                {promoConfig?.next || 'MAX'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {item.isPromoted ? (
                                                        <div className="text-center py-4 text-xs text-amber-400 bg-amber-950/30 rounded-xl border border-amber-800/50 space-y-1">
                                                            <div className="font-bold text-sm">이미 승급을 완료한 장비입니다</div>
                                                            <div className="text-slate-400 text-[11px]">장비 승급은 아이템당 최대 1회만 가능합니다.</div>
                                                        </div>
                                                    ) : isLegendary ? (
                                                        <div className="text-center py-4 text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                                                            이 장비는 이미 최고 승급 단계(전설/신화)에 도달했습니다.
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="space-y-2 text-xs">
                                                                <div className="text-slate-400 font-bold mb-1">승급 자격 조건</div>
                                                                <div className={`flex items-center justify-between p-2.5 rounded-lg border ${hasEnhancementReq ? 'bg-green-950/20 border-green-500/30 text-green-300' : 'bg-red-950/20 border-red-500/30 text-red-300'}`}>
                                                                    <span>• 장비 강화 +5 이상 달성</span>
                                                                    <span className="font-bold">{hasEnhancementReq ? '✓ 완료 (+'+(item.enhancement||0)+')' : '✗ 미달 (+'+(item.enhancement||0)+')'}</span>
                                                                </div>
                                                                <div className={`flex items-center justify-between p-2.5 rounded-lg border ${hasMaxOptionsReq ? 'bg-green-950/20 border-green-500/30 text-green-300' : 'bg-red-950/20 border-red-500/30 text-red-300'}`}>
                                                                    <span>• 모든 보조 옵션 Lv.5 달성</span>
                                                                    <span className="font-bold">{hasMaxOptionsReq ? '✓ 완료' : '✗ 미달'}</span>
                                                                </div>
                                                                <div className={`flex items-center justify-between p-2.5 rounded-lg border ${hasResReq ? 'bg-purple-950/20 border-purple-500/30 text-purple-300' : 'bg-red-950/20 border-red-500/30 text-red-300'}`}>
                                                                    <span>• 필요 결정: {promoConfig?.cost}개 ({promoConfig?.resName})</span>
                                                                    <span className="font-bold">보유 {currentRes}개</span>
                                                                </div>
                                                            </div>

                                                            {/* PROMOTION COMBAT POWER PREVIEW */}
                                                            {(() => {
                                                                const promoNextRarity = promoConfig?.next;
                                                                if (!isLegendary && promoNextRarity) {
                                                                    const promoSimulatedItem: Item = {
                                                                        ...item,
                                                                        rarity: promoNextRarity,
                                                                        secondaryOptions: item.secondaryOptions?.map(opt => {
                                                                            const valMatch = opt.match(/(\d+)/);
                                                                            if (valMatch) {
                                                                                const val = parseInt(valMatch[1]);
                                                                                return opt.replace(val.toString(), Math.floor(val * 1.5).toString());
                                                                            }
                                                                            return opt;
                                                                        }),
                                                                        optionLevels: new Array(item.secondaryOptions?.length || 0).fill(1)
                                                                    };
                                                                    const delta = calculateItemCPDelta(item, promoSimulatedItem, character);
                                                                    return (
                                                                        <div className="bg-gradient-to-r from-amber-950/40 via-purple-950/40 to-amber-950/40 p-3 rounded-xl border border-amber-500/30 flex items-center justify-between text-xs">
                                                                            <span className="text-amber-300 font-bold flex items-center gap-1.5">
                                                                                <Sword size={13} className="text-amber-400" />
                                                                                승급 시 예상 전투력
                                                                            </span>
                                                                            <div className="flex items-center gap-1.5 font-mono">
                                                                                <span className="text-slate-400">{delta.oldCP.toLocaleString()}</span>
                                                                                <ArrowRight size={11} className="text-amber-400" />
                                                                                <span className="text-emerald-400 font-bold">
                                                                                    {delta.newCP.toLocaleString()} (+{delta.diff.toLocaleString()})
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}

                                                            <button 
                                                                onClick={() => handleRefine('promote')}
                                                                disabled={item.isPromoted || isRefining || !hasEnhancementReq || !hasMaxOptionsReq || !hasResReq}
                                                                className="w-full py-3.5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white font-black rounded-xl shadow-lg shadow-amber-900/30 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                            >
                                                                ⚡ 장비 승급 실행 ⚡
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (refineSubTab === 'option_max_level') {
                                        return (
                                            <div className="space-y-4 relative">
                                                {isRefining && (
                                                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center rounded-2xl animate-in fade-in duration-300">
                                                        <div className="relative mb-6">
                                                            <div className="absolute -inset-4 rounded-full bg-amber-500/20 animate-ping"></div>
                                                            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-600 via-orange-600 to-yellow-500 flex items-center justify-center shadow-2xl shadow-amber-500/50 animate-spin" style={{ animationDuration: '2.5s' }}>
                                                                <Lock size={36} className="text-amber-200 animate-pulse" />
                                                            </div>
                                                        </div>
                                                        <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-200 mb-2">
                                                            옵션 한계 개방 의식 진행 중...
                                                        </h3>
                                                        <p className="text-xs text-slate-400 max-w-xs animate-pulse">
                                                            마정석과 철광석의 기운으로 옵션의 잠재된 성장의 한계를 해제하고 있습니다.
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="flex items-center space-x-2 mb-2">
                                                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                                                        <Lock size={18} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base font-bold text-slate-100">옵션 최대 레벨 한계 돌파</h3>
                                                        <p className="text-xs text-slate-400">재료를 소비하여 옵션의 최고 성장의 한계(Lv.5 ~ Lv.10)를 개방합니다. (확률 실패 가능)</p>
                                                    </div>
                                                </div>

                                                {renderItemCombatPowerCard(item)}

                                                <div className="space-y-2.5">
                                                    {item.secondaryOptions?.map((opt, i) => {
                                                        const currentMaxLevel = item.optionMaxLevels?.[i] || 5;
                                                        const nextMaxLevel = currentMaxLevel + 1;
                                                        const canExpand = nextMaxLevel <= 10;
                                                        const ironCost = 5000 * (currentMaxLevel - 4);
                                                        const manaCost = 500 * (currentMaxLevel - 4);
                                                        const hasIron = (character.base?.resources?.iron || 0) >= ironCost;
                                                        const hasMana = (character.base?.resources?.manaCrystal || 0) >= manaCost;

                                                        const baseRates: Record<number, number> = { 6: 70, 7: 55, 8: 40, 9: 25, 10: 15 };
                                                        const craftingProf = character.professions?.crafting || { level: 1, exp: 0 };
                                                        const craftingBonusRate = Math.min(10, (craftingProf.level - 1) * 0.2);
                                                        const baseRate = baseRates[nextMaxLevel] || 20;
                                                        const successRate = Math.min(95, Math.max(5, Math.round(baseRate + bonusRate + craftingBonusRate)));

                                                        return (
                                                            <div key={i} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex justify-between items-center hover:border-amber-500/30 transition-colors flex-wrap sm:flex-nowrap gap-2">
                                                                <div className="space-y-1">
                                                                    <div className="text-sm font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                                                                        <span>{opt}</span>
                                                                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/40 font-bold">
                                                                            최대 Lv.{currentMaxLevel}
                                                                        </span>
                                                                        {canExpand && (
                                                                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 border border-amber-700/50 font-bold">
                                                                                개방 확률 {successRate}%
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {canExpand && (
                                                                        <div className="text-[11px] text-slate-400 flex items-center gap-3 flex-wrap">
                                                                            <span>비용: <strong className={hasIron ? 'text-amber-400' : 'text-red-400'}>{ironCost.toLocaleString()} 철광석</strong></span>
                                                                            <span><strong className={hasMana ? 'text-purple-400' : 'text-red-400'}>{manaCost.toLocaleString()} 마정석</strong></span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {canExpand ? (
                                                                    <button 
                                                                        onClick={() => handleOptionMaxLevelUnlock(i)}
                                                                        disabled={isRefining || !hasIron || !hasMana}
                                                                        className="px-3.5 py-1.5 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white rounded-lg text-xs font-bold border border-amber-500/40 shadow-md shadow-amber-900/20 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                                                    >
                                                                        개방 시도 (Lv.{nextMaxLevel})
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-xs font-bold text-slate-500 bg-slate-900 px-3 py-1 rounded border border-slate-800 shrink-0">최대 레벨 (Lv.10)</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-500">제련할 아이템을 선택해주세요.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'dismantle' && (
                <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
                    <div className="w-full md:w-2/5 border-b md:border-b-0 md:border-r border-slate-800 p-2.5 sm:p-3 overflow-y-auto custom-scrollbar bg-slate-950/60 shrink-0 max-h-[35vh] xs:max-h-[40vh] md:max-h-none flex flex-col">
                        {/* 탭 및 정렬 상단 컨트롤 바 */}
                        <div className="flex flex-col gap-2 mb-2.5 pb-2.5 border-b border-slate-800 shrink-0">
                            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                {/* 품목 탭 (장비, 기타) */}
                                <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDismantleCategory('equipment');
                                            setSelectedDismantleGroup(null);
                                        }}
                                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                                            dismantleCategory === 'equipment'
                                                ? 'bg-red-700 text-white shadow-sm'
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        장비 ({getAllDismantlableGroups().filter(g => isEquipmentItem(g.item)).length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDismantleCategory('etc');
                                            setSelectedDismantleGroup(null);
                                        }}
                                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                                            dismantleCategory === 'etc'
                                                ? 'bg-red-700 text-white shadow-sm'
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        기타 ({getAllDismantlableGroups().filter(g => !isEquipmentItem(g.item)).length})
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsBulkDismantleOpen(true)}
                                    className="px-2.5 py-1 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow transition-all active:scale-95 shrink-0"
                                >
                                    <Trash2 size={13} />
                                    <span>일괄 분해</span>
                                </button>
                            </div>

                            {/* 품목 수 및 정렬 드롭다운 */}
                            <div className="flex items-center justify-between gap-2 text-xs px-0.5">
                                <span className="text-[11px] font-bold text-red-400">
                                    분해 가능 ({getDismantlableGroups().length}종류)
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-500 font-bold shrink-0">정렬</span>
                                    <select
                                        value={dismantleSort}
                                        onChange={(e) => setDismantleSort(e.target.value as any)}
                                        className="bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-medium rounded-lg px-2 py-1 outline-none focus:border-red-500 cursor-pointer"
                                    >
                                        <option value="rarity_desc">등급 높은 순</option>
                                        <option value="rarity_asc">등급 낮은 순</option>
                                        <option value="name_asc">이름 순</option>
                                        <option value="count_desc">수량 많은 순</option>
                                        <option value="count_asc">수량 적은 순</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-1.5">
                            {getDismantlableGroups().map((group, idx) => {
                                const isSelected = selectedDismantleGroup === group;
                                return (
                                    <div 
                                        key={idx} 
                                        onClick={() => { setSelectedDismantleGroup(group); setDismantleAmount(1); }}
                                        className={`group relative p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                                            isSelected 
                                                ? 'bg-red-950/60 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.25)]' 
                                                : 'bg-slate-900/80 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
                                        }`}
                                    >
                                        <ItemTooltip item={group.item} character={character} />
                                        <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center p-1">
                                            <img src={getItemImage(group.item)} alt={group.item.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold text-slate-200 truncate">{group.item.name}</div>
                                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                <span>{group.item.rarity}</span>
                                                <span>•</span>
                                                <span className="text-slate-500">{group.item.type}</span>
                                                {group.item.elementalType && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-cyan-400 font-bold bg-cyan-950/50 px-1 rounded border border-cyan-800/50">{group.item.elementalType}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-[11px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700 shrink-0">
                                            x{group.indices.length}
                                        </div>
                                    </div>
                                );
                            })}
                            {getDismantlableGroups().length === 0 && (
                                <p className="text-center py-12 text-slate-600 text-xs italic">
                                    해당 품목의 분해 가능한 아이템이 없습니다.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 p-4 sm:p-6 bg-slate-900 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center">
                        {selectedDismantleGroup ? (
                            <div className="w-full max-w-sm text-center">
                                <div className="w-20 h-20 mx-auto rounded-2xl bg-slate-950 border-2 border-red-500/50 p-2 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(239,68,68,0.2)] group relative cursor-pointer">
                                    <ItemTooltip item={selectedDismantleGroup.item} character={character} />
                                    <img src={getItemImage(selectedDismantleGroup.item)} alt={selectedDismantleGroup.item.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-1">{selectedDismantleGroup.item.name}</h3>
                                <p className="text-xs text-slate-400 mb-5">이 아이템을 분해하여 마정석을 추출합니다.</p>
                                
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-xs text-slate-500 font-bold uppercase">수량</span>
                                        <span className="text-sm font-mono text-white">{dismantleAmount} / {selectedDismantleGroup.indices.length}</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max={selectedDismantleGroup.indices.length} 
                                        value={dismantleAmount} 
                                        onChange={(e) => setDismantleAmount(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                                    />
                                    
                                    <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                                        <span className="text-xs text-slate-500">예상 생산량</span>
                                        <span className="text-sm font-bold text-amber-400 flex items-center">
                                            {getCrystalIcon(selectedDismantleGroup.item.rarity)} 
                                            <span className="ml-1">
                                                ~{dismantleAmount * (['Weapon','Armor'].some(t => selectedDismantleGroup.item.type.includes(t)) ? 1.5 : 1)} {selectedDismantleGroup.item.rarity === ItemRarity.MYTHTIC ? '전설' : selectedDismantleGroup.item.rarity} 결정
                                            </span>
                                        </span>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleDismantle}
                                    className="w-full py-4 bg-red-800 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg transition-all"
                                >
                                    분해
                                </button>
                            </div>
                        ) : (
                            <div className="text-slate-500 flex flex-col items-center">
                                <Trash2 size={48} className="mb-4 opacity-20"/>
                                <p>분해할 아이템을 선택하세요.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
        {isBulkDismantleOpen && (
            <BulkDismantleModal
                isOpen={isBulkDismantleOpen}
                onClose={() => setIsBulkDismantleOpen(false)}
                title="제작소 아이템 일괄 분해"
                description="지정한 등급 이하 및 선택한 품목(장비, 기타)의 아이템을 한 번에 분해하여 결정을 추출합니다."
                allowedCategories={['equipment', 'etc']}
                inventory={character.inventory}
                calculateYield={calculateBulkWorkshopYield}
                onConfirm={handleBulkWorkshopDismantle}
                themeColor="red"
            />
        )}
        
        {equipmentEvolutionData && (
            <EquipmentEvolutionModal
                prevItem={equipmentEvolutionData.prevItem}
                nextItem={equipmentEvolutionData.nextItem}
                character={character}
                onClose={() => setEquipmentEvolutionData(null)}
            />
        )}

        {showRerollPoolModal && (
            <RerollOptionPoolModal
                isOpen={showRerollPoolModal}
                onClose={() => setShowRerollPoolModal(false)}
                item={selectedItemIdx !== null ? character.inventory[selectedItemIdx] : null}
            />
        )}
      </div>
    </div>
  );
};

export default WorkshopModal;