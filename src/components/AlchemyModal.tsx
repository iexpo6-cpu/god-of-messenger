import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Character, Companion, Item, ItemRarity, BaseResources, ActiveStatus, WeaponType, DispatchMission, MonsterStage } from '../types';
import { X, TestTube, Users, ArrowRight, Clock,Zap, RefreshCw, Sparkles, Gem, Layers, FlaskConical, Atom, Droplets, CheckCircle, Flame, Snowflake, Mountain, Box, Eclipse, Sun, Moon, Wind, Shield, Sword, Hammer, Leaf, Activity, User, AlertCircle, AlertTriangle, Lock, Scissors, ArrowUpCircle, TrendingUp, Coins, Music, Volume2, VolumeX, Play, Pause, Upload, Link, Trash2, Disc, Search, Filter, ArrowUpDown } from 'lucide-react';
import { SHINRYOKU_TYPES_LIST, STATUS_AILMENTS_LIST, SHINRYOKU_UI_CONFIG, SHINRYOKU_SPECIAL_PASSIVES, SHINRYOKU_AILMENTS_MAP } from '../constants';
import { calculateItemPrice, addDays, getWeaponTypeFromItem, calculateFinalStats, generateDefaultVisualUrl, optimizeImage, calculateTotalAlchemyProduction, gainProfessionExp, getProfessionRank } from '../utils';
import ActionResultModal, { ResultData } from './ActionResultModal';
import AlchemyCraftModal from './AlchemyCraftModal';
import BulkDismantleModal from './BulkDismantleModal';
import AlchemistPromotionModal from './AlchemistPromotionModal';
import { checkAlchemistPromotionEligibility, addAlchemistExperience } from '../services/alchemistPromotionService';
import { getCompanionCP } from '../services/companionGrowthService';
import { getMonsterInfo } from '../monsterfield';
import { ItemTooltip } from './CharacterSheet';

