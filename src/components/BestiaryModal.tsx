import React, { useState, useMemo } from 'react';
import { Character, BestiaryEntry, ItemRarity, Enemy, SkillType, Stats } from '../types';
import { X, Skull, Eye, Info, Sword, Shield, Zap, Search, BookOpen, Target, Sparkles, ChevronLeft, ChevronRight, Lock, AlertCircle, Package, Crown, Star, Flame, Trophy, Coins, Brain, Heart, Activity, Check, MapPin } from 'lucide-react';
import { WORLD_LOOT_TABLES } from '../monsterLootTable';
import { BASE_MONSTERS, WORLD_GEOGRAPHY } from '../constants';
import { NATION_THEMES, HUNT_LEVEL_BANDS, DIVINE_HUNT_LEVEL_BANDS, MAGYE_HUNT_LEVEL_BANDS, isDivineLocation, isMagyeLocation, getMonsterInfo } from '../monsterfield';
import { generateEnemyStats } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    DETAILED_BOSSES, 
    EUROPE_BOSSES, 
    AMERICA_BOSSES, 
    ASIA_BOSSES, 
    AFRICA_BOSSES, 
    FANTASY_BOSSES, 
    DIVINE_REALM_BOSSES, 
    SEASONAL_BOSSES,
    SEASONAL_BOSS_CONFIG,
    isMythicSeasonalBoss
} from '../bossMonsters';
import { getRegisteredBossVisual } from '../services/visualRegistry';
import { FastImage } from './common/FastImage';

interface Props {
    character: Character;
    onClose: () => void;
}

// 아이템 등급별 세부 테마 설정
const LOOT_RARITY_THEMES: Record<string, { border: string; bg: string; text: string; glow: string; label: string }> = {
    MYTHTIC: {
        border: 'border-red-500/40 hover:border-red-400/70',
        bg: 'bg-red-950/20',
        text: 'text-red-400',
        glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]',
        label: '신화'
    },
    LEGENDARY: {
        border: 'border-amber-500/40 hover:border-amber-400/70',
        bg: 'bg-amber-950/20',
        text: 'text-amber-400',
        glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
        label: '전설'
    },
    UNIQUE: {
        border: 'border-orange-500/40 hover:border-orange-400/70',
        bg: 'bg-orange-950/20',
        text: 'text-orange-400',
        glow: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]',
        label: '유니크'
    },
    EPIC: {
        border: 'border-purple-500/40 hover:border-purple-400/70',
        bg: 'bg-purple-950/20',
        text: 'text-purple-400',
        glow: 'shadow-[0_0_15px_rgba(168,85,247,0.2)]',
        label: '에픽'
    },
    RARE: {
        border: 'border-blue-500/40 hover:border-blue-400/70',
        bg: 'bg-blue-950/20',
        text: 'text-blue-400',
        glow: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]',
        label: '레어'
    },
    MAGIC: {
        border: 'border-emerald-500/40 hover:border-emerald-400/70',
        bg: 'bg-emerald-950/20',
        text: 'text-emerald-400',
        glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
        label: '마법'
    },
    NORMAL: {
        border: 'border-slate-800 hover:border-slate-700',
        bg: 'bg-slate-900/40',
        text: 'text-slate-300',
        glow: '',
        label: '일반'
    }
};

const WEAPON_TYPE_KOREAN: Record<string, string> = {
    Sword: '검',
    Dagger: '단검',
    Staff: '지팡이',
    Bow: '활',
    Blunt: '둔기',
    Spear: '창',
    Wand: '완드',
    Axe: '도끼',
    Knuckle: '너클',
    Gun: '총'
};

const getRarityTheme = (rarity: string = '') => {
    if (!rarity) return LOOT_RARITY_THEMES.NORMAL;
    
    const key = rarity.trim();
    const rarityMap: Record<string, string> = {
        '노말': 'NORMAL',
        '노멀': 'NORMAL',
        'NORMAL': 'NORMAL',
        
        '마법': 'MAGIC',
        '매직': 'MAGIC',
        'MAGIC': 'MAGIC',
        
        '레어': 'RARE',
        'RARE': 'RARE',
        
        '에픽': 'EPIC',
        'EPIC': 'EPIC',
        
        '유니크': 'UNIQUE',
        'UNIQUE': 'UNIQUE',
        
        '전설': 'LEGENDARY',
        'LEGENDARY': 'LEGENDARY',
        
        '신화': 'MYTHTIC',
        'MYTHTIC': 'MYTHTIC',
        'MYTHIC': 'MYTHTIC'
    };
    
    const mappedKey = rarityMap[key] || rarityMap[key.toUpperCase()] || 'NORMAL';
    return LOOT_RARITY_THEMES[mappedKey] || LOOT_RARITY_THEMES.NORMAL;
};

// 속성(신력) 테마 색상 설정
const SHINRYOKU_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    "태양계": { bg: "bg-amber-950/40", text: "text-amber-400", border: "border-amber-500/30", glow: "from-amber-500/20 via-amber-600/5 to-transparent" },
    "월광계": { bg: "bg-indigo-950/40", text: "text-indigo-300", border: "border-indigo-500/30", glow: "from-indigo-500/20 via-indigo-600/5 to-transparent" },
    "광휘계": { bg: "bg-yellow-950/40", text: "text-yellow-300", border: "border-yellow-500/30", glow: "from-yellow-400/20 via-yellow-500/5 to-transparent" },
    "화염계": { bg: "bg-red-950/40", text: "text-red-400", border: "border-red-500/30", glow: "from-red-500/20 via-red-600/5 to-transparent" },
    "빙결계": { bg: "bg-cyan-950/40", text: "text-cyan-300", border: "border-cyan-500/30", glow: "from-cyan-400/20 via-cyan-500/5 to-transparent" },
    "전격계": { bg: "bg-purple-950/40", text: "text-purple-300", border: "border-purple-500/30", glow: "from-purple-500/20 via-purple-600/5 to-transparent" },
    "초화계": { bg: "bg-emerald-950/40", text: "text-emerald-300", border: "border-emerald-500/30", glow: "from-emerald-400/20 via-emerald-500/5 to-transparent" },
    "질풍계": { bg: "bg-teal-950/40", text: "text-teal-300", border: "border-teal-500/30", glow: "from-teal-400/20 via-teal-500/5 to-transparent" },
    "대지계": { bg: "bg-orange-950/40", text: "text-orange-300", border: "border-orange-500/30", glow: "from-orange-500/20 via-orange-600/5 to-transparent" },
    "암흑계": { bg: "bg-violet-950/40", text: "text-violet-400", border: "border-violet-500/30", glow: "from-violet-500/20 via-violet-600/5 to-transparent" },
    "해수계": { bg: "bg-blue-950/40", text: "text-blue-300", border: "border-blue-500/30", glow: "from-blue-500/20 via-blue-600/5 to-transparent" }
};

