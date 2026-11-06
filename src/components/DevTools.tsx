import React, { useState, useEffect } from 'react';
import { Character, ClassTier, ItemRarity, CombatStyle, MythicOptionType,MagyeOptionType, Item, Companion, Skill, SkillType, SkillTarget, WeaponType, JobType, MercenaryRank, MilitaryRank, BlacksmithRank, HousekeeperRank, DiplomaticStatus, NationRelation, DominionData, RelationType } from '../types';
import { X, Save, Plus, Trash, ShieldAlert, Zap, User, Calendar, Users, Settings, Home, Package, Edit, Check, Heart, Shield, Sword, Gem, Leaf, Layers, Egg, Briefcase, Award, Medal, TrendingUp, Sparkles, Hammer, Trees, PawPrint, Gavel, Landmark, Globe, ShieldQuestion, Loader2, Moon, Skull, Flame, Crown, BookOpen, Pickaxe, FlaskConical, ChefHat, CheckSquare, Square, RefreshCw, Star, Sliders, Search, Filter, Lock, Unlock, GitFork, UserCheck, UserX } from 'lucide-react';
import { STATUS_AILMENTS_LIST, WEAPON_MASTERY_CONFIG, SHINRYOKU_TYPES_LIST, FACILITIES_INFO, NATION_INFO, MAGYE_DOMINION_MAP, COMBAT_STYLE_CONFIG } from '../constants';
import { REQUIRED_SUN_ITEMS, AWAKENING_MATERIAL, AWAKENING_MATERIAL_COUNT } from '../awakening';
import { MAGYE_AWAKENING_CONFIG } from '../magyeawakening';
import { generateProceduralEnemy } from '../utils';
import { TITLES } from '../titles';
import { checkAndInitializeLiberationEligibility, getCompanionCP } from '../services/companionGrowthService';
import { syncAllSiblingRelations, setForcedSiblingRelation, findSiblingsOfCompanion, areSiblings, getSiblingKinshipTerm } from '../services/siblingService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  onUpdate: (updatedCharacter: Character) => void;
  onDeleteCompanion?: (index: number) => void;
}

type TargetType = 'player' | 'companion' | 'base' | 'diplomacy' | 'magye';

const DEV_PROFESSIONS = [
  { key: 'farming', name: '농사 (Farming)', icon: Leaf, color: 'text-green-400', border: 'border-green-800/50', bg: 'bg-green-950/20' },
  { key: 'mining', name: '채굴 (Mining)', icon: Pickaxe, color: 'text-blue-400', border: 'border-blue-800/50', bg: 'bg-blue-950/20' },
  { key: 'crafting', name: '제작 (Crafting)', icon: Hammer, color: 'text-slate-300', border: 'border-slate-700/60', bg: 'bg-slate-900/60' },
  { key: 'alchemy', name: '연금술 (Alchemy)', icon: FlaskConical, color: 'text-purple-400', border: 'border-purple-800/50', bg: 'bg-purple-950/20' },
  { key: 'research', name: '연구 (Research)', icon: BookOpen, color: 'text-indigo-400', border: 'border-indigo-800/50', bg: 'bg-indigo-950/20' },
  { key: 'taming', name: '테이밍 (Taming)', icon: PawPrint, color: 'text-amber-400', border: 'border-amber-800/50', bg: 'bg-amber-950/20' },
  { key: 'cooking', name: '요리 (Cooking)', icon: ChefHat, color: 'text-orange-400', border: 'border-orange-800/50', bg: 'bg-orange-950/20' },
  { key: 'breeding', name: '사육/교배 (Breeding)', icon: Egg, color: 'text-pink-400', border: 'border-pink-800/50', bg: 'bg-pink-950/20' },
];

