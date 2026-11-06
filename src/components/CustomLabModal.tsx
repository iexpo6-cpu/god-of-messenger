import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  X, Palette, Music, Sparkles, Check, ChevronRight, Lock, 
  Search, Play, Square, Volume2, UserCheck, AlertTriangle, 
  Upload, Image as ImageIcon, RefreshCw, Sliders, Shield, Sword, 
  Flame, Layers, ArrowRight, Wand2, Info, Filter, ArrowUpDown
} from 'lucide-react';
import { Character, Companion, Item, MonsterStage, ItemRarity } from '../types';
import { generateDefaultVisualUrl, optimizeImage } from '../utils';
import { SHINRYOKU_TYPES_LIST, SHINRYOKU_UI_CONFIG } from '../constants';
import { uploadImageToWeb } from '../services/imageCacheService';
import { getMonsterInfo } from '../monsterfield';
import { ItemTooltip } from './CharacterSheet';
import { 
  DETAILED_BOSSES, 
  EUROPE_BOSSES, 
  AMERICA_BOSSES, 
  ASIA_BOSSES, 
  AFRICA_BOSSES, 
  FANTASY_BOSSES, 
  DIVINE_REALM_BOSSES, 
  SEASONAL_BOSSES 
} from '../bossMonsters';

const bossMap: Record<string, any> = {};
const processBossSource = (source: any) => {
  if (!source) return;
  Object.values(source).forEach((data: any) => {
    if (data.name) bossMap[data.name] = data;
    else {
      Object.values(data).forEach((cityData: any) => {
        if (cityData.name) bossMap[cityData.name] = cityData;
      });
    }
  });
};
processBossSource(DETAILED_BOSSES);
processBossSource(EUROPE_BOSSES);
processBossSource(AMERICA_BOSSES);
processBossSource(ASIA_BOSSES);
processBossSource(AFRICA_BOSSES);
processBossSource(FANTASY_BOSSES);
processBossSource(DIVINE_REALM_BOSSES);
processBossSource(SEASONAL_BOSSES);

export const getBestiaryMonsterVisualUrl = (name: string): string => {
  if (!name) return "https://i.ibb.co/Kz56VGDS/image.png";
  if (bossMap[name]?.visualUrl) return bossMap[name].visualUrl;
  const cleanName = name.replace(/^(알|유년기|성장기|성숙기|완전체|궁극체|초궁극체)\s+/, '').replace(/\s*\(Lv\.\d+\)/, '').replace(/\[BOSS\]\s*/, '').replace(/\[.*?\]\s*/, '').trim();
  if (bossMap[cleanName]?.visualUrl) return bossMap[cleanName].visualUrl;
  const info = getMonsterInfo(name);
  if (info?.visualUrl && info.visualUrl !== "https://i.ibb.co/Kz56VGDS/image.png") {
    return info.visualUrl;
  }
  const cleanInfo = getMonsterInfo(cleanName);
  if (cleanInfo?.visualUrl && cleanInfo.visualUrl !== "https://i.ibb.co/Kz56VGDS/image.png") {
    return cleanInfo.visualUrl;
  }
  return info?.visualUrl || "https://i.ibb.co/Kz56VGDS/image.png";
};

export interface BestiaryTransmuteMonster {
  id: string;
  name: string;
  defeatedCount: number;
  visualUrl: string;
  isBoss: boolean;
  stage: string;
}

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

const isCustomEntity = (entity: any): boolean => {
  if (!entity) return false;
  return Boolean(entity.isCustom || entity.isCustomMonster || entity.isCustomCompanion);
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
  
  const rawName = comp.name || '';
  const cleanName = rawName.replace(/^(알|유년기|성장기|성숙기|완전체|궁극체|초궁극체)\s+/, '').trim();
  const info = getMonsterInfo(rawName);
  if (info && info.visualUrl && info.visualUrl !== "https://i.ibb.co/Kz56VGDS/image.png") {
    return info.visualUrl;
  }
  const cleanInfo = getMonsterInfo(cleanName);
  if (cleanInfo && cleanInfo.visualUrl && cleanInfo.visualUrl !== "https://i.ibb.co/Kz56VGDS/image.png") {
    return cleanInfo.visualUrl;
  }
  return "https://i.ibb.co/Kz56VGDS/image.png";
};

import { getItemImage as getRpgItemImage } from '../services/rpgIconService';

const getItemVisualUrl = (item: Item | any): string => {
  if (!item) return '';
  return getRpgItemImage(item);
};

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

export interface TransmuteMonsterEntity {
  id: string;
  name: string;
  nickname?: string;
  level: number;
  rank: string;
  stage: string;
  visualUrl: string;
  isCustom: boolean;
  source: 'captured' | 'party' | 'inactive';
  capturedIdx?: number;
  raw: any;
}

export const getCompanionDisplayVisualUrl = (comp: any): string => {
  if (!comp) return '';
  if (isMonsterCompanion(comp)) {
    return getMonsterVisualUrl(comp);
  }
  return comp.visualUrl || comp.defaultVisualUrl || generateDefaultVisualUrl(comp.name, comp.nation || '기타', comp.race || '인간', comp.gender || '남성');
};

export const getAllTransmuteMonsters = (char: Character): TransmuteMonsterEntity[] => {
  const list: TransmuteMonsterEntity[] = [];

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

export const getAllTransmuteCompanions = (char: Character): any[] => {
  const list: any[] = [];
  (char.companions || []).forEach(c => {
    if (!isMonsterCompanion(c)) {
      list.push({ ...c, _inParty: true, isCustom: isCustomEntity(c) });
    }
  });
  (char.inactiveCompanions || []).forEach(c => {
    if (!isMonsterCompanion(c)) {
      list.push({ ...c, _inParty: false, isCustom: isCustomEntity(c) });
    }
  });
  return list;
};

interface CustomLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  onUpdateCharacter: (newChar: Character, logMsg?: string) => void;
  facilityLevel?: number;
  instanceId?: string;
  initialTab?: 'custom' | 'transmute' | 'bgm';
}

const CUSTOM_CONVERT_MANA_CRYSTAL = 300;
const CUSTOM_CONVERT_FLOWER = 20;

export const getShinryokuFlowerCount = (char: Character): { base: number; inv: number; total: number } => {
  const base = char.base?.resources?.shinryoku_flower || 0;
  const inv = (char.inventory || []).reduce((sum, item) => {
    const name = (item.name || '').replace(/\s+/g, '');
    if (name.includes('신력의꽃') || name.includes('신력꽃')) {
      return sum + (item.quantity || 1);
    }
    return sum;
  }, 0);
  return { base, inv, total: base + inv };
};

export const getItemEquipCategory = (item: any): 'weapon' | 'armor' | 'accessory' | null => {
  if (!item) return null;
  const rawType = String(item.type || '').toLowerCase().trim();
  const name = String(item.name || '').toLowerCase();
  
  if (
    rawType === 'weapon' || rawType === 'subweapon' || rawType === '주무기' || rawType === '보조무기' ||
    item.weaponType || name.includes('검') || name.includes('창') || name.includes('도끼') || name.includes('활') || name.includes('지팡이') || name.includes('총') || name.includes('너클')
  ) {
    return 'weapon';
  }
  
  if (
    rawType === 'armor' || rawType === 'head' || rawType === 'body' || rawType === 'feet' || rawType === 'hand' ||
    rawType === 'shield' || rawType === 'boots' || rawType === 'helmet' || rawType === 'gloves' ||
    rawType === '투구' || rawType === '갑옷' || rawType === '장갑' || rawType === '신발' || rawType === '방패'
  ) {
    return 'armor';
  }
  
  if (
    rawType === 'accessory' || rawType === 'ring' || rawType === 'necklace' ||
    rawType === '장신구' || rawType === '반지' || rawType === '목걸이' || rawType === '귀걸이'
  ) {
    return 'accessory';
  }

  // 소모품, 재료, 기타 등은 제외
  if (rawType === 'consumable' || rawType === 'etc' || rawType === 'material' || rawType === '소모품' || rawType === '기타' || rawType === '재료') {
    return null;
  }

  if (item.stats && Object.keys(item.stats).length > 0) {
    return 'armor';
  }

  return null;
};

const RARITY_ORDER: Record<string, number> = {
  [ItemRarity.MYTHTIC]: 6,
  [ItemRarity.LEGENDARY]: 5,
  [ItemRarity.UNIQUE]: 4,
  [ItemRarity.EPIC]: 3,
  [ItemRarity.RARE]: 2,
  [ItemRarity.MAGIC]: 1,
  [ItemRarity.NORMAL]: 0
};