const getShinryokuColor = (type: string = '') => {
    return SHINRYOKU_COLORS[type] || { bg: "bg-slate-950/40", text: "text-slate-400", border: "border-slate-800", glow: "from-slate-500/5 to-transparent" };
};

// 대륙 판정 헬퍼
const getContinentForNation = (nation: string = ''): string => {
    if (!nation) return '전역';
    for (const [continent, nations] of Object.entries(WORLD_GEOGRAPHY)) {
        if (nations && nations[nation]) {
            return continent;
        }
    }
    if (nation.includes('신계') || nation.includes('성소') || nation.includes('성전') || nation.includes('무의 궁') || nation.includes('신화')) return '신계';
    if (nation.includes('마계') || nation.includes('임페리얼')) return '마계';
    if (nation.includes('실바나르') || nation.includes('미르탈')) return '실바나르';
    if (nation.includes('페랄디아') || nation.includes('레오니스')) return '페랄디아';
    if (nation.includes('아비살론') || nation.includes('네크로디움')) return '아비살론';
    if (nation.includes('아시아') || nation.includes('동양')) return '아시아';
    if (nation.includes('유럽') || nation.includes('서양')) return '유럽';
    if (nation.includes('아메리카')) return '북아메리카';
    if (nation.includes('아프리카')) return '아프리카';
    return '기타 대륙';
};

// 대륙별 정렬 순서
const CONTINENT_ORDER: Record<string, number> = {
    '아시아': 1,
    '유럽': 2,
    '북아메리카': 3,
    '남아메리카': 4,
    '오세아니아': 5,
    '아프리카': 6,
    '마계': 7,
    '신계': 8,
    '실바나르': 9,
    '페랄디아': 10,
    '아비살론': 11,
    '전역': 12,
    '기타 대륙': 13
};

type SortOption = 'name_asc' | 'name_desc' | 'continent' | 'nation' | 'boss_type' | 'level_desc' | 'level_asc' | 'defeated_desc';
type TabOption = 'all' | 'normal' | 'boss_all' | 'boss_season' | 'boss_region';

