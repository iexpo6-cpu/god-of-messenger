import React, { useState, useEffect } from 'react';
import { Character, Companion, Item, Skill, SkillType, ItemRarity, WeaponType, Stats, BaseResources, ClassTier, MonsterStage, JobType, CombatStyle, TrainerRank, TRAINER_RANK_CONFIG, BaseDefenseReportData, FacilityInstance } from '../types';
import { BASE_LEVEL_CONFIG, FACILITIES_INFO, ENHANCEMENT_CAPS, MAX_STORAGE_SIZE, FACILITY_UPGRADE_CONFIG, BASE_UPGRADE_COSTS, SHINRYOKU_TYPES_LIST, FACILITY_CONSTRUCTION_COSTS, BASE_GRID_EXPANSION_COSTS, COMBAT_STYLE_CONFIG, COMBAT_STYLE_CHANGE_COST, WEAPON_TYPE_KOREAN } from '../constants';
import { calculateInventorySize, calculateTotalStorageCapacity, calculateTotalHousingCapacity, calculateTotalLabLevel, getFacilityTrainingLimit } from '../utils';
import { checkAndInitializeLiberationEligibility, getCompanionCP, getCompanionPureCP } from '../services/companionGrowthService';
import { advanceGameTime, getTimeOfDay } from '../services/gameTimeService';
import { getCompanionRoutine } from '../services/npcRoutineService';
import { DailyFacilityHomework } from './base/DailyFacilityHomework';
import { ResidentFacilityModal, getResidentDutySummary } from './base/ResidentFacilityModal';
import { ItemTooltip, getItemImage } from './CharacterSheet';
import { 
  getFacilityConstructionDuration, 
  getBaseGridExpansionDuration,
  getDefenseStructureConstructionDuration,
  calculateCompletionDateTime, 
  getConstructionRemainingTime, 
  getConstructionProgress, 
  checkAndCompleteBaseConstructions 
} from '../services/baseConstructionService';
import { startCookingJob, claimCookedDish, cancelCookingJob } from '../services/cookingService';
import { X, Home, Hammer, Users, Package, ArrowUpCircle, Coins,Info, Leaf, Shield, CalendarCheck ,TestTube, Zap, ShoppingCart,Lock, DollarSign, UserCheck, Briefcase, Play, Box, ArrowRight, ArrowLeft, BedDouble, MessageCircle, Dog, BookOpen, Microscope, Trash2, Sword, Swords, Dumbbell, Trophy, Target, Brain, Activity, User, Utensils, ChevronLeft, Wine, Gamepad2, Hand, Sparkles, Heart, CheckCircle, Filter, Pickaxe, Mountain, FlaskConical, Gem, Layers, MapPin, Truck, AlertTriangle, AlertCircle, Clock, ChevronsUp, TrendingUp, Trees, Apple, Flame, Building2, Crosshair, Eye, Skull, Waves, Wind, Sun, Moon, Edit, PenTool, Upload, Store, Award, Star, Wand2, Search, ArrowUpDown } from 'lucide-react';

const STORAGE_RARITY_COLORS: Record<string, string> = {
  [ItemRarity.NORMAL]: 'text-slate-300 border-slate-700 bg-slate-950/70',
  [ItemRarity.MAGIC]: 'text-blue-400 border-blue-500/50 bg-blue-950/30',
  [ItemRarity.RARE]: 'text-yellow-400 border-yellow-500/50 bg-yellow-950/30',
  [ItemRarity.EPIC]: 'text-purple-400 border-purple-500/50 bg-purple-950/30',
  [ItemRarity.UNIQUE]: 'text-pink-400 border-pink-500/50 bg-pink-950/30',
  [ItemRarity.LEGENDARY]: 'text-amber-400 border-amber-500/70 bg-amber-950/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]',
  [ItemRarity.MYTHTIC]: 'text-red-400 border-red-600/70 bg-red-950/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
};

import { RPG_SKILL_ICONS as BASE_ICONS } from '../services/rpgIconService';

const DEFENSE_STRUCTURE_TEMPLATES = [
  {
    key: 'wooden_barricade',
    name: '목재 바리케이드',
    desc: '임시로 목재를 덧대어 적의 전진을 지연시키는 기본적인 방어 시설입니다.',
    defense: 150,
    cost: { gold: 0, wood: 50, stone: 10, iron: 0, manaCrystal: 0 }
  },
  {
    key: 'stone_wall',
    name: '석조 방벽',
    desc: '단단한 석재와 철보강재로 이루어져 적들의 강력한 물리 공격을 차단합니다.',
    defense: 300,
    cost: { gold: 0, wood: 30, stone: 120, iron: 20, manaCrystal: 0 }
  },
  {
    key: 'steel_spike_trap',
    name: '강철 가시 함정',
    desc: '지면에 예리한 강철 가시들을 촘촘히 심어 침입자들에게 치명적인 피해를 줍니다.',
    defense: 500,
    cost: { gold: 0, wood: 40, stone: 20, iron: 80, manaCrystal: 0 }
  },
  {
    key: 'mana_shield_generator',
    name: '마력 보호막 장치',
    desc: '고농축 마정석의 힘을 활성화해 기지 전역에 장벽 형태의 에너지막을 펼칩니다.',
    defense: 1000,
    cost: { gold: 0, wood: 50, stone: 50, iron: 50, manaCrystal: 30 }
  },
  {
    key: 'fortress_great_turret',
    name: '요새화 대포탑',
    desc: '수많은 철재와 마력을 융합한 자주식 포탄으로, 접근하는 적들을 원거리에서 포격합니다.',
    defense: 2000,
    cost: { gold: 2000, wood: 100, stone: 300, iron: 150, manaCrystal: 50 }
  }
];
import WorkshopModal from './WorkshopModal';
import AlchemyModal from './AlchemyModal';
import MonsterFarmModal from './MonsterFarmModal';
import DispatchModal from './DispatchModal';
import FarmModal from './FarmModal';
import CookingModal from './CookingModal';
import MineModal from './MineModal';
import MyHomeModal from './MyHomeModal'; // Import new modal
import HousingModal from './HousingModal';
import ResearchLabModal from './ResearchLabModal';
import SparringArenaModal from './SparringArenaModal';
import MilitaryFacilityModal from './MilitaryFacilityModal';
import RegionalManagementModal from './RegionalManagementModal';
import FrontlineModal from './FrontlineModal';
import TempleManagementModal from './TempleManagementModal';
import MercenaryGuildModal from './MercenaryGuildModal';
import PotentialBreakthroughModal from './PotentialBreakthroughModal';
import TradeExchangeModal from './TradeExchangeModal';
import CustomLabModal from './CustomLabModal';
import SkillVfxCustomLabModal from './SkillVfxCustomLabModal';
import ChildAcademyModal from './ChildAcademyModal';
import MonsterArenaModal from './MonsterArenaModal';
import { CombatTrainingReportModal } from './CombatTrainingReportModal';
import BaseDefenseSquadModal from './base/BaseDefenseSquadModal';
import { calculateTotalSquadDefenseContribution } from '../services/baseDefenseSquadService';
import ActionResultModal, { ResultData } from './ActionResultModal';
import QuantityModal from './QuantityModal';
import { addDays, getYear, calculateAgeFromYear,calculateFinalStats, calculateBaseDefense, gainProfessionExp, calculateResearcherBonus } from '../utils';
import { getCombatTrainingEfficiencyBonus, getCombatTrainingTrainerInfo, getUnifiedCombatTrainingData, syncUnifiedCombatTrainingToCharacter, getAbsoluteMinutes } from '../services/trainingService';
import { processTimeSkip } from '../services/timeEngine';
import { RECIPES, COOKED_ITEMS, COOKING_TOOLS, consumeIngredients, getAvailableIngredientCount } from '../recipes';
import { payOffBaseMaintenance } from '../services/maintenanceValidationService';

interface Props {
  character: Character;
  onClose: () => void;
  initialSubModal?: { type: string; instanceId?: string };
  onUpgrade: () => void;
  onPurchaseBase: () => void;
  onMoveCompanionToBase: (index: number) => void;
  onRecallCompanion: (index: number) => void;
  onAssignCompanion: (companionId: string, facilityId: string) => void;
  onUseFacility: (facilityId: string) => void;
  
  onStorageAction: (action: 'deposit' | 'withdraw', item: Item, indices: number[]) => void;
  onHousingRest: () => void;
  onFacilitySpecificAction: (facilityId: string, actionName: string, targetId?: string, amount?: number) => void;
  onStatTraining: (statKey: string, targetId: string, amount: number) => void;
  onSkillResearch: (skillIndex: number, targetId: string) => void;
  onSkillLimitBreak: (skillIndex: number, targetId: string) => void;
  onItemEnhancement: (itemIndex: number) => void;
  onItemReroll?: (itemIndex: number) => void;
  onItemPromote?: (itemIndex: number) => void;
  onWeaponTraining: (weaponType: WeaponType, targetId: string, amount: number) => void;
  
  // New handlers
  onParty?: (selectedIndices: number[]) => void;
  onInteraction?: (companionId: string, choice: string) => void;
  onUpdateCharacter: (newChar: Character, logMsg: string, dailyReport?: any) => void; 
  onFacilityUpgrade?: (facilityId: string) => void; 
  onRecallMonsterFromFarm?: (monsterId: string) => void;
  onReturnMonsterToFarm?: (companionId: string) => void;
  onBattle?: (enemy: any, type?: string, source?: string, targetCity?: string, targetNation?: string) => void;
  
  onRelocate?: () => void; 
  onExpandGrid?: () => void;
  onOpenProfessionMastery?: () => void;
  onOpenChefMastery?: () => void;
  onOpenBreederMastery?: () => void;
  onOpenTacticalTraining?: () => void;
  onShowDamageReport?: (report: BaseDefenseReportData) => void;
}
const RESOURCE_SELL_PRICES: Record<string, number> = {
    wood: 100,
    stone: 100,
    herbs: 50,
    iron: 100,
    manaStone: 50,
    manaCrystal: 500,
    food: 100,
    normalCrystal: 100,
    magicCrystal: 500,
    rareCrystal: 1000,
    epicCrystal: 5000,
    uniqueCrystal: 15000,
    legendaryCrystal: 50000,
    shard: 1000, // 신력 조각 공통
    wheat: 30,
    corn: 60,
    potato: 90,
    mana_fruit: 300,
    rice: 40,
    sweet_potato: 100,
    onion: 50,
    garlic: 120,
    lettuce: 24,
    shinryoku_flower: 2000,
    carrot: 36,
    cabbage: 44,
    tomato: 76,
    strawberry: 120,
    grape: 180,
    watermelon: 240,
    ginseng: 600,
    mandrake: 1000,
    world_tree_branch: 5000,
    golden_apple: 3000,
    gold_ore: 2000,
    silver_ore: 800,
    diamond: 10000,
    ruby: 5000,
    sapphire: 5000,
    emerald: 5000
};

type Tab = 'overview' | 'daily' | 'facilities' | 'residents' | 'resources';
type ResourceSubTab = 'basic' | 'crops' | 'crystals' | 'shards';