export const CustomLabModal: React.FC<CustomLabModalProps> = ({
  isOpen,
  onClose,
  character,
  onUpdateCharacter,
  facilityLevel = 1,
  initialTab = 'custom'
}) => {
  // Facility level based tab unlock:
  // Lv.1: custom (커스텀 개조)
  // Lv.3: transmute (외형 변환)
  // Lv.5: bgm (등장 BGM)
  const isTransmuteUnlocked = facilityLevel >= 3;
  const isBgmUnlocked = facilityLevel >= 5;

  const defaultTab = useMemo<'custom' | 'transmute' | 'bgm'>(() => {
    if (initialTab === 'bgm' && isBgmUnlocked) return 'bgm';
    if (initialTab === 'transmute' && isTransmuteUnlocked) return 'transmute';
    return 'custom';
  }, [initialTab, isBgmUnlocked, isTransmuteUnlocked]);

  const [activeTab, setActiveTab] = useState<'custom' | 'transmute' | 'bgm'>(defaultTab);

  // Result Overlay
  const [resultOverlay, setResultOverlay] = useState<{
    show: boolean;
    data: {
      type: 'success' | 'failure' | 'warning' | 'info';
      title: string;
      message: string;
      items?: { label: string; before?: string; after?: string; color?: string }[];
    } | null;
  }>({ show: false, data: null });

  // --------------------------------------------------------------------------
  // Tab 1: Transmute (외형 변환) State
  // --------------------------------------------------------------------------
  const [transmuteMode, setTransmuteMode] = useState<'companion' | 'monster' | 'player' | 'equipment'>('companion');
  const [transmuteBaseIdx, setTransmuteBaseIdx] = useState<number | null>(null);
  const [transmuteBaseEquipKey, setTransmuteBaseEquipKey] = useState<string | null>(null);
  const [transmuteMaterialIdx, setTransmuteMaterialIdx] = useState<number | null>(null);
  const [transmuteMaterialEquipKey, setTransmuteMaterialEquipKey] = useState<string | null>(null);
  const [transmuteBaseCompanionId, setTransmuteBaseCompanionId] = useState<string | null>(null);
  const [transmuteMaterialCompanionId, setTransmuteMaterialCompanionId] = useState<string | null>(null);
  const [transmuteBaseMonsterId, setTransmuteBaseMonsterId] = useState<string | null>(null);
  const [transmuteMaterialMonsterId, setTransmuteMaterialMonsterId] = useState<string | null>(null);
  const [transmuteMaterialType, setTransmuteMaterialType] = useState<'companion' | 'monster' | 'equipment'>('companion');

  const [isCustomTransmute, setIsCustomTransmute] = useState<boolean>(false);
  const [customTransmuteUrl, setCustomTransmuteUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [useWebUpload, setUseWebUpload] = useState<boolean>(false);

  // Filters & Sorting for Transmute
  const [transmuteCompSearch, setTransmuteCompSearch] = useState('');
  const [transmuteCompPartyFilter, setTransmuteCompPartyFilter] = useState<'all' | 'party' | 'inactive'>('all');
  const [transmuteCompSort, setTransmuteCompSort] = useState<'level' | 'name'>('level');

  const [transmuteMonsterSearch, setTransmuteMonsterSearch] = useState('');
  const [transmuteMonsterSourceFilter, setTransmuteMonsterSourceFilter] = useState<'all' | 'captured' | 'party' | 'inactive'>('all');
  const [transmuteMonsterSort, setTransmuteMonsterSort] = useState<'level' | 'name' | 'stage'>('level');

  const [transmuteEquipCategory, setTransmuteEquipCategory] = useState<'all' | 'weapon' | 'armor' | 'accessory'>('all');
  const [transmuteEquipSearch, setTransmuteEquipSearch] = useState('');
  const [transmuteEquipSort, setTransmuteEquipSort] = useState<'rarity' | 'name' | 'type'>('rarity');

  // Material selection search
  const [matSearchQuery, setMatSearchQuery] = useState('');

  // 몬스터 도감에서 100회 이상 처치한 몬스터 목록 (외형 변환용)
  const bestiaryMonsters: BestiaryTransmuteMonster[] = useMemo(() => {
    const list: BestiaryTransmuteMonster[] = [];
    const bestiary = character.bestiary || {};

    Object.entries(bestiary).forEach(([name, entry]) => {
      if (!entry) return;
      const count = entry.defeatedCount || 0;
      // 100회 이상 처치한 몬스터만 필터링
      if (count >= 100) {
        const isBoss = Boolean(bossMap[name] || name.includes('[BOSS]'));
        const visualUrl = getBestiaryMonsterVisualUrl(name);
        list.push({
          id: `bestiary_${name}`,
          name,
          defeatedCount: count,
          visualUrl,
          isBoss,
          stage: isBoss ? '보스 마물' : '일반 마물'
        });
      }
    });

    return list.sort((a, b) => b.defeatedCount - a.defeatedCount);
  }, [character.bestiary]);

  // --------------------------------------------------------------------------
  // Tab 2: BGM State
  // --------------------------------------------------------------------------
  const [selectedBgmTargetId, setSelectedBgmTargetId] = useState<string>('player');
  const [bgmInputUrl, setBgmInputUrl] = useState<string>('');
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [bgmCompSearch, setBgmCompSearch] = useState<string>('');
  const [bgmCompFilter, setBgmCompFilter] = useState<'all' | 'custom' | 'hasBgm' | 'noBgm' | 'party'>('all');
  const [bgmCompSort, setBgmCompSort] = useState<'name' | 'level'>('name');
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // --------------------------------------------------------------------------
  // Tab 3: Custom Modification State
  // --------------------------------------------------------------------------
  const [selectedCustomCompanionId, setSelectedCustomCompanionId] = useState<string | null>(null);
  const [customCompSearch, setCustomCompSearch] = useState<string>('');
  const [customCompFilter, setCustomCompFilter] = useState<'all' | 'unmodified' | 'custom' | 'humanoid' | 'monster' | 'party'>('all');
  const [customCompSort, setCustomCompSort] = useState<'name' | 'level'>('level');
  const [targetMonsterShinryoku, setTargetMonsterShinryoku] = useState<string>('화염');

  // Reset tab on open if initialTab provided
  useEffect(() => {
    if (isOpen) {
      if (initialTab === 'bgm' && facilityLevel >= 5) setActiveTab('bgm');
      else if (initialTab === 'transmute' && facilityLevel >= 3) setActiveTab('transmute');
      else setActiveTab('custom');
    }
  }, [isOpen, initialTab, facilityLevel]);

  // Clean up audio preview when closing or unmounting
  useEffect(() => {
    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current = null;
      }
    };
  }, []);

  // --------------------------------------------------------------------------
  // Companion & Monster Lists Helpers
  // --------------------------------------------------------------------------
  const allCompanionsList = useMemo(() => {
    return [
      ...(character.companions || []).map(c => ({ 
        ...c, 
        _inParty: true,
        _isMonster: isMonsterCompanion(c),
        isCustom: isCustomEntity(c)
      })),
      ...(character.inactiveCompanions || []).map(c => ({ 
        ...c, 
        _inParty: false,
        _isMonster: isMonsterCompanion(c),
        isCustom: isCustomEntity(c)
      })),
      ...(character.base?.capturedMonsters || []).filter(m => !isEggMonster(m)).map((m: any) => ({
        ...m,
        _inParty: false,
        _isMonster: true,
        _isCapturedMonster: true,
        isCustom: isCustomEntity(m),
        race: '몬스터',
        classType: m.stage || '성장기',
        skills: m.skills || [],
        statPoints: m.statPoints || 0
      }))
    ];
  }, [character]);

  const currentSelectedBgmEntity = useMemo(() => {
    if (selectedBgmTargetId === 'player') return character;
    return allCompanionsList.find(c => c.id === selectedBgmTargetId);
  }, [selectedBgmTargetId, character, allCompanionsList]);

  const currentEntityBgmUrl = useMemo(() => {
    if (selectedBgmTargetId === 'player') return character.bgmUrl || '';
    return allCompanionsList.find(c => c.id === selectedBgmTargetId)?.bgmUrl || '';
  }, [selectedBgmTargetId, character.bgmUrl, allCompanionsList]);

  useEffect(() => {
    setBgmInputUrl(currentEntityBgmUrl || '');
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    }
  }, [selectedBgmTargetId, currentEntityBgmUrl]);

  if (!isOpen) return null;

  // --------------------------------------------------------------------------
  // Image Upload Handler for Transmute
  // --------------------------------------------------------------------------
  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64 = event.target?.result as string;
        if (base64) {
          const optimized = await optimizeImage(base64);
          
          if (useWebUpload) {
            // 사용자가 외부 서버 업로드(개인정보 위험 인지 후 자발적 선택)를 원했을 경우 웹 업로드 실행
            try {
              const remoteUrl = await uploadImageToWeb(optimized);
              setCustomTransmuteUrl(remoteUrl);
            } catch (webErr) {
              console.error('웹 업로드 실패, 원본 로컬 데이터로 대체합니다.', webErr);
              setCustomTransmuteUrl(optimized);
            }
          } else {
            // 기본값은 안전하게 로컬에 최적화 저장 (개인정보 완벽 보안)
            setCustomTransmuteUrl(optimized);
          }
        }
      } catch (err) {
        console.error('Image optimization failed', err);
        if (event.target?.result) {
          setCustomTransmuteUrl(event.target.result as string);
        }
      } finally {
        setIsUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // --------------------------------------------------------------------------
  // Transmute Action
  // --------------------------------------------------------------------------
  const handleTransmute = () => {
    const manaCost = 5;
    const currentMana = character.base?.resources.manaCrystal || 0;
    if (currentMana < manaCost) {
      alert(`마정석이 부족합니다. (필요: ${manaCost}개, 보유: ${currentMana}개)`);
      return;
    }

    const newChar = { ...character };
    if (!newChar.base) return;

    // Deduct mana
    newChar.base.resources.manaCrystal -= manaCost;

    let baseName = '';
    let materialName = '직접 등록 외형';

    if (transmuteMode === 'equipment') {
      const selectedBase = equipmentInventory.find(e => e._equipKey === transmuteBaseEquipKey || (transmuteBaseIdx !== null && e._invIdx === transmuteBaseIdx));
      if (!selectedBase) {
        alert('변환할 기본 장비를 선택해주세요.');
        return;
      }
      baseName = selectedBase.name;

      let targetUrl = '';
      if (isCustomTransmute) {
        if (!customTransmuteUrl.trim()) {
          alert('적용할 이미지 URL이나 파일을 등록해주세요.');
          return;
        }
        targetUrl = customTransmuteUrl.trim();
      } else {
        const selectedMat = equipmentInventory.find(e => e._equipKey === transmuteMaterialEquipKey || (transmuteMaterialIdx !== null && e._invIdx === transmuteMaterialIdx));
        if (!selectedMat) {
          alert('외형을 가져올 재료 장비를 선택해주세요.');
          return;
        }
        materialName = selectedMat.name;
        targetUrl = getItemVisualUrl(selectedMat);
      }

      if (selectedBase._source === 'inventory' && typeof selectedBase._invIdx === 'number') {
        if (newChar.inventory && newChar.inventory[selectedBase._invIdx]) {
          newChar.inventory[selectedBase._invIdx] = {
            ...newChar.inventory[selectedBase._invIdx],
            imageUrl: targetUrl || undefined,
            visualUrl: targetUrl || undefined
          };
        }
      } else if (selectedBase._source === 'equipped_player' && selectedBase._equipSlot) {
        if (newChar.equipment && (newChar.equipment as any)[selectedBase._equipSlot]) {
          (newChar.equipment as any)[selectedBase._equipSlot] = {
            ...(newChar.equipment as any)[selectedBase._equipSlot],
            imageUrl: targetUrl || undefined,
            visualUrl: targetUrl || undefined
          };
        }
      }
    } else if (transmuteMode === 'player') {
      baseName = character.name;
      let materialVisualUrl = '';

      if (isCustomTransmute) {
        if (!customTransmuteUrl.trim()) {
          alert('적용할 이미지 URL이나 파일을 등록해주세요.');
          return;
        }
        materialVisualUrl = customTransmuteUrl;
      } else {
        const allMonsters = getAllTransmuteMonsters(character);
        const allComps = getAllTransmuteCompanions(character);

        if (transmuteMaterialType === 'monster') {
          const matMon = bestiaryMonsters.find(m => m.id === transmuteMaterialMonsterId);
          if (!matMon) {
            alert('외형을 가져올 도감 몬스터(100회 이상 처치)를 선택해주세요.');
            return;
          }
          materialName = matMon.name;
          materialVisualUrl = matMon.visualUrl;
        } else {
          const matComp = allComps.find(c => c.id === transmuteMaterialCompanionId);
          if (!matComp) {
            alert('외형을 가져올 재료 동료를 선택해주세요.');
            return;
          }
          materialName = matComp.nickname || matComp.name;
          materialVisualUrl = getCompanionDisplayVisualUrl(matComp);
        }
      }

      newChar.visualUrl = materialVisualUrl;
    } else if (transmuteMode === 'monster') {
      const allMonsters = getAllTransmuteMonsters(character);
      const baseMon = allMonsters.find(m => m.id === transmuteBaseMonsterId || (transmuteBaseIdx !== null && m.capturedIdx === transmuteBaseIdx));
      if (!baseMon) {
        alert('변환할 기본 커스텀 몬스터를 선택해주세요.');
        return;
      }
      if (!baseMon.isCustom) {
        alert('외형 변환은 커스텀 개조된 몬스터만 가능합니다.');
        return;
      }
      baseName = baseMon.nickname || baseMon.name;

      let materialVisualUrl = '';
      if (isCustomTransmute) {
        if (!customTransmuteUrl.trim()) {
          alert('적용할 이미지 URL이나 파일을 등록해주세요.');
          return;
        }
        materialVisualUrl = customTransmuteUrl;
      } else {
        let matEntity: any = null;
        if (transmuteMaterialType === 'monster') {
          matEntity = bestiaryMonsters.find(m => m.id === transmuteMaterialMonsterId);
        } else {
          matEntity = getAllTransmuteCompanions(character).find(c => c.id === transmuteMaterialCompanionId);
        }
        if (!matEntity) {
          alert(transmuteMaterialType === 'monster' ? '외형을 가져올 도감 몬스터(100회 이상 처치)를 선택해주세요.' : '외형을 가져올 재료를 선택해주세요.');
          return;
        }
        materialName = matEntity.name || matEntity.nickname;
        materialVisualUrl = transmuteMaterialType === 'monster' ? matEntity.visualUrl : getCompanionDisplayVisualUrl(matEntity);
      }

      if (baseMon.source === 'captured') {
        newChar.base!.capturedMonsters = (character.base?.capturedMonsters || []).map(m => (m.id === baseMon.raw.id ? { ...m, visualUrl: materialVisualUrl, imageUrl: materialVisualUrl } : m));
      } else if (baseMon.source === 'party') {
        newChar.companions = (character.companions || []).map(c => c.id === baseMon.id ? { ...c, visualUrl: materialVisualUrl, imageUrl: materialVisualUrl } : c);
      } else {
        newChar.inactiveCompanions = (character.inactiveCompanions || []).map(c => c.id === baseMon.id ? { ...c, visualUrl: materialVisualUrl, imageUrl: materialVisualUrl } : c);
      }
    } else {
      // transmuteMode === 'companion'
      const allComps = getAllTransmuteCompanions(character);
      const baseComp = allComps.find(c => c.id === transmuteBaseCompanionId);
      if (!baseComp) {
        alert('변환할 기본 커스텀 동료를 선택해주세요.');
        return;
      }
      if (!baseComp.isCustom) {
        alert('외형 변환은 커스텀 개조된 동료만 가능합니다.');
        return;
      }
      baseName = baseComp.name;

      let materialVisualUrl = '';
      if (isCustomTransmute) {
        if (!customTransmuteUrl.trim()) {
          alert('적용할 이미지 URL이나 파일을 등록해주세요.');
          return;
        }
        materialVisualUrl = customTransmuteUrl;
      } else {
        let matEntity: any = null;
        if (transmuteMaterialType === 'monster') {
          matEntity = bestiaryMonsters.find(m => m.id === transmuteMaterialMonsterId);
        } else {
          matEntity = allComps.find(c => c.id === transmuteMaterialCompanionId);
        }
        if (!matEntity) {
          alert(transmuteMaterialType === 'monster' ? '외형을 가져올 도감 몬스터(100회 이상 처치)를 선택해주세요.' : '외형을 가져올 재료를 선택해주세요.');
          return;
        }
        materialName = matEntity.name || matEntity.nickname;
        materialVisualUrl = transmuteMaterialType === 'monster' ? matEntity.visualUrl : getCompanionDisplayVisualUrl(matEntity);
      }

      newChar.companions = (newChar.companions || []).map(c => c.id === baseComp.id ? { ...c, visualUrl: materialVisualUrl, imageUrl: materialVisualUrl } : c);
      newChar.inactiveCompanions = (newChar.inactiveCompanions || []).map(c => c.id === baseComp.id ? { ...c, visualUrl: materialVisualUrl, imageUrl: materialVisualUrl } : c);
    }

    setResultOverlay({
      show: true,
      data: {
        type: 'success',
        title: '외형 변환 완료',
        message: `${baseName}의 외형이 성공적으로 변환되었습니다.`,
        items: [
          { label: '대상', after: baseName },
          { label: '적용된 외형', after: materialName }
        ]
      }
    });

    onUpdateCharacter(newChar, `[커스텀 개조실] ${baseName}의 외형을 변환했습니다.`);
  };

  // --------------------------------------------------------------------------
  // BGM Actions
  // --------------------------------------------------------------------------
  const handleBgmFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      alert('오디오 파일(mp3, wav, ogg 등)만 등록 가능합니다.');
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

  const toggleAudioPreview = () => {
    if (!bgmInputUrl.trim()) return;

    if (isPlayingPreview) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      setIsPlayingPreview(false);
    } else {
      try {
        if (!audioPreviewRef.current) {
          audioPreviewRef.current = new Audio();
        }
        audioPreviewRef.current.src = bgmInputUrl.trim();
        audioPreviewRef.current.onended = () => setIsPlayingPreview(false);
        audioPreviewRef.current.onerror = () => {
          alert('오디오를 재생할 수 없습니다. 올바른 오디오 URL 또는 파일인지 확인해주세요.');
          setIsPlayingPreview(false);
        };
        audioPreviewRef.current.play();
        setIsPlayingPreview(true);
      } catch (err) {
        console.error('Audio play error', err);
        setIsPlayingPreview(false);
      }
    }
  };

  const handleSaveBgm = () => {
    const manaCost = 5;
    const currentMana = character.base?.resources.manaCrystal || 0;
    if (currentMana < manaCost) {
      alert(`마정석이 부족합니다. (필요: ${manaCost}개, 보유: ${currentMana}개)`);
      return;
    }

    const newChar = { ...character };
    if (!newChar.base) return;

    newChar.base.resources.manaCrystal -= manaCost;
    const targetName = selectedBgmTargetId === 'player' ? character.name : currentSelectedBgmEntity?.name || '동료';

    if (selectedBgmTargetId === 'player') {
      newChar.bgmUrl = bgmInputUrl.trim() || undefined;
    } else {
      const targetComp = allCompanionsList.find(c => c.id === selectedBgmTargetId);
      if (!targetComp) return;

      if (!targetComp.isCustom) {
        alert('등장 테마곡(BGM) 설정은 커스텀 개체로 승격된 동료 및 몬스터만 가능합니다. [커스텀 개조] 탭에서 먼저 승격해 주세요.');
        return;
      }

      const isMon = targetComp._isMonster || isMonsterCompanion(targetComp);

      if (isMon && (targetComp as any)._isCapturedMonster) {
        newChar.base.capturedMonsters = (character.base?.capturedMonsters || []).map(m => {
          if (m.id === targetComp.id) {
            return { ...m, bgmUrl: bgmInputUrl.trim() || undefined };
          }
          return m;
        });
      } else {
        newChar.companions = (character.companions || []).map(c => {
          if (c.id === targetComp.id) {
            return { ...c, bgmUrl: bgmInputUrl.trim() || undefined };
          }
          return c;
        });
        newChar.inactiveCompanions = (character.inactiveCompanions || []).map(c => {
          if (c.id === targetComp.id) {
            return { ...c, bgmUrl: bgmInputUrl.trim() || undefined };
          }
          return c;
        });
      }
    }

    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    }

    setResultOverlay({
      show: true,
      data: {
        type: 'success',
        title: '등장 테마곡 설정 완료',
        message: `${targetName}의 전투 등장 테마곡이 성공적으로 등록되었습니다.`,
        items: [
          { label: '대상', after: targetName },
          { label: '설정 상태', after: bgmInputUrl.trim() ? '전용 테마곡 적용' : '기본 음악으로 초기화' }
        ]
      }
    });

    onUpdateCharacter(newChar, `[커스텀 개조실] ${targetName}의 전투 등장 테마곡을 설정했습니다.`);
  };

  const handleResetBgm = () => {
    setBgmInputUrl('');
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    }
  };

  // --------------------------------------------------------------------------
  // Custom Modification Actions
  // --------------------------------------------------------------------------
  const handleUpgradeToCustom = () => {
    if (!selectedCustomCompanionId) {
      alert('개조할 대상을 선택해주세요.');
      return;
    }

    const targetComp = allCompanionsList.find(c => c.id === selectedCustomCompanionId);
    if (!targetComp) return;

    if (isEggMonster(targetComp)) {
      alert('알 상태의 몬스터는 개조할 수 없습니다. 부화 후 진행해주세요.');
      return;
    }

    const currentMana = character.base?.resources.manaCrystal || 0;
    const flowerInfo = getShinryokuFlowerCount(character);

    if (currentMana < CUSTOM_CONVERT_MANA_CRYSTAL) {
      alert(`마정석이 부족합니다. (필요: ${CUSTOM_CONVERT_MANA_CRYSTAL}개, 보유: ${currentMana}개)`);
      return;
    }
    if (flowerInfo.total < CUSTOM_CONVERT_FLOWER) {
      alert(`신력꽃이 부족합니다. (필요: ${CUSTOM_CONVERT_FLOWER}송이, 기지+소지품 보유: ${flowerInfo.total}송이)`);
      return;
    }

    const isTargetMonster = isMonsterCompanion(targetComp);
    const resolvedVisual = getCompanionDisplayVisualUrl(targetComp);

    const newChar = { ...character };
    if (!newChar.base) return;

    newChar.base.resources.manaCrystal -= CUSTOM_CONVERT_MANA_CRYSTAL;

    let flowerDeducted = 0;
    const currentBaseFlower = newChar.base.resources.shinryoku_flower || 0;
    if (currentBaseFlower > 0) {
      const useBase = Math.min(currentBaseFlower, CUSTOM_CONVERT_FLOWER);
      newChar.base.resources.shinryoku_flower -= useBase;
      flowerDeducted += useBase;
    }

    if (flowerDeducted < CUSTOM_CONVERT_FLOWER) {
      const remainingNeed = CUSTOM_CONVERT_FLOWER - flowerDeducted;
      let invDeducted = 0;
      const updatedInventory: Item[] = [];
      for (const item of newChar.inventory || []) {
        const name = (item.name || '').replace(/\s+/g, '');
        if ((name.includes('신력의꽃') || name.includes('신력꽃')) && invDeducted < remainingNeed) {
          const itemQty = item.quantity || 1;
          const need = remainingNeed - invDeducted;
          if (itemQty <= need) {
            invDeducted += itemQty;
          } else {
            const remain = itemQty - need;
            invDeducted += need;
            updatedInventory.push({ ...item, quantity: remain });
          }
        } else {
          updatedInventory.push(item);
        }
      }
      newChar.inventory = updatedInventory;
    }

    if (isTargetMonster) {
      if ((targetComp as any)._isCapturedMonster) {
        newChar.base.capturedMonsters = (character.base?.capturedMonsters || []).map(m => {
          if (m.id === targetComp.id) {
            return {
              ...m,
              isCustomMonster: true,
              isCustom: true,
              visualUrl: resolvedVisual,
              imageUrl: resolvedVisual
            };
          }
          return m;
        });
      } else {
        newChar.companions = (character.companions || []).map(c => {
          if (c.id === targetComp.id) {
            return {
              ...c,
              isCustomMonster: true,
              isCustom: true,
              visualUrl: resolvedVisual,
              imageUrl: resolvedVisual
            };
          }
          return c;
        });
        newChar.inactiveCompanions = (character.inactiveCompanions || []).map(c => {
          if (c.id === targetComp.id) {
            return {
              ...c,
              isCustomMonster: true,
              isCustom: true,
              visualUrl: resolvedVisual,
              imageUrl: resolvedVisual
            };
          }
          return c;
        });
      }
    } else {
      newChar.companions = (character.companions || []).map(c => {
        if (c.id === targetComp.id) {
          return {
            ...c,
            isCustomCompanion: true,
            isCustom: true,
            visualUrl: resolvedVisual,
            imageUrl: resolvedVisual
          };
        }
        return c;
      });
      newChar.inactiveCompanions = (character.inactiveCompanions || []).map(c => {
        if (c.id === targetComp.id) {
          return {
            ...c,
            isCustomCompanion: true,
            isCustom: true,
            visualUrl: resolvedVisual,
            imageUrl: resolvedVisual
          };
        }
        return c;
      });
    }

    setResultOverlay({
      show: true,
      data: {
        type: 'success',
        title: '커스텀 개조 승격 완료',
        message: `${targetComp.name}이(가) 커스텀 개체로 성공적으로 개조 승격되었습니다! 이제 외형 변경, 전용 BGM 및 스킬 이펙트 커스터마이징이 가능합니다.`,
        items: [
          { label: '대상', after: targetComp.name },
          { label: '승격 상태', after: '커스텀 개체 활성화' }
        ]
      }
    });

    onUpdateCharacter(newChar, `[커스텀 개조실] ${targetComp.name}을(를) 커스텀 개체로 승격했습니다.`);
  };

  const handleConvertMonsterShinryoku = () => {
    if (!selectedCustomCompanionId) {
      alert('속성을 변환할 몬스터를 선택해주세요.');
      return;
    }

    const targetComp = allCompanionsList.find(c => c.id === selectedCustomCompanionId);
    if (!targetComp || !isMonsterCompanion(targetComp)) {
      alert('몬스터 동료만 신력 속성 변환이 가능합니다.');
      return;
    }

    const reqShards = getMonsterShinryokuShardRequirement(targetComp);
    const availableShards = getShinryokuShardsCount(character, targetMonsterShinryoku);

    if (availableShards < reqShards) {
      alert(`[${targetMonsterShinryoku}] 신력 조각이 부족합니다. (필요: ${reqShards}개, 보유: ${availableShards}개)`);
      return;
    }

    const newChar = { ...character };
    if (!newChar.base) return;

    let deducted = 0;
    const currentBaseShards = (newChar.base.resources as any)?.shinryoku_shard || 0;
    if (currentBaseShards > 0) {
      const useBase = Math.min(currentBaseShards, reqShards);
      (newChar.base.resources as any).shinryoku_shard -= useBase;
      deducted += useBase;
    }

    if (deducted < reqShards) {
      const remainingNeed = reqShards - deducted;
      let invDeducted = 0;
      newChar.inventory = (newChar.inventory || []).map(item => {
        if (invDeducted >= remainingNeed) return item;
        const name = (item.name || '').replace(/\s+/g, '');
        const cleanType = (targetMonsterShinryoku || '').replace(/\s+/g, '');
        if (name === `${cleanType}조각` || name === '신력조각' || name === '신력의조각' || name === '신력파편') {
          const qty = item.quantity || 1;
          const need = remainingNeed - invDeducted;
          if (qty <= need) {
            invDeducted += qty;
            return null;
          } else {
            invDeducted += need;
            return { ...item, quantity: qty - need };
          }
        }
        return item;
      }).filter(Boolean) as Item[];
    }

    const currentShinryoku = (targetComp as any).shinryokuType || (targetComp as any).element || '무속성';

    if ((targetComp as any)._isCapturedMonster) {
      newChar.base.capturedMonsters = (character.base?.capturedMonsters || []).map(m => {
        if (m.id === targetComp.id) {
          return {
            ...m,
            shinryokuType: targetMonsterShinryoku,
            element: targetMonsterShinryoku
          };
        }
        return m;
      });
    } else {
      newChar.companions = (character.companions || []).map(c => {
        if (c.id === targetComp.id) {
          return {
            ...c,
            shinryokuType: targetMonsterShinryoku,
            element: targetMonsterShinryoku
          };
        }
        return c;
      });
      newChar.inactiveCompanions = (character.inactiveCompanions || []).map(c => {
        if (c.id === targetComp.id) {
          return {
            ...c,
            shinryokuType: targetMonsterShinryoku,
            element: targetMonsterShinryoku
          };
        }
        return c;
      });
    }

    setResultOverlay({
      show: true,
      data: {
        type: 'success',
        title: '몬스터 신력 속성 변환 완료',
        message: `${targetComp.name}의 신력 속성이 [${targetMonsterShinryoku}] 계통으로 성공적으로 변경되었습니다!`,
        items: [
          { label: '대상', after: targetComp.name },
          { label: '기존 속성', before: currentShinryoku, after: targetMonsterShinryoku }
        ]
      }
    });

    onUpdateCharacter(newChar, `[커스텀 개조실] ${targetComp.name}의 신력 속성을 [${targetMonsterShinryoku}]으로 변환했습니다.`);
  };

  // Helper for inventory & equipped equipments filtering
  const equipmentInventory = useMemo(() => {
    const list: any[] = [];

    // 1. 착용 장비 (플레이어)
    if (character.equipment) {
      const equipSlots: Array<{ key: string; label: string }> = [
        { key: 'weapon', label: '주무기' },
        { key: 'subWeapon', label: '보조무기' },
        { key: 'head', label: '머리/투구' },
        { key: 'body', label: '갑옷/의복' },
        { key: 'hand', label: '장갑' },
        { key: 'feet', label: '신발' },
        { key: 'accessory', label: '장신구' }
      ];

      equipSlots.forEach(({ key, label }) => {
        const item = (character.equipment as any)?.[key];
        if (item && item.name) {
          const cat = getItemEquipCategory(item) || (key === 'weapon' || key === 'subWeapon' ? 'weapon' : key === 'accessory' ? 'accessory' : 'armor');
          list.push({
            ...item,
            _equipKey: `player_equip_${key}`,
            _source: 'equipped_player',
            _equipSlot: key,
            _equipCategory: cat,
            _sourceLabel: `착용: ${label}`
          });
        }
      });
    }

    // 2. 소지품 (인벤토리)
    (character.inventory || []).forEach((item, idx) => {
      const cat = getItemEquipCategory(item);
      if (cat) {
        list.push({
          ...item,
          _equipKey: `inv_${idx}`,
          _invIdx: idx,
          _source: 'inventory',
          _equipCategory: cat,
          _sourceLabel: '소지품'
        });
      }
    });

    return list.filter(item => {
      if (transmuteEquipCategory !== 'all' && item._equipCategory !== transmuteEquipCategory) {
        return false;
      }

      if (transmuteEquipSearch.trim()) {
        const q = transmuteEquipSearch.trim().toLowerCase();
        if (!item.name.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (transmuteEquipSort === 'rarity') {
        const rA = RARITY_ORDER[a.rarity || ''] ?? -1;
        const rB = RARITY_ORDER[b.rarity || ''] ?? -1;
        if (rA !== rB) return rB - rA;
      }
      if (transmuteEquipSort === 'name') {
        return (a.name || '').localeCompare(b.name || '', 'ko');
      }
      return (a.type || '').localeCompare(b.type || '', 'ko');
    });
  }, [character.equipment, character.inventory, transmuteEquipCategory, transmuteEquipSearch, transmuteEquipSort]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-pink-500/40 rounded-2xl w-full max-w-5xl h-[92vh] max-h-[900px] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="bg-slate-950/90 px-4 sm:px-6 py-3.5 border-b border-pink-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(236,72,153,0.3)]">
              <Wand2 className="text-pink-400" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-pink-300 tracking-wide">
                  커스텀 개조실
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-950/80 text-pink-400 border border-pink-500/40">
                  Lv.{facilityLevel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                동료/몬스터 커스텀 승격, 외형 변환, 전투 등장 테마곡(BGM) 설정 전용 연구 시설
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
            title="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation Bar - Touch Friendly & Scrollable with Level Restrictions */}
        <div className="bg-slate-950/95 border-b border-slate-800 px-2 sm:px-4 py-2 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
          {/* Tab 1: Custom Modification (Lv.1) */}
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap min-h-[42px] ${
              activeTab === 'custom'
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/30 ring-1 ring-pink-400'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles size={15} className="text-pink-400" />
            <span>커스텀 개조</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-pink-300 border border-pink-500/30">Lv.1</span>
          </button>

          {/* Tab 2: Transmute (Lv.3) */}
          <button
            onClick={() => {
              if (!isTransmuteUnlocked) {
                alert('외형 변환은 커스텀 개조실 시설 레벨 3 이상에서 이용할 수 있습니다.');
                return;
              }
              setActiveTab('transmute');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap min-h-[42px] ${
              !isTransmuteUnlocked
                ? 'bg-slate-950/60 text-slate-600 border border-slate-800/50 cursor-not-allowed opacity-75'
                : activeTab === 'transmute'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30 ring-1 ring-purple-400'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {isTransmuteUnlocked ? <Palette size={15} className="text-purple-400" /> : <Lock size={15} className="text-slate-500" />}
            <span>외형 변환</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded ${isTransmuteUnlocked ? 'bg-slate-800 text-purple-300 border border-purple-500/30' : 'bg-red-950/80 text-red-400 border border-red-800/40'}`}>
              Lv.3 {isTransmuteUnlocked ? '해금' : '필요'}
            </span>
          </button>

          {/* Tab 3: BGM (Lv.5) */}
          <button
            onClick={() => {
              if (!isBgmUnlocked) {
                alert('등장 테마곡(BGM) 설정은 커스텀 개조실 시설 레벨 5 이상에서 이용할 수 있습니다.');
                return;
              }
              setActiveTab('bgm');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap min-h-[42px] ${
              !isBgmUnlocked
                ? 'bg-slate-950/60 text-slate-600 border border-slate-800/50 cursor-not-allowed opacity-75'
                : activeTab === 'bgm'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30 ring-1 ring-cyan-400'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {isBgmUnlocked ? <Music size={15} className="text-cyan-400" /> : <Lock size={15} className="text-slate-500" />}
            <span>등장 BGM</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded ${isBgmUnlocked ? 'bg-slate-800 text-cyan-300 border border-cyan-500/30' : 'bg-red-950/80 text-red-400 border border-red-800/40'}`}>
              Lv.5 {isBgmUnlocked ? '해금' : '필요'}
            </span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-3 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          
          {/* ================================================================ */}
          {/* TAB: CUSTOM (커스텀 개조 승격) - Lv.1 */}
          {/* ================================================================ */}
          {activeTab === 'custom' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-pink-950/50 via-purple-950/40 to-slate-900 border border-pink-500/30 rounded-xl p-3.5 sm:p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-600/20 border border-pink-500/40 flex items-center justify-center shrink-0">
                    <Sparkles className="text-pink-400" size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-pink-300">
                      커스텀 개조 승격 및 신력 속성 변환
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      일반 동료와 몬스터를 [커스텀 개체]로 승격하여 외형 변경, 테마곡 설정, 스킬 이펙트 커스터마이징 권한을 부여합니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Left: Companion / Monster List */}
                <div className="md:col-span-6 bg-slate-950/80 border border-slate-800 rounded-xl p-3 sm:p-4 space-y-3 flex flex-col h-[520px]">
                  <div className="flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <UserCheck size={14} className="text-pink-400" /> 대상 목록 ({allCompanionsList.length})
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCustomCompSort(prev => prev === 'level' ? 'name' : 'level')}
                        className="p-1 text-[11px] font-bold text-slate-400 hover:text-pink-300 bg-slate-900 px-2 rounded border border-slate-800 flex items-center gap-1"
                      >
                        <ArrowUpDown size={11} />
                        <span>{customCompSort === 'level' ? '레벨순' : '이름순'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter & Search */}
                  <div className="space-y-2 shrink-0">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 text-slate-500" size={13} />
                      <input
                        type="text"
                        value={customCompSearch}
                        onChange={(e) => setCustomCompSearch(e.target.value)}
                        placeholder="이름 또는 직업/종족 검색..."
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {[
                        { id: 'all', label: '전체' },
                        { id: 'unmodified', label: '일반 미개조' },
                        { id: 'custom', label: '커스텀 완료' },
                        { id: 'humanoid', label: '인간형' },
                        { id: 'monster', label: '몬스터' },
                        { id: 'party', label: '파티원' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setCustomCompFilter(tab.id as any)}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                            customCompFilter === tab.id
                              ? 'bg-pink-600 text-white'
                              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* List Container */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                    {allCompanionsList.filter((comp) => {
                      if (customCompFilter === 'unmodified' && comp.isCustom) return false;
                      if (customCompFilter === 'custom' && !comp.isCustom) return false;
                      if (customCompFilter === 'humanoid' && comp._isMonster) return false;
                      if (customCompFilter === 'monster' && !comp._isMonster) return false;
                      if (customCompFilter === 'party' && !comp._inParty) return false;
                      if (customCompSearch.trim()) {
                        const query = customCompSearch.trim().toLowerCase();
                        const nameMatch = (comp.name || '').toLowerCase().includes(query);
                        const jobMatch = ((comp.classType || comp.job || '')).toLowerCase().includes(query);
                        if (!nameMatch && !jobMatch) return false;
                      }
                      return true;
                    }).sort((a, b) => {
                      if (customCompSort === 'level') return (b.level || 1) - (a.level || 1);
                      return (a.name || '').localeCompare(b.name || '', 'ko');
                    }).map((comp) => {
                      const isSelected = selectedCustomCompanionId === comp.id;
                      const isMon = comp._isMonster || isMonsterCompanion(comp);
                      return (
                        <div
                          key={comp.id}
                          onClick={() => setSelectedCustomCompanionId(comp.id)}
                          className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                            isSelected
                              ? 'bg-pink-950/60 border-pink-500 text-white shadow-[0_0_12px_rgba(236,72,153,0.2)]'
                              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <img
                            src={getCompanionDisplayVisualUrl(comp)}
                            alt={comp.name}
                            className="w-11 h-11 rounded-lg object-cover border border-slate-700 bg-slate-950 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold truncate flex items-center gap-1">
                                {comp.name}
                                {comp.isCustom && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-pink-950 text-pink-300 border border-pink-500/40">
                                    커스텀
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">Lv.{comp.level}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-500 truncate">
                                {isMon ? (comp.stage || '마수') : (comp.classType || comp.job || '동료')}
                              </span>
                              {comp._inParty && (
                                <span className="text-[9px] text-indigo-400 font-bold">파티중</span>
                              )}
                              {(comp as any).shinryokuType && (
                                <span className="text-[9px] text-amber-400">속성: {(comp as any).shinryokuType}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Selected Target Actions */}
                <div className="md:col-span-6 bg-slate-950/80 border border-slate-800 rounded-xl p-3 sm:p-4 space-y-4 flex flex-col justify-between h-[520px]">
                  {selectedCustomCompanionId ? (() => {
                    const selectedComp = allCompanionsList.find(c => c.id === selectedCustomCompanionId);
                    if (!selectedComp) return null;
                    const isMon = selectedComp._isMonster || isMonsterCompanion(selectedComp);
                    const currentMana = character.base?.resources.manaCrystal || 0;
                    const flowerInfo = getShinryokuFlowerCount(character);

                    const reqShards = isMon ? getMonsterShinryokuShardRequirement(selectedComp) : 0;
                    const availableShards = isMon ? getShinryokuShardsCount(character, targetMonsterShinryoku) : 0;

                    return (
                      <div className="flex-1 flex flex-col justify-between space-y-4">
                        {/* Target Info Header */}
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
                          <img
                            src={getCompanionDisplayVisualUrl(selectedComp)}
                            alt={selectedComp.name}
                            className="w-16 h-16 rounded-xl object-cover border border-pink-500/40 bg-slate-950 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white truncate">{selectedComp.name}</h4>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                                selectedComp.isCustom ? 'bg-pink-950 text-pink-300 border border-pink-500/40' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {selectedComp.isCustom ? '커스텀 개체' : '일반 개체'}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400 block mt-0.5 font-mono">
                              Lv.{selectedComp.level} • {isMon ? '몬스터' : '동료'}
                            </span>
                            {(selectedComp as any).shinryokuType && (
                              <span className="text-xs text-amber-400 font-bold block mt-0.5">
                                신력 속성: {(selectedComp as any).shinryokuType}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action 1: Upgrade to Custom */}
                        <div className="bg-slate-900/60 border border-pink-500/30 rounded-xl p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                              <Wand2 size={13} /> 커스텀 개체 승격
                            </span>
                            {selectedComp.isCustom && (
                              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                <Check size={12} /> 승격 완료됨
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            일반 개체를 커스텀 개체로 승격하여 외형 변환, 등장 테마곡 설정, 스킬 이펙트 커스터마이징 권한을 부여합니다.
                          </p>
                          {/* 소모 자원 및 현재 보유 분리 레이아웃 */}
                          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 space-y-2 text-xs">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                              <span className="text-slate-400 font-bold">소모 필요 자원</span>
                              <div className="flex items-center gap-3 font-mono font-bold text-[11px]">
                                <span className="text-purple-300">마정석 {CUSTOM_CONVERT_MANA_CRYSTAL}개</span>
                                <span className="text-pink-300">신력꽃 {CUSTOM_CONVERT_FLOWER}송이</span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="text-[10px] text-slate-500 font-semibold">현재 보유 자원</div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-mono">
                                <div className={`flex items-center justify-between px-2 py-1 rounded bg-slate-900/80 border ${currentMana >= CUSTOM_CONVERT_MANA_CRYSTAL ? 'border-purple-900/50 text-purple-300' : 'border-red-900/50 text-red-400'}`}>
                                  <span className="text-slate-400 text-[10px]">마정석</span>
                                  <span className="font-bold">{currentMana}개 {currentMana < CUSTOM_CONVERT_MANA_CRYSTAL ? '(부족)' : '(보유)'}</span>
                                </div>
                                <div className={`flex items-center justify-between px-2 py-1 rounded bg-slate-900/80 border ${flowerInfo.total >= CUSTOM_CONVERT_FLOWER ? 'border-pink-900/50 text-pink-300' : 'border-red-900/50 text-red-400'}`}>
                                  <span className="text-slate-400 text-[10px]">신력꽃</span>
                                  <span className="font-bold">
                                    총 {flowerInfo.total}송이 {flowerInfo.total < CUSTOM_CONVERT_FLOWER ? '(부족)' : '(보유)'}
                                  </span>
                                </div>
                              </div>
                              <div className="text-[9px] text-slate-500 text-right pr-0.5">
                                신력꽃 상세: 기지 {flowerInfo.base}송이 / 소지품 {flowerInfo.inv}송이
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={handleUpgradeToCustom}
                            disabled={selectedComp.isCustom || currentMana < CUSTOM_CONVERT_MANA_CRYSTAL || flowerInfo.total < CUSTOM_CONVERT_FLOWER}
                            className="w-full py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-bold rounded-lg text-xs shadow transition-all flex items-center justify-center gap-1.5"
                          >
                            <Sparkles size={14} />
                            <span>{selectedComp.isCustom ? '이미 커스텀 개체입니다' : '커스텀 개체로 승격하기'}</span>
                          </button>
                        </div>

                        {/* Action 2: Monster Shinryoku Transformation (Only for Monsters) */}
                        {isMon ? (
                          <div className="bg-slate-900/60 border border-amber-500/30 rounded-xl p-3.5 space-y-2.5">
                            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                              <Flame size={13} /> 몬스터 신력 속성 변환
                            </span>
                            <div className="grid grid-cols-4 gap-1">
                              {SHINRYOKU_TYPES_LIST.map((type) => {
                                const isTarget = targetMonsterShinryoku === type;
                                const config: any = SHINRYOKU_UI_CONFIG[type] || { color: '#fbbf24', icon: Sparkles };
                                return (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() => setTargetMonsterShinryoku(type)}
                                    className={`py-1 px-1.5 rounded text-[11px] font-bold border transition-all flex items-center justify-center gap-1 ${
                                      isTarget
                                        ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                                    }`}
                                  >
                                    <span style={{ color: config.color || '#fbbf24' }}>●</span>
                                    <span>{type}</span>
                                  </button>
                                );
                              })}
                            </div>
                            {/* 소모 필요량 및 현재 보유 분리 레이아웃 */}
                            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 space-y-2 text-xs">
                              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                                <span className="text-slate-400 font-bold">소모 필요 자원</span>
                                <span className="font-mono font-bold text-[11px] text-amber-300">
                                  [{targetMonsterShinryoku}] 신력 조각 {reqShards}개
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] font-mono">
                                <span className="text-slate-500 font-semibold text-[10px]">현재 보유 자원</span>
                                <span className={`font-bold px-2 py-0.5 rounded bg-slate-900/80 border ${availableShards >= reqShards ? 'border-amber-900/50 text-amber-300' : 'border-red-900/50 text-red-400'}`}>
                                  {availableShards}개 {availableShards < reqShards ? '(부족)' : '(보유)'}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={handleConvertMonsterShinryoku}
                              disabled={availableShards < reqShards}
                              className="w-full py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-bold rounded-lg text-xs shadow transition-all flex items-center justify-center gap-1.5"
                            >
                              <Flame size={14} />
                              <span>[{targetMonsterShinryoku}] 속성으로 변환</span>
                            </button>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/80 text-center">
                            <span className="text-xs text-slate-500">인간형 동료는 스킬 연구소 및 전용 직업 훈련소에서 속성 변경이 가능합니다.</span>
                          </div>
                        )}
                      </div>
                    );
                  })() : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                      <Sparkles size={36} className="mb-2 text-slate-600 opacity-60" />
                      <span className="text-sm font-bold text-slate-400">개조할 대상을 선택하세요</span>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs">
                        좌측 목록에서 일반 동료 또는 몬스터를 선택하여 커스텀 승격 및 속성 변환을 진행할 수 있습니다.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB: TRANSMUTE (외형 변환) - Lv.3 */}
          {/* ================================================================ */}
          {activeTab === 'transmute' && (() => {
            const allMonsters = getAllTransmuteMonsters(character);
            const allCompanions = getAllTransmuteCompanions(character);

            // Filter base targets strictly to custom companions / custom monsters
            const customCompanionsOnly = allCompanions.filter(c => c.isCustom);
            const customMonstersOnly = allMonsters.filter(m => m.isCustom);

            const filteredBaseCompanions = customCompanionsOnly.filter(c => {
              if (transmuteCompPartyFilter === 'party' && !c._inParty) return false;
              if (transmuteCompPartyFilter === 'inactive' && c._inParty) return false;
              if (transmuteCompSearch.trim()) {
                const query = transmuteCompSearch.trim().toLowerCase();
                if (!c.name.toLowerCase().includes(query)) return false;
              }
              return true;
            }).sort((a, b) => {
              if (transmuteCompSort === 'level') return (b.level || 1) - (a.level || 1);
              return (a.name || '').localeCompare(b.name || '', 'ko');
            });

            const filteredBaseMonsters = customMonstersOnly.filter(m => {
              if (transmuteMonsterSourceFilter === 'captured' && m.source !== 'captured') return false;
              if (transmuteMonsterSourceFilter === 'party' && m.source !== 'party') return false;
              if (transmuteMonsterSourceFilter === 'inactive' && m.source !== 'inactive') return false;
              if (transmuteMonsterSearch.trim()) {
                const query = transmuteMonsterSearch.trim().toLowerCase();
                const nameMatch = (m.name || '').toLowerCase().includes(query) || (m.nickname || '').toLowerCase().includes(query);
                if (!nameMatch) return false;
              }
              return true;
            }).sort((a, b) => {
              if (transmuteMonsterSort === 'level') return (b.level || 1) - (a.level || 1);
              if (transmuteMonsterSort === 'stage') return (b.stage || '').localeCompare(a.stage || '', 'ko');
              return (a.nickname || a.name || '').localeCompare(b.nickname || b.name || '', 'ko');
            });

            const currentMana = character.base?.resources.manaCrystal || 0;

            return (
              <div className="space-y-4 animate-in fade-in">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-purple-950/50 via-slate-900 to-indigo-950/40 border border-purple-500/30 rounded-xl p-3.5 sm:p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                      <Palette className="text-purple-400" size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-purple-300">
                        외형 변환 공방
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        플레이어, 커스텀 동료, 커스텀 몬스터, 장비의 외형을 다른 외형이나 직접 등록한 이미지로 변환합니다. (소모: 마정석 5개)
                      </p>
                    </div>
                  </div>

                  {/* Category / Mode Selector */}
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => { setTransmuteMode('companion'); setTransmuteMaterialType('companion'); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        transmuteMode === 'companion' ? 'bg-purple-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <UserCheck size={13} /> 커스텀 동료
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTransmuteMode('monster'); setTransmuteMaterialType('monster'); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        transmuteMode === 'monster' ? 'bg-purple-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Sparkles size={13} /> 커스텀 몬스터
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTransmuteMode('player'); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        transmuteMode === 'player' ? 'bg-purple-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <UserCheck size={13} /> 플레이어
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTransmuteMode('equipment'); setTransmuteMaterialType('equipment'); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        transmuteMode === 'equipment' ? 'bg-purple-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Sword size={13} /> 장비
                    </button>
                  </div>
                </div>

                {/* Main Transmute Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Left: Base Target Selection */}
                  <div className="md:col-span-5 bg-slate-950/80 border border-slate-800 rounded-xl p-3 sm:p-4 space-y-3 flex flex-col h-[520px]">
                    <div className="flex items-center justify-between shrink-0">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Palette size={14} className="text-purple-400" /> 변환할 기본 대상
                      </span>
                    </div>

                    {/* Mode Specific Selection List */}
                    {transmuteMode === 'player' ? (
                      <div className="p-4 bg-slate-900/80 rounded-xl border border-purple-500/30 flex items-center gap-3">
                        <img 
                          src={character.visualUrl || generateDefaultVisualUrl(character.name, '기타', '인간', '남성')} 
                          alt={character.name}
                          className="w-16 h-16 rounded-xl object-cover border border-purple-500/40 bg-slate-950"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-white">{character.name}</h4>
                          <span className="text-xs text-purple-300">Lv.{character.level} 플레이어</span>
                        </div>
                      </div>
                    ) : transmuteMode === 'companion' ? (
                      <div className="flex-1 flex flex-col space-y-2 overflow-hidden">
                        {/* Companion search & filters */}
                        <div className="space-y-1.5 shrink-0">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2 text-slate-500" size={13} />
                            <input
                              type="text"
                              value={transmuteCompSearch}
                              onChange={(e) => setTransmuteCompSearch(e.target.value)}
                              placeholder="커스텀 동료 검색..."
                              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1">
                              {(['all', 'party', 'inactive'] as const).map(f => (
                                <button
                                  key={f}
                                  onClick={() => setTransmuteCompPartyFilter(f)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    transmuteCompPartyFilter === f ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400'
                                  }`}
                                >
                                  {f === 'all' ? '전체' : f === 'party' ? '파티원' : '대기원'}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => setTransmuteCompSort(prev => prev === 'level' ? 'name' : 'level')}
                              className="text-[10px] text-slate-400 flex items-center gap-1 hover:text-purple-300"
                            >
                              <ArrowUpDown size={10} /> {transmuteCompSort === 'level' ? '레벨순' : '이름순'}
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                          {filteredBaseCompanions.length === 0 ? (
                            <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800/80 text-center space-y-1.5">
                              <AlertTriangle size={24} className="mx-auto text-amber-400" />
                              <span className="text-xs font-bold text-slate-300 block">커스텀 동료가 없습니다</span>
                              <p className="text-[11px] text-slate-500">
                                외형 변환은 1단계 [커스텀 개조] 탭에서 승격된 커스텀 동료만 가능합니다.
                              </p>
                            </div>
                          ) : (
                            filteredBaseCompanions.map(c => {
                              const isSelected = transmuteBaseCompanionId === c.id;
                              return (
                                <div
                                  key={c.id}
                                  onClick={() => setTransmuteBaseCompanionId(c.id)}
                                  className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                                    isSelected ? 'bg-purple-950/60 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                                  }`}
                                >
                                  <img
                                    src={getCompanionDisplayVisualUrl(c)}
                                    alt={c.name}
                                    className="w-10 h-10 rounded-lg object-cover border border-slate-700 bg-slate-950 shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold truncate">{c.name}</span>
                                      <span className="text-[10px] text-slate-400 font-mono">Lv.{c.level}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 truncate block">{c.classType || c.job || '동료'}</span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ) : transmuteMode === 'monster' ? (
                      <div className="flex-1 flex flex-col space-y-2 overflow-hidden">
                        {/* Monster search & filters */}
                        <div className="space-y-1.5 shrink-0">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2 text-slate-500" size={13} />
                            <input
                              type="text"
                              value={transmuteMonsterSearch}
                              onChange={(e) => setTransmuteMonsterSearch(e.target.value)}
                              placeholder="커스텀 몬스터 검색..."
                              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1">
                              {(['all', 'captured', 'party', 'inactive'] as const).map(f => (
                                <button
                                  key={f}
                                  onClick={() => setTransmuteMonsterSourceFilter(f)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    transmuteMonsterSourceFilter === f ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400'
                                  }`}
                                >
                                  {f === 'all' ? '전체' : f === 'captured' ? '포획' : f === 'party' ? '파티' : '대기'}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => setTransmuteMonsterSort(prev => prev === 'level' ? 'name' : 'level')}
                              className="text-[10px] text-slate-400 flex items-center gap-1 hover:text-purple-300"
                            >
                              <ArrowUpDown size={10} /> {transmuteMonsterSort === 'level' ? '레벨순' : '이름순'}
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                          {filteredBaseMonsters.length === 0 ? (
                            <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800/80 text-center space-y-1.5">
                              <AlertTriangle size={24} className="mx-auto text-amber-400" />
                              <span className="text-xs font-bold text-slate-300 block">커스텀 몬스터가 없습니다</span>
                              <p className="text-[11px] text-slate-500">
                                외형 변환은 1단계 [커스텀 개조] 탭에서 승격된 커스텀 몬스터만 가능합니다.
                              </p>
                            </div>
                          ) : (
                            filteredBaseMonsters.map(m => {
                              const isSelected = transmuteBaseMonsterId === m.id;
                              return (
                                <div
                                  key={m.id}
                                  onClick={() => setTransmuteBaseMonsterId(m.id)}
                                  className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                                    isSelected ? 'bg-purple-950/60 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                                  }`}
                                >
                                  <img
                                    src={m.visualUrl}
                                    alt={m.name}
                                    className="w-10 h-10 rounded-lg object-cover border border-slate-700 bg-slate-950 shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold truncate">{m.nickname || m.name}</span>
                                      <span className="text-[10px] text-slate-400 font-mono">Lv.{m.level}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 truncate block">{m.stage || '마수'}</span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Equipment Mode with Categories, Sorting & Real Images */
                      <div className="flex-1 flex flex-col space-y-2 overflow-hidden">
                        {/* Equipment filters */}
                        <div className="space-y-1.5 shrink-0">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2 text-slate-500" size={13} />
                            <input
                              type="text"
                              value={transmuteEquipSearch}
                              onChange={(e) => setTransmuteEquipSearch(e.target.value)}
                              placeholder="장비 이름 검색..."
                              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex gap-1">
                              {[
                                { id: 'all', label: '전체' },
                                { id: 'weapon', label: '무기' },
                                { id: 'armor', label: '방어구' },
                                { id: 'accessory', label: '장신구' }
                              ].map((cat) => (
                                <button
                                  key={cat.id}
                                  onClick={() => setTransmuteEquipCategory(cat.id as any)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    transmuteEquipCategory === cat.id ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400'
                                  }`}
                                >
                                  {cat.label}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => setTransmuteEquipSort(prev => prev === 'rarity' ? 'name' : 'rarity')}
                              className="text-[10px] text-slate-400 flex items-center gap-1 hover:text-purple-300"
                            >
                              <ArrowUpDown size={10} /> {transmuteEquipSort === 'rarity' ? '등급순' : '이름순'}
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                          {equipmentInventory.map((item) => {
                            const isSelected = transmuteBaseEquipKey === item._equipKey || (transmuteBaseIdx !== null && transmuteBaseIdx === item._invIdx && item._source === 'inventory');
                            const visual = getItemVisualUrl(item);
                            return (
                              <div
                                key={item._equipKey || item._invIdx}
                                onClick={() => {
                                  setTransmuteBaseEquipKey(item._equipKey);
                                  if (item._source === 'inventory') setTransmuteBaseIdx(item._invIdx);
                                  else setTransmuteBaseIdx(null);
                                }}
                                className={`group relative p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                                  isSelected ? 'bg-purple-950/60 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                                }`}
                              >
                                <ItemTooltip item={item} character={character} />
                                <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                                  {visual ? (
                                    <img 
                                      src={visual} 
                                      alt={item.name} 
                                      className="w-full h-full object-cover" 
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(item.name)}&backgroundColor=0f172a&shape1Color=334155`;
                                      }}
                                    />
                                  ) : (
                                    <Sword size={18} className="text-amber-400" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-bold truncate block">{item.name}</span>
                                    {item.rarity && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-amber-300 border border-slate-700 shrink-0">
                                        {item.rarity}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 mt-0.5">
                                    <span>{item.type || '장비'}</span>
                                    <span className="text-purple-300/80 font-mono text-[9px]">{item._sourceLabel}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Material / Custom Image Input */}
                  <div className="md:col-span-7 bg-slate-950/80 border border-slate-800 rounded-xl p-3 sm:p-4 space-y-3 flex flex-col h-[520px]">
                    <div className="flex items-center justify-between shrink-0">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-purple-400" /> 적용할 외형 소스
                      </span>
                      <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setIsCustomTransmute(false)}
                          className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${!isCustomTransmute ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
                        >
                          기존 목록에서 선택
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsCustomTransmute(true)}
                          className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${isCustomTransmute ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
                        >
                          직접 이미지 등록
                        </button>
                      </div>
                    </div>

                    {isCustomTransmute ? (
                      <div className="flex-1 flex flex-col justify-between space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                        <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-300 block">이미지 웹 주소(URL) 직접 입력</label>
                          <input
                            type="text"
                            value={customTransmuteUrl}
                            onChange={(e) => setCustomTransmuteUrl(e.target.value)}
                            placeholder="https://... 이미지 웹 주소 입력"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                          />

                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleCustomImageUpload}
                              className="hidden"
                              id="custom-transmute-file-input"
                            />
                            <label
                              htmlFor="custom-transmute-file-input"
                              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                            >
                              <Upload size={14} />
                              <span>{isUploadingImage ? '이미지 최적화 중...' : '이미지 파일 직접 업로드'}</span>
                            </label>
                          </div>

                          {/* 실시간 웹 업로드 선택 토글 (모바일 최적화 및 완벽 보안) */}
                          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1.5 shadow-inner">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] sm:text-xs font-bold text-slate-300">실시간 외부 서버 업로드</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setUseWebUpload(!useWebUpload);
                                }}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  useWebUpload ? 'bg-purple-600' : 'bg-slate-800'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    useWebUpload ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                            <p className="text-[9px] sm:text-[10px] text-slate-500 leading-normal">
                              {useWebUpload 
                                ? '외부 익명 서버에 이미지를 즉시 올려 세이브 파일 용량을 최소화합니다. 단, 이미지 주소가 공개될 수 있습니다.' 
                                : '기기를 통해서만 안전하게 로컬 데이터를 사용합니다. 개인정보가 철저히 보호되지만, 세이브 코드 용량이 증가할 수 있습니다.'}
                            </p>
                          </div>

                          {customTransmuteUrl && (
                            <div className="flex items-center gap-3 p-2.5 bg-slate-950 rounded-xl border border-purple-500/40">
                              <img
                                src={customTransmuteUrl}
                                alt="미리보기"
                                className="w-16 h-16 rounded-lg object-cover border border-purple-500/40 bg-slate-900 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold text-purple-300 block">등록된 외형 미리보기</span>
                                <span className="text-[10px] text-slate-500 truncate block">{customTransmuteUrl.substring(0, 40)}...</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>소모 마정석</span>
                            <span className="font-mono font-bold text-purple-400">5 / {currentMana}개</span>
                          </div>
                          <button
                            onClick={handleTransmute}
                            disabled={currentMana < 5 || !customTransmuteUrl.trim()}
                            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold rounded-xl shadow-lg transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5"
                          >
                            <Palette size={16} /> 외형 변환 적용
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Preset List Selection */
                      <div className="flex-1 flex flex-col justify-between space-y-2.5 overflow-hidden">
                        {/* Material Type Tabs if not equipment */}
                        {transmuteMode !== 'equipment' && (
                          <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 shrink-0">
                            <button
                              onClick={() => setTransmuteMaterialType('companion')}
                              className={`flex-1 py-1 rounded text-xs font-bold ${
                                transmuteMaterialType === 'companion' ? 'bg-purple-600 text-white' : 'text-slate-400'
                              }`}
                            >
                              동료 외형
                            </button>
                            <button
                              onClick={() => setTransmuteMaterialType('monster')}
                              className={`flex-1 py-1 rounded text-xs font-bold ${
                                transmuteMaterialType === 'monster' ? 'bg-purple-600 text-white' : 'text-slate-400'
                              }`}
                            >
                              도감 몬스터 외형 ({bestiaryMonsters.length})
                            </button>
                          </div>
                        )}

                        {/* Search Input for Materials */}
                        <div className="relative shrink-0">
                          <Search className="absolute left-2.5 top-2 text-slate-500" size={13} />
                          <input
                            type="text"
                            value={matSearchQuery}
                            onChange={(e) => setMatSearchQuery(e.target.value)}
                            placeholder={
                              transmuteMode === 'equipment'
                                ? '적용할 장비 이름 검색...'
                                : transmuteMaterialType === 'monster'
                                ? '100회 이상 처치한 몬스터 검색...'
                                : '적용할 동료 이름 검색...'
                            }
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        {transmuteMaterialType === 'monster' && transmuteMode !== 'equipment' && (
                          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 shrink-0">
                            <span>도감 100회 이상 처치 마물만 등록됩니다</span>
                            <span className="text-purple-400 font-mono font-bold">{bestiaryMonsters.length}종 개방</span>
                          </div>
                        )}

                        {/* Scrollable List Container */}
                        <div className="flex-1 min-h-[220px] max-h-[300px] sm:max-h-[330px] overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                          {transmuteMode === 'equipment' ? (
                            equipmentInventory
                              .filter(item => !matSearchQuery.trim() || item.name.toLowerCase().includes(matSearchQuery.trim().toLowerCase()))
                              .map(item => {
                                const isSelected = transmuteMaterialEquipKey === item._equipKey || (transmuteMaterialIdx !== null && transmuteMaterialIdx === item._invIdx && item._source === 'inventory');
                                const visual = getItemVisualUrl(item);
                                return (
                                  <div
                                    key={item._equipKey || item._invIdx}
                                    onClick={() => {
                                      setTransmuteMaterialEquipKey(item._equipKey);
                                      if (item._source === 'inventory') setTransmuteMaterialIdx(item._invIdx);
                                      else setTransmuteMaterialIdx(null);
                                    }}
                                    className={`group relative p-2 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                                      isSelected ? 'bg-purple-950/60 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                                    }`}
                                  >
                                    <ItemTooltip item={item} character={character} />
                                    <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                                      {visual ? (
                                        <img 
                                          src={visual} 
                                          alt={item.name} 
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(item.name)}&backgroundColor=0f172a&shape1Color=334155`;
                                          }}
                                        />
                                      ) : (
                                        <Sword size={18} className="text-amber-400" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="text-xs font-bold truncate block">{item.name}</span>
                                        <span className="text-[9px] text-slate-500">{item._sourceLabel}</span>
                                      </div>
                                      <span className="text-[10px] text-slate-500">{item.rarity || item.type || '장비'}</span>
                                    </div>
                                  </div>
                                );
                              })
                          ) : transmuteMaterialType === 'monster' ? (
                            bestiaryMonsters
                              .filter(m => !matSearchQuery.trim() || m.name.toLowerCase().includes(matSearchQuery.trim().toLowerCase()))
                              .length === 0 ? (
                                <div className="p-6 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-800 space-y-1.5">
                                  <AlertTriangle size={24} className="mx-auto text-amber-500/80 mb-2" />
                                  <span className="text-xs font-bold text-slate-300 block">100회 이상 처치한 몬스터가 없습니다</span>
                                  <span className="text-[10px] text-slate-500 block leading-relaxed">
                                    몬스터 도감에서 100회 이상 처치한 몬스터만 외형 변환 재료로 개방됩니다.
                                  </span>
                                </div>
                              ) : (
                                bestiaryMonsters
                                  .filter(m => !matSearchQuery.trim() || m.name.toLowerCase().includes(matSearchQuery.trim().toLowerCase()))
                                  .map(m => {
                                    const isSelected = transmuteMaterialMonsterId === m.id;
                                    return (
                                      <div
                                        key={m.id}
                                        onClick={() => setTransmuteMaterialMonsterId(m.id)}
                                        className={`p-2 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                                          isSelected ? 'bg-purple-950/60 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                                        }`}
                                      >
                                        <img
                                          src={m.visualUrl}
                                          alt={m.name}
                                          className="w-10 h-10 rounded-lg object-cover border border-slate-700 bg-slate-950 shrink-0"
                                          onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).src = "https://i.ibb.co/Kz56VGDS/image.png";
                                          }}
                                        />
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="text-xs font-bold truncate block">{m.name}</span>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                              m.isBoss 
                                                ? 'bg-amber-950 text-amber-400 border border-amber-800/40' 
                                                : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                                            }`}>
                                              {m.stage}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-purple-400 font-mono">
                                            <span>처치 {m.defeatedCount.toLocaleString()}회</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                              )
                          ) : (
                            allCompanions
                              .filter(c => !matSearchQuery.trim() || c.name.toLowerCase().includes(matSearchQuery.trim().toLowerCase()))
                              .map(c => {
                                const isSelected = transmuteMaterialCompanionId === c.id;
                                return (
                                  <div
                                    key={c.id}
                                    onClick={() => setTransmuteMaterialCompanionId(c.id)}
                                    className={`p-2 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                                      isSelected ? 'bg-purple-950/60 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                                    }`}
                                  >
                                    <img
                                      src={getCompanionDisplayVisualUrl(c)}
                                      alt={c.name}
                                      className="w-9 h-9 rounded-lg object-cover border border-slate-700 bg-slate-950 shrink-0"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <span className="text-xs font-bold truncate block">{c.name}</span>
                                      <span className="text-[10px] text-slate-500">{c.classType || c.job || '동료'}</span>
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-800 shrink-0">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>소모 마정석</span>
                            <span className="font-mono font-bold text-purple-400">5 / {currentMana}개</span>
                          </div>
                          <button
                            onClick={handleTransmute}
                            disabled={currentMana < 5}
                            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold rounded-xl shadow-lg transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5"
                          >
                            <Palette size={16} /> 선택한 외형으로 변환
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ================================================================ */}
          {/* TAB: BGM (등장 테마곡 설정) - Lv.5 */}
          {/* ================================================================ */}
          {activeTab === 'bgm' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-cyan-950/50 via-indigo-950/40 to-slate-900 border border-cyan-500/30 rounded-xl p-3.5 sm:p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
                    <Music className="text-cyan-400" size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-cyan-300">
                      전투 등장 테마곡(BGM) 설정실
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      플레이어 및 동료, 몬스터가 전투에 진입할 때 재생되는 고유 등장 음악을 설정합니다. (소모: 마정석 5개)
                    </p>
                  </div>
                </div>
              </div>

              {/* Main BGM Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Left: Target Selection Column */}
                <div className="md:col-span-5 bg-slate-950/80 border border-slate-800 rounded-xl p-3 sm:p-4 space-y-3 flex flex-col h-[520px]">
                  <div className="flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <UserCheck size={14} className="text-cyan-400" /> 대상 선택
                    </span>
                    <button
                      onClick={() => setBgmCompSort(prev => prev === 'name' ? 'level' : 'name')}
                      className="text-[10px] text-slate-400 flex items-center gap-1 hover:text-cyan-300"
                    >
                      <ArrowUpDown size={10} /> {bgmCompSort === 'name' ? '이름순' : '레벨순'}
                    </button>
                  </div>

                  {/* Search and Filters */}
                  <div className="space-y-2 shrink-0">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 text-slate-500" size={13} />
                      <input
                        type="text"
                        value={bgmCompSearch}
                        onChange={(e) => setBgmCompSearch(e.target.value)}
                        placeholder="이름 또는 직업 검색..."
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {[
                        { id: 'all', label: '전체 (커스텀)' },
                        { id: 'party', label: '파티원' },
                        { id: 'hasBgm', label: 'BGM 설정됨' },
                        { id: 'noBgm', label: '미설정' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setBgmCompFilter(tab.id as any)}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                            bgmCompFilter === tab.id
                              ? 'bg-cyan-600 text-white'
                              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Entity List */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                    {/* Player Option */}
                    <div
                      onClick={() => setSelectedBgmTargetId('player')}
                      className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                        selectedBgmTargetId === 'player'
                          ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <img
                        src={character.visualUrl || generateDefaultVisualUrl(character.name, '기타', '인간', '남성')}
                        alt={character.name}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-700 bg-slate-950 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold truncate flex items-center gap-1">
                            {character.name}
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/40">플레이어</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Lv.{character.level}</span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[10px] text-slate-500">{character.classTier || '주인공'}</span>
                          {character.bgmUrl && (
                            <span className="text-[9px] text-cyan-400 font-bold flex items-center gap-0.5">
                              <Music size={10} /> 전용 BGM
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Companions & Monsters (Custom Only) */}
                    {allCompanionsList.filter((c) => {
                      if (!c.isCustom) return false;
                      if (bgmCompFilter === 'party' && !c._inParty) return false;
                      if (bgmCompFilter === 'hasBgm' && !c.bgmUrl) return false;
                      if (bgmCompFilter === 'noBgm' && c.bgmUrl) return false;
                      if (bgmCompSearch.trim()) {
                        const query = bgmCompSearch.trim().toLowerCase();
                        const nameMatch = (c.name || '').toLowerCase().includes(query);
                        const jobMatch = (c.classType || '').toLowerCase().includes(query);
                        if (!nameMatch && !jobMatch) return false;
                      }
                      return true;
                    }).sort((a, b) => {
                      if (bgmCompSort === 'level') return (b.level || 1) - (a.level || 1);
                      return (a.name || '').localeCompare(b.name || '', 'ko');
                    }).map((comp) => {
                      const isSelected = selectedBgmTargetId === comp.id;
                      const isMon = comp._isMonster || isMonsterCompanion(comp);
                      return (
                        <div
                          key={comp.id}
                          onClick={() => setSelectedBgmTargetId(comp.id)}
                          className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                            isSelected
                              ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <img
                            src={getCompanionDisplayVisualUrl(comp)}
                            alt={comp.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-700 bg-slate-950 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold truncate flex items-center gap-1">
                                {comp.name}
                                {comp.isCustom && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-pink-950 text-pink-300 border border-pink-500/40">
                                    커스텀
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">Lv.{comp.level}</span>
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-[10px] text-slate-500 truncate">
                                {isMon ? (comp.stage || '마수') : (comp.classType || comp.job || '동료')}
                              </span>
                              {comp.bgmUrl && (
                                <span className="text-[9px] text-cyan-400 font-bold flex items-center gap-0.5 shrink-0">
                                  <Music size={10} /> 전용 BGM
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: BGM Configuration Column */}
                <div className="md:col-span-7 bg-slate-950/80 border border-slate-800 rounded-xl p-3 sm:p-4 space-y-4 flex flex-col justify-between h-[520px]">
                  <div className="space-y-4">
                    {/* Current Entity Header */}
                    <div className="p-3.5 bg-slate-900/80 rounded-xl border border-cyan-500/30 flex items-center gap-3">
                      <img
                        src={
                          selectedBgmTargetId === 'player'
                            ? (character.visualUrl || generateDefaultVisualUrl(character.name, '기타', '인간', '남성'))
                            : getCompanionDisplayVisualUrl(currentSelectedBgmEntity)
                        }
                        alt="Target"
                        className="w-14 h-14 rounded-xl object-cover border border-cyan-500/40 bg-slate-950 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white truncate">
                            {selectedBgmTargetId === 'player' ? character.name : currentSelectedBgmEntity?.name}
                          </h4>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                            {selectedBgmTargetId === 'player' ? '플레이어' : (currentSelectedBgmEntity?._isMonster ? '몬스터' : '동료')}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 block mt-0.5 font-mono">
                          Lv.{selectedBgmTargetId === 'player' ? character.level : currentSelectedBgmEntity?.level}
                        </span>
                      </div>
                    </div>

                    {/* Audio URL Input */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300 block">
                        등장 테마곡 오디오 URL
                      </label>
                      <input
                        type="text"
                        value={bgmInputUrl}
                        onChange={(e) => setBgmInputUrl(e.target.value)}
                        placeholder="https://... MP3 또는 오디오 웹 URL 입력"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    {/* File Upload Option */}
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleBgmFileUpload}
                        className="hidden"
                        id="custom-bgm-file-input"
                      />
                      <label
                        htmlFor="custom-bgm-file-input"
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Upload size={14} />
                        <span>오디오 파일 직접 업로드 (MP3, WAV, OGG)</span>
                      </label>
                    </div>

                    {/* Audio Player Preview */}
                    {bgmInputUrl.trim() && (
                      <div className="p-3 bg-slate-900 rounded-xl border border-cyan-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Volume2 size={18} className="text-cyan-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-200 block truncate">
                              오디오 미리듣기
                            </span>
                            <span className="text-[10px] text-slate-500 truncate block">
                              {bgmInputUrl.substring(0, 40)}...
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={toggleAudioPreview}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                            isPlayingPreview
                              ? 'bg-rose-600 hover:bg-rose-500 text-white'
                              : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                          }`}
                        >
                          {isPlayingPreview ? <Square size={12} /> : <Play size={12} />}
                          <span>{isPlayingPreview ? '정지' : '미리듣기'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>소모 마정석</span>
                      <span className="font-mono font-bold text-cyan-400">5 / {character.base?.resources.manaCrystal || 0}개</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleResetBgm}
                        className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
                      >
                        초기화
                      </button>
                      <button
                        onClick={handleSaveBgm}
                        disabled={(character.base?.resources.manaCrystal || 0) < 5}
                        className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold rounded-xl shadow-lg transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5"
                      >
                        <Music size={15} /> 등장 테마곡 저장
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Result Overlay Popup */}
      {resultOverlay.show && resultOverlay.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in">
          <div className="bg-slate-900 border border-pink-500/50 rounded-2xl max-w-sm w-full p-5 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-pink-500/20 border border-pink-500/40 flex items-center justify-center mx-auto text-pink-400">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-pink-300">{resultOverlay.data.title}</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{resultOverlay.data.message}</p>
            </div>
            {resultOverlay.data.items && (
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs text-left">
                {resultOverlay.data.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-slate-500">{it.label}</span>
                    <span className="font-bold text-slate-200">{it.after}</span>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setResultOverlay({ show: false, data: null })}
              className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl transition-all"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomLabModal;