const BestiaryModal: React.FC<Props> = ({ character, onClose }) => {
    const [selectedName, setSelectedName] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [activeTab, setActiveTab] = useState<TabOption>('all');
    const [sortBy, setSortBy] = useState<SortOption>('name_asc');
    const [activeLootTooltip, setActiveLootTooltip] = useState<string | null>(null);

    const bestiaryData = character.bestiary || {};

    // 모든 보스 데이터를 평탄화하여 맵으로 관리 (이름 기준 검색용 및 국가/도시/대륙/시즌 여부 부여)
    const bossMap = useMemo(() => {
        const map: Record<string, any> = {};
        
        // 국가 -> 도시 2단계 계층 구조 보스 처리
        const processRegionalSource = (source: any, defaultContinent?: string) => {
            if (!source) return;
            Object.entries(source).forEach(([nation, cities]: [string, any]) => {
                if (!cities || typeof cities !== 'object') return;
                Object.entries(cities).forEach(([city, bossData]: [string, any]) => {
                    if (bossData && bossData.name) {
                        const isSeasonal = isMythicSeasonalBoss(bossData);
                        const continent = defaultContinent || getContinentForNation(nation);
                        const regVisual = getRegisteredBossVisual(bossData.name) || getRegisteredBossVisual(bossData.id);
                        map[bossData.name] = {
                            ...bossData,
                            visualUrl: regVisual || bossData.visualUrl,
                            nation,
                            city,
                            continent,
                            isSeasonal: Boolean(isSeasonal),
                            locationText: `${continent} · ${nation} · ${city}`
                        };
                    }
                });
            });
        };

        processRegionalSource(DETAILED_BOSSES, '아시아');
        processRegionalSource(EUROPE_BOSSES, '유럽');
        processRegionalSource(AMERICA_BOSSES, '북아메리카');
        processRegionalSource(ASIA_BOSSES, '아시아');
        processRegionalSource(AFRICA_BOSSES, '아프리카');
        processRegionalSource(FANTASY_BOSSES);
        processRegionalSource(DIVINE_REALM_BOSSES, '신계');

        // 시즌 보스 및 신화 보스 위치 정보 매핑 (SEASONAL_BOSS_CONFIG 기반)
        const seasonalLocationMap: Record<string, { nation: string; city: string }> = {};
        if (SEASONAL_BOSS_CONFIG) {
            Object.values(SEASONAL_BOSS_CONFIG).forEach((list: any) => {
                if (Array.isArray(list)) {
                    list.forEach(item => {
                        if (item && item.bossKey) {
                            seasonalLocationMap[item.bossKey] = { nation: item.nation, city: item.city };
                        }
                    });
                }
            });
        }

        if (SEASONAL_BOSSES) {
            Object.entries(SEASONAL_BOSSES).forEach(([bossKey, bossData]: [string, any]) => {
                if (bossData && bossData.name) {
                    const loc = seasonalLocationMap[bossKey];
                    const nation = loc?.nation || map[bossData.name]?.nation || '신화의 영역';
                    const city = loc?.city || map[bossData.name]?.city || '비경';
                    const continent = loc?.nation ? getContinentForNation(loc.nation) : (map[bossData.name]?.continent || '신계');
                    const regVisual = getRegisteredBossVisual(bossData.name) || getRegisteredBossVisual(bossKey) || getRegisteredBossVisual(bossData.id);
                    map[bossData.name] = {
                        ...bossData,
                        visualUrl: regVisual || bossData.visualUrl,
                        nation,
                        city,
                        continent,
                        isSeasonal: true,
                        locationText: loc ? `${continent} · ${nation} · ${city}` : '신계 · 신화의 영역'
                    };
                }
            });
        }

        return map;
    }, []);

    // 일반 몬스터의 필드 정보(레벨 범위, 위험도, 국가, 대륙) 맵핑
    const normalMonsterInfoMap = useMemo(() => {
        const map: Record<string, { range: [number, number]; difficulty: string; nation: string; continent: string; locationText: string }> = {};
        Object.entries(NATION_THEMES).forEach(([nationName, theme]) => {
            if (nationName === 'default') return;
            const continent = getContinentForNation(nationName);
            const isDivine = isDivineLocation(nationName);
            const isMagye = isMagyeLocation(nationName);
            const bands = isDivine ? DIVINE_HUNT_LEVEL_BANDS : (isMagye ? MAGYE_HUNT_LEVEL_BANDS : HUNT_LEVEL_BANDS);
            Object.entries(theme.monsters).forEach(([bandId, names]) => {
                const band = bands.find(b => b.id === bandId) || HUNT_LEVEL_BANDS.find(b => b.id === bandId);
                if (band && Array.isArray(names)) {
                    names.forEach(name => {
                        const mName = typeof name === 'string' ? name : name.name;
                        if (!map[mName] || isDivine || isMagye) {
                            map[mName] = {
                                range: band.levelRange,
                                difficulty: band.difficulty,
                                nation: nationName,
                                continent: continent,
                                locationText: `${continent} · ${nationName}`
                            };
                        }
                    });
                }
            });
        });

        // BASE_MONSTERS 기본 몬스터
        BASE_MONSTERS.forEach(m => {
            if (!map[m.name]) {
                map[m.name] = {
                    range: [1, 20],
                    difficulty: '기초',
                    nation: '야생',
                    continent: '전역',
                    locationText: '전역 · 야생'
                };
            }
        });

        return map;
    }, []);

    // 몬스터 종합 메타데이터 도출 헬퍼
    const getMonsterMeta = (name: string) => {
        const isBoss = !!bossMap[name];
        if (isBoss) {
            const b = bossMap[name];
            return {
                name,
                isBoss: true,
                isSeasonal: Boolean(b.isSeasonal),
                nation: b.nation || '미상',
                city: b.city || '',
                continent: b.continent || getContinentForNation(b.nation || ''),
                locationText: b.locationText || `${b.nation || '미상'}${b.city ? ` · ${b.city}` : ''}`,
                level: b.level || 50,
                difficulty: 'S급 (재앙)',
                defeatedCount: bestiaryData[name]?.defeatedCount || 0
            };
        }
        const n = normalMonsterInfoMap[name];
        const avgLvl = n ? Math.floor((n.range[0] + n.range[1]) / 2) : 10;
        return {
            name,
            isBoss: false,
            isSeasonal: false,
            nation: n?.nation || '야생',
            city: '',
            continent: n?.continent || '전역',
            locationText: n?.locationText || '전역 · 야생',
            level: avgLvl,
            difficulty: n?.difficulty || 'B급 (위험)',
            defeatedCount: bestiaryData[name]?.defeatedCount || 0
        };
    };

    // 1. 공식적으로 정의된 모든 몬스터/보스 명단 생성
    const officialMonsterNames = useMemo(() => {
        const names = new Set<string>();
        
        // 보스 몬스터 추가
        Object.keys(bossMap).forEach(name => names.add(name));
        
        // 상수 정의된 베이스 몬스터
        BASE_MONSTERS.forEach(m => names.add(m.name));
        
        // 지역별 테마에 정의된 몬스터
        Object.values(NATION_THEMES).forEach(theme => {
            Object.values(theme.monsters).forEach(list => {
                if (Array.isArray(list)) list.forEach(name => names.add(typeof name === 'string' ? name : name.name));
            });
        });

        return names;
    }, [bossMap]);

    // 2. 조우한 몬스터 중 공식 명단 및 탭 필터링 + 다각도 정렬 (이름순, 지역순, 대륙순, 보스구분순, 레벨순, 토벌순)
    const encounteredMonsters = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase().trim();
        return Array.from(officialMonsterNames)
            .filter(name => {
                const isKnown = bestiaryData[name]?.encountered;
                if (!isKnown) return false;

                const meta = getMonsterMeta(name);

                // 탭별 필터링
                if (activeTab === 'normal' && meta.isBoss) return false;
                if (activeTab === 'boss_all' && !meta.isBoss) return false;
                if (activeTab === 'boss_season' && (!meta.isBoss || !meta.isSeasonal)) return false;
                if (activeTab === 'boss_region' && (!meta.isBoss || meta.isSeasonal)) return false;

                if (!lowerSearch) return true;

                const matchesName = name.toLowerCase().includes(lowerSearch);
                const matchesLocation = (
                    meta.continent.toLowerCase().includes(lowerSearch) ||
                    meta.nation.toLowerCase().includes(lowerSearch) ||
                    (meta.city && meta.city.toLowerCase().includes(lowerSearch)) ||
                    meta.locationText.toLowerCase().includes(lowerSearch)
                );
                const matchesCategory = (
                    ((lowerSearch === '시즌' || lowerSearch === '시즌보스' || lowerSearch === '시즌 보스') && meta.isSeasonal) ||
                    ((lowerSearch === '지역' || lowerSearch === '지역보스' || lowerSearch === '지역 보스') && (meta.isBoss && !meta.isSeasonal)) ||
                    ((lowerSearch === '보스') && meta.isBoss) ||
                    ((lowerSearch === '일반' || lowerSearch === '마물') && !meta.isBoss)
                );

                return matchesName || matchesLocation || matchesCategory;
            })
            .sort((a, b) => {
                const metaA = getMonsterMeta(a);
                const metaB = getMonsterMeta(b);

                if (sortBy === 'name_asc') {
                    return a.localeCompare(b, 'ko');
                }
                if (sortBy === 'name_desc') {
                    return b.localeCompare(a, 'ko');
                }
                if (sortBy === 'continent') {
                    const orderA = CONTINENT_ORDER[metaA.continent] || 99;
                    const orderB = CONTINENT_ORDER[metaB.continent] || 99;
                    if (orderA !== orderB) return orderA - orderB;
                    if (metaA.nation !== metaB.nation) return metaA.nation.localeCompare(metaB.nation, 'ko');
                    return a.localeCompare(b, 'ko');
                }
                if (sortBy === 'nation') {
                    if (metaA.nation !== metaB.nation) return metaA.nation.localeCompare(metaB.nation, 'ko');
                    return a.localeCompare(b, 'ko');
                }
                if (sortBy === 'boss_type') {
                    const typeScoreA = metaA.isSeasonal ? 1 : (metaA.isBoss ? 2 : 3);
                    const typeScoreB = metaB.isSeasonal ? 1 : (metaB.isBoss ? 2 : 3);
                    if (typeScoreA !== typeScoreB) return typeScoreA - typeScoreB;
                    return a.localeCompare(b, 'ko');
                }
                if (sortBy === 'level_desc') {
                    if (metaB.level !== metaA.level) return metaB.level - metaA.level;
                    return a.localeCompare(b, 'ko');
                }
                if (sortBy === 'level_asc') {
                    if (metaA.level !== metaB.level) return metaA.level - metaB.level;
                    return a.localeCompare(b, 'ko');
                }
                if (sortBy === 'defeated_desc') {
                    if (metaB.defeatedCount !== metaA.defeatedCount) return metaB.defeatedCount - metaA.defeatedCount;
                    return a.localeCompare(b, 'ko');
                }
                return a.localeCompare(b, 'ko');
            });
    }, [bestiaryData, officialMonsterNames, searchTerm, activeTab, sortBy, bossMap, normalMonsterInfoMap]);

    const selectedEntry = selectedName ? bestiaryData[selectedName] : null;
    const isDefeated = selectedEntry && selectedEntry.defeatedCount > 0;
    const selectedBossInfo = selectedName ? bossMap[selectedName] : null;
    const selectedMeta = selectedName ? getMonsterMeta(selectedName) : null;

    // 몬스터 대표 레벨 계산
    const monsterLevel = useMemo(() => {
        if (!selectedName) return 1;
        if (selectedBossInfo) return selectedBossInfo.level;
        const n = normalMonsterInfoMap[selectedName];
        if (n) {
            return Math.floor((n.range[0] + n.range[1]) / 2);
        }
        return 10;
    }, [selectedName, selectedBossInfo, normalMonsterInfoMap]);

    // 몬스터 상세 분석 능력치 계산 (보스는 배율 반영)
    const monsterStats = useMemo(() => {
        if (!selectedName || !isDefeated) return null;
        const rawStats = generateEnemyStats(monsterLevel);
        if (selectedBossInfo) {
            return {
                hp: rawStats.maxHp * 15,
                maxHp: rawStats.maxHp * 15,
                mp: monsterLevel * 2005,
                maxMp: monsterLevel * 2005,
                wis: monsterLevel * 100,
                agi: rawStats.agi,
                str: rawStats.str * 5,
                int: rawStats.int * 5,
                def: rawStats.def * 5,
                ctrl: rawStats.ctrl * 5
            };
        }
        return rawStats;
    }, [selectedName, monsterLevel, selectedBossInfo, isDefeated]);

    // 처치 기대 보상 분석
    const rewardInfo = useMemo(() => {
        if (!selectedName || !isDefeated) return null;
        if (selectedBossInfo) {
            return {
                exp: monsterLevel * 150,
                goldMin: monsterLevel * 180,
                goldMax: monsterLevel * 250,
                grade: '보스 마물 (신화적 존재)'
            };
        }
        return {
            exp: monsterLevel * 25,
            goldMin: monsterLevel * 10,
            goldMax: monsterLevel * 22,
            grade: monsterLevel > 300 ? '재앙급 엘리트' : monsterLevel > 100 ? '경이급 적수' : '일반 마물'
        };
    }, [selectedName, monsterLevel, selectedBossInfo, isDefeated]);

    const handleSelectMonster = (name: string | null) => {
        setSelectedName(name);
        setShowStatsModal(false);
        setActiveLootTooltip(null);
    };

    // 3. 전리품 정보 가져오기 (중복 제거 로직 추가)
    const potentialLoot = useMemo(() => {
        if (!selectedName || !isDefeated) return [];
        const lootMap = new Map<string, any>();
        Object.entries(WORLD_LOOT_TABLES).forEach(([tableKey, table]) => {
            table.forEach(entry => {
                const itemName = entry.item || entry.name;
                const isBoss = !!selectedBossInfo;
                const isCommonBossLoot = isBoss && tableKey === 'boss';

                if (isCommonBossLoot || (entry.droppedBy && entry.droppedBy.some((dn: string) => {
                    const matchesName = selectedName.includes(dn) || dn.includes(selectedName);
                    const matchesBossId = selectedBossInfo && dn === selectedBossInfo.id;
                    return matchesName || matchesBossId;
                }))) {
                    if (!lootMap.has(itemName)) {
                        lootMap.set(itemName, entry);
                    }
                }
            });
        });
        return Array.from(lootMap.values());
    }, [selectedName, isDefeated, selectedBossInfo]);

    // 속성 그라데이션 및 글로우
    const selectedShinryokuType = selectedBossInfo?.shinryokuType || getMonsterInfo(selectedName).shinryokuType || '물리';
    const shinColor = getShinryokuColor(selectedShinryokuType);

    return (
        <>
            <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
                <div className="bg-slate-950 border border-slate-800 w-full max-w-6xl h-[90vh] max-md:h-[95dvh] max-md:max-h-[95dvh] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                    
                    {/* Header */}
                    <div className="p-4 sm:p-5 max-md:p-3.5 border-b border-white/10 bg-slate-950 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="p-2.5 max-md:p-2 bg-red-950/60 rounded-2xl border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                                <Skull size={22} className="text-red-500 max-md:w-5 max-md:h-5 animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-lg max-md:text-base font-bold text-white font-cinzel tracking-wide">몬스터 도감</h2>
                                <p className="text-[10px] max-md:text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                    수집 및 토벌 기록 ({encounteredMonsters.length} / {officialMonsterNames.size})
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-900 transition-all cursor-pointer">
                            <X size={22} />
                        </button>
                    </div>

                    <div className="flex-1 flex overflow-hidden flex-col md:flex-row min-h-0 w-full">
                        {/* Sidebar: Monster List */}
                        <div className={`w-full md:w-80 border-r border-slate-800/80 flex flex-col shrink-0 bg-slate-950 h-full min-h-0 overflow-hidden ${selectedName ? 'hidden md:flex' : 'flex'}`}>
                            {/* Search, Sort & Tabs */}
                            <div className="p-3 sm:p-4 border-b border-slate-800 space-y-2.5 shrink-0 bg-slate-950">
                                {/* Search input & Sort selector in one responsive row */}
                                <div className="flex gap-2 items-center">
                                    <div className="relative flex-1 min-w-0">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input 
                                            type="text"
                                            placeholder="명칭, 지역, 대륙, 시즌 검색..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 pl-9 pr-7 text-xs text-white outline-none focus:border-amber-500/50 focus:bg-slate-900 transition-all placeholder:text-slate-600"
                                        />
                                        {searchTerm && (
                                            <button 
                                                onClick={() => setSearchTerm('')} 
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative shrink-0">
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                                            className="bg-slate-900/90 border border-slate-800 rounded-xl py-2 pl-2.5 pr-7 text-xs text-amber-300 font-bold outline-none focus:border-amber-500/50 cursor-pointer appearance-none shadow-sm"
                                        >
                                            <option value="name_asc">이름순</option>
                                            <option value="name_desc">이름 역순</option>
                                            <option value="continent">대륙별</option>
                                            <option value="nation">국가별</option>
                                            <option value="boss_type">보스 구분순</option>
                                            <option value="level_desc">레벨 높은 순</option>
                                            <option value="level_asc">레벨 낮은 순</option>
                                            <option value="defeated_desc">토벌 많은 순</option>
                                        </select>
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-amber-400 text-[10px]">
                                            ▼
                                        </div>
                                    </div>
                                </div>
                                
                                {/* 5 Category Filter Tabs */}
                                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                                    {[
                                        { id: 'all', label: '전체' },
                                        { id: 'normal', label: '일반 마물' },
                                        { id: 'boss_all', label: '보스 전체' },
                                        { id: 'boss_season', label: '시즌 보스' },
                                        { id: 'boss_region', label: '지역 보스' },
                                    ].map((tab) => {
                                        const isSelected = activeTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as TabOption)}
                                                className={`whitespace-nowrap px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                                                    isSelected 
                                                        ? tab.id === 'boss_season'
                                                            ? 'bg-gradient-to-r from-amber-500/25 to-purple-500/25 text-amber-200 border border-amber-500/40 shadow-inner'
                                                            : tab.id === 'boss_region'
                                                            ? 'bg-red-950/60 text-red-300 border border-red-500/40 shadow-inner'
                                                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black shadow-inner'
                                                        : 'text-slate-400 hover:text-slate-200 bg-slate-900/50 hover:bg-slate-800/50 border border-slate-800/80'
                                                }`}
                                            >
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Monster Cards List */}
                            <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-3 space-y-2 bg-slate-950/20 touch-pan-y min-h-0 pb-16">
                                {encounteredMonsters.map((name, idx) => {
                                    const meta = getMonsterMeta(name);
                                    const isBoss = meta.isBoss;
                                    const isSeasonal = meta.isSeasonal;
                                    const mEntry = bestiaryData[name];
                                    const isMDefeated = mEntry && mEntry.defeatedCount > 0;
                                    
                                    return (
                                        <button
                                            key={`${name}-${idx}`}
                                            onClick={() => handleSelectMonster(name)}
                                            className={`w-full text-left p-2.5 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                                                selectedName === name 
                                                    ? 'bg-amber-950/20 border-amber-500/50 text-amber-200 shadow-md shadow-amber-950/40' 
                                                    : 'bg-slate-900/30 border-slate-900 hover:bg-slate-900/50 hover:border-slate-800 text-slate-400'
                                            } ${!isMDefeated ? 'opacity-70 grayscale-[50%]' : ''}`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="relative w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 shadow-inner flex items-center justify-center">
                                                    {isBoss ? (
                                                        bossMap[name]?.visualUrl ? (
                                                            <FastImage src={bossMap[name].visualUrl} className="w-full h-full object-cover" alt="" />
                                                        ) : (
                                                            <Crown size={14} className={isSeasonal ? "text-amber-400" : "text-red-400"} />
                                                        )
                                                    ) : (
                                                        getMonsterInfo(name).visualUrl ? (
                                                            <FastImage src={getMonsterInfo(name).visualUrl} className={`w-full h-full object-cover ${isMDefeated ? '' : 'grayscale opacity-40'}`} alt="" />
                                                        ) : (
                                                            <Skull size={14} className={isMDefeated ? "text-red-500" : "text-slate-600"} />
                                                        )
                                                    )}
                                                    {!isMDefeated && (
                                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                            <Lock size={11} className="text-slate-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <p className={`text-xs font-bold truncate ${
                                                            isSeasonal ? 'text-amber-300' : isBoss ? 'text-red-300' : 'text-slate-200'
                                                        }`}>
                                                            {name}
                                                        </p>
                                                        <span className="text-[9px] text-slate-400 font-mono font-bold shrink-0">
                                                            Lv.{meta.level}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                        {isSeasonal ? (
                                                            <span className="text-[8px] bg-gradient-to-r from-amber-950 via-purple-950 to-amber-950 border border-amber-500/50 text-amber-300 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.25)]">
                                                                <Sparkles size={8} className="text-amber-400" /> 시즌 보스
                                                            </span>
                                                        ) : isBoss ? (
                                                            <span className="text-[8px] bg-red-950/80 border border-red-700/60 text-red-300 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5 shrink-0">
                                                                <Crown size={8} className="text-red-400" /> 지역 보스
                                                            </span>
                                                        ) : (
                                                            <span className="text-[8px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold shrink-0">
                                                                일반 마물
                                                            </span>
                                                        )}
                                                        <span className="text-[8px] bg-slate-900/80 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5 shrink-0 max-w-[140px] truncate">
                                                            <MapPin size={8} className={isSeasonal ? "text-amber-400 shrink-0" : isBoss ? "text-red-400 shrink-0" : "text-slate-500 shrink-0"} />
                                                            <span className="truncate">{meta.continent} · {meta.nation}{meta.city ? ` · ${meta.city}` : ''}</span>
                                                        </span>
                                                        {isMDefeated ? (
                                                            <span className="text-[8px] text-emerald-400 font-extrabold flex items-center gap-0.5 shrink-0">
                                                                <Check size={8} /> 토벌 완료 ({mEntry.defeatedCount}회)
                                                            </span>
                                                        ) : (
                                                            <span className="text-[8px] text-slate-500 font-bold flex items-center gap-0.5 shrink-0">
                                                                <Lock size={8} /> 조우함 (미토벌)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                                        </button>
                                    );
                                })}
                                {encounteredMonsters.length === 0 && (
                                    <div className="py-20 text-center text-slate-600 opacity-60 italic px-4 space-y-2">
                                        <BookOpen size={24} className="mx-auto text-slate-800" />
                                        <p className="text-[11px]">발견된 몬스터가 없거나 검색 필터 조건과 일치하는 마물이 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Detail View */}
                        <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 md:p-6 custom-scrollbar bg-slate-900/40 min-h-0 touch-pan-y">
                            {selectedName ? (
                                <div className="max-w-3xl mx-auto w-full space-y-5 sm:space-y-6 pb-12 animate-in slide-in-from-right-4 duration-300">
                                    {/* Mobile Sticky Back Button */}
                                    <div className="md:hidden sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md -mx-3.5 -mt-3.5 px-3.5 py-2.5 mb-3 border-b border-white/5 flex items-center justify-between">
                                        <button 
                                            onClick={() => handleSelectMonster(null)}
                                            className="flex items-center text-amber-400 hover:text-amber-300 text-xs font-bold py-1 px-2.5 rounded-lg bg-slate-900 border border-amber-500/30 active:scale-95 transition-all cursor-pointer"
                                        >
                                            <ChevronLeft size={16} className="mr-1" /> 목록으로 돌아가기
                                        </button>
                                        <span className="text-[10px] text-slate-500 font-bold">도감 상세 정보</span>
                                    </div>

                                    {/* 몬스터 대표 카드 영역 */}
                                    <div className="relative bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 overflow-hidden flex flex-col items-center text-center">
                                        {/* 대기 아우라 라이트 */}
                                        {isDefeated && (
                                            <div className={`absolute -top-20 -left-20 w-64 h-64 bg-gradient-to-br ${shinColor.glow} rounded-full blur-[100px] pointer-events-none`} />
                                        )}
                                        
                                        <div className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-900 border-2 border-slate-800 flex items-center justify-center shadow-2xl overflow-hidden group">
                                            {selectedBossInfo && isDefeated ? (
                                                <FastImage src={selectedBossInfo.visualUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                                            ) : (!selectedBossInfo && isDefeated && getMonsterInfo(selectedName).visualUrl) ? (
                                                <FastImage src={getMonsterInfo(selectedName).visualUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                                            ) : (
                                                <Skull size={44} className={`transition-all duration-700 ${isDefeated ? 'text-red-500/50 scale-115' : 'text-slate-700/30'}`} />
                                            )}
                                            {!isDefeated && <Lock className="absolute text-slate-500 animate-pulse" size={24}/>}
                                        </div>

                                        <div className="mt-3.5 sm:mt-4 relative z-10 space-y-1">
                                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                {selectedMeta?.isSeasonal ? (
                                                    <span className="text-[10px] bg-gradient-to-r from-amber-950 via-purple-950 to-amber-950 border border-amber-500/60 text-amber-300 px-3 py-1 rounded-full font-black flex items-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                                                        <Sparkles size={11} className="text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                                                        월별 시즌 보스
                                                    </span>
                                                ) : selectedMeta?.isBoss ? (
                                                    <span className="text-[10px] bg-red-950 border border-red-700/60 text-red-300 px-3 py-1 rounded-full font-black flex items-center gap-1">
                                                        <Crown size={11} className="text-red-400" />
                                                        지역 수호 보스
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-1 rounded-full font-bold">
                                                        일반 필드 마물
                                                    </span>
                                                )}
                                                <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-bold">Lv.{monsterLevel}</span>
                                                {selectedMeta?.locationText && (
                                                    <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                                                        <MapPin size={10} className="text-amber-400" />
                                                        {selectedMeta.continent} · {selectedMeta.nation}{selectedMeta.city ? ` · ${selectedMeta.city}` : ''}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-xl sm:text-2xl font-black text-slate-100 tracking-wide">{selectedName}</h3>
                                            {selectedBossInfo && isDefeated && (
                                                <p className="text-amber-500 text-xs font-semibold tracking-wide italic">"{selectedBossInfo.title}"</p>
                                            )}
                                            {selectedMeta?.isSeasonal && (
                                                <div className="mt-2.5 p-3 bg-gradient-to-r from-amber-950/40 via-purple-950/40 to-amber-950/40 border border-amber-500/40 rounded-2xl flex items-center gap-2.5 text-xs text-amber-200 text-left">
                                                    <Sparkles size={16} className="text-amber-400 shrink-0" />
                                                    <p className="leading-relaxed">
                                                        <strong className="text-amber-300 font-black">신화 시즌 보스 안내: </strong>
                                                        특정 시즌이나 월에 비경에 출현하는 최고위 보스 몬스터입니다. 특별한 신화 등급 전리품을 드랍합니다.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {isDefeated ? (
                                        <div className="space-y-5 sm:space-y-6">
                                            {/* 기본 정보 및 전리품 획득 Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                
                                                {/* 기본 정보 카드 */}
                                                <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800/80 space-y-3.5 shadow-lg flex flex-col justify-between">
                                                    <div className="space-y-2.5">
                                                        <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                                                            <Info size={14}/> 마물 상태 및 속성
                                                        </h4>
                                                        <div className="space-y-2 text-sm">
                                                            {selectedBossInfo ? (
                                                                <p className="text-slate-300 leading-relaxed text-xs">"{selectedBossInfo.description}"</p>
                                                            ) : (
                                                                <p className="text-slate-300 leading-relaxed text-xs">"본 마물은 필드에서 포착되어 격퇴된 생체 표본입니다. 마물 생태계에 대한 상세 제원은 다음과 같습니다."</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="pt-2 flex flex-wrap gap-2 border-t border-white/5">
                                                        <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${shinColor.bg} ${shinColor.text} ${shinColor.border}`}>
                                                            신력 계통: {selectedShinryokuType}
                                                        </span>
                                                        {selectedMeta && (
                                                            <span className="bg-amber-950/40 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                                                                <MapPin size={11} className="text-amber-400" />
                                                                출현 지역: {selectedMeta.continent} · {selectedMeta.nation}{selectedMeta.city ? ` · ${selectedMeta.city}` : ''}
                                                            </span>
                                                        )}
                                                        <span className="bg-slate-900 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-bold">
                                                            토벌 횟수: {selectedEntry?.defeatedCount || 0}회
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* 전리품 정보 카드 */}
                                                <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800/80 space-y-3 shadow-lg flex flex-col">
                                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2 shrink-0">
                                                        <Package size={14}/> 드랍 가능 전리품
                                                    </h4>
                                                    <div className="flex-1 grid grid-cols-1 gap-2 max-h-56 md:max-h-44 overflow-y-auto pr-1 custom-scrollbar touch-pan-y">
                                                        {potentialLoot.length > 0 ? potentialLoot.map((loot, i) => {
                                                            const theme = getRarityTheme(loot.rarity);
                                                            const itemName = loot.item || loot.name;
                                                            const isTooltipActive = activeLootTooltip === itemName;
                                                            return (
                                                                <div 
                                                                    key={i} 
                                                                    onClick={() => setActiveLootTooltip(isTooltipActive ? null : itemName)}
                                                                    onMouseEnter={() => setActiveLootTooltip(itemName)}
                                                                    onMouseLeave={() => setActiveLootTooltip(null)}
                                                                    className={`flex flex-col p-2.5 bg-slate-900/60 rounded-xl border group transition-all cursor-pointer ${theme.border} ${theme.glow}`}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center border border-white/5 overflow-hidden p-0.5 shrink-0">
                                                                            <img src={loot.imageUrl || "https://i.ibb.co/6RsrXBZW/image.png"} className="w-full h-full object-contain" alt="" referrerPolicy="no-referrer" />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="text-[11px] font-bold text-slate-200 truncate group-hover:text-white">{itemName}</div>
                                                                            <div className={`text-[9px] font-bold uppercase ${theme.text}`}>{theme.label}</div>
                                                                        </div>
                                                                    </div>

                                                                    {isTooltipActive && (
                                                                        <div className="mt-2 pt-2 border-t border-slate-800/85 text-[10px] text-slate-400 space-y-1 text-left animate-in fade-in slide-in-from-top-1 duration-200">
                                                                            {loot.description && (
                                                                                <p className="text-amber-200/95 italic font-medium">"{loot.description}"</p>
                                                                            )}
                                                                            <div className="grid grid-cols-1 gap-1 pt-1 bg-slate-950/40 p-1.5 rounded border border-slate-900/60 mt-1">
                                                                                <div className="flex justify-between text-[9px]">
                                                                                    <span>종류</span>
                                                                                    <span className="text-slate-300 font-bold">
                                                                                        {loot.type}
                                                                                    </span>
                                                                                </div>
                                                                                {(loot.weaponType || loot.WeaponType) && (
                                                                                    <div className="flex justify-between text-[9px]">
                                                                                        <span>무기 종류</span>
                                                                                        <span className="text-amber-400 font-bold">
                                                                                            {WEAPON_TYPE_KOREAN[loot.weaponType || loot.WeaponType] || loot.weaponType || loot.WeaponType}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                                {(loot.elementalType || loot.ElementalType) && (
                                                                                    <div className="flex justify-between text-[9px]">
                                                                                        <span>원소 속성</span>
                                                                                        <span className="text-cyan-400 font-bold">
                                                                                            {loot.elementalType || loot.ElementalType}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                                <div className="flex justify-between text-[9px]">
                                                                                    <span>획득 확률</span>
                                                                                    <span className="text-amber-400 font-black">{(loot.chance * 100).toFixed(2)}%</span>
                                                                                </div>
                                                                                {loot.minLvl && (
                                                                                    <div className="flex justify-between text-[9px]">
                                                                                        <span>최소 획득 레벨</span>
                                                                                        <span className="text-slate-300 font-bold">Lv.{loot.minLvl}</span>
                                                                                    </div>
                                                                                )}
                                                                                {loot.secondaryOptions && loot.secondaryOptions.length > 0 && (
                                                                                    <div className="mt-1 pt-1 border-t border-slate-900 text-[8.5px]">
                                                                                        <span className="text-indigo-400 font-bold block">부착 옵션</span>
                                                                                        <span className="text-slate-300 block leading-relaxed mt-0.5">{loot.secondaryOptions.join(', ')}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        }) : (
                                                            <p className="text-[10px] text-slate-600 italic text-center py-6">알려진 획득 가능 전리품이 없습니다.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 보스 전용 기술 목록 */}
                                            {selectedBossInfo && (
                                                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                                                    <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-3.5 flex items-center gap-2 border-b border-white/5 pb-2">
                                                        <Flame size={14}/> 보스 전술 기술 목록
                                                    </h4>
                                                    <div className="grid grid-cols-1 gap-2.5">
                                                        {selectedBossInfo.skills.map((skill: any, i: number) => (
                                                            <div key={i} className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-xs font-black text-white">{skill.name}</span>
                                                                    <span className="text-[8px] bg-red-950/80 border border-red-900/40 text-red-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wide">{skill.type}</span>
                                                                </div>
                                                                <p className="text-[10px] text-slate-400 leading-relaxed italic">"{skill.description}"</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 전투 데이터 요약 카드 */}
                                            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                                                <div className="flex justify-between items-center flex-wrap gap-2 border-b border-white/5 pb-2">
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                        <Target size={14}/> 분석 종합 레포트
                                                    </h4>
                                                    <button
                                                        onClick={() => setShowStatsModal(true)}
                                                        className="text-[11px] font-bold text-amber-400 bg-amber-950/40 hover:bg-amber-900/40 border border-amber-500/40 hover:border-amber-400 rounded-xl px-3 py-1.5 flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                                                    >
                                                        <Sparkles size={11} className="animate-pulse" />
                                                        세부 능력치 및 보상 시뮬레이션
                                                    </button>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 text-center">
                                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">신력 계통</p>
                                                        <p className="text-xs font-black text-indigo-400 mt-1">{selectedShinryokuType}</p>
                                                    </div>
                                                    <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 text-center">
                                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">위험 등급</p>
                                                        <p className={`text-xs font-black mt-1 ${selectedMeta?.isBoss ? 'text-red-500' : 'text-amber-500'}`}>
                                                            {selectedMeta?.difficulty || (selectedBossInfo ? 'S급 (재앙)' : 'B급 (위험)')}
                                                        </p>
                                                    </div>
                                                    <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 text-center">
                                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">권장 토벌 레벨</p>
                                                        <p className="text-xs font-black text-emerald-400 mt-1">Lv.{monsterLevel}</p>
                                                    </div>
                                                    <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 text-center">
                                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">위험 개체 식별</p>
                                                        <p className="text-xs font-black text-slate-300 mt-1">{selectedMeta?.isSeasonal ? '신화 시즌 보스' : selectedMeta?.isBoss ? '지역 네임드 보스' : '광역 토벌종'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-950 border border-slate-800 p-12 rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
                                            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                                <AlertCircle size={32} className="text-amber-500 animate-pulse" />
                                            </div>
                                            <div className="max-w-md space-y-2">
                                                <p className="text-slate-200 font-bold text-base">조우 정보 잠금됨</p>
                                                <p className="text-xs text-slate-400 leading-relaxed">
                                                    해당 마물과 한 번 이상 조우하였으나 처치(토벌)하지 못하였습니다. <br/>
                                                    최소 1회 이상 토벌에 성공해야 전리품 상세 데이터와 생체 분석 정보를 열람할 수 있습니다.
                                                </p>
                                                {selectedMeta && (
                                                    <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-amber-300 font-bold bg-amber-950/30 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                                                        <MapPin size={13} className="text-amber-400" />
                                                        출현 지역: {selectedMeta.continent} · {selectedMeta.nation}{selectedMeta.city ? ` · ${selectedMeta.city}` : ''}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-800 gap-4 py-20">
                                    <BookOpen size={64} className="text-slate-800 animate-pulse" />
                                    <div className="text-center space-y-1">
                                        <p className="text-base font-bold text-slate-400">마물 관찰 및 분석 데이터</p>
                                        <p className="text-xs text-slate-600">좌측 목록에서 마물을 선택하시면 상세 생태 분석 결과를 확인하실 수 있습니다.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-3 sm:p-4 bg-slate-950 border-t border-white/5 text-center shrink-0 hidden md:block">
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.4em]">Chronicles of Monster Slaying Operations & Tactics</p>
                    </div>
                </div>
            </div>

            {/* 몬스터 상세 분석 및 처치 보상 모바일 최적화 하위 모달 */}
            <AnimatePresence>
                {showStatsModal && monsterStats && rewardInfo && (
                    <div className="fixed inset-0 z-[210] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4">
                        {/* Backdrop Click */}
                        <div className="absolute inset-0" onClick={() => setShowStatsModal(false)} />
                        
                        {/* Modal Panel */}
                        <motion.div
                            initial={{ y: "100%", opacity: 0.5 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 220 }}
                            className="bg-slate-950 border border-slate-800 w-full max-w-lg rounded-t-3xl md:rounded-3xl p-4 sm:p-5 shadow-2xl relative max-h-[88vh] max-md:max-h-[92dvh] overflow-hidden flex flex-col z-[220]"
                        >
                            {/* Drag / Handle bar on Mobile */}
                            <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto mb-4 md:hidden shrink-0" />

                            {/* Header */}
                            <div className="flex justify-between items-start mb-4 shrink-0">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] bg-amber-950 border border-amber-900 text-amber-400 px-2.5 py-0.5 rounded-full font-bold">
                                            {selectedMeta?.isSeasonal ? '신화 시즌 보스' : selectedMeta?.isBoss ? '지역 수호 보스' : rewardInfo.grade}
                                        </span>
                                        {selectedMeta?.isSeasonal ? (
                                            <span className="text-[10px] bg-gradient-to-r from-amber-950 to-purple-950 border border-amber-500/50 text-amber-300 px-2.5 py-0.5 rounded-full font-black flex items-center gap-1">
                                                <Sparkles size={9} className="text-amber-400" /> 월별 시즌 보스
                                            </span>
                                        ) : selectedMeta?.isBoss ? (
                                            <span className="text-[10px] bg-red-950 border border-red-700/60 text-red-300 px-2.5 py-0.5 rounded-full font-black flex items-center gap-1">
                                                <Crown size={9} className="text-red-400" /> 지역 수호 보스
                                            </span>
                                        ) : (
                                            <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-bold">
                                                일반 필드 마물
                                            </span>
                                        )}
                                        <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-bold">
                                            Lv.{monsterLevel}
                                        </span>
                                        {selectedMeta?.locationText && (
                                            <span className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                <MapPin size={10} className="text-amber-400" />
                                                {selectedMeta.continent} · {selectedMeta.nation}{selectedMeta.city ? ` · ${selectedMeta.city}` : ''}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-lg sm:text-xl font-black text-slate-200 flex items-center gap-2">
                                        <Skull className="text-red-500 shrink-0" size={18} />
                                        {selectedName}
                                    </h3>
                                    <p className="text-[11px] text-slate-500">생체 능력 제원 및 격퇴 예상 전리품 수치</p>
                                </div>
                                <button
                                    onClick={() => setShowStatsModal(false)}
                                    className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-all cursor-pointer"
                                 >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Content container */}
                            <div className="space-y-5 overflow-y-auto overscroll-contain custom-scrollbar pr-1 flex-1 pb-4 touch-pan-y min-h-0">
                                {/* 1. 스탯 능력치 패널 */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                                        <Activity size={12} className="text-amber-500" />
                                        생물학적 기초 스펙 분석
                                    </h4>
                                    
                                    <div className="space-y-3.5 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                                        {/* HP */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-slate-400 flex items-center gap-1">
                                                    <Heart size={11} className="text-red-500" /> 생명력 (HP)
                                                </span>
                                                <span className="text-red-400 font-mono">{(monsterStats.hp || monsterStats.maxHp || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-900">
                                                <div className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full" style={{ width: '100%' }} />
                                            </div>
                                        </div>

                                        {/* MP */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-slate-400 flex items-center gap-1">
                                                    <Brain size={11} className="text-indigo-400" /> 지혜마력 (MP)
                                                </span>
                                                <span className="text-indigo-400 font-mono">{(monsterStats.mp || monsterStats.maxMp || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-900">
                                                <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full" style={{ width: '85%' }} />
                                            </div>
                                        </div>

                                        {/* Core Stats Grid */}
                                        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/5">
                                            <div className="flex justify-between items-center p-2 bg-slate-950/40 rounded-lg border border-slate-800">
                                                <span className="text-[10px] text-slate-500 font-bold">근력 (STR)</span>
                                                <span className="text-xs font-bold text-amber-500 font-mono">{(monsterStats.str || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-2 bg-slate-950/40 rounded-lg border border-slate-800">
                                                <span className="text-[10px] text-slate-500 font-bold">지능 (INT)</span>
                                                <span className="text-xs font-bold text-blue-400 font-mono">{(monsterStats.int || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-2 bg-slate-950/40 rounded-lg border border-slate-800">
                                                <span className="text-[10px] text-slate-500 font-bold">민첩 (AGI)</span>
                                                <span className="text-xs font-bold text-emerald-400 font-mono">{(monsterStats.agi || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-2 bg-slate-950/40 rounded-lg border border-slate-800">
                                                <span className="text-[10px] text-slate-500 font-bold">방어력 (DEF)</span>
                                                <span className="text-xs font-bold text-slate-300 font-mono">{(monsterStats.def || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-2 bg-slate-950/40 rounded-lg border border-slate-800 col-span-2">
                                                <span className="text-[10px] text-slate-500 font-bold">정신 / 제어력 (WIS / CTRL)</span>
                                                <span className="text-xs font-bold text-indigo-300 font-mono">
                                                    {((monsterStats.wis || 0)).toLocaleString()} / {((monsterStats.ctrl || 0)).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. 처치 보상 분석판 */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                                        <Trophy size={12} className="text-amber-500" />
                                        토벌 시 획득 예상 전리품 가치
                                    </h4>
                                    
                                    <div className="grid grid-cols-2 gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                                        {/* EXP Reward */}
                                        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">기본 경험치 보상</p>
                                            <p className="text-sm font-black text-emerald-400 mt-1 font-mono">+{rewardInfo.exp.toLocaleString()} EXP</p>
                                        </div>

                                        {/* Gold Reward */}
                                        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">포상금 (Gold)</p>
                                            <p className="text-sm font-black text-amber-500 mt-1 font-mono flex items-center justify-center gap-1">
                                                <Coins size={12} />
                                                {rewardInfo.goldMin.toLocaleString()}~{rewardInfo.goldMax.toLocaleString()}G
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. 상세 처치 지침 */}
                                <div className="p-3.5 bg-red-950/15 border border-red-950/50 rounded-xl space-y-1">
                                    <p className="text-xs font-bold text-red-400 flex items-center gap-1">
                                        <AlertCircle size={12} /> 모험가 연맹 안전 공고 지침
                                    </p>
                                    <p className="text-[10px] text-slate-400 leading-relaxed">
                                        {selectedBossInfo ? 
                                            '이 고유 개체는 치명적인 전용 비기를 보유한 재앙 등급의 군주입니다. 조우 전 아군의 무기와 방어구 강화 수준을 꼼꼼하게 다듬고, 고등급의 물약을 지참하여 기민하게 공략하시길 바랍니다.' :
                                            '이 개체는 야생에서 흔하게 관찰되는 마물입니다. 일정한 숙련 등급을 도달하였다면 큰 어려움 없이 제압할 수 있으며 지속적인 토벌을 통해 연금 가공물 재료 및 수급 장비를 파밍하기 적합합니다.'
                                        }
                                    </p>
                                </div>
                            </div>
                            
                            {/* Close Button at Bottom for comfortable mobile reach */}
                            <button
                                onClick={() => setShowStatsModal(false)}
                                className="w-full mt-2 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs tracking-wider transition-all shadow-md active:scale-[0.98] cursor-pointer shrink-0 uppercase"
                            >
                                닫기
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default BestiaryModal;