const BaseModal: React.FC<Props> = ({ 
    character, onClose, initialSubModal, onUpgrade, onPurchaseBase,
    onMoveCompanionToBase, onRecallCompanion, onAssignCompanion,
    onUseFacility,
    onStorageAction, onHousingRest, onFacilitySpecificAction,
    onStatTraining, onSkillResearch, onSkillLimitBreak, onItemEnhancement,
    onWeaponTraining, onParty, onInteraction, onUpdateCharacter,
    onFacilityUpgrade, onRelocate, onExpandGrid,
    onRecallMonsterFromFarm, onReturnMonsterToFarm,
    onOpenProfessionMastery, onOpenChefMastery, onOpenBreederMastery, onOpenTacticalTraining,
    onBattle, onShowDamageReport
}) => {
    const base = character.base;
    const safeNum = (val: number | undefined) => (val ?? 0);
    const currentConfig = base ? BASE_LEVEL_CONFIG[base.level] : BASE_LEVEL_CONFIG[0];
    const nextConfig = base ? BASE_LEVEL_CONFIG[base.level + 1] : null;

    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [activeResourceTab, setActiveResourceTab] = useState<ResourceSubTab>('basic');
    const [residentSearchQuery, setResidentSearchQuery] = useState<string>('');
    const [residentTypeFilter, setResidentTypeFilter] = useState<'all' | 'human' | 'monster' | 'custom'>('all');
    const [residentSortOption, setResidentSortOption] = useState<'name' | 'custom' | 'level' | 'affection' | 'cp'>('name');
    const [assigningInstanceId, setAssigningInstanceId] = useState<string | null>(null);
    const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
    const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
    const [isBuildMode, setIsBuildMode] = useState(false);
    const [isDefenseSquadModalOpen, setIsDefenseSquadModalOpen] = useState(false);
    const [selectedBuildFacility, setSelectedBuildFacility] = useState<string | null>(null);
    const [hoveredCell, setHoveredCell] = useState<{x: number, y: number} | null>(null);
    const [labMode, setLabMode] = useState<'research' | 'break'>('research');
    const [labTargetId, setLabTargetId] = useState<string | null>(null); 
    const [skillFilter, setSkillFilter] = useState<string>('전체');

    // [기지 창고] 골드 입출금 모달 상태
    const [goldTransferModal, setGoldTransferModal] = useState<{
        isOpen: boolean;
        mode: 'deposit' | 'withdraw';
        amount: string;
    }>({ isOpen: false, mode: 'deposit', amount: '' });

    const handleGoldTransferSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const rawAmt = parseInt(goldTransferModal.amount.replace(/,/g, ''), 10);
        if (isNaN(rawAmt) || rawAmt <= 0) {
            alert('1 이상의 올바른 골드 금액을 입력해주세요.');
            return;
        }

        const currentMoney = character.money || 0;
        const currentStorageGold = character.base?.resources?.gold || 0;

        if (goldTransferModal.mode === 'deposit') {
            if (currentMoney < rawAmt) {
                alert('소지하고 있는 골드가 부족합니다.');
                return;
            }
            const defaultRes: BaseResources = {
                gold: 0, wood: 0, stone: 0, iron: 0, manaStone: 0, manaCrystal: 0, food: 0, herbs: 0,
                normalCrystal: 0, magicCrystal: 0, rareCrystal: 0, epicCrystal: 0, uniqueCrystal: 0, legendaryCrystal: 0
            };
            const updatedResources = {
                ...(character.base?.resources || defaultRes),
                gold: currentStorageGold + rawAmt
            };
            const updatedBase = {
                ...character.base,
                resources: updatedResources
            };
            const updatedCharacter: Character = {
                ...character,
                money: currentMoney - rawAmt,
                base: updatedBase as any
            };
            onUpdateCharacter(updatedCharacter, `기지 창고에 ${rawAmt.toLocaleString()} 골드를 보관했습니다.`);
            setGoldTransferModal({ isOpen: false, mode: 'deposit', amount: '' });
        } else {
            if (currentStorageGold < rawAmt) {
                alert('창고에 보관된 골드가 부족합니다.');
                return;
            }
            const defaultRes: BaseResources = {
                gold: 0, wood: 0, stone: 0, iron: 0, manaStone: 0, manaCrystal: 0, food: 0, herbs: 0,
                normalCrystal: 0, magicCrystal: 0, rareCrystal: 0, epicCrystal: 0, uniqueCrystal: 0, legendaryCrystal: 0
            };
            const updatedResources = {
                ...(character.base?.resources || defaultRes),
                gold: currentStorageGold - rawAmt
            };
            const updatedBase = {
                ...character.base,
                resources: updatedResources
            };
            const updatedCharacter: Character = {
                ...character,
                money: currentMoney + rawAmt,
                base: updatedBase as any
            };
            onUpdateCharacter(updatedCharacter, `기지 창고에서 ${rawAmt.toLocaleString()} 골드를 찾았습니다.`);
            setGoldTransferModal({ isOpen: false, mode: 'withdraw', amount: '' });
        }
    };
    const [editingSkillName, setEditingSkillName] = useState<string | null>(null);
    const [editIcon, setEditIcon] = useState<string>('Sword');
    const [editImageUrl, setEditImageUrl] = useState<string>('');
    const [editIllustrationUrl, setEditIllustrationUrl] = useState<string>('');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 선택 가능합니다.');
            return;
        }
        if (file.size > 3 * 1024 * 1024) {
            alert('이미지 파일 크기는 3MB 이하여야 합니다.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setEditImageUrl(event.target.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleIllustrationFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 선택 가능합니다.');
            return;
        }
        if (file.size > 4 * 1024 * 1024) {
            alert('이미지 파일 크기는 4MB 이하여야 합니다.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setEditIllustrationUrl(event.target.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleLabUpdateSkillThumbnail = (skillName: string, isBondSkill: boolean = false) => {
        if (!onUpdateCharacter) return;
        
        let targetEntity = labTargetId === 'player' 
            ? character 
            : character.companions.find(c => c.id === labTargetId) || character.inactiveCompanions?.find(c => c.id === labTargetId);

        if (!targetEntity) return;

        const isPlayer = labTargetId === 'player';
        const isCustom = (targetEntity as any).isCustom === true;

        const currentSkill = targetEntity.skills?.find(s => s.name === skillName) || (isPlayer ? character.bondSkills?.find(s => s.name === skillName) : undefined);
        const currentImg = currentSkill?.imageUrl || '';
        const currentIllust = currentSkill?.illustrationUrl || '';
        
        const isNewCustomImg = editImageUrl.trim() !== "" && editImageUrl.trim() !== currentImg;
        const isNewIllustration = editIllustrationUrl.trim() !== "" && editIllustrationUrl.trim() !== currentIllust;

        const newChar = JSON.parse(JSON.stringify(character)) as Character;

        if (isNewCustomImg || isNewIllustration) {
            if (!isPlayer && !isCustom) {
                setResultOverlay({
                    show: true,
                    data: {
                        type: 'warning',
                        title: '권한 제한',
                        message: '커스텀 이미지/파일 등록은 플레이어 또는 커스텀 동료의 스킬만 가능합니다.'
                    }
                });
                return;
            }

            const currentManaCrystal = newChar.base?.resources?.manaCrystal || 0;
            if (currentManaCrystal < 5) {
                setResultOverlay({
                    show: true,
                    data: {
                        type: 'warning',
                        title: '마정석 부족',
                        message: `커스텀 썸네일/일러스트 등록에는 마정석 5개가 필요합니다. (보유: ${currentManaCrystal}개)`
                    }
                });
                return;
            }

            if (newChar.base?.resources) {
                newChar.base.resources.manaCrystal -= 5;
            }
        }

        const updatedIcon = editIcon;
        const updatedImageUrl = editImageUrl.trim() || undefined;
        const updatedIllustrationUrl = editIllustrationUrl.trim() || undefined;

        const updateSkillObj = (s: any) => {
            if (s.name === skillName) {
                return {
                    ...s,
                    icon: updatedIcon,
                    imageUrl: updatedImageUrl,
                    illustrationUrl: updatedIllustrationUrl
                };
            }
            return s;
        };

        if (isPlayer) {
            if (isBondSkill) {
                newChar.bondSkills = (newChar.bondSkills || []).map(updateSkillObj);
            } else {
                newChar.skills = (newChar.skills || []).map(updateSkillObj);
            }
        } else {
            const compIndex = newChar.companions.findIndex(c => c.id === labTargetId);
            if (compIndex !== -1) {
                newChar.companions[compIndex].skills = newChar.companions[compIndex].skills.map(updateSkillObj);
            } else {
                const incompIndex = (newChar.inactiveCompanions || []).findIndex(c => c.id === labTargetId);
                if (incompIndex !== -1 && newChar.inactiveCompanions) {
                    newChar.inactiveCompanions[incompIndex].skills = newChar.inactiveCompanions[incompIndex].skills.map(updateSkillObj);
                }
            }
        }

        onUpdateCharacter(newChar, `[스킬 연구소] ${targetEntity.name}의 스킬 [${skillName}] 미디어를 연구 수정했습니다.`);
        setEditingSkillName(null);

        setResultOverlay({
            show: true,
            data: {
                type: 'success',
                title: '스킬 연구 변경 완료!',
                message: (isNewCustomImg || isNewIllustration)
                    ? `마정석 5개를 소모하여 [${skillName}]의 미디어를 커스텀 설정했습니다.`
                    : `[${skillName}]의 기본 미디어를 연구 변경했습니다.`,
                items: [
                    { label: '대상 스킬', after: skillName },
                    { label: '소모 마정석', after: (isNewCustomImg || isNewIllustration) ? '5 개' : '0 개' }
                ]
            }
        });
    };

    // [NEW] 기지 내 시설 및 본부 완공 여부 자동 검사
    useEffect(() => {
        if (!character.base) return;
        const checkRes = checkAndCompleteBaseConstructions(character);
        if (checkRes.completedList.length > 0) {
            onUpdateCharacter(checkRes.updatedCharacter, checkRes.logs[0] || '시설 공사가 완료되었습니다.');
            setResultOverlay({
                show: true,
                data: {
                    type: 'success',
                    title: '시설 완공 알림',
                    message: `${checkRes.completedList.map(c => `${c.name} (Lv.${c.level})`).join(', ')}의 공사가 완료되었습니다!`,
                    items: checkRes.completedList.map(c => ({
                        label: c.name,
                        after: `Lv.${c.level} 완공`
                    }))
                }
            });
        }
    }, [character.currentDate, character.currentTime]);

    const [trainingTargetId, setTrainingTargetId] = useState<string | null>(null);
    const [trainingAmount, setTrainingAmount] = useState<number>(1);
    const [selectedWeaponType, setSelectedWeaponType] = useState<WeaponType>('Sword');
    const [upgradingFacility, setUpgradingFacility] = useState<string | null>(null); 
    
    // Storage Filters
    const [storageFilter, setStorageFilter] = useState<'all' | 'equip' | 'consumable' | 'etc'>('all');
    const [inventoryFilter, setInventoryFilter] = useState<'all' | 'equip' | 'consumable' | 'etc'>('all');

    // Training Sub-Navigation
    const [trainingSubTab, setTrainingSubTab] = useState<'menu' | 'exp' | 'stat' | 'mastery'>('menu');
    const [combatTrainingTab, setCombatTrainingTab] = useState<'growth' | 'style'>('growth');
    const [combatStyleTargetId, setCombatStyleTargetId] = useState<string>('player');
    const [combatStyleTierTab, setCombatStyleTierTab] = useState<1 | 2 | 3 | 4>(1);

    // 훈련 대상 동료 검색 및 정렬 상태 추가
    const [trainingSearchQuery, setTrainingSearchQuery] = useState('');
    const [trainingSortOption, setTrainingSortOption] = useState<'custom' | 'name' | 'level' | 'affection' | 'loyalty' | 'cp' | 'pureCp'>('custom');

    // 전투 훈련소 진행 중인 훈련 대원 검색, 필터, 정렬 상태
    const [traineeSearchQuery, setTraineeSearchQuery] = useState('');
    const [traineeSortOption, setTraineeSortOption] = useState<'default' | 'name' | 'levelDesc' | 'levelAsc' | 'cp' | 'pureCp' | 'days' | 'target'>('default');
    const [traineeTargetFilter, setTraineeTargetFilter] = useState<'all' | 'exp' | 'weapon' | 'skill' | 'stat'>('all');

    // Party State
    const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
    const [partySelection, setPartySelection] = useState<number[]>([]);

    // Interaction State
    const [interactionTarget, setInteractionTarget] = useState<Companion | null>(null);

    // Sub-Modals State
    const [isWorkshopOpen, setIsWorkshopOpen] = useState(false);
    const [isAlchemyOpen, setIsAlchemyOpen] = useState(false);
    const [isMonsterFarmOpen, setIsMonsterFarmOpen] = useState(false);
    const [isDispatchOpen, setIsDispatchOpen] = useState(false); 
    const [isMineOpen, setIsMineOpen] = useState(false);
    const [isMyHomeOpen, setIsMyHomeOpen] = useState(false); 
    const [isHousingModalOpen, setIsHousingModalOpen] = useState(false); 
    const [isFarmOpen, setIsFarmOpen] = useState(false);
    const [isCookingOpen, setIsCookingOpen] = useState(false);
    const [isLabOpen, setIsLabOpen] = useState(false);
    const [isSparringArenaOpen, setIsSparringArenaOpen] = useState(false);
    const [isMilitaryOpen, setIsMilitaryOpen] = useState(false);
    const [isRegionalOpen, setIsRegionalOpen] = useState(false);
    const [isWarOpen, setIsWarOpen] = useState(false);
    const [isTempleOpen, setIsTempleOpen] = useState(false);
    const [isMercenaryOpen, setIsMercenaryOpen] = useState(false);
    const [isPotentialBreakthroughOpen, setIsPotentialBreakthroughOpen] = useState(false);
    const [isTradeExchangeOpen, setIsTradeExchangeOpen] = useState(false);
    const [isCustomLabOpen, setIsCustomLabOpen] = useState(false);
    const [isSkillVfxLabOpen, setIsSkillVfxLabOpen] = useState(false);
    const [isChildAcademyOpen, setIsChildAcademyOpen] = useState(false);
    const [isMonsterArenaOpen, setIsMonsterArenaOpen] = useState(false);
    const [isCombatTrainingReportOpen, setIsCombatTrainingReportOpen] = useState(false);
    const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null);

    // Favorites state and handlers
    const [favorites, setFavorites] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(`base_favorites_${(character as any).id || character.name}`);
            return saved ? JSON.parse(saved) : ['storage', 'housing', 'farm'];
        } catch (e) {
            return ['storage', 'housing', 'farm'];
        }
    });
    const [isFavSettingsOpen, setIsFavSettingsOpen] = useState(false);

    const toggleFavorite = (facilityId: string) => {
        const updated = favorites.includes(facilityId)
            ? favorites.filter(id => id !== facilityId)
            : [...favorites, facilityId];
        setFavorites(updated);
        try {
            localStorage.setItem(`base_favorites_${(character as any).id || character.name}`, JSON.stringify(updated));
        } catch (e) {
            console.error(e);
        }
    };

    const handleNavigateToFacility = (facilityId: string) => {
        let instance = character.base?.layout?.find(inst => inst.type === facilityId);
        if (!instance) {
            if (facilityId.startsWith('training_')) {
                instance = character.base?.layout?.find(inst => inst.type === 'training' || inst.type.startsWith('training_'));
            } else if (facilityId === 'monster_farm' || facilityId === 'monster_ranch') {
                instance = character.base?.layout?.find(inst => inst.type === 'monster_farm' || inst.type === 'monster_ranch');
            } else if (facilityId === 'sparring_arena') {
                instance = character.base?.layout?.find(inst => inst.type === 'sparring_arena');
            } else if (facilityId === 'farm') {
                instance = character.base?.layout?.find(inst => inst.type === 'farm');
            } else if (facilityId === 'mine') {
                instance = character.base?.layout?.find(inst => inst.type === 'mine');
            }
        }
        if (instance) {
            if (instance.type.startsWith('training_') || facilityId.startsWith('training_')) {
                onFacilitySpecificAction(facilityId, 'open_modal');
            } else if (instance.type === 'farm') {
                setIsFarmOpen(true);
                setActiveInstanceId(instance.id);
            } else if (instance.type === 'mine') {
                setIsMineOpen(true);
                setActiveInstanceId(instance.id);
            } else if (instance.type === 'cooking') {
                setIsCookingOpen(true);
                setActiveInstanceId(instance.id);
            } else if (instance.type === 'custom_lab') {
                setIsCustomLabOpen(true);
                setActiveInstanceId(instance.id);
            } else if (instance.type === 'skill_vfx_lab') {
                setIsSkillVfxLabOpen(true);
                setActiveInstanceId(instance.id);
            } else if (instance.type === 'monster_farm' || instance.type === 'monster_ranch') {
                setIsMonsterFarmOpen(true);
                setActiveInstanceId(instance.id);
            } else if (instance.type === 'sparring_arena') {
                setIsSparringArenaOpen(true);
                setActiveInstanceId(instance.id);
            } else if (instance.type === 'child_academy') {
                setIsChildAcademyOpen(true);
                setActiveInstanceId(instance.id);
            } else if (instance.type === 'monster_arena') {
                setIsMonsterArenaOpen(true);
                setActiveInstanceId(instance.id);
            } else if (instance.type === 'workshop') {
                setIsWorkshopOpen(true);
                setActiveInstanceId(instance.id);
            } else if (instance.type === 'alchemy') {
                setIsAlchemyOpen(true);
                setActiveInstanceId(instance.id);
            } else if (instance.type === 'dispatch') {
                setIsDispatchOpen(true);
                setActiveInstanceId(instance.id);
            } else if (instance.type === 'lab') {
                setIsLabOpen(true);
                setActiveInstanceId(instance.id);
            } else {
                setSelectedFacility(instance.type);
                setSelectedInstanceId(instance.id);
            }
        }
    };

    // Initial sub-modal routing from quick shortcuts
    useEffect(() => {
        if (initialSubModal && initialSubModal.type) {
            const { type } = initialSubModal;
            const layoutItem = character.base?.layout?.find(f => f.type === type);
            setSelectedFacility(type);
            if (layoutItem?.id) {
                setSelectedInstanceId(layoutItem.id);
            }
        }
    }, [initialSubModal, character.base?.layout]);

    // Result Overlay State
    const [resultOverlay, setResultOverlay] = useState<{
        show: boolean;
        data: ResultData | null;
        onContinue?: () => void;
    }>({ show: false, data: null });

    // 거주민 탭에서 시설 배치 모달을 열기 위한 대상 거주민 ID 상태
    const [assigningResidentId, setAssigningResidentId] = useState<string | null>(null);

    const handleUnassignHouseDuty = (compId: string, houseId: string, role: 'chef' | 'housekeeper') => {
        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        const house = newChar.base?.houses?.find(h => h.id === houseId);
        if (!house) return;
        const compName = newChar.inactiveCompanions?.find(c => c.id === compId)?.name || '거주민';
        if (role === 'chef' && house.assignedChefId === compId) {
            house.assignedChefId = undefined;
            onUpdateCharacter(newChar, `[기지] ${compName} 동료를 ${house.name} 전담 요리사에서 해제했습니다.`);
        } else if (role === 'housekeeper' && house.assignedHousekeeperId === compId) {
            house.assignedHousekeeperId = undefined;
            onUpdateCharacter(newChar, `[기지] ${compName} 동료를 ${house.name} 숙소 관리인에서 해제했습니다.`);
        }
    };

    const handleQuickUnassignResident = (compId: string) => {
        const summary = getResidentDutySummary(character, compId);
        summary.facilityAssignments.forEach(fac => {
            if (fac.isMulti) {
                onAssignCompanion(compId, fac.instanceId);
            } else {
                onAssignCompanion('', fac.instanceId);
            }
        });
        if (summary.facilityAssignments.length === 0 && summary.houseDuties.length > 0) {
            const hd = summary.houseDuties[0];
            handleUnassignHouseDuty(compId, hd.houseId, hd.role);
        }
    };

    const handleUnassignAll = () => {
        const hasSingle = character.base?.assignments && Object.keys(character.base.assignments).length > 0;
        const hasMulti = character.base?.multiAssignments && Object.values(character.base.multiAssignments).some(arr => Array.isArray(arr) && arr.length > 0);
        if (!hasSingle && !hasMulti) {
            alert("활성화된 시설 업무 담당자가 없습니다.");
            return;
        }

        if (!confirm("현재 기지 시설에 배치된 모든 담당자들을 일괄 해제하시겠습니까?")) return;

        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        if (newChar.base) {
            newChar.base.assignments = {};
            newChar.base.multiAssignments = {};
            onUpdateCharacter(newChar, "[기지] 모든 시설 담당자 배치를 일괄 해제했습니다.");
            
            setResultOverlay({
                show: true,
                data: {
                    type: 'success',
                    title: '일괄 해제 완료',
                    message: '모든 시설 담당자가 해제되었습니다.',
                    items: []
                }
            });
        }
    };

    // [NEW] Resource Selling State
    const [sellingResource, setSellingResource] = useState<{ key: string, label: string, max: number, price: number, isShard?: boolean } | null>(null);
    useEffect(() => {
        setTrainingSubTab('menu');
    }, [selectedFacility]);

    useEffect(() => {
        if (selectedFacility === 'workshop') {
            setIsWorkshopOpen(true);
            setActiveInstanceId(selectedInstanceId);
            setSelectedFacility(null); 
        }
        if (selectedFacility === 'alchemy') {
            setIsAlchemyOpen(true);
            setActiveInstanceId(selectedInstanceId);
            setSelectedFacility(null);
        }
        if (selectedFacility === 'monster_farm' || selectedFacility === 'beast') {
            setIsMonsterFarmOpen(true);
            setActiveInstanceId(selectedInstanceId);
            setSelectedFacility(null);
        }
        if (selectedFacility === 'dispatch') { 
            setIsDispatchOpen(true);
            setActiveInstanceId(selectedInstanceId);
            setSelectedFacility(null);
        }
        if (selectedFacility === 'farm') {
            if (selectedInstanceId) {
                setActiveInstanceId(selectedInstanceId);
                setIsFarmOpen(true);
            }
            setSelectedFacility(null);
        }
        if (selectedFacility === 'my_home') {
            setIsMyHomeOpen(true);
            setActiveInstanceId(selectedInstanceId);
            setSelectedFacility(null);
        }
        if (selectedFacility === 'sparring_arena') {
            setIsSparringArenaOpen(true);
            setActiveInstanceId(selectedInstanceId);
            setSelectedFacility(null);
        }
        if (selectedFacility === 'child_academy') {
            setIsChildAcademyOpen(true);
            setActiveInstanceId(selectedInstanceId);
            setSelectedFacility(null);
        }
        if (selectedFacility === 'monster_arena') {
            setIsMonsterArenaOpen(true);
            setActiveInstanceId(selectedInstanceId);
            setSelectedFacility(null);
        }
        if (selectedFacility === 'potential_breakthrough') {
            setIsPotentialBreakthroughOpen(true);
            setActiveInstanceId(selectedInstanceId);
            setSelectedFacility(null);
        }
        if (selectedFacility === 'trade_exchange') {
            setIsTradeExchangeOpen(true);
            setActiveInstanceId(selectedInstanceId);
            setSelectedFacility(null);
        }
        if (selectedFacility === 'custom_lab') {
            setIsCustomLabOpen(true);
            setActiveInstanceId(selectedInstanceId);
            setSelectedFacility(null);
        }
    }, [selectedFacility, selectedInstanceId]);

    const isCompanionDispatched = (compId: string) => {
        const isBaseDispatched = character.base?.dispatched?.some(m => m.companionId === compId);
        const isWarDispatched = character.base?.dispatched?.some(m => 
            m.missionType === 'WarInvasion' && (m as any).participants?.includes(compId)
        );
        const isGroupDispatched = character.mercenaryData?.groupMissions?.some(m => m.memberIds.includes(compId));
        const isAssigned = Object.values(character.base?.assignments || {}).includes(compId);
        const isMultiAssigned = Object.values(character.base?.multiAssignments || {}).some(list => list.includes(compId));
        const isHouseChef = !!character.base?.houses?.some(h => h.assignedChefId === compId);
        const isHouseHK = !!character.base?.houses?.some(h => h.assignedHousekeeperId === compId);
        return isBaseDispatched || isWarDispatched || isGroupDispatched || isAssigned || isMultiAssigned || isHouseChef || isHouseHK;
    };

    const handleRecallCheck = (index: number) => {
        if (!character.inactiveCompanions) return;
        const comp = character.inactiveCompanions[index];
        
        if (isCompanionDispatched(comp.id)) {
            alert("해당 동료는 현재 파견 또는 성전/시설 근무 중이므로 불러올 수 없습니다.");
            return;
        }

        const routine = getCompanionRoutine(character, comp.id);
        if (!routine.canJoin) {
            alert("해당 동료는 현재 숙소에서 취침 중이므로 불러올 수 없습니다. 아침(08:00) 이후에 소집을 시도하세요.");
            return;
        }

        const isChild = comp.classType?.includes('자녀') || comp.classType?.includes('Child');
        const age = parseInt(comp.age.replace(/[^0-9]/g, '')) || 0;

        if (isChild && age < 11) {
            setResultOverlay({
                show: true,
                data: {
                    type: 'warning',
                    title: '동행 불가',
                    message: `자녀는 11세부터 모험(파티)에 참여할 수 있습니다.\n(현재 나이: ${age}세)`,
                    items: [{ label: '필요 나이', after: '11세 이상' }]
                }
            });
            return;
        }
        
        onRecallCompanion(index);
    };
  const handleSellResourceConfirm = (quantity: number) => {
        if (!sellingResource) return;
        const { key, label, price, isShard } = sellingResource;
        const totalGold = quantity * price;

        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        if (!newChar.base) return;

        if (isShard) {
            newChar.base.elementalShards[key] -= quantity;
        } else {
            (newChar.base.resources as any)[key] -= quantity;
        }
        newChar.money += totalGold;

        onUpdateCharacter(newChar, `[자원 판매] ${label} x${quantity} 판매 완료. (+${totalGold.toLocaleString()} G)`);
        setResultOverlay({
            show: true,
            data: {
                type: 'success',
                title: '자원 판매 완료',
                message: `기지의 여분 자원을 시장에 팔아 자금을 확보했습니다.`,
                items: [
                    { label: '판매 품목', after: label },
                    { label: '판매 수량', after: `${quantity}개` },
                    { label: '획득 골드', after: `+${totalGold.toLocaleString()} G` }
                ]
            }
        });
        setSellingResource(null);
    };

    const addTrainee = (compId: string) => {
        if (!character.base) return;

        // Active companion check (현재 파티원은 훈련 대상자 등록 불가)
        if (character.companions.some(c => c.id === compId)) {
            alert("현재 파티에 참가 중인 동료는 훈련소에 등록할 수 없습니다. 대기명단(기지 거주)에 있는 동료만 가능합니다.");
            return;
        }
        if (!(character.inactiveCompanions || []).some(c => c.id === compId)) {
            alert("대기명단에 있는 동료만 훈련할 수 있습니다.");
            return;
        }

        const unified = getUnifiedCombatTrainingData(character);
        if (unified.trainees.length >= unified.maxTrainees) {
            alert(`통합 전투 훈련소의 모든 훈련 칸(${unified.maxTrainees}칸)이 가득 찼습니다.\n전투 훈련소를 추가 건설하거나 증축하면 훈련 가능 인원이 계속 증가합니다.`);
            return;
        }

        if (unified.trainees.some(t => t.companionId === compId)) {
            alert("이미 훈련 대상자로 등록된 대원입니다.");
            return;
        }

        const currentAbsMin = getAbsoluteMinutes(character.currentDate || '2000-03-02', character.currentTime || '08:00');
        const updatedTrainees = [
            ...unified.trainees,
            {
                companionId: compId,
                startDate: character.currentDate || '2000-03-02',
                targetStat: 'exp' as const,
                lastTrainedAbsMinutes: currentAbsMin,
                accumulatedMinutes: 0
            }
        ];

        const newChar = syncUnifiedCombatTrainingToCharacter(character, updatedTrainees, unified.recentReports);
        onUpdateCharacter(newChar, `[기지] 새로운 대원을 통합 전투 훈련소 대상자로 등록했습니다.`);
    };

    const removeTrainee = (compId: string) => {
        if (!character.base) return;
        const unified = getUnifiedCombatTrainingData(character);
        const updatedTrainees = unified.trainees.filter(t => t.companionId !== compId);
        const newChar = syncUnifiedCombatTrainingToCharacter(character, updatedTrainees, unified.recentReports);
        onUpdateCharacter(newChar, `[기지] 훈련 대상자에서 제외했습니다.`);
    };

    const updateTraineeTarget = (compId: string, targetStat: 'exp' | 'str' | 'int' | 'agi' | 'wis' | 'def' | 'ctrl' | 'maxHp' | 'maxMp' | 'weapon' | 'skill') => {
        if (!character.base) return;
        const unified = getUnifiedCombatTrainingData(character);
        const updatedTrainees = unified.trainees.map(t => {
            if (t.companionId !== compId) return t;
            const updated = { ...t, targetStat };
            const comp = (character.inactiveCompanions || []).find(c => c.id === compId);
            if (targetStat === 'weapon' && !updated.targetWeaponType) {
                updated.targetWeaponType = (comp?.equipment?.weapon?.weaponType as WeaponType) || 'Sword';
            }
            if (targetStat === 'skill' && !updated.targetSkillName) {
                const availSkill = (comp?.skills || []).find(s => !(s.type === SkillType.PASSIVE && s.effectFormula?.includes('SPECIAL'))) || comp?.skills?.[0];
                if (availSkill) {
                    updated.targetSkillName = availSkill.name;
                }
            }
            return updated;
        });

        const newChar = syncUnifiedCombatTrainingToCharacter(character, updatedTrainees, unified.recentReports);
        const statLabel = targetStat === 'weapon' ? '무기 숙련도' : targetStat === 'skill' ? '스킬 숙련도' : targetStat === 'maxHp' ? '체력' : targetStat === 'maxMp' ? '마나' : targetStat.toUpperCase();
        onUpdateCharacter(newChar, `[기지] 훈련 목표를 ${statLabel}(으)로 변경했습니다.`);
    };

    const updateTraineeWeapon = (compId: string, weaponType: WeaponType) => {
        if (!character.base) return;
        const unified = getUnifiedCombatTrainingData(character);
        const updatedTrainees = unified.trainees.map(t => {
            if (t.companionId === compId) {
                return { ...t, targetWeaponType: weaponType };
            }
            return t;
        });

        const newChar = syncUnifiedCombatTrainingToCharacter(character, updatedTrainees, unified.recentReports);
        const compName = (character.inactiveCompanions || []).find(c => c.id === compId)?.name || '대원';
        const weaponName = WEAPON_TYPE_KOREAN[weaponType] || weaponType;
        onUpdateCharacter(newChar, `[기지] ${compName}의 훈련 무기를 [${weaponName}](으)로 지정했습니다.`);
    };

    const updateTraineeSkill = (compId: string, skillName: string) => {
        if (!character.base) return;
        const unified = getUnifiedCombatTrainingData(character);
        const updatedTrainees = unified.trainees.map(t => {
            if (t.companionId === compId) {
                return { ...t, targetSkillName: skillName };
            }
            return t;
        });

        const newChar = syncUnifiedCombatTrainingToCharacter(character, updatedTrainees, unified.recentReports);
        const compName = (character.inactiveCompanions || []).find(c => c.id === compId)?.name || '대원';
        onUpdateCharacter(newChar, `[기지] ${compName}의 훈련 스킬을 [${skillName}](으)로 지정했습니다.`);
    };

    const handlePlaceFacility = (x: number, y: number) => {
        if (!selectedBuildFacility || !character.base) return;
        
        const facilityInfo = FACILITIES_INFO.find(f => f.id === selectedBuildFacility);
        if (!facilityInfo) return;

        // Check uniqueness
        if (facilityInfo.isUnique) {
            const exists = (character.base.layout || []).some(f => f.type === selectedBuildFacility);
            if (exists) {
                alert(`${facilityInfo.name}은(는) 하나만 설치할 수 있습니다.`);
                return;
            }
        }

        // Check if cell is occupied
        const isOccupied = (character.base.layout || []).some(f => f.x === x && f.y === y);
        if (isOccupied) {
            alert("이미 시설이 설치된 구역입니다.");
            return;
        }

        const constructionCost = FACILITY_CONSTRUCTION_COSTS[selectedBuildFacility];
        const res = character.base.resources;
        if (constructionCost) {
            if ((constructionCost.gold && character.money < constructionCost.gold) ||
                (constructionCost.food && res.food < constructionCost.food) ||
                (constructionCost.wood && res.wood < constructionCost.wood) ||
                (constructionCost.stone && res.stone < constructionCost.stone) ||
                (constructionCost.iron && res.iron < constructionCost.iron) ||
                (constructionCost.manaCrystal && res.manaCrystal < constructionCost.manaCrystal)) {
                alert("자원이 부족합니다.");
                return;
            }
        }

        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        if (!newChar.base) return;

        const durationMinutes = getFacilityConstructionDuration(selectedBuildFacility, false, 1);
        const { completionDate, completionTime } = calculateCompletionDateTime(
            character.currentDate,
            character.currentTime,
            durationMinutes
        );

        const newInstance: FacilityInstance = {
            id: `${selectedBuildFacility}_${Date.now()}`,
            type: selectedBuildFacility,
            level: 0,
            x,
            y,
            width: 1,
            height: 1,
            underConstruction: true,
            targetLevel: 1,
            constructionStartDate: character.currentDate || '2000-03-02',
            constructionStartTime: character.currentTime || '08:00',
            constructionCompletionDate: completionDate,
            constructionCompletionTime: completionTime,
            totalConstructionMinutes: durationMinutes
        };

        if (!newChar.base.layout) newChar.base.layout = [];
        newChar.base.layout.push(newInstance);
        
        // Deduct resources
        if (constructionCost) {
            if (constructionCost.gold) newChar.money -= constructionCost.gold;
            if (constructionCost.food) newChar.base.resources.food -= constructionCost.food;
            if (constructionCost.wood) newChar.base.resources.wood -= constructionCost.wood;
            if (constructionCost.stone) newChar.base.resources.stone -= constructionCost.stone;
            if (constructionCost.iron) newChar.base.resources.iron -= constructionCost.iron;
            if (constructionCost.manaCrystal) newChar.base.resources.manaCrystal -= constructionCost.manaCrystal;
        }

        if (!newChar.base.facilityLevels[selectedBuildFacility]) {
            newChar.base.facilityLevels[selectedBuildFacility] = 0;
        }

        const rem = getConstructionRemainingTime(character.currentDate, character.currentTime, completionDate, completionTime);
        onUpdateCharacter(newChar, `[기지] ${facilityInfo.name} 신축 공사를 시작했습니다. (소요 시간: ${rem.text}, 완공 예정: ${completionDate} ${completionTime})`);
        setResultOverlay({
            show: true,
            data: {
                type: 'info',
                title: '시설 신축 공사 시작',
                message: `${facilityInfo.name} 건설 공사를 시작했습니다!\n\n공사가 진행되는 동안 시간이 지나면 자동으로 완공되며, 구역 맵에 실시간 남은 시간이 표시됩니다.`,
                items: [
                    { label: '시설', after: facilityInfo.name },
                    { label: '공사 소요 시간', after: rem.text },
                    { label: '완공 예정 일시', after: `${completionDate} ${completionTime}` }
                ]
            }
        });
        setIsBuildMode(false);
        setSelectedBuildFacility(null);
    };

    const handleRemoveFacility = (instanceId: string) => {
        if (!character.base) return;
        const layout = character.base.layout || [];
        const targetInstance = layout.find(f => f.id === instanceId);
        if (!targetInstance) return;

        const facilityInfo = FACILITIES_INFO.find(f => f.id === targetInstance.type);
        const facilityName = facilityInfo?.name || "시설";

        setResultOverlay({
            show: true,
            data: {
                type: "warning",
                title: "시설 폐쇄 확인",
                message: `정말로 [${facilityName}] 시설을 폐쇄하시겠습니까?\n\n배치된 모든 담당자는 자동 해제되며, 기지 공간이 다시 빈 구역으로 전환됩니다.`,
                items: [
                    { label: "대상 시설", after: `${facilityName} (Lv.${targetInstance.level || 1})` },
                    { label: "부지 상태", after: "빈 구역으로 전환" }
                ],
                continueText: "시설 폐쇄",
                cancelText: "취소"
            },
            onContinue: () => {
                executeRemoveFacility(instanceId);
            }
        });
    };

    const executeRemoveFacility = (instanceId: string) => {
        if (!character.base) return;
        const layout = character.base.layout || [];
        const targetInstance = layout.find(f => f.id === instanceId);
        if (!targetInstance) return;

        const facilityInfo = FACILITIES_INFO.find(f => f.id === targetInstance.type);
        const facilityName = facilityInfo?.name || "시설";

        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        if (!newChar.base) return;

        const removed = (newChar.base.layout || []).find(f => f.id === instanceId);
        newChar.base.layout = (newChar.base.layout || []).filter(f => f.id !== instanceId);

        // Remove single and multi assignments
        if (newChar.base.assignments && newChar.base.assignments[instanceId]) {
            delete newChar.base.assignments[instanceId];
        }
        if (newChar.base.multiAssignments && newChar.base.multiAssignments[instanceId]) {
            delete newChar.base.multiAssignments[instanceId];
        }
        if (newChar.base.combatTraining && newChar.base.combatTraining[instanceId]) {
            delete newChar.base.combatTraining[instanceId];
        }
        if (removed && removed.type === 'combat_training') {
            const remainingUnified = getUnifiedCombatTrainingData(newChar);
            if (remainingUnified.facilityCount > 0) {
                newChar.base = syncUnifiedCombatTrainingToCharacter(newChar, remainingUnified.trainees, remainingUnified.recentReports).base;
            }
        }

        // Update facilities list and levels if no more instances of this type exist
        if (removed && !(newChar.base.layout || []).some(f => f.type === removed.type)) {
            newChar.base.facilities = newChar.base.facilities.filter(f => f !== removed.type);
            if (newChar.base.facilityLevels) {
                delete newChar.base.facilityLevels[removed.type];
            }
            if (newChar.base.assignments && newChar.base.assignments[removed.type]) {
                delete newChar.base.assignments[removed.type];
            }
        }

        // Close overlay if viewing this instance
        if (selectedInstanceId === instanceId) {
            setSelectedInstanceId(null);
            setSelectedFacility(null);
        }

        onUpdateCharacter(newChar, `[기지] ${facilityName} 시설을 폐쇄하여 공터를 확보했습니다.`);

        setResultOverlay({
            show: true,
            data: {
                type: "info",
                title: "시설 폐쇄 완료",
                message: `[${facilityName}] 시설이 안전하게 폐쇄되었습니다. 이제 해당 구역에 새로운 시설을 건설할 수 있습니다.`,
                items: [
                    { label: "폐쇄 시설", after: facilityName },
                    { label: "부지 상태", after: "빈 구역으로 전환" }
                ],
                continueText: undefined,
                cancelText: "확인"
            },
            onContinue: undefined
        });
    };

    const handleBuildDefenseStructure = (structKey: string, instanceId: string) => {
        if (!character.base || !instanceId) return;
        const struct = DEFENSE_STRUCTURE_TEMPLATES.find(s => s.key === structKey);
        if (!struct) return;

        // 방어소 1개당 1개만 건설 가능 여부 체크
        const existing = (character.base.defenseStructures || []).find((s: any) => s.instanceId === instanceId);
        if (existing) {
            return;
        }

        const res = character.base.resources || { food: 0, wood: 0, stone: 0, iron: 0, manaCrystal: 0 };
        const goldCost = struct.cost.gold || 0;
        const woodCost = struct.cost.wood || 0;
        const stoneCost = struct.cost.stone || 0;
        const ironCost = struct.cost.iron || 0;
        const manaCrystalCost = struct.cost.manaCrystal || 0;

        if (character.money < goldCost || res.wood < woodCost || res.stone < stoneCost || res.iron < ironCost || res.manaCrystal < manaCrystalCost) {
            return;
        }

        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        if (!newChar.base) return;
        newChar.money -= goldCost;
        if (!newChar.base.resources) {
            newChar.base.resources = { food: 0, wood: 0, stone: 0, iron: 0, manaCrystal: 0 } as any;
        }
        newChar.base.resources.wood -= woodCost;
        newChar.base.resources.stone -= stoneCost;
        newChar.base.resources.iron -= ironCost;
        newChar.base.resources.manaCrystal -= manaCrystalCost;

        if (!newChar.base.defenseStructures) {
            newChar.base.defenseStructures = [];
        }

        const durationMinutes = getDefenseStructureConstructionDuration(struct.key);
        const curDate = character.currentDate || '2000-03-02';
        const curTime = character.currentTime || '08:00';
        const { completionDate, completionTime } = calculateCompletionDateTime(curDate, curTime, durationMinutes);

        newChar.base.defenseStructures.push({
            id: `${struct.key}_${Date.now()}`,
            key: struct.key,
            name: struct.name,
            defense: struct.defense,
            instanceId: instanceId,
            builtAt: new Date().toISOString(),
            underConstruction: true,
            constructionStartDate: curDate,
            constructionStartTime: curTime,
            constructionCompletionDate: completionDate,
            constructionCompletionTime: completionTime,
            totalConstructionMinutes: durationMinutes
        });

        const durationText = durationMinutes >= 60 ? `${Math.floor(durationMinutes / 60)}시간 ${durationMinutes % 60 > 0 ? `${durationMinutes % 60}분` : ''}`.trim() : `${durationMinutes}분`;
        onUpdateCharacter(newChar, `[방어소] ${struct.name} 건설 공사를 시작했습니다. (소요 시간: ${durationText}, 완공 예정: ${completionDate} ${completionTime})`);
    };

    const handleDismantleDefenseStructure = (id: string) => {
        if (!character.base || !character.base.defenseStructures) return;
        const structureIndex = character.base.defenseStructures.findIndex((s: any) => s.id === id);
        if (structureIndex === -1) return;

        const structData = character.base.defenseStructures[structureIndex];
        const template = DEFENSE_STRUCTURE_TEMPLATES.find(s => s.key === structData.key);

        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        if (!newChar.base) return;
        newChar.base.defenseStructures.splice(structureIndex, 1);

        if (template) {
            if (!newChar.base.resources) {
                newChar.base.resources = { food: 0, wood: 0, stone: 0, iron: 0, manaCrystal: 0 } as any;
            }
            const res = newChar.base.resources;
            res.wood = (res.wood || 0) + Math.floor((template.cost.wood || 0) * 0.5);
            res.stone = (res.stone || 0) + Math.floor((template.cost.stone || 0) * 0.5);
            res.iron = (res.iron || 0) + Math.floor((template.cost.iron || 0) * 0.5);
            res.manaCrystal = (res.manaCrystal || 0) + Math.floor((template.cost.manaCrystal || 0) * 0.5);
            newChar.money = (newChar.money || 0) + Math.floor((template.cost.gold || 0) * 0.5);
        }

        onUpdateCharacter(newChar, `[방어소] ${structData.name}을(를) 철거했습니다. (일부 자원 반환 완료)`);
    };

    const renderBaseGrid = () => {
        if (!character.base) return null;
        const gridSize = character.base.gridSize || 3;
        const layout = character.base.layout || [];
        const totalSlots = gridSize * gridSize;
        const occupiedSlots = layout.length;

        return (
            <div className="flex flex-col items-center w-full">
                {/* Tactical Header Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-center w-full mb-4 bg-slate-950/80 p-3 sm:p-3.5 rounded-xl border border-indigo-500/30 shadow-lg backdrop-blur-md gap-3">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="p-2 bg-indigo-900/40 border border-indigo-500/40 rounded-lg text-indigo-300 shrink-0">
                            <Layers size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                                전술 기지 배치도 <span className="text-xs text-indigo-400 font-mono font-normal">({gridSize}x{gridSize})</span>
                            </h3>
                            <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-slate-400 mt-0.5">
                                <span>설치 시설: <strong className="text-amber-400">{occupiedSlots}</strong>/{totalSlots}개</span>
                                <span className="text-slate-600">|</span>
                                <span>상태: <strong className={isBuildMode ? "text-emerald-400" : "text-indigo-300"}>{isBuildMode ? "건설 배치 모드" : "운영 관리 모드"}</strong></span>
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setIsBuildMode(!isBuildMode)}
                        className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 ${
                            isBuildMode 
                                ? 'bg-rose-900/70 hover:bg-rose-800 text-rose-200 border border-rose-500/60 shadow-rose-950/50' 
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/50 shadow-indigo-950/50'
                        }`}
                    >
                        {isBuildMode ? (
                            <><X size={14}/> 건설 모드 종료</>
                        ) : (
                            <><Hammer size={14}/> 시설 건설/배치</>
                        )}
                    </button>
                </div>

                {/* 기지 방어 피해 리포트 알림 배너 */}
                {character.base?.lastDefenseReport && (
                    <div className="w-full mb-4 bg-gradient-to-r from-red-950/80 via-slate-900 to-red-950/80 border border-red-600/70 p-3 sm:p-4 rounded-xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="p-2 bg-red-900/50 border border-red-500/60 rounded-lg text-red-400 shrink-0">
                                <AlertTriangle size={20} className="animate-pulse" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white flex items-center gap-2">
                                    <span>최근 기지 습격 피해 통계 리포트</span>
                                    {character.base.lastDefenseReport.restored ? (
                                        <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-600 px-2 py-0.5 rounded-full font-bold">
                                            복구 완료됨
                                        </span>
                                    ) : (
                                        <span className="text-[10px] bg-red-950 text-red-400 border border-red-700 px-2 py-0.5 rounded-full font-bold">
                                            복구 대기 중
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-400 mt-0.5">
                                    발생 일시: {character.base.lastDefenseReport.timestamp} | 파손 시설: {character.base.lastDefenseReport.facilityDamages.length}개소 | 예상 복구비: {character.base.lastDefenseReport.totalRepairCost.gold.toLocaleString()} G
                                </div>
                            </div>
                        </div>
                        {onShowDamageReport && (
                            <button
                                onClick={() => onShowDamageReport(character.base!.lastDefenseReport!)}
                                className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white text-xs font-bold transition-all border border-red-500 flex items-center justify-center gap-1.5 shadow-md active:scale-95 whitespace-nowrap"
                            >
                                <Eye size={14} /> 피해 통계 리포트 상세 확인
                            </button>
                        )}
                    </div>
                )}

                {/* Construction Palette Drawer (Build Mode) */}
                {isBuildMode && (
                    <div className="w-full bg-slate-950/95 p-3 sm:p-4 rounded-xl border border-indigo-500/40 shadow-2xl mb-4 sm:mb-5 animate-in slide-in-from-top-3 backdrop-blur-md">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 border-b border-slate-800/80 pb-2 gap-1">
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                <Hammer size={14} /> 건설 가능 시설 목록
                            </span>
                            <span className="text-[11px] text-slate-400">시설을 선택한 후 아래 배치도의 빈 구역을 클릭하세요.</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                            {FACILITIES_INFO.map(f => {
                                const isUnlocked = (character.base?.level || 0) >= f.minLevel;
                                const isUnique = (f as any).isUnique;
                                const alreadyExists = (character.base?.layout || []).some(inst => inst.type === f.id);
                                const disabled = !isUnlocked || (isUnique && alreadyExists);
                                const isSelected = selectedBuildFacility === f.id;

                                return (
                                    <button
                                        key={f.id}
                                        disabled={disabled}
                                        onClick={() => setSelectedBuildFacility(f.id)}
                                        className={`p-2 sm:p-2.5 rounded-lg border text-left flex flex-col justify-between gap-1.5 transition-all relative group ${
                                            isSelected 
                                                ? 'bg-emerald-950/70 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400' 
                                                : disabled 
                                                    ? 'bg-slate-900/40 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed' 
                                                    : 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:border-emerald-500/70 hover:bg-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className="font-bold text-xs truncate">{f.name}</span>
                                            {isUnique && <span className="text-[9px] bg-amber-950 text-amber-400 border border-amber-800/60 px-1 py-0.2 rounded shrink-0">고유</span>}
                                        </div>
                                        
                                        {!isUnlocked ? (
                                            <span className="text-[9px] text-rose-400 flex items-center gap-1"><Lock size={10}/> 기지 Lv.{f.minLevel} 필요</span>
                                        ) : alreadyExists && isUnique ? (
                                            <span className="text-[9px] text-slate-500">이미 건설됨</span>
                                        ) : (
                                            (() => {
                                                const cost = FACILITY_CONSTRUCTION_COSTS[f.id];
                                                if (!cost) return null;
                                                return (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {cost.gold && <span className="text-[9px] bg-amber-950/60 text-amber-300 px-1 rounded border border-amber-800/40">{cost.gold.toLocaleString()}G</span>}
                                                        {cost.food && <span className="text-[9px] bg-emerald-950/60 text-emerald-300 px-1 rounded border border-emerald-800/40">식량{cost.food}</span>}
                                                        {cost.wood && <span className="text-[9px] bg-amber-900/40 text-amber-200 px-1 rounded border border-amber-700/40">목재{cost.wood}</span>}
                                                        {cost.stone && <span className="text-[9px] bg-slate-800 text-slate-300 px-1 rounded border border-slate-700">석재{cost.stone}</span>}
                                                        {cost.iron && <span className="text-[9px] bg-blue-950/60 text-blue-300 px-1 rounded border border-blue-800/40">철{cost.iron}</span>}
                                                        {cost.manaCrystal && <span className="text-[9px] bg-purple-950/60 text-purple-300 px-1 rounded border border-purple-800/40">마정석{cost.manaCrystal}</span>}
                                                    </div>
                                                );
                                            })()
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Tactical Blueprint Map Frame */}
                <div className="relative w-full bg-slate-950/90 border border-indigo-500/30 rounded-2xl p-2.5 sm:p-4 md:p-5 shadow-[0_0_30px_rgba(15,23,42,0.8)] backdrop-blur-md">
                    {/* Corner HUD accents */}
                    <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-indigo-400/60 pointer-events-none"></div>
                    <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-indigo-400/60 pointer-events-none"></div>
                    <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-indigo-400/60 pointer-events-none"></div>
                    <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-indigo-400/60 pointer-events-none"></div>

                    {/* Mobile Horizontal Scroll Indicator */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 px-1 sm:hidden">
                        <span className="flex items-center gap-1.5"><Layers size={13} className="text-indigo-400"/> 좌우로 스크롤하여 구역 확인</span>
                        <span className="text-[10px] text-indigo-300 font-mono bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-800/60">{gridSize}x{gridSize} 격자</span>
                    </div>

                    {/* Grid Pattern Background in Scrollable Viewport */}
                    <div className="w-full overflow-x-auto custom-scrollbar pb-2 pt-1 touch-auto">
                        <div 
                            className="grid gap-2 relative z-10 mx-auto"
                            style={{ 
                                gridTemplateColumns: `repeat(${gridSize}, minmax(${gridSize >= 5 ? '84px' : '76px'}, 1fr))`,
                                minWidth: `${gridSize * (gridSize >= 5 ? 88 : 80)}px`,
                                maxWidth: '100%'
                            }}
                        >
                            {Array.from({ length: totalSlots }).map((_, i) => {
                                const x = i % gridSize;
                                const y = Math.floor(i / gridSize);
                                const instance = layout.find(f => f.x === x && f.y === y);
                                const facilityInfo = instance ? FACILITIES_INFO.find(f => f.id === instance.type) : null;
                                const isMulti = facilityInfo ? (facilityInfo.id === 'farm' || facilityInfo.id === 'mine' || facilityInfo.id === 'alchemy' || facilityInfo.id === 'cooking' || facilityInfo.id === 'lab' || facilityInfo.id === 'workshop') : false;
                                
                                const assignedIds = instance ? (
                                    isMulti 
                                        ? (base?.multiAssignments?.[instance.id] || [])
                                        : (base?.assignments?.[instance.id] ? [base?.assignments?.[instance.id] as string] : [])
                                ) : [];
                                const assignedComps = (character.inactiveCompanions || []).filter(c => assignedIds.includes(c.id));

                                // Color styling depending on facility type
                                const getFacilityColorStyle = (type: string, isUnderConstruction?: boolean) => {
                                    if (isUnderConstruction) {
                                        return 'border-amber-500/90 bg-gradient-to-b from-amber-950/80 to-slate-900/90 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]';
                                    }
                                    if (type === 'cooking' || type === 'farming') return 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
                                    if (type === 'mining' || type === 'crafting') return 'border-cyan-500/60 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]';
                                    if (type === 'alchemy' || type === 'research') return 'border-purple-500/60 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 shadow-[0_0_15px_rgba(168,85,247,0.15)]';
                                    if (type === 'custom_lab') return 'border-pink-500/60 bg-pink-950/40 text-pink-300 hover:bg-pink-900/60 shadow-[0_0_15px_rgba(236,72,153,0.15)]';
                                    if (type.startsWith('training_') || type === 'combat_training') return 'border-rose-500/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 shadow-[0_0_15px_rgba(244,63,94,0.15)]';
                                    if (type === 'home' || type === 'my_home') return 'border-indigo-500/60 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60 shadow-[0_0_15px_rgba(99,102,241,0.15)]';
                                    return 'border-amber-500/60 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 shadow-[0_0_15px_rgba(245,158,11,0.15)]';
                                };

                                return (
                                    <div 
                                        key={i}
                                        onClick={() => {
                                            if (isBuildMode) {
                                                handlePlaceFacility(x, y);
                                            } else if (instance) {
                                                if (instance.underConstruction) {
                                                    const rem = getConstructionRemainingTime(character.currentDate, character.currentTime, instance.constructionCompletionDate, instance.constructionCompletionTime);
                                                    const progress = getConstructionProgress(instance.totalConstructionMinutes, rem.remainingMinutes);
                                                    setResultOverlay({
                                                        show: true,
                                                        data: {
                                                            type: 'info',
                                                            title: `${facilityInfo?.name || '시설'} 공사 진행 중`,
                                                            message: `현재 시설 공사가 한창 진행되고 있습니다!\n\n완공 예정 일시: ${instance.constructionCompletionDate} ${instance.constructionCompletionTime}\n남은 시간: ${rem.text}`,
                                                            items: [
                                                                { label: '목표 레벨', after: `Lv.${instance.targetLevel || 1}` },
                                                                { label: '공사 진행률', after: `${progress}%` },
                                                                { label: '남은 시간', after: rem.text }
                                                            ]
                                                        }
                                                    });
                                                    return;
                                                }
                                                if (instance.type.startsWith('training_')) {
                                                    onFacilitySpecificAction(instance.type, 'open_modal');
                                                } else if (instance.type === 'cooking') {
                                                    setIsCookingOpen(true);
                                                    setActiveInstanceId(instance.id);
                                                } else {
                                                    setSelectedFacility(instance.type);
                                                    setSelectedInstanceId(instance.id);
                                                }
                                            }
                                        }}
                                        onMouseEnter={() => setHoveredCell({x, y})}
                                        onMouseLeave={() => setHoveredCell(null)}
                                        className={`relative rounded-xl border flex flex-col items-center justify-between p-2 min-h-[96px] sm:min-h-[106px] transition-all duration-200 cursor-pointer select-none group ${
                                            instance 
                                                ? getFacilityColorStyle(instance.type, instance.underConstruction)
                                                : isBuildMode 
                                                    ? 'bg-emerald-950/20 border-2 border-dashed border-emerald-500/40 hover:bg-emerald-900/30 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.25)]' 
                                                    : 'bg-slate-900/40 border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-900/70'
                                        }`}
                                    >
                                        {instance ? (
                                            <>
                                                {/* Top badges: Level & Action */}
                                                <div className="flex justify-between items-center w-full z-10 gap-1">
                                                    {instance.underConstruction ? (
                                                        <span className="text-[10px] font-extrabold bg-amber-950/95 text-amber-300 border border-amber-500/70 px-1.5 py-0.5 rounded-md shadow-sm shrink-0 flex items-center gap-1 animate-pulse">
                                                            <Hammer size={10} className="text-amber-400" /> 공사 중
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-extrabold bg-slate-900/90 text-amber-400 border border-amber-500/40 px-1.5 py-0.5 rounded-md shadow-sm shrink-0">
                                                            Lv.{instance.level}
                                                        </span>
                                                    )}

                                                    {isBuildMode ? (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleRemoveFacility(instance.id); }}
                                                            className="bg-rose-600 hover:bg-rose-500 text-white rounded-md p-1 shadow-md transition-transform hover:scale-110 shrink-0"
                                                            title="철거"
                                                        >
                                                            <Trash2 size={11} />
                                                        </button>
                                                    ) : (!instance.underConstruction && !['home', 'my_home'].includes(instance.type) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setAssigningInstanceId(instance.id);
                                                            }}
                                                            className="bg-slate-900/90 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700 hover:border-indigo-400 rounded-md p-1 transition-all shadow-sm shrink-0"
                                                            title="담당자 배치"
                                                        >
                                                            <UserCheck size={11} />
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Center Icon & Title */}
                                                <div className="flex flex-col items-center justify-center flex-1 my-1 text-center w-full min-w-0">
                                                    <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 shadow-inner mb-1 group-hover:scale-105 transition-transform">
                                                        {instance.underConstruction ? (
                                                            <Hammer className="text-amber-400 animate-bounce" size={18} />
                                                        ) : (() => {
                                                            const type = instance.type;
                                                            if (type === 'cooking') return <Flame className="text-orange-400" size={18} />;
                                                            if (type === 'mining') return <Pickaxe className="text-cyan-400" size={18} />;
                                                            if (type === 'farming') return <Leaf className="text-emerald-400" size={18} />;
                                                            if (type === 'research') return <BookOpen className="text-blue-400" size={18} />;
                                                            if (type === 'alchemy') return <FlaskConical className="text-purple-400" size={18} />;
                                                            if (type === 'custom_lab') return <Wand2 className="text-pink-400" size={18} />;
                                                            if (type === 'crafting') return <Hammer className="text-amber-400" size={18} />;
                                                            if (type.startsWith('training_')) return <Sword className="text-rose-400" size={18} />;
                                                            if (type === 'combat_training') return <Target className="text-rose-400" size={18} />;
                                                            if (type === 'home' || type === 'my_home') return <Home className="text-indigo-400" size={18} />;
                                                            if (type === 'stable') return <Dog className="text-amber-500" size={18} />;
                                                            return <Building2 className="text-slate-400" size={18} />;
                                                        })()}
                                                    </div>
                                                    <span className="text-[11px] sm:text-xs font-bold text-slate-100 leading-tight truncate w-full block text-center px-0.5">
                                                        {facilityInfo?.name}
                                                    </span>
                                                    {instance.underConstruction && (
                                                        <span className="text-[9px] text-amber-400/90 font-bold block truncate">
                                                            Lv.{instance.targetLevel || 1} 목표
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Bottom Assignee / Construction Footer */}
                                                <div className="w-full text-center mt-auto">
                                                    {instance.underConstruction ? (
                                                        (() => {
                                                            const rem = getConstructionRemainingTime(character.currentDate, character.currentTime, instance.constructionCompletionDate, instance.constructionCompletionTime);
                                                            const progress = getConstructionProgress(instance.totalConstructionMinutes, rem.remainingMinutes);
                                                            return (
                                                                <div className="w-full">
                                                                    <span className="text-[9px] sm:text-[10px] font-extrabold text-amber-300 truncate block w-full text-center leading-tight">
                                                                        {rem.text}
                                                                    </span>
                                                                    <div className="w-full bg-slate-950/80 rounded-full h-1.5 overflow-hidden border border-amber-600/40 mt-1">
                                                                        <div className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()
                                                    ) : assignedComps.length > 0 ? (
                                                        <span className="text-[9px] sm:text-[10px] font-semibold text-amber-300 bg-slate-900/90 px-1 py-0.5 rounded border border-amber-500/30 truncate block w-full text-center">
                                                            {assignedComps.length === 1 ? assignedComps[0].name : `${assignedComps[0].name} 외 ${assignedComps.length - 1}명`}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] text-slate-500 font-mono block text-center">미배치</span>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            /* Empty Cell */
                                            <div className="flex flex-col items-center justify-center h-full w-full py-2">
                                                {isBuildMode ? (
                                                    selectedBuildFacility && hoveredCell?.x === x && hoveredCell?.y === y ? (
                                                        <div className="text-center p-1 animate-pulse">
                                                            <span className="text-[10px] text-emerald-400 font-bold block truncate">
                                                                {FACILITIES_INFO.find(f => f.id === selectedBuildFacility)?.name}
                                                            </span>
                                                            <span className="text-[9px] text-emerald-300">건설하기</span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center text-emerald-500/70 group-hover:text-emerald-400">
                                                            <Hammer size={16} className="mx-auto mb-1" />
                                                            <span className="text-[10px] font-bold">건설 가능</span>
                                                        </div>
                                                    )
                                                ) : (
                                                    <span className="text-[10px] text-slate-700 font-mono group-hover:text-slate-500">
                                                        ({x+1}, {y+1})
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };


    const handleBaseUpgrade = () => {
        if (!character.base) return;
        const nextLevel = character.base.level + 1;
        const config = BASE_LEVEL_CONFIG[nextLevel];
        const resourceCost = BASE_UPGRADE_COSTS[nextLevel];

        if (!config) return alert("더 이상 업그레이드할 수 없습니다.");
        if (character.money < config.cost) return alert("골드가 부족합니다.");
        if (character.level < config.requiredLevel) return alert("레벨이 부족합니다.");
        
        const res = character.base.resources;
        if (resourceCost) {
            const missing = [];
            if (res.food < resourceCost.food) missing.push(`식량 ${resourceCost.food - res.food}`);
            if (res.wood < resourceCost.wood) missing.push(`목재 ${resourceCost.wood - res.wood}`);
            if (res.stone < resourceCost.stone) missing.push(`석재 ${resourceCost.stone - res.stone}`);
            if (res.iron < resourceCost.iron) missing.push(`철광석 ${resourceCost.iron - res.iron}`);
            if (res.manaCrystal < resourceCost.manaCrystal) missing.push(`마정석 ${resourceCost.manaCrystal - res.manaCrystal}`);

            if (missing.length > 0) {
                setResultOverlay({
                    show: true,
                    data: {
                        type: 'warning',
                        title: '자원 부족',
                        message: '기지 단계를 올리기 위한 자원이 부족합니다.',
                        items: missing.map(m => ({ label: '부족', after: m }))
                    }
                });
                return;
            }
        }

        const daysRequired = resourceCost?.time || 1;
        const durationMinutes = daysRequired * 24 * 60;
        const { completionDate, completionTime } = calculateCompletionDateTime(
            character.currentDate || '2000-03-02',
            character.currentTime || '08:00',
            durationMinutes
        );

        const newChar = JSON.parse(JSON.stringify(character)) as Character;
        const newBase = newChar.base!;
        newBase.underConstruction = true;
        newBase.targetLevel = nextLevel;
        newBase.constructionStartDate = character.currentDate || '2000-03-02';
        newBase.constructionStartTime = character.currentTime || '08:00';
        newBase.constructionCompletionDate = completionDate;
        newBase.constructionCompletionTime = completionTime;
        newBase.totalConstructionMinutes = durationMinutes;

        newChar.money -= config.cost;
        if (resourceCost) {
            newBase.resources.food -= resourceCost.food;
            newBase.resources.wood -= resourceCost.wood;
            newBase.resources.stone -= resourceCost.stone;
            newBase.resources.iron -= resourceCost.iron;
            newBase.resources.manaCrystal -= resourceCost.manaCrystal;
        }

        newChar.base = newBase;
        const rem = getConstructionRemainingTime(character.currentDate, character.currentTime, completionDate, completionTime);
        onUpdateCharacter(newChar, `[기지] 기지 본부 Lv.${nextLevel} (${config.description}) 증축 공사를 시작했습니다. (소요 시간: ${rem.text}, 완공 예정: ${completionDate} ${completionTime})`);
        
        setResultOverlay({
            show: true,
            data: {
                type: 'info',
                title: '기지 본부 증축 공사 시작',
                message: `기지 본부의 Lv.${nextLevel} (${config.description}) 증축 공사를 시작했습니다!\n\n공사가 진행되는 동안 시간이 지나면 자동으로 완공되며, 개요 및 기지 설정 화면에 실시간 남은 시간이 표시됩니다.`,
                items: [
                    { label: '목표 단계', after: `기지 본부 Lv.${nextLevel} (${config.description})` },
                    { label: '공사 소요 시간', after: rem.text },
                    { label: '완공 예정 일시', after: `${completionDate} ${completionTime}` }
                ]
            }
        });
    };

    const getInteractionOptions = (target: Companion) => {
        const normalizeGender = (g: string) => {
            if (['남성','남자','male','man'].includes(g.toLowerCase())) return 'M';
            if (['여성','여자','female','woman'].includes(g.toLowerCase())) return 'F';
            return 'U';
        };
        
        const pGender = normalizeGender(character.gender);
        const cGender = normalizeGender(target.gender);
        const isSameGender = pGender !== 'U' && cGender !== 'U' && pGender === cGender;
        const isLover = target.isLover;

        if (isLover) {
            return [
                { label: '대화하기', icon: MessageCircle, color: 'text-indigo-400' },
                { label: '술 마시기', icon: Wine, color: 'text-amber-400' },
                { label: '스킨십하기', icon: Heart, color: 'text-pink-400' },
                { label: '함께 밤을 보내기', icon: BedDouble, color: 'text-purple-400', special: true },
            ];
        }
        
        if (isSameGender) {
            return [
                { label: '대화하기', icon: MessageCircle, color: 'text-indigo-400' },
                { label: '술 마시기', icon: Wine, color: 'text-amber-400' },
                { label: '게임하기', icon: Gamepad2, color: 'text-green-400' },
            ];
        } else {
            return [
                { label: '대화하기', icon: MessageCircle, color: 'text-indigo-400' },
                { label: '술 마시기', icon: Wine, color: 'text-amber-400' },
                { label: '스킨십하기', icon: Hand, color: 'text-pink-300' },
            ];
        }
    };

    const handleInteractClick = (comp: Companion) => {
        setInteractionTarget(comp);
    };

    const togglePartySelection = (idx: number) => {
        if (partySelection.includes(idx)) {
            setPartySelection(partySelection.filter(i => i !== idx));
        } else {
            setPartySelection([...partySelection, idx]);
        }
    };

    // [MODIFIED] handleHostParty: processTimeSkip 시뮬레이션 적용
    const handleHostPartyLocal = (selectedIndices: number[]) => {
        const companionCount = selectedIndices.length;
        if (companionCount === 0) return alert("동료를 선택해주세요.");
        
        const foodCost = companionCount;
        const goldCost = companionCount * 5000;
        const res = character.base?.resources;
        
        if (!res || res.food < foodCost || character.money < goldCost) {
            alert("자원이 부족합니다.");
            return;
        }

        const { updatedCharacter, systemLogs } = processTimeSkip(character, 1);
        const newChar = { ...updatedCharacter };

        newChar.money -= goldCost;
        newChar.base!.resources.food -= foodCost;
        
        // 정비 및 회복 효과
        const heal = (entity: any) => {
            const fStats = calculateFinalStats(entity).finalStats;
            entity.stats.hp = fStats.maxHp;
            entity.stats.mp = fStats.maxMp;
        };
        heal(newChar);
        newChar.companions.forEach(heal);
        if (newChar.inactiveCompanions) newChar.inactiveCompanions.forEach(heal);

        // 호감도 처리
        const names: string[] = [];
        selectedIndices.forEach(idx => {
            if (newChar.inactiveCompanions && newChar.inactiveCompanions[idx]) {
                const comp = newChar.inactiveCompanions[idx];
                comp.affection = Math.min(100, comp.affection + 2);
                names.push(comp.name);
            }
        });

        systemLogs.forEach(log => onUpdateCharacter(newChar, log));
        onUpdateCharacter(newChar, `[시스템] 파티를 개최했습니다. (${names.join(', ')} 호감도 상승, 1일 경과)`);
        
        setResultOverlay({
            show: true,
            data: {
                type: 'success',
                title: '파티 성공!',
                message: `즐거운 시간을 보냈습니다. 모두의 피로가 씻은 듯 사라졌습니다.\n${systemLogs.length > 0 ? '\n[오늘의 뉴스]\n' + systemLogs.slice(0, 2).join('\n') : ''}`,
                items: [
                    { label: '호감도', after: '+2 (참여자)' },
                    { label: 'HP/MP', after: '전원 회복' },
                    { label: '날짜', after: '1일 경과' }
                ]
            }
        });
        setIsPartyModalOpen(false);
    };

    // [MODIFIED] handleInteractionLocal: processTimeSkip 시뮬레이션 적용
    const handleInteractionLocal = (compId: string, choice: string) => {
        const { updatedCharacter, systemLogs } = processTimeSkip(character, 1);
        const newChar = { ...updatedCharacter };
        
        let targetComp: Companion | undefined;
        let isInactive = false;
        let compIndex = newChar.companions.findIndex(c => c.id === compId);
        
        if (compIndex !== -1) {
            targetComp = newChar.companions[compIndex];
        } else if (newChar.inactiveCompanions) {
            compIndex = newChar.inactiveCompanions.findIndex(c => c.id === compId);
            if (compIndex !== -1) {
                targetComp = newChar.inactiveCompanions[compIndex];
                isInactive = true;
            }
        }

        if (!targetComp) return;

        let affectChange = 1;
        let outcomeMsg = "즐거운 교류의 시간이었습니다.";

        if (choice === '함께 밤을 보내기') {
            affectChange = 2;
            outcomeMsg = "서로의 마음을 확인하며 깊은 밤을 보냈습니다.";
        }

        targetComp.affection = Math.min(100, targetComp.affection + affectChange);
        
        systemLogs.forEach(log => onUpdateCharacter(newChar, log));
        onUpdateCharacter(newChar, `[시스템] ${targetComp.name}와(과) ${choice} 시간을 보냈습니다. (1일 경과)`);

        setResultOverlay({
            show: true,
            data: {
                type: 'info',
                title: '교류 완료',
                message: `${outcomeMsg}\n${systemLogs.length > 0 ? '\n[교류 중 발생한 소식]\n' + systemLogs.slice(0, 2).join('\n') : ''}`,
                items: [
                    { label: '호감도', after: `+${affectChange}` },
                    { label: '날짜', after: '1일 경과' }
                ]
            }
        });
        setInteractionTarget(null);
    };

    /**
     * [NEW] 시설별 담당자 보너스 텍스트 생성 헬퍼
     */
    const getFacilityBonusText = (facilityId: string, assignee: Companion | undefined, allAssignees?: Companion[]) => {
        const hasMultiple = allAssignees && allAssignees.length > 0;
        if (!assignee && !hasMultiple) return null;
        
        let bonusInfo = "";

        if (facilityId === 'farm' && hasMultiple) {
            let totalYieldBonus = 0;
            allAssignees.forEach(comp => {
                const farmingLevel = comp.professions?.farming?.level || 1;
                totalYieldBonus += Math.floor((farmingLevel - 1) * 0.5);
            });
            bonusInfo = `총 보너스: 수확량 +${totalYieldBonus} (인원: ${allAssignees.length}명)`;
            return <p className="text-[10px] text-green-400 mt-0.5 flex items-center"><Leaf size={10} className="mr-1"/> {bonusInfo}</p>;
        }

        if (facilityId === 'mine' && hasMultiple) {
            let totalMasteryBonus = 0;
            allAssignees.forEach(comp => {
                const miningLevel = comp.professions?.mining?.level || 1;
                totalMasteryBonus += Math.floor(miningLevel * 0.5);
            });
            bonusInfo = `총 보너스: 광물 수확량 +${totalMasteryBonus} (인원: ${allAssignees.length}명)`;
            return <p className="text-[10px] text-amber-400 mt-0.5 flex items-center"><Mountain size={10} className="mr-1"/> {bonusInfo}</p>;
        }

        if (facilityId === 'alchemy' && hasMultiple) {
            let masteryYieldBonus = 0;
            const alchemistsCount = allAssignees.filter(comp => comp.job === '연금술사').length;
            allAssignees.forEach(comp => {
                if (comp.job === '연금술사') {
                    const alchemyLevel = comp.professions?.alchemy?.level || 1;
                    masteryYieldBonus += alchemyLevel + 1;
                }
            });
            bonusInfo = `총 보너스: 마정석 조각 생산량 +${masteryYieldBonus} (인원: ${alchemistsCount}명)`;
            return <p className="text-[10px] text-fuchsia-400 mt-0.5 flex items-center"><FlaskConical size={10} className="mr-1"/> {bonusInfo}</p>;
        }

        if (facilityId === 'cooking' && hasMultiple) {
            let totalCookingLevel = 0;
            const chefsCount = allAssignees.filter(comp => comp.job === '요리사').length;
            allAssignees.forEach(comp => {
                if (comp.job === '요리사') {
                    const cookLevel = comp.professions?.cooking?.level || 1;
                    totalCookingLevel += cookLevel;
                }
            });
            bonusInfo = `총 요리 숙련도 합계: Lv.${totalCookingLevel} (인원: ${chefsCount}명)`;
            return <p className="text-[10px] text-orange-400 mt-0.5 flex items-center"><Flame size={10} className="mr-1"/> {bonusInfo}</p>;
        }

        if (facilityId === 'workshop' && hasMultiple) {
            const smiths = allAssignees.filter(comp => comp.job === JobType.BLACKSMITH);
            let totalCtrl = 0;
            smiths.forEach(comp => {
                totalCtrl += calculateFinalStats(comp).finalStats.ctrl || 0;
            });
            const bonusWork = (totalCtrl * 0.01 + smiths.length * 5).toFixed(1);
            bonusInfo = `담당 대장장이: ${smiths.length}명 (강화/제작 성공률 보너스 +${bonusWork}%)`;
            return <p className="text-[10px] text-amber-400 mt-0.5 flex items-center"><Hammer size={10} className="mr-1"/> {bonusInfo}</p>;
        }
        if (facilityId === 'storage' && assignee) {
            const strBonus = calculateFinalStats(assignee).finalStats.str;
            return <p className="text-[10px] text-blue-400 mt-0.5 flex items-center"><Box size={10} className="mr-1"/> 창고 확장: +{strBonus.toLocaleString()} (STR 보너스)</p>;
        }

        if (!assignee) return null;
        
        // [MODIFIED] Use finalStats instead of basic stats for bonus calculation display
        const { finalStats: stats } = calculateFinalStats(assignee);

        switch(facilityId) {
            case 'farm':
                const farmingLevel = assignee.professions?.farming?.level || 1;
                const yieldBonus = Math.floor((farmingLevel - 1) * 0.5);
                bonusInfo = `전문화 보너스: 수확량 +${yieldBonus} (숙련도 Lv.${farmingLevel})`;
                break;
            case 'mine':
                const miningLevel = assignee.professions?.mining?.level || 1;
                const masteryMine = Math.floor(miningLevel * 0.5);
                bonusInfo = `광물 수확량 +${masteryMine} (숙련도 Lv.${miningLevel})`;
                break;
            case 'alchemy':
                const ctrlBonusAlc = Math.floor(stats.ctrl * 0.05);
                bonusInfo = `마정석 정제 +${ctrlBonusAlc} (CTRL)`;
                break;
            case 'combat_training':
                if (assignee.job === JobType.TRAINER) {
                    const trainerInfo = getCombatTrainingTrainerInfo(assignee);
                    bonusInfo = `${trainerInfo.label} (+${trainerInfo.bonusPercent}% 훈련 효율)`;
                } else {
                    bonusInfo = `담당자 미배치 (트레이너 직업 동료를 배치해야 훈련 효율이 상승합니다)`;
                }
                break;
            case 'training':
            case 'training_exp':
            case 'training_stat':
            case 'training_mastery':
            case 'training_style':
            case 'tactical_training':
                if (assignee.trainerProfile) {
                    const rankConfig = TRAINER_RANK_CONFIG[assignee.trainerProfile.rank] || TRAINER_RANK_CONFIG[TrainerRank.APPRENTICE];
                    bonusInfo = `트레이너 [${assignee.trainerProfile.rank}] (+${rankConfig.dailyCount}회/효과 보너스)`;
                } else if (assignee.job === JobType.TRAINER) {
                    const trainerRank = (assignee as any).trainerRank || TrainerRank.APPRENTICE;
                    const rankConfig = TRAINER_RANK_CONFIG[trainerRank as TrainerRank] || TRAINER_RANK_CONFIG[TrainerRank.APPRENTICE];
                    const rankLabel = rankConfig?.label || '견습 트레이너';
                    bonusInfo = `${rankLabel} (+${rankConfig.dailyCount}회/효과 보너스)`;
                }
                break;
            case 'storage':
                const strBonusStore = stats.str;
                bonusInfo = `창고 용량 +${strBonusStore} (STR)`;
                break;
            case 'dispatch':
                const wisBonusDisp = Math.floor(stats.wis * 0.1);
                bonusInfo = `최대 파견 슬롯 +${wisBonusDisp} (WIS)`;
                break;
            case 'lab':
                const resBonus = calculateResearcherBonus(character, selectedInstanceId || undefined);
                if (resBonus.researcherCount > 0) {
                    bonusInfo = `담당 연구원 ${resBonus.researcherCount}명 [${resBonus.rankTitle}] (비용 -${Math.round(resBonus.costDiscount * 100)}%, 대성공 +${resBonus.greatSuccessBonus.toFixed(1)}%, 한계돌파 +${resBonus.limitBreakBonus.toFixed(1)}%)`;
                } else {
                    bonusInfo = `연구원 미배치 (연구원 동료를 배치해야 연구 보너스가 적용됩니다)`;
                }
                break;
            case 'workshop':
                const ctrlBonusWork = (stats.ctrl * 0.01 + 5).toFixed(1);
                bonusInfo = `강화 성공 보정 +${ctrlBonusWork}% (CTRL + 직업 보너스)`;
                break;
            case 'defense':
                const totalStats = stats.str + stats.int + stats.def + stats.agi + stats.wis + stats.ctrl;
                const defBonusDef = Math.floor(totalStats * 0.5);
                bonusInfo = `기지 방어력 +${defBonusDef} (종합 스탯)`;
                break;
        }

        return bonusInfo ? (
            <div className="mt-1 flex items-center gap-1 text-[10px] text-cyan-400 font-bold animate-in fade-in">
                <TrendingUp size={10} />
                <span>담당자 보너스: {bonusInfo}</span>
            </div>
        ) : null;
    };

    const renderFacilityOverlay = () => {
        if (!selectedFacility) return null;
        const facility = FACILITIES_INFO.find(f => f.id === selectedFacility);
        if (!facility) return null;
        
        const instance = character.base?.layout?.find(inst => inst.id === selectedInstanceId) || 
                         character.base?.layout?.find(inst => inst.type === selectedFacility);
        
        const level = instance?.level || character.base?.facilityLevels?.[selectedFacility] || 1;
        const assigneeId = selectedInstanceId ? character.base?.assignments?.[selectedInstanceId] : character.base?.assignments?.[selectedFacility];
        const assignee = character.inactiveCompanions?.find(c => c.id === assigneeId);
        const upgradeConfig = FACILITY_UPGRADE_CONFIG[selectedFacility];
        
        const typeIndex = character.base?.layout?.filter(inst => inst.type === selectedFacility).findIndex(inst => inst.id === (instance?.id || '')) ?? 0;
        
        const isMulti = selectedFacility === 'farm' || selectedFacility === 'mine' || selectedFacility === 'alchemy' || selectedFacility === 'cooking' || selectedFacility === 'lab' || selectedFacility === 'workshop';
        const assignedIds = instance ? (isMulti ? (character.base?.multiAssignments?.[instance.id] || []) : (character.base?.assignments?.[instance.id] ? [character.base.assignments[instance.id]] : [])) : [];
        const allAssigneesForOverlay = character.inactiveCompanions?.filter(c => assignedIds.includes(c.id)) || [];
        
        const renderHeader = () => (
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
               <div className="flex flex-col">
                   <h3 className="text-xl font-bold text-white flex items-center">
                       {facility.name} {!facility.isUnique && (typeIndex + 1)} <span className="ml-2 text-xs bg-slate-800 px-2 py-0.5 rounded text-amber-500">Lv.{level}</span>
                   </h3>
                   {/* [ADDED] 상세 창 상단에도 보너스 정보 표시 */}
                   {getFacilityBonusText(selectedFacility, assignee, allAssigneesForOverlay)}
               </div>
               <div className="flex items-center gap-2 flex-wrap">
                   {level < (upgradeConfig?.maxLevel || 5) && (
                       <button 
                          onClick={() => setUpgradingFacility(selectedFacility)}
                          className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded font-bold transition-all shadow-lg shadow-green-900/20 flex items-center"
                       >
                           <ArrowUpCircle size={14} className="mr-1"/> 레벨업
                       </button>
                   )}
                   {instance?.id && (
                       <button 
                          onClick={() => handleRemoveFacility(instance.id)}
                          className="text-xs bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60 px-2.5 py-1.5 rounded font-bold transition-all shadow-md flex items-center active:scale-95"
                          title="시설 폐쇄"
                       >
                           <Trash2 size={13} className="mr-1 text-rose-400"/> 시설 폐쇄
                       </button>
                   )}
                   <button onClick={() => setSelectedFacility(null)} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"><X size={24}/></button>
               </div>
           </div>
        );

        if (selectedFacility === 'storage') {
            const equipTypes = ['Weapon', 'SubWeapon', 'Head', 'Body', 'Feet', 'Hand', 'Accessory', '무기', '보조무기', '투구', '모자', '갑옷', '상의', '하의', '장갑', '신발', '장신구', '반지', '목걸이'];
            const consumTypes = ['Consumable', '소비', '물약', '음식', '소모품'];
            
            // [MODIFIED] Use total capacity calculation
            const maxStorage = calculateTotalStorageCapacity(character.base, character.inactiveCompanions || []);

            const getGroupedInventory = () => {
                return groupItems(character.inventory, (item) => {
                    if (inventoryFilter === 'all') return true;
                    if (inventoryFilter === 'equip') return equipTypes.some(t => item.type.includes(t));
                    if (inventoryFilter === 'consumable') return consumTypes.some(t => item.type.includes(t));
                    if (inventoryFilter === 'etc') return !equipTypes.some(t => item.type.includes(t)) && !consumTypes.some(t => item.type.includes(t));
                    return true;
                });
            };

            const getGroupedStorage = () => {
                const storage = character.base?.storage || [];
                const grouped: Record<string, { item: Item, count: number, indices: number[] }> = {};
                
                storage.forEach((item, originalIdx) => {
                    // Apply Filter
                    let matchesFilter = true;
                    if (storageFilter === 'equip') matchesFilter = equipTypes.some(t => item.type.includes(t));
                    else if (storageFilter === 'consumable') matchesFilter = consumTypes.some(t => item.type.includes(t));
                    else if (storageFilter === 'etc') matchesFilter = !equipTypes.some(t => item.type.includes(t)) && !consumTypes.some(t => item.type.includes(t));
                    
                    if (!matchesFilter) return;

                    const isStackable = ['Consumable', 'Etc', '소비', '물약', '음식', '소모품', '기타'].includes(item.type);
                    if (isStackable) {
                        const key = `${item.name}-${item.rarity}`;
                        if (!grouped[key]) grouped[key] = { item, count: 0, indices: [] };
                        grouped[key].count++;
                        grouped[key].indices.push(originalIdx);
                    } else {
                        const key = `${item.name}-${originalIdx}`;
                        grouped[key] = { item, count: 1, indices: [originalIdx] };
                    }
                });
                return Object.values(grouped);
            };

            const groupedInventory = getGroupedInventory();
            const groupedStorage = getGroupedStorage();

            const filterLabels: Record<string, string> = {
                all: '전체',
                equip: '장비',
                consumable: '소비',
                etc: '기타'
            };

            return (
                <div className="flex flex-col h-full">
                    {renderHeader()}
                    <div className="flex flex-wrap justify-between items-center text-xs text-slate-400 mb-2 gap-2 bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800">
                        <span className="flex items-center gap-1.5">
                            <Package size={14} className="text-amber-400" />
                            <span>내 가방: <strong className="text-amber-300">{character.inventory.length}</strong>/{calculateInventorySize(character.stats)}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Box size={14} className="text-green-400" />
                            <span>기지 창고: <strong className="text-green-300">{character.base?.storage.length || 0}</strong>/{maxStorage}</span>
                        </span>
                    </div>

                    {/* 기지 창고 금고 (골드 보관 및 인출) */}
                    <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border border-amber-500/40 rounded-xl p-3 mb-2 shadow-md shrink-0">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-500/30 text-amber-400 shrink-0">
                                    <Coins size={22} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xs sm:text-sm font-bold text-amber-200">기지 창고 금고</h4>
                                        <span className="text-[10px] text-amber-400 bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-800/60 font-medium">골드 보관소</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mt-1">
                                        <span className="text-slate-300">
                                            소지 골드: <strong className="text-amber-300 font-mono">{(character.money || 0).toLocaleString()}</strong> 골드
                                        </span>
                                        <span className="text-slate-600 hidden sm:inline">|</span>
                                        <span className="text-emerald-300">
                                            창고 보관: <strong className="text-emerald-400 font-mono">{(character.base?.resources?.gold || 0).toLocaleString()}</strong> 골드
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => setGoldTransferModal({ isOpen: true, mode: 'deposit', amount: '' })}
                                    className="flex-1 sm:flex-none px-3.5 py-2 bg-amber-600 hover:bg-amber-500 active:scale-95 text-slate-950 font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm min-h-[40px]"
                                >
                                    <ArrowRight size={14} />
                                    <span>골드 맡기기</span>
                                </button>
                                <button
                                    onClick={() => setGoldTransferModal({ isOpen: true, mode: 'withdraw', amount: '' })}
                                    className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm min-h-[40px]"
                                >
                                    <ArrowLeft size={14} />
                                    <span>골드 찾기</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden min-h-0">
                        {/* 내 가방 (보관함으로 입고) */}
                        <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-3 flex flex-col min-h-[280px] md:min-h-0 shadow-lg">
                            <div className="flex justify-between items-center mb-2.5 shrink-0 gap-2">
                                <h4 className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-1.5">
                                    <Package size={15} className="text-amber-400" /> 내 가방
                                </h4>
                                <div className="flex gap-1">
                                    {(['all', 'equip', 'consumable', 'etc'] as const).map(f => (
                                        <button 
                                          key={f} 
                                          onClick={() => setInventoryFilter(f)} 
                                          className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold transition-colors ${
                                              inventoryFilter === f 
                                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm' 
                                                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                                          }`}
                                        >
                                            {filterLabels[f]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                 {groupedInventory.map((group, idx) => {
                                     const item = group.item;
                                     const rarityStyle = STORAGE_RARITY_COLORS[item.rarity] || 'text-slate-300 border-slate-700 bg-slate-950/70';
                                     return (
                                         <div 
                                           key={idx} 
                                           className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/90 flex items-center justify-between gap-2.5 group hover:border-amber-500/50 hover:bg-slate-900/90 transition-all shadow-sm"
                                         >
                                             {/* 아이템 이미지 및 툴팁 */}
                                             <div className="relative group/tooltip shrink-0">
                                                 <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-lg border p-1 flex items-center justify-center relative select-none ${rarityStyle}`}>
                                                     <img 
                                                       src={getItemImage(item)} 
                                                       alt={item.name} 
                                                       className="w-full h-full object-contain" 
                                                       referrerPolicy="no-referrer"
                                                     />
                                                     {group.count > 1 && (
                                                         <span className="absolute bottom-0.5 right-0.5 bg-slate-950/90 text-slate-100 text-[8px] font-mono font-bold px-1 rounded border border-slate-700 leading-none">
                                                             {group.count}
                                                         </span>
                                                     )}
                                                     {item.enhancement !== undefined && item.enhancement > 0 && (
                                                         <span className="absolute top-0.5 left-0.5 bg-amber-500 text-slate-950 text-[7px] font-black px-0.5 rounded leading-none">
                                                             +{item.enhancement}
                                                         </span>
                                                     )}
                                                     {item.divineLevel !== undefined && item.divineLevel > 0 && (
                                                         <span className="absolute top-0.5 right-0.5 bg-purple-500 text-white text-[7px] font-black px-0.5 rounded leading-none">
                                                             ★{item.divineLevel}
                                                         </span>
                                                     )}
                                                 </div>
                                                 <ItemTooltip item={item} character={character} />
                                             </div>

                                             {/* 아이템 이름 & 정보 */}
                                             <div className="flex-1 min-w-0">
                                                 <div className="flex items-center gap-1">
                                                     <span className={`text-xs font-bold truncate block ${item.rarity === ItemRarity.MYTHTIC ? 'text-red-400' : item.rarity === ItemRarity.LEGENDARY ? 'text-amber-400' : item.rarity === ItemRarity.UNIQUE ? 'text-pink-400' : item.rarity === ItemRarity.EPIC ? 'text-purple-400' : item.rarity === ItemRarity.RARE ? 'text-yellow-400' : item.rarity === ItemRarity.MAGIC ? 'text-blue-400' : 'text-slate-200'}`}>
                                                         {item.name}
                                                     </span>
                                                 </div>
                                                 <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                                     <span>{item.rarity}</span>
                                                     <span>•</span>
                                                     <span>{item.type}</span>
                                                     {group.count > 1 && (
                                                         <span className="text-amber-400 font-bold">보유 {group.count}개</span>
                                                     )}
                                                 </div>
                                             </div>

                                             {/* 창고에 입고 버튼 */}
                                             <button 
                                               onClick={() => onStorageAction('deposit', group.item, group.indices)} 
                                               className="px-2.5 py-2 bg-slate-800 hover:bg-amber-600 text-amber-400 hover:text-white rounded-lg text-xs font-bold border border-amber-500/30 hover:border-amber-400 flex items-center gap-1 transition-all shrink-0 active:scale-95 shadow-sm"
                                               title="창고에 입고"
                                             >
                                                  <span className="hidden sm:inline">입고</span>
                                                  <ArrowRight size={13} />
                                             </button>
                                         </div>
                                     );
                                 })}
                                 {groupedInventory.length === 0 && (
                                     <div className="text-xs text-slate-600 text-center py-10 flex flex-col items-center justify-center gap-1.5">
                                         <Package size={24} className="text-slate-700" />
                                         <span>보관 가능한 아이템이 없습니다.</span>
                                     </div>
                                 )}
                            </div>
                        </div>

                        {/* 기지 창고 (가방으로 출고) */}
                        <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-3 flex flex-col min-h-[280px] md:min-h-0 shadow-lg">
                            <div className="flex justify-between items-center mb-2.5 shrink-0 gap-2">
                                <h4 className="text-xs sm:text-sm font-bold text-green-300 flex items-center gap-1.5">
                                    <Box size={15} className="text-green-400" /> 기지 창고
                                </h4>
                                <div className="flex gap-1">
                                    {(['all', 'equip', 'consumable', 'etc'] as const).map(f => (
                                        <button 
                                          key={f} 
                                          onClick={() => setStorageFilter(f)} 
                                          className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold transition-colors ${
                                              storageFilter === f 
                                                ? 'bg-green-500/20 text-green-300 border-green-500/60 shadow-sm' 
                                                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                                          }`}
                                        >
                                            {filterLabels[f]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                 {groupedStorage.map((group, idx) => {
                                     const item = group.item;
                                     const rarityStyle = STORAGE_RARITY_COLORS[item.rarity] || 'text-slate-300 border-slate-700 bg-slate-950/70';
                                     return (
                                         <div 
                                           key={idx} 
                                           className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/90 flex items-center justify-between gap-2.5 group hover:border-green-500/50 hover:bg-slate-900/90 transition-all shadow-sm"
                                         >
                                             {/* 창고에서 출고 버튼 */}
                                             <button 
                                               onClick={() => onStorageAction('withdraw', group.item, group.indices)} 
                                               className="px-2.5 py-2 bg-slate-800 hover:bg-green-600 text-green-400 hover:text-white rounded-lg text-xs font-bold border border-green-500/30 hover:border-green-400 flex items-center gap-1 transition-all shrink-0 active:scale-95 shadow-sm"
                                               title="가방으로 출고"
                                             >
                                                  <ArrowLeft size={13} />
                                                  <span className="hidden sm:inline">출고</span>
                                             </button>

                                             {/* 아이템 이름 & 정보 */}
                                             <div className="flex-1 min-w-0 text-right">
                                                 <div className="flex items-center justify-end gap-1">
                                                     <span className={`text-xs font-bold truncate block ${item.rarity === ItemRarity.MYTHTIC ? 'text-red-400' : item.rarity === ItemRarity.LEGENDARY ? 'text-amber-400' : item.rarity === ItemRarity.UNIQUE ? 'text-pink-400' : item.rarity === ItemRarity.EPIC ? 'text-purple-400' : item.rarity === ItemRarity.RARE ? 'text-yellow-400' : item.rarity === ItemRarity.MAGIC ? 'text-blue-400' : 'text-slate-200'}`}>
                                                         {item.name}
                                                     </span>
                                                 </div>
                                                 <div className="flex items-center justify-end gap-2 text-[10px] text-slate-500 mt-0.5">
                                                     {group.count > 1 && (
                                                         <span className="text-green-400 font-bold">보관 {group.count}개</span>
                                                     )}
                                                     <span>•</span>
                                                     <span>{item.rarity}</span>
                                                     <span>•</span>
                                                     <span>{item.type}</span>
                                                 </div>
                                             </div>

                                             {/* 아이템 이미지 및 툴팁 */}
                                             <div className="relative group/tooltip shrink-0">
                                                 <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-lg border p-1 flex items-center justify-center relative select-none ${rarityStyle}`}>
                                                     <img 
                                                       src={getItemImage(item)} 
                                                       alt={item.name} 
                                                       className="w-full h-full object-contain" 
                                                       referrerPolicy="no-referrer"
                                                     />
                                                     {group.count > 1 && (
                                                         <span className="absolute bottom-0.5 right-0.5 bg-slate-950/90 text-slate-100 text-[8px] font-mono font-bold px-1 rounded border border-slate-700 leading-none">
                                                             {group.count}
                                                         </span>
                                                     )}
                                                     {item.enhancement !== undefined && item.enhancement > 0 && (
                                                         <span className="absolute top-0.5 left-0.5 bg-amber-500 text-slate-950 text-[7px] font-black px-0.5 rounded leading-none">
                                                             +{item.enhancement}
                                                         </span>
                                                     )}
                                                     {item.divineLevel !== undefined && item.divineLevel > 0 && (
                                                         <span className="absolute top-0.5 right-0.5 bg-purple-500 text-white text-[7px] font-black px-0.5 rounded leading-none">
                                                             ★{item.divineLevel}
                                                         </span>
                                                     )}
                                                 </div>
                                                 <ItemTooltip item={item} character={character} />
                                             </div>
                                         </div>
                                     );
                                 })}
                                 {groupedStorage.length === 0 && (
                                     <div className="text-xs text-slate-600 text-center py-10 flex flex-col items-center justify-center gap-1.5">
                                         <Box size={24} className="text-slate-700" />
                                         <span>창고가 비어있습니다.</span>
                                     </div>
                                 )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (selectedFacility === 'housing') {
            const housingCapacity = calculateTotalHousingCapacity(character.base, character.inactiveCompanions || []);
            const currentYear = getYear(character.currentDate || '2000-01-01');
            const houseAssignments = character.base?.houseAssignments || {};
            const houseCustomNames = character.base?.houseCustomNames || {};
            const housingInstances = character.base?.layout?.filter((inst: any) => inst.type === 'housing') || [];

            return (
                <div className="flex flex-col h-full space-y-3">
                    {renderHeader()}
                    
                    {/* Top Control Banner */}
                    <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 rounded-2xl border border-amber-900/50 shadow-lg flex flex-wrap justify-between items-center gap-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-base font-bold text-amber-200 flex items-center gap-1.5">
                                    <Home size={18} className="text-amber-400" /> 주택 단지 & 숙소 관리 시스템
                                </h3>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-mono font-bold">
                                    총 {housingInstances.length}채
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                거주 인원: <span className="text-amber-300 font-bold">{character.inactiveCompanions?.length || 0}</span> / {housingCapacity}명 
                                (주택 신축, 증축, 거주 동거인 지정, 대규모 관리가 가능합니다)
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button 
                              onClick={() => setIsHousingModalOpen(true)}
                              className="px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-md border border-amber-400/50 flex items-center gap-1.5 transition-all active:scale-95 animate-pulse"
                            >
                                <Building2 size={16} /> 🏘️ 통합 숙소 단지 관리
                            </button>
                            <button 
                              onClick={() => { setPartySelection([]); setIsPartyModalOpen(true); }}
                              className="px-3 py-2 bg-pink-900/50 hover:bg-pink-800 text-pink-200 text-xs rounded-xl border border-pink-700/80 flex items-center gap-1 transition-colors"
                            >
                                <Sparkles size={14} className="fill-pink-400 text-pink-400"/> 파티 주최
                            </button>
                            <button 
                              onClick={() => setIsMyHomeOpen(true)}
                              className="px-3 py-2 bg-rose-900/50 hover:bg-rose-800 text-rose-200 text-xs rounded-xl border border-rose-700/80 flex items-center gap-1 transition-colors"
                            >
                                <Home size={14} className="text-rose-400"/> 나의 집
                            </button>
                        </div>
                    </div>

                    {/* Residents Search, Filter & Sort Bar */}
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2.5">
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                            <input
                                type="text"
                                value={residentSearchQuery}
                                onChange={(e) => setResidentSearchQuery(e.target.value)}
                                placeholder="거주민/몬스터 이름, 직업 검색..."
                                className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                            />
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                                <span className="text-[11px] text-slate-400 font-bold shrink-0">정렬:</span>
                                <select
                                    value={residentSortOption}
                                    onChange={(e) => setResidentSortOption(e.target.value as any)}
                                    className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                                >
                                    <option value="name">이름순</option>
                                    <option value="custom">커스텀순</option>
                                    <option value="level">레벨순</option>
                                    <option value="affection">호감도순</option>
                                    <option value="cp">전투력순</option>
                                </select>
                            </div>
                        </div>

                        {/* Type Filter Tabs */}
                        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pt-1">
                            <button
                                onClick={() => setResidentTypeFilter('all')}
                                className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all shrink-0 ${
                                    residentTypeFilter === 'all'
                                        ? 'bg-amber-500 text-slate-950 shadow'
                                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                                }`}
                            >
                                전체 ({character.inactiveCompanions?.length || 0})
                            </button>
                            <button
                                onClick={() => setResidentTypeFilter('human')}
                                className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all shrink-0 ${
                                    residentTypeFilter === 'human'
                                        ? 'bg-amber-500 text-slate-950 shadow'
                                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                                }`}
                            >
                                인간 동료 ({character.inactiveCompanions?.filter(c => !c.isMonster && !c.isCustomMonster && c.race !== '몬스터').length || 0})
                            </button>
                            <button
                                onClick={() => setResidentTypeFilter('monster')}
                                className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all shrink-0 ${
                                    residentTypeFilter === 'monster'
                                        ? 'bg-amber-500 text-slate-950 shadow'
                                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                                }`}
                            >
                                몬스터 ({character.inactiveCompanions?.filter(c => c.isMonster || c.isCustomMonster || c.race === '몬스터').length || 0})
                            </button>
                            <button
                                onClick={() => setResidentTypeFilter('custom')}
                                className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all shrink-0 ${
                                    residentTypeFilter === 'custom'
                                        ? 'bg-amber-500 text-slate-950 shadow'
                                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                                }`}
                            >
                                커스텀 ({character.inactiveCompanions?.filter(c => c.isCustom).length || 0})
                            </button>
                        </div>
                    </div>

                    {/* Residents Compact List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 p-1">
                        {(() => {
                            const filteredAndSortedResidents = (character.inactiveCompanions || [])
                                .filter(comp => {
                                    if (residentTypeFilter === 'monster' && !comp.isMonster && !comp.isCustomMonster && comp.race !== '몬스터') return false;
                                    if (residentTypeFilter === 'human' && (comp.isMonster || comp.isCustomMonster || comp.race === '몬스터')) return false;
                                    if (residentTypeFilter === 'custom' && !comp.isCustom) return false;

                                    if (residentSearchQuery.trim()) {
                                        const query = residentSearchQuery.toLowerCase().trim();
                                        const matchName = comp.name.toLowerCase().includes(query);
                                        const matchClass = (comp.classType || '').toLowerCase().includes(query);
                                        const matchJob = (comp.job || '').toLowerCase().includes(query);
                                        if (!matchName && !matchClass && !matchJob) return false;
                                    }
                                    return true;
                                })
                                .sort((a, b) => {
                                    if (residentSortOption === 'name') return a.name.localeCompare(b.name, 'ko');
                                    if (residentSortOption === 'custom') {
                                        if (Boolean(a.isCustom) !== Boolean(b.isCustom)) return b.isCustom ? 1 : -1;
                                        return a.name.localeCompare(b.name, 'ko');
                                    }
                                    if (residentSortOption === 'level') return b.level - a.level;
                                    if (residentSortOption === 'affection') return (b.affection || 0) - (a.affection || 0);
                                    if (residentSortOption === 'cp') return getCompanionCP(b) - getCompanionCP(a);
                                    return 0;
                                });

                            return filteredAndSortedResidents.map((comp, idx) => {
                                const displayAge = (comp.birthYear !== undefined) ? (currentYear - comp.birthYear) + "세" : comp.age;
                                const isBusy = isCompanionDispatched(comp.id);
                                const assignedHouseId = houseAssignments[comp.id];
                                const assignedHouseObj = housingInstances.find((h: any) => h.id === assignedHouseId);
                                const houseIdx = housingInstances.findIndex((h: any) => h.id === assignedHouseId);
                                const houseName = assignedHouseId 
                                    ? (houseCustomNames[assignedHouseId] || `숙소 ${houseIdx + 1}`)
                                    : '미배치 (노숙)';

                                return (
                                    <div key={comp.id || idx} className={`bg-slate-950/90 p-3 rounded-2xl border flex justify-between items-center group transition-all ${isBusy ? 'border-amber-900/30 opacity-60' : 'border-slate-800 hover:border-amber-500/50'}`}>
                                        <div className="flex-1 mr-2 min-w-0">
                                            <div className="text-sm font-bold text-slate-200 flex items-center gap-1 truncate">
                                                <span className="truncate">{comp.name}</span>
                                                {comp.isLover && <Heart size={11} className="text-pink-500 fill-pink-500 shrink-0"/>}
                                                {comp.isCustom && <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-800 px-1 rounded shrink-0">커스텀</span>}
                                                {comp.isMonster && <span className="text-[9px] bg-red-950 text-red-300 border border-red-800 px-1 rounded shrink-0">몬스터</span>}
                                                {isBusy && <span className="text-[9px] bg-amber-950 text-amber-500 px-1 py-0.5 rounded border border-amber-900 flex items-center ml-1 shrink-0"><Clock size={9} className="mr-0.5"/> 업무 중</span>}
                                                {(() => {
                                                    const routine = getCompanionRoutine(character, comp.id);
                                                    if (routine.statusText === '취침 중') {
                                                        return <span className="text-[9px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800 flex items-center ml-1 shrink-0">🛌 취침 중</span>;
                                                    }
                                                    if (routine.statusText === '식사 중') {
                                                        return <span className="text-[9px] bg-amber-950/40 text-amber-400 px-1.5 py-0.5 rounded border border-amber-900/40 flex items-center ml-1 shrink-0">🥣 식사 중</span>;
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                                                Lv.{comp.level} HP:{comp.stats.hp}/{comp.stats.maxHp} ({displayAge})
                                            </div>
                                            <div className="mt-1 truncate">
                                                <span className={`inline-block text-[10px] px-2 py-0.5 rounded-lg border font-semibold ${assignedHouseObj ? 'bg-amber-950/60 border-amber-800/80 text-amber-300' : 'bg-rose-950/40 border-rose-900 text-rose-400'}`}>
                                                    🏠 {houseName}
                                                </span>
                                            </div>
                                        </div>
                                        <button 
                                          onClick={() => handleInteractClick(comp)}
                                          disabled={isBusy}
                                          className={`p-2 rounded-xl border transition-colors shrink-0 ${isBusy ? 'bg-slate-950 text-slate-800 border-slate-900 cursor-not-allowed' : 'bg-slate-900 hover:bg-amber-900/40 text-slate-400 hover:text-amber-300 border-slate-800 hover:border-amber-600'}`}
                                          title={isBusy ? "업무 중에는 교류할 수 없습니다." : "교류하기"}
                                        >
                                            <MessageCircle size={16}/>
                                        </button>
                                    </div>
                                );
                            });
                        })()}
                        {(!character.inactiveCompanions || character.inactiveCompanions.length === 0) && (
                            <p className="col-span-full text-center text-slate-500 py-12">거주 중인 동료가 없습니다.</p>
                        )}
                    </div>
                </div>
            );
        }
        

        if (selectedFacility === 'mine') {
            return (
                <div className="flex flex-col items-center justify-center h-full space-y-6">
                     {renderHeader()}
                     <div className="text-center">
                         <p className="text-sm text-slate-400 max-w-xs mx-auto mb-4">광산 깊은 곳에서 다양한 광물을 채굴할 수 있습니다.</p>
                     </div>
                     <button 
                         onClick={() => {
                             setIsMineOpen(true);
                             setActiveInstanceId(selectedInstanceId);
                         }} 
                         className="p-8 rounded-2xl flex flex-col items-center bg-slate-900 border-2 border-amber-700 hover:border-amber-500 hover:bg-amber-950/30 transition-all group active:scale-95 shadow-[0_0_20px_rgba(217,119,6,0.2)]"
                     >
                         <Pickaxe size={48} className="mb-3 text-amber-500 group-hover:text-amber-400 transition-colors"/>
                         <span className="text-lg font-bold text-amber-200">광산 진입</span>
                         <span className="text-xs text-slate-500 mt-1">다양한 광물 채굴 및 탐사</span>
                     </button>
                </div>
            );
        }

        if (selectedFacility === 'lab') {
            const labLevel = calculateTotalLabLevel(character.base);
            return (
                <div className="flex flex-col h-full items-center justify-center p-4 sm:p-6 text-center">
                    {renderHeader()}
                    <div className="max-w-md w-full bg-slate-900/90 border border-purple-500/40 rounded-2xl p-6 shadow-2xl flex flex-col items-center my-auto">
                        <div className="w-16 h-16 rounded-2xl bg-purple-950/80 border border-purple-500/50 flex items-center justify-center text-purple-300 mb-4 shadow-lg">
                            <Sparkles size={32} className="text-purple-400 animate-pulse" />
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-pink-200 to-amber-200">
                                스킬 연구소
                            </h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 border border-purple-700 text-purple-300 font-mono font-bold">
                                Lv.{labLevel}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                            스킬 연마, 한계 돌파뿐만 아니라 타격 오라 & 궤적 이펙트, 아이콘 변경, 컷신 일러스트 등록을 전담하는 통합 연구 시설입니다.
                        </p>

                        <div className="grid grid-cols-2 gap-2 w-full mb-6 text-left">
                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                                <span className="text-purple-400 font-bold block mb-0.5">⚡ 스킬 연마 & 돌파</span>
                                <span className="text-[10px] text-slate-500">최대 레벨 및 숙련도 돌파</span>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                                <span className="text-cyan-400 font-bold block mb-0.5">🎨 스킬 이펙트</span>
                                <span className="text-[10px] text-slate-500">칠흑/진홍/네온 등 타격 오라</span>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                                <span className="text-amber-400 font-bold block mb-0.5">🖋️ 아이콘 & 썸네일</span>
                                <span className="text-[10px] text-slate-500">판타지 아이콘 및 커스텀</span>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                                <span className="text-rose-400 font-bold block mb-0.5">👑 스킬 컷신 추가</span>
                                <span className="text-[10px] text-slate-500">전투 발동 시네마틱 컷인</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsLabOpen(true)}
                            className="w-full py-3.5 bg-gradient-to-r from-purple-700 via-indigo-600 to-pink-600 hover:from-purple-600 hover:via-indigo-500 hover:to-pink-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-950/50 active:scale-98 transition-all"
                        >
                            <Sparkles size={16} />
                            <span>연구소 입장하기</span>
                        </button>
                    </div>
                </div>
            );
        }

        if (selectedFacility === 'training') {
            const totalHeadcount = 1 + character.companions.length + (character.inactiveCompanions?.length || 0);
            const expPreview = (character.level * 10) + 200 + (level * 500);
            const currentUsage = character.base?.dailyCounts?.['training'] || 0;
            
            const dailyLimit = getFacilityTrainingLimit(character, 'training_exp');
            const remainingUsage = Math.max(0, dailyLimit - currentUsage);

            const TrainingAmountSelector = () => (
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-300">훈련 횟수 설정 (남은 횟수: {remainingUsage})</span>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setTrainingAmount(Math.max(1, trainingAmount - 1))}
                            className="w-8 h-8 bg-slate-800 rounded border border-slate-700 flex items-center justify-center text-white hover:bg-slate-700"
                        >-</button>
                        <input 
                            type="number" 
                            value={trainingAmount}
                            onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                setTrainingAmount(Math.min(remainingUsage, Math.max(1, val)));
                            }}
                            className="w-16 bg-slate-950 border border-slate-700 rounded text-center text-xs text-white py-1"
                        />
                        <button 
                            onClick={() => setTrainingAmount(Math.min(remainingUsage, trainingAmount + 1))}
                            className="w-8 h-8 bg-slate-800 rounded border border-slate-700 flex items-center justify-center text-white hover:bg-slate-700"
                        >+</button>
                    </div>
                </div>
            );

            return (
                <div className="flex flex-col h-full">
                    {renderHeader()}
                    <div className="text-xs text-slate-500 mb-4 bg-slate-900 p-2 rounded flex justify-between">
                        <span>일일 훈련 가능 횟수: {remainingUsage} / {dailyLimit}회</span>
                    </div>
                    {!trainingTargetId ? (
                        <div className="flex flex-col mb-4 shrink-0">
                            <p className="text-xs text-slate-400 mb-2">훈련 대상을 선택하세요.</p>
                            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {(() => {
                                    const targets = [
                                        {id:'player', name:character.name}, 
                                        ...character.companions, 
                                        ...(character.inactiveCompanions?.filter(c => !isCompanionDispatched(c.id)) || [])
                                    ];
                                    const seen = new Set();
                                    const uniqueTargets = targets.filter(t => {
                                        if (seen.has(t.id)) return false;
                                        seen.add(t.id);
                                        return true;
                                    });
                                    return uniqueTargets.map(t => (
                                        <button key={t.id} onClick={() => setTrainingTargetId(t.id)} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold border transition-all ${trainingTargetId === t.id ? 'bg-amber-900/50 border-amber-500 text-white' : 'bg-slate-900 border border-slate-700 text-slate-500'}`}>{t.name}</button>
                                    ));
                                })()}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-bold text-amber-400">{(() => {
                                    const allPotential = [{id:'player', name:character.name}, ...character.companions, ...(character.inactiveCompanions||[])];
                                    return allPotential.find(t => t.id === trainingTargetId)?.name;
                                })()} 훈련 중</span>
                                <button onClick={() => { setTrainingTargetId(null); setTrainingSubTab('menu'); }} className="text-xs text-slate-500 hover:text-white underline">대상 변경</button>
                            </div>
                            {trainingSubTab === 'menu' && (
                                <div className="flex-1 flex flex-col justify-center gap-4">
                                    <button onClick={() => setTrainingSubTab('exp')} className="p-6 bg-slate-900 border border-slate-700 hover:border-indigo-500 rounded-xl flex flex-col items-center transition-all"><ArrowUpCircle size={32} className="text-indigo-400 mb-2"/><span className="text-lg font-bold">경험치 훈련</span></button>
                                    <button onClick={() => setTrainingSubTab('stat')} className="p-6 bg-slate-900 border border-slate-700 hover:border-amber-500 rounded-xl flex flex-col items-center transition-all"><Activity size={32} className="text-amber-400 mb-2"/><span className="text-lg font-bold">스탯 훈련</span></button>
                                    <button onClick={() => setTrainingSubTab('mastery')} className="p-6 bg-slate-900 border border-slate-700 hover:border-red-500 rounded-xl flex flex-col items-center transition-all"><Sword size={32} className="text-red-400 mb-2"/><span className="text-lg font-bold">무기 숙련도 훈련</span></button>
                                </div>
                            )}
                            {trainingSubTab === 'exp' && (
                                <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
                                    <ArrowUpCircle size={48} className="text-indigo-500 mb-4" />
                                    <h4 className="text-lg font-bold mb-2">개인 경험치 훈련</h4>
                                    <p className="text-xs text-slate-400 mb-6">선택한 거주민({(() => {
                                        const allPotential = [{id:'player', name:character.name}, ...character.companions, ...(character.inactiveCompanions||[])];
                                        return allPotential.find(t => t.id === trainingTargetId)?.name;
                                    })()}) 1명이 집중 훈련합니다. (식량 {1 * trainingAmount} 소모)</p>
                                    <div className="w-full max-w-xs mb-6">
                                        <TrainingAmountSelector />
                                    </div>
                                    <button 
                                        onClick={() => onFacilitySpecificAction('training', '경험치 훈련', trainingTargetId, trainingAmount)} 
                                        disabled={remainingUsage <= 0}
                                        className={`px-8 py-3 font-bold rounded-lg transition-all ${remainingUsage > 0 ? 'bg-indigo-700 hover:bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                    >
                                        훈련 시작 ({trainingAmount}회)
                                    </button>
                                </div>
                            )}
                            {trainingSubTab !== 'menu' && trainingSubTab !== 'exp' && (
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    {trainingSubTab === 'stat' && (
                                        <div className="flex flex-col space-y-4 overflow-y-auto">
                                            <TrainingAmountSelector />
                                            
                                            <div className="grid grid-cols-2 gap-3">
                                                {['str','int','wis','def','agi','ctrl'].map(s => (
                                                    <button 
                                                        key={s} 
                                                        onClick={() => onStatTraining(s, trainingTargetId, trainingAmount)} 
                                                        className="bg-slate-950 p-4 border border-slate-800 hover:border-amber-500 rounded-xl flex flex-col items-center transition-all"
                                                    >
                                                        <Activity size={20} className="mb-1 text-amber-500"/>
                                                        <span className="text-xs font-bold uppercase">{s} +{trainingAmount}</span>
                                                    </button>
                                                ))}
                                                <button 
                                                    onClick={() => onStatTraining('maxHp', trainingTargetId, trainingAmount)} 
                                                    className="bg-slate-950 p-4 border border-slate-800 hover:border-green-500 rounded-xl flex flex-col items-center transition-all"
                                                >
                                                    <Heart size={20} className="mb-1 text-green-500"/>
                                                    <span className="text-xs font-bold uppercase">HP +{trainingAmount * 10}</span>
                                                </button>
                                                <button 
                                                    onClick={() => onStatTraining('maxMp', trainingTargetId, trainingAmount)} 
                                                    className="bg-slate-950 p-4 border border-slate-800 hover:border-blue-500 rounded-xl flex flex-col items-center transition-all"
                                                >
                                                    <Zap size={20} className="mb-1 text-blue-500"/>
                                                    <span className="text-xs font-bold uppercase">MP +{trainingAmount * 10}</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {trainingSubTab === 'mastery' && (
                                        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-center flex flex-col items-center h-full">
                                            <Sword size={48} className="text-red-500 mb-4" />
                                            <div className="w-full max-w-xs mb-4">
                                                <TrainingAmountSelector />
                                            </div>
                                            <select className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-lg p-2 text-white mb-6" value={selectedWeaponType} onChange={(e) => setSelectedWeaponType(e.target.value as WeaponType)}>
                                                <option value="Sword">검</option><option value="Spear">창</option><option value="Blunt">둔기</option><option value="Axe">도끼</option><option value="Bow">활</option><option value="Staff">지팡이</option>
                                            </select>
                                            <button 
                                                onClick={() => onWeaponTraining(selectedWeaponType, trainingTargetId, trainingAmount)} 
                                                disabled={remainingUsage <= 0}
                                                className={`px-8 py-3 font-bold rounded-lg transition-all ${remainingUsage > 0 ? 'bg-red-800 hover:bg-red-700 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                            >
                                                훈련 개시 ({trainingAmount}회)
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {trainingSubTab === 'exp' && (
                        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
                            <ArrowUpCircle size={48} className="text-indigo-500 mb-4" />
                            <h4 className="text-lg font-bold mb-2">전체 경험치 훈련</h4>
                            <p className="text-xs text-slate-400 mb-6">모든 기지 거주민({totalHeadcount}명)이 동시에 훈련합니다. (식량 {totalHeadcount * trainingAmount} 소모)</p>
                            <div className="w-full max-w-xs mb-6">
                                <TrainingAmountSelector />
                            </div>
                            <button 
                                onClick={() => onFacilitySpecificAction('training', '경험치 훈련', undefined, trainingAmount)} 
                                disabled={remainingUsage <= 0}
                                className={`px-8 py-3 font-bold rounded-lg transition-all ${remainingUsage > 0 ? 'bg-indigo-700 hover:bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                            >
                                훈련 시작 ({trainingAmount}회)
                            </button>
                        </div>
                    )}
                    {trainingSubTab !== 'menu' && trainingSubTab !== 'exp' && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex flex-col gap-2 mb-4 shrink-0">
                                {[{id:'player', name:character.name}, ...character.companions, ...(character.inactiveCompanions||[])].map(t => (
                                    <button key={t.id} onClick={() => setTrainingTargetId(t.id)} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold border transition-all ${trainingTargetId === t.id ? 'bg-amber-900/50 border-amber-500 text-white' : 'bg-slate-900 border border-slate-700 text-slate-500'}`}>{t.name}</button>
                                ))}
                            </div>
                            {trainingSubTab === 'stat' && (
                                <div className="flex flex-col space-y-4 overflow-y-auto">
                                    <TrainingAmountSelector />
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        {['str','int','wis','def','agi','ctrl'].map(s => (
                                            <button 
                                                key={s} 
                                                onClick={() => onStatTraining(s, trainingTargetId, trainingAmount)} 
                                                className="bg-slate-950 p-4 border border-slate-800 hover:border-amber-500 rounded-xl flex flex-col items-center transition-all"
                                            >
                                                <Activity size={20} className="mb-1 text-amber-500"/>
                                                <span className="text-xs font-bold uppercase">{s} +{trainingAmount}</span>
                                            </button>
                                        ))}
                                        <button 
                                            onClick={() => onStatTraining('maxHp', trainingTargetId, trainingAmount)} 
                                            className="bg-slate-950 p-4 border border-slate-800 hover:border-green-500 rounded-xl flex flex-col items-center transition-all"
                                        >
                                            <Heart size={20} className="mb-1 text-green-500"/>
                                            <span className="text-xs font-bold uppercase">HP +{trainingAmount * 10}</span>
                                        </button>
                                        <button 
                                            onClick={() => onStatTraining('maxMp', trainingTargetId, trainingAmount)} 
                                            className="bg-slate-950 p-4 border border-slate-800 hover:border-blue-500 rounded-xl flex flex-col items-center transition-all"
                                        >
                                            <Zap size={20} className="mb-1 text-blue-500"/>
                                            <span className="text-xs font-bold uppercase">MP +{trainingAmount * 10}</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                            {trainingSubTab === 'mastery' && (
                                <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-center flex flex-col items-center h-full">
                                    <Sword size={48} className="text-red-500 mb-4" />
                                    <div className="w-full max-w-xs mb-4">
                                        <TrainingAmountSelector />
                                    </div>
                                    <select className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-lg p-2 text-white mb-6" value={selectedWeaponType} onChange={(e) => setSelectedWeaponType(e.target.value as WeaponType)}>
                                        <option value="Sword">검</option><option value="Spear">창</option><option value="Blunt">둔기</option><option value="Axe">도끼</option><option value="Bow">활</option><option value="Staff">지팡이</option>
                                    </select>
                                    <button 
                                        onClick={() => onWeaponTraining(selectedWeaponType, trainingTargetId, trainingAmount)} 
                                        disabled={remainingUsage <= 0}
                                        className={`px-8 py-3 font-bold rounded-lg transition-all ${remainingUsage > 0 ? 'bg-red-800 hover:bg-red-700 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                    >
                                        훈련 개시 ({trainingAmount}회)
                                    </button>
                                </div>
                            )}
                            <button onClick={() => setTrainingSubTab('menu')} className="mt-4 text-xs text-slate-500 hover:text-white underline">훈련 메뉴로</button>
                        </div>
                    )}
                </div>
            );
        }

        if (selectedFacility === 'defense') {
            const allComps = [...character.companions, ...(character.inactiveCompanions || [])];
            const baseDefense = calculateBaseDefense(character.base, allComps);
            const squadContrib = calculateTotalSquadDefenseContribution(character.base, allComps).totalContribution;
            const nextLevel = level + 1;
            const nextDefenseBonus = nextLevel * 500;
            const structBonus = (character.base?.defenseStructures || [])
                .filter((s: any) => !s.underConstruction)
                .reduce((acc: number, cur: any) => acc + (cur.defense || 0), 0);
            const res = character.base?.resources || { food: 0, wood: 0, stone: 0, iron: 0, manaCrystal: 0 };

            // 현재 이 방어소 인스턴스에 건축된 시설 찾기
            const currentInstanceStructure = (character.base?.defenseStructures || []).find((s: any) => s.instanceId === selectedInstanceId);
            
            let defenseRem = { remainingMinutes: 0, text: '완공 완료', isCompleted: true };
            let defenseProgress = 100;
            if (currentInstanceStructure && currentInstanceStructure.underConstruction) {
                defenseRem = getConstructionRemainingTime(character.currentDate, character.currentTime, currentInstanceStructure.constructionCompletionDate, currentInstanceStructure.constructionCompletionTime);
                defenseProgress = getConstructionProgress(currentInstanceStructure.totalConstructionMinutes, defenseRem.remainingMinutes);
            }

            return (
                <div className="flex flex-col h-full overflow-hidden">
                    {renderHeader()}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950 rounded-xl border border-slate-800 custom-scrollbar">
                        {/* 상단 기지 방어소 개요 및 현황 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-slate-900/90 p-4 rounded-xl border border-indigo-500/20 flex flex-col justify-center items-center text-center">
                                <Shield size={40} className="text-indigo-400 mb-2 animate-pulse" />
                                <h4 className="text-sm font-extrabold text-slate-300">총 방어력</h4>
                                <span className="text-3xl font-extrabold text-indigo-400 mt-1">{baseDefense.toLocaleString()}</span>
                            </div>

                            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex flex-col justify-center">
                                <h5 className="text-xs font-bold text-slate-400 mb-2">방어력 세부 내역</h5>
                                <div className="space-y-1 text-[11px] text-slate-400">
                                    <div className="flex justify-between">
                                        <span>기지 기본 방어력:</span>
                                        <span className="font-mono text-slate-300">+{(character.base?.level || 1) * 100}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>시설 레벨 보너스:</span>
                                        <span className="font-mono text-slate-300">+{level * 500}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>건축물 보너스:</span>
                                        <span className="font-mono text-amber-400">+{structBonus}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-800/80 pt-1 mt-1">
                                        <span className="text-emerald-400 font-semibold">방어 분대 기여:</span>
                                        <span className="font-mono text-emerald-400 font-bold">+{squadContrib.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                                <h5 className="text-xs font-bold text-slate-400 mb-2">건설용 보유 자원</h5>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500">골드:</span>
                                        <span className="font-bold text-slate-200">{character.money.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500">목재:</span>
                                        <span className="font-bold text-amber-500">{res.wood}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500">석재:</span>
                                        <span className="font-bold text-slate-400">{res.stone}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500">철광석:</span>
                                        <span className="font-bold text-blue-400">{res.iron}</span>
                                    </div>
                                    <div className="flex justify-between items-center col-span-2 border-t border-slate-800/60 pt-1.5 mt-1">
                                        <span className="text-slate-500">마정석:</span>
                                        <span className="font-bold text-purple-400">{res.manaCrystal}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 기지 전용 방어 분대 배치 */}
                        <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 border border-indigo-500/40 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3 shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-900/50 rounded-xl border border-indigo-500/50 text-indigo-300 shrink-0">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h5 className="font-extrabold text-sm text-white">기지 방어 분대 배치</h5>
                                        <span className="text-[10px] bg-indigo-900 text-indigo-300 border border-indigo-700/60 px-2 py-0.5 rounded-full font-bold">기지 수호대</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">
                                        거주 중인 동료들을 방어 분대에 편성하여 기지의 총 방어력을 크게 향상시킵니다.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDefenseSquadModalOpen(true)}
                                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 shrink-0 flex items-center justify-center gap-2"
                            >
                                <Shield size={16} />
                                <span>방어 분대 관리</span>
                            </button>
                        </div>

                        {/* 현재 이 방어소 인스턴스에 지어진 시설 상태 */}
                        {currentInstanceStructure ? (
                            currentInstanceStructure.underConstruction ? (
                                <div className="bg-amber-950/30 border-2 border-amber-500/40 p-4 rounded-xl flex flex-col gap-3 shadow-lg">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-amber-900/40 rounded-lg text-amber-400 border border-amber-500/30 animate-pulse">
                                                <Hammer size={24} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h5 className="font-extrabold text-sm text-slate-100">{currentInstanceStructure.name}</h5>
                                                    <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded-full font-bold animate-pulse">공사 진행 중</span>
                                                </div>
                                                <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                    <span className="flex items-center gap-1 font-mono text-amber-300 font-bold">
                                                        <Clock size={13} />
                                                        남은 시간: {defenseRem.text}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        (완공 예정: {currentInstanceStructure.constructionCompletionDate} {currentInstanceStructure.constructionCompletionTime})
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDismantleDefenseStructure(currentInstanceStructure.id)}
                                            className="w-full sm:w-auto px-4 py-2 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1"
                                        >
                                            <Trash2 size={13} /> 공사 취소
                                        </button>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                                            <span>공사 진행도</span>
                                            <span className="font-mono text-amber-400 font-bold">{defenseProgress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                                            <div 
                                                className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500"
                                                style={{ width: `${defenseProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-indigo-950/40 border-2 border-indigo-500/30 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-indigo-900/40 rounded-lg text-indigo-400 border border-indigo-500/20">
                                            <Shield size={24} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h5 className="font-extrabold text-sm text-slate-100">{currentInstanceStructure.name}</h5>
                                                <span className="text-[10px] bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full font-bold">건축 활성화됨</span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">
                                                이 방어소 인스턴스에 건축이 승인되어 기지 전체 방어력에 <span className="text-amber-400 font-bold">+{currentInstanceStructure.defense}</span> 보너스가 적용되고 있습니다.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDismantleDefenseStructure(currentInstanceStructure.id)}
                                        className="w-full sm:w-auto px-4 py-2 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                                    >
                                        철거하기
                                    </button>
                                </div>
                            )
                        ) : (
                            <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl text-center text-xs text-slate-400">
                                현재 이 방어소에 완공된 활성 시설이 없습니다. 아래의 방어 시설 설계 중 <strong>1개를 선택하여 건축</strong>할 수 있습니다.
                            </div>
                        )}

                        {/* 중단: 방어 시설 건축 구역 */}
                        <div className="border-t border-slate-800/80 pt-4">
                            <h4 className="text-sm font-extrabold text-white mb-3 flex items-center">
                                <Sparkles size={16} className="mr-1.5 text-amber-500" /> 방어 시설 설계 선택지
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {DEFENSE_STRUCTURE_TEMPLATES.map((struct) => {
                                    const canAffordGold = character.money >= (struct.cost.gold || 0);
                                    const canAffordWood = (res.wood || 0) >= (struct.cost.wood || 0);
                                    const canAffordStone = (res.stone || 0) >= (struct.cost.stone || 0);
                                    const canAffordIron = (res.iron || 0) >= (struct.cost.iron || 0);
                                    const canAffordMana = (res.manaCrystal || 0) >= (struct.cost.manaCrystal || 0);

                                    const canBuildRes = canAffordGold && canAffordWood && canAffordStone && canAffordIron && canAffordMana;
                                    const hasAlreadyBuiltOnThisInstance = !!currentInstanceStructure;
                                    const canBuild = canBuildRes && !hasAlreadyBuiltOnThisInstance;

                                    const durationMinutes = getDefenseStructureConstructionDuration(struct.key);
                                    const durationText = durationMinutes >= 60 ? `${Math.floor(durationMinutes / 60)}시간 ${durationMinutes % 60 > 0 ? `${durationMinutes % 60}분` : ''}`.trim() : `${durationMinutes}분`;

                                    return (
                                        <div key={struct.key} className={`bg-slate-900 border rounded-xl p-3.5 flex flex-col justify-between transition-all ${hasAlreadyBuiltOnThisInstance ? 'border-slate-850 opacity-50' : 'border-slate-800 hover:border-indigo-500/30'}`}>
                                            <div>
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <h5 className="font-extrabold text-xs text-white">{struct.name}</h5>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] bg-slate-950 text-amber-300 border border-slate-800 px-1.5 py-0.5 rounded font-mono">
                                                            소요: {durationText}
                                                        </span>
                                                        <span className="text-[10px] bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                                                            방어 +{struct.defense}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-slate-400 mb-3 leading-relaxed min-h-[36px]">{struct.desc}</p>
                                                
                                                {/* 요구 자원 표기 */}
                                                <div className="bg-slate-950 p-2 rounded-lg border border-slate-850 space-y-1 mb-3">
                                                    <div className="text-[8px] text-slate-500 uppercase font-bold mb-1">건축 자원 요구량</div>
                                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                                                        {struct.cost.gold > 0 && (
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">골드:</span>
                                                                <span className={canAffordGold ? "text-slate-300" : "text-rose-500 font-bold"}>
                                                                    {struct.cost.gold}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {struct.cost.wood > 0 && (
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">목재:</span>
                                                                <span className={canAffordWood ? "text-slate-300" : "text-rose-500 font-bold"}>
                                                                    {struct.cost.wood}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {struct.cost.stone > 0 && (
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">석재:</span>
                                                                <span className={canAffordStone ? "text-slate-300" : "text-rose-500 font-bold"}>
                                                                    {struct.cost.stone}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {struct.cost.iron > 0 && (
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">철광석:</span>
                                                                <span className={canAffordIron ? "text-slate-300" : "text-rose-500 font-bold"}>
                                                                    {struct.cost.iron}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {struct.cost.manaCrystal > 0 && (
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">마정석:</span>
                                                                <span className={canAffordMana ? "text-slate-300" : "text-rose-500 font-bold"}>
                                                                    {struct.cost.manaCrystal}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleBuildDefenseStructure(struct.key, selectedInstanceId || '')}
                                                disabled={!canBuild}
                                                className={`w-full py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${canBuild ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                            >
                                                {hasAlreadyBuiltOnThisInstance ? (currentInstanceStructure?.underConstruction ? "공사 진행 중" : "건축 슬롯 가득참") : canBuild ? `건축 시작 (${durationText})` : "자원 부족"}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 하단: 전체 방어 기지 완공된 방어소 현황 */}
                        <div className="border-t border-slate-800/80 pt-4">
                            <h4 className="text-sm font-extrabold text-white mb-3 flex items-center justify-between">
                                <span className="flex items-center"><Hammer size={16} className="mr-1.5 text-slate-400" /> 기지 전체 등록된 방어 시설 ({(character.base?.defenseStructures || []).length}개)</span>
                            </h4>
                            
                            {(character.base?.defenseStructures || []).length === 0 ? (
                                <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-xl text-center text-xs text-slate-500">
                                    기지 전체에 활성화된 세부 방어 시설이 없습니다.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[160px] overflow-y-auto custom-scrollbar">
                                    {(character.base?.defenseStructures || []).map((struct: any) => {
                                        const isUnderConst = !!struct.underConstruction;
                                        const rem = isUnderConst ? getConstructionRemainingTime(character.currentDate, character.currentTime, struct.constructionCompletionDate, struct.constructionCompletionTime) : null;
                                        return (
                                            <div key={struct.id} className="bg-slate-900/60 border border-slate-850 rounded-xl p-3 flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-extrabold text-xs text-slate-200 truncate">{struct.name}</span>
                                                        {isUnderConst ? (
                                                            <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-800/60 px-1.5 py-0.5 rounded font-bold animate-pulse">
                                                                공사 중 ({rem?.text})
                                                            </span>
                                                        ) : (
                                                            <span className="text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">
                                                                방어력 +{struct.defense}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[9px] text-slate-500 block">
                                                        {isUnderConst ? `완공 예정: ${struct.constructionCompletionDate} ${struct.constructionCompletionTime}` : `완공 시각: ${new Date(struct.builtAt).toLocaleString()}`}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleDismantleDefenseStructure(struct.id)}
                                                    className="px-2.5 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-900/40 rounded-lg text-[10px] font-bold transition-colors shrink-0"
                                                >
                                                    {isUnderConst ? "취소" : "철거"}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        if (selectedFacility === 'combat_training') {
            const unified = getUnifiedCombatTrainingData(character);
            const trainingData = { trainees: unified.trainees, recentReports: unified.recentReports };
            const maxTrainees = unified.maxTrainees;
            const facilityCount = unified.facilityCount;
            const effectiveLevel = unified.bestFacilityLevel;
            
            const allCompsForLookup = [...character.companions, ...(character.inactiveCompanions || [])]
                .filter(c => !c.isDead && !c.isMonster);
            
            // [MODIFIED] 통합 훈련소 최고 효율 관리자 또는 현재 선택 인스턴스 담당자
            const currentAssigneeId = character.base?.assignments?.[selectedInstanceId || ''];
            const currentAssignee = allCompsForLookup.find(c => c.id === currentAssigneeId);
            const manager = unified.bestManager || currentAssignee;
            const managerId = manager ? ('id' in manager ? manager.id : 'player') : currentAssigneeId;
            
            // 효율성 계산 (트레이너 등급에 따른 보너스 연동)
            const efficiencyBonus = getCombatTrainingEfficiencyBonus(manager);
            const trainerInfo = getCombatTrainingTrainerInfo(manager);
            const baseGain = 10 * effectiveLevel;
            const finalGain = Math.floor(baseGain * (1 + efficiencyBonus));
            const expDaily = finalGain * 5;
            const statDaily = Math.max(0.1, finalGain / 10);

            // [MODIFIED] 훈련 가능한 후보 (대기명단/유휴 상태인 거주민만, 활성 파티원은 절대 불가)
            const activePartyIds = new Set(character.companions.map(c => c.id));
            const idleCandidates = (character.inactiveCompanions || [])
                .filter(c => !c.isDead && !c.isMonster && !isCompanionDispatched(c.id) && !activePartyIds.has(c.id));

            const validInactiveCompanions = character.inactiveCompanions || [];
            // 파티원이 되었거나 대기명단에 없는 대원은 자동 제외
            const trainees = (trainingData.trainees || []).filter(t => 
                validInactiveCompanions.some(c => c.id === t.companionId && !c.isDead && !c.isMonster) && !activePartyIds.has(t.companionId)
            );
            const traineesComps = trainees.map(t => ({
                ...t,
                companion: validInactiveCompanions.find(c => c.id === t.companionId)
            })).filter((t): t is typeof t & { companion: Companion } => !!t.companion);

            // [NEW] 검색 및 정렬이 적용된 훈련 가능한 후보 동료 목록
            const filteredAndSortedCandidates = idleCandidates
                .filter(c => {
                    const isAlreadyTrainee = trainees.some(t => t.companionId === c.id);
                    const isManager = c.id === managerId;
                    if (isAlreadyTrainee || isManager) return false;

                    if (!trainingSearchQuery) return true;
                    return c.name.toLowerCase().includes(trainingSearchQuery.toLowerCase());
                })
                .sort((a, b) => {
                    if (trainingSortOption === 'name') {
                        return a.name.localeCompare(b.name, 'ko');
                    }
                    if (trainingSortOption === 'level') {
                        return b.level - a.level;
                    }
                    if (trainingSortOption === 'affection') {
                        return (b.affection || 0) - (a.affection || 0);
                    }
                    if (trainingSortOption === 'loyalty') {
                        return (b.loyalty || 0) - (a.loyalty || 0);
                    }
                    if (trainingSortOption === 'cp') {
                        return getCompanionCP(b) - getCompanionCP(a);
                    }
                    if (trainingSortOption === 'pureCp') {
                        return getCompanionPureCP(b) - getCompanionPureCP(a);
                    }
                    return 0; // custom (기본) 순
                });

            // 전투 계열 대상 목록 (플레이어 + 커스텀 동료만 변경 가능)
            const customCompanions = allCompsForLookup.filter(c => c.isCustom);
            const styleTargets: { id: string; name: string; level: number; combatStyle?: CombatStyle; isPlayer?: boolean; isCustom?: boolean; entity: any }[] = [
                { id: 'player', name: character.name, level: character.level, combatStyle: character.combatStyle, isPlayer: true, entity: character },
                ...customCompanions.map(c => ({
                    id: c.id,
                    name: c.name,
                    level: c.level,
                    combatStyle: c.combatStyle,
                    isCustom: true,
                    entity: c
                }))
            ];

            const currentStyleTarget = styleTargets.find(t => t.id === combatStyleTargetId) || styleTargets[0];
            const currentSelectedStyle = currentStyleTarget?.combatStyle ? COMBAT_STYLE_CONFIG[currentStyleTarget.combatStyle] : null;

            const handleSelectCombatStyle = (newStyle: CombatStyle) => {
                const styleInfo = COMBAT_STYLE_CONFIG[newStyle];
                const changeCost = COMBAT_STYLE_CHANGE_COST[styleInfo.tier] || 10000;

                if (character.money < changeCost) {
                    setResultOverlay({
                        show: true,
                        data: {
                            type: 'failure',
                            title: '골드 부족',
                            message: `계열 변경/전직을 위해서는 ${changeCost.toLocaleString()}G가 필요합니다.`,
                            items: []
                        }
                    });
                    return;
                }

                const newChar = { ...character };
                newChar.money -= changeCost; // 차감

                if (combatStyleTargetId === 'player') {
                    newChar.combatStyle = newStyle;
                    onUpdateCharacter(
                        newChar,
                        `[전투 계열] ${character.name}의 전투 계열을 [${styleInfo.label}] 계열로 변경하였습니다. (비용: ${changeCost.toLocaleString()}G)`
                    );
                } else {
                    let updated = false;
                    newChar.companions = newChar.companions.map(c => {
                        if (c.id === combatStyleTargetId) {
                            updated = true;
                            return { ...c, combatStyle: newStyle };
                        }
                        return c;
                    });
                    if (!updated && newChar.inactiveCompanions) {
                        newChar.inactiveCompanions = newChar.inactiveCompanions.map(c => {
                            if (c.id === combatStyleTargetId) {
                                return { ...c, combatStyle: newStyle };
                            }
                            return c;
                        });
                    }
                    onUpdateCharacter(
                        newChar,
                        `[전투 계열] ${currentStyleTarget.name}의 전투 계열을 [${styleInfo.label}] 계열로 변경하였습니다. (비용: ${changeCost.toLocaleString()}G)`
                    );
                }

                setResultOverlay({
                    show: true,
                    data: {
                        type: 'success',
                        title: '전투 계열 변경 완료',
                        message: `${currentStyleTarget.name}의 전투 계열이 [${styleInfo.label}] 계열로 설정되었습니다.\n특화 무기 장착 시 공격력 추가 보너스가 적용됩니다.`,
                        items: [
                            { label: '대상', after: currentStyleTarget.name },
                            { label: '소모 비용', after: `${changeCost.toLocaleString()}G` },
                            { label: '전투 계열', after: styleInfo.label },
                            { label: '특화 무기', after: styleInfo.specialtyText }
                        ]
                    }
                });
            };

            const TRAINING_STAT_LABELS: Record<string, string> = {
                exp: '경험치',
                str: '근력',
                int: '지능',
                agi: '민첩',
                wis: '지혜',
                def: '방어',
                ctrl: '제어',
                maxHp: '체력',
                maxMp: '마나',
                weapon: '무기',
                skill: '스킬'
            };

            // [NEW] 훈련 중인 대원 정렬 및 검색, 분류 필터
            const filteredAndSortedTrainees = traineesComps
                .filter(tc => {
                    // 목표 분류 필터
                    if (traineeTargetFilter === 'exp' && tc.targetStat !== 'exp') return false;
                    if (traineeTargetFilter === 'weapon' && tc.targetStat !== 'weapon') return false;
                    if (traineeTargetFilter === 'skill' && tc.targetStat !== 'skill') return false;
                    if (traineeTargetFilter === 'stat' && (tc.targetStat === 'exp' || tc.targetStat === 'weapon' || tc.targetStat === 'skill')) return false;

                    // 검색 필터
                    if (!traineeSearchQuery.trim()) return true;
                    const query = traineeSearchQuery.trim().toLowerCase();
                    const compNameMatch = tc.companion.name.toLowerCase().includes(query);
                    const targetStatLabel = TRAINING_STAT_LABELS[tc.targetStat] || '';
                    const statMatch = targetStatLabel.toLowerCase().includes(query);
                    const skillMatch = tc.targetSkillName ? tc.targetSkillName.toLowerCase().includes(query) : false;
                    const weaponTypeKo = tc.targetWeaponType ? (WEAPON_TYPE_KOREAN[tc.targetWeaponType as WeaponType] || '') : '';
                    const weaponMatch = tc.targetWeaponType ? (tc.targetWeaponType.toLowerCase().includes(query) || weaponTypeKo.toLowerCase().includes(query)) : false;

                    return compNameMatch || statMatch || skillMatch || weaponMatch;
                })
                .sort((a, b) => {
                    if (traineeSortOption === 'name') {
                        return a.companion.name.localeCompare(b.companion.name, 'ko');
                    }
                    if (traineeSortOption === 'levelDesc') {
                        return b.companion.level - a.companion.level;
                    }
                    if (traineeSortOption === 'levelAsc') {
                        return a.companion.level - b.companion.level;
                    }
                    if (traineeSortOption === 'cp') {
                        return getCompanionCP(b.companion) - getCompanionCP(a.companion);
                    }
                    if (traineeSortOption === 'pureCp') {
                        return getCompanionPureCP(b.companion) - getCompanionPureCP(a.companion);
                    }
                    if (traineeSortOption === 'days') {
                        return (b.totalDaysTrained || 0) - (a.totalDaysTrained || 0);
                    }
                    if (traineeSortOption === 'target') {
                        const targetOrder: Record<string, number> = {
                            exp: 1,
                            weapon: 2,
                            skill: 3,
                            str: 4,
                            def: 5,
                            agi: 6,
                            int: 7,
                            wis: 8,
                            ctrl: 9,
                            maxHp: 10,
                            maxMp: 11
                        };
                        const orderA = targetOrder[a.targetStat] || 99;
                        const orderB = targetOrder[b.targetStat] || 99;
                        if (orderA !== orderB) return orderA - orderB;
                        return a.companion.name.localeCompare(b.companion.name, 'ko');
                    }
                    return 0; // 기본 등록 순
                });

            return (
                <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
                    {renderHeader()}
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                        <>
                                {/* [NEW] 전투 훈련소 통합 운영 안내 배너 */}
                                <div className="bg-gradient-to-r from-rose-950/60 via-slate-900 to-indigo-950/60 border border-rose-500/40 rounded-xl p-3.5 shadow-md flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                                            <Target size={20} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                                <span>통합 전투 훈련소</span>
                                                <span className="text-[10px] px-2 py-0.5 bg-rose-900/60 text-rose-300 rounded-full border border-rose-700/60 font-bold">
                                                    총 {facilityCount}개소 통합 운영
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">
                                                {facilityCount > 1 
                                                    ? `어느 전투 훈련소에서 접속하든 동일하게 통합 관리되며, 훈련 정원이 ${maxTrainees}명으로 확장되었습니다.`
                                                    : `전투 훈련소를 추가로 건설하면 어디서든 통합 운영되며 훈련 참여 인원이 계속 증가합니다.`}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                                        <div className="text-[9px] text-slate-400">총 훈련 정원</div>
                                        <div className="text-sm font-bold text-rose-300 font-mono">
                                            {trainees.length} / {maxTrainees}명
                                        </div>
                                    </div>
                                </div>

                                {/* Manager Information Section (Read-only representation of facility assignee) */}
                                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-lg shadow-black/20">
                                    <h4 className="text-sm font-bold text-amber-500 flex items-center gap-1.5 uppercase tracking-wider mb-3">
                                        <UserCheck size={16} className="text-amber-400"/> 시설 관리자
                                    </h4>
                                    
                                    {manager ? (
                                        <div className="flex items-center gap-3 bg-slate-950/50 p-3 rounded-lg border border-slate-800 animate-in fade-in slide-in-from-left-2 transition-all">
                                            <div className="w-10 h-10 rounded-full bg-amber-900/30 border border-amber-700/50 flex items-center justify-center text-amber-500">
                                                <User size={20}/>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                                                    {manager.name}
                                                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-amber-400 border border-slate-700">Lv.{manager.level}</span>
                                                    <span className="text-[10px] bg-indigo-900/60 text-indigo-300 border border-indigo-700/60 px-1.5 py-0.5 rounded font-bold">{trainerInfo.label}</span>
                                                    <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-600/60 px-1.5 py-0.5 rounded font-mono font-bold">
                                                        전투력 {getCompanionCP(manager).toLocaleString()} <span className="text-emerald-400 font-semibold">(순수 {getCompanionPureCP(manager).toLocaleString()})</span>
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">
                                                    트레이너 담당자 배치로 훈련 효율이 <span className="text-amber-400 font-bold">+{trainerInfo.bonusPercent}%</span> 향상되었습니다.
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 border-2 border-dashed border-slate-800 rounded-lg">
                                            <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">
                                                상단 [인원 배치]를 통해 트레이너를 담당자로 지정하면<br/>트레이너 등급에 따라 훈련 효율이 추가 상승합니다.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Efficiency Summary Card */}
                                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-lg shadow-black/20">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
                                            <TrendingUp size={16} className="text-indigo-400"/> 훈련 효율 보고서
                                        </h4>
                                        <button
                                            onClick={() => setIsCombatTrainingReportOpen(true)}
                                            className="px-3 py-1.5 bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 text-cyan-200 border border-cyan-500/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 min-h-[36px]"
                                        >
                                            <Award size={14} className="text-cyan-400" />
                                            <span>훈련 상세 결과 보고서</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                            <div className="text-[9px] text-slate-400 uppercase font-bold mb-1">기본 효율 ({effectiveLevel}단계)</div>
                                            <div className="text-lg font-bold text-slate-200">{baseGain} <span className="text-[10px] text-slate-400 font-normal">포인트</span></div>
                                        </div>
                                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                            <div className="text-[9px] text-amber-400 uppercase font-bold mb-1">담당자 보너스</div>
                                            <div className="text-lg font-bold text-amber-400 flex items-baseline gap-1">
                                                +{trainerInfo.bonusPercent}%
                                                <span className="text-[9px] text-slate-500 font-normal">({trainerInfo.label})</span>
                                            </div>
                                        </div>
                                        <div className="col-span-2 bg-indigo-900/20 p-3 rounded-lg border border-indigo-500/30">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-bold text-indigo-300 uppercase">일일 예상 성장률</span>
                                                <span className="text-[10px] px-1.5 py-0.5 bg-indigo-500 text-white rounded font-bold">가동 중</span>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <div className="text-[9px] text-slate-400 mb-0.5">일일 경험치</div>
                                                    <div className="text-sm font-bold text-cyan-400">+{expDaily.toLocaleString()} <span className="text-[10px] text-slate-400">/ 일</span></div>
                                                </div>
                                                <div className="w-px h-8 bg-slate-800"></div>
                                                <div className="flex-1">
                                                    <div className="text-[9px] text-slate-400 mb-0.5">집중 능력치</div>
                                                    <div className="text-sm font-bold text-emerald-400">+{statDaily.toFixed(2)} <span className="text-[10px] text-slate-400">/ 일</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Training Activity Feed (최근 훈련 진행 결과 보고) */}
                                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-lg shadow-black/20">
                                    <div className="flex items-center justify-between mb-2.5">
                                        <h4 className="text-sm font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider">
                                            <Activity size={16} className="text-cyan-400"/> 최근 훈련 진행 결과 보고
                                        </h4>
                                        <span className="text-[10px] text-slate-400">
                                            {trainingData.recentReports && trainingData.recentReports.length > 0 
                                                ? `최근 ${trainingData.recentReports.length}건 기록됨` 
                                                : '기록 대기 중'}
                                        </span>
                                    </div>

                                    {trainingData.recentReports && trainingData.recentReports.length > 0 ? (
                                        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                            {trainingData.recentReports.slice(0, 5).map((rep, rIdx) => (
                                                <div key={rIdx} className="bg-slate-950/80 border border-slate-800/90 rounded-lg p-2 flex items-center justify-between gap-2 text-xs">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 animate-pulse"></span>
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-bold text-slate-200 truncate">{rep.companionName}</span>
                                                                <span className="text-[10px] text-cyan-400 font-semibold">[{rep.targetStatLabel || rep.targetStat}]</span>
                                                                {rep.leveledUp && (
                                                                    <span className="text-[9px] font-bold text-amber-300 bg-amber-950/80 border border-amber-600 px-1 py-0.2 rounded">
                                                                        레벨업! Lv.{rep.currentLevel}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] text-slate-400">
                                                                {typeof rep.date === 'string' ? rep.date : (rep.date ? `${(rep.date as any).year}년 ${(rep.date as any).month}월 ${(rep.date as any).day}일` : '최근 훈련')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <span className="font-black text-emerald-400 text-xs">
                                                            +{rep.gain ? rep.gain.toLocaleString() : 0}
                                                        </span>
                                                        <div className="text-[9px] text-slate-500">
                                                            누적 +{rep.accumulatedGain ? rep.accumulatedGain.toLocaleString() : 0}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3.5 text-center text-slate-400 text-xs">
                                            <p className="text-slate-400 font-medium">아직 일일 훈련 결과가 기록되지 않았습니다.</p>
                                            <p className="text-[11px] text-slate-500 mt-1">대원을 훈련에 배치하면 주간 시간(06:00 ~ 22:00) 동안 훈련 시간이 누적되며, 12시간을 채울 때마다 능력치가 상승하고 가문 서신이 발송됩니다.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Trainees List Section */}
                                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-lg shadow-black/20 flex flex-col">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider">
                                                <Users size={16} className="text-cyan-400"/> 훈련 대원 ({trainees.length}/{maxTrainees})
                                            </h4>
                                            {trainees.length > 0 && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-medium">
                                                    {filteredAndSortedTrainees.length}명 표시
                                                </span>
                                            )}
                                        </div>
                                        <div className="h-1.5 flex-1 max-w-xs sm:mx-3 bg-slate-800 rounded-full overflow-hidden self-stretch sm:self-auto">
                                            <div 
                                                className="h-full bg-cyan-500 transition-all duration-500" 
                                                style={{ width: `${(trainees.length / maxTrainees) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* 훈련 대원 정렬 및 검색, 필터 컨트롤러 */}
                                    {trainees.length > 0 && (
                                        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 mb-3.5 space-y-2">
                                            {/* 상단: 필터 탭 (전체, 경험치, 무기 숙련, 스킬 숙련, 능력치) */}
                                            <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar text-[11px]">
                                                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 shrink-0 mr-1">
                                                    <Filter size={11} className="text-slate-400"/> 분류:
                                                </span>
                                                {[
                                                    { id: 'all', label: '전체' },
                                                    { id: 'exp', label: '경험치' },
                                                    { id: 'weapon', label: '무기 숙련' },
                                                    { id: 'skill', label: '스킬 숙련' },
                                                    { id: 'stat', label: '능력치' }
                                                ].map(tab => (
                                                    <button
                                                        key={tab.id}
                                                        onClick={() => setTraineeTargetFilter(tab.id as any)}
                                                        className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors ${
                                                            traineeTargetFilter === tab.id
                                                                ? 'bg-cyan-600 text-white shadow-sm'
                                                                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        {tab.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* 하단: 검색창 및 정렬 드롭다운 */}
                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                                                <div className="relative flex-1">
                                                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                                    <input
                                                        type="text"
                                                        placeholder="훈련 대원 이름 또는 집중 목표 검색"
                                                        value={traineeSearchQuery}
                                                        onChange={(e) => setTraineeSearchQuery(e.target.value)}
                                                        className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                                    />
                                                    {traineeSearchQuery && (
                                                        <button
                                                            onClick={() => setTraineeSearchQuery('')}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <ArrowUpDown size={13} className="text-cyan-400 shrink-0" />
                                                    <select
                                                        value={traineeSortOption}
                                                        onChange={(e) => setTraineeSortOption(e.target.value as any)}
                                                        aria-label="훈련 대원 정렬 기준"
                                                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                                                    >
                                                        <option value="default">기본 순</option>
                                                        <option value="name">이름 순</option>
                                                        <option value="cp">전투력 높은 순</option>
                                                        <option value="pureCp">순수 전투력 높은 순</option>
                                                        <option value="levelDesc">레벨 높은 순</option>
                                                        <option value="levelAsc">레벨 낮은 순</option>
                                                        <option value="days">훈련 일수 많은 순</option>
                                                        <option value="target">훈련 목표 순</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {filteredAndSortedTrainees.map((tc) => {
                                            const comp = tc.companion;
                                            const isExp = tc.targetStat === 'exp';
                                            const isWeapon = tc.targetStat === 'weapon';
                                            const isSkill = tc.targetStat === 'skill';
                                            const expPct = isExp && comp && comp.maxExp ? Math.min(100, Math.round((comp.currentExp / comp.maxExp) * 100)) : 0;
                                            const currentStatVal = (!isExp && !isWeapon && !isSkill && comp) ? (comp.stats as any)[tc.targetStat] : null;

                                            // 무기 숙련도 정보 계산
                                            const currentWeaponType: WeaponType = tc.targetWeaponType || (comp?.equipment?.weapon?.weaponType as WeaponType) || 'Sword';
                                            const currentWeaponName = WEAPON_TYPE_KOREAN[currentWeaponType] || currentWeaponType;
                                            const weaponMasteryInfo = comp?.weaponMastery?.[currentWeaponType] || { level: 0, currentExp: 0 };
                                            const weaponReqExp = (weaponMasteryInfo.level + 4) * 10;
                                            const weaponPct = Math.min(100, Math.round((weaponMasteryInfo.currentExp / weaponReqExp) * 100));

                                            // 스킬 숙련도 정보 계산
                                            const compSkills = comp?.skills || [];
                                            const currentSkill = compSkills.find(s => s.name === tc.targetSkillName) || compSkills[0];
                                            const skillReqMastery = currentSkill ? 20 * (currentSkill.level + 4) : 100;
                                            const skillPct = currentSkill ? Math.min(100, Math.round(((currentSkill.currentMastery || 0) / skillReqMastery) * 100)) : 0;

                                            const gainUnit = (isExp || isWeapon) ? 'EXP' : isSkill ? '숙련도' : '';

                                            return (
                                                <div key={tc.companionId} className="bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-cyan-500/30 transition-all group space-y-2.5">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-9 h-9 rounded-lg bg-cyan-900/20 border border-cyan-800/30 flex items-center justify-center text-cyan-400 font-bold text-xs">
                                                                {comp?.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5 flex-wrap">
                                                                    <span>{comp?.name}</span>
                                                                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-amber-400 rounded border border-slate-700">
                                                                        Lv.{comp?.level}
                                                                    </span>
                                                                    <span className="text-[10px] px-1.5 py-0.2 bg-amber-950/80 text-amber-300 rounded border border-amber-600/60 font-mono font-bold flex items-center gap-1 shadow-sm">
                                                                        <Swords size={11} className="text-amber-400" />
                                                                        <span>전투력 {comp ? getCompanionCP(comp).toLocaleString() : 0}</span>
                                                                        <span className="text-emerald-400 font-semibold">(순수 {comp ? getCompanionPureCP(comp).toLocaleString() : 0})</span>
                                                                    </span>
                                                                </div>
                                                                <div className="text-[9px] text-slate-400">
                                                                    훈련 중 (시작: {tc.startDate}{tc.totalDaysTrained ? `, ${tc.totalDaysTrained}일차` : ''})
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => removeTrainee(tc.companionId)} 
                                                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
                                                            title="훈련 중단"
                                                        >
                                                            <Trash2 size={14}/>
                                                        </button>
                                                    </div>

                                                    {/* 실시간 훈련 성과 게이지 및 수치 */}
                                                    {comp && (
                                                        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-[11px] space-y-1.5">
                                                            {isExp ? (
                                                                <>
                                                                    <div className="flex justify-between items-center text-slate-300">
                                                                        <span className="text-[10px] text-slate-400">경험치 진행도</span>
                                                                        <span className="font-bold text-cyan-300">
                                                                            {comp.currentExp.toLocaleString()} / {comp.maxExp.toLocaleString()} EXP ({expPct}%)
                                                                        </span>
                                                                    </div>
                                                                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-cyan-400 transition-all duration-300"
                                                                            style={{ width: `${expPct}%` }}
                                                                        />
                                                                    </div>
                                                                </>
                                                            ) : isWeapon ? (
                                                                <>
                                                                    <div className="flex justify-between items-center text-slate-300">
                                                                        <span className="text-[10px] text-orange-400 font-bold flex items-center gap-1">
                                                                            <span>[무기]</span>
                                                                            <span className="text-white">{currentWeaponName} Lv.{weaponMasteryInfo.level}</span>
                                                                        </span>
                                                                        <span className="font-bold text-orange-300">
                                                                            {weaponMasteryInfo.currentExp} / {weaponReqExp} EXP ({weaponPct}%)
                                                                        </span>
                                                                    </div>
                                                                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                                                                            style={{ width: `${weaponPct}%` }}
                                                                        />
                                                                    </div>
                                                                </>
                                                            ) : isSkill ? (
                                                                currentSkill ? (
                                                                    <>
                                                                        <div className="flex justify-between items-center text-slate-300">
                                                                            <span className="text-[10px] text-violet-400 font-bold flex items-center gap-1">
                                                                                <span>[스킬]</span>
                                                                                <span className="text-white truncate max-w-[130px]">{currentSkill.name} Lv.{currentSkill.level}</span>
                                                                            </span>
                                                                            <span className="font-bold text-violet-300">
                                                                                {currentSkill.currentMastery || 0} / {skillReqMastery} ({skillPct}%)
                                                                            </span>
                                                                        </div>
                                                                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                                                                            <div
                                                                                className="h-full bg-gradient-to-r from-purple-500 to-violet-500 transition-all duration-300"
                                                                                style={{ width: `${skillPct}%` }}
                                                                            />
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div className="text-[10px] text-slate-500 py-0.5">
                                                                        습득한 스킬이 없어 훈련을 진행할 수 없습니다.
                                                                    </div>
                                                                )
                                                            ) : (
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[10px] text-slate-400">현재 {TRAINING_STAT_LABELS[tc.targetStat]}</span>
                                                                    <span className="font-bold text-emerald-400">
                                                                        {currentStatVal !== null ? currentStatVal : '-'}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* [NEW] 누적 훈련 시간 게이지 (12시간 달성 시 능력치 상승) */}
                                                            <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 text-[11px] space-y-1">
                                                                <div className="flex justify-between items-center text-slate-300">
                                                                    <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                                                                        <Clock size={11} className="text-amber-400 shrink-0" />
                                                                        <span>누적 훈련 시간</span>
                                                                        <span className="text-[9px] text-slate-500 font-normal">(주간 06:00~22:00 누적)</span>
                                                                    </span>
                                                                    <span className="font-bold text-amber-300 text-[10px] font-mono">
                                                                        {Math.floor((tc.accumulatedMinutes || 0) / 60)}시간 {(tc.accumulatedMinutes || 0) % 60}분 / 12시간 ({Math.min(100, Math.round(((tc.accumulatedMinutes || 0) / 720) * 100))}%)
                                                                    </span>
                                                                </div>
                                                                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                                                                    <div
                                                                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                                                                        style={{ width: `${Math.min(100, Math.round(((tc.accumulatedMinutes || 0) / 720) * 100))}%` }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[10px]">
                                                                <div className="bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80 flex justify-between">
                                                                    <span className="text-slate-400">최근 1회</span>
                                                                    <span className="font-bold text-cyan-400">
                                                                        {tc.lastGain ? `+${tc.lastGain.toLocaleString()} ${gainUnit}`.trim() : '대기 중'}
                                                                    </span>
                                                                </div>
                                                                <div className="bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80 flex justify-between">
                                                                    <span className="text-slate-400">누적 총합</span>
                                                                    <span className="font-bold text-amber-300">
                                                                        {tc.accumulatedGain ? `+${tc.accumulatedGain.toLocaleString()} ${gainUnit}`.trim() : '0'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="flex flex-col gap-2 p-2 bg-slate-900/50 rounded border border-slate-800/50">
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">훈련 집중 목표</span>
                                                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-11 gap-1">
                                                            {(['exp', 'str', 'int', 'agi', 'wis', 'def', 'ctrl', 'maxHp', 'maxMp', 'weapon', 'skill'] as const).map(stat => {
                                                                const isSelected = tc.targetStat === stat;
                                                                let activeClass = 'bg-cyan-700 text-white border-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.3)]';
                                                                if (stat === 'weapon') activeClass = 'bg-orange-700 text-white border-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.3)]';
                                                                if (stat === 'skill') activeClass = 'bg-violet-700 text-white border-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.3)]';

                                                                return (
                                                                    <button 
                                                                        key={stat}
                                                                        onClick={() => updateTraineeTarget(tc.companionId, stat)}
                                                                        className={`text-[9px] py-1 rounded-md border font-bold transition-all ${isSelected ? activeClass : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'}`}
                                                                    >
                                                                        {TRAINING_STAT_LABELS[stat] || stat}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* [NEW] 무기 훈련 시 지정 무기 선택 셀렉터 */}
                                                        {isWeapon && (
                                                            <div className="flex items-center gap-2 pt-1.5 border-t border-slate-800/80">
                                                                <span className="text-[10px] font-bold text-orange-400 shrink-0">지정 무기:</span>
                                                                <select
                                                                    value={currentWeaponType}
                                                                    onChange={(e) => updateTraineeWeapon(tc.companionId, e.target.value as WeaponType)}
                                                                    className="flex-1 bg-slate-950 border border-orange-500/40 text-orange-200 text-[11px] rounded px-2 py-1 focus:outline-none focus:border-orange-400"
                                                                >
                                                                    {Object.entries(WEAPON_TYPE_KOREAN).map(([wKey, wLabel]) => {
                                                                        const lv = comp?.weaponMastery?.[wKey as WeaponType]?.level || 0;
                                                                        return (
                                                                            <option key={wKey} value={wKey}>
                                                                                {wLabel} ({wKey}) - Lv.{lv}
                                                                            </option>
                                                                        );
                                                                    })}
                                                                </select>
                                                            </div>
                                                        )}

                                                        {/* [NEW] 스킬 훈련 시 지정 스킬 선택 셀렉터 */}
                                                        {isSkill && (
                                                            <div className="flex items-center gap-2 pt-1.5 border-t border-slate-800/80">
                                                                <span className="text-[10px] font-bold text-violet-400 shrink-0">지정 스킬:</span>
                                                                {compSkills.length > 0 ? (
                                                                    <select
                                                                        value={currentSkill?.name || ''}
                                                                        onChange={(e) => updateTraineeSkill(tc.companionId, e.target.value)}
                                                                        className="flex-1 bg-slate-950 border border-violet-500/40 text-violet-200 text-[11px] rounded px-2 py-1 focus:outline-none focus:border-violet-400"
                                                                    >
                                                                        {compSkills.map((s, sIdx) => (
                                                                            <option key={sIdx} value={s.name}>
                                                                                {s.name} (Lv.{s.level} / Max {s.maxLevel || 10})
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                ) : (
                                                                    <span className="text-[10px] text-slate-500">습득한 스킬이 없습니다</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {trainees.length > 0 && filteredAndSortedTrainees.length === 0 && (
                                            <div className="py-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                                                <p className="text-xs text-slate-400 font-medium">검색 및 분류 조건에 일치하는 훈련 대원이 없습니다.</p>
                                                <button
                                                    onClick={() => {
                                                        setTraineeSearchQuery('');
                                                        setTraineeTargetFilter('all');
                                                    }}
                                                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    필터 초기화
                                                </button>
                                            </div>
                                        )}
                                        {trainees.length === 0 && (
                                            <div className="py-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                                                <p className="text-xs text-slate-500 font-medium">현재 훈련 중인 대원이 없습니다.</p>
                                                <p className="text-[11px] text-slate-600 mt-1">하단의 추가 훈련 가능 목록에서 대원을 등록하여 성장을 시작하세요.</p>
                                            </div>
                                        )}

                                        {/* Add Trainee Slot */}
                                        {trainees.length < maxTrainees && (
                                            <div className="mt-4 pt-4 border-t border-slate-800 animate-in fade-in slide-in-from-bottom-2">
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                                                    <h5 className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 shrink-0">
                                                        <Target size={12}/> 추가 훈련 가능 ({maxTrainees - trainees.length}자리 남음)
                                                    </h5>
                                                    
                                                    {/* 검색 및 정렬 컨트롤러 */}
                                                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                                        {/* 검색 입력 */}
                                                        <input
                                                            type="text"
                                                            placeholder="이름 검색"
                                                            value={trainingSearchQuery}
                                                            onChange={(e) => setTrainingSearchQuery(e.target.value)}
                                                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-full sm:w-28"
                                                        />
                                                        {/* 정렬 셀렉터 */}
                                                        <select
                                                            value={trainingSortOption}
                                                            onChange={(e) => setTrainingSortOption(e.target.value as any)}
                                                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-cyan-500 shrink-0 cursor-pointer"
                                                        >
                                                            <option value="custom">기본 순</option>
                                                            <option value="cp">전투력 순</option>
                                                            <option value="pureCp">순수 전투력 순</option>
                                                            <option value="name">이름 순</option>
                                                            <option value="level">레벨 순</option>
                                                            <option value="affection">호감도 순</option>
                                                            <option value="loyalty">충성도 순</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                                                    {filteredAndSortedCandidates.map(c => (
                                                        <button 
                                                            key={c.id} 
                                                            onClick={() => addTrainee(c.id)}
                                                            className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 hover:bg-cyan-900/20 text-xs border border-slate-700 hover:border-cyan-500/50 transition-all group"
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-700 group-hover:bg-cyan-400 group-hover:animate-pulse transition-all shrink-0"></span>
                                                                <span className="text-slate-300 font-medium truncate">{c.name}</span>
                                                                <span className="text-[9px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 font-mono shrink-0">Lv.{c.level}</span>
                                                                <span className="text-[9px] bg-amber-950/60 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800/40 font-mono font-bold flex items-center gap-1 shrink-0">
                                                                    <Swords size={10} className="text-amber-400" />
                                                                    <span>전투력 {getCompanionCP(c).toLocaleString()}</span>
                                                                    <span className="text-emerald-400 font-semibold">(순수 {getCompanionPureCP(c).toLocaleString()})</span>
                                                                </span>
                                                                {(c.affection || 0) > 0 && (
                                                                    <span className="text-[9px] text-rose-400 shrink-0">♥{c.affection}</span>
                                                                )}
                                                                {(c.loyalty || 0) > 0 && (
                                                                    <span className="text-[9px] text-indigo-400 shrink-0">★{c.loyalty}</span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] text-cyan-400 font-bold uppercase shrink-0">등록</span>
                                                        </button>
                                                    ))}
                                                    {filteredAndSortedCandidates.length === 0 && (
                                                        <div className="py-8 text-center bg-slate-900/30 rounded-lg border border-slate-800">
                                                            <p className="text-[10px] text-slate-500">
                                                                {trainingSearchQuery ? "검색 결과가 없습니다." : "등록 가능한 유휴 동료가 없습니다."}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {trainees.length >= maxTrainees && (
                                            <div className="mt-2 text-center p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                                                <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                                                    <Lock size={10}/> 훈련 슬롯이 가득 찼습니다. 시설을 업그레이드하여 슬롯을 늘리세요.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Info tip */}
                                <div className="p-3 bg-indigo-900/10 border border-indigo-900/30 rounded-lg flex gap-3">
                                    <Info size={20} className="text-indigo-400 shrink-0"/>
                                    <p className="text-[10px] text-slate-400 leading-normal">
                                        훈련소에 등록된 동료는 매일 일정량의 경험치 또는 능력치가 상승합니다. <br/>
                                        <span className="text-indigo-300 font-bold">시설 레벨</span>과 <span className="text-amber-300 font-bold">관리자의 역량</span>에 따라 훈련 효율이 대폭 상향됩니다.
                                    </p>
                                </div>
                            </>
                    </div>
                </div>
            );
        }

        if (selectedFacility === 'tactical_training') {
            return (
                <div className="flex flex-col h-full space-y-4">
                    {renderHeader()}
                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 flex flex-col justify-between items-center text-center space-y-4">
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 my-auto">
                            <Target size={48} className="animate-pulse" />
                        </div>
                        <div className="space-y-2 max-w-md">
                            <h3 className="text-lg sm:text-xl font-bold text-white">전술 훈련소</h3>
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                주인공 및 파티원의 전투 역할(<span className="text-red-400 font-bold">딜러</span>, <span className="text-blue-400 font-bold">탱커</span>, <span className="text-emerald-400 font-bold">서포터</span>) 숙련도를 연마하는 시설입니다.
                                <br />
                                역할 숙련도를 <span className="text-amber-400 font-bold">100</span>까지 달성해야 '전술 및 진형'에서 해당 역할을 수행할 수 있습니다.
                            </p>
                        </div>
                        <button
                            onClick={() => onOpenTacticalTraining?.()}
                            className="w-full max-w-sm py-3 px-6 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-xl shadow-lg shadow-amber-950/50 transition-all flex items-center justify-center gap-2 text-sm active:scale-95 my-auto"
                        >
                            <Target size={18} />
                            <span>전술 훈련소 입실 (역할 숙련도 연마)</span>
                        </button>
                    </div>
                </div>
            );
        }

        if (selectedFacility === 'sparring_arena') {
            return (
                <div className="flex flex-col h-full space-y-4">
                    {renderHeader()}
                    <div className="flex-1 bg-slate-900 border border-amber-500/30 rounded-xl p-4 sm:p-6 flex flex-col justify-between items-center text-center space-y-4">
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 my-auto shadow-lg shadow-amber-950">
                            <Swords size={48} className="animate-pulse" />
                        </div>
                        <div className="space-y-2 max-w-md">
                            <h3 className="text-lg sm:text-xl font-bold text-amber-100">전술 모의 대련장</h3>
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                동료들과 1:1 실전 모의 대련을 진행하는 시설입니다.
                                <br />
                                대련을 통해 <span className="text-amber-400 font-bold">전술 역할 숙련도</span>와 경험치를 획득하고, 전투 승리 시 동료와의 <span className="text-pink-400 font-bold">호감도</span>를 높일 수 있습니다.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsSparringArenaOpen(true)}
                            className="w-full max-w-sm py-3 px-6 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-xl shadow-lg shadow-amber-950/50 transition-all flex items-center justify-center gap-2 text-sm active:scale-95 my-auto"
                        >
                            <Swords size={18} />
                            <span>모의 대련장 입장 (1:1 대련 시작)</span>
                        </button>
                    </div>
                </div>
            );
        }

        if (selectedFacility === 'child_academy') {
            return (
                <div className="flex flex-col h-full space-y-4">
                    {renderHeader()}
                    <div className="flex-1 bg-slate-900 border border-amber-500/30 rounded-xl p-4 sm:p-6 flex flex-col justify-between items-center text-center space-y-4">
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 my-auto shadow-lg shadow-amber-950">
                            <BookOpen size={48} className="animate-pulse" />
                        </div>
                        <div className="space-y-2 max-w-md">
                            <h3 className="text-lg sm:text-xl font-bold text-amber-100">유년 서당 (영재 학당)</h3>
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                기지에서 태어난 아이들이나 어린 견습생들이 성인식 전까지 기본 소양을 배우는 시설입니다.
                                <br />
                                교육 담당 스승의 직업과 전투력에 따라 아이들의 초기 능력치와 가업 재능을 유리한 방향으로 육성합니다.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsChildAcademyOpen(true)}
                            className="w-full max-w-sm py-3 px-6 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-xl shadow-lg shadow-amber-950/50 transition-all flex items-center justify-center gap-2 text-sm active:scale-95 my-auto"
                        >
                            <BookOpen size={18} />
                            <span>유년 서당 입장 (훈육 및 수업 시작)</span>
                        </button>
                    </div>
                </div>
            );
        }

        if (selectedFacility === 'monster_arena') {
            return (
                <div className="flex flex-col h-full space-y-4">
                    {renderHeader()}
                    <div className="flex-1 bg-slate-900 border border-red-500/30 rounded-xl p-4 sm:p-6 flex flex-col justify-between items-center text-center space-y-4">
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-full text-red-400 my-auto shadow-lg shadow-red-950">
                            <Swords size={48} className="animate-pulse text-red-400" />
                        </div>
                        <div className="space-y-2 max-w-md">
                            <h3 className="text-lg sm:text-xl font-bold text-red-100">몬스터 수련 투기장</h3>
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                사육소의 몬스터들끼리 모의 대전을 치르며 야성을 일깨우는 시설입니다.
                                <br />
                                담당 사육사의 전문적인 지도 아래 몬스터의 능력치와 전투 경험치를 비약적으로 증가시킵니다.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsMonsterArenaOpen(true)}
                            className="w-full max-w-sm py-3 px-6 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl shadow-lg shadow-red-950/50 transition-all flex items-center justify-center gap-2 text-sm active:scale-95 my-auto"
                        >
                            <Swords size={18} />
                            <span>수련 투기장 입장 (모의 대전 시작)</span>
                        </button>
                    </div>
                </div>
            );
        }

        if (selectedFacility === 'training_style') {
            return (
                <div className="flex flex-col h-full space-y-4">
                    {renderHeader()}
                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 flex flex-col justify-between items-center text-center space-y-4">
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 my-auto">
                            <Sword size={48} className="animate-pulse" />
                        </div>
                        <div className="space-y-2 max-w-md">
                            <h3 className="text-lg sm:text-xl font-bold text-white">전투 스타일 훈련소</h3>
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                주인공 및 커스텀 동료의 <span className="text-indigo-400 font-bold">전투 계열(1~4차 전직)</span>을 연마하고 승급하는 곳입니다.
                                <br />
                                실제 전투를 통해 몬스터와 보스를 처치하고 경험치를 쌓아야 승급할 수 있습니다.
                            </p>
                        </div>
                        <button
                            onClick={() => onFacilitySpecificAction?.('training_style', 'open')}
                            className="w-full max-w-sm py-3 px-6 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-950/50 transition-all flex items-center justify-center gap-2 text-sm active:scale-95 my-auto"
                        >
                            <Sword size={18} />
                            <span>전투 스타일 훈련소 입장</span>
                        </button>
                    </div>
                </div>
            );
        }

        if (selectedFacility === 'potential_breakthrough') {
            const currentInst = character.base?.layout?.find(f => f.id === (selectedInstanceId || activeInstanceId)) || character.base?.layout?.find(f => f.type === 'potential_breakthrough');
            const level = currentInst ? currentInst.level : 1;

            return (
                <div className="flex flex-col items-center justify-center h-full space-y-6">
                    {renderHeader()}
                    <div className="text-center max-w-sm mx-auto space-y-2">
                        <p className="text-sm text-slate-400">
                            동료와 플레이어의 영혼에 잠든 한계를 돌파하고, 강력한 신의 사자 모형과의 최후의 시련에 도전하는 특수 연구 시설입니다.
                        </p>
                        <div className="flex justify-center gap-2 text-[11px] text-amber-400/90 font-medium">
                            <span>퍼스트(8천 CP)</span>
                            <span>•</span>
                            <span>세컨드(3만 CP)</span>
                            <span>•</span>
                            <span>라스트(10만 CP)</span>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setIsPotentialBreakthroughOpen(true);
                            setActiveInstanceId(selectedInstanceId);
                        }}
                        className="p-8 rounded-3xl flex flex-col items-center bg-slate-900 border-2 border-amber-600 hover:border-amber-400 hover:bg-amber-950/30 transition-all group active:scale-95 shadow-[0_0_25px_rgba(245,158,11,0.2)]"
                    >
                        <Sparkles size={48} className="mb-3 text-amber-400 group-hover:text-amber-300 transition-colors animate-pulse" />
                        <span className="text-lg font-black text-amber-200">기지 잠재력 돌파소 진입</span>
                        <span className="text-xs text-slate-400 mt-1">대원 돌파 • 플레이어 돌파 • 최후의 시련(Lv.5)</span>
                    </button>
                </div>
            );
        }

        if (selectedFacility === 'trade_exchange') {
            const currentInst = character.base?.layout?.find(f => f.id === (selectedInstanceId || activeInstanceId)) || character.base?.layout?.find(f => f.type === 'trade_exchange');
            const level = currentInst ? (currentInst.level || 1) : (character.base?.facilityLevels?.['trade_exchange'] || 1);
            const discountPercent = Math.min(25, (level - 1) * 4);

            return (
                <div className="flex flex-col items-center justify-center h-full space-y-6 animate-in fade-in">
                    {renderHeader()}
                    <div className="text-center max-w-md mx-auto space-y-2">
                        <p className="text-sm text-slate-300">
                            기지의 여분 자원을 시장에 판매하여 골드를 확보하거나, 부족한 자원을 골드로 구매할 수 있는 고유 상업 교류 시설입니다.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-950/60 border border-amber-500/40 rounded-full text-xs text-amber-300 font-bold">
                                <span>구매 할인 혜택: {discountPercent}% (시설 레벨 {level})</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400">
                            {level === 1 && "현재 구매 가능: 식량, 목재, 석재, 철, 약초 (기본 자원 5종)"}
                            {level === 2 && "현재 구매 가능: 기본 자원 5종 + 기본 농작물 9종 (밀, 쌀, 옥수수, 감자, 고구마, 양파, 마늘, 상추, 당근)"}
                            {level === 3 && "현재 구매 가능: 기본 농작물 + 상급 농작물 7종 (배추, 토마토, 딸기, 포도, 수박, 인삼, 마력 열매)"}
                            {level === 4 && "현재 구매 가능: 모든 일반 농작물 + 은광석, 금광석"}
                            {level >= 5 && "현재 구매 가능: 최고급 보석 4종 (다이아몬드, 루비, 사파이어, 에메랄드) 포함 전 품목"}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setIsTradeExchangeOpen(true);
                            setActiveInstanceId(selectedInstanceId);
                        }}
                        className="p-8 rounded-3xl flex flex-col items-center bg-slate-900 border-2 border-amber-500 hover:border-amber-400 hover:bg-amber-950/40 transition-all group active:scale-95 shadow-[0_0_25px_rgba(245,158,11,0.25)]"
                    >
                        <Store size={48} className="mb-3 text-amber-400 group-hover:text-amber-300 transition-colors" />
                        <span className="text-lg font-black text-amber-200">물자 교류소 입장</span>
                        <span className="text-xs text-slate-400 mt-1">자원 판매 • 레벨별 자원 구매 • 시설 할인 혜택</span>
                    </button>
                </div>
            );
        }

        if (selectedFacility === 'custom_lab') {
            const currentInst = character.base?.layout?.find(f => f.id === (selectedInstanceId || activeInstanceId)) || character.base?.layout?.find(f => f.type === 'custom_lab');
            const level = currentInst ? (currentInst.level || 1) : (character.base?.facilityLevels?.['custom_lab'] || 1);

            return (
                <div className="flex flex-col items-center justify-center h-full space-y-6 animate-in fade-in">
                    {renderHeader()}
                    <div className="text-center max-w-md mx-auto space-y-2">
                        <p className="text-sm text-slate-300">
                            외형 변환, 등장 테마곡 설정, 일반 동료 및 몬스터를 커스텀 개체로 개조 승격하는 고유 연구 시설입니다.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-950/60 border border-purple-500/40 rounded-full text-xs text-purple-300 font-bold">
                                <span>시설 레벨: Lv.{level}</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400">
                            {level >= 1 && "레벨 1: 커스텀 개조 탭 활성화"}
                            {level >= 3 && " • 레벨 3: 외형 변환 탭 활성화"}
                            {level >= 5 && " • 레벨 5: 등장 배경음악 탭 활성화"}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setIsCustomLabOpen(true);
                            setActiveInstanceId(selectedInstanceId);
                        }}
                        className="p-8 rounded-3xl flex flex-col items-center bg-slate-900 border-2 border-purple-500 hover:border-purple-400 hover:bg-purple-950/40 transition-all group active:scale-95 shadow-[0_0_25px_rgba(168,85,247,0.25)]"
                    >
                        <Wand2 size={48} className="mb-3 text-purple-400 group-hover:text-purple-300 transition-colors" />
                        <span className="text-lg font-black text-purple-200">커스텀 개조실 입장</span>
                        <span className="text-xs text-slate-400 mt-1">커스텀 개조 • 외형 변환 • 등장 테마곡 설정</span>
                    </button>
                </div>
            );
        }

        if (selectedFacility === 'skill_vfx_lab') {
            const currentInst = character.base?.layout?.find(f => f.id === (selectedInstanceId || activeInstanceId)) || character.base?.layout?.find(f => f.type === 'skill_vfx_lab');
            const level = currentInst ? (currentInst.level || 1) : (character.base?.facilityLevels?.['skill_vfx_lab'] || 1);

            return (
                <div className="flex flex-col items-center justify-center h-full space-y-6 animate-in fade-in">
                    {renderHeader()}
                    <div className="text-center max-w-md mx-auto space-y-2">
                        <p className="text-sm text-slate-300">
                            스킬 이펙트 테마, 아이콘, 스킬 컷신, 프레임 이펙트 제작, 이펙트 영상을 개조하는 고유 시설입니다.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-950/60 border border-cyan-500/40 rounded-full text-xs text-cyan-300 font-bold">
                                <span>시설 레벨: Lv.{level}</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400">
                            {level >= 1 && "레벨 1: 스킬 이펙트 변경 활성화"}
                            {level >= 2 && " • 레벨 2: 스킬 컷신 활성화"}
                            {level >= 3 && " • 레벨 3: 프레임 이펙트 제작 활성화"}
                            {level >= 5 && " • 레벨 5: 이펙트 영상 탭 활성화"}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setIsSkillVfxLabOpen(true);
                            setActiveInstanceId(selectedInstanceId);
                        }}
                        className="p-8 rounded-3xl flex flex-col items-center bg-slate-900 border-2 border-cyan-500 hover:border-cyan-400 hover:bg-cyan-950/40 transition-all group active:scale-95 shadow-[0_0_25px_rgba(6,182,212,0.25)]"
                    >
                        <Sparkles size={48} className="mb-3 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                        <span className="text-lg font-black text-cyan-200">스킬 이펙트 커스텀 개조실 입장</span>
                        <span className="text-xs text-slate-400 mt-1">이펙트 변경 • 컷신 등록 • 프레임 애니메이션 • 이펙트 영상</span>
                    </button>
                </div>
            );
        }

        return <div className="flex flex-col items-center justify-center h-full space-y-6">{renderHeader()}<p className="text-slate-500 text-sm">시설 기능을 불러오고 있습니다...</p></div>;
    };

    const renderUpgradeModal = () => {
        if (!upgradingFacility) return null;
        const config = FACILITY_UPGRADE_CONFIG[upgradingFacility];
        if (!config) return null;
        
        // Find the specific instance if selectedInstanceId is set, otherwise use global level
        const instance = character.base?.layout?.find(inst => inst.id === selectedInstanceId) || 
                         character.base?.layout?.find(inst => inst.type === upgradingFacility);
        
        const facilityInfo = FACILITIES_INFO.find(f => f.id === upgradingFacility);
        const facilityName = facilityInfo?.name || upgradingFacility;

        if (instance?.underConstruction) {
            const rem = getConstructionRemainingTime(character.currentDate, character.currentTime, instance.constructionCompletionDate, instance.constructionCompletionTime);
            return (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-slate-900 w-full max-w-sm rounded-xl border border-amber-600/70 shadow-2xl p-6 text-center">
                        <Hammer className="mx-auto text-amber-400 mb-3 animate-bounce" size={36} />
                        <h3 className="text-lg font-bold text-white mb-2">{facilityName} 공사 진행 중</h3>
                        <p className="text-xs text-slate-300 mb-4">
                            현재 Lv.{instance.targetLevel || (instance.level + 1)} 증축 공사가 진행되고 있습니다.
                        </p>
                        <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 mb-5">
                            <span className="text-xs text-amber-300 font-bold block mb-1">완공까지 남은 시간</span>
                            <span className="text-base text-amber-400 font-extrabold">{rem.text}</span>
                        </div>
                        <button onClick={() => setUpgradingFacility(null)} className="w-full py-2.5 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 font-bold text-xs">닫기</button>
                    </div>
                </div>
            );
        }

        const currentLevel = instance?.level || character.base?.facilityLevels?.[upgradingFacility] || 1;
        const nextLevel = currentLevel + 1;
        const res = character.base!.resources;

        const durationMinutes = getFacilityConstructionDuration(upgradingFacility, true, currentLevel);
        const { completionDate, completionTime } = calculateCompletionDateTime(
            character.currentDate,
            character.currentTime,
            durationMinutes
        );
        const remTime = getConstructionRemainingTime(character.currentDate, character.currentTime, completionDate, completionTime);

        const woodCost = config.woodCost * currentLevel;
        const stoneCost = config.stoneCost * currentLevel;
        const goldCost = config.goldCost * currentLevel;
        const foodCost = config.foodCost * currentLevel;
        const manaCost = config.manaCost * currentLevel;

        const canAfford = 
            res.wood >= woodCost && 
            res.stone >= stoneCost && 
            res.food >= foodCost && 
            res.manaCrystal >= manaCost && 
            character.money >= goldCost;

        return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                <div className="bg-slate-900 w-full max-w-sm rounded-xl border border-slate-700 shadow-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-2 text-center">{facilityName} 증축 (Lv.{nextLevel})</h3>
                    
                    <div className="p-2.5 rounded-lg bg-indigo-950/50 border border-indigo-500/40 mb-4 flex items-center justify-between text-xs text-indigo-200">
                        <span className="flex items-center gap-1.5 font-bold">
                            <Clock size={14} className="text-indigo-400" /> 공사 소요 시간
                        </span>
                        <span className="text-amber-400 font-extrabold">{remTime.text}</span>
                    </div>

                    <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-xs">
                            <span className="text-green-400">목재</span>
                            <span className={res.wood >= woodCost ? 'text-white' : 'text-red-400'}>{woodCost} / {res.wood}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400">석재</span>
                            <span className={res.stone >= stoneCost ? 'text-white' : 'text-red-400'}>{stoneCost} / {res.stone}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-orange-400">식량</span>
                            <span className={res.food >= foodCost ? 'text-white' : 'text-red-400'}>{foodCost} / {res.food}</span>
                        </div>
                        {manaCost > 0 && (
                            <div className="flex justify-between text-xs">
                                <span className="text-purple-400">마정석</span>
                                <span className={res.manaCrystal >= manaCost ? 'text-white' : 'text-red-400'}>{manaCost} / {res.manaCrystal}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xs">
                            <span className="text-amber-400">골드</span>
                            <span className={character.money >= goldCost ? 'text-white' : 'text-red-400'}>{goldCost.toLocaleString()} / {character.money.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setUpgradingFacility(null)} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 font-bold">취소</button>
                        <button 
                            onClick={() => { 
                                if (!canAfford || !character.base) return;
                                const newChar = JSON.parse(JSON.stringify(character)) as Character;
                                const newBase = newChar.base!;
                                
                                newChar.money -= goldCost;
                                newBase.resources.wood -= woodCost;
                                newBase.resources.stone -= stoneCost;
                                newBase.resources.food -= foodCost;
                                newBase.resources.manaCrystal -= manaCost;

                                let targetInstFound = false;
                                if (newBase.layout) {
                                    newBase.layout = newBase.layout.map(inst => {
                                        const isMatch = selectedInstanceId ? inst.id === selectedInstanceId : inst.type === upgradingFacility;
                                        if (isMatch && !targetInstFound) {
                                            targetInstFound = true;
                                            return {
                                                ...inst,
                                                underConstruction: true,
                                                targetLevel: nextLevel,
                                                constructionStartDate: character.currentDate || '2000-03-02',
                                                constructionStartTime: character.currentTime || '08:00',
                                                constructionCompletionDate: completionDate,
                                                constructionCompletionTime: completionTime,
                                                totalConstructionMinutes: durationMinutes
                                            };
                                        }
                                        return inst;
                                    });
                                }

                                onUpdateCharacter(newChar, `[기지] ${facilityName} 증축 공사를 시작했습니다. (소요 시간: ${remTime.text}, 완공 예정: ${completionDate} ${completionTime})`);
                                setResultOverlay({
                                    show: true,
                                    data: {
                                        type: 'info',
                                        title: '시설 증축 공사 시작',
                                        message: `${facilityName}의 Lv.${nextLevel} 증축 공사를 시작했습니다!\n\n공사 진행 중에는 구역 맵에 실시간 남은 시간이 표시되며, 시간이 지나 완공되면 기능이 확장됩니다.`,
                                        items: [
                                            { label: '시설', after: `${facilityName} (Lv.${currentLevel} -> Lv.${nextLevel})` },
                                            { label: '공사 소요 시간', after: remTime.text },
                                            { label: '완공 예정 일시', after: `${completionDate} ${completionTime}` }
                                        ]
                                    }
                                });
                                setUpgradingFacility(null); 
                            }} 
                            disabled={!canAfford}
                            className={`flex-1 py-3 rounded font-bold transition-colors ${canAfford ? 'bg-green-700 text-white hover:bg-green-600' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                        >
                            공사 시작
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const loc = character.currentLocation || { region: "아시아", nation: "대한민국", city: "서울" };

    const groupItems = (inventory: Item[], filter: (i: Item) => boolean) => {
        const grouped: Record<string, { item: Item, count: number, indices: number[] }> = {};
        inventory.forEach((item, index) => {
            if (!filter(item)) return;
            const isStackable = ['Consumable', 'Etc', '소비', '물약', '음식', '소모품', '기타'].includes(item.type);
            if (isStackable) {
                const key = `${item.name}-${item.rarity}`;
                if (!grouped[key]) grouped[key] = { item, count: 0, indices: [] };
                grouped[key].count++;
                grouped[key].indices.push(index);
            } else {
                grouped[`${item.name}-${index}`] = { item, count: 1, indices: [index] };
            }
        });
        return Object.values(grouped);
    };
 const ResourceSellRow = ({ label, keyStr, value, icon: Icon, color, price, isShard = false }: any) => {
        const hasTradeExchange = (character.base?.facilityLevels?.['trade_exchange'] || 0) > 0 || character.base?.layout?.some(inst => inst.type === 'trade_exchange');

        const handleResourceAction = () => {
            if (hasTradeExchange) {
                setIsTradeExchangeOpen(true);
            } else {
                setResultOverlay({
                    show: true,
                    data: {
                        type: 'warning',
                        title: '물자 교류소 필요',
                        message: '기지 자원의 판매 및 구매는 [물자 교류소] 시설을 건설해야 이용할 수 있습니다.\n기지 시설 배치에서 물자 교류소를 먼저 건설해 주세요.',
                        items: [{ label: '필요 시설', after: '물자 교류소 (고유 시설)' }]
                    }
                });
            }
        };

        return (
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between group hover:border-amber-500/30 transition-all gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800 ${color} bg-opacity-10 shrink-0`}>
                        <Icon size={16} className={color} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200 truncate whitespace-nowrap">{label}</div>
                        <div className="text-[10px] text-amber-500 font-mono whitespace-nowrap">가치: {price.toLocaleString()} G</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-slate-200 text-sm whitespace-nowrap">{value.toLocaleString()}</span>
                    <button 
                        onClick={handleResourceAction}
                        className="p-1.5 bg-slate-800 hover:bg-amber-900/40 text-amber-400 rounded-lg border border-slate-700 hover:border-amber-500 transition-all active:scale-95 shrink-0"
                        title={hasTradeExchange ? "물자 교류소에서 거래하기" : "물자 교류소 필요"}
                    >
                        <ShoppingCart size={14}/>
                    </button>
                </div>
            </div>
        );
    };
    const timeOfDay = getTimeOfDay(character.currentTime);
    let bgGradientHeader = 'bg-slate-900/90';
    let bgGradientBorder = 'border-slate-800';
    let baseBorder = 'border-slate-800';

    if (timeOfDay.period === 'dawn') {
        bgGradientHeader = 'bg-gradient-to-r from-indigo-950/80 via-slate-950/95 to-slate-900/90';
        bgGradientBorder = 'border-indigo-950/80';
        baseBorder = 'border-indigo-950/60';
    } else if (timeOfDay.period === 'morning') {
        bgGradientHeader = 'bg-gradient-to-r from-cyan-950/40 via-slate-900/95 to-amber-950/10';
        bgGradientBorder = 'border-cyan-950/50';
        baseBorder = 'border-cyan-900/40';
    } else if (timeOfDay.period === 'afternoon') {
        bgGradientHeader = 'bg-gradient-to-r from-amber-950/30 via-slate-900/95 to-amber-900/10';
        bgGradientBorder = 'border-amber-950/60';
        baseBorder = 'border-amber-900/50';
    } else if (timeOfDay.period === 'sunset') {
        bgGradientHeader = 'bg-gradient-to-r from-rose-950/40 via-slate-900/95 to-orange-950/20';
        bgGradientBorder = 'border-rose-950/60';
        baseBorder = 'border-rose-950/50';
    } else if (timeOfDay.period === 'night') {
        bgGradientHeader = 'bg-gradient-to-r from-purple-950/50 via-slate-900/95 to-indigo-950/30';
        bgGradientBorder = 'border-purple-950/60';
        baseBorder = 'border-purple-950/50';
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 sm:p-4 font-sans">
            {resultOverlay.show && <ActionResultModal data={resultOverlay.data} onClose={() => setResultOverlay({ show: false, data: null, onContinue: undefined })} onContinue={resultOverlay.onContinue} />}
            
            {sellingResource && (
                <QuantityModal 
                    isOpen={!!sellingResource} 
                    title={`${sellingResource.label} 판매`}
                    itemName={sellingResource.label}
                    maxQuantity={sellingResource.max}
                    pricePerUnit={sellingResource.price}
                    onConfirm={handleSellResourceConfirm}
                    onClose={() => setSellingResource(null)}
                    actionType="sell"
                />
            )}
            <div className={`bg-slate-950 w-full max-w-4xl h-[94vh] sm:h-[86vh] rounded-xl sm:rounded-2xl border ${baseBorder} shadow-[0_0_50px_rgba(15,23,42,0.9)] flex flex-col overflow-hidden relative`}>
                <div className={`p-3 sm:p-4 border-b ${bgGradientBorder} ${bgGradientHeader} backdrop-blur-md flex justify-between items-center shrink-0`}>
                    <div className="flex items-center">
                        <div className="p-2 sm:p-2.5 bg-indigo-900/40 rounded-xl border border-indigo-500/30 mr-2.5 sm:mr-3 text-indigo-400 shadow-md">
                            <Home size={20} className="sm:w-[22px] sm:h-[22px]" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg md:text-xl font-bold text-white flex items-center gap-2">
                                개인 기지 본부 
                                <span className="text-[11px] sm:text-xs bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800/80 font-mono font-semibold">
                                    Lv.{base?.level || 0}
                                </span>
                            </h2>
                            <div className="flex items-center space-x-2 text-[11px] sm:text-xs text-slate-400 mt-0.5">
                                <span>{currentConfig?.description || "황무지"}</span>
                                {base?.location && (
                                    <span className="text-indigo-400 flex items-center border-l border-slate-700 pl-2">
                                        <MapPin size={10} className="mr-1"/> {base.location.city}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-white p-1.5 sm:p-2 rounded-xl hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700"
                        title="닫기"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex border-b border-slate-800/80 bg-slate-950 p-1 sm:p-1.5 gap-1 shrink-0 overflow-x-auto custom-scrollbar">
                    <button 
                        onClick={() => setActiveTab('overview')} 
                        className={`flex-1 min-w-[70px] py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl flex items-center justify-center transition-all ${
                            activeTab === 'overview' 
                                ? 'text-indigo-300 bg-indigo-950/70 border border-indigo-500/40 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                        }`}
                    >
                        <Info size={15} className="mr-1.5 sm:mr-2" /> 개요
                    </button>
                    <button 
                        onClick={() => setActiveTab('daily')} 
                        className={`flex-1 min-w-[70px] py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl flex items-center justify-center transition-all ${
                            activeTab === 'daily' 
                                ? 'text-indigo-300 bg-indigo-950/70 border border-indigo-500/40 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                        }`}
                    >
                        <CalendarCheck size={15} className="mr-1.5 sm:mr-2" /> 일일
                    </button>
                    <button 
                        onClick={() => setActiveTab('facilities')} 
                        className={`flex-1 min-w-[70px] py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl flex items-center justify-center transition-all ${
                            activeTab === 'facilities' 
                                ? 'text-indigo-300 bg-indigo-950/70 border border-indigo-500/40 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                        }`}
                    >
                        <Hammer size={15} className="mr-1.5 sm:mr-2" /> 시설
                    </button>
                    <button 
                        onClick={() => setActiveTab('residents')} 
                        className={`flex-1 min-w-[70px] py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl flex items-center justify-center transition-all ${
                            activeTab === 'residents' 
                                ? 'text-indigo-300 bg-indigo-950/70 border border-indigo-500/40 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                        }`}
                    >
                        <Users size={15} className="mr-1.5 sm:mr-2" /> 거주민
                    </button>
                    <button 
                        onClick={() => setActiveTab('resources')} 
                        className={`flex-1 min-w-[70px] py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl flex items-center justify-center transition-all ${
                            activeTab === 'resources' 
                                ? 'text-indigo-300 bg-indigo-950/70 border border-indigo-500/40 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                        }`}
                    >
                        <Package size={15} className="mr-1.5 sm:mr-2" /> 자원
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 bg-slate-900 custom-scrollbar relative">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {!base ? (
                                <div className="bg-slate-950 p-8 rounded-xl border border-dashed border-amber-500/50 text-center">
                                    <Home size={64} className="mx-auto text-amber-500/30 mb-4" />
                                    <h3 className="text-xl font-bold text-white mb-2">기지 부지 발견</h3>
                                    <p className="text-sm text-slate-400 mb-6">현재 위치한 {loc.city}에 기지를 건설할 수 있는 광활한 부지가 있습니다.</p>
                                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 mb-6 inline-block text-left text-xs space-y-2">
                                        <div className="flex justify-between gap-8">
                                            <span className="text-slate-500">건설 비용</span>
                                            <span className="text-amber-400 font-bold">{BASE_LEVEL_CONFIG[0].cost.toLocaleString()} G</span>
                                        </div>
                                        <div className="flex justify-between gap-8">
                                            <span className="text-slate-500">필요 레벨</span>
                                            <span className="text-green-400 font-bold">Lv.{BASE_LEVEL_CONFIG[0].requiredLevel}</span>
                                        </div>
                                        {/* [ADDED] Age Requirement Info */}
                                        <div className="flex justify-between gap-8">
                                            <span className="text-slate-500">필요 연령</span>
                                            <span className={parseInt(character.age) >= 17 ? 'text-green-400 font-bold' : 'text-red-500 font-bold'}>만 17세 이상 (현재: {character.age})</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={onPurchaseBase}
                                        disabled={character.money < BASE_LEVEL_CONFIG[0].cost || character.level < BASE_LEVEL_CONFIG[0].requiredLevel || parseInt(character.age) < 17}
                                        className="w-full py-4 bg-amber-700 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-lg shadow-lg transition-all"
                                    >
                                        기지 건설하기
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-xl border border-slate-700 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-10 opacity-5"><Home size={150} /></div>
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-lg font-bold text-indigo-400">현재 상태</h3>
                                                {onRelocate && <button onClick={onRelocate} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded border border-slate-600 flex items-center transition-colors"><Truck size={12} className="mr-1"/> 기지 이사</button>}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                                <div className="flex justify-between border-b border-slate-700/50 pb-2"><span className="text-slate-400">위치</span><span className="text-white font-mono">{base.location?.city || "알 수 없음"}</span></div>
                                                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                                                    <span className="text-slate-400">기지 레벨</span>
                                                    <span className="text-white font-mono flex items-center gap-1.5">
                                                        Lv.{base.level}
                                                        {base.underConstruction && (
                                                            <span className="text-[10px] bg-amber-950/90 border border-amber-500/70 text-amber-300 px-1.5 py-0.5 rounded font-extrabold flex items-center gap-1 animate-pulse">
                                                                <Hammer size={10} className="text-amber-400" /> Lv.{base.targetLevel || (base.level + 1)} 공사 중
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-700/50 pb-2"><span className="text-slate-400">거주 인구</span><span className="text-white font-mono">{character.inactiveCompanions?.length || 0}명</span></div>
                                                <div className="flex justify-between border-b border-slate-700/50 pb-2"><span className="text-slate-400">보유 골드</span><span className="text-amber-400 font-mono">{character.money.toLocaleString()} G</span></div>
                                                <div className="flex justify-between border-b border-slate-700/50 pb-2"><span className="text-slate-400">기지 방어력</span><span className="text-blue-400 font-mono">{calculateBaseDefense(base, character.companions.concat(character.inactiveCompanions || []))}</span></div>
                                                <div className="flex flex-col gap-1.5 border-b border-slate-700/50 pb-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-400">월간 유지비</span>
                                                        <span className="font-mono text-right flex items-center gap-1.5">
                                                            {(() => {
                                                                const bLv = base.level || 1;
                                                                const bFee = bLv * 10000;
                                                                const vFacs = (base.layout || []).filter(inst => inst && inst.type);
                                                                const fCount = vFacs.length;
                                                                const fLvSum = vFacs.reduce((sum, inst) => sum + (inst.level || 1), 0);
                                                                const fFee = fCount * 1000 * fLvSum;
                                                                const total = bFee + fFee;
                                                                const isShort = (character.money || 0) < total;
                                                                return (
                                                                    <>
                                                                        <span className={isShort ? "text-rose-400 font-bold" : "text-slate-200 font-bold"}>
                                                                            {total.toLocaleString()} G
                                                                        </span>
                                                                        {isShort && (
                                                                            <span className="text-[10px] bg-red-950/80 border border-red-500/60 text-red-300 px-1 py-0.2 rounded font-bold animate-pulse">
                                                                                골드 부족
                                                                            </span>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                        </span>
                                                    </div>

                                                    {/* 체납 상태 및 미납금 안내 */}
                                                    {((base.overdueMonths && base.overdueMonths > 0) || (base.unpaidMaintenance && base.unpaidMaintenance > 0)) && (
                                                        <div className="mt-1 p-2 bg-red-950/40 border border-red-500/50 rounded-lg text-xs space-y-1">
                                                            <div className="flex items-center justify-between font-bold">
                                                                <span className="text-red-300 flex items-center gap-1">
                                                                    <AlertTriangle size={12} className="text-red-400" />
                                                                    {base.isFacilitySuspended ? (
                                                                        <span className="text-red-400 font-black">시설 가동 중단 (체납 3단계)</span>
                                                                    ) : base.overdueMonths === 2 ? (
                                                                        <span className="text-amber-400">체납 2단계 (생산 75% 감소, 사기 하락)</span>
                                                                    ) : (
                                                                        <span className="text-amber-300">체납 1단계 (생산 50% 감소)</span>
                                                                    )}
                                                                </span>
                                                                <span className="text-red-300 font-mono">
                                                                    미납 {(base.unpaidMaintenance || 0).toLocaleString()} G
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center justify-between pt-1">
                                                                <span className="text-[10px] text-slate-400">
                                                                    {base.isFacilitySuspended ? "완납 전까지 시설 가동이 정지됩니다." : "완납 시 모든 페널티가 즉시 해제됩니다."}
                                                                </span>
                                                                {(character.money || 0) >= (base.unpaidMaintenance || 0) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const res = payOffBaseMaintenance(character);
                                                                            if (res.success) {
                                                                                onUpdateCharacter(res.updatedCharacter, res.message);
                                                                            }
                                                                        }}
                                                                        className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10px] font-bold transition-colors shadow-sm"
                                                                    >
                                                                        체납금 완납
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 즐겨찾기 시설 바로가기 숏컷 구역 */}
                                    {base && (
                                        <div className="bg-slate-950 p-5 rounded-xl border border-indigo-500/30">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-sm font-extrabold text-indigo-400 flex items-center gap-1.5">
                                                    <Star size={16} className="text-amber-400 fill-amber-400" /> 자주 가는 시설 바로가기
                                                </h3>
                                                <button
                                                    onClick={() => setIsFavSettingsOpen(true)}
                                                    className="text-[11px] bg-slate-900 hover:bg-slate-850 text-indigo-300 font-bold px-2.5 py-1 rounded-lg border border-indigo-800/40 flex items-center gap-1 transition-colors active:scale-95"
                                                >
                                                    <Star size={11} className="fill-indigo-300" /> 설정
                                                </button>
                                            </div>

                                            {/* 즐겨찾기 목록 */}
                                            {(() => {
                                                const builtTypes = (base.layout || []).map(inst => inst.type);
                                                const favoritedBuilt = favorites.filter(id => builtTypes.includes(id));

                                                if (favoritedBuilt.length === 0) {
                                                    return (
                                                        <div className="text-center py-6 text-slate-500 text-xs bg-slate-900/50 rounded-lg border border-dashed border-slate-800">
                                                            등록된 즐겨찾기 시설이 없습니다.<br/>
                                                            설정 버튼을 클릭해 자주 가는 시설을 선택해 보세요.
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                                        {favoritedBuilt.map(favId => {
                                                            const facInfo = FACILITIES_INFO.find(f => f.id === favId);
                                                            if (!facInfo) return null;
                                                            const instance = base.layout?.find(inst => inst.type === favId);
                                                            if (!instance) return null;
                                                            
                                                            const level = instance.level || 1;
                                                            const isMulti = favId === 'farm' || favId === 'mine' || favId === 'alchemy' || favId === 'cooking' || favId === 'lab' || favId === 'workshop';
                                                            const assigneeId = isMulti 
                                                                ? (base.multiAssignments?.[instance.id]?.[0]) 
                                                                : (base.assignments?.[instance.id] || base.assignments?.[favId]);
                                                            const assignee = character.inactiveCompanions?.find(c => c.id === assigneeId);

                                                            return (
                                                                <button
                                                                    key={favId}
                                                                    onClick={() => handleNavigateToFacility(favId)}
                                                                    className="p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left flex flex-col justify-between transition-all group duration-200 shadow-md relative overflow-hidden"
                                                                >
                                                                    <div className="flex justify-between items-start w-full gap-2 z-10">
                                                                        <span className="font-extrabold text-xs text-white group-hover:text-indigo-400 transition-colors truncate">
                                                                            {facInfo.name}
                                                                        </span>
                                                                        <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800/40 shrink-0">
                                                                            Lv.{level}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between mt-3 text-[10px] text-slate-400 z-10">
                                                                        <span className="truncate text-slate-400 group-hover:text-slate-300">
                                                                            {assignee ? `👤 ${assignee.name}` : '👤 배치 없음'}
                                                                        </span>
                                                                        <span className="text-[9px] text-indigo-400 group-hover:translate-x-1 transition-transform">
                                                                            바로가기 →
                                                                        </span>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {/* 즐겨찾기 설정 팝업 모달 (모바일 최적화) */}
                                    {isFavSettingsOpen && base && (
                                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                                            <div className="bg-slate-900 border border-slate-750 rounded-2xl p-5 max-w-md w-full shadow-2xl flex flex-col max-h-[85vh]">
                                                <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4 shrink-0">
                                                    <div className="flex items-center gap-2">
                                                        <Star size={18} className="text-amber-400 fill-amber-400" />
                                                        <h3 className="text-sm sm:text-base font-extrabold text-white">기지 시설 즐겨찾기 설정</h3>
                                                    </div>
                                                    <button 
                                                        onClick={() => setIsFavSettingsOpen(false)} 
                                                        className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
                                                    >
                                                        <X size={18}/>
                                                    </button>
                                                </div>
                                                <p className="text-[11px] text-slate-400 mb-4 leading-relaxed shrink-0">
                                                    자주 방문하는 시설을 즐겨찾기에 등록해 보세요. 등록한 시설은 기지 개요의 상단 숏컷 목록에 노출되어 간편하게 이동할 수 있습니다.
                                                </p>
                                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                                    {(base.layout || []).map(instance => {
                                                        const facInfo = FACILITIES_INFO.find(f => f.id === instance.type);
                                                        if (!facInfo) return null;
                                                        const isFav = favorites.includes(instance.type);

                                                        return (
                                                            <div 
                                                                key={instance.id}
                                                                className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 hover:border-slate-750 rounded-xl transition-all"
                                                            >
                                                                <div className="flex flex-col min-w-0 pr-2">
                                                                    <span className="text-xs font-bold text-white truncate">{facInfo.name}</span>
                                                                    <span className="text-[10px] text-slate-500 mt-0.5 truncate">{facInfo.desc}</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => toggleFavorite(instance.type)}
                                                                    className={`p-2 rounded-lg border transition-all shrink-0 ml-3 ${
                                                                        isFav
                                                                            ? 'bg-amber-950/40 border-amber-500/50 text-amber-400 hover:bg-amber-900/20'
                                                                            : 'bg-slate-800/60 border-slate-700 text-slate-500 hover:text-slate-300 hover:bg-slate-750'
                                                                    }`}
                                                                >
                                                                    <Star size={14} className={isFav ? "fill-amber-400" : ""} />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                    {(base.layout || []).length === 0 && (
                                                        <div className="text-center py-8 text-slate-500 text-xs">
                                                            건설된 기지 시설이 없습니다.
                                                        </div>
                                                    )}
                                                </div>
                                                <button 
                                                    onClick={() => setIsFavSettingsOpen(false)} 
                                                    className="mt-5 w-full py-2.5 bg-indigo-700 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shrink-0 active:scale-95"
                                                >
                                                    확인
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {base.underConstruction ? (
                                        <div className="bg-slate-950 p-6 rounded-xl border border-amber-500/60 shadow-lg shadow-amber-950/20">
                                            <h3 className="text-lg font-bold text-amber-400 mb-3 flex items-center">
                                                <Hammer size={20} className="mr-2 animate-bounce" /> 기지 본부 Lv.{base.targetLevel || (base.level + 1)} 증축 공사 진행 중
                                            </h3>
                                            {(() => {
                                                const rem = getConstructionRemainingTime(character.currentDate, character.currentTime, base.constructionCompletionDate, base.constructionCompletionTime);
                                                const progress = getConstructionProgress(base.totalConstructionMinutes, rem.remainingMinutes);
                                                return (
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 text-xs">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-slate-400">완공 예정 일시</span>
                                                                <span className="text-white font-mono font-bold">{base.constructionCompletionDate} {base.constructionCompletionTime}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-slate-400">완공까지 남은 시간</span>
                                                                <span className="text-amber-400 font-bold">{rem.text}</span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="flex justify-between items-center text-[11px] text-amber-300 font-bold mb-1">
                                                                <span>공사 진행률</span>
                                                                <span>{progress}%</span>
                                                            </div>
                                                            <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-amber-600/40">
                                                                <div className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-slate-400 text-center pt-1">
                                                            공사가 진행되는 동안 시간이 경과하면 자동으로 완공되며, 다른 기지 시설 및 활동을 자유롭게 이용하실 수 있습니다.
                                                        </p>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    ) : base.level < 5 && nextConfig ? (
                                        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
                                            <h3 className="text-lg font-bold text-amber-500 mb-4 flex items-center">
                                                <ArrowUpCircle size={20} className="mr-2" /> 다음 단계: {nextConfig.description} (Lv.{base.level + 1})
                                            </h3>
                                            
                                            {(() => {
                                                const resCost = BASE_UPGRADE_COSTS[base.level + 1];
                                                const res = character.base!.resources;
                                                
                                                return resCost && (
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                                        <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                                            <span className="text-xs text-slate-500 block mb-1">골드</span>
                                                            <span className={`font-bold ${character.money >= nextConfig.cost ? 'text-green-400' : 'text-red-400'}`}>{nextConfig.cost.toLocaleString()} G</span>
                                                        </div>
                                                        <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                                            <span className="text-xs text-slate-500 block mb-1">식량</span>
                                                            <span className={`font-bold ${res.food >= resCost.food ? 'text-green-400' : 'text-red-400'}`}>{resCost.food} / {res.food}</span>
                                                        </div>
                                                        <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                                            <span className="text-xs text-slate-500 block mb-1">목재</span>
                                                            <span className={`font-bold ${res.wood >= resCost.wood ? 'text-green-400' : 'text-red-400'}`}>{resCost.wood} / {res.wood}</span>
                                                        </div>
                                                        <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                                            <span className="text-xs text-slate-500 block mb-1">석재</span>
                                                            <span className={`font-bold ${res.stone >= resCost.stone ? 'text-green-400' : 'text-red-400'}`}>{resCost.stone} / {res.stone}</span>
                                                        </div>
                                                        {resCost.iron > 0 && (
                                                            <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                                                <span className="text-xs text-slate-500 block mb-1">철광석</span>
                                                                <span className={`font-bold ${res.iron >= resCost.iron ? 'text-green-400' : 'text-red-400'}`}>{resCost.iron} / {res.iron}</span>
                                                            </div>
                                                        )}
                                                        {resCost.manaCrystal > 0 && (
                                                            <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                                                <span className="text-xs text-slate-500 block mb-1">마정석</span>
                                                                <span className={`font-bold ${res.manaCrystal >= resCost.manaCrystal ? 'text-green-400' : 'text-red-400'}`}>{resCost.manaCrystal} / {res.manaCrystal}</span>
                                                            </div>
                                                        )}
                                                        <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                                            <span className="text-xs text-slate-500 block mb-1">소요 시간</span>
                                                            <span className="font-bold text-white">{resCost.time}일</span>
                                                        </div>
                                                        <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                                            <span className="text-xs text-slate-500 block mb-1">필요 레벨</span>
                                                            <span className={`font-bold ${character.level >= nextConfig.requiredLevel ? 'text-green-400' : 'text-red-400'}`}>Lv.{nextConfig.requiredLevel}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                            
                                            <button 
                                                onClick={handleBaseUpgrade} 
                                                disabled={
                                                    character.money < nextConfig.cost || 
                                                    character.level < nextConfig.requiredLevel ||
                                                    (BASE_UPGRADE_COSTS[base.level + 1] && (
                                                        character.base!.resources.food < BASE_UPGRADE_COSTS[base.level + 1].food ||
                                                        character.base!.resources.wood < BASE_UPGRADE_COSTS[base.level + 1].wood ||
                                                        character.base!.resources.stone < BASE_UPGRADE_COSTS[base.level + 1].stone ||
                                                        character.base!.resources.iron < BASE_UPGRADE_COSTS[base.level + 1].iron ||
                                                        character.base!.resources.manaCrystal < BASE_UPGRADE_COSTS[base.level + 1].manaCrystal
                                                    ))
                                                } 
                                                className="w-full py-4 bg-amber-700 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-lg transition-all shadow-lg flex items-center justify-center"
                                            >
                                                기지 업그레이드
                                            </button>
                                        </div>
                                    ) : null}

                                    {base.level >= 5 && (base.gridSize || 3) < 10 && (
                                        <div className="bg-slate-950 p-6 rounded-xl border border-indigo-500/30">
                                            {base.gridExpansionUnderConstruction ? (
                                                <>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h3 className="text-lg font-bold text-amber-300 flex items-center gap-2">
                                                            <Hammer className="text-amber-400 animate-bounce" size={20} />
                                                            기지 부지 확장 공사 진행 중 ({base.gridSize || 7}x{base.gridSize || 7} → {base.targetGridSize || 8}x{base.targetGridSize || 8})
                                                        </h3>
                                                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-950 border border-amber-600 text-amber-300 animate-pulse">
                                                            공사 진행 중
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                                                        현재 기지 외곽의 암석을 발파하고 지반을 평탄화하는 대규모 부지 확장 공사가 진행 중입니다.<br />
                                                        공사가 완료되면 기지 배치 구역이 <strong className="text-amber-300 font-mono">{base.targetGridSize}x{base.targetGridSize}</strong> 크기로 확장됩니다.
                                                    </p>
                                                    {(() => {
                                                        const rem = getConstructionRemainingTime(character.currentDate, character.currentTime, base.gridExpansionCompletionDate, base.gridExpansionCompletionTime);
                                                        const progress = getConstructionProgress(base.gridExpansionTotalMinutes, rem.remainingMinutes);
                                                        return (
                                                            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
                                                                <div className="flex justify-between items-center text-xs">
                                                                    <span className="text-slate-400">공사 진행률</span>
                                                                    <span className="font-bold font-mono text-amber-400">{progress}%</span>
                                                                </div>
                                                                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                                                                    <div className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                                                                    <div className="flex justify-between text-slate-400">
                                                                        <span>완공 예정 일시</span>
                                                                        <span className="text-slate-200 font-bold font-mono">{base.gridExpansionCompletionDate} {base.gridExpansionCompletionTime}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-slate-400">
                                                                        <span>남은 시간</span>
                                                                        <span className="text-emerald-400 font-bold font-mono">{rem.text}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </>
                                            ) : (
                                                <>
                                                    <h3 className="text-lg font-bold text-indigo-400 mb-4 flex items-center">
                                                        <TrendingUp size={20} className="mr-2" /> 기지 부지 확장 ({(base.gridSize || 3)}x{(base.gridSize || 3)} → {(base.gridSize || 3) < 7 ? 7 : (base.gridSize || 3) + 1}x{(base.gridSize || 3) < 7 ? 7 : (base.gridSize || 3) + 1})
                                                    </h3>
                                                    {(() => {
                                                        const currentSize = base.gridSize || 3;
                                                        const nextSize = currentSize < 7 ? 7 : currentSize + 1;
                                                        const cost = currentSize < 7 ? { gold: 0, food: 0, wood: 0, stone: 0, iron: 0, manaCrystal: 0 } : BASE_GRID_EXPANSION_COSTS[nextSize];
                                                        const durationMin = getBaseGridExpansionDuration(nextSize);
                                                        const durationDays = Math.floor(durationMin / 1440);
                                                        const res = character.base!.resources;
                                                        if (!cost) return null;
                                                        return (
                                                            <>
                                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                                                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                                                        <span className="text-xs text-slate-500 block mb-1">골드</span>
                                                                        <span className={`font-bold ${character.money >= cost.gold ? 'text-green-400' : 'text-red-400'}`}>{cost.gold.toLocaleString()} G</span>
                                                                    </div>
                                                                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                                                        <span className="text-xs text-slate-500 block mb-1">식량</span>
                                                                        <span className={`font-bold ${res.food >= cost.food ? 'text-green-400' : 'text-red-400'}`}>{cost.food} / {res.food}</span>
                                                                    </div>
                                                                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                                                        <span className="text-xs text-slate-500 block mb-1">목재</span>
                                                                        <span className={`font-bold ${res.wood >= cost.wood ? 'text-green-400' : 'text-red-400'}`}>{cost.wood} / {res.wood}</span>
                                                                    </div>
                                                                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                                                        <span className="text-xs text-slate-500 block mb-1">석재</span>
                                                                        <span className={`font-bold ${res.stone >= cost.stone ? 'text-green-400' : 'text-red-400'}`}>{cost.stone} / {res.stone}</span>
                                                                    </div>
                                                                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                                                        <span className="text-xs text-slate-500 block mb-1">철광석</span>
                                                                        <span className={`font-bold ${res.iron >= cost.iron ? 'text-green-400' : 'text-red-400'}`}>{cost.iron} / {res.iron}</span>
                                                                    </div>
                                                                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                                                        <span className="text-xs text-slate-500 block mb-1">마정석</span>
                                                                        <span className={`font-bold ${res.manaCrystal >= cost.manaCrystal ? 'text-green-400' : 'text-red-400'}`}>{cost.manaCrystal} / {res.manaCrystal}</span>
                                                                    </div>
                                                                    {currentSize >= 7 && (
                                                                        <div className="bg-slate-900 p-3 rounded border border-slate-800 col-span-2 md:col-span-3">
                                                                            <span className="text-xs text-slate-500 block mb-1">공사 소요 시간</span>
                                                                            <span className="font-bold text-amber-300">{durationDays}일 ({durationMin / 60}시간)</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <button 
                                                                    onClick={onExpandGrid}
                                                                    disabled={
                                                                        character.money < cost.gold ||
                                                                        res.food < cost.food ||
                                                                        res.wood < cost.wood ||
                                                                        res.stone < cost.stone ||
                                                                        res.iron < cost.iron ||
                                                                        res.manaCrystal < cost.manaCrystal
                                                                    }
                                                                    className="w-full py-4 bg-indigo-700 hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-lg transition-all shadow-lg flex items-center justify-center"
                                                                >
                                                                    {(base.gridSize || 3) < 7 ? '7x7 크기로 무료 복구하기' : '부지 확장 공사 시작'}
                                                                </button>
                                                            </>
                                                        );
                                                    })()}
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {base.level >= 5 && (base.gridSize || 3) >= 10 && (
                                        <div className="p-10 text-center text-slate-500 bg-slate-950/50 rounded-xl border border-slate-800 border-dashed">
                                            <span className="block text-lg font-bold mb-2">최고 레벨 도달</span>
                                            <p>더 이상 업그레이드할 수 없습니다.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                    {activeTab === 'daily' && (
                        <div className="space-y-6">
                            {base && (
                                <DailyFacilityHomework
                                    character={character}
                                    base={base}
                                    onNavigateToFacility={handleNavigateToFacility}
                                />
                            )}
                        </div>
                    )}
                    {activeTab === 'facilities' && (
                        <div className="space-y-6">
                            {renderBaseGrid()}
                            
                            <div className="border-t border-slate-800 pt-6">
                                <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center">
                                    <Info size={16} className="mr-2 text-indigo-400"/> 시설 관리 목록
                                </h3>
                                {assigningInstanceId && (
                                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                                        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-sm w-full">
                                            <h3 className="font-bold text-amber-500 mb-4">
                                                담당자 배치 ({FACILITIES_INFO.find(f => f.id === (character.base?.layout?.find(inst => inst.id === assigningInstanceId)?.type))?.name})
                                            </h3>
                                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                                <button 
                                                    onClick={() => { onAssignCompanion("", assigningInstanceId); setAssigningInstanceId(null); }} 
                                                    className="w-full p-2 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 rounded text-sm mb-2"
                                                >
                                                    [배치 해제]
                                                </button>
                                                {character.inactiveCompanions?.filter(c => {
                                                    const alreadyAssignedToThis = assigningInstanceId ? (
                                                        base?.multiAssignments?.[assigningInstanceId]?.includes(c.id) || 
                                                        base?.assignments?.[assigningInstanceId] === c.id
                                                    ) : false;
                                                    return !isCompanionDispatched(c.id) || alreadyAssignedToThis;
                                                }).map((c, i) => {
                                                    const instType = assigningInstanceId ? character.base?.layout?.find(inst => inst.id === assigningInstanceId)?.type : null;
                                                    const isTrainingFacility = instType === 'training_exp' || instType === 'training_stat' || instType === 'training_mastery' || instType === 'training_style' || instType === 'tactical_training' || instType === 'combat_training';
                                                    const isHouseChef = !!character.base?.houses?.some(h => h.assignedChefId === c.id);
                                                    const isChefLockedByHousing = instType === 'cooking' && isHouseChef;
                                                    const isJobMismatch = !!(assigningInstanceId && (
                                                        (instType === 'farm' && c.job !== JobType.FARMER && c.job !== JobType.SLAVE && (c.job as string) !== '노예') || 
                                                        (instType === 'mine' && c.job !== JobType.MINER && c.job !== JobType.SLAVE && (c.job as string) !== '노예') ||
                                                        (instType === 'alchemy' && c.job !== JobType.ALCHEMIST) ||
                                                        (instType === 'cooking' && c.job !== JobType.CHEF) ||
                                                        ((instType === 'monster_farm' || instType === 'monster_arena') && c.job !== JobType.BREEDER) ||
                                                        (instType === 'lab' && c.job !== JobType.RESEARCHER) ||
                                                        (instType === 'workshop' && c.job !== JobType.BLACKSMITH) ||
                                                        (isTrainingFacility && c.job !== JobType.TRAINER)
                                                    ));
                                                    const isLocked = isJobMismatch || isChefLockedByHousing;
                                                    const isAlreadyAssigned = assigningInstanceId ? (
                                                        base?.multiAssignments?.[assigningInstanceId]?.includes(c.id) || 
                                                        base?.assignments?.[assigningInstanceId] === c.id
                                                    ) : false;
                                                    
                                                    return (
                                                        <button 
                                                            key={i} 
                                                            disabled={isLocked}
                                                            onClick={() => { onAssignCompanion(c.id, assigningInstanceId!); setAssigningInstanceId(null); }} 
                                                            className={`w-full p-2 rounded text-left flex justify-between items-center group mb-1 ${isLocked ? 'bg-slate-900/50 text-slate-600 cursor-not-allowed grayscale' : isAlreadyAssigned ? 'bg-indigo-900/40 border border-indigo-500 text-indigo-200' : 'bg-slate-950 hover:bg-indigo-900/50 border border-slate-800 hover:border-indigo-500 text-slate-200 group-hover:text-indigo-300'}`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span>{c.name} {isChefLockedByHousing ? (
                                                                    <span className="text-[10px] text-amber-400 font-bold ml-1">
                                                                        (숙소 요리사 배정 중)
                                                                    </span>
                                                                ) : isLocked ? (
                                                                    <span className="text-[10px] text-red-500 ml-1">
                                                                        ({instType === 'farm' ? '농부/노예' : instType === 'mine' ? '광부/노예' : instType === 'alchemy' ? '연금술사' : instType === 'cooking' ? '요리사' : (instType === 'monster_farm' || instType === 'monster_arena') ? '사육사' : instType === 'lab' ? '연구원' : instType === 'workshop' ? '대장장이' : isTrainingFacility ? '트레이너' : '해당 직업'}만 가능)
                                                                    </span>
                                                                ) : null}</span>
                                                                {isAlreadyAssigned && <span className="text-[9px] bg-indigo-600 text-white px-1 py-0.5 rounded">배치됨</span>}
                                                            </div>
                                                            <span className="text-xs text-slate-500">Lv.{c.level}</span>
                                                        </button>
                                                    );
                                                })}
                                                {(!character.inactiveCompanions || character.inactiveCompanions.filter(c => !isCompanionDispatched(c.id)).length === 0) && (
                                                    <p className="text-xs text-slate-500 text-center">배치 가능한 거주민이 없습니다.</p>
                                                )}
                                            </div>
                                            <button onClick={() => setAssigningInstanceId(null)} className="mt-4 w-full py-2 bg-slate-800 text-slate-400 rounded">취소</button>
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                    {(character.base?.layout || []).map((instance, idx) => { 
                                        const facility = FACILITIES_INFO.find(f => f.id === instance.type);
                                        if (!facility) return null;
                                        
                                        const sameTypeInstances = (character.base?.layout || []).filter(inst => inst.type === instance.type);
                                        const typeIndex = sameTypeInstances.findIndex(inst => inst.id === instance.id);
                                        
                                        const isUnlocked = (base?.level || 0) >= facility.minLevel; 
                                        const isMulti = facility.id === 'farm' || facility.id === 'mine' || facility.id === 'alchemy' || facility.id === 'cooking' || facility.id === 'lab' || facility.id === 'workshop';
                                        const assignedIds = isMulti 
                                            ? (base?.multiAssignments?.[instance.id] || [])
                                            : (base?.assignments?.[instance.id] ? [base?.assignments?.[instance.id] as string] : []);
                                        const assignedComps = (character.inactiveCompanions || []).filter(c => assignedIds.includes(c.id));
                                        const mainAssignee = assignedComps.length > 0 ? assignedComps[0] : undefined;
                                        const facilityLevel = instance.level || 1; 
                                        
                                        return (
                                            <div key={instance.id} className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${isUnlocked ? 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md' : 'bg-slate-950 border-slate-900 opacity-60'}`}>
                                                <div className="flex flex-col flex-1 w-full min-w-0">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center min-w-0">
                                                            <div className={`p-2 rounded-lg mr-2 shrink-0 ${isUnlocked ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/40' : 'bg-slate-950 text-slate-600'}`}>
                                                                {isUnlocked ? <Briefcase size={15}/> : <Lock size={15}/>}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h4 className={`font-extrabold text-xs sm:text-sm flex items-center flex-wrap gap-1 ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>
                                                                    <span className="truncate">{facility.name} {!facility.isUnique && (typeIndex + 1)}</span>
                                                                    {isUnlocked && (
                                                                        instance.underConstruction ? (
                                                                            <span className="text-[9px] bg-amber-950/90 border border-amber-500/70 px-1.5 py-0.5 rounded text-amber-300 font-extrabold flex items-center gap-1 animate-pulse shrink-0">
                                                                                <Hammer size={10} className="text-amber-400" /> 공사 중 (Lv.{instance.targetLevel || 1} 목표)
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-amber-400 font-mono shrink-0">Lv.{facilityLevel}</span>
                                                                        )
                                                                    )}
                                                                </h4>
                                                            </div>
                                                        </div>
                                                        {isUnlocked && (
                                                            <button 
                                                                onClick={() => handleRemoveFacility(instance.id)}
                                                                className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded transition-all shrink-0"
                                                                title="시설 폐쇄"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 mb-2 leading-relaxed min-h-[30px] line-clamp-2">{facility.desc}</p>
                                                    
                                                    {isUnlocked && (
                                                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-850 text-[10px] space-y-1 my-2">
                                                            {getFacilityBonusText(facility.id, mainAssignee, assignedComps)}
                                                        </div>
                                                    )}

                                                    {isUnlocked && instance.underConstruction && (() => {
                                                        const rem = getConstructionRemainingTime(character.currentDate, character.currentTime, instance.constructionCompletionDate, instance.constructionCompletionTime);
                                                        const progress = getConstructionProgress(instance.totalConstructionMinutes, rem.remainingMinutes);
                                                        return (
                                                            <div className="bg-amber-950/30 border border-amber-600/40 rounded-lg p-2 my-1.5">
                                                                <div className="flex justify-between items-center text-[10px] text-amber-300 font-bold mb-1">
                                                                    <span>공사 진행률 ({progress}%)</span>
                                                                    <span>남은 시간: {rem.text}</span>
                                                                </div>
                                                                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                                                    <div className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                {isUnlocked && (
                                                    <div className="space-y-2 mt-auto border-t border-slate-850 pt-3">
                                                        {/* 담당자 배정 위젯 */}
                                                        <div className="flex items-center justify-between bg-slate-950/60 p-1.5 rounded-lg border border-slate-850">
                                                            <div className="text-[10px] flex flex-col min-w-0 mr-2">
                                                                <span className="text-slate-500 uppercase text-[8px] font-bold">{isMulti ? '배치인원' : '담당자'}</span>
                                                                <span className={`font-extrabold truncate max-w-[90px] text-[10px] sm:text-xs ${assignedComps.length > 0 ? 'text-indigo-400' : 'text-slate-600'}`}>
                                                                    {assignedComps.length > 0 
                                                                        ? (isMulti ? `${assignedComps.length}명 배치` : assignedComps[0].name) 
                                                                        : "미배치"}
                                                                </span>
                                                            </div>
                                                            {instance.underConstruction ? (
                                                                <span className="px-2 py-1 bg-amber-950/80 text-amber-400 border border-amber-800/80 rounded text-[10px] font-bold shrink-0 flex items-center gap-1">
                                                                    <Hammer size={10} className="animate-bounce" /> 공사 중
                                                                </span>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => setAssigningInstanceId(instance.id)} 
                                                                    className="px-2 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-900 rounded text-[10px] transition-colors font-bold shrink-0"
                                                                >
                                                                    {assignedComps.length > 0 ? (isMulti ? "추가" : "변경") : "배치"}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {isMulti && assignedComps.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 max-h-[40px] overflow-y-auto custom-scrollbar">
                                                                {assignedComps.map(c => (
                                                                    <div key={c.id} className="flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850 text-[9px] text-slate-400">
                                                                        <span className="truncate max-w-[50px]">{c.name}</span>
                                                                        <button 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onAssignCompanion(c.id, instance.id); 
                                                                            }}
                                                                            className="text-red-500 hover:text-red-400 font-bold ml-1 shrink-0"
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-2 pt-1">
                                                            {instance.underConstruction ? (
                                                                <button 
                                                                    onClick={() => {
                                                                        const rem = getConstructionRemainingTime(character.currentDate, character.currentTime, instance.constructionCompletionDate, instance.constructionCompletionTime);
                                                                        const progress = getConstructionProgress(instance.totalConstructionMinutes, rem.remainingMinutes);
                                                                        setResultOverlay({
                                                                            show: true,
                                                                            data: {
                                                                                type: 'info',
                                                                                title: `${facility.name} 공사 진행 중`,
                                                                                message: `현재 시설 공사가 한창 진행되고 있습니다!\n\n완공 예정 일시: ${instance.constructionCompletionDate} ${instance.constructionCompletionTime}\n남은 시간: ${rem.text}`,
                                                                                items: [
                                                                                    { label: '목표 레벨', after: `Lv.${instance.targetLevel || 1}` },
                                                                                    { label: '공사 진행률', after: `${progress}%` },
                                                                                    { label: '남은 시간', after: rem.text }
                                                                                ]
                                                                            }
                                                                        });
                                                                    }}
                                                                    className="flex-1 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/60 text-amber-300 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center active:scale-95 shadow-md shadow-amber-950/40"
                                                                >
                                                                    <Hammer size={12} className="mr-1 animate-bounce"/> 공사 진행 중
                                                                </button>
                                                            ) : facilityLevel < (FACILITY_UPGRADE_CONFIG[facility.id]?.maxLevel || 5) && (
                                                                <button 
                                                                    onClick={() => {
                                                                        setSelectedInstanceId(instance.id);
                                                                        setUpgradingFacility(facility.id);
                                                                    }}
                                                                    className="flex-1 py-1.5 bg-green-750 hover:bg-green-650 text-white rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center active:scale-95 shadow-md shadow-green-950/30"
                                                                >
                                                                    <ArrowUpCircle size={12} className="mr-1"/> 레벨업
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => {
                                                                    if (facility.id === 'training' || facility.id.startsWith('training_')) {
                                                                        const tab = facility.id === 'training_stat' ? 'stat' : facility.id === 'training_mastery' ? 'mastery' : 'exp';
                                                                        onFacilitySpecificAction(facility.id, 'open_modal');
                                                                    } else {
                                                                        setSelectedFacility(facility.id);
                                                                        setSelectedInstanceId(instance.id);
                                                                    }
                                                                }} 
                                                                className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-indigo-100 rounded-lg text-[10px] sm:text-xs font-bold transition-colors flex items-center justify-center active:scale-95 shadow-md shadow-indigo-950/30"
                                                            >
                                                                <Play size={10} className="mr-1 fill-indigo-100"/> 이용하기
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ); 
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'residents' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                             <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 flex flex-col h-full">
                                 <h3 className="text-sm font-bold text-amber-500 mb-3 uppercase flex items-center justify-between">
                                     <span>현재 파티</span>
                                     <span className="text-xs text-slate-500">{character.companions.length}명</span>
                                 </h3>
                                 <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                     {character.companions.map((comp, idx) => (
                                         <div key={idx} className="bg-slate-900 p-3 rounded border border-slate-700 flex justify-between items-center group hover:border-amber-500/50 transition-colors">
                                             <div>
                                                 <div className="font-bold text-slate-200 text-sm flex items-center">
                                                     {comp.name}
                                                     {comp.isMonster && <Dog size={12} className="ml-1 text-amber-500" />}
                                                 </div>
                                                 <div className="text-xs text-slate-500">Lv.{comp.level} {comp.classType}</div>
                                             </div>
                                             <button 
                                                 onClick={() => onMoveCompanionToBase(idx)} 
                                                 className="p-2 bg-slate-800 hover:bg-indigo-900/50 text-slate-400 hover:text-indigo-300 rounded border border-slate-600 hover:border-indigo-500 transition-all text-xs flex items-center"
                                             >
                                                 {comp.isMonster ? (
                                                     <><Dog size={14} className="mr-1"/> 사육소로 복귀</>
                                                 ) : (
                                                     <><Home size={14} className="mr-1"/> 입주</>
                                                 )}
                                             </button>
                                         </div>
                                     ))}
                                     {character.companions.length === 0 && <p className="text-xs text-slate-600 text-center py-4">파티원이 없습니다.</p>}
                                 </div></div>
                             <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 flex flex-col h-full">
                                 <div className="flex justify-between items-center mb-3">
                                     <h3 className="text-sm font-bold text-indigo-500 uppercase flex items-center">
                                         <span>기지 거주민 & 사육소</span>
                                         <span className="ml-2 text-xs text-slate-500">{(character.inactiveCompanions?.length || 0) + (character.base?.capturedMonsters?.filter(m => m.stage !== MonsterStage.EGG).length || 0)}명</span>
                                     </h3>
                                     <button 
                                         onClick={handleUnassignAll}
                                         className="px-2 py-1 bg-red-900/30 hover:bg-red-800/40 text-red-500 hover:text-red-400 text-[10px] font-bold rounded border border-red-900/50 transition-all flex items-center gap-1"
                                     >
                                         <Briefcase size={10} /> 전체 업무 해제
                                     </button>
                                 </div>

                                 {/* 거주민 및 사육소 검색, 필터, 정렬 바 */}
                                 <div className="space-y-2 mb-3 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 shrink-0">
                                     <div className="flex flex-col sm:flex-row items-center gap-2">
                                         <input
                                             type="text"
                                             value={residentSearchQuery}
                                             onChange={(e) => setResidentSearchQuery(e.target.value)}
                                             placeholder="거주민, 몬스터, 직업 검색..."
                                             className="flex-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                                         />
                                         <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                                             <span className="text-[11px] text-slate-400 font-bold shrink-0">정렬:</span>
                                             <select
                                                 value={residentSortOption}
                                                 onChange={(e) => setResidentSortOption(e.target.value as any)}
                                                 className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                             >
                                                 <option value="name">이름순</option>
                                                 <option value="custom">커스텀순</option>
                                                 <option value="level">레벨순</option>
                                                 <option value="affection">호감도순</option>
                                                 <option value="cp">전투력순</option>
                                             </select>
                                         </div>
                                     </div>

                                     <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pt-0.5">
                                         <button
                                             onClick={() => setResidentTypeFilter('all')}
                                             className={`px-2 py-0.5 text-[11px] rounded-md font-bold transition-all shrink-0 ${
                                                 residentTypeFilter === 'all'
                                                     ? 'bg-indigo-600 text-white shadow'
                                                     : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                                             }`}
                                         >
                                             전체 ({(character.inactiveCompanions?.length || 0) + (character.base?.capturedMonsters?.filter(m => m.stage !== MonsterStage.EGG).length || 0)})
                                         </button>
                                         <button
                                             onClick={() => setResidentTypeFilter('human')}
                                             className={`px-2 py-0.5 text-[11px] rounded-md font-bold transition-all shrink-0 ${
                                                 residentTypeFilter === 'human'
                                                     ? 'bg-indigo-600 text-white shadow'
                                                     : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                                             }`}
                                         >
                                             거주민 ({(character.inactiveCompanions?.filter(c => !c.isMonster && !c.isCustomMonster && c.race !== '몬스터').length || 0)})
                                         </button>
                                         <button
                                             onClick={() => setResidentTypeFilter('monster')}
                                             className={`px-2 py-0.5 text-[11px] rounded-md font-bold transition-all shrink-0 ${
                                                 residentTypeFilter === 'monster'
                                                     ? 'bg-indigo-600 text-white shadow'
                                                     : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                                             }`}
                                         >
                                             몬스터 ({(character.inactiveCompanions?.filter(c => c.isMonster || c.isCustomMonster || c.race === '몬스터').length || 0) + (character.base?.capturedMonsters?.filter(m => m.stage !== MonsterStage.EGG).length || 0)})
                                         </button>
                                         <button
                                             onClick={() => setResidentTypeFilter('custom')}
                                             className={`px-2 py-0.5 text-[11px] rounded-md font-bold transition-all shrink-0 ${
                                                 residentTypeFilter === 'custom'
                                                     ? 'bg-indigo-600 text-white shadow'
                                                     : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                                             }`}
                                         >
                                             커스텀 ({(character.inactiveCompanions?.filter(c => c.isCustom).length || 0)})
                                         </button>
                                     </div>
                                 </div>

                                 <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                      {(() => {
                                          const displayInactiveCompanions = (character.inactiveCompanions || [])
                                              .map((comp, originalIdx) => ({ comp, originalIdx }))
                                              .filter(({ comp }) => {
                                                  if (residentTypeFilter === 'monster' && !comp.isMonster && !comp.isCustomMonster && comp.race !== '몬스터') return false;
                                                  if (residentTypeFilter === 'human' && (comp.isMonster || comp.isCustomMonster || comp.race === '몬스터')) return false;
                                                  if (residentTypeFilter === 'custom' && !comp.isCustom) return false;

                                                  if (residentSearchQuery.trim()) {
                                                      const query = residentSearchQuery.toLowerCase().trim();
                                                      const matchName = comp.name.toLowerCase().includes(query);
                                                      const matchClass = (comp.classType || '').toLowerCase().includes(query);
                                                      const matchJob = (comp.job || '').toLowerCase().includes(query);
                                                      if (!matchName && !matchClass && !matchJob) return false;
                                                  }
                                                  return true;
                                              })
                                              .sort((a, b) => {
                                                  if (residentSortOption === 'name') return a.comp.name.localeCompare(b.comp.name, 'ko');
                                                  if (residentSortOption === 'custom') {
                                                      if (Boolean(a.comp.isCustom) !== Boolean(b.comp.isCustom)) return b.comp.isCustom ? 1 : -1;
                                                      return a.comp.name.localeCompare(b.comp.name, 'ko');
                                                  }
                                                  if (residentSortOption === 'level') return b.comp.level - a.comp.level;
                                                  if (residentSortOption === 'affection') return (b.comp.affection || 0) - (a.comp.affection || 0);
                                                  if (residentSortOption === 'cp') return getCompanionCP(b.comp) - getCompanionCP(a.comp);
                                                  return 0;
                                              });

                                          const displayCapturedMonsters = (character.base?.capturedMonsters || [])
                                              .filter(m => m.stage !== MonsterStage.EGG)
                                              .filter(monster => {
                                                  if (residentTypeFilter === 'human' || residentTypeFilter === 'custom') return false;

                                                  if (residentSearchQuery.trim()) {
                                                      const query = residentSearchQuery.toLowerCase().trim();
                                                      const mName = (monster.nickname || monster.name).toLowerCase();
                                                      const mStage = (monster.stage || '').toLowerCase();
                                                      const mRank = (monster.rank || '').toLowerCase();
                                                      if (!mName.includes(query) && !mStage.includes(query) && !mRank.includes(query)) return false;
                                                  }
                                                  return true;
                                              })
                                              .sort((a, b) => {
                                                  if (residentSortOption === 'name') {
                                                      return (a.nickname || a.name).localeCompare(b.nickname || b.name, 'ko');
                                                  }
                                                  if (residentSortOption === 'custom') {
                                                      if (Boolean(a.isCustomMonster) !== Boolean(b.isCustomMonster)) return b.isCustomMonster ? 1 : -1;
                                                      return (a.nickname || a.name).localeCompare(b.nickname || b.name, 'ko');
                                                  }
                                                  if (residentSortOption === 'level') return b.level - a.level;
                                                  if (residentSortOption === 'affection') return (b.affection || 0) - (a.affection || 0);
                                                  if (residentSortOption === 'cp') return b.level - a.level;
                                                  return 0;
                                              });

                                          const hasNoItems = displayInactiveCompanions.length === 0 && displayCapturedMonsters.length === 0;

                                          return (
                                              <>
                                                  {displayInactiveCompanions.map(({ comp, originalIdx }) => {
                                                      const routine = getCompanionRoutine(character, comp.id);
                                                      const isSleeping = !routine.canJoin;
                                                      const busy = isCompanionDispatched(comp.id);
                                                      const dutySummary = getResidentDutySummary(character, comp.id);
                                                      const hasFacilityOrHouseDuty = dutySummary.facilityAssignments.length > 0 || dutySummary.houseDuties.length > 0;
                                                      const isMonsterComp = Boolean(comp.isMonster || comp.isCustomMonster || comp.race === '몬스터');

                                                      return (
                                                          <div
                                                              key={`inactive-${comp.id || originalIdx}`}
                                                              className={`bg-slate-900 p-3 rounded-xl border flex flex-col gap-2.5 group transition-all ${
                                                                  dutySummary.facilityAssignments.length > 0
                                                                      ? 'border-indigo-500/40 bg-slate-900/95'
                                                                      : busy
                                                                      ? 'border-amber-700/40 bg-slate-900/90'
                                                                      : 'border-slate-700 hover:border-indigo-500/50'
                                                              }`}
                                                          >
                                                              <div className="w-full space-y-1.5">
                                                                  <div className="flex items-center flex-wrap gap-1.5">
                                                                      <span className="font-extrabold text-slate-100 text-sm flex items-center">
                                                                          {comp.name}
                                                                          {comp.isMonster && <Dog size={12} className="ml-1 text-amber-500" />}
                                                                      </span>
                                                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono whitespace-nowrap">
                                                                          Lv.{comp.level} {comp.classType}
                                                                      </span>
                                                                      {!isMonsterComp && (
                                                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-bold whitespace-nowrap">
                                                                              직업: {comp.job || '모험가'}
                                                                          </span>
                                                                      )}
                                                                  </div>

                                                                  {/* 현재 배정된 업무 상세 표시 */}
                                                                  <div className="flex flex-wrap items-center gap-1.5">
                                                                      {dutySummary.facilityAssignments.map(fac => (
                                                                          <span
                                                                              key={fac.instanceId}
                                                                              className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-950/90 text-emerald-300 border border-emerald-600/50 whitespace-nowrap"
                                                                          >
                                                                              <Briefcase size={11} className="text-emerald-400 shrink-0" />
                                                                              {fac.displayName} (Lv.{fac.level}) 담당
                                                                          </span>
                                                                      ))}
                                                                      {dutySummary.houseDuties.map(hd => (
                                                                          <span
                                                                              key={`${hd.houseId}_${hd.role}`}
                                                                              className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-amber-950/90 text-amber-300 border border-amber-600/50 whitespace-nowrap"
                                                                          >
                                                                              <Home size={11} className="text-amber-400 shrink-0" />
                                                                              {hd.label}
                                                                          </span>
                                                                      ))}
                                                                      {dutySummary.dispatchDuties.map((dd, i) => (
                                                                          <span
                                                                              key={`disp-${i}`}
                                                                              className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-purple-950/90 text-purple-300 border border-purple-600/50 whitespace-nowrap"
                                                                          >
                                                                              <Truck size={11} className="text-purple-400 shrink-0" />
                                                                              {dd}
                                                                          </span>
                                                                      ))}
                                                                      {dutySummary.trainingDuties.map((td, i) => (
                                                                          <span
                                                                              key={`train-${i}`}
                                                                              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 whitespace-nowrap"
                                                                          >
                                                                              {td}
                                                                          </span>
                                                                      ))}
                                                                      {!dutySummary.isBusyWithWork && dutySummary.trainingDuties.length === 0 && (
                                                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-950 text-slate-500 border border-slate-800 whitespace-nowrap">
                                                                              대기 중 (미배치)
                                                                          </span>
                                                                      )}
                                                                  </div>
                                                              </div>

                                                              {/* 우측/하단 액션 버튼 그룹 (모바일 최적화) */}
                                                              <div className="flex items-center gap-1.5 shrink-0 pt-2 border-t border-slate-800/80 justify-end w-full">
                                                                  {!isMonsterComp && (
                                                                      <>
                                                                          <button
                                                                              onClick={() => setAssigningResidentId(comp.id)}
                                                                              disabled={!dutySummary.canAssignToFacility}
                                                                              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all active:scale-95 ${
                                                                                  !dutySummary.canAssignToFacility
                                                                                      ? 'bg-slate-950 text-slate-700 border-slate-900 cursor-not-allowed'
                                                                                      : dutySummary.facilityAssignments.length > 0
                                                                                      ? 'bg-indigo-950/90 hover:bg-indigo-900 text-indigo-200 border-indigo-600/60'
                                                                                      : 'bg-indigo-700 hover:bg-indigo-600 text-white border-indigo-500/60 shadow-sm'
                                                                              }`}
                                                                              title={!dutySummary.canAssignToFacility ? "외부 파견 중에는 시설 배치를 변경할 수 없습니다." : "시설 담당자 배치 및 변경"}
                                                                          >
                                                                              <Briefcase size={12} />
                                                                              {dutySummary.facilityAssignments.length > 0 ? '시설 변경' : '시설 배치'}
                                                                          </button>

                                                                          {hasFacilityOrHouseDuty && (
                                                                              <button
                                                                                  onClick={() => handleQuickUnassignResident(comp.id)}
                                                                                  className="px-2.5 py-1.5 rounded-lg border bg-red-950/80 hover:bg-red-900 text-red-200 border-red-700/60 text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
                                                                                  title="배정된 업무 즉시 해제"
                                                                              >
                                                                                  <X size={12} /> 배치 해제
                                                                              </button>
                                                                          )}
                                                                      </>
                                                                  )}

                                                                  <button
                                                                      onClick={() => handleRecallCheck(originalIdx)}
                                                                      disabled={busy || isSleeping}
                                                                      className={`px-2.5 py-1.5 rounded-lg border transition-all text-xs font-bold flex items-center ${
                                                                          busy || isSleeping
                                                                              ? 'bg-slate-950 text-slate-700 border-slate-900 cursor-not-allowed'
                                                                              : 'bg-slate-800 hover:bg-amber-900/50 text-slate-300 hover:text-amber-300 border-slate-600 hover:border-amber-500'
                                                                      }`}
                                                                      title={busy ? "업무 해제 후 파티로 소집할 수 있습니다." : isSleeping ? "취침 중에는 소집할 수 없습니다." : "파티로 소집"}
                                                                  >
                                                                      {isSleeping ? (
                                                                          <>🛌 취침 중</>
                                                                      ) : comp.isMonster ? (
                                                                          <><Dog size={13} className="mr-1"/> 사육소에서 소집</>
                                                                      ) : (
                                                                          <><UserCheck size={13} className="mr-1"/> 소집</>
                                                                      )}
                                                                  </button>
                                                              </div>
                                                          </div>
                                                      );
                                                  })}

                                                  {displayCapturedMonsters.map((monster, idx) => (
                                                      <div key={`monster-${monster.id || idx}`} className="bg-slate-900 p-3 rounded-xl border border-amber-900/30 flex flex-col gap-2 group hover:border-amber-500/50 transition-all">
                                                          <div className="w-full space-y-1">
                                                              <div className="font-bold text-amber-200 text-sm flex items-center flex-wrap gap-1.5">
                                                                  <span>{monster.nickname || monster.name}</span>
                                                                  <Dog size={12} className="text-amber-500 shrink-0" />
                                                                  <span className="text-[9px] bg-amber-950/50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-900/50 whitespace-nowrap">사육소</span>
                                                              </div>
                                                              <div className="text-xs text-slate-500 font-mono">Lv.{monster.level} {monster.stage} | {monster.rank}</div>
                                                          </div>
                                                          <div className="flex items-center justify-end pt-1.5 border-t border-slate-800/60 w-full">
                                                              <button
                                                                  onClick={() => onRecallMonsterFromFarm?.(monster.id)}
                                                                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-amber-900/50 text-slate-300 hover:text-amber-300 rounded-lg border border-slate-600 hover:border-amber-500 transition-all text-xs font-bold flex items-center gap-1"
                                                                  title="사육소에서 소집"
                                                              >
                                                                  <Dog size={13} /> 소집
                                                              </button>
                                                          </div>
                                                      </div>
                                                  ))}

                                                  {hasNoItems && (
                                                      <p className="text-xs text-slate-600 text-center py-4">검색 조건에 맞는 거주민이나 사육 중인 몬스터가 없습니다.</p>
                                                  )}
                                              </>
                                          );
                                      })()}
                                  </div>
                             </div>
                         </div>
                    )
                    }
                    {activeTab === 'resources' && (
                        <div className="space-y-6 animate-in fade-in">
                             {/* Trade Exchange Notice & Quick Action Banner */}
                             <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                                 <div className="flex items-center gap-3">
                                     <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400 shrink-0">
                                         <Store size={22} />
                                     </div>
                                     <div>
                                         <div className="text-sm font-bold text-amber-200 flex items-center gap-2">
                                             물자 교류소 거래
                                             <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-semibold border border-amber-500/30">
                                                 자원 판매 및 구매
                                             </span>
                                         </div>
                                         <p className="text-xs text-slate-400 mt-0.5">
                                             기지의 여분 자원을 판매하거나 필요한 자원을 골드로 구매할 수 있습니다.
                                         </p>
                                     </div>
                                 </div>
                                 <button
                                     onClick={() => {
                                         const hasTradeExchange = (character.base?.facilityLevels?.['trade_exchange'] || 0) > 0 || character.base?.layout?.some(inst => inst.type === 'trade_exchange');
                                         if (hasTradeExchange) {
                                             setIsTradeExchangeOpen(true);
                                         } else {
                                             setResultOverlay({
                                                 show: true,
                                                 data: {
                                                     type: 'warning',
                                                     title: '물자 교류소 필요',
                                                     message: '기지 자원의 판매 및 구매는 [물자 교류소] 시설을 건설해야 이용할 수 있습니다.\n기지 시설 배치에서 물자 교류소를 먼저 건설해 주세요.',
                                                     items: [{ label: '필요 시설', after: '물자 교류소 (고유 시설)' }]
                                                 }
                                             });
                                         }
                                     }}
                                     className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/50 transition-all active:scale-95 shrink-0"
                                 >
                                     <Store size={14} />
                                     <span>물자 교류소 열기</span>
                                 </button>
                             </div>

                             {/* Resource Sub-tabs */}
                             <div className="flex flex-wrap gap-2 p-1 bg-slate-950/50 rounded-xl border border-slate-800">
                                 <button 
                                     onClick={() => setActiveResourceTab('basic')}
                                     className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeResourceTab === 'basic' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
                                 >
                                     <Package size={14} /> 기초 자원
                                 </button>
                                 <button 
                                     onClick={() => setActiveResourceTab('crops')}
                                     className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeResourceTab === 'crops' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
                                 >
                                     <Utensils size={14} /> 수확한 작물
                                 </button>
                                 <button 
                                     onClick={() => setActiveResourceTab('crystals')}
                                     className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeResourceTab === 'crystals' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
                                 >
                                     <Gem size={14} /> 결정 & 보석
                                 </button>
                                 <button 
                                     onClick={() => setActiveResourceTab('shards')}
                                     className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeResourceTab === 'shards' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
                                 >
                                     <Layers size={14} /> 신력 조각
                                 </button>
                             </div>

                             {activeResourceTab === 'basic' && (
                                 <section className="animate-in fade-in slide-in-from-left-2">
                                     <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center"><Package size={16} className="mr-2 text-indigo-400"/> 기초 자원 목록</h3>
                                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                         <ResourceSellRow label="식량" keyStr="food" value={safeNum(character.base?.resources.food)} icon={Utensils} color="text-orange-400" price={RESOURCE_SELL_PRICES.food} />
                                         <ResourceSellRow label="목재" keyStr="wood" value={safeNum(character.base?.resources.wood)} icon={Package} color="text-green-600" price={RESOURCE_SELL_PRICES.wood} />
                                         <ResourceSellRow label="석재" keyStr="stone" value={safeNum(character.base?.resources.stone)} icon={Package} color="text-slate-400" price={RESOURCE_SELL_PRICES.stone} />
                                         <ResourceSellRow label="철광석" keyStr="iron" value={safeNum(character.base?.resources.iron)} icon={Package} color="text-blue-400" price={RESOURCE_SELL_PRICES.iron} />
                                         <ResourceSellRow label="마석" keyStr="manaStone" value={safeNum(character.base?.resources.manaStone)} icon={Mountain} color="text-indigo-400" price={RESOURCE_SELL_PRICES.manaStone} />
                                         <ResourceSellRow label="마정석" keyStr="manaCrystal" value={safeNum(character.base?.resources.manaCrystal)} icon={Zap} color="text-purple-400" price={RESOURCE_SELL_PRICES.manaCrystal} />
                                         <ResourceSellRow label="약초" keyStr="herbs" value={safeNum(character.base?.resources.herbs)} icon={Leaf} color="text-green-400" price={RESOURCE_SELL_PRICES.herbs} />
                                     </div>
                                 </section>
                             )}

                             {activeResourceTab === 'crops' && (
                                 <section className="animate-in fade-in slide-in-from-left-2">
                                     <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center"><Utensils size={16} className="mr-2 text-amber-400"/> 농장 수확물 창고</h3>
                                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                         <ResourceSellRow label="밀" keyStr="wheat" value={safeNum(character.base?.resources.wheat)} icon={Utensils} color="text-yellow-400" price={RESOURCE_SELL_PRICES.wheat} />
                                         <ResourceSellRow label="쌀" keyStr="rice" value={safeNum(character.base?.resources.rice)} icon={Utensils} color="text-slate-200" price={RESOURCE_SELL_PRICES.rice} />
                                         <ResourceSellRow label="옥수수" keyStr="corn" value={safeNum(character.base?.resources.corn)} icon={Utensils} color="text-yellow-500" price={RESOURCE_SELL_PRICES.corn} />
                                         <ResourceSellRow label="감자" keyStr="potato" value={safeNum(character.base?.resources.potato)} icon={Utensils} color="text-amber-600" price={RESOURCE_SELL_PRICES.potato} />
                                         <ResourceSellRow label="고구마" keyStr="sweet_potato" value={safeNum(character.base?.resources.sweet_potato)} icon={Utensils} color="text-purple-600" price={RESOURCE_SELL_PRICES.sweet_potato} />
                                         <ResourceSellRow label="양파" keyStr="onion" value={safeNum(character.base?.resources.onion)} icon={Utensils} color="text-slate-100" price={RESOURCE_SELL_PRICES.onion} />
                                         <ResourceSellRow label="마늘" keyStr="garlic" value={safeNum(character.base?.resources.garlic)} icon={Utensils} color="text-slate-300" price={RESOURCE_SELL_PRICES.garlic} />
                                         <ResourceSellRow label="상추" keyStr="lettuce" value={safeNum(character.base?.resources.lettuce)} icon={Leaf} color="text-green-500" price={RESOURCE_SELL_PRICES.lettuce} />
                                         <ResourceSellRow label="당근" keyStr="carrot" value={safeNum(character.base?.resources.carrot)} icon={Utensils} color="text-orange-500" price={RESOURCE_SELL_PRICES.carrot} />
                                         <ResourceSellRow label="배추" keyStr="cabbage" value={safeNum(character.base?.resources.cabbage)} icon={Leaf} color="text-green-300" price={RESOURCE_SELL_PRICES.cabbage} />
                                         <ResourceSellRow label="토마토" keyStr="tomato" value={safeNum(character.base?.resources.tomato)} icon={Utensils} color="text-red-500" price={RESOURCE_SELL_PRICES.tomato} />
                                         <ResourceSellRow label="딸기" keyStr="strawberry" value={safeNum(character.base?.resources.strawberry)} icon={Utensils} color="text-rose-400" price={RESOURCE_SELL_PRICES.strawberry} />
                                         <ResourceSellRow label="포도" keyStr="grape" value={safeNum(character.base?.resources.grape)} icon={Utensils} color="text-purple-500" price={RESOURCE_SELL_PRICES.grape} />
                                         <ResourceSellRow label="수박" keyStr="watermelon" value={safeNum(character.base?.resources.watermelon)} icon={Utensils} color="text-green-600" price={RESOURCE_SELL_PRICES.watermelon} />
                                         <ResourceSellRow label="인삼" keyStr="ginseng" value={safeNum(character.base?.resources.ginseng)} icon={Leaf} color="text-amber-200" price={RESOURCE_SELL_PRICES.ginseng} />
                                         <ResourceSellRow label="마력 열매" keyStr="mana_fruit" value={safeNum(character.base?.resources.mana_fruit)} icon={Zap} color="text-purple-400" price={RESOURCE_SELL_PRICES.mana_fruit} />
                                         <ResourceSellRow label="신력 꽃" keyStr="shinryoku_flower" value={safeNum(character.base?.resources.shinryoku_flower)} icon={Sparkles} color="text-pink-400" price={RESOURCE_SELL_PRICES.shinryoku_flower} />
                                         <ResourceSellRow label="만드라고라" keyStr="mandrake" value={safeNum(character.base?.resources.mandrake)} icon={Activity} color="text-amber-400" price={RESOURCE_SELL_PRICES.mandrake} />
                                         <ResourceSellRow label="세계수의 가지" keyStr="world_tree_branch" value={safeNum(character.base?.resources.world_tree_branch)} icon={Trees} color="text-emerald-400" price={RESOURCE_SELL_PRICES.world_tree_branch} />
                                         <ResourceSellRow label="황금 사과" keyStr="golden_apple" value={safeNum(character.base?.resources.golden_apple)} icon={Apple} color="text-yellow-400" price={RESOURCE_SELL_PRICES.golden_apple} />
                                     </div>
                                 </section>
                             )}

                             {activeResourceTab === 'crystals' && (
                                 <section className="animate-in fade-in slide-in-from-left-2">
                                     <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center"><Gem size={16} className="mr-2 text-amber-500"/> 희귀 결정 및 보석</h3>
                                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                         <ResourceSellRow label="노말 결정" keyStr="normalCrystal" value={safeNum(character.base?.resources.normalCrystal)} icon={Gem} color="text-slate-300" price={RESOURCE_SELL_PRICES.normalCrystal} />
                                         <ResourceSellRow label="마법 결정" keyStr="magicCrystal" value={safeNum(character.base?.resources.magicCrystal)} icon={Gem} color="text-blue-500" price={RESOURCE_SELL_PRICES.magicCrystal} />
                                         <ResourceSellRow label="레어 결정" keyStr="rareCrystal" value={safeNum(character.base?.resources.rareCrystal)} icon={Gem} color="text-yellow-500" price={RESOURCE_SELL_PRICES.rareCrystal} />
                                         <ResourceSellRow label="에픽 결정" keyStr="epicCrystal" value={safeNum(character.base?.resources.epicCrystal)} icon={Gem} color="text-purple-500" price={RESOURCE_SELL_PRICES.epicCrystal} />
                                         <ResourceSellRow label="유니크 결정" keyStr="uniqueCrystal" value={safeNum(character.base?.resources.uniqueCrystal)} icon={Gem} color="text-pink-500" price={RESOURCE_SELL_PRICES.uniqueCrystal} />
                                         <ResourceSellRow label="전설 결정" keyStr="legendaryCrystal" value={safeNum(character.base?.resources.legendaryCrystal)} icon={Gem} color="text-amber-500" price={RESOURCE_SELL_PRICES.legendaryCrystal} />
                                         <ResourceSellRow label="금광석" keyStr="gold_ore" value={safeNum(character.base?.resources.gold_ore)} icon={Coins} color="text-yellow-500" price={RESOURCE_SELL_PRICES.gold_ore} />
                                         <ResourceSellRow label="은광석" keyStr="silver_ore" value={safeNum(character.base?.resources.silver_ore)} icon={Coins} color="text-slate-300" price={RESOURCE_SELL_PRICES.silver_ore} />
                                         <ResourceSellRow label="다이아몬드" keyStr="diamond" value={safeNum(character.base?.resources.diamond)} icon={Gem} color="text-cyan-300" price={RESOURCE_SELL_PRICES.diamond} />
                                         <ResourceSellRow label="루비" keyStr="ruby" value={safeNum(character.base?.resources.ruby)} icon={Gem} color="text-red-500" price={RESOURCE_SELL_PRICES.ruby} />
                                         <ResourceSellRow label="사파이어" keyStr="sapphire" value={safeNum(character.base?.resources.sapphire)} icon={Gem} color="text-blue-500" price={RESOURCE_SELL_PRICES.sapphire} />
                                         <ResourceSellRow label="에메랄드" keyStr="emerald" value={safeNum(character.base?.resources.emerald)} icon={Gem} color="text-green-500" price={RESOURCE_SELL_PRICES.emerald} />
                                     </div>
                                 </section>
                             )}

                             {activeResourceTab === 'shards' && (
                                 <section className="animate-in fade-in slide-in-from-left-2">
                                     <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center"><Layers size={16} className="mr-2 text-cyan-400"/> 신력 조각 보관함</h3>
                                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                         {SHINRYOKU_TYPES_LIST.map(type => (
                                             <ResourceSellRow key={type} label={type} keyStr={type} value={safeNum(character.base?.elementalShards?.[type])} icon={Sparkles} color="text-cyan-400" price={RESOURCE_SELL_PRICES.shard} isShard={true} />
                                         ))}
                                     </div>
                                 </section>
                             )}
                        </div>
                    )}
                </div>
                {selectedFacility && <div className="absolute inset-0 z-50 bg-black/95 flex flex-col p-6 animate-in fade-in slide-in-from-bottom-5"><div className="flex-1 overflow-hidden relative">{renderFacilityOverlay()}</div></div>}
                {isWorkshopOpen && (
                    <WorkshopModal 
                        character={character} 
                        instanceId={activeInstanceId || undefined}
                        onClose={() => setIsWorkshopOpen(false)} 
                        onUpdateCharacter={onUpdateCharacter} 
                        onFacilityUpgrade={onFacilityUpgrade}
                    />
                )}
                {isAlchemyOpen && (
                    <AlchemyModal 
                        character={character} 
                        instanceId={activeInstanceId || undefined}
                        onClose={() => setIsAlchemyOpen(false)} 
                        onUpdateCharacter={onUpdateCharacter} 
                        onFacilityUpgrade={onFacilityUpgrade}
                    />
                )}
                {isCustomLabOpen && (
                    <CustomLabModal 
                        isOpen={isCustomLabOpen}
                        onClose={() => setIsCustomLabOpen(false)}
                        character={character} 
                        onUpdateCharacter={onUpdateCharacter}
                        facilityLevel={
                            activeInstanceId
                                ? (character.base?.layout?.find(f => f.id === activeInstanceId)?.level || character.base?.facilityLevels?.['custom_lab'] || 1)
                                : (character.base?.facilityLevels?.['custom_lab'] || character.base?.layout?.find(f => f.type === 'custom_lab')?.level || 1)
                        }
                    />
                )}
                {isSkillVfxLabOpen && (
                    <SkillVfxCustomLabModal 
                        isOpen={isSkillVfxLabOpen}
                        onClose={() => setIsSkillVfxLabOpen(false)}
                        character={character} 
                        onUpdateCharacter={onUpdateCharacter}
                        facilityLevel={
                            activeInstanceId
                                ? (character.base?.layout?.find(f => f.id === activeInstanceId)?.level || character.base?.facilityLevels?.['skill_vfx_lab'] || 1)
                                : (character.base?.facilityLevels?.['skill_vfx_lab'] || character.base?.layout?.find(f => f.type === 'skill_vfx_lab')?.level || 1)
                        }
                    />
                )}
                {isMonsterFarmOpen && (
                    <MonsterFarmModal 
                        character={character} 
                        instanceId={activeInstanceId || undefined}
                        onClose={() => setIsMonsterFarmOpen(false)} 
                        onUpdateCharacter={onUpdateCharacter} 
                        onFacilityUpgrade={onFacilityUpgrade}
                        onOpenMastery={() => { setIsMonsterFarmOpen(false); onOpenBreederMastery?.(); }}
                    />
                )}
                {isDispatchOpen && (
                    <DispatchModal 
                        character={character} 
                        instanceId={activeInstanceId || undefined}
                        onClose={() => setIsDispatchOpen(false)} 
                        onUpdateCharacter={onUpdateCharacter} 
                        onFacilityUpgrade={onFacilityUpgrade}
                        onOpenExternalModal={(sysType) => {
                            setIsDispatchOpen(false);
                            if (sysType === 'blacksmith') setIsWorkshopOpen(true);
                            else if (sysType === 'alchemy') setIsAlchemyOpen(true);
                            else if (sysType === 'military') setIsMilitaryOpen(true);
                            else if (sysType === 'regional') setIsRegionalOpen(true);
                            else if (sysType === 'war') setIsWarOpen(true);
                            else if (sysType === 'temple') setIsTempleOpen(true);
                            else if (sysType === 'mercenary') setIsMercenaryOpen(true);
                        }}
                    />
                )}
                {isMilitaryOpen && (
                    <MilitaryFacilityModal
                        character={character}
                        onClose={() => setIsMilitaryOpen(false)}
                        onUpdateCharacter={onUpdateCharacter}
                    />
                )}
                {isRegionalOpen && (
                    <RegionalManagementModal
                        character={character}
                        onClose={() => setIsRegionalOpen(false)}
                        onUpdateCharacter={onUpdateCharacter}
                    />
                )}
                {isWarOpen && (
                    <FrontlineModal
                        character={character}
                        targetNation={character.currentLocation?.nation || character.nation || '대한민국'}
                        onClose={() => setIsWarOpen(false)}
                        onAttack={() => {}}
                        onUpdateCharacter={onUpdateCharacter}
                    />
                )}
                {isTempleOpen && (
                    <TempleManagementModal
                        character={character}
                        onClose={() => setIsTempleOpen(false)}
                        onUpdateCharacter={onUpdateCharacter}
                        onAction={(action) => onUpdateCharacter(character, action)}
                    />
                )}
                {isMercenaryOpen && (
                    <MercenaryGuildModal
                        character={character}
                        onClose={() => setIsMercenaryOpen(false)}
                        onUpdateCharacter={onUpdateCharacter}
                        onAction={(action) => onUpdateCharacter(character, action)}
                    />
                )}
                {isFarmOpen && activeInstanceId && (
                    <FarmModal 
                        character={character}
                        instanceId={activeInstanceId}
                        onClose={() => setIsFarmOpen(false)}
                        onChangeInstanceId={(newInstanceId) => setActiveInstanceId(newInstanceId)}
                        onUpdateBase={(newBase) => {
                            const newChar = { ...character, base: newBase };
                            if (newBase.characterUpdate) {
                                const updatedChar = { ...newBase.characterUpdate, base: newBase };
                                delete (updatedChar.base as any).characterUpdate;
                                onUpdateCharacter(updatedChar, "");
                            } else {
                                onUpdateCharacter(newChar, "");
                            }
                        }}
                        onUpdateCharacter={onUpdateCharacter}
                        onFacilityUpgrade={onFacilityUpgrade}
                    />
                )}
                {isCookingOpen && activeInstanceId && (
                    <CookingModal 
                        isOpen={isCookingOpen}
                        onClose={() => setIsCookingOpen(false)}
                        character={character}
                        instanceId={activeInstanceId}
                        onOpenMastery={() => { setIsCookingOpen(false); onOpenChefMastery?.(); }}
                        onBuyTool={(toolId) => {
                            const tool = COOKING_TOOLS.find(t => t.id === toolId);
                            if (!tool) return;
                            
                            if (character.money < tool.price) {
                                alert("골드가 부족합니다.");
                                return;
                            }

                            const newChar = JSON.parse(JSON.stringify(character)) as Character;
                            if (!newChar.base) return;
                            if (!newChar.base.cookingTools) newChar.base.cookingTools = [];
                            
                            if (newChar.base.cookingTools.includes(toolId)) {
                                alert("이미 보유 중인 도구입니다.");
                                return;
                            }

                            newChar.money -= tool.price;
                            newChar.base.cookingTools.push(toolId);
                            
                            onUpdateCharacter(newChar, `[요리] ${tool.name}을(를) 구매했습니다.`);
                            
                            setResultOverlay({
                                show: true,
                                data: {
                                    type: 'success',
                                    title: '도구 구매 완료',
                                    message: `${tool.name}을(를) 주방에 배치했습니다.`,
                                    items: [{ label: '지출', after: `${tool.price.toLocaleString()}G` }]
                                }
                            });
                        }}
                        onCook={(recipeId) => {
                            const res = startCookingJob(character, activeInstanceId, recipeId);
                            if (!res.success) {
                                alert(res.message);
                                return;
                            }
                            if (res.updatedCharacter) {
                                onUpdateCharacter(res.updatedCharacter, res.message);
                            }
                        }}
                        onClaim={(jobId) => {
                            const res = claimCookedDish(character, jobId);
                            if (!res.success) {
                                alert(res.message);
                                return;
                            }
                            if (res.updatedCharacter) {
                                onUpdateCharacter(res.updatedCharacter, res.message);
                            }
                            if (res.item) {
                                setResultOverlay({
                                    show: true,
                                    data: {
                                        type: 'success',
                                        title: '요리 완성 및 수령!',
                                        message: res.message,
                                        items: [
                                            { label: '획득 요리', after: res.item.name },
                                            ...(res.item.description || (res.item as any).desc ? [{ label: '설명', after: res.item.description || (res.item as any).desc }] : []),
                                            ...res.levelUps.map(lu => ({ 
                                                label: `${lu.name} 요리 숙련도 상승!`, 
                                                after: `Lv.${lu.oldLevel} -> Lv.${lu.newLevel}`, 
                                                color: 'text-yellow-400' 
                                            }))
                                        ]
                                    }
                                });
                            }
                        }}
                        onCancel={(jobId) => {
                            const res = cancelCookingJob(character, jobId);
                            if (res.success && res.updatedCharacter) {
                                onUpdateCharacter(res.updatedCharacter, res.message);
                            }
                        }}
                    />
                )}
                {isMineOpen && activeInstanceId && (
                    <MineModal 
                        character={character}
                        instanceId={activeInstanceId}
                        onClose={() => setIsMineOpen(false)}
                        onChangeInstanceId={(newInstanceId) => setActiveInstanceId(newInstanceId)}
                        onUpdateCharacter={onUpdateCharacter}
                        onFacilityUpgrade={onFacilityUpgrade}
                    />
                )}
                {isMyHomeOpen && (
                    <MyHomeModal 
                        character={character} 
                        instanceId={activeInstanceId || undefined}
                        onClose={() => setIsMyHomeOpen(false)} 
                        onUpdateCharacter={onUpdateCharacter} 
                        onFacilityUpgrade={onFacilityUpgrade}
                    />
                )}
                {isHousingModalOpen && (
                    <HousingModal
                        isOpen={isHousingModalOpen}
                        onClose={() => setIsHousingModalOpen(false)}
                        character={character}
                        onUpdateCharacter={onUpdateCharacter}
                        onInteractClick={(comp) => {
                            setInteractionTarget(comp);
                            setIsHousingModalOpen(false);
                        }}
                        onHousingRest={onHousingRest}
                        setIsMyHomeOpen={setIsMyHomeOpen}
                        setIsPartyModalOpen={setIsPartyModalOpen}
                        setPartySelection={setPartySelection}
                    />
                )}
                {isLabOpen && (
                    <ResearchLabModal
                        isOpen={isLabOpen}
                        onClose={() => setIsLabOpen(false)}
                        character={character}
                        onSkillResearch={onSkillResearch}
                        onSkillLimitBreak={onSkillLimitBreak}
                        onUpdateCharacter={onUpdateCharacter}
                        facilityLevel={
                            activeInstanceId
                                ? (character.base?.layout?.find(f => f.id === activeInstanceId)?.level || calculateTotalLabLevel(character.base))
                                : calculateTotalLabLevel(character.base)
                        }
                    />
                )}
                {isSparringArenaOpen && (
                    <SparringArenaModal
                        isOpen={isSparringArenaOpen}
                        onClose={() => setIsSparringArenaOpen(false)}
                        character={character}
                        onUpdateCharacter={onUpdateCharacter}
                        instanceId={activeInstanceId || undefined}
                        onBattle={onBattle}
                    />
                )}
                {isChildAcademyOpen && (
                    <ChildAcademyModal
                        isOpen={isChildAcademyOpen}
                        onClose={() => setIsChildAcademyOpen(false)}
                        character={character}
                        instanceId={activeInstanceId || undefined}
                        onUpdateCharacter={onUpdateCharacter}
                        onFacilityUpgrade={onFacilityUpgrade}
                    />
                )}
                {isMonsterArenaOpen && (
                    <MonsterArenaModal
                        isOpen={isMonsterArenaOpen}
                        onClose={() => setIsMonsterArenaOpen(false)}
                        character={character}
                        instanceId={activeInstanceId || undefined}
                        onUpdateCharacter={onUpdateCharacter}
                        onFacilityUpgrade={onFacilityUpgrade}
                    />
                )}
                {isPotentialBreakthroughOpen && (
                    <PotentialBreakthroughModal
                        character={character}
                        facilityLevel={
                            activeInstanceId
                                ? (character.base?.layout?.find(f => f.id === activeInstanceId)?.level || 1)
                                : (character.base?.layout?.find(f => f.type === 'potential_breakthrough')?.level || 1)
                        }
                        isOpen={isPotentialBreakthroughOpen}
                        onClose={() => setIsPotentialBreakthroughOpen(false)}
                        onUpdateCharacter={onUpdateCharacter}
                        onBattle={onBattle}
                    />
                )}
                {isTradeExchangeOpen && (
                    <TradeExchangeModal
                        isOpen={isTradeExchangeOpen}
                        character={character}
                        onClose={() => setIsTradeExchangeOpen(false)}
                        onUpdateCharacter={onUpdateCharacter}
                        facilityLevel={
                            activeInstanceId
                                ? (character.base?.layout?.find(f => f.id === activeInstanceId)?.level || character.base?.facilityLevels?.['trade_exchange'] || 1)
                                : (character.base?.facilityLevels?.['trade_exchange'] || character.base?.layout?.find(f => f.type === 'trade_exchange')?.level || 1)
                        }
                    />
                )}
                {isCombatTrainingReportOpen && (
                    <CombatTrainingReportModal
                        isOpen={isCombatTrainingReportOpen}
                        onClose={() => setIsCombatTrainingReportOpen(false)}
                        character={character}
                    />
                )}
                {interactionTarget && <div className="absolute inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95"><div className="bg-slate-900 border border-indigo-500 rounded-xl p-6 w-full max-md shadow-2xl relative"><button onClick={() => setInteractionTarget(null)} className="absolute top-2 right-2 text-slate-500 hover:text-white p-2"><X size={20}/></button><div className="text-center mb-6"><h3 className="text-2xl font-bold text-white mb-1">{interactionTarget.name}</h3><p className="text-sm text-slate-400">무엇을 하시겠습니까?</p></div><div className="grid grid-cols-1 gap-3">{getInteractionOptions(interactionTarget).map((opt, idx) => { const Icon = opt.icon || Sparkles; return (<button key={idx} onClick={() => { handleInteractionLocal(interactionTarget.id, opt.label); }} className={`w-full p-4 rounded-lg border bg-slate-800 hover:bg-slate-700 flex items-center justify-center space-x-3 transition-all active:scale-95 ${opt.special ? 'border-purple-500 text-purple-200' : 'border-slate-700 text-slate-200'}`}><Icon className={opt.color} size={20} /><span className="font-bold">{opt.label}</span></button>); })}</div></div></div>}
                {isPartyModalOpen && <div className="absolute inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95"><div className="bg-slate-900 border border-pink-500 rounded-xl p-6 w-full max-md shadow-2xl relative flex flex-col max-h-[80vh]"><div className="text-center mb-4"><h3 className="text-xl font-bold text-pink-400 flex items-center justify-center"><Sparkles size={20} className="mr-2"/> 파티 주최</h3><p className="text-xs text-slate-400 mt-1">참석할 동료를 선택하세요. (식량 1, 골드 5000 / 1인)</p></div><div className="flex-1 overflow-y-auto custom-scrollbar mb-4 bg-slate-950 p-2 rounded border border-slate-800">{character.inactiveCompanions?.map((comp, idx) => { const busy = isCompanionDispatched(comp.id); if (busy) return null; const isSelected = partySelection.includes(idx); const currentYear = getYear(character.currentDate || '2000-01-01'); const displayAge = comp.birthYear !== undefined ? (currentYear - comp.birthYear) + "세" : comp.age; return (<div key={idx} onClick={() => togglePartySelection(idx)} className={`flex justify-between items-center p-3 rounded mb-2 cursor-pointer border transition-all ${isSelected ? 'bg-pink-900/30 border-pink-500' : 'bg-slate-900 border border-slate-700 hover:border-slate-500'}`}><div><span className={`text-sm font-bold ${isSelected ? 'text-pink-200' : 'text-slate-300'}`}>{comp.name}</span><span className="text-xs text-slate-500 ml-2">({displayAge})</span></div>{isSelected && <CheckCircle size={16} className="text-pink-500"/>}</div>); })}{(!character.inactiveCompanions || character.inactiveCompanions.length === 0) && <p className="text-center text-slate-500 py-10">초대할 수 있는 동료가 없습니다.</p>}</div><div className="bg-slate-800 p-3 rounded border border-slate-800 mb-4 text-xs"><div className="flex justify-between mb-1"><span className="text-slate-400">선택 인원</span><span className="text-white font-bold">{partySelection.length}명</span></div><div className="flex justify-between"><span>필요 자금</span><span className="text-amber-400">{(partySelection.length * 5000).toLocaleString()} G</span></div></div><div className="flex gap-2"><button onClick={() => setIsPartyModalOpen(false)} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded font-bold">취소</button><button onClick={() => { handleHostPartyLocal(partySelection); }} disabled={partySelection.length === 0} className="flex-1 py-3 bg-pink-700 text-white rounded font-bold">개최하기</button></div></div></div>}
                {renderUpgradeModal()}
                {assigningResidentId && (
                    <ResidentFacilityModal
                        isOpen={Boolean(assigningResidentId)}
                        onClose={() => setAssigningResidentId(null)}
                        companion={character.inactiveCompanions?.find(c => c.id === assigningResidentId) || null}
                        character={character}
                        onAssignCompanion={onAssignCompanion}
                        onUnassignHouseDuty={handleUnassignHouseDuty}
                    />
                )}
                {isDefenseSquadModalOpen && (
                    <BaseDefenseSquadModal
                        character={character}
                        onClose={() => setIsDefenseSquadModalOpen(false)}
                        onUpdateCharacter={onUpdateCharacter}
                    />
                )}

                {/* [기지 창고] 골드 입출금 모달 (모바일 최적화) */}
                {goldTransferModal.isOpen && (() => {
                    const isDeposit = goldTransferModal.mode === 'deposit';
                    const maxAmount = isDeposit 
                        ? (character.money || 0) 
                        : (character.base?.resources?.gold || 0);
                    const currentAmt = parseInt(goldTransferModal.amount.replace(/,/g, ''), 10) || 0;

                    const addAmount = (plus: number) => {
                        const next = Math.min(currentAmt + plus, maxAmount);
                        setGoldTransferModal(prev => ({ ...prev, amount: next.toString() }));
                    };

                    const setMax = () => {
                        setGoldTransferModal(prev => ({ ...prev, amount: maxAmount.toString() }));
                    };

                    const clearAmount = () => {
                        setGoldTransferModal(prev => ({ ...prev, amount: '' }));
                    };

                    return (
                        <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                            <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-5 max-w-md w-full shadow-2xl flex flex-col gap-4 text-slate-100 relative">
                                {/* 헤더 */}
                                <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`p-2 rounded-xl ${isDeposit ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                            <Coins size={22} />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-extrabold text-white">
                                                {isDeposit ? '기지 창고에 골드 맡기기' : '기지 창고에서 골드 찾기'}
                                            </h3>
                                            <p className="text-[11px] text-slate-400">
                                                {isDeposit ? '소지한 골드를 창고 금고에 안전하게 보관합니다.' : '창고 금고에 보관된 골드를 가방으로 인출합니다.'}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setGoldTransferModal({ isOpen: false, mode: 'deposit', amount: '' })}
                                        className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                        aria-label="닫기"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* 골드 잔액 현황 카드 */}
                                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400">현재 소지 골드</span>
                                        <span className="font-mono font-bold text-amber-300">
                                            {(character.money || 0).toLocaleString()} 골드
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400">창고 보관 골드</span>
                                        <span className="font-mono font-bold text-emerald-400">
                                            {(character.base?.resources?.gold || 0).toLocaleString()} 골드
                                        </span>
                                    </div>
                                    <div className="border-t border-slate-800/80 pt-2 flex justify-between items-center text-xs">
                                        <span className="text-slate-500 font-semibold">
                                            {isDeposit ? '최대 보관 가능' : '최대 인출 가능'}
                                        </span>
                                        <span className="font-mono font-bold text-slate-200">
                                            {maxAmount.toLocaleString()} 골드
                                        </span>
                                    </div>
                                </div>

                                {/* 금액 입력 폼 */}
                                <form onSubmit={handleGoldTransferSubmit} className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                                            {isDeposit ? '보관할 골드 입력' : '찾을 골드 입력'}
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type="number"
                                                min="1"
                                                max={maxAmount}
                                                value={goldTransferModal.amount}
                                                onChange={(e) => setGoldTransferModal(prev => ({ ...prev, amount: e.target.value }))}
                                                placeholder="금액을 입력하세요"
                                                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-3 text-sm font-mono text-amber-300 placeholder:text-slate-600 focus:outline-none min-h-[46px]"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 pointer-events-none">
                                                골드
                                            </span>
                                        </div>
                                    </div>

                                    {/* 빠른 금액 추가 버튼 (모바일 터치 최적화) */}
                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => addAmount(100000)}
                                            className="min-h-[42px] px-2 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-lg text-[11px] font-bold border border-slate-700 transition-all text-center"
                                        >
                                            +10만
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => addAmount(1000000)}
                                            className="min-h-[42px] px-2 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-lg text-[11px] font-bold border border-slate-700 transition-all text-center"
                                        >
                                            +100만
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => addAmount(10000000)}
                                            className="min-h-[42px] px-2 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-lg text-[11px] font-bold border border-slate-700 transition-all text-center"
                                        >
                                            +1000만
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => addAmount(100000000)}
                                            className="min-h-[42px] px-2 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-lg text-[11px] font-bold border border-slate-700 transition-all text-center"
                                        >
                                            +1억
                                        </button>
                                        <button
                                            type="button"
                                            onClick={setMax}
                                            className="min-h-[42px] px-2 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 active:scale-95 text-amber-300 rounded-lg text-[11px] font-black border border-amber-500/50 transition-all text-center"
                                        >
                                            전액
                                        </button>
                                        <button
                                            type="button"
                                            onClick={clearAmount}
                                            className="min-h-[42px] px-2 py-1.5 bg-slate-950 hover:bg-slate-900 active:scale-95 text-slate-400 rounded-lg text-[11px] font-bold border border-slate-800 transition-all text-center"
                                        >
                                            초기화
                                        </button>
                                    </div>

                                    {/* 하단 결정 버튼 */}
                                    <div className="flex gap-2.5 pt-3">
                                        <button
                                            type="button"
                                            onClick={() => setGoldTransferModal({ isOpen: false, mode: 'deposit', amount: '' })}
                                            className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-300 rounded-xl font-bold text-xs transition-all min-h-[46px]"
                                        >
                                            취소
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={currentAmt <= 0 || currentAmt > maxAmount}
                                            className={`flex-1 py-3 rounded-xl font-extrabold text-xs transition-all active:scale-95 min-h-[46px] shadow-lg flex items-center justify-center gap-1.5 ${
                                                currentAmt <= 0 || currentAmt > maxAmount
                                                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                                    : isDeposit
                                                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                                            }`}
                                        >
                                            {isDeposit ? (
                                                <>
                                                    <ArrowRight size={14} />
                                                    <span>{currentAmt > 0 ? `${currentAmt.toLocaleString()} 골드 맡기기` : '골드 맡기기'}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ArrowLeft size={14} />
                                                    <span>{currentAmt > 0 ? `${currentAmt.toLocaleString()} 골드 찾기` : '골드 찾기'}</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    );
                })()}
            </div>
            {resultOverlay.show && (
                <ActionResultModal 
                    data={resultOverlay.data} 
                    onClose={() => setResultOverlay({ show: false, data: null, onContinue: undefined })} 
                    onContinue={resultOverlay.onContinue}
                />
            )}
        </div>
    );
};

export default React.memo(BaseModal);