const DevTools: React.FC<Props> = ({ isOpen, onClose, character, onUpdate, onDeleteCompanion }) => {
  const [localChar, setLocalChar] = useState<Character>(character);
  const [targetType, setTargetType] = useState<TargetType>('player');
  const [selectedCompIndex, setSelectedCompIndex] = useState<number>(0);
  const [selectedNationKey, setSelectedNationKey] = useState<string>('');
  const [selectedMagyeCity, setSelectedMagyeCity] = useState<string>('');
  
  // Skill Editing State
  const [editingSkillIndex, setEditingSkillIndex] = useState<number | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editingSkillAilment, setEditingSkillAilment] = useState<string>('');

  // Combat Style Management State
  const [combatStyleTierFilter, setCombatStyleTierFilter] = useState<'ALL' | 1 | 2 | 3 | 4 | 'UNLOCKED' | 'LOCKED'>('ALL');
  const [combatStyleSearch, setCombatStyleSearch] = useState<string>('');

  // Sibling Management State
  const [devSiblingTargetId, setDevSiblingTargetId] = useState<string>('');
  const [devSiblingType, setDevSiblingType] = useState<'FULL' | 'HALF'>('FULL');

  useEffect(() => {
    if (isOpen) {
      setLocalChar(JSON.parse(JSON.stringify(character))); // Deep copy
      
      const nations = Object.keys(character.militaryData?.diplomacy || {});
      if (nations.length > 0) setSelectedNationKey(nations[0]);

      const cities = Object.keys(character.magyeDominions || {});
      if (cities.length > 0) setSelectedMagyeCity(cities[0]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdate(localChar);
    onClose();
  };

  const getTarget = (): Character | Companion | undefined => {
      if (targetType === 'player') return localChar;
      if (targetType === 'base' || targetType === 'diplomacy' || targetType === 'magye') return undefined;
      // Handle empty companion list safely
      if (localChar.companions.length === 0) return undefined;
      return localChar.companions[selectedCompIndex] || localChar.companions[0];
  };

  const updateTarget = (fieldOrFields: string | Record<string, any>, value?: any) => {
      setLocalChar(prev => {
          if (typeof fieldOrFields === 'string') {
              const field = fieldOrFields;
              if (targetType === 'player') {
                  return { ...prev, [field]: value };
              } else if (targetType === 'base') {
                  const newBase = prev.base ? { ...prev.base, [field]: value } : undefined;
                  return { ...prev, base: newBase };
              } else {
                  const newComps = [...prev.companions];
                  if (!newComps[selectedCompIndex]) return prev;
                  newComps[selectedCompIndex] = { ...newComps[selectedCompIndex], [field]: value };
                  return { ...prev, companions: newComps };
              }
          } else {
              const fields = fieldOrFields;
              if (targetType === 'player') {
                  return { ...prev, ...fields };
              } else if (targetType === 'base') {
                  const newBase = prev.base ? { ...prev.base, ...fields } : undefined;
                  return { ...prev, base: newBase };
              } else {
                  const newComps = [...prev.companions];
                  if (!newComps[selectedCompIndex]) return prev;
                  newComps[selectedCompIndex] = { ...newComps[selectedCompIndex], ...fields };
                  return { ...prev, companions: newComps };
              }
          }
      });
  };

  const updateProfession = (key: string, field: 'level' | 'exp' | 'maxExp', value: number) => {
      const sanitized = Math.max(0, value || 0);
      if (targetType === 'player') {
          const prevProfs = localChar.professions || {} as any;
          const currentProf = prevProfs[key] || { level: 1, exp: 0, maxExp: 100 };
          setLocalChar(prev => ({
              ...prev,
              professions: {
                  ...(prev.professions || {}),
                  [key]: {
                      ...currentProf,
                      [field]: sanitized
                  }
              } as any
          }));
      } else if (targetType === 'companion') {
          const newComps = [...localChar.companions];
          if (!newComps[selectedCompIndex]) return;
          const prevProfs = newComps[selectedCompIndex].professions || {} as any;
          const currentProf = prevProfs[key] || { level: 1, exp: 0, maxExp: 100 };
          newComps[selectedCompIndex] = {
              ...newComps[selectedCompIndex],
              professions: {
                  ...prevProfs,
                  [key]: {
                      ...currentProf,
                      [field]: sanitized
                  }
              } as any
          };
          setLocalChar(prev => ({ ...prev, companions: newComps }));
      }
  };

  const setAllProfessionsLevel = (level: number) => {
      const newProfs: any = {};
      DEV_PROFESSIONS.forEach(p => {
          newProfs[p.key] = { level, exp: 0, maxExp: Math.max(100, level * 100) };
      });

      if (targetType === 'player') {
          setLocalChar(prev => ({
              ...prev,
              professions: { ...(prev.professions || {}), ...newProfs }
          }));
      } else if (targetType === 'companion') {
          const newComps = [...localChar.companions];
          if (!newComps[selectedCompIndex]) return;
          newComps[selectedCompIndex] = {
              ...newComps[selectedCompIndex],
              professions: { ...(newComps[selectedCompIndex].professions || {}), ...newProfs }
          };
          setLocalChar(prev => ({ ...prev, companions: newComps }));
      }
  };

  const setAllWeaponMasteryLevel = (level: number) => {
      const newMastery: any = {};
      Object.keys(WEAPON_MASTERY_CONFIG).forEach(cat => {
          WEAPON_MASTERY_CONFIG[cat as any].types.forEach((type: string) => {
              newMastery[type] = { level, currentExp: 0 };
          });
      });

      if (targetType === 'player') {
          setLocalChar(prev => ({ ...prev, weaponMastery: newMastery }));
      } else if (targetType === 'companion') {
          const newComps = [...localChar.companions];
          if (!newComps[selectedCompIndex]) return;
          newComps[selectedCompIndex] = { ...newComps[selectedCompIndex], weaponMastery: newMastery };
          setLocalChar(prev => ({ ...prev, companions: newComps }));
      }
  };

  const setAllStatsValue = (val: number) => {
      const current = getTarget();
      if (!current?.stats) return;
      const newStats: any = {};
      Object.keys(current.stats).forEach(k => {
          newStats[k] = val;
      });
      // Set HP/MaxHP & MP/MaxMP accordingly
      newStats.hp = val;
      newStats.maxHp = val;
      newStats.mp = val;
      newStats.maxMp = val;

      if (targetType === 'player') {
          setLocalChar(prev => ({ ...prev, stats: newStats }));
      } else if (targetType === 'companion') {
          const newComps = [...localChar.companions];
          if (!newComps[selectedCompIndex]) return;
          newComps[selectedCompIndex] = { ...newComps[selectedCompIndex], stats: newStats };
          setLocalChar(prev => ({ ...prev, companions: newComps }));
      }
  };

  const maxAffectionAndLoyalty = () => {
      if (targetType !== 'companion') return;
      const newComps = [...localChar.companions];
      if (!newComps[selectedCompIndex]) return;
      newComps[selectedCompIndex] = {
          ...newComps[selectedCompIndex],
          affection: 100,
          loyalty: 100
      };
      setLocalChar(prev => ({ ...prev, companions: newComps }));
  };

  const updateMagyeDominion = (city: string, updates: Partial<DominionData>) => {
      if (!localChar.magyeDominions) return;
      const nextDominions = { ...localChar.magyeDominions };
      if (nextDominions[city]) {
          nextDominions[city] = { ...nextDominions[city], ...updates };
          setLocalChar(prev => ({ ...prev, magyeDominions: nextDominions }));
      }
  };

  const toggleRelationship = (type: 'isLover' | 'isSpouse', checked: boolean) => {
      if (targetType !== 'companion') return;
      const newComps = [...localChar.companions];
      if (!newComps[selectedCompIndex]) return;
      
      const updates: any = { [type]: checked };
      if (checked) {
          updates.partnerId = 'player';
          updates.partnerName = localChar.name;
          if (type === 'isSpouse') updates.isLover = true; // Spouse must be lover
      } else {
          // Only clear if the partner was player
          if (newComps[selectedCompIndex].partnerId === 'player') {
              updates.partnerId = undefined;
              updates.partnerName = undefined;
          }
      }
      
      newComps[selectedCompIndex] = { ...newComps[selectedCompIndex], ...updates };
      setLocalChar(prev => ({ ...prev, companions: newComps }));
  };

  const handleTogglePlayerSibling = (checked: boolean) => {
      if (targetType !== 'companion') return;
      const currentComp = localChar.companions[selectedCompIndex];
      if (!currentComp) return;
      const updated = setForcedSiblingRelation(localChar, currentComp.id, 'player', checked);
      setLocalChar(updated);
  };

  const handleForceCompanionSibling = (targetId: string, isSibling: boolean, isHalf: boolean = false) => {
      if (targetType !== 'companion') return;
      const currentComp = localChar.companions[selectedCompIndex];
      if (!currentComp || !targetId) return;
      const updated = setForcedSiblingRelation(localChar, currentComp.id, targetId, isSibling, isHalf);
      setLocalChar(updated);
  };

  const handleDevSyncAllSiblings = () => {
      const { updatedChar, count } = syncAllSiblingRelations(localChar);
      setLocalChar(updatedChar);
      alert(`가문 내 자식/형제자매 관계 동기화 완료! (${count}쌍 연결됨)`);
  };

  const updateStats = (stat: string, value: number) => {
      if (targetType === 'player') {
          setLocalChar(prev => ({
              ...prev,
              stats: { ...prev.stats, [stat]: value }
          }));
      } else if (targetType === 'companion') {
          const newComps = [...localChar.companions];
          if (!newComps[selectedCompIndex]) return;
          newComps[selectedCompIndex] = { 
              ...newComps[selectedCompIndex], 
              stats: { ...newComps[selectedCompIndex].stats, [stat]: value } 
          };
          setLocalChar(prev => ({ ...prev, companions: newComps }));
      }
  };
  
  const updateResource = (key: string, value: number) => {
      if (!localChar.base) return;
      setLocalChar(prev => ({
          ...prev,
          base: {
              ...prev.base!,
              resources: {
                  ...prev.base!.resources,
                  [key]: value
              }
          }
      }));
  };

  const updateShard = (key: string, value: number) => {
      if (!localChar.base) return;
      setLocalChar(prev => ({
          ...prev,
          base: {
              ...prev.base!,
              elementalShards: {
                  ...prev.base!.elementalShards,
                  [key]: value
              }
          }
      }));
  };

  const updateFacilityLevel = (id: string, level: number) => {
      if (!localChar.base) return;
      const newFacilityLevels = { ...(localChar.base.facilityLevels || {}) };
      newFacilityLevels[id] = level;
      
      setLocalChar(prev => ({
          ...prev,
          base: {
              ...prev.base!,
              facilityLevels: newFacilityLevels
          }
      }));
  };

  const updateMastery = (type: WeaponType, level: number) => {
      if (targetType === 'player') {
          const newMastery = { ...(localChar.weaponMastery || {}) };
          newMastery[type] = { level, currentExp: 0 };
          setLocalChar(prev => ({ ...prev, weaponMastery: newMastery }));
      } else if (targetType === 'companion') {
          const newComps = [...localChar.companions];
          if (!newComps[selectedCompIndex]) return;
          const newMastery = { ...(newComps[selectedCompIndex].weaponMastery || {}) };
          newMastery[type] = { level, currentExp: 0 };
          newComps[selectedCompIndex] = { ...newComps[selectedCompIndex], weaponMastery: newMastery };
          setLocalChar(prev => ({ ...prev, companions: newComps }));
      }
  };

  const updateDiplomacy = (nation: string, updates: Partial<NationRelation>) => {
    if (!localChar.militaryData || !localChar.militaryData.diplomacy) return;
    const newDiplomacy = { ...localChar.militaryData.diplomacy };
    newDiplomacy[nation] = { ...newDiplomacy[nation], ...updates };
    setLocalChar(prev => ({
        ...prev,
        militaryData: {
            ...prev.militaryData!,
            diplomacy: newDiplomacy
        }
    }));
  };

  const updateNationalFavorability = (nation: string, value: number) => {
      setLocalChar(prev => ({
          ...prev,
          nationalFavorability: {
              ...(prev.nationalFavorability || {}),
              [nation]: Math.max(0, Math.min(1000, value))
          }
      }));
  };

    const addCompanion = () => {
      const playerLevel = localChar.level;
      const baseStats = Math.floor(playerLevel * 10 / 6);
      
      const newComp: Companion = {
          id: Math.random().toString(36).substring(2, 9),
          name: "생성형 동료",
          age: "20세",
          gender: "여성",
          race: "인간",
          appearance: "생성된 동료",
          nation: "대한민국",
          classType: "동료",
          isCustom: true,
          level: 1,
          currentExp: 0,
          maxExp: 1 * 100, 
          statPoints: 0,
          classTier: ClassTier.NONE,
          stats: {
              hp: 100 + (playerLevel * 5),
              maxHp: 100 + (playerLevel * 5),
              mp: 50 + (playerLevel * 2),
              maxMp: 50 + (playerLevel * 2),
              str: baseStats,
              int: baseStats,
              wis: baseStats,
              def: baseStats,
              agi: baseStats,
              ctrl: baseStats
          },
          skills: [],
          equipment: {},
          inventory: [],
          affection: 50,
          loyalty: 50,
          reputation: 0,
          metYear: new Date(localChar.currentDate).getFullYear(),
          job: JobType.UNEMPLOYED,
          shinryokuType: '미개방',
          infamy: 0,
          mercenaryRank: MercenaryRank.F,
          militaryRank: MilitaryRank.PVT,
          merit: 0,
          blacksmithRank: BlacksmithRank.BEGINNER,
          blacksmithMastery: 0,
          weaponMastery: {},
          professions: {
              farming: { level: 1, exp: 0, maxExp: 100 },
              mining: { level: 1, exp: 0, maxExp: 100 },
              crafting: { level: 1, exp: 0, maxExp: 100 },
              alchemy: { level: 1, exp: 0, maxExp: 100 },
              research: { level: 1, exp: 0, maxExp: 100 },
              taming: { level: 1, exp: 0, maxExp: 100 },
              cooking: { level: 1, exp: 0, maxExp: 100 },
              breeding: { level: 1, exp: 0, maxExp: 100 }
          }
      };

      setLocalChar(prev => ({
          ...prev,
          companions: [...prev.companions, newComp]
      }));
      
      setTargetType('companion');
      setSelectedCompIndex(localChar.companions.length);
  };
  
  const handleDeleteCurrentCompanion = () => {
      if (!localChar.companions[selectedCompIndex]) return;
      if (confirm(`Delete companion ${localChar.companions[selectedCompIndex].name}? This action inside DevTools is local until saved.`)) {
          const newComps = [...localChar.companions];
          newComps.splice(selectedCompIndex, 1);
          setLocalChar(prev => ({ ...prev, companions: newComps }));
          setSelectedCompIndex(0);
      }
  };
  
  const addPrimordialLightSet = () => {
      const item: Item = {
          name: "태초의 빛",
          type: "Etc",
          rarity: ItemRarity.MYTHTIC,
          description: "세상이 시작될 때 존재했던 가장 순수한 빛의 조각.",
          enhancement: 0,
          imageUrl: "https://i.ibb.co/Q7dyS1wS/Kakao-Talk-20251224-165533407.png"
      };
      
      const set = Array(100).fill(null).map(() => ({ ...item }));
      
      if (targetType === 'player') {
          setLocalChar(prev => ({
              ...prev,
              inventory: [...prev.inventory, ...set]
          }));
      } else if (targetType === 'companion') {
           const newComps = [...localChar.companions];
           if (!newComps[selectedCompIndex]) return;
           const currentInv = newComps[selectedCompIndex].inventory || [];
           newComps[selectedCompIndex] = { ...newComps[selectedCompIndex], inventory: [...currentInv, ...set] };
           setLocalChar(prev => ({ ...prev, companions: newComps }));
      }
      alert("태초의 빛 100개가 추가되었습니다.");
  };

  const addMoonlightShardSet = () => {
    const item: Item = {
        name: MAGYE_AWAKENING_CONFIG.REQUIRED_MATERIAL,
        type: "Etc",
        rarity: ItemRarity.LEGENDARY,
        description: "철혈왕의 기운이 서린 신비로운 조각입니다. 마계 제너럴 각성에 필요합니다.",
        enhancement: 0,
        imageUrl: "https://i.ibb.co/VcfcMG7w/Gemini-Generated-Image-k9dg8ek9dg8ek9dg.png"
    };
    
    const set = Array(10).fill(null).map(() => ({ ...item }));
    
    if (targetType === 'player') {
        setLocalChar(prev => ({
            ...prev,
            inventory: [...prev.inventory, ...set]
        }));
    } else if (targetType === 'companion') {
         const newComps = [...localChar.companions];
         if (!newComps[selectedCompIndex]) return;
         const currentInv = newComps[selectedCompIndex].inventory || [];
         newComps[selectedCompIndex] = { ...newComps[selectedCompIndex], inventory: [...currentInv, ...set] };
         setLocalChar(prev => ({ ...prev, companions: newComps }));
    }
    alert(`${MAGYE_AWAKENING_CONFIG.REQUIRED_MATERIAL} 10개가 추가되었습니다.`);
};

  const addFragmentOfTheEndSet = () => {
    const item: Item = {
        name: "종말의 파편",
        type: "Etc",
        rarity: ItemRarity.MYTHTIC,
        imageUrl: "https://i.ibb.co/N2sjPHRX/Kakao-Talk-20251224-171822377.png",
        description: "세계가 멸망할 때 남겨지는 차원의 잔해.",
        enhancement: 0
    };
    
    const set = Array(100).fill(null).map(() => ({ ...item }));
    
    if (targetType === 'player') {
        setLocalChar(prev => ({
            ...prev,
            inventory: [...prev.inventory, ...set]
        }));
    } else if (targetType === 'companion') {
         const newComps = [...localChar.companions];
         if (!newComps[selectedCompIndex]) return;
         const currentInv = newComps[selectedCompIndex].inventory || [];
         newComps[selectedCompIndex] = { ...newComps[selectedCompIndex], inventory: [...currentInv, ...set] };
         setLocalChar(prev => ({ ...prev, companions: newComps }));
    }
    alert("종말의 파편 100개가 추가되었습니다.");
  };

  const addItem = () => {
      const awakeningSet: Item[] = [
          {
              name: "레드 블레이저 스피어",
              type: "Weapon",
              weaponType: 'Spear',
              elementalType: '태양계',
              rarity: ItemRarity.MYTHTIC,
              description: "태양의 사자를 위한 전설의 창.",
              stats: { str: 15000, agi: 15000 },
              enhancement: 0,
              secondaryOptions: ["물리 명중률 +100%","치명타 피해량 +100%","태양계 속성피해 +20%", "태양계 속성 부여","물리 공격력 +100%","태양계 속성 저항 +20%"],
              imageUrl: "https://i.ibb.co/DDWtvJrv/1766535761847.png"
          },
          {
              name: "레드 블레이저 투구",
              type: "Head",
              rarity: ItemRarity.MYTHTIC,
              description: "태양의 사자를 위한 전설의 투구.",
              stats: { def: 15000, agi: 15000 },
              enhancement: 0,
              mythicOption:MagyeOptionType.INSTANT_DEATH,
              secondaryOptions: ["경험치 획득량 +100%","골드 획득량 +100%"],
              imageUrl: "https://i.ibb.co/r96B5TC/1766540226131.png"
          },
          {
              name: "레드 블레이저 갑옷",
              type: "Body",
              rarity: ItemRarity.MYTHTIC,
              description: "태양의 사자가 착용하는 갑옷.",
              stats: { def: 15000, hp: 100000 },
              enhancement: 0,
              imageUrl: "https://i.ibb.co/tP3J5223/12.png"
          },
          {
              name: "레드 블레이저 슈즈",
              type: "Feet",
              rarity: ItemRarity.MYTHTIC,
              description: "태양의 사자가 착용하는 신발.",
              stats: { agi: 12000, def: 5000 },
              enhancement: 0,
              imageUrl: "https://i.ibb.co/dskMqgS4/56.png"
          },
          {
              name: "태양의 보옥",
              type: "SubWeapon",
              weaponType: "Orb",
              rarity: ItemRarity.MYTHTIC,
              description: "태양의 사자의 힘을 증폭하는 보옥.",
              stats: { ctrl: 30000 },
              enhancement: 0,
              imageUrl: "https://i.ibb.co/XkV2gmW6/1766536234086.png"
          },
          {
              name: "태양의 손",
              type: "Hand",
              rarity: ItemRarity.MYTHTIC,
              description: "태양의 열기를 견디는 사자의 장갑.",
              stats: { str: 5000, def: 5000 },
              enhancement: 0,
              imageUrl: "https://i.ibb.co/rR6ZtZR5/34.png"
          },
          {
              name: "LHM 모드 시작 - 날개",
              type: "Accessory",
              rarity: ItemRarity.MYTHTIC,
              description: "태양의 사자의 날개를 개방하는 성물.",
              stats: { agi: 10000, str: 5000 },
              enhancement: 0,
              imageUrl: "https://i.ibb.co/1YCrG7mm/1766536196607.png"
          }
      ];

      const materials: Item[] = Array(AWAKENING_MATERIAL_COUNT).fill(null).map(() => ({
          name: AWAKENING_MATERIAL,
          type: "Etc",
          rarity: ItemRarity.LEGENDARY,
          description: "태양의 사자로 거듭나기 위한 성스러운 잔재.",
          enhancement: 0,
          imageUrl: "https://i.ibb.co/20jHRQMv/1766540383448.png"
      }));

      const fullSet = [...awakeningSet, ...materials];
      
      if (targetType === 'player') {
          setLocalChar(prev => ({
              ...prev,
              inventory: [...prev.inventory, ...fullSet]
          }));
      } else if (targetType === 'companion') {
           const newComps = [...localChar.companions];
           if (!newComps[selectedCompIndex]) return;
           const currentInv = newComps[selectedCompIndex].inventory || [];
           newComps[selectedCompIndex] = { ...newComps[selectedCompIndex], inventory: [...currentInv, ...fullSet] };
           setLocalChar(prev => ({ ...prev, companions: newComps }));
      }
      alert("태양의 사자 전직 세트(장비 7종 + 잔재 10개)가 추가되었습니다.");
  };

  const addMonsterEgg = () => {
      const ranks = ['C', 'B', 'A', 'S'];
      const randomRank = ranks[Math.floor(Math.random() * ranks.length)];
      const newItem: Item = {
          name: `${ranks.indexOf(randomRank) >= 2 ? (randomRank === 'S' ? 'EPIC' : 'RARE') : 'MAGIC'}등급 몬스터 알`,
          type: "Etc",
          rarity: randomRank === 'S' ? ItemRarity.EPIC : randomRank === 'A' ? ItemRarity.RARE : ItemRarity.MAGIC,
          description: `미지의 몬스터가 잠들어 있는 알입니다. (등급: ${randomRank})`,
          enhancement: 0
      };

      if (targetType === 'player') {
          setLocalChar(prev => ({ ...prev, inventory: [...prev.inventory, newItem] }));
      }
  };
  
   const addSkill = () => {
    const newSkill: Skill = {
        name: "New Custom Skill",
        type: SkillType.PHYSICAL,
        description: "A unique ability granted by the GM.",
        tier: ClassTier.FIRST,
        mpCost: 10,
        level: 1,
        maxLevel: 10,
        currentMastery: 0,
        effectFormula: "(STR * 1.0) + 10",
        targetType: 'single',
        powerRatio: 100 // Added powerRatio
    };

    if (targetType === 'player') {
        setLocalChar(prev => ({
            ...prev,
            skills: [...prev.skills, newSkill]
        }));
    } else if (targetType === 'companion') {
         const newComps = [...localChar.companions];
         if (!newComps[selectedCompIndex]) return;
         const currentSkills = newComps[selectedCompIndex].skills || [];
         newComps[selectedCompIndex] = { ...newComps[selectedCompIndex], skills: [...currentSkills, newSkill] };
         setLocalChar(prev => ({ ...prev, companions: newComps }));
    }
  };

  const removeSkill = (idx: number) => {
      if (targetType === 'player') {
          const newSkills = [...localChar.skills];
          newSkills.splice(idx, 1);
          setLocalChar(prev => ({ ...prev, skills: newSkills }));
      } else if (targetType === 'companion') {
          const newComps = [...localChar.companions];
          if (!newComps[selectedCompIndex]) return;
          const newSkills = [...newComps[selectedCompIndex].skills];
          newSkills.splice(idx, 1);
          newComps[selectedCompIndex] = { ...newComps[selectedCompIndex], skills: newSkills };
          setLocalChar(prev => ({ ...prev, companions: newComps }));
      }
  };

  const openSkillEditor = (skill: Skill, idx: number) => {
      setEditingSkill({ ...skill });
      setEditingSkillIndex(idx);
      const ailmentMatch = skill.description.match(/\[부가 효과:\s*(.+?)\]/);
      setEditingSkillAilment(ailmentMatch ? ailmentMatch[1] : '');
  };

  const saveEditedSkill = () => {
      if (editingSkillIndex === null || !editingSkill) return;
      
      let finalDescription = editingSkill.description.replace(/\[부가 효과:\s*(.+?)\]/g, '').trim();
      if (editingSkillAilment) {
          finalDescription += ` [부가 효과: ${editingSkillAilment}]`;
      }
      const finalSkill = { ...editingSkill, description: finalDescription };

      if (targetType === 'player') {
           const newSkills = [...localChar.skills];
           newSkills[editingSkillIndex] = finalSkill;
           setLocalChar(prev => ({...prev, skills: newSkills}));
      } else if (targetType === 'companion') {
           const newComps = [...localChar.companions];
           if (!newComps[selectedCompIndex]) return;
           const newSkills = [...newComps[selectedCompIndex].skills];
           newSkills.splice(editingSkillIndex, 1, finalSkill);
           newComps[selectedCompIndex] = { ...newComps[selectedCompIndex], skills: newSkills };
           setLocalChar(prev => ({ ...prev, companions: newComps }));
      }
      setEditingSkill(null);
      setEditingSkillIndex(null);
      setEditingSkillAilment('');
  };

  
  // --- NEW CHEAT FUNCTIONS ---
  const healAll = () => {
      if (targetType === 'player') {
          setLocalChar(prev => ({
              ...prev,
              stats: { ...prev.stats, hp: prev.stats.maxHp, mp: prev.stats.maxMp }
          }));
      } else if (targetType === 'companion') {
          const newComps = [...localChar.companions];
          if (!newComps[selectedCompIndex]) return;
          newComps[selectedCompIndex].stats.hp = newComps[selectedCompIndex].stats.maxHp;
          newComps[selectedCompIndex].stats.mp = newComps[selectedCompIndex].stats.maxMp;
          setLocalChar(prev => ({ ...prev, companions: newComps }));
      }
      alert("HP/MP 회복 완료!");
  };

  const maxAllStats = () => {
      const MAX_VAL = 999999;
      if (targetType === 'player') {
          setLocalChar(prev => ({
              ...prev,
              stats: { 
                  hp: MAX_VAL, maxHp: MAX_VAL, mp: MAX_VAL, maxMp: MAX_VAL,
                  str: MAX_VAL, int: MAX_VAL, wis: MAX_VAL, def: MAX_VAL, agi: MAX_VAL, ctrl: MAX_VAL
              }
          }));
      } else if (targetType === 'companion') {
          const newComps = [...localChar.companions];
          if (!newComps[selectedCompIndex]) return;
          newComps[selectedCompIndex].stats = {
              hp: MAX_VAL, maxHp: MAX_VAL, mp: MAX_VAL, maxMp: MAX_VAL,
              str: MAX_VAL, int: MAX_VAL, wis: MAX_VAL, def: MAX_VAL, agi: MAX_VAL, ctrl: MAX_VAL
          };
          setLocalChar(prev => ({ ...prev, companions: newComps }));
      }
      alert("모든 스탯 MAX 적용 완료!");
  };

  const unlockAllTitles = () => {
      const allTitleIds = Object.keys(TITLES);
      setLocalChar(prev => ({
          ...prev,
          availableTitles: allTitleIds
      }));
      alert(`모든 칭호 (${allTitleIds.length}개) 획득 완료!`);
  };

  const maxAllReputations = () => {
      setLocalChar(prev => ({
          ...prev,
          elfReputation: 100,
          beastReputation: 100,
          demonReputation: 100,
          reputation: 999999,
          infamy: 0
      }));
      alert("모든 종족 평판 및 명성 MAX 적용!");
  };

  const maxAllFacilities = () => {
      if (!localChar.base) {
          alert("기지가 아직 없습니다. Base 탭에서 기지를 활성화하세요.");
          return;
      }
      const newFacilityLevels: Record<string, number> = {};
      Object.keys(FACILITIES_INFO).forEach(id => {
          newFacilityLevels[id] = 10; // Max level
      });
      setLocalChar(prev => ({
          ...prev,
          base: {
              ...prev.base!,
              facilityLevels: newFacilityLevels,
              gold: 999999999,
              elementalShards: {
                  fire: 9999, water: 9999, wind: 9999, earth: 9999, light: 9999, dark: 9999
              },
              resources: {
                  ...prev.base!.resources,
                  wood: 999999, stone: 999999, iron: 999999, food: 999999, magicStone: 999999
              }
          }
      }));
      alert("모든 기지 시설 레벨 10 및 자원 MAX 달성!");
  };

  const maxAllCompanionsRelation = () => {
      const newComps = localChar.companions.map(c => ({
          ...c,
          affection: 100,
          loyalty: 100
      }));
      setLocalChar(prev => ({ ...prev, companions: newComps }));
      alert("모든 동료의 호감도 및 충성도를 MAX로 설정했습니다.");
  };
  
  const resetTime = () => {
      setLocalChar(prev => ({
          ...prev,
          currentDate: '2000-01-01'
      }));
      alert("시간을 2000년 1월 1일로 되돌렸습니다.");
  };

  const unlockAllCombatStyles = () => {
      const allStyles = Object.values(CombatStyle);
      setLocalChar(prev => {
          const updatedComps = (prev.companions || []).map(c => ({
              ...c,
              unlockedCombatStyles: allStyles
          }));
          return {
              ...prev,
              unlockedCombatStyles: allStyles,
              companions: updatedComps
          };
      });
      alert("플레이어 및 모든 동료의 모든 전투 계열(1~4차 전체)이 해금되었습니다!");
  };

  const unlockTier1CombatStyles = () => {
      const tier1Styles = Object.values(CombatStyle).filter(s => (COMBAT_STYLE_CONFIG[s]?.tier || 1) === 1);
      setLocalChar(prev => {
          const currentList = new Set<CombatStyle>(prev.unlockedCombatStyles || []);
          tier1Styles.forEach(s => currentList.add(s));
          return {
              ...prev,
              unlockedCombatStyles: Array.from(currentList)
          };
      });
      alert("플레이어의 1차 기본 전투 계열(9개)이 모두 해금되었습니다!");
  };


  const currentTarget = getTarget();

  return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 text-slate-200 font-sans">
          <div className="bg-slate-950 border border-red-500/50 w-full max-w-5xl h-[95vh] rounded-2xl shadow-[0_0_100px_rgba(239,68,68,0.15)] flex flex-col relative overflow-hidden">
              
              {/* Header */}
              <div className="relative overflow-hidden shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-950 via-slate-900 to-red-950 opacity-80"></div>
                  <div className="absolute -left-10 top-0 w-32 h-32 bg-red-600/20 blur-3xl rounded-full pointer-events-none"></div>
                  <div className="absolute -right-10 top-0 w-32 h-32 bg-red-600/20 blur-3xl rounded-full pointer-events-none"></div>
                  
                  <div className="p-4 border-b border-red-500/30 flex justify-between items-center relative z-10">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-500/50 flex items-center justify-center text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                              <ShieldAlert size={22} />
                          </div>
                          <div>
                              <h2 className="text-xl font-black font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">GOD MODE</h2>
                              <p className="text-[10px] font-mono text-red-400/70 tracking-widest uppercase">System Override Terminal</p>
                          </div>
                      </div>
                      <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 hover:border-red-500 text-slate-400 hover:text-red-400 transition-all"><X size={18} /></button>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-slate-800 bg-slate-950/80 relative z-10 px-2 gap-1 overflow-x-auto no-scrollbar">
                      {[
                          { id: 'player', icon: User, label: 'PLAYER' },
                          { id: 'companion', icon: Users, label: 'COMPANION' },
                          { id: 'magye', icon: Skull, label: 'MAGYE' },
                          { id: 'base', icon: Home, label: 'BASE' },
                          { id: 'diplomacy', icon: Globe, label: 'DIPLOMACY' },
                      ].map(tab => (
                          <button 
                              key={tab.id}
                              onClick={() => setTargetType(tab.id as TargetType)}
                              className={`flex-1 min-w-[120px] py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2 ${
                                  targetType === tab.id 
                                      ? 'bg-red-950/30 text-red-400 border-red-500 shadow-[inset_0_-2px_10px_rgba(239,68,68,0.1)]' 
                                      : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/50'
                              }`}
                          >
                              <tab.icon size={16} /> {tab.label}
                          </button>
                      ))}
                  </div>
              </div>

              {/* Companion Selector & Add Button */}
              {targetType === 'companion' && (
                  <div className="p-3 bg-slate-900/80 border-b border-slate-800 shrink-0 flex gap-3 items-center shadow-md z-10">
                      {localChar.companions.length > 0 ? (
                          <div className="relative flex-1">
                              <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <select 
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 font-bold focus:border-red-500 outline-none appearance-none"
                                value={selectedCompIndex}
                                onChange={(e) => setSelectedCompIndex(Number(e.target.value))}
                              >
                                  {localChar.companions.map((c, i) => (
                                      <option key={i} value={i}>{c.name} (Lv.{c.level} {c.classType})</option>
                                  ))}
                              </select>
                          </div>
                      ) : (
                          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-500 italic text-center">
                              No Companions Found
                          </div>
                      )}
                      
                      <button 
                          onClick={addCompanion}
                          className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-red-900/20 flex items-center shrink-0 transition-colors"
                      >
                          <Plus size={16} className="mr-1"/> 새 동료
                      </button>

                      {localChar.companions.length > 0 && (
                          <button 
                            onClick={handleDeleteCurrentCompanion}
                            className="bg-slate-800 hover:bg-red-950 text-red-400 border border-slate-700 hover:border-red-500 p-2 rounded-lg shrink-0 transition-colors"
                            title="Delete selected companion"
                          >
                              <Trash size={18} />
                          </button>
                      )}
                  </div>
              )}
              
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar bg-slate-950">
                  {/* [NEW] GLOBAL CHEAT DASHBOARD */}
                  <div className="bg-slate-900 p-4 rounded-xl border border-red-900/50 shadow-[0_0_20px_rgba(239,68,68,0.05)] animate-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 mb-3 border-b border-red-900/30 pb-2">
                          <Zap size={16} className="text-red-500" />
                          <h3 className="text-sm font-black text-red-400 uppercase tracking-widest">Global Overrides</h3>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <button onClick={healAll} className="p-2 bg-slate-800 hover:bg-green-900/40 border border-slate-700 hover:border-green-500 rounded flex flex-col items-center justify-center gap-1 transition-all group">
                              <Heart size={16} className="text-green-500 group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-bold text-slate-300">풀 회복 (HP/MP)</span>
                          </button>
                          
                          <button onClick={maxAllStats} className="p-2 bg-slate-800 hover:bg-amber-900/40 border border-slate-700 hover:border-amber-500 rounded flex flex-col items-center justify-center gap-1 transition-all group">
                              <TrendingUp size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-bold text-slate-300">무한 스탯 MAX</span>
                          </button>

                          <button onClick={unlockAllTitles} className="p-2 bg-slate-800 hover:bg-purple-900/40 border border-slate-700 hover:border-purple-500 rounded flex flex-col items-center justify-center gap-1 transition-all group">
                              <Crown size={16} className="text-purple-500 group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-bold text-slate-300">모든 칭호 획득</span>
                          </button>

                          <button onClick={maxAllReputations} className="p-2 bg-slate-800 hover:bg-emerald-900/40 border border-slate-700 hover:border-emerald-500 rounded flex flex-col items-center justify-center gap-1 transition-all group">
                              <Medal size={16} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-bold text-slate-300">모든 평판 MAX</span>
                          </button>

                          <button onClick={maxAllFacilities} className="p-2 bg-slate-800 hover:bg-blue-900/40 border border-slate-700 hover:border-blue-500 rounded flex flex-col items-center justify-center gap-1 transition-all group">
                              <Home size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-bold text-slate-300">기지 시설/자원 MAX</span>
                          </button>

                          <button onClick={maxAllCompanionsRelation} className="p-2 bg-slate-800 hover:bg-pink-900/40 border border-slate-700 hover:border-pink-500 rounded flex flex-col items-center justify-center gap-1 transition-all group">
                              <Users size={16} className="text-pink-500 group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-bold text-slate-300">전체 호감도 MAX</span>
                          </button>

                          <button onClick={resetTime} className="p-2 bg-slate-800 hover:bg-indigo-900/40 border border-slate-700 hover:border-indigo-500 rounded flex flex-col items-center justify-center gap-1 transition-all group">
                              <Calendar size={16} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-bold text-slate-300">시간 회귀 (2000년)</span>
                          </button>

                          <button onClick={() => {
                              setLocalChar(prev => ({...prev, money: 99999999999, faith: 999999999}));
                              alert("초월적 부(Gold)와 신앙심(Faith)을 획득했습니다!");
                          }} className="p-2 bg-slate-800 hover:bg-yellow-900/40 border border-slate-700 hover:border-yellow-500 rounded flex flex-col items-center justify-center gap-1 transition-all group">
                              <Landmark size={16} className="text-yellow-500 group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-bold text-slate-300">초월적 부(재화)</span>
                          </button>

                          <button onClick={unlockAllCombatStyles} className="p-2 bg-slate-800 hover:bg-rose-900/40 border border-slate-700 hover:border-rose-500 rounded flex flex-col items-center justify-center gap-1 transition-all group">
                              <Sword size={16} className="text-rose-500 group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-bold text-slate-300">전투계열 전체 해금</span>
                          </button>

                          <button onClick={unlockTier1CombatStyles} className="p-2 bg-slate-800 hover:bg-teal-900/40 border border-slate-700 hover:border-teal-500 rounded flex flex-col items-center justify-center gap-1 transition-all group">
                              <Sparkles size={16} className="text-teal-400 group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-bold text-slate-300">1차 계열 9종 해금</span>
                          </button>
                      </div>
                  </div>

                  
                  {/* MAGYE DOMINION EDITING */}
                  {targetType === 'magye' && (
                      <section className="space-y-4">
                          {!localChar.magyeDominions ? (
                              <div className="text-center py-10 text-slate-500">
                                  <p>No Magye Dominion Data found for this character.</p>
                                  <button 
                                    onClick={() => {
                                        const dummyDominions: Record<string, DominionData> = {};
                                        Object.keys(MAGYE_DOMINION_MAP).forEach(name => {
                                            dummyDominions[name] = { 
                                                fear: 0, 
                                                corruption: 0, 
                                                facilityLevels: { 'harvester': 1, 'breeder': 1, 'torture': 1 },
                                                personnel: { overseerIds: [], executionerIds: [] }
                                            };
                                        });
                                        setLocalChar(prev => ({ ...prev, magyeDominions: dummyDominions }));
                                        if (Object.keys(dummyDominions).length > 0) setSelectedMagyeCity(Object.keys(dummyDominions)[0]);
                                    }}
                                    className="mt-4 px-4 py-2 bg-red-900/30 border border-red-500 text-red-300 rounded"
                                  >
                                    Force Initialize Magye Dominions
                                  </button>
                              </div>
                          ) : (
                              <>
                                <h3 className="font-bold border-b border-slate-700 pb-2 text-slate-400 text-sm uppercase flex items-center">
                                    <Skull size={14} className="mr-2"/> Dominion Control
                                </h3>
                                
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase block mb-1">Select City</label>
                                        <select 
                                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none"
                                            value={selectedMagyeCity}
                                            onChange={e => setSelectedMagyeCity(e.target.value)}
                                        >
                                            {Object.keys(localChar.magyeDominions).map(city => (
                                                <option key={city} value={city}>{city}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedMagyeCity && localChar.magyeDominions[selectedMagyeCity] && (
                                        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6 animate-in fade-in">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="text-xs text-red-500 font-bold uppercase block mb-1">Fear Level (공포도)</label>
                                                    <div className="flex items-center gap-4">
                                                        <input 
                                                            type="number" 
                                                            min="0"
                                                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none text-white font-mono"
                                                            value={localChar.magyeDominions[selectedMagyeCity].fear}
                                                            onChange={e => updateMagyeDominion(selectedMagyeCity, { fear: parseInt(e.target.value) || 0 })}
                                                        />
                                                        <span className="text-xs text-slate-500 whitespace-nowrap">0 ~ 10,000+</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-purple-500 font-bold uppercase block mb-1">Corruption (타락도)</label>
                                                    <div className="flex items-center gap-4">
                                                        <input 
                                                            type="number" 
                                                            min="0"
                                                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-purple-500 outline-none text-white font-mono"
                                                            value={localChar.magyeDominions[selectedMagyeCity].corruption}
                                                            onChange={e => updateMagyeDominion(selectedMagyeCity, { corruption: parseInt(e.target.value) || 0 })}
                                                        />
                                                        <span className="text-xs text-slate-500 whitespace-nowrap">0 ~ 10,000+</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="p-4 bg-slate-950 border border-white/5 rounded-xl">
                                                <h4 className="text-[10px] text-slate-500 font-bold uppercase mb-2">Dominion Overview</h4>
                                                <div className="flex gap-4">
                                                    <div className="flex-1 bg-slate-900 p-2 rounded text-center">
                                                        <span className="text-[9px] text-slate-500 block uppercase">Facility Levels</span>
                                                        <span className="text-xs text-indigo-400 font-bold">Harvester: Lv.{localChar.magyeDominions[selectedMagyeCity].facilityLevels?.harvester || 1}</span>
                                                    </div>
                                                    <div className="flex-1 bg-slate-900 p-2 rounded text-center">
                                                        <span className="text-[9px] text-slate-500 block uppercase">Personnel</span>
                                                        <span className="text-xs text-green-400 font-bold">Overseers: {localChar.magyeDominions[selectedMagyeCity].personnel?.overseerIds.length || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                              </>
                          )}
                      </section>
                  )}

                  {/* DIPLOMACY EDITING */}
                  {targetType === 'diplomacy' && (
                    <section className="space-y-4">
                        {!localChar.militaryData?.diplomacy ? (
                            <div className="text-center py-10 text-slate-500">
                                <p>No Diplomacy Data found for this character.</p>
                                <button 
                                  onClick={() => {
                                      const dummyDiplomacy: Record<string, NationRelation> = {};
                                      Object.keys(NATION_INFO).forEach(name => {
                                          dummyDiplomacy[name] = { status: DiplomaticStatus.NEUTRAL, tension: 0, lastEvent: "운영자에 의해 초기화됨" };
                                      });
                                      setLocalChar(prev => ({
                                          ...prev,
                                          militaryData: {
                                              ...(prev.militaryData || { rank: MilitaryRank.PVT, enlistedDate: prev.currentDate || '2000-01-01', merit: 0, completedMissions: 0 }),
                                              diplomacy: dummyDiplomacy
                                          }
                                      }));
                                      if (Object.keys(dummyDiplomacy).length > 0) setSelectedNationKey(Object.keys(dummyDiplomacy)[0]);
                                  }}
                                  className="mt-4 px-4 py-2 bg-red-900/30 border border-red-500 text-red-300 rounded"
                                >
                                  Force Initialize Diplomacy
                                </button>
                            </div>
                        ) : (
                            <>
                                <h3 className="font-bold border-b border-slate-700 pb-2 text-slate-400 text-sm uppercase flex items-center">
                                    <Globe size={14} className="mr-2"/> International Relations
                                </h3>
                                
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase block mb-1">Select Nation</label>
                                        <select 
                                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none"
                                            value={selectedNationKey}
                                            onChange={e => setSelectedNationKey(e.target.value)}
                                        >
                                            {Object.keys(localChar.militaryData.diplomacy).map(name => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedNationKey && localChar.militaryData.diplomacy[selectedNationKey] && (
                                        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6 animate-in fade-in">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="text-xs text-slate-500 uppercase block mb-1">Diplomatic Status</label>
                                                    <select 
                                                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none text-white"
                                                        value={localChar.militaryData.diplomacy[selectedNationKey].status}
                                                        onChange={e => updateDiplomacy(selectedNationKey, { status: e.target.value as DiplomaticStatus })}
                                                    >
                                                        {Object.values(DiplomaticStatus).map(status => (
                                                            <option key={status} value={status}>{status}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-500 uppercase block mb-1">Tension (0-100)</label>
                                                    <input 
                                                        type="number" 
                                                        min="0" max="100"
                                                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none text-white"
                                                        value={localChar.militaryData.diplomacy[selectedNationKey].tension}
                                                        onChange={e => updateDiplomacy(selectedNationKey, { tension: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-500 uppercase block mb-1">Occupation (-100 to 100)</label>
                                                    <input 
                                                        type="number" 
                                                        min="-100" max="100"
                                                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none text-white"
                                                        value={localChar.militaryData.diplomacy[selectedNationKey].occupation || 0}
                                                        onChange={e => updateDiplomacy(selectedNationKey, { occupation: Math.max(-100, Math.min(100, parseInt(e.target.value) || 0)) })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-500 uppercase block mb-1">Vassal Years Left</label>
                                                    <input 
                                                        type="number" 
                                                        min="0"
                                                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none text-white"
                                                        value={localChar.militaryData.diplomacy[selectedNationKey].vassalYearsRemaining || 0}
                                                        onChange={e => updateDiplomacy(selectedNationKey, { vassalYearsRemaining: Math.max(0, parseInt(e.target.value) || 0) })}
                                                    />
                                                </div>
                                                <div className="md:col-span-2 bg-amber-900/10 p-4 rounded-xl border border-amber-500/20">
                                                    <label className="text-xs text-amber-500 font-bold uppercase block mb-2 flex items-center">
                                                        <Crown size={14} className="mr-2"/> National Favorability (국왕 호감도)
                                                    </label>
                                                    <div className="flex items-center gap-4">
                                                        <input 
                                                            type="number" 
                                                            min="0" max="1000"
                                                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-amber-500 outline-none text-amber-200 font-mono"
                                                            value={localChar.nationalFavorability?.[selectedNationKey] || 0}
                                                            onChange={e => updateNationalFavorability(selectedNationKey, parseInt(e.target.value) || 0)}
                                                        />
                                                        <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-amber-500 transition-all" 
                                                                style={{ width: `${(localChar.nationalFavorability?.[selectedNationKey] || 0) / 10}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 uppercase block mb-1">Last Diplomatic Event</label>
                                                <input 
                                                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none text-white"
                                                    value={localChar.militaryData.diplomacy[selectedNationKey].lastEvent || ''}
                                                    onChange={e => updateDiplomacy(selectedNationKey, { lastEvent: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </section>
                  )}

                  {/* BASE EDITING */}
                  {targetType === 'base' && (
                      <section className="space-y-4">
                          {!localChar.base ? (
                              <div className="text-center py-10 text-slate-500">
                                  <p>No Base Data found for this character.</p>
                                  <button 
                                    onClick={() => setLocalChar(prev => ({...prev, base: { 
                                        level: 0, 
                                        resources: { 
                                            gold: 0, wood: 0, stone: 0, iron: 0, manaCrystal: 0, manaStone: 0, food: 0, herbs: 0,
                                            normalCrystal: 0, magicCrystal: 0, rareCrystal: 0, epicCrystal: 0, uniqueCrystal: 0, legendaryCrystal: 0
                                        }, 
                                        residents: [], 
                                        facilities: [], 
                                        assignments: {}, 
                                        storage: [],
                                        facilityLevels: {},
                                        dailyCounts: {},
                                        elementalShards: {},
                                        capturedMonsters: [],
                                        gridSize: 2,
                                        layout: []
                                    }}))}
                                    className="mt-4 px-4 py-2 bg-red-900/30 border border-red-500 text-red-300 rounded"
                                  >
                                    Force Create Base (Lv.0)
                                  </button>
                              </div>
                          ) : (
                              <>
                                <h3 className="font-bold border-b border-slate-700 pb-2 text-slate-400 text-sm uppercase">Base Properties</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase block mb-1">Base Level</label>
                                        <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none" 
                                            value={localChar.base.level} onChange={e => updateTarget('level', parseInt(e.target.value) || 0)} />
                                    </div>
                                </div>
                                
                                <h3 className="font-bold border-b border-slate-700 pb-2 text-slate-400 text-sm uppercase mt-6">Basic Resources</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="text-xs text-orange-500 uppercase block mb-1">Food</label>
                                        <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-orange-500 outline-none" 
                                            value={localChar.base.resources.food || 0} onChange={e => updateResource('food', parseInt(e.target.value) || 0)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-green-500 uppercase block mb-1">Wood</label>
                                        <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-green-500 outline-none" 
                                            value={localChar.base.resources.wood} onChange={e => updateResource('wood', parseInt(e.target.value) || 0)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 uppercase block mb-1">Stone</label>
                                        <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-slate-500 outline-none" 
                                            value={localChar.base.resources.stone} onChange={e => updateResource('stone', parseInt(e.target.value) || 0)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-blue-400 uppercase block mb-1">Iron</label>
                                        <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-blue-500 outline-none" 
                                            value={localChar.base.resources.iron} onChange={e => updateResource('iron', parseInt(e.target.value) || 0)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-purple-400 uppercase block mb-1">Mana Crystal</label>
                                        <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-purple-500 outline-none" 
                                            value={localChar.base.resources.manaCrystal} onChange={e => updateResource('manaCrystal', parseInt(e.target.value) || 0)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-indigo-400 uppercase block mb-1">Mana Stone</label>
                                        <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-indigo-500 outline-none" 
                                            value={localChar.base.resources.manaStone || 0} onChange={e => updateResource('manaStone', parseInt(e.target.value) || 0)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-green-300 uppercase block mb-1 flex items-center"><Leaf size={10} className="mr-1"/>Herbs</label>
                                        <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-green-300 outline-none" 
                                            value={localChar.base.resources.herbs || 0} onChange={e => updateResource('herbs', parseInt(e.target.value) || 0)} />
                                    </div>
                                </div>

                                <h3 className="font-bold border-b border-slate-700 pb-2 text-slate-400 text-sm uppercase mt-6 flex items-center"><Gem size={14} className="mr-2"/> Rare Crystals</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div><label className="text-[10px] text-slate-400">Normal</label><input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-xs" value={localChar.base.resources.normalCrystal || 0} onChange={e => updateResource('normalCrystal', parseInt(e.target.value)||0)} /></div>
                                    <div><label className="text-[10px] text-blue-400">Magic</label><input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-xs" value={localChar.base.resources.magicCrystal || 0} onChange={e => updateResource('magicCrystal', parseInt(e.target.value)||0)} /></div>
                                    <div><label className="text-[10px] text-yellow-400">Rare</label><input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-xs" value={localChar.base.resources.rareCrystal || 0} onChange={e => updateResource('rareCrystal', parseInt(e.target.value)||0)} /></div>
                                    <div><label className="text-[10px] text-purple-400">Epic</label><input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-xs" value={localChar.base.resources.epicCrystal || 0} onChange={e => updateResource('epicCrystal', parseInt(e.target.value)||0)} /></div>
                                    <div><label className="text-[10px] text-pink-400">Unique</label><input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-xs" value={localChar.base.resources.uniqueCrystal || 0} onChange={e => updateResource('uniqueCrystal', parseInt(e.target.value)||0)} /></div>
                                    <div><label className="text-[10px] text-amber-500">Legendary</label><input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-xs" value={localChar.base.resources.legendaryCrystal || 0} onChange={e => updateResource('legendaryCrystal', parseInt(e.target.value)||0)} /></div>
                                </div>

                                <h3 className="font-bold border-b border-slate-700 pb-2 text-slate-400 text-sm uppercase mt-6 flex items-center"><Gem size={14} className="mr-2"/> Ores & Gems (광석 및 보석)</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div><label className="text-[10px] text-amber-400">금광석 (Gold Ore)</label><input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-xs" value={localChar.base.resources.gold_ore || 0} onChange={e => updateResource('gold_ore', parseInt(e.target.value)||0)} /></div>
                                    <div><label className="text-[10px] text-slate-300">은광석 (Silver Ore)</label><input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-xs" value={localChar.base.resources.silver_ore || 0} onChange={e => updateResource('silver_ore', parseInt(e.target.value)||0)} /></div>
                                    <div><label className="text-[10px] text-cyan-300">다이아몬드 (Diamond)</label><input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-xs" value={localChar.base.resources.diamond || 0} onChange={e => updateResource('diamond', parseInt(e.target.value)||0)} /></div>
                                    <div><label className="text-[10px] text-rose-400">루비 (Ruby)</label><input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-xs" value={localChar.base.resources.ruby || 0} onChange={e => updateResource('ruby', parseInt(e.target.value)||0)} /></div>
                                    <div><label className="text-[10px] text-blue-400">사파이어 (Sapphire)</label><input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-xs" value={localChar.base.resources.sapphire || 0} onChange={e => updateResource('sapphire', parseInt(e.target.value)||0)} /></div>
                                    <div><label className="text-[10px] text-emerald-400">에메랄드 (Emerald)</label><input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-xs" value={localChar.base.resources.emerald || 0} onChange={e => updateResource('emerald', parseInt(e.target.value)||0)} /></div>
                                    <div><label className="text-[10px] text-yellow-300">신성석 (Holy Stone)</label><input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-xs" value={localChar.base.resources.holy_stone || 0} onChange={e => updateResource('holy_stone', parseInt(e.target.value)||0)} /></div>
                                </div>

                                <h3 className="font-bold border-b border-slate-700 pb-2 text-slate-400 text-sm uppercase mt-6 flex items-center"><Leaf size={14} className="mr-2"/> Harvested Crops (수확한 작물)</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-56 overflow-y-auto custom-scrollbar p-1">
                                    {[
                                        { key: 'wheat', name: '밀' },
                                        { key: 'corn', name: '옥수수' },
                                        { key: 'potato', name: '감자' },
                                        { key: 'rice', name: '쌀' },
                                        { key: 'sweet_potato', name: '고구마' },
                                        { key: 'onion', name: '양파' },
                                        { key: 'garlic', name: '마늘' },
                                        { key: 'lettuce', name: '상추' },
                                        { key: 'carrot', name: '당근' },
                                        { key: 'cabbage', name: '배추' },
                                        { key: 'tomato', name: '토마토' },
                                        { key: 'strawberry', name: '딸기' },
                                        { key: 'grape', name: '포도' },
                                        { key: 'watermelon', name: '수박' },
                                        { key: 'ginseng', name: '인삼' },
                                        { key: 'mana_fruit', name: '마력 열매' },
                                        { key: 'shinryoku_flower', name: '신력 꽃' },
                                        { key: 'mandrake', name: '만드라고라' },
                                        { key: 'world_tree_branch', name: '세계수의 가지' },
                                        { key: 'golden_apple', name: '황금 사과' }
                                    ].map(crop => (
                                        <div key={crop.key}>
                                            <label className="text-[10px] text-green-300">{crop.name}</label>
                                            <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-xs" value={(localChar.base.resources as any)[crop.key] || 0} onChange={e => updateResource(crop.key, parseInt(e.target.value)||0)} />
                                        </div>
                                    ))}
                                </div>

                                <h3 className="font-bold border-b border-slate-700 pb-2 text-slate-400 text-sm uppercase mt-6 flex items-center"><Layers size={14} className="mr-2"/> Elemental Shards</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                                    {SHINRYOKU_TYPES_LIST.map(type => (
                                        <div key={type}>
                                            <label className="text-[10px] text-slate-400 truncate">{type}</label>
                                            <input 
                                                type="number" 
                                                className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-xs text-amber-100" 
                                                value={localChar.base!.elementalShards?.[type] || 0} 
                                                onChange={e => updateShard(type, parseInt(e.target.value)||0)} 
                                            />
                                        </div>
                                    ))}
                                </div>

                                <h3 className="font-bold border-b border-slate-700 pb-2 text-slate-400 text-sm uppercase mt-6">Facility Levels</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {FACILITIES_INFO.map(fac => (
                                        <div key={fac.id}>
                                            <label className="text-xs text-indigo-400 uppercase block mb-1">{fac.name}</label>
                                            <input 
                                                type="number" 
                                                min="1"
                                                max="5"
                                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-indigo-500 outline-none" 
                                                value={localChar.base?.facilityLevels?.[fac.id] || 1} 
                                                onChange={e => updateFacilityLevel(fac.id, parseInt(e.target.value) || 1)} 
                                            />
                                        </div>
                                    ))}
                                </div>
                              </>
                          )}
                      </section>
                  )}

                  {/* PLAYER/COMPANION EDITING (General) */}
                  {targetType !== 'base' && targetType !== 'diplomacy' && targetType !== 'magye' && (
                      <>
                        {targetType === 'companion' && !currentTarget ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-500 opacity-50">
                                <Users size={48} className="mb-4" />
                                <p className="text-lg">No Companion Selected</p>
                                <p className="text-xs mt-2">Click "Add New" to create a companion.</p>
                            </div>
                        ) : (
                            <section className="space-y-4">
                                {/* [NEW] Companion Custom Status Banner & Toggle */}
                                {targetType === 'companion' && (
                                    <div className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                                        (currentTarget as Companion)?.isCustom 
                                            ? 'bg-purple-950/40 border-purple-600/70 text-purple-200 shadow-sm shadow-purple-900/30' 
                                            : 'bg-slate-900/70 border-slate-700 text-slate-400'
                                    }`}>
                                        <div className="flex items-center space-x-3">
                                            <div className={`p-2.5 rounded-md ${
                                                (currentTarget as Companion)?.isCustom ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'
                                            }`}>
                                                <Sparkles size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center space-x-2 flex-wrap">
                                                    <span className="font-bold text-sm text-white">커스텀 동료 여부 (isCustom)</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                                        (currentTarget as Companion)?.isCustom 
                                                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' 
                                                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                                                    }`}>
                                                        {(currentTarget as Companion)?.isCustom ? '★ ON (커스텀 동료)' : 'OFF (일반 동료)'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {(currentTarget as Companion)?.isCustom 
                                                        ? '활성화됨: 스탯 포인트 자유 분배, 스킬북 학습, 전직 및 AI 육성 커스터마이징 가능' 
                                                        : '비활성화됨: 기본 시스템에 따른 고정 성장/자연 학습 메커니즘 적용'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => updateTarget('isCustom', !(currentTarget as Companion)?.isCustom)}
                                            className={`px-3.5 py-2 rounded text-xs font-bold transition flex items-center justify-center space-x-1.5 shrink-0 ${
                                                (currentTarget as Companion)?.isCustom 
                                                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/40' 
                                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600'
                                            }`}
                                        >
                                            {(currentTarget as Companion)?.isCustom ? <CheckSquare size={15}/> : <Square size={15}/>}
                                            <span>{(currentTarget as Companion)?.isCustom ? '커스텀 활성화됨' : '커스텀 동료로 전환'}</span>
                                        </button>
                                    </div>
                                )}

                                <h3 className="font-bold border-b border-slate-700 pb-2 text-slate-400 text-sm uppercase">General Info</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* Gold & Faith Input for Player */}
                                    {targetType === 'player' && (
                                        <>
                                        <div className="md:col-span-3 lg:col-span-3 mb-2 bg-slate-800/50 p-2 rounded border border-amber-900/50">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-xs text-amber-500 uppercase font-bold">Gold (Money)</label>
                                                <button 
                                                    type="button"
                                                    onClick={() => setLocalChar(prev => ({...prev, money: (prev.money || 0) + 10000000}))}
                                                    className="text-[10px] bg-amber-950 hover:bg-amber-900 text-amber-300 px-2 py-0.5 rounded border border-amber-700"
                                                >
                                                    +10,000,000 Gold
                                                </button>
                                            </div>
                                            <input type="number" className="w-full bg-slate-900 border border-amber-700/50 rounded p-2 text-sm focus:border-amber-500 outline-none font-mono text-amber-300" 
                                                value={localChar.money} onChange={e => setLocalChar(prev => ({...prev, money: parseInt(e.target.value) || 0}))} />
                                        </div>
                                        <div className="md:col-span-3 lg:col-span-3 mb-2 bg-slate-800/50 p-2 rounded border border-indigo-900/50">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-xs text-indigo-400 uppercase font-bold">Faith (신앙심)</label>
                                                <button 
                                                    type="button"
                                                    onClick={() => setLocalChar(prev => ({...prev, faith: (prev.faith || 0) + 1000}))}
                                                    className="text-[10px] bg-indigo-950 hover:bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700"
                                                >
                                                    +1,000 Faith
                                                </button>
                                            </div>
                                            <input type="number" className="w-full bg-slate-900 border border-indigo-700/50 rounded p-2 text-sm focus:border-indigo-500 outline-none font-mono text-indigo-300" 
                                                value={localChar.faith || 0} onChange={e => setLocalChar(prev => ({...prev, faith: parseInt(e.target.value) || 0}))} />
                                        </div>
                                        {/* [NEW] Faction Reputations */}
                                        <div className="bg-slate-800/30 p-3 rounded border border-emerald-900/30">
                                            <label className="text-xs text-emerald-400 uppercase block mb-1 font-bold flex items-center"><Trees size={12} className="mr-1"/> Elf Reputation</label>
                                            <input type="number" className="w-full bg-slate-900 border border-emerald-700/50 rounded p-2 text-sm focus:border-emerald-500 outline-none text-emerald-200" 
                                                value={localChar.elfReputation || 0} onChange={e => setLocalChar(prev => ({...prev, elfReputation: parseInt(e.target.value) || 0}))} />
                                        </div>
                                        <div className="bg-slate-800/30 p-3 rounded border border-orange-900/30">
                                            <label className="text-xs text-orange-400 uppercase block mb-1 font-bold flex items-center"><PawPrint size={12} className="mr-1"/> Beast Reputation</label>
                                            <input type="number" className="w-full bg-slate-900 border border-orange-700/50 rounded p-2 text-sm focus:border-orange-500 outline-none text-orange-200" 
                                                value={localChar.beastReputation || 0} onChange={e => setLocalChar(prev => ({...prev, beastReputation: parseInt(e.target.value) || 0}))} />
                                        </div>
                                        <div className="bg-slate-800/30 p-3 rounded border border-purple-900/30">
                                            <label className="text-xs text-purple-400 uppercase block mb-1 font-bold flex items-center"><Gavel size={12} className="mr-1"/> Demon Reputation</label>
                                            <input type="number" className="w-full bg-slate-900 border border-purple-700/50 rounded p-2 text-sm focus:border-purple-500 outline-none text-purple-200" 
                                                value={localChar.demonReputation || 0} onChange={e => setLocalChar(prev => ({...prev, demonReputation: parseInt(e.target.value) || 0}))} />
                                        </div>
                                        </>
                                    )}

                                    <div>
                                        <label className="text-xs text-slate-500 uppercase block mb-1">Name</label>
                                        <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none" 
                                            value={currentTarget?.name || ''} onChange={e => updateTarget('name', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase block mb-1">Age</label>
                                        <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none" 
                                            value={currentTarget?.age || ''} onChange={e => updateTarget('age', e.target.value)} placeholder="ex: 20세" />
                                    </div>
                                    {/* [NEW] Birth Year Field */}
                                    <div className="bg-indigo-900/10 p-2 rounded border border-indigo-900/30">
                                        <label className="text-xs text-indigo-400 uppercase block mb-1 font-bold flex items-center"><Calendar size={12} className="mr-1"/> Birth Year (탄생 연도)</label>
                                        <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none text-white font-mono" 
                                            value={currentTarget?.birthYear || 2000} onChange={e => updateTarget('birthYear', parseInt(e.target.value) || 2000)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase block mb-1">Gender</label>
                                        <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none" 
                                            value={currentTarget?.gender || ''} onChange={e => updateTarget('gender', e.target.value)} />
                                    </div>

                                    {/* [NEW] Infamy Editing */}
                                    <div className="bg-red-900/10 p-2 rounded border border-red-900/30">
                                        <label className="text-xs text-red-500 uppercase block mb-1 font-bold flex items-center"><Gavel size={12} className="mr-1"/> Infamy (악명도)</label>
                                        <input type="number" min="0" max="1000" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none text-red-300 font-mono" 
                                            value={currentTarget?.infamy || 0} onChange={e => updateTarget('infamy', parseInt(e.target.value) || 0)} />
                                    </div>

                                    <div>
                                        <label className="text-xs text-slate-500 uppercase block mb-1">Nation</label>
                                        <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none" 
                                            value={currentTarget?.nation || ''} onChange={e => updateTarget('nation', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase block mb-1">Race</label>
                                        <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none" 
                                            value={currentTarget?.race || ''} onChange={e => updateTarget('race', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase block mb-1">Personality</label>
                                        <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none" 
                                            value={currentTarget?.personality || ''} onChange={e => updateTarget('personality', e.target.value)} />
                                    </div>
                                    
                                    {/* [NEW] Job Editing for Companion and Player */}
                                    <div>
                                        <label className="text-xs text-indigo-400 uppercase block mb-1 font-bold flex items-center">
                                            <Briefcase size={12} className="mr-1"/> Job (직업)
                                        </label>
                                        <select 
                                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none text-indigo-200"
                                            value={currentTarget?.job || JobType.UNEMPLOYED} 
                                            onChange={e => updateTarget('job', e.target.value as JobType)}
                                        >
                                            {Object.values(JobType).map(j => <option key={j} value={j}>{j}</option>)}
                                        </select>
                                    </div>

                                    {/* [NEW] Blacksmith Specific Fields if Job is BLACKSMITH */}
                                    {currentTarget?.job === JobType.BLACKSMITH && (
                                        <>
                                            <div>
                                                <label className="text-xs text-orange-400 uppercase block mb-1 font-bold flex items-center">
                                                    <Hammer size={12} className="mr-1"/> BS Rank (등급)
                                                </label>
                                                <select
                                                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none text-orange-200"
                                                    value={currentTarget?.blacksmithRank || BlacksmithRank.BEGINNER}
                                                    onChange={e => updateTarget('blacksmithRank', e.target.value as BlacksmithRank)}
                                                >
                                                    {Object.values(BlacksmithRank).map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-orange-400 uppercase block mb-1 font-bold flex items-center">
                                                    <TrendingUp size={12} className="mr-1"/> BS Mastery (숙련도)
                                                </label>
                                                <input 
                                                    type="number"
                                                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none text-orange-200 font-mono"
                                                    value={currentTarget?.blacksmithMastery || 0}
                                                    onChange={e => updateTarget('blacksmithMastery', parseInt(e.target.value) || 0)}
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* [NEW] Housekeeper Specific Fields if Job is HOUSEKEEPER */}
                                    {currentTarget?.job === JobType.HOUSEKEEPER && (
                                        <>
                                            <div>
                                                <label className="text-xs text-amber-400 uppercase block mb-1 font-bold flex items-center">
                                                    <Home size={12} className="mr-1"/> 하우스 키퍼 등급 (Rank)
                                                </label>
                                                <select
                                                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-amber-500 outline-none text-amber-200"
                                                    value={currentTarget?.housekeeperRank || HousekeeperRank.BEGINNER}
                                                    onChange={e => updateTarget('housekeeperRank', e.target.value as HousekeeperRank)}
                                                >
                                                    {Object.values(HousekeeperRank).map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-amber-400 uppercase block mb-1 font-bold flex items-center">
                                                    <TrendingUp size={12} className="mr-1"/> 하우스 키퍼 경험치 (Exp)
                                                </label>
                                                <input 
                                                    type="number"
                                                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-amber-500 outline-none text-amber-200 font-mono"
                                                    value={currentTarget?.housekeeperExp || 0}
                                                    onChange={e => updateTarget('housekeeperExp', parseInt(e.target.value) || 0)}
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* [NEW] Reputation Editing */}
                                    <div>
                                        <label className="text-xs text-red-400 uppercase block mb-1 font-bold flex items-center">
                                            <Award size={12} className="mr-1"/> Reputation (명성치)
                                        </label>
                                        {targetType === 'player' ? (
                                            <input 
                                                type="number" 
                                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none text-red-200"
                                                value={localChar.mercenaryData?.reputation || 0}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    if (localChar.mercenaryData) {
                                                        setLocalChar({
                                                            ...localChar,
                                                            mercenaryData: { ...localChar.mercenaryData, reputation: val }
                                                        });
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <input 
                                                type="number" 
                                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none text-red-200"
                                                value={(currentTarget as Companion)?.reputation || 0}
                                                onChange={e => updateTarget('reputation', parseInt(e.target.value) || 0)}
                                            />
                                        )}
                                    </div>

                                    {/* [NEW] Military Specific Fields if Job is SOLDIER */}
                                    {currentTarget?.job === JobType.SOLDIER && (
                                        <>
                                            <div>
                                                <label className="text-xs text-blue-400 uppercase block mb-1 font-bold flex items-center">
                                                    <Medal size={12} className="mr-1"/> Military Rank (군 계급)
                                                </label>
                                                <select
                                                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none text-blue-200"
                                                    value={targetType === 'player' ? localChar.militaryRank : (currentTarget as Companion).militaryRank || MilitaryRank.PVT}
                                                    onChange={e => {
                                                        const val = e.target.value as MilitaryRank;
                                                        if (targetType === 'player') {
                                                            setLocalChar({ ...localChar, militaryRank: val, militaryData: localChar.militaryData ? { ...localChar.militaryData, rank: val } : undefined });
                                                        } else {
                                                            updateTarget('militaryRank', val);
                                                        }
                                                    }}
                                                >
                                                    {Object.values(MilitaryRank).map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-blue-400 uppercase block mb-1 font-bold flex items-center">
                                                    <TrendingUp size={12} className="mr-1"/> Military Merit (공적치)
                                                </label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none text-blue-200"
                                                    value={targetType === 'player' ? (localChar.militaryData?.merit || 0) : ((currentTarget as any).merit || 0)}
                                                    onChange={e => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        if (targetType === 'player' && localChar.militaryData) {
                                                            setLocalChar({ ...localChar, militaryData: { ...localChar.militaryData, merit: val } });
                                                        } else {
                                                            updateTarget('merit', val);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </>
                                    )}

                                    {targetType === 'player' && localChar.mercenaryData && (
                                        <div>
                                            <label className="text-xs text-red-400 uppercase block mb-1 font-bold flex items-center">
                                                <Sword size={12} className="mr-1"/> Mercenary Rank (용병 등급)
                                            </label>
                                            <select className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none text-red-200"
                                                value={localChar.mercenaryData.rank} 
                                                onChange={e => setLocalChar({
                                                    ...localChar, 
                                                    mercenaryData: { ...localChar.mercenaryData!, rank: e.target.value as MercenaryRank }
                                                })}
                                            >
                                                {Object.values(MercenaryRank).map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {targetType === 'companion' && (
                                        <div>
                                            <label className="text-xs text-red-400 uppercase block mb-1 font-bold flex items-center">
                                                <Sword size={12} className="mr-1"/> Mercenary Rank (용병 등급)
                                            </label>
                                            <select 
                                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none text-red-200"
                                                value={(currentTarget as Companion)?.mercenaryRank || MercenaryRank.F} 
                                                onChange={e => updateTarget('mercenaryRank', e.target.value as MercenaryRank)}
                                            >
                                                {Object.values(MercenaryRank).map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-xs text-slate-500 uppercase block mb-1">Shinryoku Type</label>
                                        <select 
                                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none"
                                            value={currentTarget?.shinryokuType || '미개방'} 
                                            onChange={e => updateTarget('shinryokuType', e.target.value)}
                                        >
                                            <option value="미개방">미개방</option>
                                            {SHINRYOKU_TYPES_LIST.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="text-xs text-slate-500 uppercase block mb-1">Appearance</label>
                                        <textarea className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none h-20 resize-none" 
                                            value={currentTarget?.appearance || ''} onChange={e => updateTarget('appearance', e.target.value)} />
                                    </div>

                                    <div>
                                        <label className="text-xs text-slate-500 uppercase block mb-1">Class Tier</label>
                                        <select className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none"
                                            value={currentTarget?.classTier || ClassTier.NONE} onChange={e => updateTarget('classTier', e.target.value)}>
                                            {Object.values(ClassTier).map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase block mb-1">Level</label>
                                        <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none" 
                                            value={currentTarget?.level || 1} onChange={e => updateTarget('level', parseInt(e.target.value) || 1)} />
                                    </div>
                                    {targetType === 'companion' && (
                                        <div className="border border-amber-500/20 bg-amber-950/10 p-2 rounded">
                                            <label className="text-xs text-amber-400 font-bold uppercase block mb-1 flex items-center">
                                                <Sparkles size={12} className="mr-1 text-amber-500 animate-pulse"/> 해방 한계 포텐셜 (Potential)
                                            </label>
                                            <select className="w-full bg-slate-800 border border-amber-900/50 rounded p-2 text-sm focus:border-amber-500 outline-none text-amber-300 font-bold"
                                                value={(currentTarget as Companion)?.liberationPotential || ClassTier.NONE} 
                                                onChange={e => {
                                                    const newPotential = e.target.value as ClassTier;
                                                    const updatedTarget = { ...(currentTarget as Companion), liberationPotential: newPotential };
                                                    const reinitialized = checkAndInitializeLiberationEligibility(updatedTarget, getCompanionCP(updatedTarget));
                                                    updateTarget({
                                                        liberationPotential: newPotential,
                                                        liberationEligibility: reinitialized.liberationEligibility
                                                    });
                                                }}
                                            >
                                                <option value={ClassTier.NONE}>해방 불가 (NONE)</option>
                                                <option value={ClassTier.FIRST}>퍼스트 클래스 (FIRST)</option>
                                                <option value={ClassTier.SECOND}>세컨드 클래스 (SECOND)</option>
                                                <option value={ClassTier.LAST}>라스트 클래스 (LAST)</option>
                                                <option value={ClassTier.FINAL}>파이널 클래스 (FINAL)</option>
                                            </select>
                                        </div>
                                    )}
                                    
                                    {/* [NEW] Stat Points & EXP Fields */}
                                    <div className="bg-yellow-900/10 p-2 rounded border border-yellow-900/30">
                                        <label className="text-xs text-yellow-400 uppercase block mb-1 font-bold flex items-center">
                                            <Star size={12} className="mr-1"/> Stat Points (스탯 포인트)
                                        </label>
                                        <input type="number" min="0" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-yellow-500 outline-none text-yellow-300 font-mono" 
                                            value={currentTarget?.statPoints || 0} onChange={e => updateTarget('statPoints', parseInt(e.target.value) || 0)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 uppercase block mb-1">Current EXP</label>
                                        <input type="number" min="0" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none text-slate-200 font-mono" 
                                            value={currentTarget?.currentExp || 0} onChange={e => updateTarget('currentExp', parseInt(e.target.value) || 0)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 uppercase block mb-1">Max EXP</label>
                                        <input type="number" min="1" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none text-slate-200 font-mono" 
                                            value={currentTarget?.maxExp || 100} onChange={e => updateTarget('maxExp', parseInt(e.target.value) || 100)} />
                                    </div>

                                    {targetType === 'companion' && (
                                        <div>
                                            <label className="text-xs text-amber-500 uppercase block mb-1 font-bold flex items-center">
                                                <Calendar size={12} className="mr-1"/> Met Year (만난 연도)
                                            </label>
                                            <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none text-amber-200" 
                                                value={(currentTarget as Companion)?.metYear || 0} onChange={e => updateTarget('metYear', parseInt(e.target.value) || 0)} />
                                        </div>
                                    )}
                                </div>
                                
                                {/* Relationship Editing (Companion Only) */}
                                {targetType === 'companion' && (
                                    <div className="bg-slate-800/50 p-4 rounded border border-pink-900/30">
                                        <div className="flex justify-between items-center border-b border-pink-900/50 pb-2 mb-4">
                                            <h3 className="font-bold text-pink-400 text-sm uppercase flex items-center">
                                                <Heart size={14} className="mr-2"/> Relationship with Player
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={maxAffectionAndLoyalty}
                                                className="text-xs bg-pink-950 hover:bg-pink-900 text-pink-300 px-2.5 py-1 rounded border border-pink-700/60 font-bold transition flex items-center gap-1"
                                            >
                                                <Sparkles size={11}/> 호감도 & 충성도 100 MAX
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-pink-400 uppercase block mb-1">Affection (0-100)</label>
                                                <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:border-pink-500 outline-none" 
                                                    value={(currentTarget as Companion)?.affection || 0} onChange={e => updateTarget('affection', parseInt(e.target.value) || 0)} />
                                            </div>
                                            <div>
                                                <label className="text-xs text-blue-400 uppercase block mb-1">Loyalty (0-100)</label>
                                                <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:border-blue-500 outline-none" 
                                                    value={(currentTarget as Companion)?.loyalty || 0} onChange={e => updateTarget('loyalty', parseInt(e.target.value) || 0)} />
                                            </div>
                                            <div className="col-span-2 flex flex-wrap items-center gap-4 bg-slate-900 p-3 rounded border border-slate-700 mt-2">
                                                <div className="flex items-center space-x-2">
                                                    <input 
                                                        type="checkbox" 
                                                        id="isLoverCheck"
                                                        checked={(currentTarget as Companion)?.isLover && (currentTarget as Companion)?.partnerId === 'player'}
                                                        onChange={e => toggleRelationship('isLover', e.target.checked)}
                                                        className="w-5 h-5 accent-pink-500 rounded cursor-pointer"
                                                    />
                                                    <label htmlFor="isLoverCheck" className="text-sm text-pink-300 font-bold cursor-pointer select-none">♥ Player's Lover</label>
                                                </div>
                                                
                                                <div className="flex items-center space-x-2">
                                                    <input 
                                                        type="checkbox" 
                                                        id="isSpouseCheck"
                                                        checked={(currentTarget as Companion)?.isSpouse && (currentTarget as Companion)?.partnerId === 'player'}
                                                        onChange={e => toggleRelationship('isSpouse', e.target.checked)}
                                                        className="w-5 h-5 accent-pink-500 rounded cursor-pointer"
                                                    />
                                                    <label htmlFor="isSpouseCheck" className="text-sm text-pink-300 font-bold cursor-pointer select-none">♥ Player's Spouse</label>
                                                </div>

                                                <div className="flex items-center space-x-2">
                                                    <input 
                                                        type="checkbox" 
                                                        id="isPlayerSiblingCheck"
                                                        checked={(currentTarget as Companion)?.relation === RelationType.SIBLING}
                                                        onChange={e => handleTogglePlayerSibling(e.target.checked)}
                                                        className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                                                    />
                                                    <label htmlFor="isPlayerSiblingCheck" className="text-sm text-emerald-300 font-bold cursor-pointer select-none">🌱 Player's Sibling</label>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Partner Info Display */}
                                        <div className="mt-3 text-[10px] text-slate-500 italic px-1">
                                            Partner: {(currentTarget as Companion).partnerName || "None"} (ID: {(currentTarget as Companion).partnerId || "None"})
                                        </div>

                                        {/* Sibling & Kinship Management Panel */}
                                        <div className="mt-4 pt-3 border-t border-slate-700/60 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                                                    <GitFork size={14} /> 형제자매 관계 강제 지정 (Sibling Relations)
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleDevSyncAllSiblings}
                                                    className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 text-[11px] rounded-lg font-bold flex items-center gap-1 transition-all shadow-sm"
                                                    title="가문 내 모든 자식의 부모 정보를 기반으로 형제자매 관계를 자동 연결합니다."
                                                >
                                                    <RefreshCw size={12} /> 가문 전체 자동 동기화
                                                </button>
                                            </div>

                                            {/* Current Siblings List */}
                                            <div className="mb-3">
                                                <div className="text-[11px] text-slate-400 mb-1 font-semibold">
                                                    현재 연결된 형제자매:
                                                </div>
                                                {(() => {
                                                    const siblings = findSiblingsOfCompanion(currentTarget, localChar);
                                                    const isPlayerSib = (currentTarget as Companion)?.relation === RelationType.SIBLING;
                                                    if (siblings.length === 0 && !isPlayerSib) {
                                                        return <div className="text-[11px] text-slate-600 italic">등록된 형제자매가 없습니다.</div>;
                                                    }
                                                    return (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {isPlayerSib && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-900/40 border border-emerald-500/50 text-emerald-300 text-xs font-semibold">
                                                                    <UserCheck size={12} /> 플레이어 (형제자매)
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleTogglePlayerSibling(false)}
                                                                        className="text-red-400 hover:text-red-300 font-bold text-xs ml-1"
                                                                        title="플레이어와의 형제자매 관계 해제"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </span>
                                                            )}
                                                            {siblings.map(sib => (
                                                                <span key={sib.companion.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-700/50 text-emerald-200 text-xs">
                                                                    <span className="text-[10px] text-emerald-400 font-bold">[{sib.term}]</span>
                                                                    <span className="font-semibold">{sib.companion.name}</span>
                                                                    <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${sib.isHalf ? 'bg-amber-950 text-amber-300 border border-amber-600/40' : 'bg-emerald-900 text-emerald-300 border border-emerald-500/40'}`}>
                                                                        {sib.isHalf ? '이복/이부 (+2.5%)' : '친 (+6%)'}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleForceCompanionSibling(sib.companion.id, false)}
                                                                        className="text-red-400 hover:text-red-300 font-bold text-xs ml-1"
                                                                        title={`${sib.companion.name}과의 형제자매 관계 해제`}
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Sibling Target Assignment Control */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <select
                                                    value={devSiblingTargetId}
                                                    onChange={e => setDevSiblingTargetId(e.target.value)}
                                                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200 focus:border-emerald-500 outline-none min-w-[180px]"
                                                >
                                                    <option value="">-- 형제자매로 지정할 대상 선택 --</option>
                                                    <option value="player">★ 플레이어 ({localChar.name})</option>
                                                    <optgroup label="동료 목록">
                                                        {localChar.companions
                                                            .filter(c => c.id !== (currentTarget as Companion)?.id && !c.isMonster)
                                                            .map(c => (
                                                                <option key={c.id} value={c.id}>
                                                                    {c.name} (Lv.{c.level} / {c.gender || '성별미상'})
                                                                </option>
                                                            ))}
                                                    </optgroup>
                                                    {localChar.inactiveCompanions && localChar.inactiveCompanions.length > 0 && (
                                                        <optgroup label="대기실 동료 목록">
                                                            {localChar.inactiveCompanions
                                                                .filter(c => c.id !== (currentTarget as Companion)?.id && !c.isMonster)
                                                                .map(c => (
                                                                    <option key={c.id} value={c.id}>
                                                                        {c.name} (Lv.{c.level} / 대기중)
                                                                    </option>
                                                                ))}
                                                        </optgroup>
                                                    )}
                                                    {localChar.socialNetwork && localChar.socialNetwork.length > 0 && (
                                                        <optgroup label="인연/인맥 NPC">
                                                            {localChar.socialNetwork
                                                                .filter(c => c.id !== (currentTarget as Companion)?.id)
                                                                .map(c => (
                                                                    <option key={c.id} value={c.id}>
                                                                        {c.name} (인맥)
                                                                    </option>
                                                                ))}
                                                        </optgroup>
                                                    )}
                                                </select>

                                                <select
                                                    value={devSiblingType}
                                                    onChange={e => setDevSiblingType(e.target.value as 'FULL' | 'HALF')}
                                                    className="bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-emerald-300 font-bold focus:border-emerald-500 outline-none"
                                                >
                                                    <option value="FULL">친형제 (공방+6%)</option>
                                                    <option value="HALF">이복/이부 형제 (공방+2.5%)</option>
                                                </select>

                                                <button
                                                    type="button"
                                                    disabled={!devSiblingTargetId}
                                                    onClick={() => {
                                                        if (!devSiblingTargetId) return;
                                                        if (devSiblingTargetId === 'player') {
                                                            handleTogglePlayerSibling(true);
                                                        } else {
                                                            handleForceCompanionSibling(devSiblingTargetId, true, devSiblingType === 'HALF');
                                                        }
                                                        setDevSiblingTargetId('');
                                                    }}
                                                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all shadow"
                                                >
                                                    <Plus size={13} /> 형제 지정 (+)
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={!devSiblingTargetId}
                                                    onClick={() => {
                                                        if (!devSiblingTargetId) return;
                                                        if (devSiblingTargetId === 'player') {
                                                            handleTogglePlayerSibling(false);
                                                        } else {
                                                            handleForceCompanionSibling(devSiblingTargetId, false);
                                                        }
                                                        setDevSiblingTargetId('');
                                                    }}
                                                    className="px-3 py-1.5 bg-rose-800 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all shadow"
                                                >
                                                    <Trash size={13} /> 관계 해제 (-)
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Combat Styles & Unlocks */}
                                <div className="mt-8 pt-4 border-t border-slate-700/80">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 rounded bg-red-950/60 border border-red-500/40 text-red-400">
                                                <Sword size={16} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-200 text-sm uppercase">
                                                    전투 계열 및 해금 관리 (Combat Style & Unlocks)
                                                </h3>
                                                <p className="text-[11px] text-slate-400">
                                                    {targetType === 'player' ? '플레이어' : (currentTarget?.name || '동료')}의 장착 전투 계열과 자유 전환 및 스킬 제작 가능한 해금 계열을 설정합니다.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                                                해금: <strong className="text-red-400 font-bold">{(currentTarget?.unlockedCombatStyles || []).length}</strong> / {Object.values(CombatStyle).length}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Current & Target Style Selection */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
                                        <div>
                                            <label className="text-xs text-slate-400 uppercase font-semibold block mb-1 flex items-center justify-between">
                                                <span>현재 장착 전투계열 (Current Style)</span>
                                                {currentTarget?.combatStyle && (
                                                    <span className="text-[10px] text-red-400 bg-red-950/50 px-1.5 py-0.5 rounded border border-red-800/60">
                                                        {COMBAT_STYLE_CONFIG[currentTarget.combatStyle]?.tier || 1}차 계열
                                                    </span>
                                                )}
                                            </label>
                                            <select 
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:border-red-500 outline-none text-red-200 font-medium"
                                                value={currentTarget?.combatStyle || ''} 
                                                onChange={e => {
                                                    const val = e.target.value ? e.target.value as CombatStyle : undefined;
                                                    updateTarget('combatStyle', val);
                                                    if (val) {
                                                        const currentUnlocked = currentTarget?.unlockedCombatStyles || [];
                                                        if (!currentUnlocked.includes(val)) {
                                                            updateTarget('unlockedCombatStyles', [...currentUnlocked, val]);
                                                        }
                                                    }
                                                }}
                                            >
                                                <option value="">없음 (None)</option>
                                                {Object.values(CombatStyle).map(style => {
                                                    const cfg = COMBAT_STYLE_CONFIG[style];
                                                    return (
                                                        <option key={style} value={style}>
                                                            [{cfg?.tier || 1}차] {style} ({cfg?.specialtyText || ''})
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 uppercase font-semibold block mb-1 flex items-center justify-between">
                                                <span>수련 목표 전투계열 (Target Style)</span>
                                                {currentTarget?.targetCombatStyle && (
                                                    <span className="text-[10px] text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-800/60">
                                                        {COMBAT_STYLE_CONFIG[currentTarget.targetCombatStyle]?.tier || 1}차 목표
                                                    </span>
                                                )}
                                            </label>
                                            <select 
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:border-amber-500 outline-none text-amber-200 font-medium"
                                                value={currentTarget?.targetCombatStyle || ''} 
                                                onChange={e => updateTarget('targetCombatStyle', e.target.value ? e.target.value as CombatStyle : undefined)}
                                            >
                                                <option value="">없음 (None)</option>
                                                {Object.values(CombatStyle).map(style => {
                                                    const cfg = COMBAT_STYLE_CONFIG[style];
                                                    return (
                                                        <option key={style} value={style}>
                                                            [{cfg?.tier || 1}차] {style} ({cfg?.specialtyText || ''})
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Unlocked Styles Manager */}
                                    <div className="mt-4 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-3">
                                        {/* Batch Buttons */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                                                <Unlock size={14} className="text-red-400" />
                                                계열별 일괄 해금 / 초기화
                                            </span>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        updateTarget('unlockedCombatStyles', Object.values(CombatStyle));
                                                    }}
                                                    className="text-[10px] bg-red-950/60 hover:bg-red-900/80 text-red-300 px-2.5 py-1 rounded border border-red-700/60 font-semibold transition shadow-sm"
                                                >
                                                    전체 해금 (106개)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const tier1Styles = Object.values(CombatStyle).filter(s => (COMBAT_STYLE_CONFIG[s]?.tier || 1) === 1);
                                                        const cur = new Set(currentTarget?.unlockedCombatStyles || []);
                                                        tier1Styles.forEach(s => cur.add(s));
                                                        updateTarget('unlockedCombatStyles', Array.from(cur));
                                                    }}
                                                    className="text-[10px] bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 px-2.5 py-1 rounded border border-emerald-700/60 font-semibold transition"
                                                >
                                                    +1차(9개) 해금
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const tier2Styles = Object.values(CombatStyle).filter(s => (COMBAT_STYLE_CONFIG[s]?.tier || 1) === 2);
                                                        const cur = new Set(currentTarget?.unlockedCombatStyles || []);
                                                        tier2Styles.forEach(s => cur.add(s));
                                                        updateTarget('unlockedCombatStyles', Array.from(cur));
                                                    }}
                                                    className="text-[10px] bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 px-2.5 py-1 rounded border border-blue-700/60 font-semibold transition"
                                                >
                                                    +2차(22개) 해금
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const tier3Styles = Object.values(CombatStyle).filter(s => (COMBAT_STYLE_CONFIG[s]?.tier || 1) === 3);
                                                        const cur = new Set(currentTarget?.unlockedCombatStyles || []);
                                                        tier3Styles.forEach(s => cur.add(s));
                                                        updateTarget('unlockedCombatStyles', Array.from(cur));
                                                    }}
                                                    className="text-[10px] bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 px-2.5 py-1 rounded border border-purple-700/60 font-semibold transition"
                                                >
                                                    +3차(34개) 해금
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const tier4Styles = Object.values(CombatStyle).filter(s => (COMBAT_STYLE_CONFIG[s]?.tier || 1) === 4);
                                                        const cur = new Set(currentTarget?.unlockedCombatStyles || []);
                                                        tier4Styles.forEach(s => cur.add(s));
                                                        updateTarget('unlockedCombatStyles', Array.from(cur));
                                                    }}
                                                    className="text-[10px] bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 px-2.5 py-1 rounded border border-amber-700/60 font-semibold transition"
                                                >
                                                    +4차(41개) 해금
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        updateTarget('unlockedCombatStyles', []);
                                                    }}
                                                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded border border-slate-700 transition"
                                                >
                                                    전체 잠금/초기화
                                                </button>
                                            </div>
                                        </div>

                                        {/* Filters & Search */}
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                                            {/* Search */}
                                            <div className="relative flex-1">
                                                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                                <input 
                                                    type="text"
                                                    placeholder="계열명, 특화 무기 검색..."
                                                    value={combatStyleSearch}
                                                    onChange={e => setCombatStyleSearch(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-red-500 outline-none"
                                                />
                                                {combatStyleSearch && (
                                                    <button 
                                                        onClick={() => setCombatStyleSearch('')}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>

                                            {/* Tier Filter Tabs */}
                                            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 shrink-0">
                                                {(['ALL', 1, 2, 3, 4, 'UNLOCKED', 'LOCKED'] as const).map(tab => {
                                                    const label = 
                                                        tab === 'ALL' ? '전체' :
                                                        tab === 1 ? '1차' :
                                                        tab === 2 ? '2차' :
                                                        tab === 3 ? '3차' :
                                                        tab === 4 ? '4차' :
                                                        tab === 'UNLOCKED' ? '해금됨' : '미해금';
                                                    const isActive = combatStyleTierFilter === tab;
                                                    return (
                                                        <button
                                                            key={tab}
                                                            type="button"
                                                            onClick={() => setCombatStyleTierFilter(tab)}
                                                            className={`px-2 py-1 rounded text-[10px] font-semibold transition shrink-0 ${
                                                                isActive 
                                                                    ? 'bg-red-600 text-white shadow' 
                                                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                                            }`}
                                                        >
                                                            {label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Style Items Grid */}
                                        {(() => {
                                            const unlockedList = currentTarget?.unlockedCombatStyles || [];
                                            const allStyles = Object.values(CombatStyle);
                                            const filtered = allStyles.filter(style => {
                                                const cfg = COMBAT_STYLE_CONFIG[style];
                                                const tier = cfg?.tier || 1;
                                                const isUnlocked = unlockedList.includes(style);

                                                if (combatStyleTierFilter === 'UNLOCKED' && !isUnlocked) return false;
                                                if (combatStyleTierFilter === 'LOCKED' && isUnlocked) return false;
                                                if (typeof combatStyleTierFilter === 'number' && tier !== combatStyleTierFilter) return false;

                                                if (combatStyleSearch.trim()) {
                                                    const q = combatStyleSearch.toLowerCase();
                                                    const matchName = style.toLowerCase().includes(q);
                                                    const matchLabel = (cfg?.label || '').toLowerCase().includes(q);
                                                    const matchSpec = (cfg?.specialtyText || '').toLowerCase().includes(q);
                                                    if (!matchName && !matchLabel && !matchSpec) return false;
                                                }
                                                return true;
                                            });

                                            if (filtered.length === 0) {
                                                return (
                                                    <div className="text-center py-8 text-slate-500 text-xs">
                                                        조건에 일치하는 전투 계열이 없습니다.
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1">
                                                    {filtered.map(style => {
                                                        const isUnlocked = unlockedList.includes(style);
                                                        const isCurrent = currentTarget?.combatStyle === style;
                                                        const isTarget = currentTarget?.targetCombatStyle === style;
                                                        const cfg = COMBAT_STYLE_CONFIG[style];
                                                        const tier = cfg?.tier || 1;

                                                        const tierBadgeClass = 
                                                            tier === 1 ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-400' :
                                                            tier === 2 ? 'bg-blue-950/80 border-blue-600/60 text-blue-400' :
                                                            tier === 3 ? 'bg-purple-950/80 border-purple-600/60 text-purple-400' :
                                                            'bg-amber-950/80 border-amber-600/60 text-amber-400';

                                                        return (
                                                            <div 
                                                                key={style}
                                                                className={`flex flex-col justify-between p-2 rounded-lg border transition ${
                                                                    isUnlocked 
                                                                        ? 'bg-slate-900/90 border-red-900/50 shadow-sm' 
                                                                        : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:border-slate-700'
                                                                }`}
                                                            >
                                                                <div className="flex items-start justify-between gap-1.5">
                                                                    <label className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0">
                                                                        <input 
                                                                            type="checkbox"
                                                                            checked={isUnlocked}
                                                                            onChange={e => {
                                                                                let newList = [...unlockedList];
                                                                                if (e.target.checked) {
                                                                                    if (!newList.includes(style)) newList.push(style);
                                                                                } else {
                                                                                    newList = newList.filter(item => item !== style);
                                                                                }
                                                                                updateTarget('unlockedCombatStyles', newList);
                                                                            }}
                                                                            className="w-4 h-4 accent-red-500 rounded cursor-pointer shrink-0"
                                                                        />
                                                                        <span className={`text-xs font-bold truncate ${isUnlocked ? 'text-slate-100' : 'text-slate-400'}`}>
                                                                            {style}
                                                                        </span>
                                                                    </label>
                                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono font-bold shrink-0 ${tierBadgeClass}`}>
                                                                        {tier}차
                                                                    </span>
                                                                </div>

                                                                {/* Specialty & badges */}
                                                                <div className="mt-1.5 pl-6 flex flex-wrap items-center gap-1">
                                                                    {cfg?.specialtyText && (
                                                                        <span className="text-[10px] text-slate-400 truncate block">
                                                                            {cfg.specialtyText}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="mt-2 pl-6 flex items-center justify-between gap-1 text-[10px]">
                                                                    <div className="flex items-center gap-1 flex-wrap">
                                                                        {isCurrent && (
                                                                            <span className="px-1.5 py-0.5 bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-bold rounded">
                                                                                장착중
                                                                            </span>
                                                                        )}
                                                                        {isTarget && (
                                                                            <span className="px-1.5 py-0.5 bg-amber-950/80 border border-amber-500/60 text-amber-300 font-bold rounded">
                                                                                목표
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex items-center gap-1 ml-auto">
                                                                        {!isCurrent && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    updateTarget('combatStyle', style);
                                                                                    if (!isUnlocked) {
                                                                                        updateTarget('unlockedCombatStyles', [...unlockedList, style]);
                                                                                    }
                                                                                }}
                                                                                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-medium transition"
                                                                            >
                                                                                즉시장착
                                                                            </button>
                                                                        )}
                                                                        {!isTarget && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => updateTarget('targetCombatStyle', style)}
                                                                                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 font-medium transition"
                                                                            >
                                                                                목표지정
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                                
                                {/* Class Details */}
                                <h3 className="font-bold border-b border-slate-700 pb-2 text-slate-400 text-sm uppercase mt-6">Class Descriptions</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                        <label className="text-xs text-slate-500 uppercase block mb-1">1st Class Name</label>
                                        <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none" 
                                            value={currentTarget?.firstClassName || ''} onChange={e => updateTarget('firstClassName', e.target.value)} />
                                        </div>
                                        <div>
                                        <label className="text-xs text-slate-500 uppercase block mb-1">1st Class Desc</label>
                                        <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none" 
                                            value={currentTarget?.firstClassDescription || ''} onChange={e => updateTarget('firstClassDescription', e.target.value)} />
                                        </div>
                                        {/* ... Repeat for 2nd, Last, Final */}
                                        <div>
                                        <label className="text-xs text-slate-500 uppercase block mb-1">2nd Class Name</label>
                                        <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none" 
                                            value={currentTarget?.secondClassName || ''} onChange={e => updateTarget('secondClassName', e.target.value)} />
                                        </div>
                                        <div>
                                        <label className="text-xs text-slate-500 uppercase block mb-1">2nd Class Desc</label>
                                        <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none" 
                                            value={currentTarget?.secondClassDescription || ''} onChange={e => updateTarget('secondClassDescription', e.target.value)} />
                                        </div>
                                        <div>
                                        <label className="text-xs text-slate-500 uppercase block mb-1">Last Class Name</label>
                                        <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none" 
                                            value={currentTarget?.lastClassName || ''} onChange={e => updateTarget('lastClassName', e.target.value)} />
                                        </div>
                                        <div>
                                        <label className="text-xs text-slate-500 uppercase block mb-1">Last Class Desc</label>
                                        <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none" 
                                            value={currentTarget?.lastClassDescription || ''} onChange={e => updateTarget('lastClassDescription', e.target.value)} />
                                        </div>
                                        <div>
                                        <label className="text-xs text-slate-500 uppercase block mb-1">Final Class Name</label>
                                        <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none" 
                                            value={currentTarget?.finalClassName || ''} onChange={e => updateTarget('finalClassName', e.target.value)} />
                                        </div>
                                        <div>
                                        <label className="text-xs text-slate-500 uppercase block mb-1">Final Class Desc</label>
                                        <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none" 
                                            value={currentTarget?.finalClassDescription || ''} onChange={e => updateTarget('finalClassDescription', e.target.value)} />
                                        </div>
                                </div>
                                
                                {/* Stats */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700 pb-2 mt-6">
                                    <h3 className="font-bold text-slate-400 text-sm uppercase">Stats</h3>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => setAllStatsValue(99999)}
                                            className="text-[11px] bg-red-950/60 hover:bg-red-900 text-red-300 px-2.5 py-1 rounded border border-red-700/60 font-bold transition flex items-center gap-1"
                                        >
                                            <Sparkles size={11}/> All 99,999
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAllStatsValue(10000)}
                                            className="text-[11px] bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 px-2 py-1 rounded border border-indigo-700/60 font-medium transition"
                                        >
                                            All 10,000
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAllStatsValue(1000)}
                                            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-600 font-medium transition"
                                        >
                                            All 1,000
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {currentTarget?.stats && Object.entries(currentTarget.stats).map(([key, val]) => (
                                            <div key={key}>
                                                <label className="text-[10px] text-slate-500 uppercase">{key}</label>
                                                <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm focus:border-red-500 outline-none font-mono" 
                                                    value={val as number} onChange={e => updateStats(key, parseInt(e.target.value))} />
                                            </div>
                                        ))}
                                </div>

                                {/* [NEW] Profession Mastery (전문기술 숙련도) Editor */}
                                <div className="mt-6 bg-slate-900/80 p-4 rounded-lg border border-slate-700">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700 pb-3 mb-4">
                                        <div className="flex items-center space-x-2">
                                            <Briefcase size={16} className="text-emerald-400"/>
                                            <h3 className="font-bold text-white text-sm uppercase">Profession Mastery (전문기술 숙련도)</h3>
                                            <span className="text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">8종 전문기술</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <button
                                                type="button"
                                                onClick={() => setAllProfessionsLevel(100)}
                                                className="text-[11px] bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 px-2.5 py-1 rounded border border-emerald-700/60 font-bold transition flex items-center gap-1"
                                            >
                                                <Sparkles size={11}/> All Lv.100 (MAX)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAllProfessionsLevel(50)}
                                                className="text-[11px] bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 px-2 py-1 rounded border border-indigo-700/60 font-medium transition"
                                            >
                                                All Lv.50
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAllProfessionsLevel(1)}
                                                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-600 font-medium transition flex items-center gap-1"
                                            >
                                                <RefreshCw size={10}/> 초기화 (Lv.1)
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                        {DEV_PROFESSIONS.map(prof => {
                                            const IconComp = prof.icon;
                                            const profData = (currentTarget as any)?.professions?.[prof.key] || { level: 1, exp: 0, maxExp: 100 };
                                            return (
                                                <div key={prof.key} className={`p-3 rounded-lg border ${prof.border} ${prof.bg} flex flex-col justify-between space-y-2`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-1.5">
                                                            <IconComp size={15} className={prof.color}/>
                                                            <span className="text-xs font-bold text-slate-200">{prof.name}</span>
                                                        </div>
                                                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-700 ${prof.color}`}>
                                                            Lv.{profData.level || 1}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-1.5 text-xs">
                                                        <div>
                                                            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                                                                <span>Level (레벨)</span>
                                                                <div className="flex gap-1">
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => updateProfession(prof.key, 'level', (profData.level || 1) + 10)}
                                                                        className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1 py-0.2 rounded border border-slate-600"
                                                                    >
                                                                        +10
                                                                    </button>
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => updateProfession(prof.key, 'level', 100)}
                                                                        className="text-[9px] bg-emerald-900/70 hover:bg-emerald-800 text-emerald-300 px-1 py-0.2 rounded border border-emerald-700"
                                                                    >
                                                                        MAX
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <input 
                                                                type="number"
                                                                min="1"
                                                                max="999"
                                                                className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white font-mono focus:border-emerald-500 outline-none"
                                                                value={profData.level || 1}
                                                                onChange={e => updateProfession(prof.key, 'level', parseInt(e.target.value) || 1)}
                                                            />
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-1.5">
                                                            <div>
                                                                <label className="text-[10px] text-slate-400 block mb-0.5">EXP</label>
                                                                <input 
                                                                    type="number"
                                                                    min="0"
                                                                    className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-slate-300 font-mono focus:border-emerald-500 outline-none"
                                                                    value={profData.exp || 0}
                                                                    onChange={e => updateProfession(prof.key, 'exp', parseInt(e.target.value) || 0)}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] text-slate-400 block mb-0.5">Max EXP</label>
                                                                <input 
                                                                    type="number"
                                                                    min="1"
                                                                    className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-slate-300 font-mono focus:border-emerald-500 outline-none"
                                                                    value={profData.maxExp || 100}
                                                                    onChange={e => updateProfession(prof.key, 'maxExp', parseInt(e.target.value) || 100)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Weapon Mastery Editor */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700 pb-2 mt-6">
                                    <h3 className="font-bold text-slate-400 text-sm uppercase flex items-center">
                                        <Sword size={14} className="mr-2"/> Weapon Mastery
                                    </h3>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => setAllWeaponMasteryLevel(100)}
                                            className="text-[11px] bg-red-950/60 hover:bg-red-900 text-red-300 px-2.5 py-1 rounded border border-red-700/60 font-bold transition flex items-center gap-1"
                                        >
                                            <Sparkles size={11}/> All Lv.100 (MAX)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAllWeaponMasteryLevel(50)}
                                            className="text-[11px] bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 px-2 py-1 rounded border border-indigo-700/60 font-medium transition"
                                        >
                                            All Lv.50
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAllWeaponMasteryLevel(0)}
                                            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-600 font-medium transition flex items-center gap-1"
                                        >
                                            <RefreshCw size={10}/> 초기화 (Lv.0)
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2 bg-slate-900 p-2 rounded">
                                    {Object.keys(WEAPON_MASTERY_CONFIG).map(cat => (
                                        // Flatten types
                                        WEAPON_MASTERY_CONFIG[cat as any].types.map((type: string) => {
                                            const mastery = currentTarget?.weaponMastery?.[type as WeaponType];
                                            return (
                                                <div key={type} className="flex flex-col bg-slate-800 p-2 rounded border border-slate-700">
                                                    <span className="text-[10px] text-slate-400 mb-1">{type}</span>
                                                    <input 
                                                        type="number" 
                                                        className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-xs text-amber-300 focus:border-red-500 outline-none"
                                                        value={mastery?.level || 0}
                                                        onChange={(e) => updateMastery(type as WeaponType, parseInt(e.target.value))}
                                                        min={0}
                                                        max={100}
                                                    />
                                                </div>
                                            );
                                        })
                                    ))}
                                </div>

                                {/* Skills & Inventory */}
                                <div className="flex justify-between items-center border-b border-slate-700 pb-2 mt-6">
                                    <h3 className="font-bold text-slate-400 text-sm uppercase flex items-center">
                                    <Zap size={14} className="mr-2"/> Skills
                                    </h3>
                                    <button onClick={addSkill} className="text-xs bg-indigo-900/50 text-indigo-300 px-3 py-1 rounded border border-indigo-700/50">Add</button>
                                </div>
                                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2">
                                    {currentTarget?.skills && currentTarget.skills.map((skill: Skill, idx: number) => (
                                        <div key={idx} className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                                            <span className="text-xs truncate w-32">{skill.name}</span>
                                            <span className="text-[10px] text-slate-500">{skill.tier}</span>
                                            <div className="flex space-x-1">
                                                <button onClick={() => openSkillEditor(skill, idx)} className="text-amber-500 p-1 hover:text-amber-300">
                                                    <Edit size={12}/>
                                                </button>
                                                <button onClick={() => removeSkill(idx)} className="text-red-500 p-1 hover:text-red-300">
                                                    <Trash size={12}/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="flex justify-between items-center border-b border-slate-700 pb-2 mt-6">
                                    <h3 className="font-bold text-slate-400 text-sm uppercase flex items-center">
                                    <Package size={14} className="mr-2"/> Inventory
                                    </h3>
                                    <div className="flex gap-2 flex-wrap">
                                        <button onClick={addItem} className="text-xs bg-indigo-900/50 text-indigo-300 px-3 py-1 rounded border border-indigo-700/50">Add Cheat Item</button>
                                        <button onClick={addPrimordialLightSet} className="text-xs bg-amber-900/50 text-amber-300 px-3 py-1 rounded border border-amber-700/50 flex items-center">
                                            <Sparkles size={12} className="mr-1"/> 태초의 빛 100개
                                        </button>
                                        <button onClick={addMoonlightShardSet} className="text-xs bg-red-900/50 text-red-300 px-3 py-1 rounded border border-red-700/50 flex items-center">
                                            <Moon size={12} className="mr-1"/> 철혈왕 조각 10개
                                        </button>
                                        <button onClick={addFragmentOfTheEndSet} className="text-xs bg-purple-900/50 text-purple-300 px-3 py-1 rounded border border-purple-700/50 flex items-center">
                                            <Sparkles size={12} className="mr-1"/> 종말의 파편 100개
                                        </button>
                                        {targetType === 'player' && (
                                            <button onClick={addMonsterEgg} className="text-xs bg-amber-900/50 text-amber-300 px-3 py-1 rounded border border-amber-700/50 flex items-center">
                                                <Egg size={12} className="mr-1"/> Add Egg
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2">
                                    {currentTarget?.inventory && currentTarget.inventory.map((item: Item, idx: number) => (
                                        <div key={idx} className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center">
                                            <span className="text-xs truncate w-32">{item.name}</span>
                                            <span className="text-[10px] text-slate-500">{item.rarity}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                      </>
                  )}
              </div>
              
              {/* Footer Actions */}
              <div className="p-5 bg-slate-950 border-t border-red-900/30 shrink-0 flex justify-between items-center z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                   <div className="text-[10px] font-mono text-red-500/50 flex items-center gap-2">
                      <ShieldAlert size={14} /> WARNING: SYSTEM OVERRIDE ACTIVE
                   </div>
                   <div className="flex space-x-3">
                       <button onClick={onClose} className="px-5 py-2.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl font-bold text-sm transition-colors">
                           취소
                       </button>
                       <button onClick={handleSave} className="px-8 py-2.5 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white rounded-xl font-black text-sm shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center transition-all hover:scale-105 active:scale-95">
                           <Save size={18} className="mr-2"/> 강제 적용
                       </button>
                   </div>
              </div>

              {/* Skill Editor Modal Overlay */}
              {editingSkill && (
                  <div className="absolute inset-0 z-[70] bg-black/80 flex items-center justify-center p-4">
                      <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
                          <h3 className="text-lg font-bold text-slate-200 mb-4">Edit Skill</h3>
                          <div className="space-y-3">
                              <div>
                                  <label className="text-xs text-slate-400 block mb-1">Name</label>
                                  <input className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200" 
                                      value={editingSkill.name} onChange={e => setEditingSkill({...editingSkill, name: e.target.value})} />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                  <div>
                                      <label className="text-xs text-slate-400 block mb-1">Type</label>
                                      <select className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-300"
                                          value={editingSkill.type} onChange={e => setEditingSkill({...editingSkill, type: e.target.value as SkillType})}>
                                          {Object.values(SkillType).map(t => <option key={t} value={t}>{t}</option>)}
                                      </select>
                                  </div>
                                  <div>
                                      <label className="text-xs text-slate-400 block mb-1">Class Tier</label>
                                      <select className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-300"
                                          value={editingSkill.tier || ClassTier.FIRST} onChange={e => setEditingSkill({...editingSkill, tier: e.target.value as ClassTier})}>
                                          {Object.values(ClassTier).filter(t => t !== ClassTier.NONE).map(t => <option key={t} value={t}>{t}</option>)}
                                      </select>
                                  </div>
                              </div>
                              <div>
                                  <label className="text-xs text-slate-400 block mb-1">Target</label>
                                  <select className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-300"
                                      value={editingSkill.targetType || 'single'} onChange={e => setEditingSkill({...editingSkill, targetType: e.target.value as SkillTarget})}>
                                      <option value="single">Single</option>
                                      <option value="aoe">AOE</option>
                                      <option value="ally">Ally</option>
                                      <option value="self">Self</option>
                                  </select>
                              </div>
                              
                              {(editingSkill.type === SkillType.PHYSICAL || editingSkill.type === SkillType.MAGIC) && (
                                  <div>
                                      <label className="text-xs text-purple-400 block mb-1">Status Ailment (Tag)</label>
                                      <select className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-300"
                                          value={editingSkillAilment} onChange={e => setEditingSkillAilment(e.target.value)}>
                                          <option value="">(None)</option>
                                          {STATUS_AILMENTS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                  </div>
                              )}

                              <div>
                                  <label className="text-xs text-slate-400 block mb-1">Description</label>
                                  <input className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200" 
                                      value={editingSkill.description} onChange={e => setEditingSkill({...editingSkill, description: e.target.value})} />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                  <div>
                                      <label className="text-xs text-slate-400 block mb-1">Level</label>
                                      <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200" 
                                          value={editingSkill.level} onChange={e => setEditingSkill({...editingSkill, level: parseInt(e.target.value)})} />
                                  </div>
                                  <div>
                                      <label className="text-xs text-slate-400 block mb-1">Max Level</label>
                                      <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200" 
                                          value={editingSkill.maxLevel || 10} onChange={e => setEditingSkill({...editingSkill, maxLevel: parseInt(e.target.value)})} />
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                  <div>
                                      <label className="text-xs text-slate-400 block mb-1">MP Cost</label>
                                      <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200" 
                                          value={editingSkill.mpCost || 0} onChange={e => setEditingSkill({...editingSkill!, mpCost: parseInt(e.target.value)})} />
                                  </div>
                                  <div>
                                      <label className="text-xs text-slate-400 block mb-1">Power Ratio (%)</label>
                                      <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200" 
                                          value={editingSkill.powerRatio || 100} onChange={e => setEditingSkill({...editingSkill!, powerRatio: parseInt(e.target.value)})} />
                                  </div>
                              </div>
                              
                              <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-slate-700">
                                  <button onClick={() => { setEditingSkill(null); setEditingSkillIndex(null); }} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm transition-colors">Cancel</button>
                                  <button onClick={saveEditedSkill} className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded text-sm font-bold transition-colors">Save Skill</button>
                              </div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </div>
  );
};

export default DevTools;