const isUrlString = (str?: string) => Boolean(str && (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/') || str.startsWith('data:')));

const isEggMonster = (comp: any): boolean => {
    if (!comp) return false;
    return Boolean(comp.stage === MonsterStage.EGG || comp.stage === '알' || comp.hatchDueDate);
};

const isMonsterCompanion = (comp: any): boolean => {
    if (!comp) return false;
    if (
        comp._isMonster ||
        comp.isMonster ||
        comp.isCustomMonster ||
        comp.monsterData ||
        comp.race === '몬스터' ||
        comp.race === '마수' ||
        comp.race === '야수' ||
        (typeof comp.race === 'string' && (comp.race.includes('Monster') || comp.race.includes('몬스터') || comp.race.includes('마수'))) ||
        comp.stage !== undefined ||
        comp.classType === '마수/몬스터' ||
        comp.classType === '몬스터' ||
        comp.classType === '마수' ||
        (comp.job && (comp.job === '마수' || comp.job === '몬스터')) ||
        comp.hatchDueDate ||
        comp.cleanliness !== undefined ||
        comp.hunger !== undefined ||
        comp.evolutionStage !== undefined
    ) {
        return true;
    }
    const rawName = comp.name || '';
    const cleanName = rawName.replace(/^(알|유년기|성장기|성숙기|완전체|궁극체|초궁극체)\s+/, '').trim();
    const info = getMonsterInfo(rawName);
    if (info && info.visualUrl && info.visualUrl !== "https://i.ibb.co/Kz56VGDS/image.png" && (info as any).description) {
        return true;
    }
    const cleanInfo = getMonsterInfo(cleanName);
    if (cleanInfo && cleanInfo.visualUrl && cleanInfo.visualUrl !== "https://i.ibb.co/Kz56VGDS/image.png" && (cleanInfo as any).description) {
        return true;
    }
    return false;
};

const getMonsterVisualUrl = (comp: any): string => {
    if (!comp) return "https://i.ibb.co/Kz56VGDS/image.png";
    if (comp.visualUrl && isUrlString(comp.visualUrl)) return comp.visualUrl;
    if (comp.appearance && isUrlString(comp.appearance)) return comp.appearance;
    if (comp.imageUrl && isUrlString(comp.imageUrl)) return comp.imageUrl;
    if (comp.image && isUrlString(comp.image)) return comp.image;
    if (comp.monsterData?.visualUrl && isUrlString(comp.monsterData.visualUrl)) return comp.monsterData.visualUrl;
    if (comp.monsterData?.appearance && isUrlString(comp.monsterData.appearance)) return comp.monsterData.appearance;
    if (comp.monsterData?.imageUrl && isUrlString(comp.monsterData.imageUrl)) return comp.monsterData.imageUrl;
    if (comp.monsterData?.image && isUrlString(comp.monsterData.image)) return comp.monsterData.image;
    
    // Check getMonsterInfo with raw name and clean name without stage prefix
    const rawName = comp.name || '';
    const cleanName = rawName.replace(/^(알|유년기|성장기|성숙기|완전체|궁극체|초궁극체)\s+/, '').trim();
    const info = getMonsterInfo(rawName);
    if (info.visualUrl && info.visualUrl !== "https://i.ibb.co/Kz56VGDS/image.png") {
        return info.visualUrl;
    }
    const cleanInfo = getMonsterInfo(cleanName);
    if (cleanInfo.visualUrl && cleanInfo.visualUrl !== "https://i.ibb.co/Kz56VGDS/image.png") {
        return cleanInfo.visualUrl;
    }
    return info.visualUrl || "https://i.ibb.co/Kz56VGDS/image.png";
};

const getCompanionDisplayVisualUrl = (comp: any): string => {
    if (!comp) return '';
    if (isMonsterCompanion(comp)) {
        return getMonsterVisualUrl(comp);
    }
    return comp.visualUrl || comp.defaultVisualUrl || generateDefaultVisualUrl(comp.name, comp.nation || '기타', comp.race || '인간', comp.gender || '남성');
};

export interface TransmuteMonsterEntity {
    id: string;
    name: string;
    nickname?: string;
    level: number;
    rank?: string;
    stage?: string;
    visualUrl: string;
    isCustom: boolean;
    source: 'captured' | 'party' | 'inactive';
    capturedIdx?: number;
    raw: any;
}

const getAllTransmuteMonsters = (char: Character): TransmuteMonsterEntity[] => {
    const list: TransmuteMonsterEntity[] = [];

    // 사육소 몬스터
    (char.base?.capturedMonsters || []).forEach((m, idx) => {
        if (!isEggMonster(m)) {
            list.push({
                id: m.id || `captured_${idx}`,
                name: m.name,
                nickname: (m as any).nickname,
                level: m.level || 1,
                rank: m.rank || 'NORMAL',
                stage: m.stage || (m as any).stage || '마수',
                visualUrl: getMonsterVisualUrl(m),
                isCustom: Boolean((m as any).isCustom || (m as any).isCustomMonster),
                source: 'captured',
                capturedIdx: idx,
                raw: m
            });
        }
    });

    // 영입된 파티 몬스터
    (char.companions || []).forEach(c => {
        if (isMonsterCompanion(c) && !isEggMonster(c)) {
            list.push({
                id: c.id,
                name: c.name,
                nickname: (c as any).nickname,
                level: c.level || 1,
                rank: (c as any).rank || 'NORMAL',
                stage: (c as any).stage || c.classType || '마수/몬스터',
                visualUrl: getMonsterVisualUrl(c),
                isCustom: Boolean(c.isCustom || (c as any).isCustomMonster),
                source: 'party',
                raw: c
            });
        }
    });

    // 영입된 대기 몬스터
    (char.inactiveCompanions || []).forEach(c => {
        if (isMonsterCompanion(c) && !isEggMonster(c)) {
            list.push({
                id: c.id,
                name: c.name,
                nickname: (c as any).nickname,
                level: c.level || 1,
                rank: (c as any).rank || 'NORMAL',
                stage: (c as any).stage || c.classType || '마수/몬스터',
                visualUrl: getMonsterVisualUrl(c),
                isCustom: Boolean(c.isCustom || (c as any).isCustomMonster),
                source: 'inactive',
                raw: c
            });
        }
    });

    return list;
};

const getAllTransmuteCompanions = (char: Character): any[] => {
    const list: any[] = [];
    (char.companions || []).forEach(c => {
        if (!isMonsterCompanion(c)) {
            list.push({ ...c, _inParty: true });
        }
    });
    (char.inactiveCompanions || []).forEach(c => {
        if (!isMonsterCompanion(c)) {
            list.push({ ...c, _inParty: false });
        }
    });
    return list;
};

interface Props {
  character: Character;
  instanceId?: string;
  initialTab?: 'craft' | 'convert' | 'imbue' | 'produce' | 'transmute' | 'inherit' | 'custom' | 'bgm' | 'monsterShinryoku';
  onClose: () => void;
  onUpdateCharacter: (newChar: Character, logMsg: string) => void;
  onFacilityUpgrade?: (facilityId: string, instanceId?: string) => void;
}

const RARITY_MULTIPLIERS = {
    [ItemRarity.NORMAL]: 1,
    [ItemRarity.MAGIC]: 2,
    [ItemRarity.RARE]: 3,
    [ItemRarity.EPIC]: 4,
    [ItemRarity.UNIQUE]: 5,
    [ItemRarity.LEGENDARY]: 10,
};
// [NEW] Rarity Level Requirements (연금술 숙련도 레벨 기준)
const RARITY_LEVEL_REQ: Record<ItemRarity, number> = {
    [ItemRarity.NORMAL]: 1,
    [ItemRarity.MAGIC]: 5,
    [ItemRarity.RARE]: 15,
    [ItemRarity.EPIC]: 20,
    [ItemRarity.UNIQUE]: 50,
    [ItemRarity.LEGENDARY]: 80,
    [ItemRarity.MYTHTIC]: 100,
};

const ELEMENT_ICONS: Record<string, any> = {
    '화염계': Flame,
    '빙결계': Snowflake,
    '전격계': Zap,
    '대지계': Mountain,
    '암흑계': Eclipse,
    '광휘계': Sparkles,
    '해수계': Droplets,
    '태양계': Sun,
    '월광계': Moon,
    '질풍계': Wind,
    '강철계': Hammer,
    '초화계': Leaf,
    '무기강화계': Sword,
    '신체강화계': Activity
};

// Configs for new logic
const HP_POTION_CONFIG: Record<ItemRarity, { name: string, val: number }> = {
    [ItemRarity.NORMAL]: { name: '최하급 HP 포션', val: 100 },
    [ItemRarity.MAGIC]: { name: '하급 HP 포션', val: 500 },
    [ItemRarity.RARE]: { name: '중급 HP 포션', val: 1000 },
    [ItemRarity.UNIQUE]: { name: '상급 HP 포션', val: 3000 },
    [ItemRarity.EPIC]: { name: '최상급 HP 포션', val: 10000 },
    [ItemRarity.LEGENDARY]: { name: '특급 HP 포션', val: 50000 },
    [ItemRarity.MYTHTIC]: { name: '신화급 HP 포션', val: 999999 },
};

const MP_POTION_CONFIG: Record<ItemRarity, { name: string, val: number }> = {
    [ItemRarity.NORMAL]: { name: '최하급 MP 포션', val: 100 },
    [ItemRarity.MAGIC]: { name: '하급 MP 포션', val: 500 },
    [ItemRarity.RARE]: { name: '중급 MP 포션', val: 1000 },
    [ItemRarity.UNIQUE]: { name: '상급 MP 포션', val: 3000 },
    [ItemRarity.EPIC]: { name: '최상급 MP 포션', val: 10000 },
    [ItemRarity.LEGENDARY]: { name: '특급 MP 포션', val: 50000 },
    [ItemRarity.MYTHTIC]: { name: '신화급 MP 포션', val: 999999 },
};

const FATIGUE_POTION_CONFIG: Record<ItemRarity, { name: string, val: number }> = {
    [ItemRarity.NORMAL]: { name: '최하급 피로회복제', val: 10 },
    [ItemRarity.MAGIC]: { name: '하급 피로회복제', val: 20 },
    [ItemRarity.RARE]: { name: '중급 피로회복제', val: 30 },
    [ItemRarity.UNIQUE]: { name: '상급 피로회복제', val: 40 },
    [ItemRarity.EPIC]: { name: '특급 피로회복제', val: 50 },
    [ItemRarity.LEGENDARY]: { name: '궁극의 피로회복제', val: 100 },
    [ItemRarity.MYTHTIC]: { name: '신화급 피로회복제', val: 100 },
};

const NET_CONFIG: Record<ItemRarity, { name: string, val: number }> = {
    [ItemRarity.NORMAL]: { name: '최하급 포획 그물', val: 30 },
    [ItemRarity.MAGIC]: { name: '하급 포획 그물', val: 70 },
    [ItemRarity.RARE]: { name: '중급 포획 그물', val: 120 },
    [ItemRarity.UNIQUE]: { name: '상급 포획 그물', val: 200 },
    [ItemRarity.EPIC]: { name: '특급 포획 그물', val: 250 },
    [ItemRarity.LEGENDARY]: { name: '최상급 포획 그물', val: 300 },
    [ItemRarity.MYTHTIC]: { name: '신화급 포획 그물', val: 999 },
};

const SPECIAL_SCROLL_CONFIG = {
    'CLASS_NAME': { name: '클래스명 변경 주문서', desc: '클래스명을 자유롭게 변경할 수 있습니다.', rarity: ItemRarity.RARE },
    'FIRST_SKILL_RESET': { name: '퍼스트 클래스 스킬 초기화 주문서', desc: '퍼스트 클래스의 스킬을 초기화합니다.', rarity: ItemRarity.UNIQUE },
    'SECOND_SKILL_RESET': { name: '세컨드 클래스 스킬 초기화 주문서', desc: '세컨드 클래스의 스킬을 초기화합니다.', rarity: ItemRarity.UNIQUE },
    'LAST_SKILL_RESET': { name: '라스트 클래스 스킬 초기화 주문서', desc: '라스트 클래스의 스킬을 초기화합니다.', rarity: ItemRarity.EPIC },
    'FINAL_SKILL_RESET': { name: '파이널 클래스 스킬 초기화 주문서', desc: '파이널 클래스의 스킬을 초기화합니다.', rarity: ItemRarity.LEGENDARY },
    'ALL_SKILL_RESET': { name: '전체 클래스 스킬 초기화 주문서', desc: '모든 클래스의 스킬을 초기화합니다.', rarity: ItemRarity.EPIC },
    'STAT_RESET': { name: '스탯 포인트 초기화 주문서', desc: '순수 스탯을 초기화하고 포인트를 반환합니다.', rarity: ItemRarity.LEGENDARY },
    'NAME_CHANGE': { name: '이름 변경 주문서', desc: '[이름 변경] 플레이어의 이름을 변경할 수 있습니다.', rarity: ItemRarity.RARE },
};

const BUFF_POTION_VAL: Record<ItemRarity, number> = {
    [ItemRarity.NORMAL]: 5,
    [ItemRarity.MAGIC]: 10,
    [ItemRarity.RARE]: 15,
    [ItemRarity.UNIQUE]: 20,
    [ItemRarity.EPIC]: 30,
    [ItemRarity.LEGENDARY]: 50,
    [ItemRarity.MYTHTIC]: 100,
};

const XP_POTION_MULT: Record<ItemRarity, number> = {
    [ItemRarity.NORMAL]: 1.2,
    [ItemRarity.MAGIC]: 1.4,
    [ItemRarity.RARE]: 1.5,
    [ItemRarity.EPIC]: 1.8,
    [ItemRarity.UNIQUE]: 2.0,
    [ItemRarity.LEGENDARY]: 3.0,
    [ItemRarity.MYTHTIC]: 5.0,
};

const MASTERY_POTION_MULT: Record<ItemRarity, number> = {
    [ItemRarity.NORMAL]: 2.0,
    [ItemRarity.MAGIC]: 2.0,
    [ItemRarity.RARE]: 2.0,
    [ItemRarity.UNIQUE]: 2.0,
    [ItemRarity.EPIC]: 2.0,
    [ItemRarity.LEGENDARY]: 3.0,
    [ItemRarity.MYTHTIC]: 5.0,
};

const CURE_CONFIG: Record<ItemRarity, { allowed: string[], count: number, chance: number }> = {
    [ItemRarity.NORMAL]: { allowed: ['화상','감전','빙결'], count: 1, chance: 50 },
    [ItemRarity.MAGIC]: { allowed: ['화상','감전','빙결','출혈','파열','속박'], count: 1, chance: 60 },
    [ItemRarity.RARE]: { allowed: ['화상','감전','빙결','출혈','파열','속박','암흑','공포','혼란'], count: 1, chance: 70 },
    [ItemRarity.UNIQUE]: { allowed: STATUS_AILMENTS_LIST, count: 1, chance: 80 },
    [ItemRarity.EPIC]: { allowed: STATUS_AILMENTS_LIST, count: 2, chance: 90 },
    [ItemRarity.LEGENDARY]: { allowed: STATUS_AILMENTS_LIST, count: 3, chance: 100 },
    [ItemRarity.MYTHTIC]: { allowed: STATUS_AILMENTS_LIST, count: 5, chance: 100 },
};

interface DismantleGroup {
    item: Item;
    count: number;
    indices: number[];
}

import { getItemImage as getRpgItemImage } from '../services/rpgIconService';

const getItemImage = (item: Item) => getRpgItemImage(item);

const AlchemyModal: React.FC<Props> = ({ character, instanceId, initialTab, onClose, onUpdateCharacter, onFacilityUpgrade }) => {
  const [activeTab, setActiveTab] = useState<'craft' | 'convert' | 'imbue' | 'produce' | 'inherit' | 'monsterShinryoku'>(initialTab as any || 'craft');
  const [isCraftModalOpen, setIsCraftModalOpen] = useState(false);
  const [transmuteMode, setTransmuteMode] = useState<'equipment' | 'monster' | 'companion' | 'player'>('equipment');

  // Monster Shinryoku Transform Dedicated Tab State
  const [selectedTransformMonsterId, setSelectedTransformMonsterId] = useState<string | null>(null);
  const [monsterTransformTargetShinryoku, setMonsterTransformTargetShinryoku] = useState<string>('화염계');
  const [monsterTransformFilter, setMonsterTransformFilter] = useState<'all' | 'captured' | 'custom' | 'party'>('all');
  const [monsterTransformSearch, setMonsterTransformSearch] = useState<string>('');
  const [autoUpgradeCustomMonster, setAutoUpgradeCustomMonster] = useState<boolean>(true);
  
  // BGM Entrance Theme State
  const [selectedBgmTargetId, setSelectedBgmTargetId] = useState<string>('player');
  const [bgmInputUrl, setBgmInputUrl] = useState<string>('');
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Custom Companion Conversion State
  const [selectedCustomCompanionId, setSelectedCustomCompanionId] = useState<string | null>(null);
  const CUSTOM_CONVERT_MANA_CRYSTAL = 500;
  const CUSTOM_CONVERT_FLOWER = 50;
  
  // Crafting State
  const [potionType, setPotionType] = useState<'HP' | 'MP' | 'FATIGUE' | 'BUFF' | 'CURE' | 'MIX' | 'SCROLL' | 'NET' | 'SPECIAL_SCROLL'>('HP');
  const [scrollType, setScrollType] = useState<'TELEPORT' | 'DEF_PHYS' | 'DEF_MAG' | 'RES_FIRE' | 'RES_WATER' | 'RES_ELEC' | 'RES_EARTH' | 'RES_ALL' | 'DEF_ALL'>('TELEPORT');
  const [potionRarity, setPotionRarity] = useState<ItemRarity>(ItemRarity.NORMAL);
  const [specialScrollType, setSpecialScrollType] = useState<keyof typeof SPECIAL_SCROLL_CONFIG>('CLASS_NAME');
  const [buffStat, setBuffStat] = useState<string>('물리공격력');
  const [potionDurationOption, setPotionDurationOption] = useState<number>(10);
  
  // Cure Selection State
  const [selectedCureAilments, setSelectedCureAilments] = useState<string[]>([]);
  
  const [mixType, setMixType] = useState<'ELIXIR' | 'POWER_ELIXIR' | 'PANACEA' | 'GODLY' | 'PHINIX' | 'STONE'>('ELIXIR');
  
  // New: Quantity & Naming
  const [craftQuantity, setCraftQuantity] = useState<number>(1);
  const [customPotionName, setCustomPotionName] = useState<string>('');

  // Convert State
  const [convertMode, setConvertMode] = useState<'stone_to_crystal' | 'dismantle'>('stone_to_crystal');
  const [selectedDismantleGroupIdx, setSelectedDismantleGroupIdx] = useState<number | null>(null);
  const [dismantleTab, setDismantleTab] = useState<'equipment' | 'consumable' | 'etc'>('equipment');
  const [dismantleSort, setDismantleSort] = useState<'rarity_desc' | 'rarity_asc' | 'name_asc' | 'count_desc' | 'count_asc'>('rarity_desc');
  const [convertQuantity, setConvertQuantity] = useState<number>(1);
  const [dismantleQuantity, setDismantleQuantity] = useState<number>(1);
  const [isBulkDismantleOpen, setIsBulkDismantleOpen] = useState<boolean>(false);

  // Imbue State
  const [imbueMode, setImbueMode] = useState<'add' | 'remove'>('add');
  const [selectedEquipIdx, setSelectedEquipIdx] = useState<number | null>(null);
  const [targetElement, setTargetElement] = useState<string>(SHINRYOKU_TYPES_LIST[0]);
  const [imbueSort, setImbueSort] = useState<'rarity_desc' | 'rarity_asc' | 'enhance_desc' | 'name_asc'>('rarity_desc');
  const [imbueTypeFilter, setImbueTypeFilter] = useState<'all' | 'weapon' | 'subweapon'>('all');
  const [imbueSearch, setImbueSearch] = useState<string>('');

  // Appearance Transmute State
  const [transmuteBaseIdx, setTransmuteBaseIdx] = useState<number | null>(null);
  const [transmuteMaterialIdx, setTransmuteMaterialIdx] = useState<number | null>(null);
  const [transmuteBaseCompanionId, setTransmuteBaseCompanionId] = useState<string | null>(null);
  const [transmuteMaterialCompanionId, setTransmuteMaterialCompanionId] = useState<string | null>(null);
  const [transmuteBaseMonsterId, setTransmuteBaseMonsterId] = useState<string | null>(null);
  const [transmuteMaterialMonsterId, setTransmuteMaterialMonsterId] = useState<string | null>(null);
  const [transmuteMaterialType, setTransmuteMaterialType] = useState<'equipment' | 'monster' | 'companion' | 'player'>('equipment');
  const [isCustomTransmute, setIsCustomTransmute] = useState(false);
  const [customTransmuteUrl, setCustomTransmuteUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isMasteryModalOpen, setIsMasteryModalOpen] = useState(false);

  // Transmute Monster Filter & Sort States
  const [transmuteBaseMonsterSourceFilter, setTransmuteBaseMonsterSourceFilter] = useState<'all' | 'captured' | 'party' | 'inactive'>('all');
  const [transmuteBaseMonsterSearch, setTransmuteBaseMonsterSearch] = useState<string>('');
  const [transmuteMatMonsterSourceFilter, setTransmuteMatMonsterSourceFilter] = useState<'all' | 'captured' | 'party' | 'inactive'>('all');
  const [transmuteMatMonsterSearch, setTransmuteMatMonsterSearch] = useState<string>('');

  // Transmute Companion Filter & Sort States (Base)
  const [transmuteBasePartyFilter, setTransmuteBasePartyFilter] = useState<'all' | 'party' | 'inactive'>('all');
  const [transmuteBaseTypeFilter, setTransmuteBaseTypeFilter] = useState<'all' | 'custom' | 'normal'>('all');
  const [transmuteBaseSort, setTransmuteBaseSort] = useState<'default' | 'level' | 'name'>('default');
  const [transmuteBaseSearch, setTransmuteBaseSearch] = useState<string>('');

  // Transmute Companion Filter & Sort States (Material)
  const [transmuteMatPartyFilter, setTransmuteMatPartyFilter] = useState<'all' | 'party' | 'inactive'>('all');
  const [transmuteMatTypeFilter, setTransmuteMatTypeFilter] = useState<'all' | 'custom' | 'normal'>('all');
  const [transmuteMatSort, setTransmuteMatSort] = useState<'default' | 'level' | 'name'>('default');
  const [transmuteMatSearch, setTransmuteMatSearch] = useState<string>('');

  // Custom Companion Filter & Sort States
  const [customCompSort, setCustomCompSort] = useState<'unmodifiedFirst' | 'customFirst' | 'partyFirst' | 'levelDesc' | 'levelAsc' | 'cpDesc' | 'cpAsc' | 'nameAsc'>('unmodifiedFirst');
  const [customCompFilter, setCustomCompFilter] = useState<'all' | 'unmodified' | 'custom' | 'humanoid' | 'monster' | 'party'>('all');
  const [customCompSearch, setCustomCompSearch] = useState<string>('');

  // BGM Companion Filter & Sort States
  const [bgmCompSort, setBgmCompSort] = useState<'customFirst' | 'hasBgmFirst' | 'noBgmFirst' | 'partyFirst' | 'levelDesc' | 'levelAsc' | 'cpDesc' | 'cpAsc' | 'nameAsc'>('customFirst');
  const [bgmCompFilter, setBgmCompFilter] = useState<'all' | 'custom' | 'hasBgm' | 'noBgm' | 'party' | 'monster'>('all');
  const [bgmCompSearch, setBgmCompSearch] = useState<string>('');

  // Custom Monster Shinryoku Transformation State
  const [targetMonsterShinryoku, setTargetMonsterShinryoku] = useState<string>('화염계');

  const assignedIds = instanceId ? (character.base?.multiAssignments?.[instanceId] || []) : [];
  const allCompsForAlchemy = [...(character.companions || []), ...(character.inactiveCompanions || [])];
  const allAlchemists = allCompsForAlchemy.filter(c => c.job === '연금술사' && !c.isDead && !c.isMonster);
  const alchemists = allCompsForAlchemy.filter(c => assignedIds.includes(c.id) && c.job === '연금술사' && !c.isDead && !c.isMonster);
  const totalAlchemyLevel = alchemists.reduce((acc, c) => acc + (c.professions?.alchemy?.level || 1), 0);
  const extraProductionChance = Math.min(50, totalAlchemyLevel * 2); // max 50% chance for extra production
  const hasPromotableAlchemist = allAlchemists.some(c => checkAlchemistPromotionEligibility(c).canPromote);


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64 = event.target?.result as string;
        // 이미지 최적화 (Firestore 1MB 제한 대비)
        const optimizedBase64 = await optimizeImage(base64);
        setCustomTransmuteUrl(optimizedBase64);
      } catch (error) {
        console.error('Image optimization failed:', error);
        alert('이미지 최적화 중 오류가 발생했습니다.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      alert('파일 읽기 중 오류가 발생했습니다.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // Result Overlay
  const [resultOverlay, setResultOverlay] = useState<{ show: boolean, data: ResultData | null }>({ show: false, data: null });

  const alchemyLevel = character.professions?.alchemy?.level || 1;
  const alchemyExp = character.professions?.alchemy?.exp || 0;
  const alchemyMaxExp = character.professions?.alchemy?.maxExp || 100;
  
  // [NEW] 연금술 등급 계산
  const getAlchemyRank = (level: number): string => {
      if (level >= 100) return '대현자';
      if (level >= 80) return '최상급 연금술사';
      if (level >= 50) return '상급 연금술사';
      if (level >= 20) return '중급 연금술사';
      return '초급 연금술사';
  };
  const alchemyRankLabel = getAlchemyRank(alchemyLevel);

  const masterySuccessBonus = (alchemyLevel - 1) * 2; // 2% bonus per level

  const canCraftRarity = (rarity: ItemRarity) => {
      return alchemyLevel >= RARITY_LEVEL_REQ[rarity];
  };
  
  // Facility Data
  const currentInstance = character.base?.layout?.find(inst => inst.id === instanceId);
  const facilityLevel = currentInstance ? currentInstance.level : (character.base?.facilityLevels?.['alchemy'] || 1);
  const assigneeId = currentInstance ? character.base?.assignments?.[currentInstance.id] : character.base?.assignments?.['alchemy'];
  const assignee = character.inactiveCompanions?.find(c => c.id === assigneeId);
  const assigneeStats = assignee ? calculateFinalStats(assignee).finalStats : null;
  const wisBonus = assigneeStats ? assigneeStats.wis : 0;
  const intBonus = assigneeStats ? assigneeStats.int : 0;
  const ctrlBonus = assigneeStats ? assigneeStats.ctrl : 0;
  const assigneeElement = assignee?.shinryokuType;

  // Reset name/cure selections when type/rarity changes
  useEffect(() => {
      setCustomPotionName('');
      setSelectedCureAilments([]);
      setCraftQuantity(1);
  }, [potionType, potionRarity, mixType]);

  // 무기/스킬숙련도 비약 등급 제한 리셋 (노말/매직 등급 없이 레어부터 시작) 및 지속시간 옵션 동기화
  useEffect(() => {
      const isLowRarity = potionRarity === ItemRarity.NORMAL || potionRarity === ItemRarity.MAGIC;
      if (isLowRarity && (buffStat === '무기숙련도' || buffStat === '스킬숙련도')) {
          setPotionRarity(ItemRarity.RARE);
      }
      const isTime = ['경험치', '골드', '드롭률', '무기숙련도', '스킬숙련도'].includes(buffStat);
      if (isTime && ![600, 1800, 3600].includes(potionDurationOption)) {
          setPotionDurationOption(600);
      } else if (!isTime && ![5, 10, 15].includes(potionDurationOption)) {
          setPotionDurationOption(10);
      }
  }, [potionRarity, buffStat, potionDurationOption]);

  // Reset transmute indices when mode changes
  useEffect(() => {
      setTransmuteBaseIdx(null);
      setTransmuteMaterialIdx(null);
      setTransmuteBaseCompanionId(null);
      setTransmuteMaterialCompanionId(null);
      setTransmuteMaterialType(transmuteMode);
      setIsCustomTransmute(false);
      setCustomTransmuteUrl('');
      setTransmuteBaseSearch('');
      setTransmuteMatSearch('');
  }, [transmuteMode, activeTab]);

  // Helper: Get Resource Key by Rarity
  const getCrystalKey = (rarity: ItemRarity): keyof BaseResources => {
      switch (rarity) {
          case ItemRarity.NORMAL: return 'normalCrystal';
          case ItemRarity.MAGIC: return 'magicCrystal';
          case ItemRarity.RARE: return 'rareCrystal';
          case ItemRarity.EPIC: return 'epicCrystal';
          case ItemRarity.UNIQUE: return 'uniqueCrystal';
          case ItemRarity.LEGENDARY: return 'legendaryCrystal';
          default: return 'normalCrystal';
      }
  };

  const getRarityCoef = (rarity: ItemRarity, forImbue = false) => {
      if (forImbue && rarity === ItemRarity.MYTHTIC) return 100;
      if (forImbue && rarity === ItemRarity.LEGENDARY) return 10;
      return RARITY_MULTIPLIERS[rarity] || 1;
  };

  const applyAlchemyExp = (char: Character, expAmount: number) => {
      const expResult = gainProfessionExp(char, 'alchemy', expAmount);
      const newChar = expResult.newChar;
      
      // Also apply exp to assigned alchemists (자동 승급 방지 및 캡 적용)
      const updateList = (list: Companion[]): boolean => {
          let changed = false;
          list.forEach((a, idx) => {
              if (assignedIds.includes(a.id) && a.job === '연금술사') {
                  const { updatedCompanion } = addAlchemistExperience(a, expAmount);
                  list[idx] = updatedCompanion;
                  changed = true;
              }
          });
          return changed;
      };

      if (newChar.companions) updateList(newChar.companions);
      if (newChar.inactiveCompanions) updateList(newChar.inactiveCompanions);
      return expResult; // expResult has { newChar, leveledUp, oldLevel, newLevel }
  };

  // --- FUNCTION 1: CRAFT ---
  const getPotionRecipe = () => {
      const coef = getRarityCoef(potionRarity);
      
      if (potionType === 'MIX') {
          if (mixType === 'ELIXIR') return { herbs: 20, wood: 10, mana: 10, rarity: ItemRarity.RARE, crystal: 2 };
          if (mixType === 'PHINIX') return { herbs: 20, wood: 10, mana: 20, rarity: ItemRarity.RARE, crystal: 2 };
          if (mixType === 'POWER_ELIXIR') return { herbs: 50, wood: 20, mana: 20, rarity: ItemRarity.UNIQUE, crystal: 2 };
          if (mixType === 'STONE') return { herbs: 20, wood: 10, mana: 30, rarity: ItemRarity.RARE, crystal: 2 };
          if (mixType === 'PANACEA') return { herbs: 30, wood: 15, mana: 15, rarity: ItemRarity.EPIC, crystal: 2 };
          if (mixType === 'GODLY') return { herbs: 100, wood: 50, mana: 50, rarity: ItemRarity.LEGENDARY, crystal: 3 };
      }

      if (potionType === 'SCROLL') {
          if (scrollType === 'TELEPORT') {
              return { herbs: 10, wood: 10, mana: 5, rarity: ItemRarity.MAGIC, crystal: 1 };
          }
          return {
              herbs: Math.ceil(8 * coef),
              wood: Math.ceil(8 * coef),
              mana: Math.ceil(5 * coef),
              rarity: potionRarity,
              crystal: Math.ceil(1 * coef)
          };
      }

      if (potionType === 'NET') {
          return { herbs: 5 * coef, wood: 10 * coef, mana: 5 * coef, rarity: potionRarity, crystal: 2 };
      }

      if (potionType === 'SPECIAL_SCROLL') {
          const cfg = SPECIAL_SCROLL_CONFIG[specialScrollType];
          if (specialScrollType === 'CLASS_NAME') return { herbs: 100, wood: 100, mana: 50, rarity: cfg.rarity, crystal: 5 };
          if (specialScrollType === 'FIRST_SKILL_RESET') return { herbs: 300, wood: 300, mana: 150, rarity: cfg.rarity, crystal: 10 };
          if (specialScrollType === 'SECOND_SKILL_RESET') return { herbs: 400, wood: 400, mana: 200, rarity: cfg.rarity, crystal: 15 };
          if (specialScrollType === 'LAST_SKILL_RESET') return { herbs: 500, wood: 500, mana: 250, rarity: cfg.rarity, crystal: 20 };
          if (specialScrollType === 'FINAL_SKILL_RESET') return { herbs: 700, wood: 700, mana: 350, rarity: cfg.rarity, crystal: 30 };
          if (specialScrollType === 'ALL_SKILL_RESET') return { herbs: 500, wood: 500, mana: 250, rarity: cfg.rarity, crystal: 20 };
          if (specialScrollType === 'STAT_RESET') return { herbs: 1000, wood: 1000, mana: 500, rarity: cfg.rarity, crystal: 50 };
      }

      const isTimeElixir = ['경험치', '골드', '드롭률', '무기숙련도', '스킬숙련도'].includes(buffStat);
      let durMult = 1;
      if (potionType === 'BUFF') {
          if (isTimeElixir) {
              durMult = potionDurationOption === 3600 ? 4.5 : potionDurationOption === 1800 ? 2.5 : 1;
          } else {
              durMult = potionDurationOption === 15 ? 4.5 : potionDurationOption === 10 ? 2.5 : 1;
          }
      }

      return {
          herbs: Math.ceil(3 * coef * durMult),
          wood: Math.ceil(1 * coef * durMult),
          mana: Math.ceil(1 * coef * durMult),
          rarity: potionRarity,
          crystal: Math.ceil(1 * durMult), 
          // [NEW] 추가 재료 (작물 위주)
          silverOre: (potionRarity === ItemRarity.LEGENDARY) ? Math.ceil(2 * durMult) : 0,
          goldOre: (potionRarity === ItemRarity.MYTHTIC) ? Math.ceil(2 * durMult) : 0,
          diamond: 0,
          shinryokuFlower: (potionRarity === ItemRarity.EPIC) ? Math.ceil(2 * durMult) : (potionRarity === ItemRarity.UNIQUE ? Math.ceil(4 * durMult) : (potionRarity === ItemRarity.LEGENDARY ? Math.ceil(8 * durMult) : (potionRarity === ItemRarity.MYTHTIC ? Math.ceil(15 * durMult) : 0))),
          worldTreeBranch: (potionRarity === ItemRarity.UNIQUE) ? Math.ceil(2 * durMult) : (potionRarity === ItemRarity.LEGENDARY ? Math.ceil(4 * durMult) : (potionRarity === ItemRarity.MYTHTIC ? Math.ceil(8 * durMult) : 0)),
          garlic: (potionRarity === ItemRarity.RARE) ? Math.ceil(10 * durMult) : 0,
      };
  };

  const getPotionDefaults = () => {
      let defaultName = "";
      let effectDesc = "";
      
      if (potionType === 'HP') {
          const cfg = HP_POTION_CONFIG[potionRarity];
          defaultName = cfg.name;
          effectDesc = `HP ${cfg.val} 회복`;
      } else if (potionType === 'MP') {
          const cfg = MP_POTION_CONFIG[potionRarity];
          defaultName = cfg.name;
          effectDesc = `MP ${cfg.val} 회복`;
      } else if (potionType === 'FATIGUE') {
          const cfg = FATIGUE_POTION_CONFIG[potionRarity] || { name: '피로회복제', val: 30 };
          defaultName = cfg.name;
          effectDesc = `피로도 ${cfg.val} 감소`;
      } else if (potionType === 'BUFF') {
          const val = BUFF_POTION_VAL[potionRarity];
          const isTimeElixir = ['경험치', '골드', '드롭률', '무기숙련도', '스킬숙련도'].includes(buffStat);
          let durLabel = '10분';
          let durSuffix = '';

          if (isTimeElixir) {
              durLabel = potionDurationOption === 3600 ? '1시간' : potionDurationOption === 1800 ? '30분' : '10분';
              durSuffix = potionDurationOption === 3600 ? ' (1시간)' : potionDurationOption === 1800 ? ' (30분)' : '';
          } else {
              const turns = [5, 10, 15].includes(potionDurationOption) ? potionDurationOption : 10;
              durLabel = `${turns}턴`;
              durSuffix = turns === 10 ? '' : ` (${turns}턴)`;
          }

          if (buffStat === '경험치') {
              const mult = XP_POTION_MULT[potionRarity] || 1.5;
              defaultName = `${potionRarity} 경험치 비약${durSuffix}`;
              effectDesc = `전투 경험치 획득량 ${mult}배 증가 (${durLabel})`;
          } else if (buffStat === '골드') {
              const mult = XP_POTION_MULT[potionRarity] || 1.5;
              defaultName = `${potionRarity} 골드 획득 비약${durSuffix}`;
              effectDesc = `전투 골드 획득량 ${mult}배 증가 (${durLabel})`;
          } else if (buffStat === '드롭률') {
              const mult = (potionRarity === ItemRarity.NORMAL ? 1.2 : potionRarity === ItemRarity.MAGIC ? 1.5 : potionRarity === ItemRarity.RARE ? 2.0 : potionRarity === ItemRarity.UNIQUE ? 3.0 : potionRarity === ItemRarity.EPIC ? 4.0 : potionRarity === ItemRarity.LEGENDARY ? 5.0 : 5.0);
              defaultName = `${potionRarity} 드롭률 비약${durSuffix}`;
              effectDesc = `전리품 드롭률 ${mult}배 증가 (${durLabel})`;
          } else if (buffStat === '무기숙련도') {
              const mult = (potionRarity === ItemRarity.NORMAL || potionRarity === ItemRarity.MAGIC) ? 1.0 : potionRarity === ItemRarity.RARE ? 2.0 : potionRarity === ItemRarity.EPIC ? 3.0 : potionRarity === ItemRarity.UNIQUE ? 4.0 : 5.0;
              defaultName = `${potionRarity} 무기숙련도 비약${durSuffix}`;
              effectDesc = `전투 시 획득 무기숙련도 ${mult}배 증가 (${durLabel})`;
          } else if (buffStat === '스킬숙련도') {
              const mult = (potionRarity === ItemRarity.NORMAL || potionRarity === ItemRarity.MAGIC) ? 1.0 : potionRarity === ItemRarity.RARE ? 2.0 : potionRarity === ItemRarity.EPIC ? 3.0 : potionRarity === ItemRarity.UNIQUE ? 4.0 : 5.0;
              defaultName = `${potionRarity} 스킬숙련도 비약${durSuffix}`;
              effectDesc = `전투 시 획득 스킬숙련도 ${mult}배 증가 (${durLabel})`;
          } else {
              defaultName = `${potionRarity} ${buffStat} 물약${durSuffix}`;
              effectDesc = `${buffStat} +${val}% (${durLabel})`;
          }
      } else if (potionType === 'CURE') {
          const targets = selectedCureAilments.length > 0 ? selectedCureAilments.join(',') : '미지정';
          defaultName = `해독제 (${targets})`;
          effectDesc = `상태이상 해제 (${targets})`;
      } else if (potionType === 'MIX') {
          if (mixType === 'ELIXIR') { defaultName = "엘릭서"; effectDesc = "HP 50% 회복, MP 50% 회복"; }
          else if (mixType === 'POWER_ELIXIR') { defaultName = "파워 엘릭서"; effectDesc = "HP 100%, MP 100% 회복"; }
          else if (mixType === 'PANACEA') { defaultName = "만병통치약"; effectDesc = "모든 상태이상 해제"; }
          else if (mixType === 'PHINIX') {defaultName = "피닉스의 깃털"; effectDesc = "부활, HP 1% 회복"; }
          else if (mixType === 'STONE') {defaultName = "부활의 영약"; effectDesc = "부활, HP 50% 회복, MP 50% 회복"; }
          else { defaultName = "신의 약"; effectDesc = "부활, HP 100% 회복, MP 100% 회복 및 상태이상 해제, STR +1(영구), INT +1(영구), DEF +1(영구), WIS +1(영구), CTRL +1(영구), AGI +1(영구)"; }
      } else if (potionType === 'SCROLL') {
          if (scrollType === 'TELEPORT') {
              defaultName = "차원이동 주문서 (기지)";
              effectDesc = "사용 시 기지로 즉시 이동";
          } else if (scrollType === 'DEF_PHYS') {
              const bonusVal = potionRarity === ItemRarity.NORMAL ? 10 : potionRarity === ItemRarity.MAGIC ? 20 : potionRarity === ItemRarity.RARE ? 30 : potionRarity === ItemRarity.EPIC ? 40 : 50;
              defaultName = `${potionRarity} 물리 방어 주문서`;
              effectDesc = `전투 시 물리 방어력 +${bonusVal}% 증가 (10턴)`;
          } else if (scrollType === 'DEF_MAG') {
              const bonusVal = potionRarity === ItemRarity.NORMAL ? 10 : potionRarity === ItemRarity.MAGIC ? 20 : potionRarity === ItemRarity.RARE ? 30 : potionRarity === ItemRarity.EPIC ? 40 : 50;
              defaultName = `${potionRarity} 마법 방어 주문서`;
              effectDesc = `전투 시 마법 방어력 +${bonusVal}% 증가 (10턴)`;
          } else if (scrollType === 'RES_FIRE') {
              const bonusVal = potionRarity === ItemRarity.NORMAL ? 15 : potionRarity === ItemRarity.MAGIC ? 25 : potionRarity === ItemRarity.RARE ? 35 : potionRarity === ItemRarity.EPIC ? 50 : 70;
              defaultName = `${potionRarity} 화염 속성 저항 주문서`;
              effectDesc = `전투 시 화염 속성 저항 +${bonusVal}% 증가 (10턴)`;
          } else if (scrollType === 'RES_WATER') {
              const bonusVal = potionRarity === ItemRarity.NORMAL ? 15 : potionRarity === ItemRarity.MAGIC ? 25 : potionRarity === ItemRarity.RARE ? 35 : potionRarity === ItemRarity.EPIC ? 50 : 70;
              defaultName = `${potionRarity} 빙결 속성 저항 주문서`;
              effectDesc = `전투 시 빙결 속성 저항 +${bonusVal}% 증가 (10턴)`;
          } else if (scrollType === 'RES_ELEC') {
              const bonusVal = potionRarity === ItemRarity.NORMAL ? 15 : potionRarity === ItemRarity.MAGIC ? 25 : potionRarity === ItemRarity.RARE ? 35 : potionRarity === ItemRarity.EPIC ? 50 : 70;
              defaultName = `${potionRarity} 전격 속성 저항 주문서`;
              effectDesc = `전투 시 전격 속성 저항 +${bonusVal}% 증가 (10턴)`;
          } else if (scrollType === 'RES_EARTH') {
              const bonusVal = potionRarity === ItemRarity.NORMAL ? 15 : potionRarity === ItemRarity.MAGIC ? 25 : potionRarity === ItemRarity.RARE ? 35 : potionRarity === ItemRarity.EPIC ? 50 : 70;
              defaultName = `${potionRarity} 대지 속성 저항 주문서`;
              effectDesc = `전투 시 대지 속성 저항 +${bonusVal}% 증가 (10턴)`;
          } else if (scrollType === 'RES_ALL') {
              const bonusVal = potionRarity === ItemRarity.NORMAL ? 10 : potionRarity === ItemRarity.MAGIC ? 20 : potionRarity === ItemRarity.RARE ? 30 : potionRarity === ItemRarity.EPIC ? 40 : 50;
              defaultName = `${potionRarity} 모든 속성 저항 주문서`;
              effectDesc = `전투 시 모든 속성 저항 +${bonusVal}% 증가 (10턴)`;
          } else if (scrollType === 'DEF_ALL') {
              const bonusVal = potionRarity === ItemRarity.NORMAL ? 15 : potionRarity === ItemRarity.MAGIC ? 25 : potionRarity === ItemRarity.RARE ? 35 : potionRarity === ItemRarity.EPIC ? 45 : 60;
              defaultName = `${potionRarity} 모든 속성 수호 주문서`;
              effectDesc = `전투 시 모든 속성 저항 +${bonusVal}% 및 방어력 +20% 증가 (10턴)`;
          }
      } else if (potionType === 'NET') {
          const cfg = NET_CONFIG[potionRarity];
          defaultName = cfg.name;
          effectDesc = `레벨 ${cfg.val}까지의 몬스터를 포획 가능하다.`;
      } else if (potionType === 'SPECIAL_SCROLL') {
          const cfg = SPECIAL_SCROLL_CONFIG[specialScrollType];
          defaultName = cfg.name;
          effectDesc = cfg.desc;
      }
      return { defaultName, effectDesc };
  };

  const toggleCureSelection = (ailment: string, maxCount: number) => {
      if (selectedCureAilments.includes(ailment)) {
          setSelectedCureAilments(prev => prev.filter(a => a !== ailment));
      } else {
          if (selectedCureAilments.length < maxCount) {
              setSelectedCureAilments(prev => [...prev, ailment]);
          }
      }
  };

  const handleCraft = () => {
      const recipe = getPotionRecipe();
      const res = character.base!.resources;
      const crystalKey = getCrystalKey(recipe.rarity);
      const totalCost = {
          herbs: recipe.herbs * craftQuantity,
          wood: recipe.wood * craftQuantity,
          mana: recipe.mana * craftQuantity,
          crystal: recipe.crystal * craftQuantity
      };
      
      // Validation
      if (potionType === 'NET' && potionRarity === ItemRarity.MYTHTIC) {
          return alert("신화 등급 포획 그물은 제작할 수 없습니다.");
      }
      if ((potionType === 'SCROLL' || potionType === 'NET' || potionType === 'SPECIAL_SCROLL') && alchemyLevel < 100) {
          return alert("차원이동 주문서, 포획 그물, 특수 주문서는 대현자(연금술 Lv.100)부터 제작 가능합니다.");
      }
      if (potionType === 'MIX' && facilityLevel < 5) {
          return alert("복합 포션은 연금술 실험실 Lv.5부터 제작 가능합니다.");
      }
      if (potionType === 'CURE' && selectedCureAilments.length === 0) {
          return alert("해제할 상태이상을 선택해주세요.");
      }

      // Check Resources
      const missing = [];
      if (res.herbs < totalCost.herbs) missing.push(`약초 ${totalCost.herbs - res.herbs}`);
      if (res.wood < totalCost.wood) missing.push(`목재 ${totalCost.wood - res.wood}`);
      if (res.manaCrystal < totalCost.mana) missing.push(`마정석 ${totalCost.mana - res.manaCrystal}`);
      if (res[crystalKey] < totalCost.crystal) missing.push(`${recipe.rarity} 결정 ${totalCost.crystal - res[crystalKey]}`);
      
      // [NEW] 추가 재료 확인 (작물 위주)
      if ((recipe as any).garlic > 0 && (res as any).garlic < (recipe as any).garlic * craftQuantity) missing.push(`마늘 ${(recipe as any).garlic * craftQuantity - ((res as any).garlic || 0)}개`);
      if ((recipe as any).shinryokuFlower > 0 && (res as any).shinryoku_flower < (recipe as any).shinryokuFlower * craftQuantity) missing.push(`신력 꽃 ${(recipe as any).shinryokuFlower * craftQuantity - ((res as any).shinryoku_flower || 0)}개`);
      if ((recipe as any).worldTreeBranch > 0 && (res as any).world_tree_branch < (recipe as any).worldTreeBranch * craftQuantity) missing.push(`세계수의 가지 ${(recipe as any).worldTreeBranch * craftQuantity - ((res as any).world_tree_branch || 0)}개`);
      if ((recipe as any).silverOre > 0 && (res as any).silver_ore < (recipe as any).silverOre * craftQuantity) missing.push(`은광석 ${(recipe as any).silverOre * craftQuantity - ((res as any).silver_ore || 0)}개`);
      if ((recipe as any).goldOre > 0 && (res as any).gold_ore < (recipe as any).goldOre * craftQuantity) missing.push(`금광석 ${(recipe as any).goldOre * craftQuantity - ((res as any).gold_ore || 0)}개`);
      if ((recipe as any).diamond > 0 && (res as any).diamond < (recipe as any).diamond * craftQuantity) missing.push(`다이아몬드 ${(recipe as any).diamond * craftQuantity - ((res as any).diamond || 0)}개`);

      if (missing.length > 0) {
          setResultOverlay({ show: true, data: { type: 'warning', title: '재료 부족', message: '포션 제작에 필요한 재료가 부족합니다.', items: missing.map(m => ({ label: '부족', after: m })) } });
          return;
      }

      // Determine Success Rate
      let successRate = 100;
      if (potionType !== 'MIX' && potionType !== 'SCROLL') {
          const coef = getRarityCoef(recipe.rarity);
          const baseChance = 100 - (8 * coef);
          successRate = Math.min(100, Math.max(1, baseChance + (wisBonus * 0.01) + masterySuccessBonus));
      } else if (potionType === 'SCROLL') {
          successRate = 100; // Scrolls always succeed for now
      } else {
          // Mix potions are harder
          successRate = 50 + (wisBonus * 0.05) + (facilityLevel * 5) + masterySuccessBonus; 
          successRate = Math.min(100, successRate);
      }

      // Consume Resources
      const newChar = JSON.parse(JSON.stringify(character)) as Character;
      newChar.base!.resources.herbs -= totalCost.herbs;
      newChar.base!.resources.wood -= totalCost.wood;
      newChar.base!.resources.manaCrystal -= totalCost.mana;
      newChar.base!.resources[crystalKey] -= totalCost.crystal;

      // [NEW] 추가 재료 소모
      if ((recipe as any).silverOre > 0) (newChar.base!.resources as any).silver_ore -= (recipe as any).silverOre * craftQuantity;
      if ((recipe as any).shinryokuFlower > 0) (newChar.base!.resources as any).shinryoku_flower -= (recipe as any).shinryokuFlower * craftQuantity;
      if ((recipe as any).goldOre > 0) (newChar.base!.resources as any).gold_ore -= (recipe as any).goldOre * craftQuantity;
      if ((recipe as any).worldTreeBranch > 0) (newChar.base!.resources as any).world_tree_branch -= (recipe as any).worldTreeBranch * craftQuantity;
      if ((recipe as any).diamond > 0) (newChar.base!.resources as any).diamond -= (recipe as any).diamond * craftQuantity;
      if ((recipe as any).garlic > 0) (newChar.base!.resources as any).garlic -= (recipe as any).garlic * craftQuantity;

      const { defaultName, effectDesc } = getPotionDefaults();
      const finalName = customPotionName.trim() || defaultName;

      const daysMap: Record<ItemRarity, number> = {
          [ItemRarity.NORMAL]: 1,
          [ItemRarity.MAGIC]: 2,
          [ItemRarity.RARE]: 3,
          [ItemRarity.EPIC]: 5,
          [ItemRarity.UNIQUE]: 8,
          [ItemRarity.LEGENDARY]: 12,
          [ItemRarity.MYTHTIC]: 18
      };
      let baseDays = (daysMap[recipe.rarity] || 1) * craftQuantity;
      if (potionType === 'MIX') baseDays = Math.max(3, baseDays);
      const labBonus = Math.min(0.5, facilityLevel * 0.04);
      const craftDays = Math.max(1, Math.ceil(baseDays * (1 - labBonus)));
      const returnDate = addDays(character.currentDate || '2000-01-01', craftDays);

      const newMission: DispatchMission = {
          id: `alc_self_${Math.random().toString(36).substring(2, 9)}`,
          companionId: 'PLAYER_SELF',
          destination: (character.currentLocation as any) || '연금술실',
          startTime: character.currentDate || '2000-01-01',
          durationMonths: 0,
          expectedReturnDate: returnDate,
          status: 'Normal',
          dangerCounter: 0,
          successRate: successRate,
          missionType: 'AlchemyCrafting',
          rewards: { gold: 0, items: [] }
      };

      const isTimeBuff = potionType === 'BUFF' && ['경험치', '골드', '드롭률', '무기숙련도', '스킬숙련도'].includes(buffStat);
      const resolvedPotionDuration = potionType === 'BUFF'
          ? (isTimeBuff
              ? ([600, 1800, 3600].includes(potionDurationOption) ? potionDurationOption : 600)
              : ([5, 10, 15].includes(potionDurationOption) ? potionDurationOption : 10))
          : (potionType === 'SCROLL' && scrollType !== 'TELEPORT' ? 10 : undefined);

      (newMission as any).craftMetadata = {
          isSelfCraft: true,
          potionType,
          scrollType,
          potionRarity,
          craftQuantity,
          finalName,
          effectDesc,
          selectedCureAilments,
          specialScrollType,
          buffStat,
          potionDuration: resolvedPotionDuration,
          mixType,
          days: craftDays,
          recipeRarity: recipe.rarity
      };

      if (!newChar.base) {
          newChar.base = {
              level: 1,
              resources: { food: 0, wood: 0, stone: 0, iron: 0, gold: 0, herbs: 0, manaStone: 0, manaCrystal: 0, normalCrystal: 0, magicCrystal: 0, rareCrystal: 0, epicCrystal: 0, uniqueCrystal: 0, legendaryCrystal: 0 } as any,
              layout: [],
              assignments: {},
              dispatched: []
          } as any;
      }
      newChar.base.dispatched = [...(newChar.base.dispatched || []), newMission];

      onUpdateCharacter(newChar, `[연금술실] ${finalName} x${craftQuantity} 조제 착수. (소요: ${craftDays}일, 완료 예정: ${returnDate})`);

      setResultOverlay({ 
          show: true, 
          data: { 
              type: 'success', 
              title: '🧪 연금술 조제 착수', 
              message: `${finalName} 조제 작업이 시작되었습니다.\n시간 엔진을 통해 ${craftDays}일이 경과한 후 완료 시약을 수령할 수 있습니다.`, 
              items: [
                  { label: '조제 대상', after: `${finalName} x${craftQuantity}` },
                  { label: '성공 예상률', after: `${Math.floor(successRate)}%` },
                  { label: '소요 기간', after: `${craftDays}일` },
                  { label: '완료 예정일', after: returnDate }
              ] 
          } 
      });
  };

  // --- 수령 처리 함수 (직접 조제 미션) ---
  const handleClaimCraft = (mission: DispatchMission) => {
      const meta = (mission as any).craftMetadata;
      if (!meta) return;

      const newChar = JSON.parse(JSON.stringify(character)) as Character;
      let successCount = 0;
      const craftQuantity = meta.craftQuantity || 1;
      const successRate = mission.successRate || 100;
      const finalName = meta.finalName || '연금술 시약';
      const effectDesc = meta.effectDesc || '';
      const pRarity = meta.recipeRarity || meta.potionRarity || ItemRarity.NORMAL;

      for (let i = 0; i < craftQuantity; i++) {
          if (Math.random() * 100 < successRate) {
              const isTime = ['경험치', '골드', '드롭률', '무기숙련도', '스킬숙련도'].some(k => finalName.includes(k) || effectDesc.includes(k));
              const isTurnBuff = meta.potionType === 'BUFF' && !isTime;
              const isCombatScroll = meta.potionType === 'SCROLL' && meta.scrollType && meta.scrollType !== 'TELEPORT';

              let itemDuration: number | undefined = undefined;
              if (isTime) {
                  itemDuration = (meta.potionDuration && meta.potionDuration >= 60)
                      ? meta.potionDuration
                      : (effectDesc.includes('1시간') ? 3600 : effectDesc.includes('30분') ? 1800 : 600);
              } else if (isTurnBuff || isCombatScroll) {
                  itemDuration = (meta.potionDuration && meta.potionDuration <= 50)
                      ? meta.potionDuration
                      : (effectDesc.includes('15턴') ? 15 : effectDesc.includes('5턴') ? 5 : 10);
              }
              let potionImg = "https://i.ibb.co/CpZ5dPkw/image.png";
              if (meta.potionType === 'SCROLL') {
                  potionImg = "https://i.ibb.co/Zp1VCkcQ/Gemini-Generated-Image-o35is9o35is9o35i.png";
              } else if (meta.potionType === 'FATIGUE' || finalName.includes('피로회복제')) {
                  const fatigueImageMap: Record<string, string> = {
                      '최하급 피로회복제': 'https://i.ibb.co/7dckmsMV/1.png',
                      '하급 피로회복제': 'https://i.ibb.co/7dckmsMV/1.png',
                      '중급 피로회복제': 'https://i.ibb.co/p6x1061S/2.png',
                      '상급 피로회복제': 'https://i.ibb.co/FLhVqT71/3.png',
                      '특급 피로회복제': 'https://i.ibb.co/d0RXmrDH/4.png',
                      '궁극의 피로회복제': 'https://i.ibb.co/cSZMwD69/5.png',
                      '신화급 피로회복제': 'https://i.ibb.co/cSZMwD69/5.png',
                      '강력한 피로회복제': 'https://i.ibb.co/cSZMwD69/5.png',
                      '피로회복제': 'https://i.ibb.co/FThpY9q/Gemini-Generated-Image-8o5ck98o5ck98o5c.png',
                  };
                  potionImg = fatigueImageMap[finalName] || fatigueImageMap[pRarity as string] || 'https://i.ibb.co/FThpY9q/Gemini-Generated-Image-8o5ck98o5ck98o5c.png';
              }

              const newItem: Item = {
                  name: finalName,
                  type: 'Consumable',
                  rarity: pRarity,
                  description: `${finalName}. 효과: ${effectDesc}`,
                  enhancement: 0,
                  secondaryOptions: [effectDesc],
                  duration: itemDuration,
                  imageUrl: potionImg
              };

              if (meta.potionType === 'CURE' && meta.selectedCureAilments) {
                  const cureCfg = CURE_CONFIG[pRarity as ItemRarity] || { chance: 80 };
                  newItem.secondaryOptions = [`상태이상 해제(${meta.selectedCureAilments.join(',')})`, `확률 ${cureCfg.chance}%`];
              } else if (meta.potionType === 'SCROLL') {
                  const sType = meta.scrollType || 'TELEPORT';
                  if (sType === 'TELEPORT') {
                      newItem.secondaryOptions = [`['기지' 로 차원이동 주문서]`];
                  } else {
                      newItem.secondaryOptions = [effectDesc];
                  }
              } else if (meta.potionType === 'NET') {
                  const cfg = NET_CONFIG[pRarity as ItemRarity] || { val: '일반' };
                  newItem.secondaryOptions = [`몬스터 포획(${cfg.val})`];
              } else if (meta.potionType === 'SPECIAL_SCROLL') {
                  newItem.imageUrl = "https://i.ibb.co/Zp1VCkcQ/Gemini-Generated-Image-o35is9o35is9o35i.png";
                  if (meta.specialScrollType === 'CLASS_NAME') newItem.secondaryOptions = [`[클래스명 변경 주문서]`];
                  else if (meta.specialScrollType === 'FIRST_SKILL_RESET') newItem.secondaryOptions = [`[퍼스트 클래스 스킬 초기화]`];
                  else if (meta.specialScrollType === 'SECOND_SKILL_RESET') newItem.secondaryOptions = [`[세컨드 클래스 스킬 초기화]`];
                  else if (meta.specialScrollType === 'LAST_SKILL_RESET') newItem.secondaryOptions = [`[라스트 클래스 스킬 초기화]`];
                  else if (meta.specialScrollType === 'FINAL_SKILL_RESET') newItem.secondaryOptions = [`[파이널 클래스 스킬 초기화]`];
                  else if (meta.specialScrollType === 'ALL_SKILL_RESET') newItem.secondaryOptions = [`[각 클래스 별 스킬 초기화]`];
                  else if (meta.specialScrollType === 'STAT_RESET') newItem.secondaryOptions = [`[스탯 포인트 초기화]`];
              }

              newChar.inventory.push(newItem);
              successCount++;

              if (Math.random() * 100 < extraProductionChance) {
                  newChar.inventory.push({ ...newItem, id: `${newItem.id}_extra` });
                  successCount++;
              }
          }
      }

      const isGreatSuccess = Math.random() < 0.1;
      let baseExp = (20 + getRarityCoef(pRarity) * 10);
      if (isGreatSuccess) baseExp *= 2;

      const expResult = applyAlchemyExp(newChar, successCount * baseExp);
      const updatedChar = expResult.newChar;

      // 미션 제거
      if (updatedChar.base?.dispatched) {
          updatedChar.base.dispatched = updatedChar.base.dispatched.filter(m => m.id !== mission.id);
      }

      const failCount = craftQuantity - successCount;
      const logMsg = `[연금술] ${finalName} 수령 완료 (성공: ${successCount}, 실패: ${failCount})`;
      onUpdateCharacter(updatedChar, logMsg);

      setResultOverlay({ 
          show: true, 
          data: { 
              type: successCount > 0 ? 'success' : 'failure', 
              title: isGreatSuccess ? '✨ 조제 대성공! ✨' : (successCount > 0 ? '수령 완료' : '조제 실패'), 
              message: `${finalName} 조제물이 인벤토리에 지급되었습니다.`, 
              items: [
                  { label: '성공 수령', after: `${successCount}개` },
                  { label: '실패', after: `${failCount}개` },
                  ...(expResult.leveledUp ? [{ label: '숙련도 상승!', after: `Lv.${expResult.oldLevel} -> Lv.${expResult.newLevel}`, color: 'text-yellow-400' }] : [])
              ] 
          } 
      });
  };

  // --- FUNCTION 2: CONVERT ---
  const handleStoneToCrystal = () => {
      const res = character.base!.resources;
      const stonesNeeded = 10 * convertQuantity;
      
      if (res.manaStone < stonesNeeded) {
          setResultOverlay({ 
              show: true, 
              data: { type: 'warning', title: '재료 부족', message: '마석이 부족합니다.', items: [{ label: '부족', after: `마석 ${stonesNeeded - res.manaStone}개` }] } 
          });
          return;
      }
      
      const newChar = JSON.parse(JSON.stringify(character)) as Character;
      newChar.base!.resources.manaStone -= stonesNeeded;
      newChar.base!.resources.manaCrystal += convertQuantity;

      const expResult = applyAlchemyExp(newChar, convertQuantity * 2);
      const updatedChar = expResult.newChar;
      
      onUpdateCharacter(updatedChar, `[시스템] 마석 ${stonesNeeded}개를 마정석 ${convertQuantity}개로 변환했습니다.`);
      setResultOverlay({ 
          show: true, 
          data: { 
              type: 'success', 
              title: '변환 완료', 
              message: `마석을 정제하여 마정석을 얻었습니다.`, 
              items: [
                  { label: '소모 마석', after: `-${stonesNeeded}` }, 
                  { label: '획득 마정석', after: `+${convertQuantity}` },
                  ...(expResult.leveledUp ? [{ label: '숙련도 상승!', after: `Lv.${expResult.oldLevel} -> Lv.${expResult.newLevel}`, color: 'text-yellow-400' }] : [])
              ] 
          } 
      });
      setConvertQuantity(1);
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

  const EQUIP_TYPE_ORDER: Record<string, number> = {
      'Weapon': 1,
      'SubWeapon': 2,
      'Head': 3,
      'Body': 4,
      'Hand': 5,
      'Feet': 6,
      'Accessory': 7
  };

  const isEquipmentItem = (item: Item): boolean => {
      const equipTypes = ['Weapon', 'Armor', 'Accessory', 'Head', 'Body', 'Hand', 'Feet', 'SubWeapon'];
      return equipTypes.some(t => item.type?.includes(t));
  };

  const isConsumableItem = (item: Item): boolean => {
      return item.type === 'Consumable' || item.type?.includes('Consumable');
  };

  const getAllDismantleGroups = (): DismantleGroup[] => {
      const grouped: Record<string, DismantleGroup> = {};
      character.inventory.forEach((item, idx) => {
          if (!item) return;
          if (item.rarity === ItemRarity.MYTHTIC) return;
          if ((item as any).isEquipped) return;
          if (item.locked) return;
          
          const key = `${item.name}-${item.rarity}`;
          if (!grouped[key]) {
              grouped[key] = { item, count: 0, indices: [] };
          }
          grouped[key].count++;
          grouped[key].indices.push(idx);
      });
      return Object.values(grouped);
  };

  const getDismantleGroups = (): DismantleGroup[] => {
      const allGroups = getAllDismantleGroups();
      const filtered = allGroups.filter(g => {
          if (dismantleTab === 'equipment') {
              return isEquipmentItem(g.item);
          }
          if (dismantleTab === 'consumable') {
              return isConsumableItem(g.item);
          }
          // 'etc'
          return !isEquipmentItem(g.item) && !isConsumableItem(g.item);
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
              const diff = b.count - a.count;
              if (diff !== 0) return diff;
              return a.item.name.localeCompare(b.item.name);
          }
          if (dismantleSort === 'count_asc') {
              const diff = a.count - b.count;
              if (diff !== 0) return diff;
              return a.item.name.localeCompare(b.item.name);
          }
          return 0;
      });
  };

  const getDismantleYield = (item: Item, quantity: number) => {
      const rarity = item.rarity;
      let stonesPerUnit = 0;
      let shardsPerUnit = 0;
      
      if (rarity === ItemRarity.NORMAL) { stonesPerUnit = 1; }
      else if (rarity === ItemRarity.MAGIC) { stonesPerUnit = 2; shardsPerUnit = 1; }
      else if (rarity === ItemRarity.RARE) { stonesPerUnit = 4; shardsPerUnit = 2; }
      else if (rarity === ItemRarity.UNIQUE) { stonesPerUnit = 6; shardsPerUnit = 3; }
      else if (rarity === ItemRarity.EPIC) { stonesPerUnit = 10; shardsPerUnit = 5; }
      else if (rarity === ItemRarity.LEGENDARY) { stonesPerUnit = 20; shardsPerUnit = 10; }

      let totalStones = stonesPerUnit * quantity;
      let totalShards = shardsPerUnit * quantity;

      // Bonuses
      totalStones += Math.floor(intBonus * 0.1 * quantity);
      if (totalShards > 0) {
          // 마법(MAGIC) 등급의 경우 속성 조각 보너스를 대폭 낮추고 고등급으로 갈수록 증가하도록 차등 스케일링
          let shardBonusMultiplier = 0.01;
          if (rarity === ItemRarity.RARE) shardBonusMultiplier = 0.02;
          else if (rarity === ItemRarity.UNIQUE) shardBonusMultiplier = 0.03;
          else if (rarity === ItemRarity.EPIC) shardBonusMultiplier = 0.04;
          else if (rarity === ItemRarity.LEGENDARY) shardBonusMultiplier = 0.05;

          totalShards += Math.floor(intBonus * shardBonusMultiplier * quantity);
      }

      return { stones: totalStones, shards: totalShards };
  };

  const calculateBulkAlchemyYield = (items: Item[]) => {
      let totalStones = 0;
      let totalShards = 0;
      items.forEach(item => {
          const y = getDismantleYield(item, 1);
          totalStones += y.stones;
          totalShards += y.shards;
      });
      return [
          { label: '마석', value: `+${totalStones.toLocaleString()}개`, color: 'text-amber-400', icon: <Mountain size={14} className="text-amber-400" /> },
          { label: '속성 조각', value: `+${totalShards.toLocaleString()}개`, color: 'text-indigo-400', icon: <Gem size={14} className="text-indigo-400" /> }
      ];
  };

  const handleBulkDismantle = (targetIndices: number[]) => {
      if (targetIndices.length === 0) return;
      
      const targetItems = targetIndices.map(idx => character.inventory[idx]).filter(Boolean);
      let totalStones = 0;
      let totalShards = 0;
      targetItems.forEach(item => {
          const y = getDismantleYield(item, 1);
          totalStones += y.stones;
          totalShards += y.shards;
      });

      const newChar = JSON.parse(JSON.stringify(character)) as Character;
      newChar.inventory = newChar.inventory.filter((_, idx) => !targetIndices.includes(idx));

      // Add Stones
      newChar.base!.resources.manaStone = (newChar.base!.resources.manaStone || 0) + totalStones;

      // Add Shards (Random types)
      if (!newChar.base!.elementalShards) newChar.base!.elementalShards = {};
      for (let i = 0; i < totalShards; i++) {
          let targetElem = SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
          if (assigneeElement && Math.random() < 0.1) {
              targetElem = assigneeElement;
          }
          newChar.base!.elementalShards[targetElem] = (newChar.base!.elementalShards[targetElem] || 0) + 1;
      }

      const expResult = applyAlchemyExp(newChar, targetIndices.length * 5);
      const updatedChar = expResult.newChar;

      onUpdateCharacter(updatedChar, `[시스템] 아이템 ${targetIndices.length}개 일괄 분해 완료. (마석 +${totalStones}, 조각 +${totalShards})`);
      setResultOverlay({ 
          show: true, 
          data: { 
              type: 'success', 
              title: '일괄 분해 완료', 
              message: `아이템 ${targetIndices.length}개를 마력의 원천으로 환원했습니다.`, 
              items: [
                  { label: '분해 아이템 수', after: `${targetIndices.length}개` },
                  { label: '마석 획득', after: `+${totalStones.toLocaleString()}` },
                  { label: '조각 획득', after: `+${totalShards.toLocaleString()} (랜덤)` },
                  ...(expResult.leveledUp ? [{ label: '숙련도 상승!', after: `Lv.${expResult.oldLevel} -> Lv.${expResult.newLevel}`, color: 'text-yellow-400' }] : [])
              ] 
          } 
      });
      setIsBulkDismantleOpen(false);
      setSelectedDismantleGroupIdx(null);
      setDismantleQuantity(1);
  };

  const handleDismantle = () => {
      if (selectedDismantleGroupIdx === null) return;
      const groups = getDismantleGroups();
      const group = groups[selectedDismantleGroupIdx];
      if (!group) return;

      const yieldData = getDismantleYield(group.item, dismantleQuantity);
      const newChar = JSON.parse(JSON.stringify(character)) as Character;
      
      // Remove Items from inventory
      const indicesToRemove = group.indices.slice(0, dismantleQuantity);
      newChar.inventory = newChar.inventory.filter((_, idx) => !indicesToRemove.includes(idx));

      // Add Stones
      newChar.base!.resources.manaStone = (newChar.base!.resources.manaStone || 0) + yieldData.stones;

      // Add Shards (Random types)
      if (!newChar.base!.elementalShards) newChar.base!.elementalShards = {};
      const gainedShards: string[] = [];
      
      for (let i = 0; i < yieldData.shards; i++) {
          let targetElem = SHINRYOKU_TYPES_LIST[Math.floor(Math.random() * SHINRYOKU_TYPES_LIST.length)];
          if (assigneeElement && Math.random() < 0.1) {
              targetElem = assigneeElement;
          }
          newChar.base!.elementalShards[targetElem] = (newChar.base!.elementalShards[targetElem] || 0) + 1;
          gainedShards.push(targetElem);
      }

      const expResult = applyAlchemyExp(newChar, dismantleQuantity * 5);
      const updatedChar = expResult.newChar;

      onUpdateCharacter(updatedChar, `[시스템] ${group.item.name} x${dismantleQuantity} 변환 완료. (마석 +${yieldData.stones}, 조각 +${yieldData.shards})`);
      setResultOverlay({ 
          show: true, 
          data: { 
              type: 'success', 
              title: '변환 완료', 
              message: `${group.item.name} ${dismantleQuantity}개를 마력의 원천으로 환원했습니다.`, 
              items: [
                  { label: '마석 획득', after: `+${yieldData.stones}` },
                  { label: '조각 획득', after: `+${yieldData.shards} (랜덤)` },
                  ...(expResult.leveledUp ? [{ label: '숙련도 상승!', after: `Lv.${expResult.oldLevel} -> Lv.${expResult.newLevel}`, color: 'text-yellow-400' }] : [])
              ] 
          } 
      });
      setSelectedDismantleGroupIdx(null);
      setDismantleQuantity(1);
  };

  // --- FUNCTION 3: IMBUE/REMOVE ---
  const getShinryokuFlowerCount = () => {
      const baseFlowers = (character.base?.resources as any)?.shinryoku_flower || 0;
      const invFlowers = (character.inventory || []).reduce((sum, item) => {
          const cleanName = (item.name || '').replace(/\s+/g, '');
          if (cleanName === "신력꽃" || cleanName === "신력의꽃") {
              return sum + (item.quantity || 1);
          }
          return sum;
      }, 0);
      return { total: baseFlowers + invFlowers, base: baseFlowers, inv: invFlowers };
  };

  const getImbueCost = (grade: number, isMythic = false) => {
      // 일반 장비 (grade 1~10):
      // 속성 부여: 마정석 10*Grade개, 속성 조각 5*Grade + Grade^2개
      // 속성 제거: 마정석 15*Grade개
      // 신화 장비 (isMythic = true):
      // 일반 등급 대비 약 100배에 달하는 마정석/조각 및 신력꽃, 마석, 전설 결정, 골드 등 막대한 재료 소모
      if (isMythic) {
          if (imbueMode === 'add') {
              return {
                  mana: 1000,           // 마정석 1,000개 (일반 10개의 100배)
                  shards: 1000,         // 속성 조각 1,000개 (일반 대비 대폭 증량)
                  flowers: 50,          // 신력꽃 50송이
                  manaStone: 10000,     // 마석 10,000개
                  legendaryCrystal: 10, // 전설 결정 10개
                  gold: 1000000         // 골드 1,000,000G
              };
          } else {
              return {
                  mana: 1500,           // 마정석 1,500개 (일반 15개의 100배)
                  shards: 0,
                  flowers: 30,          // 신력꽃 30송이
                  manaStone: 10000,     // 마석 10,000개
                  legendaryCrystal: 5,  // 전설 결정 5개
                  gold: 1000000         // 골드 1,000,000G
              };
          }
      }
      if (imbueMode === 'add') {
          return {
              mana: 10 * grade,
              shards: 5 * grade + (grade * grade),
              flowers: 0,
              manaStone: 0,
              legendaryCrystal: 0,
              gold: 0
          };
      } else {
          return {
              mana: 15 * grade,
              shards: 0,
              flowers: 0,
              manaStone: 0,
              legendaryCrystal: 0,
              gold: 0
          };
      }
  };

  const handleImbueAction = () => {
      if (selectedEquipIdx === null) return;
      const item = character.inventory[selectedEquipIdx];
      if (!item) return;

      const isMythic = item.rarity === ItemRarity.MYTHTIC;
      const coef = getRarityCoef(item.rarity, true);
      const cost = getImbueCost(coef, isMythic);
      const res = character.base!.resources;
      const shards = character.base!.elementalShards || {};
      const flowers = getShinryokuFlowerCount();
      const currentGold = (character.money || 0) + (res.gold || 0);

      const missing = [];
      if (res.manaCrystal < cost.mana) missing.push(`마정석 ${cost.mana - res.manaCrystal}개`);
      if (imbueMode === 'add' && (shards[targetElement] || 0) < cost.shards) missing.push(`${targetElement} 조각 ${cost.shards - (shards[targetElement] || 0)}개`);
      if (cost.flowers > 0 && flowers.total < cost.flowers) missing.push(`신력꽃 ${cost.flowers - flowers.total}송이`);
      if (cost.manaStone > 0 && (res.manaStone || 0) < cost.manaStone) missing.push(`마석 ${cost.manaStone - (res.manaStone || 0)}개`);
      if (cost.legendaryCrystal > 0 && (res.legendaryCrystal || 0) < cost.legendaryCrystal) missing.push(`전설 결정 ${cost.legendaryCrystal - (res.legendaryCrystal || 0)}개`);
      if (cost.gold > 0 && currentGold < cost.gold) missing.push(`골드 ${(cost.gold - currentGold).toLocaleString()}G`);

      if (missing.length > 0) {
          setResultOverlay({ show: true, data: { type: 'warning', title: '자원 부족', message: isMythic ? '신화 장비의 신성한 속성 작업에 필요한 막대한 재료가 부족합니다.' : '작업에 필요한 재료가 부족합니다.', items: missing.map(m => ({ label: '부족', after: m })) } });
          return;
      }

      // Success Rate: 신화 장비는 기본 40% (연금술사 지혜 및 숙련도 보너스 가산)
      const baseChance = isMythic ? 40 : (100 - (5 * coef));
      const successRate = Math.min(100, Math.max(5, baseChance + (wisBonus * 0.01) + masterySuccessBonus));
      const roll = Math.random() * 100;
      const success = roll < successRate;

      const newChar = JSON.parse(JSON.stringify(character)) as Character;
      newChar.base!.resources.manaCrystal -= cost.mana;
      if (imbueMode === 'add') newChar.base!.elementalShards[targetElement] -= cost.shards;
      if (cost.manaStone > 0) newChar.base!.resources.manaStone = Math.max(0, (newChar.base!.resources.manaStone || 0) - cost.manaStone);
      if (cost.legendaryCrystal > 0) newChar.base!.resources.legendaryCrystal = Math.max(0, (newChar.base!.resources.legendaryCrystal || 0) - cost.legendaryCrystal);
      if (cost.gold > 0) {
          let goldToDeduct = cost.gold;
          if ((newChar.money || 0) >= goldToDeduct) {
              newChar.money = (newChar.money || 0) - goldToDeduct;
              goldToDeduct = 0;
          } else {
              goldToDeduct -= (newChar.money || 0);
              newChar.money = 0;
              if (newChar.base?.resources) {
                  newChar.base.resources.gold = Math.max(0, (newChar.base.resources.gold || 0) - goldToDeduct);
              }
          }
      }
      if (cost.flowers > 0) {
          let flowersToRemove = cost.flowers;
          if (newChar.base?.resources) {
              const baseFlowers = (newChar.base.resources as any).shinryoku_flower || 0;
              if (baseFlowers >= flowersToRemove) {
                  (newChar.base.resources as any).shinryoku_flower = baseFlowers - flowersToRemove;
                  flowersToRemove = 0;
              } else {
                  (newChar.base.resources as any).shinryoku_flower = 0;
                  flowersToRemove -= baseFlowers;
              }
          }
          if (flowersToRemove > 0 && newChar.inventory) {
              const updatedInv = [];
              for (const invItem of newChar.inventory) {
                  const cleanName = (invItem.name || '').replace(/\s+/g, '');
                  if (flowersToRemove > 0 && (cleanName === "신력꽃" || cleanName === "신력의꽃")) {
                      const qty = invItem.quantity || 1;
                      if (qty > flowersToRemove) {
                          updatedInv.push({ ...invItem, quantity: qty - flowersToRemove });
                          flowersToRemove = 0;
                      } else {
                          flowersToRemove -= qty;
                      }
                  } else {
                      updatedInv.push(invItem);
                  }
              }
              newChar.inventory = updatedInv;
          }
      }

      const newInv = [...newChar.inventory];
      const newItem = { ...item };

      if (success) {
          const expResult = applyAlchemyExp(newChar, isMythic ? 500 : (30 + coef * 10));
          const updatedChar = expResult.newChar;
          if (imbueMode === 'add') {
              newItem.elementalType = targetElement;
              newItem.description += ` [${targetElement} 속성]`;
              setResultOverlay({ show: true, data: { type: 'success', title: isMythic ? '신화 장비 속성 부여 성공!' : '속성 부여 성공', message: `${item.name}에 ${targetElement}의 신성한 권능이 깃들었습니다.`, items: [{ label: '속성', after: targetElement }, ...(expResult.leveledUp ? [{ label: '숙련도 상승!', after: `Lv.${expResult.oldLevel} -> Lv.${expResult.newLevel}`, color: 'text-yellow-400' }] : [])] } });
          } else {
              // Remove Mode - Success: Get shards back
              const oldElement = newItem.elementalType || "무속성";
              const refund = isMythic ? 100 : (1 * coef);
              newItem.elementalType = undefined;
              newItem.description = newItem.description.replace(/\[.+? 속성\]/g, '').trim();
                 
              // Remove '속성 부여' string from secondary options
              if (newItem.secondaryOptions) {
                  newItem.secondaryOptions = newItem.secondaryOptions.filter(opt => 
                      !opt.includes('속성 부여') && !opt.includes('속성부여')
                  );
              }
              if (oldElement !== "무속성") {
                  updatedChar.base!.elementalShards[oldElement] = (updatedChar.base!.elementalShards[oldElement] || 0) + refund;
              }
              setResultOverlay({ show: true, data: { type: 'success', title: isMythic ? '신화 장비 속성 제거 성공!' : '속성 제거 성공', message: `${item.name}의 각인된 속성을 추출했습니다.`, items: [{ label: '획득 조각', after: `${oldElement} x${refund}` }, ...(expResult.leveledUp ? [{ label: '숙련도 상승!', after: `Lv.${expResult.oldLevel} -> Lv.${expResult.newLevel}`, color: 'text-yellow-400' }] : [])] } });
          }
          newInv[selectedEquipIdx] = newItem;
          updatedChar.inventory = newInv;
          onUpdateCharacter(updatedChar, `[시스템] ${isMythic ? '신화 ' : ''}장비 속성 ${imbueMode === 'add' ? '부여' : '제거'} 성공!`);
      } else {
          // Failure
          setResultOverlay({ show: true, data: { type: 'failure', title: '작업 실패', message: '실패하여 재료만 소모되었습니다. 장비는 무사합니다.', items: [{ label: '결과', after: '실패' }] } });
          onUpdateCharacter(newChar, `[시스템] 장비 속성 작업 실패... 재료만 소모되었습니다.`);
      }
      setSelectedEquipIdx(null);
  };

  // 속성 부여/제거 대상 장비(무기 전용) 필터링 및 정렬 목록
  const imbueEquipList = useMemo(() => {
      const list: { item: Item; originalIdx: number }[] = [];

      character.inventory.forEach((item, idx) => {
          if (!item) return;
          // 오직 무기 아이템만 허용 (주무기 및 보조무기)
          const isWeapon = item.type === 'Weapon' || item.type === 'SubWeapon' || Boolean(item.weaponType);
          if (!isWeapon) return;

          if (imbueMode === 'add' && item.elementalType) return;
          if (imbueMode === 'remove' && !item.elementalType) return;

          // 무기 세부 필터 (전체, 주무기, 보조무기)
          if (imbueTypeFilter === 'weapon' && item.type !== 'Weapon') return;
          if (imbueTypeFilter === 'subweapon' && item.type !== 'SubWeapon') return;

          // 검색어 필터
          if (imbueSearch.trim()) {
              const query = imbueSearch.trim().toLowerCase();
              const nameMatch = (item.name || '').toLowerCase().includes(query);
              const elementMatch = (item.elementalType || '').toLowerCase().includes(query);
              const rarityMatch = (item.rarity || '').toLowerCase().includes(query);
              if (!nameMatch && !elementMatch && !rarityMatch) return;
          }

          list.push({ item, originalIdx: idx });
      });

      return list.sort((a, b) => {
          if (imbueSort === 'rarity_desc') {
              const diff = (RARITY_WEIGHT[b.item.rarity] || 0) - (RARITY_WEIGHT[a.item.rarity] || 0);
              if (diff !== 0) return diff;
              const enhDiff = (b.item.enhancement || 0) - (a.item.enhancement || 0);
              if (enhDiff !== 0) return enhDiff;
              return a.item.name.localeCompare(b.item.name);
          }
          if (imbueSort === 'rarity_asc') {
              const diff = (RARITY_WEIGHT[a.item.rarity] || 0) - (RARITY_WEIGHT[b.item.rarity] || 0);
              if (diff !== 0) return diff;
              return a.item.name.localeCompare(b.item.name);
          }
          if (imbueSort === 'enhance_desc') {
              const enhDiff = (b.item.enhancement || 0) - (a.item.enhancement || 0);
              if (enhDiff !== 0) return enhDiff;
              const diff = (RARITY_WEIGHT[b.item.rarity] || 0) - (RARITY_WEIGHT[a.item.rarity] || 0);
              if (diff !== 0) return diff;
              return a.item.name.localeCompare(b.item.name);
          }
          if (imbueSort === 'name_asc') {
              return a.item.name.localeCompare(b.item.name);
          }
          return 0;
      });
  }, [character.inventory, imbueMode, imbueTypeFilter, imbueSearch, imbueSort]);

  // --- FUNCTION 4: PRODUCE ---
  const handleDailyProduce = () => {
      const today = character.currentDate;
      if (character.base?.lastAlchemyProductionDate === today) return alert("오늘은 이미 생산했습니다.");

      const alchemyInstances = character.base?.layout?.filter(inst => inst.type === 'alchemy') || [];
      if (alchemyInstances.length === 0) return alert("설치된 연금술 실험실이 없습니다.");

      const newChar = { ...character };
      let totalYield = 0;
      let totalCostIron = 0;
      let totalCostManaStone = 0;
      let successLabs = 0;

      const res = newChar.base!.resources;

      alchemyInstances.forEach(inst => {
          const alcLv = inst.level || 1;
          const costIron = 1 * alcLv;
          const costManaStone = 1 * alcLv;

          if (res.iron >= costIron && (res.manaStone || 0) >= costManaStone) {
              res.iron -= costIron;
              res.manaStone = (res.manaStone || 0) - costManaStone;
              
              const workerId = newChar.base?.assignments?.[inst.id];
              const worker = newChar.inactiveCompanions?.find(c => c.id === workerId);
              const workerStats = worker ? calculateFinalStats(worker).finalStats : { wis: 0, int: 0, ctrl: 0 } as any;
              
              const wisBonus = worker ? Math.floor(workerStats.wis * 0.05) : 0;
              const intBonus = worker ? Math.floor(workerStats.int * 0.05) : 0;
              const ctrlBonus = worker ? Math.floor(workerStats.ctrl * 0.05) : 0;
              
              const yieldAmt = Math.max(1, alcLv + wisBonus + intBonus + ctrlBonus);
              totalYield += yieldAmt;
              totalCostIron += costIron;
              totalCostManaStone += costManaStone;
              successLabs++;
          }
      });

      if (successLabs === 0) {
          return alert("생산에 필요한 재료가 모든 실험실에서 부족합니다.");
      }

      res.manaCrystal += totalYield;
      newChar.base!.lastAlchemyProductionDate = today;

      const expResult = applyAlchemyExp(newChar, successLabs * 10);
      const updatedChar = expResult.newChar;

      onUpdateCharacter(updatedChar, `[시스템] 연금술 실험실(${successLabs}개소)에서 마정석 ${totalYield}개를 생산했습니다. (소모: 철 ${totalCostIron}, 마석 ${totalCostManaStone})`);
      setResultOverlay({ 
          show: true, 
          data: { 
              type: 'success', 
              title: '생산 완료', 
              message: `${successLabs}개의 실험실에서 마정석을 정제했습니다.`, 
              items: [
                  { label: '가동 실험실', after: `${successLabs} / ${alchemyInstances.length}` },
                  { label: '총 획득', after: `마정석 +${totalYield}` },
                  { label: '총 소모', after: `철 ${totalCostIron}, 마석 ${totalCostManaStone}` },
                  ...(expResult.leveledUp ? [{ label: '숙련도 상승!', after: `Lv.${expResult.oldLevel} -> Lv.${expResult.newLevel}`, color: 'text-yellow-400' }] : [])
              ] 
          } 
      });
  };

  // --- FUNCTION 5: TRANSMUTE (Appearance Change) ---
  const handleTransmute = () => {
    const isBaseSelected = transmuteMode === 'companion' ? transmuteBaseCompanionId !== null : transmuteBaseIdx !== null;
    const isMatSelected = isCustomTransmute ? Boolean(customTransmuteUrl) : (transmuteMaterialType === 'companion' ? transmuteMaterialCompanionId !== null : transmuteMaterialIdx !== null);
    if (!isBaseSelected || !isMatSelected) return;
    
    const newChar = { ...character };
    const crystalCost = isCustomTransmute ? 200 : 100;
    if ((character.base?.resources.manaCrystal || 0) < crystalCost) {
        setResultOverlay({ show: true, data: { type: 'warning', title: '재료 부족', message: `외형 변환에는 마정석 ${crystalCost}개가 필요합니다.`, items: [{ label: '부족', after: `마정석 ${crystalCost - (character.base?.resources.manaCrystal || 0)}개` }] } });
        return;
    }

    // Success Rate: 50% (base) + (Alchemy Facility Level * 2)% + (Assignee WIS * 0.01)% + masterySuccessBonus
    const successRate = 50 + (facilityLevel * 2) + (wisBonus * 0.01) + masterySuccessBonus;
    const roll = Math.random() * 100;
    const isSuccess = roll < successRate;

    newChar.base!.resources.manaCrystal -= crystalCost;

    let baseName = "";
    let materialName = isCustomTransmute ? "커스텀 URL" : "";

    const partyCompanions = character.companions || [];
    const inactiveCompanions = character.inactiveCompanions || [];
    const allComps = [...partyCompanions, ...inactiveCompanions];

    if (transmuteMode === 'equipment') {
        const baseItem = character.inventory[transmuteBaseIdx!];
        if (!baseItem) return;
        
        baseName = baseItem.name;
        const newInventory = [...newChar.inventory];

        if (isCustomTransmute) {
            if (isSuccess) {
                const expResult = applyAlchemyExp(newChar, 100);
                const updatedChar = expResult.newChar;
                newInventory[transmuteBaseIdx!] = {
                    ...baseItem,
                    imageUrl: customTransmuteUrl || getItemImage(baseItem)
                };
                setResultOverlay({ show: true, data: { type: 'success', title: '외형 변환 성공', message: `${baseItem.name}의 외형이 변경되었습니다.`, items: [{ label: '결과', after: '성공' }, ...(expResult.leveledUp ? [{ label: '숙련도 상승!', after: `Lv.${expResult.oldLevel} -> Lv.${expResult.newLevel}`, color: 'text-yellow-400' }] : [])] } });
                updatedChar.inventory = newInventory;
                onUpdateCharacter(updatedChar, `[시스템] ${baseItem.name} 외형 변환 성공! (커스텀 URL)`);
            } else {
                setResultOverlay({ show: true, data: { type: 'failure', title: '외형 변환 실패', message: '변환에 실패했습니다.', items: [{ label: '결과', after: '실패' }] } });
                onUpdateCharacter(newChar, `[시스템] ${baseItem.name} 외형 변환 실패...`);
            }
        } else {
            const materialItem = character.inventory[transmuteMaterialIdx!];
            if (!materialItem) return;
            if (baseItem.type !== materialItem.type) {
                alert("같은 종류의 장비끼리만 외형 변환이 가능합니다.");
                return;
            }
            materialName = materialItem.name;
            if (isSuccess) {
                const expResult = applyAlchemyExp(newChar, 50);
                const updatedChar = expResult.newChar;
                newInventory[transmuteBaseIdx!] = {
                    ...baseItem,
                    imageUrl: materialItem.imageUrl || getItemImage(materialItem)
                };
                setResultOverlay({ show: true, data: { type: 'success', title: '외형 변환 성공', message: `${baseItem.name}의 외형이 ${materialItem.name}으로 변경되었습니다.`, items: [{ label: '결과', after: '성공' }, ...(expResult.leveledUp ? [{ label: '숙련도 상승!', after: `Lv.${expResult.oldLevel} -> Lv.${expResult.newLevel}`, color: 'text-yellow-400' }] : [])] } });
                updatedChar.inventory = newInventory.filter((_, idx) => idx !== transmuteMaterialIdx);
                onUpdateCharacter(updatedChar, `[시스템] ${baseItem.name} 외형 변환 성공! (${materialItem.name} 외형)`);
            } else {
                setResultOverlay({ show: true, data: { type: 'failure', title: '외형 변환 실패', message: '변환에 실패했습니다.', items: [{ label: '결과', after: '실패' }] } });
                onUpdateCharacter(newChar, `[시스템] ${baseItem.name} 외형 변환 실패...`);
            }
        }
    } 
    else if (transmuteMode === 'player') {
        baseName = character.name;
        let materialVisualUrl = "";

        if (isCustomTransmute) {
            materialVisualUrl = customTransmuteUrl;
        } else {
            const allMonsters = getAllTransmuteMonsters(character);
            const allComps = getAllTransmuteCompanions(character);

            if (transmuteMaterialType === 'monster') {
                const materialEntity = allMonsters.find(m => m.id === transmuteMaterialMonsterId || (transmuteMaterialIdx !== null && m.capturedIdx === transmuteMaterialIdx));
                if (!materialEntity) return;
                materialName = materialEntity.nickname || materialEntity.name;
                materialVisualUrl = materialEntity.visualUrl;

                if (materialEntity.source === 'captured') {
                    newChar.base!.capturedMonsters = (character.base?.capturedMonsters || []).filter(m => (m.id ? m.id !== materialEntity.raw.id : m !== materialEntity.raw));
                } else if (materialEntity.source === 'party') {
                    newChar.companions = (character.companions || []).filter(c => c.id !== materialEntity.id);
                } else {
                    newChar.inactiveCompanions = (character.inactiveCompanions || []).filter(c => c.id !== materialEntity.id);
                }
            } else {
                const materialEntity = allComps.find(c => c.id === transmuteMaterialCompanionId);
                if (!materialEntity) return;
                materialName = (materialEntity as any).nickname || (materialEntity as any).name;
                materialVisualUrl = getCompanionDisplayVisualUrl(materialEntity);

                newChar.companions = (character.companions || []).filter(c => c.id !== materialEntity.id);
                newChar.inactiveCompanions = (character.inactiveCompanions || []).filter(c => c.id !== materialEntity.id);
            }
        }

        if (isSuccess) {
            const expResult = applyAlchemyExp(newChar, 150);
            newChar.visualUrl = materialVisualUrl;
            setResultOverlay({ show: true, data: { type: 'success', title: '외형 변환 성공', message: `${character.name}의 외형이 변경되었습니다.`, items: [{ label: '결과', after: '성공' }, ...(expResult.leveledUp ? [{ label: '숙련도 상승!', after: `Lv.${expResult.oldLevel} -> Lv.${expResult.newLevel}`, color: 'text-yellow-400' }] : [])] } });
        } else {
            setResultOverlay({ show: true, data: { type: 'failure', title: '외형 변환 실패', message: '변환에 실패했습니다.', items: [{ label: '결과', after: '실패' }] } });
        }
    }
    else {
        // For monsters and companions
        const allMonsters = getAllTransmuteMonsters(character);
        const allComps = getAllTransmuteCompanions(character);

        let baseEntity: any = null;
        if (transmuteMode === 'monster') {
            baseEntity = allMonsters.find(m => m.id === transmuteBaseMonsterId || (transmuteBaseIdx !== null && m.capturedIdx === transmuteBaseIdx));
            if (baseEntity && !baseEntity.isCustom) {
                setResultOverlay({
                    show: true,
                    data: {
                        type: 'failure',
                        title: '이미지 변경 불가',
                        message: `일반 몬스터(${baseEntity.nickname || baseEntity.name})는 외형(이미지)을 변경할 수 없습니다.\n[커스텀 개조] 탭에서 커스텀 몬스터로 변환한 후 이용해 주세요.`,
                        items: [{ label: '현재 대상', after: baseEntity.name }]
                    }
                });
                return;
            }
        } else {
            baseEntity = allComps.find(c => c.id === transmuteBaseCompanionId);
        }
        if (!baseEntity) return;
        baseName = (baseEntity as any).nickname || (baseEntity as any).name;

        let materialVisualUrl = "";

        if (isCustomTransmute) {
            materialVisualUrl = customTransmuteUrl;
        } else {
            let materialEntity: any = null;
            if (transmuteMaterialType === 'monster') {
                materialEntity = allMonsters.find(m => m.id === transmuteMaterialMonsterId || (transmuteMaterialIdx !== null && m.capturedIdx === transmuteMaterialIdx));
            } else {
                materialEntity = allComps.find(c => c.id === transmuteMaterialCompanionId);
            }
            if (!materialEntity) return;
            materialName = (materialEntity as any).nickname || (materialEntity as any).name;
            materialVisualUrl = transmuteMaterialType === 'monster' ? materialEntity.visualUrl : getCompanionDisplayVisualUrl(materialEntity);
        }

        if (transmuteMode === 'monster') {
            const baseMonster = baseEntity as TransmuteMonsterEntity;
            if (isSuccess) {
                if (baseMonster.source === 'captured') {
                    newChar.base!.capturedMonsters = (character.base?.capturedMonsters || []).map(m => (m.id === baseMonster.raw.id ? { ...m, visualUrl: materialVisualUrl } : m));
                } else if (baseMonster.source === 'party') {
                    newChar.companions = (character.companions || []).map(c => c.id === baseMonster.id ? { ...c, visualUrl: materialVisualUrl } : c);
                } else {
                    newChar.inactiveCompanions = (character.inactiveCompanions || []).map(c => c.id === baseMonster.id ? { ...c, visualUrl: materialVisualUrl } : c);
                }
            }

            if (!isCustomTransmute) {
                if (transmuteMaterialType === 'monster') {
                    const materialMonster = allMonsters.find(m => m.id === transmuteMaterialMonsterId || (transmuteMaterialIdx !== null && m.capturedIdx === transmuteMaterialIdx));
                    if (materialMonster) {
                        if (materialMonster.source === 'captured') {
                            newChar.base!.capturedMonsters = (character.base?.capturedMonsters || []).filter(m => (m.id ? m.id !== materialMonster.raw.id : m !== materialMonster.raw));
                        } else if (materialMonster.source === 'party') {
                            newChar.companions = (character.companions || []).filter(c => c.id !== materialMonster.id);
                        } else {
                            newChar.inactiveCompanions = (character.inactiveCompanions || []).filter(c => c.id !== materialMonster.id);
                        }
                    }
                } else if (transmuteMaterialCompanionId) {
                    newChar.companions = (character.companions || []).filter(c => c.id !== transmuteMaterialCompanionId);
                    newChar.inactiveCompanions = (character.inactiveCompanions || []).filter(c => c.id !== transmuteMaterialCompanionId);
                }
            }
        } else {
            // transmuteMode === 'companion'
            const baseId = baseEntity.id;
            if (isSuccess) {
                newChar.companions = (newChar.companions || []).map(c => c.id === baseId ? { ...c, visualUrl: materialVisualUrl } : c);
                newChar.inactiveCompanions = (newChar.inactiveCompanions || []).map(c => c.id === baseId ? { ...c, visualUrl: materialVisualUrl } : c);
            }
            if (!isCustomTransmute) {
                if (transmuteMaterialType === 'companion' && transmuteMaterialCompanionId) {
                    newChar.companions = (newChar.companions || []).filter(c => c.id !== transmuteMaterialCompanionId);
                    newChar.inactiveCompanions = (newChar.inactiveCompanions || []).filter(c => c.id !== transmuteMaterialCompanionId);
                } else if (transmuteMaterialType === 'monster') {
                    const materialMonster = allMonsters.find(m => m.id === transmuteMaterialMonsterId || (transmuteMaterialIdx !== null && m.capturedIdx === transmuteMaterialIdx));
                    if (materialMonster) {
                        if (materialMonster.source === 'captured') {
                            newChar.base!.capturedMonsters = (character.base?.capturedMonsters || []).filter(m => (m.id ? m.id !== materialMonster.raw.id : m !== materialMonster.raw));
                        } else if (materialMonster.source === 'party') {
                            newChar.companions = (character.companions || []).filter(c => c.id !== materialMonster.id);
                        } else {
                            newChar.inactiveCompanions = (character.inactiveCompanions || []).filter(c => c.id !== materialMonster.id);
                        }
                    }
                }
            }
        }
    }

    if (isSuccess) {
        setResultOverlay({
            show: true,
            data: {
                type: 'success',
                title: '외형 변환 성공!',
                message: `${baseName}의 외형이 ${materialName}(으)로 성공적으로 변경되었습니다.`,
                items: [{ label: '성공 확률', after: `${successRate.toFixed(1)}%` }]
            }
        });
    } else {
        setResultOverlay({
            show: true,
            data: {
                type: 'failure',
                title: '외형 변환 실패',
                message: `작업에 실패하여 재료와 마정석만 소모되었습니다.\n외형은 그대로 유지됩니다.`,
                items: [{ label: '결과', after: '실패' }]
            }
        });
    }
    
    onUpdateCharacter(newChar, `[시스템] ${transmuteMode === 'equipment' ? '장비' : transmuteMode === 'monster' ? '몬스터' : transmuteMode === 'companion' ? '동료' : '플레이어'} 외형 변환 시도 (${isSuccess ? '성공' : '실패'}): ${baseName} ← ${materialName} (${transmuteMaterialType})`);
    setTransmuteBaseIdx(null);
    setTransmuteMaterialIdx(null);
    setTransmuteBaseCompanionId(null);
    setTransmuteMaterialCompanionId(null);
    setTransmuteBaseMonsterId(null);
    setTransmuteMaterialMonsterId(null);
    setTransmuteMaterialType(transmuteMode);
  };

  const handleConvertToCustom = () => {
    if (facilityLevel < 5) {
      alert(`커스텀 동료 개조는 연금술 실험실 레벨 5부터 가능합니다. (현재 레벨: Lv.${facilityLevel})`);
      return;
    }

    if (!selectedCustomCompanionId) {
      alert('커스텀 동료로 전환할 대상을 선택해주세요.');
      return;
    }

    const newChar = { ...character };
    if (!newChar.base) return;

    let targetComp: any = null;
    const partyIdx = newChar.companions.findIndex(c => c.id === selectedCustomCompanionId);
    if (partyIdx !== -1) {
      targetComp = newChar.companions[partyIdx];
    } else if (newChar.inactiveCompanions) {
      const inactiveIdx = newChar.inactiveCompanions.findIndex(c => c.id === selectedCustomCompanionId);
      if (inactiveIdx !== -1) {
        targetComp = newChar.inactiveCompanions[inactiveIdx];
      }
    }
    if (!targetComp && newChar.base?.capturedMonsters) {
      const monIdx = newChar.base.capturedMonsters.findIndex(m => m.id === selectedCustomCompanionId);
      if (monIdx !== -1) {
        targetComp = newChar.base.capturedMonsters[monIdx];
      }
    }

    if (!targetComp) {
      alert("대상 동료 또는 몬스터를 찾을 수 없습니다.");
      return;
    }

    if (isEggMonster(targetComp)) {
      alert("부화 중인 알은 커스텀 개조할 수 없습니다. 부화 완료 후 개조해주세요.");
      return;
    }

    const currentManaCrystal = character.base?.resources.manaCrystal || 0;
    
    // 신력 꽃 수량 (영지 자원 및 인벤토리 아이템 합산, 띄어쓰기 유무 상관없이 인식)
    const baseFlowers = (character.base?.resources as any)?.shinryoku_flower || 0;
    const invFlowers = (character.inventory || []).reduce((sum, item) => {
      const cleanName = (item.name || '').replace(/\s+/g, '');
      if (cleanName === "신력꽃" || cleanName === "신력의꽃") {
        return sum + (item.quantity || 1);
      }
      return sum;
    }, 0);
    const currentFlowers = baseFlowers + invFlowers;

    if (currentManaCrystal < CUSTOM_CONVERT_MANA_CRYSTAL) {
      alert(`마정석이 부족합니다. (필요: ${CUSTOM_CONVERT_MANA_CRYSTAL}개, 보유: ${currentManaCrystal}개)`);
      return;
    }

    if (currentFlowers < CUSTOM_CONVERT_FLOWER) {
      alert(`신력 꽃이 부족합니다. (필요: ${CUSTOM_CONVERT_FLOWER}개, 보유: ${currentFlowers}개)`);
      return;
    }

    const isTargetMonster = isMonsterCompanion(targetComp);
    const resolvedVisual = getCompanionDisplayVisualUrl(targetComp);

    // Convert companion / monster status
    if (partyIdx !== -1) {
      newChar.companions = newChar.companions.map(c => 
        c.id === selectedCustomCompanionId ? { 
          ...c, 
          isCustom: true, 
          ...(isTargetMonster ? { isCustomMonster: true } : {}),
          visualUrl: c.visualUrl || resolvedVisual
        } : c
      );
    } else if (newChar.inactiveCompanions) {
      newChar.inactiveCompanions = newChar.inactiveCompanions.map(c => 
        c.id === selectedCustomCompanionId ? { 
          ...c, 
          isCustom: true, 
          ...(isTargetMonster ? { isCustomMonster: true } : {}),
          visualUrl: c.visualUrl || resolvedVisual
        } : c
      );
    }
    if (newChar.base?.capturedMonsters) {
      newChar.base.capturedMonsters = newChar.base.capturedMonsters.map(m =>
        m.id === selectedCustomCompanionId ? { 
          ...m, 
          isCustomMonster: true, 
          isCustom: true,
          visualUrl: (m as any).visualUrl || resolvedVisual
        } : m
      );
    }

    // Deduct Mana Crystal
    newChar.base.resources.manaCrystal -= CUSTOM_CONVERT_MANA_CRYSTAL;

    // Deduct Flowers (영지 자원 우선 차감 후 인벤토리에서 차감)
    let flowersToRemove = CUSTOM_CONVERT_FLOWER;
    if (newChar.base?.resources) {
      const baseCur = (newChar.base.resources as any).shinryoku_flower || 0;
      if (baseCur >= flowersToRemove) {
        (newChar.base.resources as any).shinryoku_flower = baseCur - flowersToRemove;
        flowersToRemove = 0;
      } else {
        (newChar.base.resources as any).shinryoku_flower = 0;
        flowersToRemove -= baseCur;
      }
    }

    if (flowersToRemove > 0) {
      const updatedInventory = [];
      for (const item of newChar.inventory || []) {
        const cleanName = (item.name || '').replace(/\s+/g, '');
        if (flowersToRemove > 0 && (cleanName === "신력꽃" || cleanName === "신력의꽃")) {
          const qty = item.quantity || 1;
          if (qty > flowersToRemove) {
            updatedInventory.push({ ...item, quantity: qty - flowersToRemove });
            flowersToRemove = 0;
          } else {
            flowersToRemove -= qty;
          }
        } else {
          updatedInventory.push(item);
        }
      }
      newChar.inventory = updatedInventory;
    }

    const expResult = applyAlchemyExp(newChar, 250);

    onUpdateCharacter(newChar, `[연금술 개조] ${targetComp.name}이(가) 신비로운 연금술의 힘으로 '커스텀 동료'로 승격되었습니다!`);

    setResultOverlay({
      show: true,
      data: {
        type: 'success',
        title: '커스텀 동료 개조 성공!',
        message: `${targetComp.name}에게 고농축 연금술 비약을 주입하여 '커스텀 동료'로 성공적으로 개조했습니다!\n이제 이름 변경, 이미지 변경, 스킬 장착, 스탯 직접 배분이 자유롭게 가능합니다.`,
        items: [
          { label: '대상', after: targetComp.name },
          { label: '등급 전환', before: '일반 동료', after: '커스텀 동료' },
          { label: '소모 자원', after: `마정석 ${CUSTOM_CONVERT_MANA_CRYSTAL}개 / 신력 꽃 ${CUSTOM_CONVERT_FLOWER}개` },
          ...(expResult.leveledUp ? [{ label: '연금술 숙련도 상승!', after: `Lv.${expResult.oldLevel} -> Lv.${expResult.newLevel}`, color: 'text-yellow-400' }] : [])
        ]
      }
    });

    setSelectedCustomCompanionId(null);
  };

  // BGM helpers
  const allCompanionsList = [
    ...(character.companions || []).map(c => ({ 
      ...c, 
      _inParty: true,
      _isMonster: isMonsterCompanion(c),
      isCustom: Boolean(c.isCustom || (c as any).isCustomMonster)
    })),
    ...(character.inactiveCompanions || []).map(c => ({ 
      ...c, 
      _inParty: false,
      _isMonster: isMonsterCompanion(c),
      isCustom: Boolean(c.isCustom || (c as any).isCustomMonster)
    })),
    ...(character.base?.capturedMonsters || []).filter(m => !isEggMonster(m)).map((m: any) => ({
      ...m,
      _inParty: false,
      _isMonster: true,
      _isCapturedMonster: true,
      isCustom: Boolean((m as any).isCustomMonster || (m as any).isCustom),
      race: '몬스터',
      classType: m.stage || '성장기',
      skills: m.skills || [],
      statPoints: m.statPoints || 0
    }))
  ];

  const currentSelectedBgmEntity = selectedBgmTargetId === 'player'
    ? character
    : allCompanionsList.find(c => c.id === selectedBgmTargetId);

  const currentEntityBgmUrl = selectedBgmTargetId === 'player'
    ? (character.bgmUrl || '')
    : (allCompanionsList.find(c => c.id === selectedBgmTargetId)?.bgmUrl || '');

  // Keep input url synced when selecting a target if input is empty
  useEffect(() => {
    setBgmInputUrl(currentEntityBgmUrl || '');
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    }
  }, [selectedBgmTargetId, currentEntityBgmUrl]);

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("오디오 파일 크기는 15MB 이하를 권장합니다.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setBgmInputUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleAudioPreview = (overrideUrl?: string) => {
    const urlToPlay = overrideUrl || bgmInputUrl || currentEntityBgmUrl;
    if (!urlToPlay) {
      alert("재생할 BGM 음원이 없습니다. 링크를 입력하거나 오디오 파일을 등록해주세요.");
      return;
    }

    if (isPlayingPreview) {
      audioPreviewRef.current?.pause();
      setIsPlayingPreview(false);
    } else {
      if (!audioPreviewRef.current) {
        audioPreviewRef.current = new Audio();
        audioPreviewRef.current.onended = () => setIsPlayingPreview(false);
        audioPreviewRef.current.onerror = () => {
          alert("음원 재생에 실패했습니다. 오디오 링크나 파일이 올바른지 확인해주세요.");
          setIsPlayingPreview(false);
        };
      }
      audioPreviewRef.current.src = urlToPlay;
      audioPreviewRef.current.play().then(() => {
        setIsPlayingPreview(true);
      }).catch(err => {
        console.error("Audio preview failed", err);
        setIsPlayingPreview(false);
      });
    }
  };

  const handleSaveBgm = () => {
    if (!bgmInputUrl.trim()) {
      alert("등록할 BGM URL이나 MP3 파일을 입력해주세요.");
      return;
    }

    if (selectedBgmTargetId === 'player') {
      const updatedChar = { ...character, bgmUrl: bgmInputUrl.trim() };
      onUpdateCharacter(updatedChar, `[시스템] ${character.name}의 전투 등장 BGM이 등록되었습니다.`);
      setResultOverlay({
        show: true,
        data: {
          type: 'success',
          title: '등장 BGM 등록 완료',
          message: `${character.name}(플레이어)의 전투 등장 테마곡이 성공적으로 등록되었습니다.\n전투 시 본인의 턴에 해당 BGM이 재생됩니다.`,
          items: [{ label: '대상', after: `${character.name} (플레이어)` }, { label: 'BGM 음원', after: '등록 완료' }]
        }
      });
    } else {
      const targetComp = allCompanionsList.find(c => c.id === selectedBgmTargetId);
      if (!targetComp) return;
      if (!targetComp.isCustom) {
        alert("일반 개체는 등장 BGM을 등록할 수 없습니다. 커스텀 동료 및 커스텀 몬스터만 가능합니다.");
        return;
      }
      const updatedCompanions = (character.companions || []).map(c => c.id === targetComp.id ? { ...c, bgmUrl: bgmInputUrl.trim() } : c);
      const updatedInactive = (character.inactiveCompanions || []).map(c => c.id === targetComp.id ? { ...c, bgmUrl: bgmInputUrl.trim() } : c);
      const updatedCaptured = (character.base?.capturedMonsters || []).map((m: any) => m.id === targetComp.id ? { ...m, bgmUrl: bgmInputUrl.trim() } : m);
      const newBase = character.base ? { ...character.base, capturedMonsters: updatedCaptured } : character.base;
      const updatedChar = { ...character, companions: updatedCompanions, inactiveCompanions: updatedInactive, base: newBase };
      const isMon = targetComp._isMonster || isMonsterCompanion(targetComp);
      onUpdateCharacter(updatedChar, `[시스템] ${targetComp.name}의 전투 등장 BGM이 등록되었습니다.`);
      setResultOverlay({
        show: true,
        data: {
          type: 'success',
          title: '등장 BGM 등록 완료',
          message: `${targetComp.name}(${isMon ? '커스텀 몬스터' : '커스텀 동료'})의 전투 등장 테마곡이 성공적으로 등록되었습니다.\n전투 시 해당 개체의 턴에 BGM이 재생됩니다.`,
          items: [{ label: '대상', after: `${targetComp.name} (${isMon ? '커스텀 몬스터' : '커스텀 동료'})` }, { label: 'BGM 음원', after: '등록 완료' }]
        }
      });
    }
  };

  const handleRemoveBgm = () => {
    if (selectedBgmTargetId === 'player') {
      const updatedChar = { ...character, bgmUrl: undefined };
      onUpdateCharacter(updatedChar, `[시스템] ${character.name}의 등장 BGM이 해제되었습니다.`);
      setBgmInputUrl('');
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        setIsPlayingPreview(false);
      }
    } else {
      const targetComp = allCompanionsList.find(c => c.id === selectedBgmTargetId);
      if (!targetComp) return;
      const updatedCompanions = (character.companions || []).map(c => c.id === targetComp.id ? { ...c, bgmUrl: undefined } : c);
      const updatedInactive = (character.inactiveCompanions || []).map(c => c.id === targetComp.id ? { ...c, bgmUrl: undefined } : c);
      const updatedCaptured = (character.base?.capturedMonsters || []).map((m: any) => m.id === targetComp.id ? { ...m, bgmUrl: undefined } : m);
      const newBase = character.base ? { ...character.base, capturedMonsters: updatedCaptured } : character.base;
      const updatedChar = { ...character, companions: updatedCompanions, inactiveCompanions: updatedInactive, base: newBase };
      onUpdateCharacter(updatedChar, `[시스템] ${targetComp.name}의 등장 BGM이 해제되었습니다.`);
      setBgmInputUrl('');
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        setIsPlayingPreview(false);
      }
    }
  };

  // 몬스터 등급에 따른 신력 계통 변환 필요 조각 수 계산
  const getMonsterShinryokuShardRequirement = (monster: any): number => {
    const stage = monster?.monsterData?.stage || monster?.stage || monster?.classType || '';
    if (stage.includes('유년기') || stage.includes('Baby')) return 50;
    if (stage.includes('성장기') || stage.includes('Child')) return 100;
    if (stage.includes('성숙기') || stage.includes('Adult')) return 200;
    if (stage.includes('완전체') || stage.includes('Perfect')) return 400;
    if (stage.includes('궁극체') || stage.includes('Ultimate')) return 800;
    if (stage.includes('초궁극체') || stage.includes('Super')) return 1500;
    const lvl = monster?.level || 1;
    if (lvl < 20) return 50;
    if (lvl < 50) return 100;
    if (lvl < 100) return 200;
    if (lvl < 300) return 400;
    if (lvl < 1000) return 800;
    return 1500;
  };

  // 기지 자원 신력계통조각 및 인벤토리 보유량 계산
  const getShinryokuShardsCount = (char: Character, shinryokuType?: string): number => {
    const baseShards = (char.base?.resources as any)?.shinryoku_shard || 0;
    const invShards = (char.inventory || []).reduce((sum, item) => {
      const name = (item.name || '').replace(/\s+/g, '');
      const cleanType = (shinryokuType || '').replace(/\s+/g, '');
      if (cleanType && name === `${cleanType}조각`) {
        return sum + (item.quantity || 1);
      }
      if (name === '신력조각' || name === '신력의조각' || name === '신력파편' || name === '신력계통조각') {
        return sum + (item.quantity || 1);
      }
      return sum;
    }, 0);
    return baseShards + invShards;
  };

  // 커스텀 몬스터의 신력계통 속성 변환 실행
  const handleTransformMonsterShinryoku = () => {
    if (!selectedCustomCompanionId) return;
    const allCompanions = [
      ...(character.companions || []).map(c => ({ ...c, _inParty: true, _isMonster: isMonsterCompanion(c) })),
      ...(character.inactiveCompanions || []).map(c => ({ ...c, _inParty: false, _isMonster: isMonsterCompanion(c) })),
      ...(character.base?.capturedMonsters || []).filter(m => !isEggMonster(m)).map((m: any) => ({
        ...m,
        isCustom: Boolean((m as any).isCustomMonster || (m as any).isCustom),
        _inParty: false,
        _isMonster: true,
        _isCapturedMonster: true
      }))
    ];
    const target = allCompanions.find(c => c.id === selectedCustomCompanionId);
    if (!target) return;
    if (!target.isCustom) {
      alert("신력 계통 속성 변환은 '커스텀 몬스터'만 가능합니다.");
      return;
    }
    if (target.shinryokuType === targetMonsterShinryoku) {
      alert(`이미 ${targetMonsterShinryoku} 속성을 보유하고 있습니다.`);
      return;
    }

    const reqShards = getMonsterShinryokuShardRequirement(target);
    const availableShards = getShinryokuShardsCount(character, targetMonsterShinryoku);

    if (availableShards < reqShards) {
      alert(`신력 계통 조각이 부족합니다.\n필요: 신력계통조각 ${reqShards}개\n보유: ${availableShards}개`);
      return;
    }

    // 1차: 기지 자원 신력계통조각 차감
    let remainingToDeduct = reqShards;
    let currentBaseShards = (character.base?.resources as any)?.shinryoku_shard || 0;
    let newBaseResources = { ...(character.base?.resources || {}) };

    if (currentBaseShards > 0 && remainingToDeduct > 0) {
      const deductFromBase = Math.min(currentBaseShards, remainingToDeduct);
      (newBaseResources as any).shinryoku_shard = currentBaseShards - deductFromBase;
      remainingToDeduct -= deductFromBase;
    }

    // 2차: 인벤토리 조각 차감
    const newInventory: typeof character.inventory = [];
    if (remainingToDeduct > 0) {
      const cleanTargetType = targetMonsterShinryoku.replace(/\s+/g, '');
      for (const item of character.inventory || []) {
        const name = (item.name || '').replace(/\s+/g, '');
        if (remainingToDeduct > 0 && (name === `${cleanTargetType}조각` || name === '신력조각' || name === '신력의조각' || name === '신력파편' || name === '신력계통조각')) {
          const qty = item.quantity || 1;
          if (qty <= remainingToDeduct) {
            remainingToDeduct -= qty;
          } else {
            newInventory.push({ ...item, quantity: qty - remainingToDeduct });
            remainingToDeduct = 0;
          }
        } else {
          newInventory.push(item);
        }
      }
    } else {
      newInventory.push(...(character.inventory || []));
    }

    // 대상 몬스터 속성 업데이트
    const prevShinryoku = target.shinryokuType || '무속성';
    const updatedCompanions = (character.companions || []).map(c => c.id === target.id ? { ...c, shinryokuType: targetMonsterShinryoku } : c);
    const updatedInactive = (character.inactiveCompanions || []).map(c => c.id === target.id ? { ...c, shinryokuType: targetMonsterShinryoku } : c);
    const updatedCaptured = (character.base?.capturedMonsters || []).map((m: any) => m.id === target.id ? { ...m, shinryokuType: targetMonsterShinryoku } : m);

    const newChar: Character = {
      ...character,
      inventory: newInventory,
      companions: updatedCompanions,
      inactiveCompanions: updatedInactive,
      base: character.base ? { ...character.base, resources: newBaseResources as any, capturedMonsters: updatedCaptured } : character.base
    };

    const expResult = applyAlchemyExp(newChar, 250);
    onUpdateCharacter(newChar, `[시스템] 커스텀 몬스터 ${target.name}의 신력 계통이 [${prevShinryoku}]에서 [${targetMonsterShinryoku}](으)로 변환되었습니다! (신력계통조각 ${reqShards}개 소모)`);

    setResultOverlay({
      show: true,
      data: {
        type: 'success',
        title: '커스텀 몬스터 신력 계통 속성 변환 성공!',
        message: `${target.name}의 신력 계통 속성이 [${targetMonsterShinryoku}](으)로 연금술 변환되었습니다.`,
        items: [
          { label: '대상 커스텀 몬스터', after: target.name },
          { label: '신력 계통 변환', before: prevShinryoku, after: targetMonsterShinryoku },
          { label: '소모 재료', after: `기지 자원 신력계통조각 ${reqShards}개` },
          ...(expResult.leveledUp ? [{ label: '연금술 숙련도 상승!', after: `Lv.${expResult.oldLevel} -> Lv.${expResult.newLevel}`, color: 'text-yellow-400' }] : [])
        ]
      }
    });
  };

  const handleExecuteMonsterShinryokuTransform = () => {
    const allMonstersForTransform = [
        ...(character.base?.capturedMonsters || []).filter(m => !isEggMonster(m)).map((m: any) => ({
            ...m,
            _inParty: false,
            _isMonster: true,
            _isCapturedMonster: true,
            isCustom: Boolean(m.isCustomMonster || m.isCustom),
            race: '몬스터',
            stage: m.stage || m.monsterData?.stage || '성장기',
            level: m.level || 1
        })),
        ...(character.companions || []).filter(c => isMonsterCompanion(c)).map(c => ({
            ...c,
            _inParty: true,
            _isMonster: true,
            isCustom: Boolean(c.isCustom || (c as any).isCustomMonster),
            stage: (c as any).stage || '성장기',
            level: c.level || 1
        })),
        ...(character.inactiveCompanions || []).filter(c => isMonsterCompanion(c)).map(c => ({
            ...c,
            _inParty: false,
            _isMonster: true,
            isCustom: Boolean(c.isCustom || (c as any).isCustomMonster),
            stage: (c as any).stage || '성장기',
            level: c.level || 1
        }))
    ].filter(m => Boolean(m.isCustom));

    const targetMon = allMonstersForTransform.find(m => m.id === selectedTransformMonsterId) || allMonstersForTransform[0];
    if (!targetMon) {
      alert("속성을 변환할 커스텀 몬스터가 없습니다.");
      return;
    }
    if (!targetMon.isCustom) {
      alert("속성 변환은 커스텀 몬스터만 가능합니다.");
      return;
    }

    const currentType = targetMon.shinryokuType || '무속성';
    if (currentType === monsterTransformTargetShinryoku) {
      alert(`이미 ${monsterTransformTargetShinryoku} 속성을 보유하고 있습니다.`);
      return;
    }

    const reqShards = getMonsterShinryokuShardRequirement(targetMon);
    const availableShards = getShinryokuShardsCount(character, monsterTransformTargetShinryoku);

    if (availableShards < reqShards) {
      alert(`기지 자원 신력계통조각이 부족합니다.\n필요: 신력계통조각 ${reqShards}개\n보유: ${availableShards}개`);
      return;
    }

    // 1차: 기지 자원 신력계통조각 차감
    let remainingToDeduct = reqShards;
    let currentBaseShards = (character.base?.resources as any)?.shinryoku_shard || 0;
    let newBaseResources = { ...(character.base?.resources || {}) };

    if (currentBaseShards > 0 && remainingToDeduct > 0) {
      const deductFromBase = Math.min(currentBaseShards, remainingToDeduct);
      (newBaseResources as any).shinryoku_shard = currentBaseShards - deductFromBase;
      remainingToDeduct -= deductFromBase;
    }

    // 2차: 인벤토리 조각 차감
    const newInventory: typeof character.inventory = [];
    if (remainingToDeduct > 0) {
      const cleanTargetType = monsterTransformTargetShinryoku.replace(/\s+/g, '');
      for (const item of character.inventory || []) {
        const name = (item.name || '').replace(/\s+/g, '');
        if (remainingToDeduct > 0 && (name === `${cleanTargetType}조각` || name === '신력조각' || name === '신력의조각' || name === '신력파편' || name === '신력계통조각')) {
          const qty = item.quantity || 1;
          if (qty <= remainingToDeduct) {
            remainingToDeduct -= qty;
          } else {
            newInventory.push({ ...item, quantity: qty - remainingToDeduct });
            remainingToDeduct = 0;
          }
        } else {
          newInventory.push(item);
        }
      }
    } else {
      newInventory.push(...(character.inventory || []));
    }

    const updateData = {
      shinryokuType: monsterTransformTargetShinryoku
    };

    const updatedCompanions = (character.companions || []).map(c => c.id === targetMon.id ? { ...c, ...updateData } : c);
    const updatedInactive = (character.inactiveCompanions || []).map(c => c.id === targetMon.id ? { ...c, ...updateData } : c);
    const updatedCaptured = (character.base?.capturedMonsters || []).map((m: any) => m.id === targetMon.id ? { ...m, ...updateData } : m);

    const newChar: Character = {
      ...character,
      inventory: newInventory,
      companions: updatedCompanions,
      inactiveCompanions: updatedInactive,
      base: character.base ? { ...character.base, resources: newBaseResources as any, capturedMonsters: updatedCaptured } : character.base
    };

    const expResult = applyAlchemyExp(newChar, 300);
    onUpdateCharacter(newChar, `[연금술실] 커스텀 몬스터 ${targetMon.name}의 신력 계통이 [${currentType}]에서 [${monsterTransformTargetShinryoku}](으)로 변환되었습니다! (기지 신력계통조각 ${reqShards}개 소모)`);

    setResultOverlay({
      show: true,
      data: {
        type: 'success',
        title: '커스텀 몬스터 신력 계통 속성 변환 성공!',
        message: `${targetMon.name}의 신력 계통 속성이 [${monsterTransformTargetShinryoku}](으)로 연금술 정제 변환되었습니다.`,
        items: [
          { label: '대상 커스텀 몬스터', after: targetMon.name },
          { label: '기존 속성', before: currentType, after: monsterTransformTargetShinryoku },
          { label: '소모 재료', after: `기지 자원 신력계통조각 ${reqShards}개` },
          ...(expResult.leveledUp ? [{ label: '연금술 숙련도 상승!', after: `Lv.${expResult.oldLevel} -> Lv.${expResult.newLevel}`, color: 'text-yellow-400' }] : [])
        ]
      }
    });
  };

  // Cleanup audio preview when activeTab changes or unmount
  useEffect(() => {
    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current = null;
      }
      setIsPlayingPreview(false);
    };
  }, [activeTab]);

  const dismantleGroups = getDismantleGroups();
  const selectedGroup = selectedDismantleGroupIdx !== null ? dismantleGroups[selectedDismantleGroupIdx] : null;

  return (
    <div className="absolute inset-0 bg-slate-950 flex flex-col z-50 animate-in fade-in zoom-in-95">
        {resultOverlay.show && <ActionResultModal data={resultOverlay.data} onClose={() => setResultOverlay({ show: false, data: null })} />}
        
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-purple-500/30 bg-purple-950/20 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <h2 className="text-base sm:text-xl font-bold text-purple-300 font-cinzel flex items-center">
                    <FlaskConical className="mr-1.5 sm:mr-2 text-purple-400" size={20}/> 연금술 실험실 <span className="ml-2 text-[11px] sm:text-xs bg-purple-900/60 border border-purple-500/40 px-2 py-0.5 rounded-md text-purple-200">Lv.{facilityLevel}</span>
                </h2>
                {onFacilityUpgrade && facilityLevel < 5 && (
                    <button 
                        onClick={() => onFacilityUpgrade('alchemy', instanceId)}
                        className="px-2.5 py-1 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs font-bold flex items-center transition-all shadow-md shadow-green-900/20"
                    >
                        <ArrowUpCircle size={13} className="mr-1"/> 레벨업
                    </button>
                )}
                {allAlchemists.length > 0 && (
                    <button 
                        onClick={() => setIsMasteryModalOpen(true)}
                        className={`px-2.5 py-1 text-white rounded-lg text-xs font-bold flex items-center transition-all shadow-md ${
                            hasPromotableAlchemist 
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-900/40 border border-purple-400 animate-pulse' 
                                : 'bg-purple-700 hover:bg-purple-600 shadow-purple-900/20'
                        }`}
                    >
                        <User className="mr-1" size={13}/>
                        <span>연금술사 승급 및 관리</span>
                        {hasPromotableAlchemist && (
                            <span className="ml-1.5 px-1 py-0.2 bg-amber-400 text-slate-950 text-[9px] font-black rounded-full">
                                승급 가능
                            </span>
                        )}
                    </button>
                )}
            </div>
            <button onClick={onClose} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors ml-auto">
                <X size={18} className="sm:w-5 sm:h-5" />
            </button>
        </div>

        {/* Shards (Expanded View) */}
        <div className="flex items-center space-x-2 bg-slate-900 border-b border-slate-800 p-2 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-indigo-400 font-bold text-[10px] flex items-center mr-1 whitespace-nowrap"><Layers size={10} className="mr-1"/>신력계 조각:</span>
            {SHINRYOKU_TYPES_LIST.map(type => {
                const count = character.base?.elementalShards?.[type] || 0;
                const Icon = ELEMENT_ICONS[type] || Sparkles;
                const styleClass = count > 0 ? "bg-slate-800 text-slate-200 border-slate-600" : "bg-slate-950 text-slate-600 border-slate-800 opacity-70";
                return (
                    <div key={type} className={`flex items-center px-1.5 py-0.5 rounded border text-[9px] ${styleClass}`} title={type}>
                        <Icon size={8} className="mr-1"/>
                        {count}
                    </div>
                )
            })}
        </div>

        {/* Resource Bar */}
        <div className="bg-slate-900 p-2 border-b border-slate-800 flex gap-4 overflow-x-auto text-xs font-mono custom-scrollbar items-center">
            <span className="text-green-400 flex items-center shrink-0"><Leaf size={12} className="mr-1"/> 약초: {character.base?.resources.herbs || 0}</span>
            <span className="text-purple-400 flex items-center shrink-0"><Zap size={12} className="mr-1"/> 마정석: {character.base?.resources.manaCrystal || 0}</span>
            <span className="text-indigo-400 flex items-center shrink-0"><Mountain size={12} className="mr-1"/> 마석: {character.base?.resources.manaStone || 0}</span>
            
            {/* Crystals */}
            <div className="flex items-center space-x-3 border-l border-slate-700 pl-2 ml-2 shrink-0">
                <span className="text-slate-400 flex items-center"><Gem size={10} className="mr-1 text-slate-500"/>N: {character.base?.resources.normalCrystal}</span>
                <span className="text-blue-400 flex items-center"><Gem size={10} className="mr-1"/>M: {character.base?.resources.magicCrystal}</span>
                <span className="text-yellow-400 flex items-center"><Gem size={10} className="mr-1"/>R: {character.base?.resources.rareCrystal}</span>
                <span className="text-purple-400 flex items-center"><Gem size={10} className="mr-1"/>E: {character.base?.resources.epicCrystal}</span>
                <span className="text-pink-400 flex items-center"><Gem size={10} className="mr-1"/>U: {character.base?.resources.uniqueCrystal}</span>
                <span className="text-amber-500 flex items-center"><Gem size={10} className="mr-1"/>L: {character.base?.resources.legendaryCrystal}</span>
            </div>
            <div className="flex items-center gap-2 text-indigo-400 font-bold border-l border-slate-700 pl-4 ml-auto shrink-0">
                <TrendingUp size={14} />
                {alchemyRankLabel} (Lv.{alchemyLevel}) : {alchemyExp} / {alchemyMaxExp}
            </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 shrink-0 overflow-x-auto no-scrollbar">
            <button onClick={() => setIsCraftModalOpen(true)} className="flex-1 min-w-[110px] sm:min-w-[125px] py-2.5 sm:py-3 text-xs sm:text-sm font-bold flex items-center justify-center transition-colors whitespace-nowrap bg-purple-900/40 text-purple-300 hover:bg-purple-900/60 border-b-2 border-purple-400"><Users size={16} className="mr-1.5 sm:mr-2 text-purple-400"/> 연금술사 의뢰</button>
            <button onClick={() => setActiveTab('craft')} className={`flex-1 min-w-[90px] sm:min-w-[100px] py-2.5 sm:py-3 text-xs sm:text-sm font-bold flex items-center justify-center transition-colors whitespace-nowrap ${activeTab === 'craft' ? 'text-purple-400 border-b-2 border-purple-500 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}><FlaskConical size={16} className="mr-1.5 sm:mr-2"/> 포션 제작</button>
            <button onClick={() => setActiveTab('convert')} className={`flex-1 min-w-[90px] sm:min-w-[100px] py-2.5 sm:py-3 text-xs sm:text-sm font-bold flex items-center justify-center transition-colors whitespace-nowrap ${activeTab === 'convert' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}><RefreshCw size={16} className="mr-1.5 sm:mr-2"/> 재료 변환</button>
            <button onClick={() => setActiveTab('imbue')} className={`flex-1 min-w-[90px] sm:min-w-[100px] py-2.5 sm:py-3 text-xs sm:text-sm font-bold flex items-center justify-center transition-colors whitespace-nowrap ${activeTab === 'imbue' ? 'text-amber-400 border-b-2 border-amber-500 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}><Sparkles size={16} className="mr-1.5 sm:mr-2"/> 속성 부여</button>
            <button onClick={() => setActiveTab('monsterShinryoku')} className={`flex-1 min-w-[110px] sm:min-w-[130px] py-2.5 sm:py-3 text-xs sm:text-sm font-bold flex items-center justify-center transition-colors whitespace-nowrap ${activeTab === 'monsterShinryoku' ? 'text-rose-400 border-b-2 border-rose-500 bg-slate-800 shadow-md ring-1 ring-rose-500/20' : 'text-rose-300/80 hover:text-rose-200 bg-rose-950/20 border-b-2 border-transparent hover:border-rose-500/40'}`}>
                <Flame size={16} className="mr-1.5 sm:mr-2 text-rose-400 animate-pulse"/> 몬스터 속성 변환
            </button>
            <button onClick={() => setActiveTab('inherit')} className={`flex-1 min-w-[90px] sm:min-w-[100px] py-2.5 sm:py-3 text-xs sm:text-sm font-bold flex items-center justify-center transition-colors whitespace-nowrap ${activeTab === 'inherit' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}><Layers size={16} className="mr-1.5 sm:mr-2"/> 옵션 계승</button>
            <button onClick={() => setActiveTab('produce')} className={`flex-1 min-w-[90px] sm:min-w-[100px] py-2.5 sm:py-3 text-xs sm:text-sm font-bold flex items-center justify-center transition-colors whitespace-nowrap ${activeTab === 'produce' ? 'text-green-400 border-b-2 border-green-500 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}><Atom size={16} className="mr-1.5 sm:mr-2"/> 마정석 생산</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-slate-900 custom-scrollbar relative">
            
            {/* CRAFT TAB */}
            {activeTab === 'craft' && (
                <div className="max-w-3xl mx-auto space-y-6">
                    {/* 진행 중인 조제 작업 (완료 시 수령) */}
                    {(() => {
                        const selfCraftMissions = (character.base?.dispatched || []).filter(
                            m => m.missionType === 'AlchemyCrafting' && (m as any).craftMetadata?.isSelfCraft
                        );
                        if (selfCraftMissions.length === 0) return null;
                        return (
                            <div className="bg-slate-800/90 border border-purple-500/40 rounded-xl p-4 space-y-3 shadow-lg">
                                <div className="flex items-center justify-between border-b border-purple-900/50 pb-2">
                                    <span className="text-sm font-bold text-purple-300 flex items-center gap-1.5">
                                        <Clock size={16} className="text-purple-400" />
                                        진행 중인 연금술 조제 작업 ({selfCraftMissions.length})
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                        시간 경과 후 completion 시 수령 가능
                                    </span>
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                    {selfCraftMissions.map(m => {
                                        const meta = (m as any).craftMetadata || {};
                                        const isReady = character.currentDate && character.currentDate >= m.expectedReturnDate;
                                        return (
                                            <div key={m.id} className="bg-slate-900/80 p-3 rounded-lg border border-slate-700/60 flex items-center justify-between text-xs">
                                                <div className="space-y-0.5">
                                                    <div className="font-bold text-slate-200 flex items-center gap-2">
                                                        <span>{meta.finalName || '연금술 시약'} x{meta.craftQuantity || 1}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/50">
                                                            {meta.recipeRarity || meta.potionRarity || 'Normal'}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                                        <span>예상 성공률: {Math.floor(m.successRate || 100)}%</span>
                                                        <span>•</span>
                                                        <span>완료 예정일: {m.expectedReturnDate}</span>
                                                    </div>
                                                </div>
                                                {isReady ? (
                                                    <button
                                                        onClick={() => handleClaimCraft(m)}
                                                        className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg shadow transition-all flex items-center gap-1 text-xs"
                                                    >
                                                        <Sparkles size={13} />
                                                        완성품 수령
                                                    </button>
                                                ) : (
                                                    <div className="px-3 py-1 bg-slate-800 text-amber-400 border border-amber-900/40 rounded-lg text-[11px] flex items-center gap-1 font-mono">
                                                        <Clock size={12} />
                                                        조제 진행 중...
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs text-purple-400 font-bold block mb-1">포션 종류</label>
                            <select className="w-full bg-slate-800 border border-purple-500/30 rounded p-2 text-sm text-slate-200" value={potionType} onChange={(e) => setPotionType(e.target.value as any)}>
                                <option value="HP">HP 회복</option>
                                <option value="MP">MP 회복</option>
                                <option value="FATIGUE">피로회복제</option>
                                <option value="BUFF">버프 (능력치)</option>
                                <option value="CURE">해독제 (상태이상)</option>
                                <option value="MIX">복합 포션 (Special)</option>
                                <option value="SCROLL" disabled={alchemyLevel < 100}>주문서 (이동/방어/속성저항) {alchemyLevel < 100 ? '(대현자 전용)' : ''}</option>
                                <option value="NET" disabled={alchemyLevel < 100}>포획 그물 {alchemyLevel < 100 ? '(대현자 전용)' : ''}</option>
                                <option value="SPECIAL_SCROLL" disabled={alchemyLevel < 100}>특수 주문서 (Reset/Name) {alchemyLevel < 100 ? '(대현자 전용)' : ''}</option>
                            </select>
                        </div>
                        {potionType !== 'MIX' && (potionType !== 'SCROLL' || scrollType !== 'TELEPORT') && potionType !== 'NET' && potionType !== 'SPECIAL_SCROLL' && (
                            <div>
                                <label className="text-xs text-purple-400 font-bold block mb-1">등급 (Rarity)</label>
                                <select className="w-full bg-slate-800 border border-purple-500/30 rounded p-2 text-sm text-slate-200" value={potionRarity} onChange={(e) => setPotionRarity(e.target.value as any)}>
                                    {Object.values(ItemRarity).filter(r => {
                                        if (potionType === 'BUFF' && (buffStat === '무기숙련도' || buffStat === '스킬숙련도')) {
                                            return r === ItemRarity.UNIQUE || r === ItemRarity.EPIC || r === ItemRarity.LEGENDARY || r === ItemRarity.MYTHTIC;
                                        }
                                        return r !== ItemRarity.MYTHTIC;
                                    }).map(r => {
                                        const locked = !canCraftRarity(r);
                                        return (
                                            <option key={r} value={r} disabled={locked}>
                                                {r} {locked ? `(연금술 Lv.${RARITY_LEVEL_REQ[r]} 필요)` : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        )}
                        {potionType === 'SCROLL' && scrollType === 'TELEPORT' && (
                            <div>
                                <label className="text-xs text-cyan-400 font-bold block mb-1">주문서 등급</label>
                                <div className="w-full bg-slate-800 border border-cyan-500/30 rounded p-2 text-sm text-cyan-300 font-bold flex items-center justify-between">
                                    <span>마법 (Magic)</span>
                                    <span className="text-[10px] text-slate-400">고정 등급</span>
                                </div>
                            </div>
                        )}
                        {potionType === 'NET' && (
                            <div>
                                <label className="text-xs text-purple-400 font-bold block mb-1">그물 등급</label>
                                <select className="w-full bg-slate-800 border border-purple-500/30 rounded p-2 text-sm text-slate-200" value={potionRarity} onChange={(e) => setPotionRarity(e.target.value as any)}>
                                    {Object.values(ItemRarity).filter(r => r !== ItemRarity.MYTHTIC).map(r => {
                                        const locked = !canCraftRarity(r);
                                        return (
                                            <option key={r} value={r} disabled={locked}>
                                                {r} {locked ? `(연금술 Lv.${RARITY_LEVEL_REQ[r]} 필요)` : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        )}
                        {potionType === 'SPECIAL_SCROLL' && (
                            <div>
                                <label className="text-xs text-purple-400 font-bold block mb-1">주문서 종류</label>
                                <select className="w-full bg-slate-800 border border-purple-500/30 rounded p-2 text-sm text-slate-200" value={specialScrollType} onChange={(e) => setSpecialScrollType(e.target.value as any)}>
                                    {Object.entries(SPECIAL_SCROLL_CONFIG).map(([key, cfg]) => (
                                        <option key={key} value={key}>{cfg.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {potionType === 'MIX' && (
                            <div>
                                <label className="text-xs text-amber-400 font-bold block mb-1">복합 종류 (등급 고정)</label>
                                {facilityLevel < 5 ? (
                                    <div className="w-full bg-red-900/20 border border-red-500/30 rounded p-2 text-sm text-red-400 flex items-center justify-center">
                                        <Lock size={14} className="mr-1"/> Lv.5 해금
                                    </div>
                                ) : (
                                    <select className="w-full bg-slate-800 border border-amber-500/30 rounded p-2 text-sm text-slate-200" value={mixType} onChange={(e) => setMixType(e.target.value as any)}>
                                        <option value="ELIXIR">엘릭서 [희귀 (Rare)]</option>
                                        <option value="PHINIX">피닉스의 깃털 [희귀 (Rare)]</option>
                                        <option value="POWER_ELIXIR">파워엘릭서 [유일 (Unique)]</option>
                                        <option value="STONE">부활의 영약 [희귀 (Rare)]</option>
                                        <option value="PANACEA">만병통치약 [영웅 (Epic)]</option>
                                        <option value="GODLY">신의 약 [전설 (Legendary)]</option>
                                    </select>
                                )}
                            </div>
                        )}
                        
                        <div>
                            <label className="text-xs text-slate-400 font-bold block mb-1">제작 수량 ({craftQuantity})</label>
                            <input 
                                type="range" min="1" max="50" 
                                value={craftQuantity} onChange={(e) => setCraftQuantity(parseInt(e.target.value))}
                                className="w-full accent-purple-500 h-2 bg-slate-700 rounded-lg cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-2">
                            <h4 className="text-sm font-bold text-slate-300">세부 설정</h4>
                            <span className="text-xs text-slate-500">예상 결과: {getPotionDefaults().defaultName} x{craftQuantity}</span>
                        </div>

                        {potionType === 'SCROLL' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1 font-bold">주문서 종류 선택</label>
                                    <select 
                                        className="w-full bg-slate-800 border border-purple-500/30 rounded p-2 text-sm text-slate-200"
                                        value={scrollType}
                                        onChange={(e) => setScrollType(e.target.value as any)}
                                    >
                                        <option value="TELEPORT">차원이동 주문서 (기지 귀환)</option>
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
                            </div>
                        )}

                        {potionType === 'BUFF' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1 font-bold">타겟 능력치</label>
                                    <select className="w-full bg-slate-800 border border-purple-500/30 rounded p-2 text-sm text-slate-200" value={buffStat} onChange={(e) => {
                                        const nextStat = e.target.value;
                                        setBuffStat(nextStat);
                                        const isTime = ['경험치', '골드', '드롭률', '무기숙련도', '스킬숙련도'].includes(nextStat);
                                        if (isTime) {
                                            setPotionDurationOption(600);
                                        } else {
                                            setPotionDurationOption(10);
                                        }
                                        if ((nextStat === '무기숙련도' || nextStat === '스킬숙련도') && (potionRarity === ItemRarity.NORMAL || potionRarity === ItemRarity.MAGIC || potionRarity === ItemRarity.RARE)) {
                                            setPotionRarity(ItemRarity.EPIC);
                                        }
                                    }}>
                                        {['경험치', '골드', '드롭률', '무기숙련도', '스킬숙련도', 'STR', 'INT', 'WIS', 'DEF', 'AGI', 'CTRL', '물리명중률', '마법명중률', '물리공격력','마법공격력','치명타율','상태이상 저항률','물리방어력','마법방어력']
                                            .map(s => <option key={s} value={s}>{s}</option>)
                                        }
                                    </select>
                                    <p className="text-[10px] text-green-400 mt-1">
                                        * 효과: {
                                            buffStat === '경험치' 
                                                ? `${XP_POTION_MULT[potionRarity] || 1.5}배 증가` 
                                                : buffStat === '골드'
                                                ? `${XP_POTION_MULT[potionRarity] || 1.5}배 증가`
                                                : (buffStat === '무기숙련도' || buffStat === '스킬숙련도')
                                                ? `${potionRarity === ItemRarity.MYTHTIC ? 5.0 : potionRarity === ItemRarity.LEGENDARY ? 3.0 : 2.0}배 증가 (유니크 2x / 전설 3x / 신화 5x)`
                                                : buffStat === '드롭률'
                                                ? `${(potionRarity === ItemRarity.NORMAL ? 1.2 : potionRarity === ItemRarity.MAGIC ? 1.5 : potionRarity === ItemRarity.RARE ? 2.0 : potionRarity === ItemRarity.UNIQUE ? 3.0 : potionRarity === ItemRarity.EPIC ? 4.0 : potionRarity === ItemRarity.LEGENDARY ? 5.0 : 5.0)}배 증가`
                                                : `${BUFF_POTION_VAL[potionRarity]}% 증가`
                                        }
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 block mb-1 font-bold">
                                        {['경험치', '골드', '드롭률', '무기숙련도', '스킬숙련도'].includes(buffStat) ? '비약 지속시간 선택 (시간제)' : '비약 지속턴 선택 (턴제)'}
                                    </label>
                                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                                        {(['경험치', '골드', '드롭률', '무기숙련도', '스킬숙련도'].includes(buffStat) ? [
                                            { dur: 600, label: '10분', sub: '기본 재료' },
                                            { dur: 1800, label: '30분', sub: '재료 2.5배' },
                                            { dur: 3600, label: '1시간', sub: '재료 4.5배' }
                                        ] : [
                                            { dur: 5, label: '5턴', sub: '기본 재료' },
                                            { dur: 10, label: '10턴', sub: '재료 2.5배' },
                                            { dur: 15, label: '15턴', sub: '재료 4.5배' }
                                        ]).map(item => (
                                            <button
                                                key={item.dur}
                                                type="button"
                                                onClick={() => setPotionDurationOption(item.dur)}
                                                className={`py-2 px-1 sm:px-3 rounded-lg border text-center transition-all flex flex-col items-center justify-center ${
                                                    potionDurationOption === item.dur
                                                        ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-md shadow-purple-950/50 ring-1 ring-purple-400'
                                                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-750 hover:text-slate-200'
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

                        {potionType === 'CURE' && (
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">
                                    해제 대상 선택 (최대 {CURE_CONFIG[potionRarity].count}개)
                                    <span className="text-[10px] text-blue-400 ml-2">해제 확률: {CURE_CONFIG[potionRarity].chance}%</span>
                                </label>
                                <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto custom-scrollbar bg-black/20 p-2 rounded">
                                    {CURE_CONFIG[potionRarity].allowed.map(ailment => {
                                        const isSelected = selectedCureAilments.includes(ailment);
                                        const isMax = selectedCureAilments.length >= CURE_CONFIG[potionRarity].count;
                                        return (
                                            <button 
                                                key={ailment}
                                                onClick={() => toggleCureSelection(ailment, CURE_CONFIG[potionRarity].count)}
                                                disabled={!isSelected && isMax}
                                                className={`text-[10px] py-1 px-2 rounded border transition-all ${isSelected ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'} disabled:opacity-30`}
                                            >
                                                {ailment}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-xs text-slate-400 block mb-1">이름 지정 (선택)</label>
                            <input 
                                type="text" 
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 placeholder-slate-600 focus:border-purple-500 outline-none"
                                placeholder={getPotionDefaults().defaultName}
                                value={customPotionName}
                                onChange={(e) => setCustomPotionName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <h4 className="text-sm font-bold text-slate-400 mb-2">필요 재료 (총합)</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            {(() => {
                                const r = getPotionRecipe();
                                const coef = getRarityCoef(r.rarity);
                                let baseChance = 100 - (8 * coef);
                                if(potionType === 'MIX') baseChance = 50 + (facilityLevel * 5);
                                const chance = Math.min(100, Math.max(1, baseChance + (wisBonus * 0.01)));
                                
                                const totalHerbs = r.herbs * craftQuantity;
                                const totalWood = r.wood * craftQuantity;
                                const totalMana = r.mana * craftQuantity;
                                const totalCrystal = r.crystal * craftQuantity;

                                return (
                                    <>
                                        <span className={character.base!.resources.herbs >= totalHerbs ? 'text-green-400' : 'text-red-400'}>약초: {totalHerbs}</span>
                                        <span className={character.base!.resources.wood >= totalWood ? 'text-green-400' : 'text-red-400'}>목재: {totalWood}</span>
                                        <span className={character.base!.resources.manaCrystal >= totalMana ? 'text-green-400' : 'text-red-400'}>마정석: {totalMana}</span>
                                        <span className={(character.base!.resources[getCrystalKey(r.rarity)] || 0) >= totalCrystal ? 'text-green-400' : 'text-red-400'}>{r.rarity} 결정: {totalCrystal}</span>
                                        
                                        {/* [NEW] 추가 재료 UI (작물 위주) */}
                                        {(r as any).garlic > 0 && (
                                            <span className={((character.base!.resources as any).garlic || 0) >= (r as any).garlic * craftQuantity ? 'text-slate-300' : 'text-red-400'}>마늘: {(r as any).garlic * craftQuantity}</span>
                                        )}
                                        {(r as any).shinryokuFlower > 0 && (
                                            <span className={((character.base!.resources as any).shinryoku_flower || 0) >= (r as any).shinryokuFlower * craftQuantity ? 'text-pink-400' : 'text-red-400'}>신력 꽃: {(r as any).shinryokuFlower * craftQuantity}</span>
                                        )}
                                        {(r as any).worldTreeBranch > 0 && (
                                            <span className={((character.base!.resources as any).world_tree_branch || 0) >= (r as any).worldTreeBranch * craftQuantity ? 'text-emerald-400' : 'text-red-400'}>세계수의 가지: {(r as any).worldTreeBranch * craftQuantity}</span>
                                        )}
                                        {(r as any).silverOre > 0 && (
                                            <span className={((character.base!.resources as any).silver_ore || 0) >= (r as any).silverOre * craftQuantity ? 'text-slate-300' : 'text-red-400'}>은광석: {(r as any).silverOre * craftQuantity}</span>
                                        )}
                                        {(r as any).goldOre > 0 && (
                                            <span className={((character.base!.resources as any).gold_ore || 0) >= (r as any).goldOre * craftQuantity ? 'text-yellow-500' : 'text-red-400'}>금광석: {(r as any).goldOre * craftQuantity}</span>
                                        )}
                                        {(r as any).diamond > 0 && (
                                            <span className={((character.base!.resources as any).diamond || 0) >= (r as any).diamond * craftQuantity ? 'text-cyan-300' : 'text-red-400'}>다이아몬드: {(r as any).diamond * craftQuantity}</span>
                                        )}
                                        <div className="col-span-2 mt-2 pt-2 border-t border-slate-800 text-center">
                                            성공 확률: <span className="text-amber-400 font-bold">{chance.toFixed(1)}%</span> (WIS 보너스 포함)
                                        </div>
                                    </>
                                )
                            })()}
                        </div>
                    </div>

                    <button 
                        onClick={handleCraft} 
                        disabled={potionType === 'MIX' && facilityLevel < 5}
                        className="w-full py-4 bg-purple-700 hover:bg-purple-600 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-lg shadow-lg transition-colors flex items-center justify-center"
                    >
                        {potionType === 'MIX' && facilityLevel < 5 ? <><Lock size={16} className="mr-2"/> 레벨 부족 (Lv.5 필요)</> : "제작 시작"}
                    </button>
                </div>
            )}

            {/* CONVERT TAB */}
            {activeTab === 'convert' && (
                <div className="flex flex-col h-full">
                    <div className="flex gap-4 mb-4 shrink-0 justify-center">
                        <button onClick={() => setConvertMode('stone_to_crystal')} className={`px-4 py-2 rounded text-xs border ${convertMode === 'stone_to_crystal' ? 'bg-indigo-900 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>마석 정제</button>
                        <button onClick={() => setConvertMode('dismantle')} className={`px-4 py-2 rounded text-xs border ${convertMode === 'dismantle' ? 'bg-indigo-900 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>아이템 분해</button>
                    </div>

                    {convertMode === 'stone_to_crystal' && (
                        <div className="flex flex-col items-center justify-center h-64 bg-slate-950 rounded-xl border border-slate-800">
                            <Mountain size={48} className="text-slate-600 mb-4"/>
                            <ArrowRight size={24} className="text-slate-500 mb-4 rotate-90 md:rotate-0"/>
                            <Zap size={48} className="text-purple-500 mb-4"/>
                            <p className="text-sm text-slate-400 mb-2">마석 10개 → 마정석 1개</p>
                            
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 mb-4 w-full max-w-xs">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-slate-500">변환 수량</span>
                                    <span className="text-xs font-mono text-purple-400">{convertQuantity}개 (소모: {convertQuantity * 10} 마석)</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max={Math.max(1, Math.floor((character.base?.resources.manaStone || 0) / 10))} 
                                    value={convertQuantity} 
                                    onChange={(e) => setConvertQuantity(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    disabled={(character.base?.resources.manaStone || 0) < 10}
                                />
                                <div className="text-center mt-2">
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max={Math.max(1, Math.floor((character.base?.resources.manaStone || 0) / 10))} 
                                        value={convertQuantity} 
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            const max = Math.floor((character.base?.resources.manaStone || 0) / 10);
                                            if (!isNaN(val)) setConvertQuantity(Math.min(Math.max(1, val), max));
                                        }}
                                        className="w-20 bg-slate-800 border border-slate-600 rounded p-1 text-center text-white text-sm"
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleStoneToCrystal} 
                                disabled={(character.base?.resources.manaStone || 0) < 10}
                                className="px-8 py-3 bg-indigo-700 hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded font-bold shadow-lg"
                            >
                                변환하기
                            </button>
                        </div>
                    )}

                    {convertMode === 'dismantle' && (
                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                            <div className="w-full md:w-1/2 flex flex-col overflow-hidden bg-slate-950/50 border border-slate-800 rounded p-2">
                                {/* 탭 및 정렬 상단 컨트롤 바 */}
                                <div className="flex flex-col gap-2 pb-2 mb-2 border-b border-slate-800 shrink-0">
                                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                        {/* 품목 탭 (장비, 소비, 기타) */}
                                        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDismantleTab('equipment');
                                                    setSelectedDismantleGroupIdx(null);
                                                }}
                                                className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${
                                                    dismantleTab === 'equipment'
                                                        ? 'bg-purple-700 text-white shadow-sm'
                                                        : 'text-slate-400 hover:text-slate-200'
                                                }`}
                                            >
                                                장비 ({getAllDismantleGroups().filter(g => isEquipmentItem(g.item)).length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDismantleTab('consumable');
                                                    setSelectedDismantleGroupIdx(null);
                                                }}
                                                className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${
                                                    dismantleTab === 'consumable'
                                                        ? 'bg-purple-700 text-white shadow-sm'
                                                        : 'text-slate-400 hover:text-slate-200'
                                                }`}
                                            >
                                                소비 ({getAllDismantleGroups().filter(g => isConsumableItem(g.item)).length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDismantleTab('etc');
                                                    setSelectedDismantleGroupIdx(null);
                                                }}
                                                className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${
                                                    dismantleTab === 'etc'
                                                        ? 'bg-purple-700 text-white shadow-sm'
                                                        : 'text-slate-400 hover:text-slate-200'
                                                }`}
                                            >
                                                기타 ({getAllDismantleGroups().filter(g => !isEquipmentItem(g.item) && !isConsumableItem(g.item)).length})
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setIsBulkDismantleOpen(true)}
                                            className="px-2.5 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow transition-all active:scale-95 shrink-0"
                                        >
                                            <Trash2 size={13} />
                                            <span>일괄 분해</span>
                                        </button>
                                    </div>

                                    {/* 품목 수 및 정렬 드롭다운 */}
                                    <div className="flex items-center justify-between gap-2 text-xs px-0.5">
                                        <span className="text-[11px] font-bold text-purple-400">
                                            분해 가능 ({dismantleGroups.length}종류)
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-slate-500 font-bold shrink-0">정렬</span>
                                            <select
                                                value={dismantleSort}
                                                onChange={(e) => {
                                                    setDismantleSort(e.target.value as any);
                                                    setSelectedDismantleGroupIdx(null);
                                                }}
                                                className="bg-slate-900 border border-slate-700 text-slate-300 text-[11px] font-medium rounded-lg px-2 py-1 outline-none focus:border-purple-500 cursor-pointer"
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
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5">
                                    {dismantleGroups.map((group, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => {
                                            setSelectedDismantleGroupIdx(idx);
                                            setDismantleQuantity(1);
                                        }} 
                                        className={`p-2 border rounded-xl cursor-pointer flex justify-between items-center gap-2.5 transition-all ${selectedDismantleGroupIdx === idx ? 'bg-indigo-900/40 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-black/50 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center p-1">
                                            <img src={getItemImage(group.item)} alt={group.item.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-xs font-bold text-slate-200 block truncate">{group.item.name}</span>
                                            <span className="text-[10px] text-slate-400">{group.item.rarity} | {group.item.type}</span>
                                        </div>
                                        <div className="ml-2 text-xs bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 text-amber-400 font-bold shrink-0">
                                            x{group.count}
                                        </div>
                                    </div>
                                ))}
                                {dismantleGroups.length === 0 && <p className="text-center py-20 text-slate-600 italic text-xs">해당 품목의 분해 가능한 아이템이 없습니다.</p>}
                                </div>
                            </div>
                            <div className="w-full md:w-1/2 p-4 flex flex-col items-center justify-center">
                                {selectedGroup ? (
                                    <div className="text-center w-full max-w-xs animate-in zoom-in-95">
                                        <div className="w-16 h-16 rounded-2xl bg-black/60 border border-indigo-500/40 mx-auto mb-3 overflow-hidden flex items-center justify-center p-2 shadow-lg shadow-indigo-950/50">
                                            <img src={getItemImage(selectedGroup.item)} alt={selectedGroup.item.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                        </div>
                                        <h4 className="text-white font-bold mb-0.5 text-base">{selectedGroup.item.name}</h4>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-4">{selectedGroup.item.rarity} • {selectedGroup.item.type}</p>
                                        
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs text-slate-500 font-bold">수량 선택</span>
                                                <span className="text-sm font-mono text-indigo-400 font-bold">{dismantleQuantity} / {selectedGroup.count}</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="1" 
                                                max={selectedGroup.count} 
                                                value={dismantleQuantity} 
                                                onChange={(e) => setDismantleQuantity(parseInt(e.target.value))}
                                                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 mb-4"
                                            />
                                            
                                            <div className="pt-3 border-t border-slate-800 space-y-1">
                                                <p className="text-[10px] text-slate-500 uppercase text-left font-bold">예상 획득</p>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-amber-400 font-bold flex items-center gap-1"><Mountain size={14}/> 마석</span>
                                                    <span className="text-white">+{getDismantleYield(selectedGroup.item, dismantleQuantity).stones}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-indigo-400 font-bold flex items-center gap-1"><Gem size={14}/> 속성 조각</span>
                                                    <span className="text-white">+{getDismantleYield(selectedGroup.item, dismantleQuantity).shards}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                            <button onClick={() => setSelectedDismantleGroupIdx(null)} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold">취소</button>
                                            <button onClick={handleDismantle} className="flex-[2] py-3 bg-red-800 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg transform active:scale-95">분해하기</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center opacity-30">
                                        <Box size={48} className="mx-auto mb-2"/>
                                        <p className="text-slate-500 text-xs">분해할 아이템 묶음을 선택하세요.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* IMBUE TAB */}
            {activeTab === 'imbue' && (
                <div className="flex flex-col h-full">
                    <div className="flex gap-4 mb-4 shrink-0 justify-center">
                        <button onClick={() => { setImbueMode('add'); setSelectedEquipIdx(null); }} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${imbueMode === 'add' ? 'bg-amber-900/60 border-amber-500 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.2)]' : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'}`}>속성 부여</button>
                        <button onClick={() => { setImbueMode('remove'); setSelectedEquipIdx(null); }} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${imbueMode === 'remove' ? 'bg-red-900/60 border-red-500 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.2)]' : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'}`}>속성 제거</button>
                    </div>

                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden gap-4">
                        <div className="w-full md:w-1/3 flex flex-col bg-slate-950/50 border border-slate-800 rounded-xl p-2.5 overflow-hidden">
                            {/* 상단 검색 및 정렬 컨트롤 */}
                            <div className="space-y-2 mb-2 pb-2 border-b border-slate-800/80 shrink-0">
                                {/* 검색창 */}
                                <div className="relative">
                                    <Search size={14} className="text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={imbueSearch}
                                        onChange={(e) => setImbueSearch(e.target.value)}
                                        placeholder="장비명 또는 속성 검색..."
                                        className="w-full bg-slate-900/80 border border-slate-800 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-amber-500/60 placeholder:text-slate-600"
                                    />
                                    {imbueSearch && (
                                        <button 
                                            onClick={() => setImbueSearch('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {/* 정렬 드롭다운 & 개수 카운트 */}
                                <div className="flex items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold shrink-0">
                                        <ArrowUpDown size={13} className="text-amber-400" />
                                        <span>정렬</span>
                                    </div>
                                    <select
                                        value={imbueSort}
                                        onChange={(e) => setImbueSort(e.target.value as any)}
                                        className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-[11px] text-slate-200 font-medium focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="rarity_desc">등급 높은 순</option>
                                        <option value="rarity_asc">등급 낮은 순</option>
                                        <option value="enhance_desc">강화 높은 순</option>
                                        <option value="name_asc">이름 가나다순</option>
                                    </select>
                                    <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                                        {imbueEquipList.length}개
                                    </span>
                                </div>

                                {/* 무기 세부 필터 칩 */}
                                <div className="grid grid-cols-3 gap-1">
                                    {[
                                        { id: 'all', label: '전체 무기' },
                                        { id: 'weapon', label: '주무기' },
                                        { id: 'subweapon', label: '보조무기' }
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => setImbueTypeFilter(f.id as any)}
                                            className={`py-1 text-[10.5px] font-bold rounded-md transition-all text-center ${
                                                imbueTypeFilter === f.id
                                                    ? 'bg-amber-950/80 text-amber-300 border border-amber-600/60 shadow-sm'
                                                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                                            }`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 스크롤 가능한 무기 카드 리스트 */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-0.5">
                                {imbueEquipList.length === 0 ? (
                                    <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-slate-600 gap-1.5">
                                        <Box size={24} className="opacity-40" />
                                        <p className="text-xs font-medium">대상 무기가 없습니다.</p>
                                        <p className="text-[10px] text-slate-600">
                                            {imbueMode === 'add' ? '속성이 부여되지 않은 무기가 필요합니다.' : '속성이 깃든 무기가 필요합니다.'}
                                        </p>
                                    </div>
                                ) : (
                                    imbueEquipList.map(({ item, originalIdx }) => (
                                        <div 
                                            key={originalIdx} 
                                            onClick={() => setSelectedEquipIdx(originalIdx)} 
                                            className={`group relative p-2 border rounded-xl cursor-pointer transition-all flex items-center gap-2.5 ${selectedEquipIdx === originalIdx ? 'bg-amber-900/30 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                                        >
                                            <ItemTooltip item={item} character={character} />
                                            <div className="w-10 h-10 rounded-lg bg-black/50 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center p-1 relative">
                                                <img src={getItemImage(item)} alt={item.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                                {item.enhancement ? (
                                                    <span className="absolute bottom-0.5 right-0.5 text-[9px] font-black text-amber-300 bg-black/80 px-1 rounded">
                                                        +{item.enhancement}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-bold text-slate-200 truncate flex items-center gap-1">
                                                    <span className="truncate">{item.name}</span>
                                                    {item.enhancement ? <span className="text-[11px] text-amber-400 font-bold shrink-0">+{item.enhancement}</span> : null}
                                                </div>
                                                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                    <span className={`font-semibold ${item.rarity === ItemRarity.MYTHTIC ? 'text-rose-400' : item.rarity === ItemRarity.LEGENDARY ? 'text-amber-400' : ''}`}>{item.rarity}</span>
                                                    <span>•</span>
                                                    <span className="text-slate-500">{item.type}</span>
                                                    {item.elementalType && <span className="text-amber-300 font-bold bg-amber-950/60 px-1 rounded border border-amber-800/60">[{item.elementalType}]</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="flex-1 p-4 bg-slate-900 rounded-xl border border-slate-800 overflow-y-auto custom-scrollbar">
                            {selectedEquipIdx !== null && character.inventory[selectedEquipIdx] ? (
                                <div className="space-y-5">
                                    <div className="group relative flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                                        <ItemTooltip item={character.inventory[selectedEquipIdx]} character={character} />
                                        <div className="w-12 h-12 rounded-xl bg-black/60 border border-slate-700 shrink-0 overflow-hidden flex items-center justify-center p-1">
                                            <img src={getItemImage(character.inventory[selectedEquipIdx])} alt={character.inventory[selectedEquipIdx].name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold text-base flex items-center gap-2">
                                                {character.inventory[selectedEquipIdx].name}
                                                {character.inventory[selectedEquipIdx].enhancement ? <span className="text-xs font-bold text-amber-400">+{character.inventory[selectedEquipIdx].enhancement}</span> : null}
                                            </h4>
                                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                                <span>{character.inventory[selectedEquipIdx].rarity}</span>
                                                <span>•</span>
                                                <span>{character.inventory[selectedEquipIdx].type}</span>
                                                {character.inventory[selectedEquipIdx].elementalType && <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800">속성: {character.inventory[selectedEquipIdx].elementalType}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {imbueMode === 'add' && (
                                        <div>
                                            <label className="text-xs text-slate-400 block mb-2 font-bold">부여할 속성 선택</label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {SHINRYOKU_TYPES_LIST.map(type => {
                                                    const Icon = ELEMENT_ICONS[type] || Sparkles;
                                                    return (
                                                        <button key={type} onClick={() => setTargetElement(type)} className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-[10px] font-bold transition-all ${targetElement === type ? 'bg-amber-900/50 border-amber-500 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.25)]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'}`}>
                                                            <Icon size={18} className="mb-1 text-amber-400"/>
                                                            {type.replace('계','')}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
                                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                            <span className="font-bold text-slate-300">필요 재료 및 확률</span>
                                            {character.inventory[selectedEquipIdx]?.rarity === ItemRarity.MYTHTIC && (
                                                <span className="text-[10px] px-2 py-0.5 rounded font-black bg-rose-950/80 text-rose-300 border border-rose-600/50 animate-pulse">
                                                    신화 등급 특별 연금술
                                                </span>
                                            )}
                                        </div>
                                        {(() => {
                                            const item = character.inventory[selectedEquipIdx];
                                            const isMythic = item.rarity === ItemRarity.MYTHTIC;
                                            const coef = getRarityCoef(item.rarity, true);
                                            const cost = getImbueCost(coef, isMythic);
                                            const baseChance = isMythic ? 40 : (100 - (5 * coef));
                                            const chance = Math.min(100, Math.max(5, baseChance + (wisBonus * 0.01) + masterySuccessBonus));
                                            const shards = character.base!.elementalShards || {};
                                            const flowers = getShinryokuFlowerCount();
                                            const res = character.base!.resources;

                                            return (
                                                <div className="space-y-1.5">
                                                    {isMythic && (
                                                        <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-900/40 text-[11px] text-rose-200 leading-relaxed font-medium">
                                                            ※ 신화 장비의 신성한 권능을 조율하기 위해 일반 장비 대비 약 100배의 마정석 및 신력꽃, 마석, 전설 결정, 골드 등 막대한 재료가 소모됩니다.
                                                        </div>
                                                    )}
                                                    <div className={`flex justify-between ${res.manaCrystal >= cost.mana ? 'text-green-400' : 'text-red-400'}`}>
                                                        <span>마정석:</span>
                                                        <span className="font-bold">{cost.mana.toLocaleString()}개 (보유: {res.manaCrystal.toLocaleString()}개)</span>
                                                    </div>
                                                    {imbueMode === 'add' && (
                                                        <div className={`flex justify-between ${(shards[targetElement] || 0) >= cost.shards ? 'text-green-400' : 'text-red-400'}`}>
                                                            <span>{targetElement} 조각:</span>
                                                            <span className="font-bold">{cost.shards.toLocaleString()}개 (보유: {(shards[targetElement] || 0).toLocaleString()}개)</span>
                                                        </div>
                                                    )}
                                                    {cost.flowers > 0 && (
                                                        <div className={`flex justify-between ${flowers.total >= cost.flowers ? 'text-pink-300' : 'text-red-400'}`}>
                                                            <span>신력꽃:</span>
                                                            <span className="font-bold">{cost.flowers.toLocaleString()}송이 (보유: {flowers.total.toLocaleString()}송이)</span>
                                                        </div>
                                                    )}
                                                    {cost.manaStone > 0 && (
                                                        <div className={`flex justify-between ${(res.manaStone || 0) >= cost.manaStone ? 'text-amber-300' : 'text-red-400'}`}>
                                                            <span>마석:</span>
                                                            <span className="font-bold">{cost.manaStone.toLocaleString()}개 (보유: {(res.manaStone || 0).toLocaleString()}개)</span>
                                                        </div>
                                                    )}
                                                    {cost.legendaryCrystal > 0 && (
                                                        <div className={`flex justify-between ${(res.legendaryCrystal || 0) >= cost.legendaryCrystal ? 'text-purple-300' : 'text-red-400'}`}>
                                                            <span>전설 결정:</span>
                                                            <span className="font-bold">{cost.legendaryCrystal.toLocaleString()}개 (보유: {(res.legendaryCrystal || 0).toLocaleString()}개)</span>
                                                        </div>
                                                    )}
                                                    {cost.gold > 0 && (() => {
                                                        const currentGold = (character.money || 0) + (res.gold || 0);
                                                        return (
                                                            <div className={`flex justify-between ${currentGold >= cost.gold ? 'text-yellow-300' : 'text-red-400'}`}>
                                                                <span>골드:</span>
                                                                <span className="font-bold">{cost.gold.toLocaleString()}G (보유: {currentGold.toLocaleString()}G)</span>
                                                            </div>
                                                        );
                                                    })()}
                                                    <div className="flex justify-between text-amber-400 pt-1.5 border-t border-slate-800 font-bold">
                                                        <span>성공 확률:</span>
                                                        <span>{chance.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <button onClick={handleImbueAction} className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-98 ${imbueMode === 'add' ? 'bg-amber-700 hover:bg-amber-600' : 'bg-red-800 hover:bg-red-700'}`}>
                                        {imbueMode === 'add' ? '속성 부여' : '속성 제거'}
                                    </button>
                                </div>
                            ) : (
                                <p className="text-slate-500 text-center mt-20">장비를 선택하세요.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MONSTER SHINRYOKU TAB */}
            {activeTab === 'monsterShinryoku' && (() => {
                const allMonstersForTransform = [
                    ...(character.base?.capturedMonsters || []).filter(m => !isEggMonster(m)).map((m: any) => ({
                        ...m,
                        _inParty: false,
                        _isMonster: true,
                        _isCapturedMonster: true,
                        isCustom: Boolean(m.isCustomMonster || m.isCustom),
                        race: '몬스터',
                        stage: m.stage || m.monsterData?.stage || '성장기',
                        level: m.level || 1
                    })),
                    ...(character.companions || []).filter(c => isMonsterCompanion(c)).map(c => ({
                        ...c,
                        _inParty: true,
                        _isMonster: true,
                        isCustom: Boolean(c.isCustom || (c as any).isCustomMonster),
                        stage: (c as any).stage || '성장기',
                        level: c.level || 1
                    })),
                    ...(character.inactiveCompanions || []).filter(c => isMonsterCompanion(c)).map(c => ({
                        ...c,
                        _inParty: false,
                        _isMonster: true,
                        isCustom: Boolean(c.isCustom || (c as any).isCustomMonster),
                        stage: (c as any).stage || '성장기',
                        level: c.level || 1
                    }))
                ].filter(m => Boolean(m.isCustom));

                const filteredMonsters = allMonstersForTransform.filter(m => {
                    if (monsterTransformFilter === 'captured' && !m._isCapturedMonster) return false;
                    if (monsterTransformFilter === 'party' && !m._inParty) return false;
                    if (monsterTransformSearch.trim()) {
                        const q = monsterTransformSearch.trim().toLowerCase();
                        const nameMatch = m.name?.toLowerCase().includes(q);
                        const typeMatch = m.shinryokuType?.toLowerCase().includes(q);
                        const stageMatch = String(m.stage || '').toLowerCase().includes(q);
                        if (!nameMatch && !typeMatch && !stageMatch) return false;
                    }
                    return true;
                });

                const activeSelectedMon = allMonstersForTransform.find(m => m.id === selectedTransformMonsterId) || filteredMonsters[0] || null;
                const reqShards = activeSelectedMon ? getMonsterShinryokuShardRequirement(activeSelectedMon) : 0;
                const availableShards = activeSelectedMon ? getShinryokuShardsCount(character, monsterTransformTargetShinryoku) : 0;
                const hasEnoughShards = availableShards >= reqShards;
                const isSameType = activeSelectedMon && (activeSelectedMon.shinryokuType || '무속성') === monsterTransformTargetShinryoku;

                return (
                    <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in zoom-in-95">
                        {/* Header Banner */}
                        <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/80 border border-rose-500/30 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-center shrink-0 shadow-inner">
                                    <Flame className="text-rose-400 animate-pulse" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                                        커스텀 몬스터 신력 계통 속성 변환
                                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-rose-950 text-rose-300 border border-rose-500/40">
                                            커스텀 전용
                                        </span>
                                    </h3>
                                    <p className="text-xs text-slate-300 mt-0.5">
                                        개조된 커스텀 몬스터의 신력 계통 속성을 정제하여 변환합니다. (기지 자원 신력계통조각 소모)
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-xs shrink-0 self-stretch sm:self-auto justify-between sm:justify-start">
                                <span className="text-slate-400">기지 자원 신력계통조각:</span>
                                <span className="font-mono font-bold text-amber-300 text-sm">
                                    {getShinryokuShardsCount(character)}개
                                </span>
                            </div>
                        </div>

                        {/* Content Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                            {/* Left Column: Custom Monster Selector */}
                            <div className="lg:col-span-5 bg-slate-900/90 rounded-xl border border-slate-800 p-3 sm:p-4 flex flex-col h-[520px]">
                                {/* Filters & Search */}
                                <div className="space-y-2 mb-3">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text"
                                            value={monsterTransformSearch}
                                            onChange={(e) => setMonsterTransformSearch(e.target.value)}
                                            placeholder="커스텀 몬스터 검색..."
                                            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                                        />
                                    </div>

                                    <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                                        {[
                                            { id: 'all', label: '전체 커스텀' },
                                            { id: 'captured', label: '포획 커스텀' },
                                            { id: 'party', label: '파티 커스텀' }
                                        ].map((f) => (
                                            <button
                                                key={f.id}
                                                type="button"
                                                onClick={() => setMonsterTransformFilter(f.id as any)}
                                                className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors whitespace-nowrap ${
                                                    monsterTransformFilter === f.id
                                                        ? 'bg-rose-950/80 border-rose-500 text-rose-200'
                                                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                                }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Monster List */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                                    {filteredMonsters.length === 0 ? (
                                        <div className="text-center py-16 text-slate-500 text-xs px-4">
                                            변환할 커스텀 몬스터가 없습니다.<br />
                                            (몬스터 개조실에서 커스텀 개조를 완료해야 속성 변환이 가능합니다)
                                        </div>
                                    ) : (
                                        filteredMonsters.map((m) => {
                                            const isSelected = activeSelectedMon?.id === m.id;
                                            const mTypeConfig = SHINRYOKU_UI_CONFIG[m.shinryokuType || '무속성'] || SHINRYOKU_UI_CONFIG.default;
                                            return (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() => setSelectedTransformMonsterId(m.id)}
                                                    className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center justify-between gap-2.5 ${
                                                        isSelected
                                                            ? 'bg-rose-950/40 border-rose-500 shadow-md ring-1 ring-rose-500/50'
                                                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                                                            <img
                                                                src={getCompanionDisplayVisualUrl(m)}
                                                                alt={m.name}
                                                                className="w-full h-full object-cover"
                                                                referrerPolicy="no-referrer"
                                                            />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-xs font-bold text-slate-200 truncate">{m.name}</span>
                                                                {m._inParty && (
                                                                    <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-amber-950 text-amber-300 border border-amber-500/30 shrink-0">
                                                                        파티
                                                                    </span>
                                                                )}
                                                                <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-pink-950 text-pink-300 border border-pink-500/30 shrink-0">
                                                                    커스텀
                                                                </span>
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                                                                <span>Lv.{m.level || 1} ({m.stage || '성장기'})</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold border shrink-0 ${mTypeConfig.bg} ${mTypeConfig.border} ${mTypeConfig.text}`}>
                                                        {m.shinryokuType || '무속성'}
                                                    </span>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Transformation Control Panel */}
                            <div className="lg:col-span-7 bg-slate-900/90 rounded-xl border border-slate-800 p-4 sm:p-5 flex flex-col justify-between h-[520px] overflow-y-auto custom-scrollbar space-y-4">
                                {activeSelectedMon ? (
                                    <div className="space-y-4">
                                        {/* Selected Monster Profile Card */}
                                        <div className="flex items-center gap-3.5 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                                            <div className="w-16 h-16 rounded-xl bg-slate-900 border border-rose-500/40 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                                                <img
                                                    src={getCompanionDisplayVisualUrl(activeSelectedMon)}
                                                    alt={activeSelectedMon.name}
                                                    className="w-full h-full object-cover"
                                                    referrerPolicy="no-referrer"
                                                />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-bold text-white truncate">{activeSelectedMon.name}</h4>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-pink-950 text-pink-300 border border-pink-700">
                                                        커스텀 몬스터
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                                                    <span>진화단계: <strong className="text-slate-200">{activeSelectedMon.stage || '성장기'}</strong></span>
                                                    <span>레벨: <strong className="text-amber-300 font-bold">Lv.{activeSelectedMon.level || 1}</strong></span>
                                                    <span>전투력: <strong className="text-rose-300 font-bold">{getCompanionCP(activeSelectedMon)}</strong></span>
                                                </div>
                                                <div className="mt-1.5 flex items-center gap-2">
                                                    <span className="text-[11px] text-slate-400">현재 신력 계통:</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${SHINRYOKU_UI_CONFIG[activeSelectedMon.shinryokuType || '무속성']?.bg || 'bg-slate-800'} ${SHINRYOKU_UI_CONFIG[activeSelectedMon.shinryokuType || '무속성']?.border || 'border-slate-700'} ${SHINRYOKU_UI_CONFIG[activeSelectedMon.shinryokuType || '무속성']?.text || 'text-slate-300'}`}>
                                                        {activeSelectedMon.shinryokuType || '무속성'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Shinryoku Attribute Selection Grid */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                                    <Sparkles size={14} className="text-rose-400" />
                                                    변환할 신력 계통 속성 선택 (14대 계통)
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 p-2 bg-slate-950 rounded-xl border border-slate-800">
                                                {SHINRYOKU_TYPES_LIST.map((type) => {
                                                    const isCurrent = (activeSelectedMon.shinryokuType || '무속성') === type;
                                                    const isSelectedType = monsterTransformTargetShinryoku === type;
                                                    const typeCfg = SHINRYOKU_UI_CONFIG[type] || SHINRYOKU_UI_CONFIG.default;
                                                    const ElementIcon = ELEMENT_ICONS[type] || Flame;

                                                    return (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            onClick={() => setMonsterTransformTargetShinryoku(type)}
                                                            disabled={isCurrent}
                                                            className={`p-2 rounded-lg text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 text-center ${
                                                                isCurrent
                                                                    ? 'bg-slate-900 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                                                                    : isSelectedType
                                                                        ? `${typeCfg.bg} ${typeCfg.border} ${typeCfg.text} ring-2 ring-rose-400/80 shadow-md scale-105`
                                                                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-rose-500/40 hover:bg-slate-800'
                                                            }`}
                                                        >
                                                            <ElementIcon size={16} />
                                                            <span className="text-[10px] truncate w-full">{type}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Resource Calculation */}
                                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-400 flex items-center gap-1">
                                                    <Box size={14} className="text-rose-400" />
                                                    필요 기지 자원 <strong className="text-rose-300">신력계통조각</strong>:
                                                </span>
                                                <span className={`font-mono font-bold ${hasEnoughShards ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {availableShards} / {reqShards}개
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <button
                                            type="button"
                                            onClick={handleExecuteMonsterShinryokuTransform}
                                            disabled={isSameType || !hasEnoughShards}
                                            className="w-full py-3 bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl shadow-lg transition-all text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-98"
                                        >
                                            <Flame size={18} className="animate-pulse" />
                                            <span>
                                                {isSameType
                                                    ? `이미 ${monsterTransformTargetShinryoku} 속성입니다`
                                                    : !hasEnoughShards
                                                        ? `신력계통조각 부족 (${availableShards}/${reqShards}개)`
                                                        : `[${activeSelectedMon.name}] 신력 계통 속성을 ${monsterTransformTargetShinryoku}(으)로 변환`}
                                            </span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center py-24 text-slate-500 text-sm">
                                        속성을 변환할 커스텀 몬스터를 좌측 목록에서 선택하십시오.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* INHERIT TAB (New Functionality) */}
            {activeTab === 'inherit' && (
                <div className="p-6 space-y-6">
                    <div className="text-center bg-emerald-900/10 p-3 rounded-xl border border-emerald-500/30 shrink-0">
                        <h3 className="text-lg font-bold text-emerald-400 flex items-center justify-center"><Layers size={18} className="mr-2"/> 장비 옵션 계승</h3>
                        <p className="text-xs text-slate-400 mt-1">같은 등급의 장비끼리 옵션, 레벨, 강화수치 및 장비 속성을 계승합니다. (재료 장비는 소멸)</p>
                        <div className="text-[10px] text-emerald-400 font-bold mt-2">필요 재료: 동일 등급 장비 1개, 마정석 100개</div>
                    </div>
                    
                    <div className="flex flex-col md:grid md:grid-cols-2 gap-4">
                        <div className="flex flex-col bg-slate-900 rounded-xl border border-slate-800 p-3 h-[300px] md:h-[400px] overflow-hidden shadow-inner">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">1. 베이스 장비 (옵션을 받을 장비)</p>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                {character.inventory.map((item, idx) => {
                                    const isEquip = ['Weapon', 'SubWeapon', 'Head', 'Body', 'Feet', 'Hand', 'Accessory'].includes(item.type);
                                    if (!isEquip) return null;
                                    return (
                                        <button 
                                            key={item.id || idx} 
                                            onClick={() => { setTransmuteBaseIdx(idx); setTransmuteMaterialIdx(null); }} 
                                            className={`w-full p-2 rounded border text-left flex items-center gap-3 transition-all ${transmuteBaseIdx === idx ? 'bg-emerald-900/40 border-emerald-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                                        >
                                            <div className="w-10 h-10 rounded bg-black/40 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
                                                <img 
                                                    src={getItemImage(item)} 
                                                    alt={item.name} 
                                                    className="w-full h-full object-contain"
                                                    referrerPolicy="no-referrer"
                                                />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold text-slate-200 truncate">{item.name}</span>
                                                <div className="flex flex-wrap gap-1 mt-0.5">
                                                    <span className="text-[8px] px-1 bg-slate-800 text-slate-400 rounded uppercase">{item.rarity}</span>
                                                    <span className="text-[8px] px-1 bg-emerald-900/30 text-emerald-400 rounded">Lv.{item.optionLevel || 1}</span>
                                                </div>
                                                {item.secondaryOptions && item.secondaryOptions.length > 0 && (
                                                    <div className="flex gap-1 mt-1 overflow-hidden">
                                                        {item.secondaryOptions.slice(0, 2).map((opt, i) => (
                                                            <span key={i} className="text-[7px] text-slate-500 truncate">#{opt}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex flex-col bg-slate-900 rounded-xl border border-slate-800 p-3 h-[300px] md:h-[400px] overflow-hidden shadow-inner">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">2. 재료 장비 (옵션을 줄 장비)</p>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                {character.inventory.map((item, idx) => {
                                    const isEquip = ['Weapon', 'SubWeapon', 'Head', 'Body', 'Feet', 'Hand', 'Accessory'].includes(item.type);
                                    const baseItem = transmuteBaseIdx !== null ? character.inventory[transmuteBaseIdx] : null;
                                    const isSameRarity = baseItem && item.rarity === baseItem.rarity;
                                    const isNotBase = transmuteBaseIdx !== idx;
                                    const isSameCategory = baseItem && (
                                        (baseItem.type === item.type) ||
                                        (['Weapon', 'SubWeapon'].includes(baseItem.type) && ['Weapon', 'SubWeapon'].includes(item.type)) ||
                                        (['Head', 'Body', 'Feet', 'Hand'].includes(baseItem.type) && ['Head', 'Body', 'Feet', 'Hand'].includes(item.type))
                                    );

                                    if (!isEquip || !baseItem || !isSameRarity || !isNotBase || !isSameCategory) return null;

                                    return (
                                        <button 
                                            key={item.id || idx} 
                                            onClick={() => setTransmuteMaterialIdx(idx)} 
                                            className={`w-full p-2 rounded border text-left flex items-center gap-3 transition-all ${transmuteMaterialIdx === idx ? 'bg-red-900/40 border-red-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                                        >
                                            <div className="w-10 h-10 rounded bg-black/40 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
                                                <img 
                                                    src={getItemImage(item)} 
                                                    alt={item.name} 
                                                    className="w-full h-full object-contain"
                                                    referrerPolicy="no-referrer"
                                                />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold text-slate-200 truncate">{item.name}</span>
                                                <div className="flex flex-wrap gap-1 mt-0.5">
                                                    <span className="text-[8px] px-1 bg-slate-800 text-slate-400 rounded uppercase">{item.rarity}</span>
                                                    <span className="text-[8px] px-1 bg-red-900/30 text-red-400 rounded">Lv.{item.optionLevel || 1}</span>
                                                </div>
                                                {item.secondaryOptions && item.secondaryOptions.length > 0 && (
                                                    <div className="flex gap-1 mt-1 overflow-hidden">
                                                        {item.secondaryOptions.slice(0, 2).map((opt, i) => (
                                                            <span key={i} className="text-[7px] text-slate-500 truncate">#{opt}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    
                    {/* Preview of options */}
                    {transmuteBaseIdx !== null && transmuteMaterialIdx !== null && (() => {
                        const base = character.inventory[transmuteBaseIdx];
                        const material = character.inventory[transmuteMaterialIdx];
                        if (!base || !material) return null;
                        return (
                            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2">
                                <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center">
                                    <ArrowRight size={10} className="mr-1 text-emerald-500"/> 계승 결과 미리보기
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_40px_1fr] items-center gap-4">
                                    <div className="flex flex-col space-y-2 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-8 h-8 rounded bg-black/40 border border-slate-800 overflow-hidden flex items-center justify-center">
                                                <img src={getItemImage(base)} alt={base.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-300">
                                                    {base.name} {base.enhancement ? `+${base.enhancement}` : ''}
                                                </span>
                                                <span className="text-[8px] text-slate-500 uppercase">
                                                    {base.rarity} | {base.elementalType ? `[${base.elementalType}]` : '[무속성]'} | Lv.{base.optionLevel || 1}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-[9px] text-slate-500 font-bold uppercase border-b border-slate-800 pb-1">현재 옵션 및 속성</span>
                                        <div className="space-y-1">
                                            <div className="text-[9px] text-slate-400 flex justify-between">
                                                <span>강화 수치:</span>
                                                <span className="text-slate-300 font-bold">+{base.enhancement || 0}</span>
                                            </div>
                                            <div className="text-[9px] text-slate-400 flex justify-between">
                                                <span>장비 속성:</span>
                                                <span className="text-slate-300 font-bold">{base.elementalType || '무속성'}</span>
                                            </div>
                                            {base.secondaryOptions && base.secondaryOptions.length > 0 ? (
                                                base.secondaryOptions.map((opt, i) => (
                                                    <div key={i} className="text-[10px] text-slate-400 flex justify-between items-center">
                                                        <span className="truncate mr-2">#{opt}</span>
                                                        <span className="text-slate-600 shrink-0">Lv.{base.optionLevels?.[i] || base.optionLevel || 1}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-[10px] text-slate-600 italic">옵션 없음</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-center rotate-90 md:rotate-0">
                                        <ArrowRight size={20} className="text-emerald-500" />
                                    </div>
                                    <div className="flex flex-col space-y-2 bg-emerald-900/10 p-3 rounded-lg border border-emerald-500/30">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-8 h-8 rounded bg-black/40 border border-emerald-900/30 overflow-hidden flex items-center justify-center">
                                                <img src={getItemImage(base)} alt={base.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-emerald-400">
                                                    {base.name} {material.enhancement ? `+${material.enhancement}` : ''}
                                                </span>
                                                <span className="text-[8px] text-emerald-600 uppercase font-bold">
                                                    {base.rarity} | {material.elementalType ? `[${material.elementalType}]` : '[무속성]'} | Lv.{material.optionLevel || 1}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-[9px] text-emerald-500 font-bold uppercase border-b border-emerald-900/20 pb-1">계승될 옵션 및 속성</span>
                                        <div className="space-y-1">
                                            <div className="text-[9px] text-emerald-400/80 flex justify-between">
                                                <span>계승될 강화수치:</span>
                                                <span className="text-emerald-300 font-bold">+{material.enhancement || 0}</span>
                                            </div>
                                            <div className="text-[9px] text-emerald-400/80 flex justify-between">
                                                <span>계승될 장비속성:</span>
                                                <span className="text-emerald-300 font-bold">{material.elementalType || '무속성'}</span>
                                            </div>
                                            {material.secondaryOptions && material.secondaryOptions.length > 0 ? (
                                                material.secondaryOptions.map((opt, i) => (
                                                    <div key={i} className="text-[10px] text-emerald-300 flex justify-between items-center font-bold">
                                                        <span className="truncate mr-2">#{opt}</span>
                                                        <span className="text-emerald-500 shrink-0">Lv.{material.optionLevels?.[i] || material.optionLevel || 1}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-[10px] text-slate-600 italic">옵션 없음</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-emerald-500/70 text-center font-bold">
                                    <Zap size={10} className="inline mr-1"/> 마정석 100개가 소모됩니다. (보유: {character.base?.resources.manaCrystal || 0}개)
                                </div>
                            </div>
                        );
                    })()}

                    <button 
                        disabled={transmuteBaseIdx === null || transmuteMaterialIdx === null || (character.base?.resources.manaCrystal || 0) < 100}
                        onClick={() => {
                            if (transmuteBaseIdx === null || transmuteMaterialIdx === null) return;
                            const newChar = { ...character };
                            
                            // Check cost
                            if ((newChar.base?.resources.manaCrystal || 0) < 100) {
                                return alert("마정석이 부족합니다.");
                            }

                            // Get items by index from the original inventory
                            const base = { ...newChar.inventory[transmuteBaseIdx] };
                            const material = newChar.inventory[transmuteMaterialIdx];
                            
                            if (!base || !material) return;
                            
                            // Inherit options and level
                            base.secondaryOptions = [...(material.secondaryOptions || [])];
                            base.optionLevels = [...(material.optionLevels || [])];
                            base.optionLevel = material.optionLevel || 1;
                            base.optionMaxLevels = [...(material.optionMaxLevels || [])];
                            if (material.rerollCount !== undefined) base.rerollCount = material.rerollCount;
                            if (material.mythicOption !== undefined) base.mythicOption = material.mythicOption;
                            
                            // Inherit enhancement and elemental attribute
                            base.enhancement = material.enhancement !== undefined ? material.enhancement : 0;
                            if (material.maxEnhancement !== undefined) base.maxEnhancement = material.maxEnhancement;
                            if (material.divineLevel !== undefined) base.divineLevel = material.divineLevel;
                            if (material.failureCount !== undefined) base.failureCount = material.failureCount;
                            base.elementalType = material.elementalType;
                            
                            // Consume cost
                            newChar.base!.resources.manaCrystal -= 100;

                            // Update base item in inventory
                            newChar.inventory[transmuteBaseIdx] = base;
                            
                            // Remove material item by index
                            // To be safe, we remove by index, but we need to handle the shift if materialIdx > baseIdx
                            const materialIdx = transmuteMaterialIdx;
                            newChar.inventory = newChar.inventory.filter((_, i) => i !== materialIdx);
                            
                            onUpdateCharacter(newChar, `[계승] ${material.name}의 옵션, 강화수치(+${base.enhancement || 0}), 속성(${base.elementalType || '무속성'})을 ${base.name}에 계승했습니다. (마정석 100개 소모)`);
                            setTransmuteBaseIdx(null);
                            setTransmuteMaterialIdx(null);
                            
                            setResultOverlay({
                                show: true,
                                data: {
                                    type: 'success',
                                    title: '옵션 계승 성공',
                                    message: `${base.name}에 옵션, 강화수치 및 속성이 성공적으로 계승되었습니다.`,
                                    items: [
                                        { label: '소모 마정석', after: '-100' },
                                        { label: '계승된 강화수치', after: `+${base.enhancement || 0}` },
                                        { label: '계승된 장비 속성', after: base.elementalType || '무속성' },
                                        { label: '계승된 옵션 레벨', after: `Lv.${base.optionLevel}` }
                                    ]
                                }
                            });
                        }}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-white disabled:opacity-50 disabled:bg-slate-800 shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Sparkles size={18}/> 계승하기
                    </button>
                </div>
            )}
            {/* PRODUCE TAB */}
            {activeTab === 'produce' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950 rounded-xl border border-slate-800 text-center animate-in fade-in zoom-in-95">
                    <RefreshCw size={64} className="text-purple-500 mb-4 animate-spin-slow" />
                    <h4 className="text-xl font-bold text-white mb-2">마정석 정제 (Daily)</h4>
                    <p className="text-sm text-slate-400 mb-6 max-w-md">
                        기지에 설치된 모든 연금술 실험실에서 마석과 철광석을 정제하여 마정석을 생산합니다.
                        <br/><span className="text-[10px] text-slate-500">(지혜, 지능, 제어 스탯이 높을수록 생산량이 증가합니다)</span>
                    </p>
                    
                    {(() => {
                        const { yield: totalYield, costIron, costManaStone, labCount } = calculateTotalAlchemyProduction(character.base, character.inactiveCompanions || []);
                        const isDone = character.base?.lastAlchemyProductionDate === character.currentDate;
                        
                        return (
                            <div className="w-full max-w-md space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                                        <span className="text-[10px] text-slate-500 uppercase block mb-1">가동 가능 실험실</span>
                                        <span className="text-2xl font-bold text-purple-400">{labCount}개소</span>
                                    </div>
                                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                                        <span className="text-[10px] text-slate-500 uppercase block mb-1">예상 총 생산량</span>
                                        <span className="text-2xl font-bold text-amber-400">+{totalYield}</span>
                                    </div>
                                </div>

                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-left">
                                    <h5 className="text-xs font-bold text-slate-300 mb-3 flex items-center">
                                        <Box size={14} className="mr-1"/> 총 필요 자원
                                    </h5>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-400">철광석</span>
                                        <span className={character.base!.resources.iron >= costIron ? 'text-white' : 'text-red-400'}>
                                            {costIron} / {character.base!.resources.iron}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">마석</span>
                                        <span className={(character.base!.resources.manaStone || 0) >= costManaStone ? 'text-white' : 'text-red-400'}>
                                            {costManaStone} / {character.base!.resources.manaStone || 0}
                                        </span>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleDailyProduce}
                                    disabled={isDone || labCount === 0}
                                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${isDone ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-purple-700 hover:bg-purple-600 text-white shadow-purple-900/20'}`}
                                >
                                    {isDone ? '오늘의 생산 완료' : '전체 실험실 가동 시작'}
                                </button>
                                {isDone && <p className="text-xs text-slate-500 mt-2">다음 생산은 내일 가능합니다.</p>}
                            </div>
                        );
                    })()}
                </div>
            )}

        </div>
        
        {/* 연금술사 승급 및 관리 모달 */}
        <AlchemistPromotionModal
            isOpen={isMasteryModalOpen}
            onClose={() => setIsMasteryModalOpen(false)}
            character={character}
            assignedAlchemistIds={assignedIds}
            onUpdateCharacter={onUpdateCharacter}
            onShowResult={(resData) => setResultOverlay({ show: true, data: resData })}
        />
        {isCraftModalOpen && (
            <AlchemyCraftModal
                character={character}
                onClose={() => setIsCraftModalOpen(false)}
                onUpdateCharacter={onUpdateCharacter}
            />
        )}
        {isBulkDismantleOpen && (
            <BulkDismantleModal
                isOpen={isBulkDismantleOpen}
                onClose={() => setIsBulkDismantleOpen(false)}
                title="연금술 아이템 일괄 분해"
                description="지정한 등급 이하 및 선택한 품목의 아이템을 한 번에 분해하여 마석과 속성 조각을 추출합니다."
                allowedCategories={['equipment', 'consumable', 'etc']}
                inventory={character.inventory}
                calculateYield={calculateBulkAlchemyYield}
                onConfirm={handleBulkDismantle}
                themeColor="purple"
            />
        )}
    </div>
  );
};

export default AlchemyModal;