import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Character, Location } from '../types';
import { WORLD_GEOGRAPHY } from '../constants';
import { calculateFinalStats } from '../utils';
import { SEASONAL_BOSS_CONFIG, SEASONAL_BOSSES } from '../mythicbossmonsters';
import { calculateTravelCostAndDays } from '../services/travelCalculationService';
import { 
    X, MapPin, Globe, Flag, Navigation, Footprints, ArrowLeft, ZoomIn, ZoomOut, 
    Star, Maximize, Plane, Crown, Building2, Tent, Home, Truck, Cloud, CloudSun, 
    Sparkles, Search, List, Map as MapIcon, ChevronRight, ChevronDown, Compass,
    Shield, ArrowRight, Zap, Flame, Skull, Swords, Sun, Lock
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  onTravel: (destination: Location, cost: number, days: number, totalMinutes?: number) => void;
  mode?: 'travel' | 'relocate'; 
  residentCount?: number; 
  initialTargetLocationName?: string;
}

type ViewLevel = 'world' | 'continent' | 'nation';
type RealmType = 'mortal' | 'divine';
type DisplayMode = 'map' | 'list' | 'favorites';

interface MapNode {
    name: string;
    x: number;
    y: number;
    type: string;
    tier?: 'Village' | 'Town' | 'City' | 'Capital';
    hasRift?: boolean;
    bossName?: string;
    riftCount?: number;
    hasInstantDungeon?: boolean;
    instantDungeonCount?: number;
    instantDungeonName?: string;
    instantDungeonLevel?: number;
    hasBlackMarket?: boolean;
}

export const GEO_POSITIONS: Record<string, { x: number, y: number }> = {
    // Regions
    '북아메리카': { x: 25, y: 20 }, 
    '남아메리카': { x: 32, y: 65 }, 
    '유럽': { x: 53, y: 20 }, 
    '아시아': { x: 76, y: 30 }, 
    '아프리카': { x: 53, y: 55 }, 
    '오세아니아': { x: 82, y: 65 }, 
    '마계': { x: 50, y: 96 }, 
    '신계': { x: 50, y: 50 }, 
    
    // 판타지 신규 대륙
    '실바나르': { x: 5.0, y: 50.0 },
    '페랄디아': { x: 50.0, y: 5.0 },
    '아비살론': { x: 95.0, y: 50.0 },

    // 실바나르
    '미르탈 숲연합': { x: 5.0, y: 50.0 },
    '미르탈': { x: 4.8, y: 49.5 },
    '실바엔': { x: 5.5, y: 51.0 },
    '노르실': { x: 4.2, y: 52.0 },

    // 페랄디아
    '레오니스 투기국': { x: 50.0, y: 4.0 },
    '레오폴리스': { x: 50.0, y: 4.0 },
    '하울가르': { x: 47.5, y: 6.5 },
    '그라울': { x: 52.0, y: 6.0 },

    // 아비살론
    '네크로디움 제국': { x: 95.0, y: 50.0 },
    '말피스': { x: 95.0, y: 49.0 },
    '바르칸': { x: 96.5, y: 51.5 },
    '크림존': { x: 93.5, y: 51.0 },

    // ASIA
    '대한민국': { x: 80.0, y: 28.0 }, 
    '북한': { x: 80.0, y: 24.2 },
    '일본': { x: 82.0, y: 28.5 }, 
    '중국': { x: 76.0, y: 32.0 },
    '몽골': { x: 74.0, y: 23.0 },
    '인도': { x: 67.0, y: 40.0 }, 
    '태국': { x: 72.0, y: 42.0 }, 
    '베트남': { x: 74.0, y: 43.0 }, 
    '필리핀': { x: 78.0, y: 46.0 }, 
    '인도네시아': { x: 77.0, y: 56.0 }, 
    '말레이시아': { x: 74.0, y: 50.0 }, 
    '싱가포르': { x: 74.5, y: 51.0 }, 
    '사우디아라비아': { x: 60.0, y: 38.0 }, 
    'UAE': { x: 61.5, y: 39.0 }, 
    '이스라엘': { x: 56.0, y: 34.0 }, 
    '이란': { x: 64.0, y: 33.0 }, 

    '서울': { x: 80.0, y: 27.8 }, 
    '인천': { x: 79.6, y: 27.8 }, 
    '대전': { x: 80.1, y: 28.3 },
    '대구': { x: 80.5, y: 28.5 }, 
    '울산': { x: 80.8, y: 28.6 },
    '광주': { x: 79.8, y: 28.9 },
    '부산': { x: 80.7, y: 29.0 },
    '제주': { x: 79.8, y: 29.8 },

    // 북한 도시
    '평양': { x: 79.8, y: 27.0 }, 
    '나선': { x: 81.5, y: 25.0 }, 
    '개성': { x: 80.0, y: 27.5 }, 
    '신의주': { x: 79.0, y: 26.4 }, 
    '원산': { x: 80.5, y: 27.0 }, 
    '함흥': { x: 80.7, y: 26.4 }, 
    '청진': { x: 81.1, y: 25.5 },
    
    '도쿄': { x: 83.5, y: 28.5 }, 
    '오사카': { x: 82.0, y: 29.2 },
    '교토': { x: 82.2, y: 29.0 },
    '삿포로': { x: 84.0, y: 24.0 },
    '후쿠오카': { x: 81.0, y: 29.5 },
    '베이징': { x: 78.0, y: 28.5 }, 
    '울란바토르': { x: 76.0, y: 24.0 },
    '다르항': { x: 72.0, y: 24.0 },
    '에르데네트': { x: 78.0, y: 24.0 },
    '상하이': { x: 79.0, y: 33.0 },
    '광저우': { x: 77.0, y: 36.0 },
    '시안': { x: 74.0, y: 32.0 },
    '청두': { x: 72.0, y: 33.0 },
    
    '뉴델리': { x: 67.0, y: 36.0 }, 
    '뭄바이': { x: 66.0, y: 42.0 },
    '벵갈루루': { x: 67.5, y: 43.5 },
    '첸나이': { x: 68.5, y: 43.0 },
    
    '방콕': { x: 73.0, y: 42.0 }, 
    '치앙마이': { x: 72.0, y: 40.5 },
    '푸켓': { x: 72.5, y: 44.5 },
    '파타야': { x: 73.5, y: 42.5 },
    '하노이': { x: 74.5, y: 41.0 }, 
    '호치민': { x: 75.0, y: 44.0 },
    '다낭': { x: 75.0, y: 42.5 },
    '나트랑': { x: 75.5, y: 43.5 },
    '마닐라': { x: 82.0, y: 44.0 }, 
    '세부': { x: 83.0, y: 46.0 },
    '다바오': { x: 83.5, y: 47.5 },
    '자카르타': { x: 78.0, y: 56.0 }, 
    '발리': { x: 80.5, y: 56.5 },
    '수라바야': { x: 79.5, y: 56.0 },
    '쿠알라룸푸르': { x: 74.0, y: 50.0 },
    '페낭': { x: 73.0, y: 49.0 },
    '조호르바루': { x: 74.5, y: 51.0 },
    '리야드': { x: 60.0, y: 38.0 },
    '제다': { x: 58.5, y: 39.0 },
    '메카': { x: 59.0, y: 39.5 },
    '아부다비': { x: 61.5, y: 39.0 },
    '두바이': { x: 62.0, y: 38.5 },
    '샤르자': { x: 62.5, y: 38.2 },
    '예루살렘': { x: 56.0, y: 34.0 },
    '텔아비브': { x: 55.5, y: 33.5 },
    '하이파': { x: 55.8, y: 33.0 },
    '테헤란': { x: 64.0, y: 33.0 },
    '이스파한': { x: 64.5, y: 34.0 },
    '시라즈': { x: 65.0, y: 35.0 },

    // EUROPE
    '영국': { x: 47.0, y: 19.0 },
    '아일랜드': { x: 44.5, y: 19.0 },
    '스코틀랜드': { x: 46.5, y: 16.5 },
    '프랑스': { x: 48.5, y: 23.0 },
    '독일': { x: 52.0, y: 21.0 },
    '이탈리아': { x: 50.5, y: 26.0 },
    '스페인': { x: 47.0, y: 27.5 },
    '포르투갈': { x: 45.5, y: 27.5 },
    '네덜란드': { x: 50.5, y: 18.5 },
    '벨기에': { x: 49.5, y: 19.5 },
    '러시아': { x: 67.0, y: 15.0 }, 
    '스웨덴': { x: 50.0, y: 13.0 },
    '노르웨이': { x: 48.5, y: 13.0 },
    '덴마크': { x: 50.0, y: 15.0 },
    '핀란드': { x: 52.0, y: 13.0 },
    '폴란드': { x: 56.0, y: 19.0 },
    '우크라이나': { x: 60.0, y: 21.0 },
    '스위스': { x: 51.0, y: 22.0 },
    '오스트리아': { x: 54.0, y: 22.0 },
    '그리스': { x: 57.0, y: 29.0 },
    '헝가리': { x: 55.0, y: 23.0 },
    '체코': { x: 53.5, y: 20.5 },
    '루마니아': { x: 58.0, y: 26.0 },
    '터키': { x: 60.0, y: 29.0 },

    '런던': { x: 47.5, y: 19.5 },
    '맨체스터': { x: 47.0, y: 18.5 },
    '에든버러': { x: 46.5, y: 16.5 },
    '리버풀': { x: 46.8, y: 18.8 },
    '파리': { x: 48.5, y: 22.5 },
    '마르세유': { x: 49.0, y: 25.0 },
    '리옹': { x: 49.2, y: 23.5 },
    '니스': { x: 50.0, y: 25.0 },
    '베를린': { x: 53.0, y: 20.5 },
    '뮌헨': { x: 53.0, y: 22.5 },
    '프랑크푸르트': { x: 52.0, y: 21.5 },
    '함부르크': { x: 52.5, y: 19.5 },
    '로마': { x: 54.0, y: 28.0 },
    '밀라노': { x: 52.5, y: 25.5 },
    '베네치아': { x: 53.5, y: 25.8 },
    '나폴리': { x: 54.5, y: 29.0 },
    '피렌체': { x: 53.5, y: 27.0 },
    '마드리드': { x: 45.5, y: 29.5 },
    '바르셀로나': { x: 47.5, y: 28.0 },
    '세비야': { x: 44.5, y: 31.0 },
    '발렌시아': { x: 46.5, y: 29.5 },
    '모스크바': { x: 65.0, y: 18.0 },
    '상트페테르부르크': { x: 62.0, y: 15.0 },
    '노보시비르스크': { x: 72.0, y: 18.0 },
    '스톡홀름': { x: 50.5, y: 13.0 },
    '예테보리': { x: 49.5, y: 14.5 },
    '말뫼': { x: 50.0, y: 15.5 },
    '오슬로': { x: 48.5, y: 13.0 },
    '베르겐': { x: 47.5, y: 13.5 },
    '코펜하겐': { x: 50.0, y: 15.0 },
    '오르후스': { x: 49.5, y: 14.8 },
    '헬싱키': { x: 52.5, y: 13.5 },
    '에스포': { x: 52.2, y: 13.5 },
    '바르샤바': { x: 56.0, y: 19.0 },
    '크라쿠프': { x: 56.0, y: 20.5 },
    '키이우': { x: 60.0, y: 21.0 },
    '하르키우': { x: 62.0, y: 21.5 },
    '암스테르담': { x: 50.5, y: 18.5 },
    '로테르담': { x: 50.3, y: 19.0 },
    '헤이그': { x: 50.2, y: 18.7 },
    '브뤼셀': { x: 49.5, y: 19.5 },
    '안트베르펜': { x: 49.6, y: 19.0 },
    '베른': { x: 51.0, y: 22.0 },
    '취리히': { x: 51.5, y: 21.8 },
    '제네바': { x: 50.5, y: 22.8 },
    '빈': { x: 54.0, y: 22.0 },
    '잘츠부르크': { x: 53.5, y: 22.5 },
    '리스본': { x: 45.5, y: 27.5 },
    '포르투': { x: 45.3, y: 26.5 },
    '아테네': { x: 57.0, y: 29.0 },
    '테살로니키': { x: 56.5, y: 27.8 },
    '더블린': { x: 44.5, y: 19.0 },
    '코크': { x: 44.0, y: 20.0 },
    '부다페스트': { x: 55.0, y: 23.0 },
    '프라하': { x: 53.5, y: 20.5 },
    '브르노': { x: 54.0, y: 21.2 },
    '부쿠레슈티': { x: 58.0, y: 26.0 },
    '앙카라': { x: 60.5, y: 29.5 },
    '이스탄불': { x: 60.0, y: 28.5 },
    '글래스고': { x: 46.0, y: 16.8 },

    // NORTH AMERICA
    '미국': { x: 22, y: 24 },
    '캐나다': { x: 22, y: 14 },
    '멕시코': { x: 20, y: 34 },

    '워싱턴 D.C.': { x: 28, y: 25 },
    '뉴욕': { x: 29, y: 23 },
    'LA': { x: 17, y: 27 },
    '시카고': { x: 24, y: 22 },
    '샌프란시스코': { x: 16, y: 25 },
    '마이애미': { x: 28, y: 31 },
    '라스베가스': { x: 18, y: 26 },
    
    '오타와': { x: 28, y: 16 },
    '토론토': { x: 27, y: 17 },
    '밴쿠버': { x: 14, y: 14 },
    '몬트리올': { x: 29, y: 15 },

    '멕시코시티': { x: 20, y: 34 },
    '과달라하라': { x: 19, y: 34.5 },
    '칸쿤': { x: 23, y: 33 },

    // SOUTH AMERICA
    '브라질': { x: 34, y: 60.0 }, 
    '아르헨티나': { x: 30.0, y: 75.0 },
    '브라질리아': { x: 34, y: 60.0 },
    '상파울루': { x: 35, y: 64.0 },
    '리우데자네이루': { x: 36, y: 63.5 },
    '부에노스아이레스': { x: 30.0, y: 75.0 },
    '코르도바': { x: 28.5, y: 74.0 },

    // OCEANIA
    '호주': { x: 82, y: 67 }, 
    '뉴질랜드': { x: 91, y: 77 }, 
    '캔버라': { x: 85, y: 71 }, 
    '시드니': { x: 86, y: 70 }, 
    '멜버른': { x: 83, y: 72 }, 
    '브리즈번': { x: 86, y: 67 },
    '웰링턴': { x: 91, y: 77 },
    '오클랜드': { x: 91.5, y: 74.5 },
    '크라이스트처치': { x: 90.5, y: 78.5 },

    // AFRICA
    '이집트': { x: 55, y: 38 }, 
    '남아공': { x: 55, y: 78 },
    '나이지리아': { x: 48, y: 48.0 },
    '케냐': { x: 60, y: 55.0 }, 
    '모로코': { x: 42, y: 34 }, 
    '카이로': { x: 55, y: 38 },
    '알렉산드리아': { x: 54.5, y: 37 },
    '프리토리아': { x: 55, y: 78 },
    '케이프타운': { x: 52, y: 82 },
    '요하네스버그': { x: 55.5, y: 78.5 },
    '아부자': { x: 48, y: 48.0 },
    '라고스': { x: 47.5, y: 49.5 },
    '나이로비': { x: 60, y: 55.0 },
    '몸바사': { x: 61, y: 56.0 },
    '라바트': { x: 42, y: 34 },
    '카사블랑카': { x: 41.5, y: 34.5 },
    
    // MAGYE
    '임페리얼 제국': { x: 50.0, y: 96.0 }, 
    '임페리얼': { x: 50.0, y: 96.0 }, 
    '눌바리온': { x: 47.0, y: 93.0 }, 
    '딜리리움': { x: 43.0, y: 90.0 },
    '노크티아': { x: 57.0, y: 94.0 },
    '엔드라실': { x: 50.0, y: 88.0 },
    '세라피엘 몰락지': { x: 45.0, y: 84.0 },
    '카르나쥬': { x: 55.0, y: 93.0 },
    '인페르노스': { x: 37.0, y: 88.0 },
    '베놈가든': { x: 63.0, y: 90.0 },
    '크로노폴': { x: 50.0, y: 92.0 }, 
    '네크로폴리스': { x: 30.0, y: 94.0 },
    '블러드문': { x: 70.0, y: 87.0 },

    // SHINGYE
    '신의 성소': { x: 50.0, y: 20.0 },
    '양의 기운의 성전': { x: 75.0, y: 50.0 },
    '음의 기운의 성전': { x: 25.0, y: 50.0 },
    '무의 궁': { x: 50.0, y: 80.0 },

    '신의 거처': { x: 50.0, y: 22.0 },
    '태양의 사자의 성전': { x: 72.0, y: 45.0 },
    '광휘의 사자의 성소': { x: 75.0, y: 45.0 },
    '초화의 사자의 성초': { x: 80.0, y: 50.0 },
    '화염의 사자의 성화': { x: 78.0, y: 60.0 },
    '해수의 사자의 성수전': { x: 72.0, y: 60.0 },
    '월광의 사자의 성': { x: 28.0, y: 40.0 },
    '질풍의 사자의 질풍전': { x: 22.0, y: 40.0 },
    '빙결의 사자의 빙궁': { x: 20.0, y: 50.0 },
    '강철의 사자의 강성': { x: 22.0, y: 60.0 },
    '지령의 사자의 궁궐': { x: 28.0, y: 60.0 },
    '암연의 사자의 심연': { x: 26.0, y: 59.0 },
    '전격의 사자의 성전': { x: 78.0, y: 46.0 },
    '무의 궁궐': { x: 50.0, y: 80.0 },
};

export const ISLAND_NATIONS = ['일본', '영국', '아일랜드', '필리핀', '인도네시아', '호주', '뉴질랜드', '싱가포르', '제주'];
const LARGE_NATIONS = ['미국', '러시아', '중국', '캐나다', '브라질', '호주', '인도', '마계', '신계', '임페리얼 제국', '몽골'];

// Canvas Fixed Aspect Reference Dimensions
const MAP_CANVAS_WIDTH = 2000;
const MAP_CANVAS_HEIGHT = 1000;

const getProceduralPosition = (str: string, index: number, total: number, baseX: number, baseY: number) => {
    const angle = (index / total) * 2 * Math.PI;
    const radius = 1.2; 
    return {
        x: baseX + (Math.cos(angle) * radius),
        y: baseY + (Math.sin(angle) * radius)
    };
};

const MapModal: React.FC<Props> = ({ isOpen, onClose, character, onTravel, mode = 'travel', residentCount = 1, initialTargetLocationName }) => {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('map');
  const [viewLevel, setViewLevel] = useState<ViewLevel>('world');
  const [realm, setRealm] = useState<RealmType>('mortal');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedNation, setSelectedNation] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{region: string, nation: string, city: string}[]>([]);
  
  const [listExpandedRegions, setListExpandedRegions] = useState<Record<string, boolean>>({});
  const [listExpandedNations, setListExpandedNations] = useState<Record<string, boolean>>({});
  const [listSelectedRegionFilter, setListSelectedRegionFilter] = useState<string>(() => {
    return character.currentLocation?.region || 'ALL';
  });

  useEffect(() => {
    if (isOpen && character.currentLocation?.region) {
      setListSelectedRegionFilter(character.currentLocation.region);
    }
  }, [isOpen, character.currentLocation?.region]);

  const [favorites, setFavorites] = useState<{region: string, nation: string, city: string}[]>(() => {
    try {
        const stored = localStorage.getItem('mapFavorites');
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('mapFavorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (region: string, nation: string, city: string) => {
    setFavorites(prev => {
        if (prev.some(f => f.city === city && f.nation === nation)) {
            return prev.filter(f => !(f.city === city && f.nation === nation));
        } else {
            return [...prev, { region, nation, city }];
        }
    });
  };

  const isFavorite = (city: string, nation?: string) => 
    favorites.some(f => f.city === city && (!nation || f.nation === nation));

  // Dimensional Rift (Seasonal Boss) Quick List State
  const [isRiftListOpen, setIsRiftListOpen] = useState(false);
  // Instant Dungeon Quick List State
  const [isInstantDungeonListOpen, setIsInstantDungeonListOpen] = useState(false);

  // Instant Dungeons Helper
  const instantDungeons = useMemo(() => {
    return character.instantDungeons || [];
  }, [character.instantDungeons]);

  const getInstantDungeonsForCity = (cityName: string, nationName?: string) => {
    return (instantDungeons || []).filter(d => {
      if (nationName && d.nation !== nationName) return false;
      return d.city === cityName;
    });
  };

  const getInstantDungeonsForNation = (nationName: string) => {
    return (instantDungeons || []).filter(d => d.nation === nationName);
  };

  const getInstantDungeonsForRegion = (regionName: string) => {
    const regionNations = WORLD_GEOGRAPHY[regionName] || {};
    const nationKeys = Object.keys(regionNations);
    return (instantDungeons || []).filter(d => nationKeys.includes(d.nation));
  };

  // Black Market Helper
  const activeBlackMarket = character.activeBlackMarket;

  const getBlackMarketForCity = (cityName: string, nationName?: string) => {
    if (!activeBlackMarket) return null;
    if (nationName && activeBlackMarket.nation !== nationName) return null;
    return activeBlackMarket.city === cityName ? activeBlackMarket : null;
  };

  const getBlackMarketForNation = (nationName: string) => {
    if (!activeBlackMarket) return null;
    return activeBlackMarket.nation === nationName ? activeBlackMarket : null;
  };

  const getBlackMarketForRegion = (regionName: string) => {
    if (!activeBlackMarket) return null;
    if (activeBlackMarket.region === regionName) return activeBlackMarket;
    const regionNations = WORLD_GEOGRAPHY[regionName] || {};
    return regionNations[activeBlackMarket.nation] ? activeBlackMarket : null;
  };

  // Calculate current month (1 ~ 12)
  const currentMonth = useMemo(() => {
    if (!character.currentDate) return 1;
    const parts = character.currentDate.split('-');
    if (parts.length >= 2) {
      const m = parseInt(parts[1], 10);
      if (!isNaN(m) && m >= 1 && m <= 12) return m;
    }
    return 1;
  }, [character.currentDate]);

  // Seasonal Boss Dimensional Rifts for active month
  const activeSeasonalRifts = useMemo(() => {
    return SEASONAL_BOSS_CONFIG[currentMonth] || [];
  }, [currentMonth]);

  // Helpers to check dimensional rift presence
  const getRiftForCity = (cityName: string, nationName?: string) => {
    return activeSeasonalRifts.find(r => {
      if (nationName && r.nation !== nationName) return false;
      return r.city === cityName;
    });
  };

  const getRiftsForNation = (nationName: string) => {
    return (activeSeasonalRifts || []).filter(r => r.nation === nationName);
  };

  const getRiftsForRegion = (regionName: string) => {
    const regionNations = WORLD_GEOGRAPHY[regionName] || {};
    const nationKeys = Object.keys(regionNations);
    return (activeSeasonalRifts || []).filter(r => nationKeys.includes(r.nation));
  };

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 40;
  const MORTAL_MAP_URL = "https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg";
  const DIVINE_MAP_URL = "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=2400&q=85"; 

  const currentLocation = character.currentLocation || { region: "아시아", nation: "대한민국", city: "서울" };
  const originLocation = mode === 'relocate' ? (character.base?.location || currentLocation) : currentLocation;

  // Fit map canvas into container initially
  const fitMapToContainer = () => {
    if (!mapContainerRef.current) return;
    const { clientWidth, clientHeight } = mapContainerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;

    // Calculate scale to fit whole 2000x1000 map inside viewport
    const scaleX = clientWidth / MAP_CANVAS_WIDTH;
    const scaleY = clientHeight / MAP_CANVAS_HEIGHT;
    const initialFitScale = Math.min(scaleX, scaleY);

    const initialX = (clientWidth - MAP_CANVAS_WIDTH * initialFitScale) / 2;
    const initialY = (clientHeight - MAP_CANVAS_HEIGHT * initialFitScale) / 2;

    setScale(initialFitScale);
    setPosition({ x: initialX, y: initialY });
  };

  // ResizeObserver to maintain stable scaling on any window/container size change
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;
    const container = mapContainerRef.current;

    let previousWidth = container.clientWidth;
    let previousHeight = container.clientHeight;
    let rAFId: number | null = null;

    const resizeObserver = new ResizeObserver((entries) => {
      if (rAFId !== null) cancelAnimationFrame(rAFId);
      rAFId = requestAnimationFrame(() => {
        for (const entry of entries) {
          const newWidth = entry.contentRect.width;
          const newHeight = entry.contentRect.height;

          if (previousWidth > 0 && previousHeight > 0 && (newWidth !== previousWidth || newHeight !== previousHeight)) {
            // Adjust position proportionally so focus center remains fixed
            setPosition((prev) => {
              const centerX = prev.x + (previousWidth / 2);
              const centerY = prev.y + (previousHeight / 2);
              const ratioX = newWidth / previousWidth;
              const ratioY = newHeight / previousHeight;
              return {
                x: prev.x * ratioX,
                y: prev.y * ratioY
              };
            });
          }
          previousWidth = newWidth;
          previousHeight = newHeight;
        }
      });
    });

    resizeObserver.observe(container);
    return () => {
      if (rAFId !== null) cancelAnimationFrame(rAFId);
      resizeObserver.disconnect();
    };
  }, [isOpen]);

  useEffect(() => {
      if (isOpen) {
          if (character.currentLocation?.region === '신계') {
              setRealm('divine');
              setSelectedRegion('신계');
          } else {
              setRealm('mortal');
          }
          setViewLevel('world');
          setSelectedNation(null);
          setSelectedCity(null);
          
          if (initialTargetLocationName) {
              const target = initialTargetLocationName.trim();
              let foundRegion: string | null = null;
              let foundNation: string | null = null;
              let foundCity: string | null = null;

              for (const [rName, rNations] of Object.entries(WORLD_GEOGRAPHY)) {
                  if (rName === target) {
                      foundRegion = rName;
                      break;
                  }
                  for (const [nName, cInfo] of Object.entries(rNations as Record<string, any>)) {
                      if (nName === target) {
                          foundRegion = rName;
                          foundNation = nName;
                          break;
                      }
                      const citiesList: string[] = Array.isArray(cInfo) ? cInfo : (Array.isArray(cInfo?.cities) ? cInfo.cities : []);
                      const isCapital = cInfo?.capital === target;
                      if (isCapital || citiesList.includes(target)) {
                          foundRegion = rName;
                          foundNation = nName;
                          foundCity = target;
                          break;
                      }
                  }
                  if (foundRegion) break;
              }

              if (foundCity && foundNation && foundRegion) {
                  setSelectedRegion(foundRegion);
                  setSelectedNation(foundNation);
                  setSelectedCity(foundCity);
                  setViewLevel('nation');
                  setListExpandedRegions({ [foundRegion]: true });
                  setListExpandedNations({ [foundNation]: true });
                  const pos = GEO_POSITIONS[foundCity] || GEO_POSITIONS[foundNation] || GEO_POSITIONS[foundRegion];
                  if (pos) {
                      setTimeout(() => centerOnPoint(pos.x, pos.y, 8.0), 100);
                  }
              } else if (foundNation && foundRegion) {
                  setSelectedRegion(foundRegion);
                  setSelectedNation(foundNation);
                  setViewLevel('continent');
                  setListExpandedRegions({ [foundRegion]: true });
                  setListExpandedNations({ [foundNation]: true });
                  const pos = GEO_POSITIONS[foundNation] || GEO_POSITIONS[foundRegion];
                  if (pos) {
                      setTimeout(() => centerOnPoint(pos.x, pos.y, 4.0), 100);
                  }
              } else if (foundRegion) {
                  setSelectedRegion(foundRegion);
                  setViewLevel('continent');
                  setListExpandedRegions({ [foundRegion]: true });
                  const pos = GEO_POSITIONS[foundRegion];
                  if (pos) {
                      setTimeout(() => centerOnPoint(pos.x, pos.y, 2.5), 100);
                  }
              } else if (GEO_POSITIONS[target]) {
                  const pos = GEO_POSITIONS[target];
                  setTimeout(() => centerOnPoint(pos.x, pos.y, 5.0), 100);
              }
          } else {
              // Pre-expand current region in list mode
              if (character.currentLocation?.region) {
                setListExpandedRegions({ [character.currentLocation.region]: true });
                setListExpandedNations({ [character.currentLocation.nation]: true });
              }

              // Trigger fit on open
              setTimeout(() => {
                fitMapToContainer();
              }, 50);
          }
      }
  }, [isOpen, character.currentLocation, initialTargetLocationName]);

  // Center on percentage point with specific zoom ratio
  const centerOnPoint = (pctX: number, pctY: number, zoomLevelMultiplier: number) => {
      if (!mapContainerRef.current) return;
      const { clientWidth, clientHeight } = mapContainerRef.current;
      
      const targetCanvasX = (pctX / 100) * MAP_CANVAS_WIDTH;
      const targetCanvasY = (pctY / 100) * MAP_CANVAS_HEIGHT;

      // Base fit scale
      const baseFitScale = Math.min(clientWidth / MAP_CANVAS_WIDTH, clientHeight / MAP_CANVAS_HEIGHT);
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, baseFitScale * zoomLevelMultiplier));

      const newX = (clientWidth / 2) - (targetCanvasX * newScale);
      const newY = (clientHeight / 2) - (targetCanvasY * newScale);

      setScale(newScale);
      setPosition({ x: newX, y: newY });
  };

  const handleBack = () => {
      if (viewLevel === 'nation') {
          setViewLevel('continent');
          setSelectedNation(null);
          setSelectedCity(null);
          if (selectedRegion) {
              const pos = GEO_POSITIONS[selectedRegion];
              if (pos) centerOnPoint(pos.x, pos.y, 2.5);
          }
      } else if (viewLevel === 'continent') {
          setViewLevel('world');
          setSelectedRegion(null);
          setSelectedNation(null);
          setSelectedCity(null);
          fitMapToContainer();
      }
  };

  const handleWheel = (e: React.WheelEvent) => {
      e.stopPropagation();
      if (!mapContainerRef.current) return;
      
      const { left, top } = mapContainerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - left;
      const mouseY = e.clientY - top;

      const delta = -e.deltaY * 0.003;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * (1 + delta)));
      
      const ratio = newScale / scale;
      const newX = mouseX - (mouseX - position.x) * ratio;
      const newY = mouseY - (mouseY - position.y) * ratio;

      setScale(newScale);
      setPosition({ x: newX, y: newY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => { setIsDragging(false); };
  
  const zoom = (factor: number) => {
      if (!mapContainerRef.current) return;
      const { clientWidth, clientHeight } = mapContainerRef.current;
      
      const centerX = clientWidth / 2;
      const centerY = clientHeight / 2;

      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
      const ratio = newScale / scale;

      const newX = centerX - (centerX - position.x) * ratio;
      const newY = centerY - (centerY - position.y) * ratio;

      setScale(newScale);
      setPosition({ x: newX, y: newY });
  };

  const zoomIn = () => zoom(1.3);
  const zoomOut = () => zoom(1 / 1.3);
  const resetView = () => { 
      fitMapToContainer();
      setViewLevel('world'); 
      if (realm === 'divine') {
          setSelectedRegion('신계');
      } else {
          setSelectedRegion(null); 
      }
      setSelectedNation(null); 
      setSelectedCity(null); 
      setSearchTerm('');
      setSearchResults([]);
  };

  useEffect(() => {
    if (searchTerm.trim().length < 1) {
        setSearchResults([]);
        return;
    }

    const results: {region: string, nation: string, city: string}[] = [];
    const term = searchTerm.toLowerCase();

    for (const region in WORLD_GEOGRAPHY) {
        if (realm === 'mortal' && region === '신계') continue;
        if (realm === 'divine' && region !== '신계') continue;

        for (const nation in WORLD_GEOGRAPHY[region]) {
            const nationData = WORLD_GEOGRAPHY[region][nation];
            
            // 국가 이름 검색
            if (nation.toLowerCase().includes(term)) {
                results.push({ region, nation, city: nationData.capital });
            }

            // 도시 이름 검색 및 인스턴트 던전/암시장 검색
            nationData.cities.forEach(city => {
                const hasCityMatch = city.toLowerCase().includes(term) && !nation.toLowerCase().includes(term);
                const cityDungeons = (instantDungeons || []).filter(d => d && d.city === city && d.nation === nation);
                const hasDungeonMatch = cityDungeons.some(d => d.name.toLowerCase().includes(term));
                const hasBlackMarketMatch = activeBlackMarket && activeBlackMarket.city === city && activeBlackMarket.nation === nation && (term.includes('암시장') || term.includes('비밀') || term.includes('암'));

                if (hasCityMatch || hasDungeonMatch || hasBlackMarketMatch) {
                    if (!results.some(r => r.city === city && r.nation === nation)) {
                        results.push({ region, nation, city });
                    }
                }
            });
        }
    }
    setSearchResults(results.slice(0, 15));
  }, [searchTerm, realm, instantDungeons, activeBlackMarket]);

  const handleSearchResultClick = (res: {region: string, nation: string, city: string}) => {
    if (res.region === '신계' && character.level < 500) {
        alert('신계는 500레벨 이상만 진입할 수 있습니다.');
        return;
    }

    setSelectedRegion(res.region);
    setSelectedNation(res.nation);
    setSelectedCity(res.city);
    
    if (displayMode === 'map') {
        if (res.region === '신계') {
            setRealm('divine');
        } else {
            setRealm('mortal');
        }
        setViewLevel('nation');
        const cityPos = GEO_POSITIONS[res.city];
        const nationPos = GEO_POSITIONS[res.nation];
        
        if (cityPos) {
            centerOnPoint(cityPos.x, cityPos.y, 8);
        } else if (nationPos) {
            centerOnPoint(nationPos.x, nationPos.y, 4);
        }
    } else {
        // Expand relevant accordion
        setListExpandedRegions(prev => ({ ...prev, [res.region]: true }));
        setListExpandedNations(prev => ({ ...prev, [res.nation]: true }));
    }
    
    setSearchTerm('');
    setSearchResults([]);
  };

  const toggleRealm = () => {
      if (character.level < 500) return;
      const nextRealm = realm === 'mortal' ? 'divine' : 'mortal';
      setRealm(nextRealm);
      setViewLevel('world');
      if (nextRealm === 'divine') {
          setSelectedRegion('신계');
      } else {
          setSelectedRegion(null);
      }
      setSelectedNation(null);
      setSelectedCity(null);
      fitMapToContainer();
  };

  const getTravelInfo = (targetCity: string, targetNation: string, targetRegion: string) => {
      const targetLoc = { region: targetRegion, nation: targetNation, city: targetCity };
      const calc = calculateTravelCostAndDays(originLocation, targetLoc, character);
      if (calc.isSameLocation) return null;

      let Icon = Footprints;
      if (calc.method.includes("차원 이동") || calc.method.includes("신성")) {
          Icon = Sparkles;
      } else if (calc.method.includes("비행선")) {
          Icon = Plane;
      } else if (calc.method.includes("마차")) {
          Icon = Truck;
      }

      return {
          cost: calc.cost,
          days: calc.days,
          totalMinutes: calc.totalMinutes,
          durationText: calc.durationText,
          method: calc.method,
          Icon
      };
  };
  const travelInfo = (selectedCity && selectedNation && selectedRegion) ? getTravelInfo(selectedCity, selectedNation, selectedRegion) : null;

  const handleTravelClick = () => {
      if (travelInfo && selectedCity && selectedNation && selectedRegion) {
          if (selectedRegion === '신계' && character.level < 500) {
              alert('신계는 500레벨 이상만 진입할 수 있습니다.');
              return;
          }
          if (mode === 'travel') {
              if (character.money < travelInfo.cost) { alert("골드가 부족합니다."); return; }
              onTravel({ region: selectedRegion, nation: selectedNation, city: selectedCity }, travelInfo.cost, travelInfo.days, travelInfo.totalMinutes);
          } else if (mode === 'relocate') {
              onTravel({ region: selectedRegion, nation: selectedNation, city: selectedCity }, 0, travelInfo.days, travelInfo.totalMinutes);
          }
      }
  };

  const handleNodeClick = (name: string, type: string) => {
      if (type === 'continent' && name === '신계' && character.level < 500) {
          alert('신계는 500레벨 이상만 진입할 수 있습니다.');
          return;
      }
      if (realm === 'divine' && character.level < 500) {
          alert('신계는 500레벨 이상만 진입할 수 있습니다.');
          return;
      }
      const pos = GEO_POSITIONS[name];
      if (type === 'continent') {
          setSelectedRegion(name);
          setViewLevel('continent');
          if (pos) centerOnPoint(pos.x, pos.y, 2.5); 
      } else if (type === 'nation') {
          setSelectedNation(name);
          setViewLevel('nation');
          const zoomLevel = (realm === 'divine' || name === '임페리얼 제국' || name === '미르탈 숲연합' || name === '레오니스 투기국' || name === '네크로디움 제국') ? 2.5 : (LARGE_NATIONS.includes(name) ? 4 : 8);
          if (pos) centerOnPoint(pos.x, pos.y, zoomLevel); 
      } else if (type === 'city') {
          setSelectedCity(name);
      }
  };

  const getVisibleNodes = (): MapNode[] => {
      const nodes: MapNode[] = [];
      if (viewLevel === 'world') {
          if (realm === 'mortal') {
              Object.keys(WORLD_GEOGRAPHY).filter(r => r !== '신계' && r !== '기타').forEach(region => {
                  const pos = GEO_POSITIONS[region];
                  const rifts = getRiftsForRegion(region);
                  const dungeons = getInstantDungeonsForRegion(region);
                  const bm = getBlackMarketForRegion(region);
                  if (pos) nodes.push({ 
                      name: region, 
                      x: pos.x, 
                      y: pos.y, 
                      type: 'continent',
                      hasRift: rifts.length > 0,
                      riftCount: rifts.length,
                      hasInstantDungeon: dungeons.length > 0,
                      instantDungeonCount: dungeons.length,
                      hasBlackMarket: !!bm
                  });
              });
          } else {
              Object.keys(WORLD_GEOGRAPHY['신계']).forEach(nation => {
                  const pos = GEO_POSITIONS[nation];
                  const rifts = getRiftsForNation(nation);
                  const dungeons = getInstantDungeonsForNation(nation);
                  const bm = getBlackMarketForNation(nation);
                  if (pos) nodes.push({ 
                      name: nation, 
                      x: pos.x, 
                      y: pos.y, 
                      type: 'nation',
                      hasRift: rifts.length > 0,
                      riftCount: rifts.length,
                      bossName: rifts.length === 1 ? (SEASONAL_BOSSES[rifts[0].bossKey]?.name || rifts[0].bossKey) : undefined,
                      hasInstantDungeon: dungeons.length > 0,
                      instantDungeonCount: dungeons.length,
                      instantDungeonName: dungeons.length === 1 ? dungeons[0].name : undefined,
                      instantDungeonLevel: dungeons.length === 1 ? dungeons[0].level : undefined,
                      hasBlackMarket: !!bm
                  });
              });
          }
      } else if (viewLevel === 'continent' && selectedRegion) {
          Object.keys(WORLD_GEOGRAPHY[selectedRegion]).forEach((nation, idx, arr) => {
              const regionPos = GEO_POSITIONS[selectedRegion] || { x: 50, y: 50 };
              const pos = GEO_POSITIONS[nation] || getProceduralPosition(nation, idx, arr.length, regionPos.x, regionPos.y);
              const rifts = getRiftsForNation(nation);
              const dungeons = getInstantDungeonsForNation(nation);
              const bm = getBlackMarketForNation(nation);
              nodes.push({ 
                  name: nation, 
                  x: pos.x, 
                  y: pos.y, 
                  type: 'nation',
                  hasRift: rifts.length > 0,
                  riftCount: rifts.length,
                  bossName: rifts.length === 1 ? (SEASONAL_BOSSES[rifts[0].bossKey]?.name || rifts[0].bossKey) : undefined,
                  hasInstantDungeon: dungeons.length > 0,
                  instantDungeonCount: dungeons.length,
                  instantDungeonName: dungeons.length === 1 ? dungeons[0].name : undefined,
                  instantDungeonLevel: dungeons.length === 1 ? dungeons[0].level : undefined,
                  hasBlackMarket: !!bm
              });
          });
      } else if (viewLevel === 'nation' && selectedNation) {
          let nationData = null;
          let region = selectedRegion;
          if (!region) {
              for (const r in WORLD_GEOGRAPHY) {
                  if (WORLD_GEOGRAPHY[r][selectedNation]) {
                      region = r;
                      nationData = WORLD_GEOGRAPHY[r][selectedNation];
                      break;
                  }
              }
          } else {
              nationData = WORLD_GEOGRAPHY[region][selectedNation];
          }

          if (nationData) {
              const nationPos = GEO_POSITIONS[selectedNation] || { x: 50, y: 50 };
              nationData.cities.forEach((city, idx, arr) => {
                  const pos = GEO_POSITIONS[city] || getProceduralPosition(city, idx, arr.length, nationPos.x, nationPos.y);
                  let tier: MapNode['tier'] = city === nationData.capital ? 'Capital' : 'City';
                  const rift = getRiftForCity(city, selectedNation || undefined);
                  const bossName = rift ? (SEASONAL_BOSSES[rift.bossKey]?.name || rift.bossKey) : undefined;
                  const dungeons = getInstantDungeonsForCity(city, selectedNation || undefined);
                  const bm = getBlackMarketForCity(city, selectedNation || undefined);
                  nodes.push({ 
                      name: city, 
                      x: pos.x, 
                      y: pos.y, 
                      type: 'city', 
                      tier,
                      hasRift: !!rift,
                      bossName,
                      hasInstantDungeon: dungeons.length > 0,
                      instantDungeonCount: dungeons.length,
                      instantDungeonName: dungeons.length > 0 ? dungeons[0].name : undefined,
                      instantDungeonLevel: dungeons.length > 0 ? dungeons[0].level : undefined,
                      hasBlackMarket: !!bm
                  });
              });
          }
      }
      return nodes;
  };

  const nodes = getVisibleNodes();

  // Continents list for List View
  const availableRegions = useMemo(() => {
      if (realm === 'divine') return ['신계'];
      return Object.keys(WORLD_GEOGRAPHY).filter(r => r !== '신계' && r !== '기타');
  }, [realm]);

  const toggleListRegion = (r: string) => {
      setListExpandedRegions(prev => ({ ...prev, [r]: !prev[r] }));
  };

  const toggleListNation = (n: string) => {
      setListExpandedNations(prev => ({ ...prev, [n]: !prev[n] }));
  };

  const handleSelectCityInList = (region: string, nation: string, city: string) => {
      if (region === '신계' && character.level < 500) {
          alert('신계는 500레벨 이상만 진입할 수 있습니다.');
          return;
      }
      setSelectedRegion(region);
      setSelectedNation(nation);
      setSelectedCity(city);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 font-sans animate-in fade-in duration-300">
      <div className={`w-full max-w-6xl h-[92vh] max-h-[880px] rounded-2xl border shadow-2xl flex flex-col relative overflow-hidden transition-colors duration-500 ${
          realm === 'divine' ? 'bg-indigo-950 border-amber-500/50' : 'bg-slate-950 border-slate-700'
      }`}>
        
        {/* TOP HEADER BAR */}
        <div className="px-4 py-3 bg-slate-900/95 border-b border-slate-800 z-40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            
            {/* Title & Navigation Path */}
            <div className="flex items-center gap-3">
                {displayMode === 'map' && ((realm === 'mortal' && viewLevel !== 'world') || (realm === 'divine' && viewLevel === 'nation')) && (
                    <button onClick={handleBack} className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-amber-500 transition-all shadow-md active:scale-95">
                        <ArrowLeft size={18} />
                    </button>
                )}
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg sm:text-xl font-black text-white font-cinzel flex items-center gap-1.5 drop-shadow">
                            {realm === 'divine' ? <CloudSun className="text-amber-400" size={20} /> : <Globe className="text-cyan-400" size={20} />}
                            <span>{realm === 'divine' ? '신계 영역도' : '세계 지도'}</span>
                        </h2>
                        {mode === 'relocate' && (
                            <span className="text-[10px] bg-amber-900/80 px-2 py-0.5 rounded-full font-bold text-amber-200 border border-amber-700">
                                기지 이사
                            </span>
                        )}
                    </div>
                    <div className="flex items-center text-[11px] text-slate-400 mt-0.5 gap-1 font-mono">
                        <MapPin size={11} className="text-emerald-400 shrink-0"/>
                        <span>{mode === 'relocate' ? '기지 현재 위치' : '현재 위치'}: <strong className="text-slate-200">{originLocation.region} › {originLocation.nation} › {originLocation.city}</strong></span>
                    </div>
                </div>
            </div>

            {/* Controls: Rift Quick Focus, Dungeon Quick Focus, Black Market, Mode Switch, Search, Realm Switch, Close */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap sm:flex-nowrap">
                
                {/* Dimensional Rift Quick Focus Dropdown */}
                {activeSeasonalRifts.length > 0 && (
                    <div className="relative">
                        <button 
                            onClick={() => {
                                setIsRiftListOpen(!isRiftListOpen);
                                setIsInstantDungeonListOpen(false);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-900/90 to-fuchsia-900/90 border border-fuchsia-500/80 text-fuchsia-200 hover:text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-950/50 backdrop-blur-md active:scale-95 transition-all animate-pulse"
                            title="이번 달 차원의 틈새 강림 지역"
                        >
                            <Sparkles size={14} className="text-amber-300 animate-spin" />
                            <span className="hidden xs:inline">차원의 틈새</span>
                            <span className="bg-fuchsia-600/90 text-white text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">{activeSeasonalRifts.length}</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isRiftListOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isRiftListOpen && (
                            <div className="absolute top-full right-0 sm:left-0 mt-2 w-72 bg-slate-950/95 border border-fuchsia-500/80 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                                <div className="text-[11px] font-black text-fuchsia-300 px-2 py-1 border-b border-purple-900/60 flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                        <Zap size={12} className="text-fuchsia-400" />
                                        {currentMonth}월 차원의 틈새 강림 목록
                                    </span>
                                    <span className="text-[9px] bg-fuchsia-950 text-fuchsia-300 px-1.5 py-0.5 rounded border border-fuchsia-800 font-bold">시즌보스</span>
                                </div>
                                <div className="mt-1.5 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                    {activeSeasonalRifts.map((rift, idx) => {
                                        const boss = SEASONAL_BOSSES[rift.bossKey];
                                        const bossName = boss?.name || rift.bossKey;
                                        
                                        // Find region
                                        let regionName = "알 수 없음";
                                        for (const r in WORLD_GEOGRAPHY) {
                                            if (WORLD_GEOGRAPHY[r][rift.nation]) {
                                                regionName = r;
                                                break;
                                            }
                                        }

                                        const isLockedDivine = regionName === '신계' && character.level < 500;

                                        return (
                                            <button
                                                key={`${rift.nation}-${rift.city}-${idx}`}
                                                onClick={() => {
                                                    if (isLockedDivine) {
                                                        alert('신계는 500레벨 이상만 진입할 수 있습니다.');
                                                        return;
                                                    }
                                                    if (regionName === '신계') {
                                                        setRealm('divine');
                                                    } else {
                                                        setRealm('mortal');
                                                    }
                                                    setSelectedRegion(regionName);
                                                    setSelectedNation(rift.nation);
                                                    setSelectedCity(rift.city);
                                                    if (displayMode === 'map') {
                                                        setViewLevel('nation');
                                                        const cityPos = GEO_POSITIONS[rift.city] || GEO_POSITIONS[rift.nation];
                                                        if (cityPos) {
                                                            centerOnPoint(cityPos.x, cityPos.y, 8);
                                                        }
                                                    } else {
                                                        setListExpandedRegions(prev => ({ ...prev, [regionName]: true }));
                                                        setListExpandedNations(prev => ({ ...prev, [rift.nation]: true }));
                                                    }
                                                    setIsRiftListOpen(false);
                                                }}
                                                className={`w-full p-2 rounded-xl border text-left transition-all flex items-center justify-between group ${
                                                    isLockedDivine 
                                                        ? 'bg-slate-900/60 border-slate-800 opacity-60 hover:opacity-80' 
                                                        : 'bg-purple-950/40 hover:bg-purple-900/60 border-fuchsia-900/50 hover:border-fuchsia-500/80'
                                                }`}
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-xs font-bold text-fuchsia-200 group-hover:text-white flex items-center gap-1 truncate">
                                                        {isLockedDivine ? <Lock size={12} className="text-amber-400 shrink-0" /> : <Sparkles size={11} className="text-amber-400 shrink-0" />}
                                                        <span className="truncate">{rift.city} ({rift.nation})</span>
                                                        {isLockedDivine && <span className="text-[9px] text-amber-400 bg-amber-950/80 px-1 rounded border border-amber-800">500레벨 필요</span>}
                                                    </div>
                                                    <div className="text-[10px] text-fuchsia-400/80 truncate">
                                                        보스: <strong className="text-amber-300">{bossName}</strong>
                                                    </div>
                                                </div>
                                                <Navigation size={13} className={isLockedDivine ? "text-slate-500" : "text-fuchsia-400 group-hover:scale-110 transition-transform shrink-0 ml-2"} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Instant Dungeon Quick Focus Dropdown */}
                {instantDungeons.length > 0 && (
                    <div className="relative">
                        <button 
                            onClick={() => {
                                setIsInstantDungeonListOpen(!isInstantDungeonListOpen);
                                setIsRiftListOpen(false);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-900/90 to-cyan-900/90 border border-cyan-500/80 text-cyan-200 hover:text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-950/50 backdrop-blur-md active:scale-95 transition-all"
                            title="발견된 인스턴트 던전 목록"
                        >
                            <Swords size={14} className="text-cyan-300" />
                            <span className="hidden xs:inline">인던</span>
                            <span className="bg-cyan-600/90 text-white text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">{instantDungeons.length}</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isInstantDungeonListOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isInstantDungeonListOpen && (
                            <div className="absolute top-full right-0 sm:left-0 mt-2 w-72 bg-slate-950/95 border border-cyan-500/80 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                                <div className="text-[11px] font-black text-cyan-300 px-2 py-1 border-b border-cyan-900/60 flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                        <Swords size={12} className="text-cyan-400" />
                                        발견된 인스턴트 던전 목록
                                    </span>
                                    <span className="text-[9px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800 font-bold">{instantDungeons.length}개 발견됨</span>
                                </div>
                                <div className="mt-1.5 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                    {instantDungeons.map((dungeon, idx) => {
                                        // Find region
                                        let regionName = "알 수 없음";
                                        for (const r in WORLD_GEOGRAPHY) {
                                            if (WORLD_GEOGRAPHY[r][dungeon.nation]) {
                                                regionName = r;
                                                break;
                                            }
                                        }

                                        const isLockedDivine = regionName === '신계' && character.level < 500;

                                        return (
                                            <button
                                                key={`${dungeon.id || dungeon.name}-${idx}`}
                                                onClick={() => {
                                                    if (isLockedDivine) {
                                                        alert('신계는 500레벨 이상만 진입할 수 있습니다.');
                                                        return;
                                                    }
                                                    if (regionName === '신계') {
                                                        setRealm('divine');
                                                    } else {
                                                        setRealm('mortal');
                                                    }
                                                    setSelectedRegion(regionName);
                                                    setSelectedNation(dungeon.nation);
                                                    setSelectedCity(dungeon.city);
                                                    if (displayMode === 'map') {
                                                        setViewLevel('nation');
                                                        const cityPos = GEO_POSITIONS[dungeon.city] || GEO_POSITIONS[dungeon.nation];
                                                        if (cityPos) {
                                                            centerOnPoint(cityPos.x, cityPos.y, 8);
                                                        }
                                                    } else {
                                                        setListExpandedRegions(prev => ({ ...prev, [regionName]: true }));
                                                        setListExpandedNations(prev => ({ ...prev, [dungeon.nation]: true }));
                                                    }
                                                    setIsInstantDungeonListOpen(false);
                                                }}
                                                className={`w-full p-2 rounded-xl border text-left transition-all flex items-center justify-between group ${
                                                    isLockedDivine
                                                        ? 'bg-slate-900/60 border-slate-800 opacity-60 hover:opacity-80'
                                                        : 'bg-cyan-950/40 hover:bg-cyan-900/60 border-cyan-900/50 hover:border-cyan-500/80'
                                                }`}
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-xs font-bold text-cyan-200 group-hover:text-white flex items-center gap-1 truncate">
                                                        <Swords size={11} className="text-cyan-400 shrink-0" />
                                                        <span className="truncate">{dungeon.name}</span>
                                                        <span className="text-[9px] bg-cyan-900 text-cyan-200 px-1 rounded border border-cyan-700">권장 {dungeon.level}레벨</span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 truncate">
                                                        위치: <strong className="text-slate-200">{dungeon.city} ({dungeon.nation})</strong>
                                                    </div>
                                                </div>
                                                <Navigation size={13} className="text-cyan-400 group-hover:scale-110 transition-transform shrink-0 ml-2" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Black Market Quick Jump Button */}
                {activeBlackMarket && (
                    <button 
                        onClick={() => {
                            const regionName = activeBlackMarket.region;
                            if (regionName === '신계' && character.level < 500) {
                                alert('신계는 500레벨 이상만 진입할 수 있습니다.');
                                return;
                            }
                            if (regionName === '신계') {
                                setRealm('divine');
                            } else {
                                setRealm('mortal');
                            }
                            setSelectedRegion(regionName);
                            setSelectedNation(activeBlackMarket.nation);
                            setSelectedCity(activeBlackMarket.city);
                            if (displayMode === 'map') {
                                setViewLevel('nation');
                                const cityPos = GEO_POSITIONS[activeBlackMarket.city] || GEO_POSITIONS[activeBlackMarket.nation];
                                if (cityPos) {
                                    centerOnPoint(cityPos.x, cityPos.y, 8);
                                }
                            } else {
                                setListExpandedRegions(prev => ({ ...prev, [regionName]: true }));
                                setListExpandedNations(prev => ({ ...prev, [activeBlackMarket.nation]: true }));
                            }
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-900/90 to-yellow-900/90 border border-yellow-500/80 text-yellow-200 hover:text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-950/50 backdrop-blur-md active:scale-95 transition-all"
                        title={`개방된 특별상점 위치: ${activeBlackMarket.city} (${activeBlackMarket.nation})`}
                    >
                        <span>💰</span>
                        <span className="hidden xs:inline">특별상점: {activeBlackMarket.city}</span>
                    </button>
                )}

                {/* Switch View Mode (Map vs List) */}
                <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 shadow-inner">
                    <button 
                        onClick={() => setDisplayMode('map')} 
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            displayMode === 'map' 
                                ? 'bg-cyan-600 text-white shadow-md' 
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="지도로 보기"
                    >
                        <MapIcon size={14} />
                        <span>지도</span>
                    </button>
                    <button 
                        onClick={() => setDisplayMode('list')} 
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            displayMode === 'list' 
                                ? 'bg-cyan-600 text-white shadow-md' 
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="대륙별 리스트로 보기"
                    >
                        <List size={14} />
                        <span>리스트</span>
                    </button>
                    <button 
                        onClick={() => setDisplayMode('favorites')} 
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            displayMode === 'favorites' 
                                ? 'bg-amber-600 text-white shadow-md' 
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="즐겨찾기 목록 보기"
                    >
                        <Star size={14} className={displayMode === 'favorites' ? 'fill-white' : ''} />
                        <span>즐겨찾기</span>
                    </button>
                </div>

                {/* Search Box */}
                <div className="relative flex-1 sm:w-56">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <Search size={14} className="text-slate-500" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="도시/국가/던전/특별상점 검색..."
                        className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl py-1.5 pl-8 pr-3 focus:outline-none focus:border-cyan-500 transition-all placeholder:text-slate-600"
                    />
                    {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl z-50 max-h-64 overflow-y-auto custom-scrollbar">
                            {searchResults.map((res, idx) => {
                                const hasRift = !!getRiftForCity(res.city, res.nation);
                                const dungeons = getInstantDungeonsForCity(res.city, res.nation);
                                const bm = getBlackMarketForCity(res.city, res.nation);
                                return (
                                    <button
                                        key={`${res.nation}-${res.city}-${idx}`}
                                        onClick={() => handleSearchResultClick(res)}
                                        className={`w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center justify-between border-b border-slate-800 last:border-0 transition-colors ${
                                            hasRift ? 'bg-purple-950/40 hover:bg-purple-900/50' : bm ? 'bg-amber-950/30 hover:bg-amber-900/40' : dungeons.length > 0 ? 'bg-cyan-950/30 hover:bg-cyan-900/40' : ''
                                        }`}
                                    >
                                        <div>
                                            <div className="text-xs font-bold text-white flex items-center gap-1 flex-wrap">
                                                <span>{res.city}</span>
                                                {WORLD_GEOGRAPHY[res.region]?.[res.nation]?.capital === res.city && (
                                                    <Crown size={11} className="text-amber-400" />
                                                )}
                                                {hasRift && (
                                                    <span className="text-[9px] bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white px-1.5 py-0.2 rounded border border-fuchsia-400 font-extrabold flex items-center gap-0.5 shadow-sm">
                                                        <Sparkles size={9} className="text-amber-300" /> 차원의 틈새
                                                    </span>
                                                )}
                                                {bm && (
                                                    <span className="text-[9px] bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 px-1.5 py-0.2 rounded border border-yellow-400 font-black shadow-sm flex items-center gap-0.5">
                                                        💰 특별상점
                                                    </span>
                                                )}
                                                {dungeons.length > 0 && (
                                                    <span className="text-[9px] bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-1.5 py-0.2 rounded border border-cyan-400 font-extrabold shadow-sm flex items-center gap-0.5">
                                                        <Swords size={9} className="text-cyan-200" /> {dungeons[0].name}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-slate-400">{res.region} › {res.nation}</div>
                                        </div>
                                        <Navigation size={12} className={hasRift ? "text-fuchsia-400" : bm ? "text-amber-400" : dungeons.length > 0 ? "text-cyan-400" : "text-slate-400"} />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Divine Realm Toggle Button */}
                <div className="relative group">
                    <button 
                        onClick={toggleRealm} 
                        disabled={character.level < 500}
                        className={`p-2 rounded-xl border shadow-md transition-all flex items-center justify-center ${
                            character.level >= 500 
                            ? realm === 'divine'
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 border-amber-300 text-slate-950 shadow-md shadow-amber-500/30 hover:scale-105'
                                : 'bg-amber-950/50 border-amber-600/60 text-amber-300 hover:bg-amber-900/70 hover:text-amber-100 hover:scale-105' 
                            : 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed opacity-60'
                        }`}
                        title={character.level < 500 ? "신계 진입 (500레벨 필요)" : (realm === 'divine' ? "인간계(세계 지도)로 전환" : "신계(성역 지도)로 전환")}
                    >
                        {character.level < 500 ? <Lock size={18} className="text-slate-500" /> : <Sun size={18} className={realm === 'divine' ? 'animate-spin-slow' : ''} />}
                    </button>
                    <div className="absolute right-0 top-full mt-1 bg-black/90 text-amber-300 text-[10px] px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 border border-amber-500/30 pointer-events-none">
                        {character.level < 500 ? "신계 진입 (500레벨 필요)" : (realm === 'divine' ? "인간계 전환" : "신계 전환")}
                    </div>
                </div>

                {/* Close Button */}
                <button onClick={onClose} className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                    <X size={18} />
                </button>
            </div>
        </div>

        {/* MAIN CONTENT: MAP MODE VS LIST MODE */}
        {displayMode === 'map' && (
            /* =================== MAP VIEW =================== */
            <div 
                ref={mapContainerRef}
                className={`flex-1 relative overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${
                    realm === 'divine' ? 'bg-[#151632]' : 'bg-[#090b10]'
                }`}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Floating Map Zoom Tools */}
                <div className="absolute top-4 right-4 z-40 flex flex-col gap-1.5 pointer-events-auto bg-slate-900/90 border border-slate-800 p-1 rounded-xl shadow-2xl backdrop-blur-md">
                    <button onClick={zoomIn} className="p-2 text-slate-300 rounded-lg hover:text-white hover:bg-slate-800 active:scale-95 transition-all" title="확대"><ZoomIn size={16}/></button>
                    <button onClick={zoomOut} className="p-2 text-slate-300 rounded-lg hover:text-white hover:bg-slate-800 active:scale-95 transition-all" title="축소"><ZoomOut size={16}/></button>
                    <div className="h-px bg-slate-800 my-0.5" />
                    <button onClick={resetView} className="p-2 text-slate-300 rounded-lg hover:text-white hover:bg-slate-800 active:scale-95 transition-all" title="화면 맞춤"><Maximize size={16}/></button>
                </div>

                {/* Breadcrumb Indicator on Map */}
                <div className="absolute top-4 left-4 z-30 pointer-events-none">
                    <div className="px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-1.5 shadow-lg">
                        <Compass size={14} className="text-cyan-400" />
                        <span>{selectedRegion ? selectedRegion : '전체 대륙'}</span>
                        {selectedNation && (
                            <>
                                <ChevronRight size={12} className="text-slate-500" />
                                <span className="text-amber-400">{selectedNation}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Fixed-Size Virtual Coordinate Map Canvas (2000 x 1000) */}
                <div 
                    className="absolute transform-gpu origin-top-left"
                    style={{ 
                        width: `${MAP_CANVAS_WIDTH}px`,
                        height: `${MAP_CANVAS_HEIGHT}px`,
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                >
                    {/* World Map Background Layer */}
                    {realm === 'divine' ? (
                        <>
                            {/* Base Heavenly Atmosphere */}
                            <div className="absolute inset-0 bg-gradient-to-b from-sky-900/90 via-indigo-950/80 to-amber-950/70" />
                            
                            {/* Celestial Cloud Sea High Definition Image */}
                            <img 
                                src={DIVINE_MAP_URL} 
                                alt="신계 구름 바다" 
                                className="absolute inset-0 w-full h-full object-cover opacity-85 pointer-events-none select-none filter contrast-110 brightness-105"
                                draggable="false"
                                referrerPolicy="no-referrer"
                            />

                            {/* Holy Sunbeams & Celestial Glow Overlays */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                {/* Top Celestial Light Source */}
                                <div className="absolute -top-1/4 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] bg-gradient-to-b from-amber-200/25 via-amber-400/10 to-transparent blur-3xl rounded-full pointer-events-none" />
                                
                                {/* Holy Radial Rays / Sanctuaries Auras */}
                                <div className="absolute top-[20%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-300/15 blur-2xl rounded-full" />
                                <div className="absolute top-[50%] left-[75%] -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-300/15 blur-2xl rounded-full" />
                                <div className="absolute top-[50%] left-[25%] -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-300/15 blur-2xl rounded-full" />
                                <div className="absolute top-[80%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-300/10 blur-2xl rounded-full" />

                                {/* Bottom Heavenly Cloud Mist */}
                                <div className="absolute bottom-0 left-0 right-0 h-[350px] bg-gradient-to-t from-white/20 via-amber-100/10 to-transparent blur-xl" />
                            </div>

                            {/* Sacred Constellations & Leylines connecting Divine Sanctuaries */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60">
                                <defs>
                                    <linearGradient id="divineLineGold" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#fde047" stopOpacity="0.8" />
                                        <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
                                        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.8" />
                                    </linearGradient>
                                    <linearGradient id="divineLineCyan" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.7" />
                                        <stop offset="100%" stopColor="#818cf8" stopOpacity="0.5" />
                                    </linearGradient>
                                    <filter id="divineGlow" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="3" result="blur" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>
                                </defs>

                                {/* Sacred Central Rings & Mandalas (Centered at 1000px, 500px) */}
                                <circle cx="1000" cy="500" r="380" fill="none" stroke="url(#divineLineGold)" strokeWidth="1.5" strokeDasharray="12 8" opacity="0.4" filter="url(#divineGlow)" />
                                <circle cx="1000" cy="500" r="420" fill="none" stroke="#fbbf24" strokeWidth="0.8" opacity="0.25" />
                                <circle cx="1000" cy="500" r="180" fill="none" stroke="url(#divineLineCyan)" strokeWidth="1" strokeDasharray="8 6" opacity="0.35" />
                                <circle cx="1000" cy="500" r="60" fill="none" stroke="#fef08a" strokeWidth="1.5" opacity="0.5" />

                                {/* Diamond Formation Connecting 4 Primary Divine Sanctuaries */}
                                {/* Top (1000, 200) - Right (1500, 500) - Bottom (1000, 800) - Left (500, 500) */}
                                <path 
                                    d="M 1000 200 L 1500 500 L 1000 800 L 500 500 Z" 
                                    fill="none" 
                                    stroke="url(#divineLineGold)" 
                                    strokeWidth="1.8" 
                                    strokeDasharray="6 4"
                                    opacity="0.65" 
                                    filter="url(#divineGlow)" 
                                />

                                {/* Cross Leylines through Central Hub */}
                                <line x1="1000" y1="200" x2="1000" y2="800" stroke="url(#divineLineGold)" strokeWidth="1" strokeDasharray="4 6" opacity="0.4" />
                                <line x1="500" y1="500" x2="1500" y2="500" stroke="url(#divineLineGold)" strokeWidth="1" strokeDasharray="4 6" opacity="0.4" />

                                {/* Sub Leylines within Divine Nations */}
                                {viewLevel === 'nation' && (
                                    <>
                                        {/* Golden Sanctuary Nodes connection lines */}
                                        <circle cx="1000" cy="200" r="120" fill="none" stroke="#fde047" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                                        <circle cx="1500" cy="500" r="140" fill="none" stroke="#fde047" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                                        <circle cx="500" cy="500" r="140" fill="none" stroke="#fde047" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                                        <circle cx="1000" cy="800" r="120" fill="none" stroke="#fde047" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                                    </>
                                )}
                            </svg>
                        </>
                    ) : (
                        <img 
                            src={MORTAL_MAP_URL} 
                            alt="World Map" 
                            className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none opacity-40 filter sepia hue-rotate-180 invert-[.8]"
                            draggable="false"
                        />
                    )}

                    {/* Nodes Render Layer (Coordinates purely in 2000x1000 plane) */}
                    <div className="absolute inset-0 w-full h-full">
                        {nodes.map((node) => {
                            const isCurrent = node.name === currentLocation.city || node.name === currentLocation.nation;
                            const isSelected = selectedCity === node.name || selectedRegion === node.name || selectedNation === node.name;
                            const hasRift = node.hasRift;
                            const hasInstantDungeon = node.hasInstantDungeon;
                            const hasBlackMarket = node.hasBlackMarket;

                            // Dynamic sizing in pixel space so markers remain legible at various zooms
                            let markerDiameter = 32;
                            let textFontSize = 13;

                            if (node.type === 'continent') {
                                markerDiameter = 40;
                                textFontSize = 14;
                            } else if (node.type === 'nation') {
                                markerDiameter = 28;
                                textFontSize = 12;
                            } else if (node.type === 'city') {
                                markerDiameter = node.tier === 'Capital' ? 24 : 18;
                                textFontSize = node.tier === 'Capital' ? 12 : 10;
                            }

                            // Calculate actual pixel position inside 2000x1000 canvas
                            const pixelX = (node.x / 100) * MAP_CANVAS_WIDTH;
                            const pixelY = (node.y / 100) * MAP_CANVAS_HEIGHT;

                            return (
                                <button
                                    key={node.name}
                                    onClick={(e) => { e.stopPropagation(); handleNodeClick(node.name, node.type); }}
                                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group z-20 outline-none cursor-pointer"
                                    style={{ left: `${pixelX}px`, top: `${pixelY}px` }}
                                >
                                    {/* Dimensional Rift Outer Ping Effect */}
                                    {hasRift && (
                                        <div className="absolute inset-0 -m-3 rounded-full bg-purple-600/30 border border-fuchsia-400/80 animate-ping pointer-events-none" />
                                    )}
                                    {!hasRift && hasBlackMarket && (
                                        <div className="absolute inset-0 -m-2 rounded-full bg-amber-500/30 border border-yellow-400/80 animate-ping pointer-events-none" />
                                    )}
                                    {!hasRift && !hasBlackMarket && hasInstantDungeon && (
                                        <div className="absolute inset-0 -m-2 rounded-full bg-cyan-500/30 border border-cyan-400/80 animate-ping pointer-events-none" />
                                    )}

                                    <div 
                                        className={`
                                            rounded-full flex items-center justify-center border-2 transition-transform duration-200 shadow-xl relative
                                            ${hasRift 
                                                ? 'bg-purple-950 border-fuchsia-400 text-fuchsia-200 ring-4 ring-purple-500/60 shadow-[0_0_25px_rgba(192,38,211,0.9)] animate-bounce z-40'
                                                : isCurrent 
                                                ? 'bg-emerald-600 border-emerald-300 z-30 animate-pulse ring-4 ring-emerald-400/40' 
                                                : isSelected 
                                                ? 'bg-amber-600 border-amber-300 z-30 ring-4 ring-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.6)]' 
                                                : realm === 'divine' 
                                                ? 'bg-gradient-to-br from-amber-600 to-amber-900 border-amber-300 hover:border-yellow-200 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.5)] ring-2 ring-amber-400/30' 
                                                : 'bg-slate-900 border-slate-500 hover:border-cyan-400'}
                                            group-hover:scale-125
                                        `}
                                        style={{ 
                                            width: `${markerDiameter}px`, 
                                            height: `${markerDiameter}px`,
                                        }}
                                    >
                                        {/* Dimensional Rift Badge Icon */}
                                        {hasRift && (
                                            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 border border-fuchsia-300 text-white rounded-full p-0.5 shadow-lg animate-pulse z-50">
                                                <Sparkles size={11} className="text-amber-200" />
                                            </div>
                                        )}
                                        {hasBlackMarket && (
                                            <div className="absolute -top-2 -left-2 bg-gradient-to-r from-amber-600 to-yellow-600 border border-yellow-300 text-slate-950 rounded-full p-0.5 shadow-lg z-50 text-[9px] font-black w-4 h-4 flex items-center justify-center">
                                                💰
                                            </div>
                                        )}
                                        {hasInstantDungeon && !hasRift && (
                                            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-600 to-cyan-600 border border-cyan-300 text-white rounded-full p-0.5 shadow-lg z-50">
                                                <Swords size={11} className="text-cyan-200" />
                                            </div>
                                        )}

                                        {node.type === 'continent' && <Globe size={markerDiameter * 0.55} className={hasRift ? "text-fuchsia-200" : realm === 'divine' ? "text-amber-200" : "text-slate-200"} />}
                                        {node.type === 'nation' && (
                                            realm === 'divine' 
                                                ? <Sun size={markerDiameter * 0.6} className={hasRift ? "text-fuchsia-200" : "text-amber-200 animate-[spin_10s_linear_infinite]"} />
                                                : <Flag size={markerDiameter * 0.55} className={hasRift ? "text-fuchsia-200" : "text-slate-200"} />
                                        )}
                                        {node.type === 'city' && (
                                            node.tier === 'Capital' 
                                                ? <Crown size={markerDiameter * 0.6} className={hasRift ? "text-fuchsia-200" : "text-amber-300"} /> 
                                                : <Building2 size={markerDiameter * 0.55} className={hasRift ? "text-fuchsia-200" : realm === 'divine' ? "text-amber-200" : "text-slate-300"} />
                                        )}
                                    </div>

                                    <div className="mt-1 flex flex-col items-center gap-0.5 pointer-events-none">
                                        <div 
                                            className={`px-2 py-0.5 rounded-md font-bold whitespace-nowrap shadow-lg backdrop-blur-md border transition-all flex items-center gap-1
                                                ${hasRift 
                                                    ? 'bg-purple-950/95 border-fuchsia-500 text-fuchsia-100 shadow-purple-900/80 ring-1 ring-fuchsia-400/50 animate-pulse'
                                                    : isCurrent 
                                                    ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200 shadow-emerald-900/50' 
                                                    : isSelected
                                                    ? 'bg-blue-950/90 border-cyan-400 text-cyan-200 shadow-cyan-900/50'
                                                    : realm === 'divine'
                                                    ? 'bg-amber-950/90 border-amber-500/80 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.4)] group-hover:border-amber-300'
                                                    : 'bg-black/75 border-slate-800 text-slate-200 group-hover:border-slate-600'}
                                            `}
                                            style={{ fontSize: `${textFontSize}px` }}
                                        >
                                            {hasRift && <Zap size={11} className="text-fuchsia-400 shrink-0" />}
                                            <span>{node.name}</span>
                                        </div>

                                        {/* Badges for Rift, Instant Dungeon, Black Market */}
                                        {(hasRift || hasBlackMarket || hasInstantDungeon) && (
                                            <div className="flex flex-wrap gap-0.5 justify-center max-w-[200px]">
                                                {hasRift && (
                                                    <span className="text-[9px] bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white px-1.5 py-0.2 rounded border border-fuchsia-300 font-extrabold shadow-sm flex items-center gap-0.5">
                                                        {node.bossName ? `🌀 ${node.bossName}` : `🌌 틈새(${node.riftCount})`}
                                                    </span>
                                                )}
                                                {hasBlackMarket && (
                                                    <span className="text-[9px] bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 px-1.5 py-0.2 rounded border border-yellow-300 font-black shadow-sm flex items-center gap-0.5">
                                                        💰 특별상점
                                                    </span>
                                                )}
                                                {hasInstantDungeon && (
                                                    <span className="text-[9px] bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-1.5 py-0.2 rounded border border-cyan-300 font-extrabold shadow-sm flex items-center gap-0.5">
                                                        {node.instantDungeonName ? `🏰 ${node.instantDungeonName}` : `⚔️ 던전(${node.instantDungeonCount})`}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        )}
        
        {displayMode === 'list' && (
            /* =================== LIST VIEW (대륙별 리스트로 찾기) =================== */
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-950">
                
                {/* Left Sidebar: Continent Filter Buttons */}
                <div className="w-full md:w-56 bg-slate-900/90 border-r border-slate-800 p-3 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto shrink-0 custom-scrollbar">
                    <div className="hidden md:block text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 py-1">
                        대륙 목록 ({availableRegions.length})
                    </div>
                    <button
                        onClick={() => setListSelectedRegionFilter('ALL')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold text-left whitespace-nowrap transition-all flex items-center justify-between ${
                            listSelectedRegionFilter === 'ALL'
                                ? 'bg-cyan-600 text-white shadow-md'
                                : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                    >
                        <span>전체 대륙 보기</span>
                        <Globe size={14} />
                    </button>
                    {availableRegions.map(region => (
                        <button
                            key={region}
                            onClick={() => setListSelectedRegionFilter(region)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold text-left whitespace-nowrap transition-all flex items-center justify-between ${
                                listSelectedRegionFilter === region
                                    ? 'bg-cyan-600 text-white shadow-md'
                                    : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                            }`}
                        >
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="truncate">{region}</span>
                                {character.currentLocation?.region === region && (
                                    <span className="text-[9px] bg-red-950/80 text-red-400 border border-red-800 px-1 py-0.2 rounded font-black shrink-0">
                                        현재 위치
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-slate-400 font-mono">
                                {Object.keys(WORLD_GEOGRAPHY[region] || {}).length}개국
                            </span>
                        </button>
                    ))}
                </div>

                {/* Right: Nested Hierarchy Accordion (Continent -> Nation -> Cities) */}
                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
                    {availableRegions
                        .filter(region => listSelectedRegionFilter === 'ALL' || listSelectedRegionFilter === region)
                        .map(region => {
                            const nations = WORLD_GEOGRAPHY[region] || {};
                            const isRegionExpanded = listExpandedRegions[region] ?? true;

                            return (
                                <div key={region} className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
                                    
                                    {/* Region Accordion Header */}
                                    <button 
                                        onClick={() => toggleListRegion(region)}
                                        className="w-full px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-950 hover:from-slate-850 flex items-center justify-between border-b border-slate-800/80 transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className={`p-1.5 rounded-lg ${region === '신계' ? 'bg-amber-950 border border-amber-800 text-amber-400' : 'bg-cyan-950 border border-cyan-800 text-cyan-400'}`}>
                                                {region === '신계' ? <Sun size={16} /> : <Globe size={16} />}
                                            </div>
                                            <div className="text-left">
                                                <span className="text-sm font-black text-slate-100 font-cinzel">{region}</span>
                                                <span className="ml-2 text-[11px] text-slate-400">({Object.keys(nations).length}개 국가)</span>
                                            </div>
                                        </div>
                                        <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${isRegionExpanded ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Nations Grid / List */}
                                    {isRegionExpanded && (
                                        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 bg-black/20">
                                            {Object.keys(nations).map(nationName => {
                                                const nationData = nations[nationName];
                                                const isNationExpanded = listExpandedNations[nationName] ?? true;
                                                const isCurrentNation = currentLocation.nation === nationName;

                                                return (
                                                    <div 
                                                        key={nationName} 
                                                        className={`rounded-xl border transition-all ${
                                                            isCurrentNation 
                                                                ? 'bg-emerald-950/20 border-emerald-700/60' 
                                                                : 'bg-slate-950/80 border-slate-800/90'
                                                        }`}
                                                    >
                                                        {/* Nation Header */}
                                                        <div 
                                                            onClick={() => toggleListNation(nationName)}
                                                            className="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-900/60 rounded-t-xl transition-colors"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Flag size={14} className={isCurrentNation ? 'text-emerald-400' : 'text-slate-400'} />
                                                                <span className="text-xs font-black text-slate-200">{nationName}</span>
                                                                {isCurrentNation && (
                                                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-900/80 border border-emerald-700 text-emerald-300 font-bold">
                                                                        현재 위치
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-slate-500 font-mono">
                                                                    수도: {nationData.capital}
                                                                </span>
                                                                <ChevronDown size={14} className={`text-slate-500 transition-transform ${isNationExpanded ? 'rotate-180' : ''}`} />
                                                            </div>
                                                        </div>

                                                        {/* City List Pills */}
                                                        {isNationExpanded && (
                                                            <div className="p-2.5 pt-1 border-t border-slate-900 flex flex-wrap gap-1.5">
                                                                {nationData.cities.map(cityName => {
                                                                    const isCapital = cityName === nationData.capital;
                                                                    const isCurrentCity = currentLocation.city === cityName && currentLocation.nation === nationName;
                                                                    const isSelectedCity = selectedCity === cityName && selectedNation === nationName;
                                                                    const rift = getRiftForCity(cityName, nationName);
                                                                    const bossName = rift ? (SEASONAL_BOSSES[rift.bossKey]?.name || rift.bossKey) : undefined;
                                                                    const dungeons = getInstantDungeonsForCity(cityName, nationName);
                                                                    const bm = getBlackMarketForCity(cityName, nationName);

                                                                    return (
                                                                        <button
                                                                            key={cityName}
                                                                            onClick={() => handleSelectCityInList(region, nationName, cityName)}
                                                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                                                                                rift
                                                                                    ? 'bg-purple-950/90 border border-fuchsia-500 text-fuchsia-200 hover:bg-purple-900/90 shadow-md ring-1 ring-fuchsia-500/50'
                                                                                    : isCurrentCity 
                                                                                    ? 'bg-emerald-600 text-white font-bold shadow-md' 
                                                                                    : isSelectedCity
                                                                                    ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400 shadow-md'
                                                                                    : isCapital
                                                                                    ? 'bg-amber-950/40 border border-amber-700/60 text-amber-300 hover:bg-amber-900/60'
                                                                                    : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white'
                                                                            }`}
                                                                        >
                                                                            {rift && <Sparkles size={12} className="text-amber-300 animate-spin" />}
                                                                            {bm && <span>💰</span>}
                                                                            {dungeons.length > 0 && !rift && !bm && <Swords size={12} className="text-cyan-400" />}
                                                                            {isCapital && !rift && !bm && dungeons.length === 0 && <Crown size={11} className={isCurrentCity || isSelectedCity ? 'text-white' : 'text-amber-400'} />}
                                                                            <span>{cityName}</span>
                                                                            {isCapital && !rift && !bm && dungeons.length === 0 && <span className="text-[9px] opacity-75 font-normal">수도</span>}
                                                                            {rift && (
                                                                                <span className="text-[9px] bg-fuchsia-600/90 text-white px-1 py-0.2 rounded font-extrabold shadow-sm">
                                                                                    {bossName ? `🌀 ${bossName}` : '🌌 틈새'}
                                                                                </span>
                                                                            )}
                                                                            {bm && (
                                                                                <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded border border-yellow-300 shadow-sm">
                                                                                    특별상점
                                                                                </span>
                                                                            )}
                                                                            {dungeons.length > 0 && (
                                                                                <span className="text-[9px] bg-cyan-600/90 text-white px-1.5 py-0.2 rounded font-extrabold shadow-sm">
                                                                                    {dungeons.length === 1 ? `🏰 ${dungeons[0].name}` : `⚔️ 던전(${dungeons.length})`}
                                                                                </span>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </div>
            </div>
        )}

        {displayMode === 'favorites' && (
            /* =================== FAVORITES VIEW =================== */
            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 custom-scrollbar">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-xl font-black text-amber-500 mb-4 flex items-center gap-2">
                        <Star size={24} className="fill-amber-500" />
                        즐겨찾는 도시
                    </h2>
                    
                    {favorites.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800">
                            <Star size={48} className="mb-4 opacity-20" />
                            <p className="text-sm">즐겨찾는 도시가 없습니다.</p>
                            <p className="text-xs mt-1">도시 선택 화면에서 별표 버튼을 눌러 추가해보세요.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {favorites.map((fav, idx) => {
                                const isCurrent = currentLocation.city === fav.city && currentLocation.nation === fav.nation;
                                let region = fav.region;
                                if (!WORLD_GEOGRAPHY[region]?.[fav.nation]) {
                                    for (const r in WORLD_GEOGRAPHY) {
                                        if (WORLD_GEOGRAPHY[r]?.[fav.nation]) {
                                            region = r;
                                            break;
                                        }
                                    }
                                }
                                const nationData = WORLD_GEOGRAPHY[region]?.[fav.nation];
                                const isCapital = nationData?.capital === fav.city;
                                const rift = getRiftForCity(fav.city, fav.nation);
                                const bossName = rift ? (SEASONAL_BOSSES[rift.bossKey]?.name || rift.bossKey) : undefined;
                                const dungeons = getInstantDungeonsForCity(fav.city, fav.nation);
                                const bm = getBlackMarketForCity(fav.city, fav.nation);
                                
                                return (
                                    <button 
                                        key={`${fav.region}-${fav.nation}-${fav.city}-${idx}`}
                                        onClick={() => {
                                            if (region === '신계' && character.level < 500) {
                                                alert('신계는 500레벨 이상만 진입할 수 있습니다.');
                                                return;
                                            }
                                            setSelectedRegion(region || fav.region);
                                            setSelectedNation(fav.nation);
                                            setSelectedCity(fav.city);
                                            setDisplayMode('map');
                                            setViewLevel('nation');
                                            const cityPos = GEO_POSITIONS[fav.city] || GEO_POSITIONS[fav.nation];
                                            if (cityPos) {
                                                centerOnPoint(cityPos.x, cityPos.y, 8);
                                            }
                                        }}
                                        className="relative p-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-500 hover:bg-slate-800 transition-all text-left flex items-start gap-3 shadow-sm group"
                                    >
                                        <div className={`p-2 rounded-lg shrink-0 ${isCurrent ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-amber-400 group-hover:bg-amber-500/20'}`}>
                                            <Star size={16} className={isCurrent ? '' : 'fill-amber-400'} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[10px] font-bold text-slate-500 truncate uppercase flex items-center gap-1">
                                                {region || fav.region} <ChevronRight size={10} className="inline" /> {fav.nation}
                                            </div>
                                            <div className="text-sm font-black text-white truncate mt-0.5 group-hover:text-amber-400 transition-colors flex items-center gap-1">
                                                <span>{fav.city}</span>
                                                {isCapital && <Crown size={12} className="text-amber-400 shrink-0" />}
                                                {isCurrent && <span className="ml-1 text-[10px] font-bold bg-cyan-900 text-cyan-200 px-1.5 py-0.5 rounded-full inline-flex align-middle">현재 위치</span>}
                                            </div>
                                            {rift && (
                                                <div className="text-[11px] text-fuchsia-300 mt-1 truncate flex items-center gap-1">
                                                    <Sparkles size={11} className="text-amber-300 shrink-0 animate-pulse" />
                                                    <span>차원의 틈새: {bossName}</span>
                                                </div>
                                            )}
                                            {bm && (
                                                <div className="text-[11px] text-yellow-300 mt-1 truncate flex items-center gap-1">
                                                    <span>💰</span>
                                                    <span>특별상점 개방 중</span>
                                                </div>
                                            )}
                                            {dungeons.length > 0 && (
                                                <div className="text-[11px] text-cyan-300 mt-1 truncate flex items-center gap-1">
                                                    <Swords size={11} className="text-cyan-400 shrink-0" />
                                                    <span>인스턴트 던전: {dungeons[0].name}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div 
                                            className="absolute top-2 right-2 p-1 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors z-10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleFavorite(fav.region, fav.nation, fav.city);
                                            }}
                                            title="즐겨찾기 삭제"
                                        >
                                            <X size={14} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* BOTTOM TRAVEL PLAN PANEL (When city is selected) */}
        {selectedCity && travelInfo && (
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-96 bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-6 z-50">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-black text-white flex items-center gap-1.5 font-cinzel">
                        <Navigation size={15} className="text-cyan-400"/> 
                        <span>이동 계획 수립</span>
                    </h3>
                    <div className="flex gap-1">
                        <button 
                            onClick={() => selectedRegion && selectedNation && selectedCity && toggleFavorite(selectedRegion, selectedNation, selectedCity)} 
                            className={`p-1.5 rounded-lg transition-colors ${isFavorite(selectedCity, selectedNation || undefined) ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20' : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'}`}
                            title="즐겨찾기 추가 또는 해제"
                        >
                            <Star size={16} className={isFavorite(selectedCity, selectedNation || undefined) ? 'fill-amber-400' : ''} />
                        </button>
                        <button onClick={() => setSelectedCity(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                            <X size={16}/>
                        </button>
                    </div>
                </div>
                
                {/* Departure -> Destination */}
                <div className="flex items-center justify-between bg-black/50 p-2.5 rounded-xl border border-slate-800 mb-3">
                    <div className="text-center flex-1">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{mode === 'relocate' ? '기지 출발지' : '출발지'}</div>
                        <div className="text-xs font-black text-slate-200 truncate mt-0.5">{originLocation.city}</div>
                        <div className="text-[9px] text-slate-500 truncate">{originLocation.nation}</div>
                    </div>
                    
                    <div className="text-cyan-400 px-2 flex flex-col items-center">
                        <travelInfo.Icon size={18}/>
                        <ArrowRight size={12} className="text-slate-600 mt-0.5" />
                    </div>

                    <div className="text-center flex-1">
                        <div className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">도착지</div>
                        <div className="text-xs font-black text-white truncate mt-0.5">{selectedCity}</div>
                        <div className="text-[9px] text-cyan-500/80 truncate">{selectedNation}</div>
                    </div>
                </div>

                {/* Travel Details Table */}
                <div className="space-y-1.5 text-xs mb-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 font-mono">
                    <div className="flex justify-between text-slate-400">
                        <span>교통 수단</span> 
                        <span className="text-slate-200 font-bold">{travelInfo.method}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>소요 시간</span> 
                        <span className="text-slate-200 font-bold">{travelInfo.durationText || `${travelInfo.days}일`}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>필요 비용</span> 
                        <span className={character.money >= travelInfo.cost ? 'text-amber-400 font-bold' : 'text-red-400 font-bold'}>
                            {travelInfo.cost.toLocaleString()} 골드
                        </span>
                    </div>
                    {travelInfo.days > 0 && (
                        <div className="flex justify-between text-[11px] text-amber-400/90 pt-1 border-t border-slate-800/80 font-sans">
                            <span className="flex items-center gap-1 font-semibold">
                                <Swords size={12} className="text-amber-400 animate-pulse" /> 몬스터 습격 위험
                            </span>
                            <span className="font-bold text-amber-300">야생 몬스터 출몰 가능</span>
                        </div>
                    )}
                </div>

                {/* Divine Realm Level 500 Lock Notice */}
                {selectedRegion === '신계' && character.level < 500 && (
                    <div className="mb-3 p-2.5 rounded-xl bg-red-950/80 border border-red-500/80 text-red-200 text-xs flex items-center gap-2 shadow-lg">
                        <Lock size={18} className="text-amber-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                            <div className="font-bold text-red-300">신계 진입 불가</div>
                            <div className="text-[10px] text-red-300/90">
                                신계는 500레벨 이상만 진입할 수 있습니다. (현재 레벨: {character.level})
                            </div>
                        </div>
                    </div>
                )}

                {/* Seasonal Rift Arrival Notice */}
                {selectedCity && (() => {
                    const rift = getRiftForCity(selectedCity, selectedNation || undefined);
                    if (!rift) return null;
                    const boss = SEASONAL_BOSSES[rift.bossKey];
                    const bossName = boss?.name || rift.bossKey;

                    return (
                        <div className="mb-3 p-2.5 rounded-xl bg-purple-950/80 border border-fuchsia-500/80 text-fuchsia-200 text-xs flex items-center gap-2 shadow-lg shadow-purple-950/50 animate-pulse">
                            <Sparkles size={18} className="text-amber-300 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <div className="font-bold text-amber-300 flex items-center gap-1">
                                    <span>차원의 틈새 개방 중!</span>
                                    <span className="text-[9px] bg-fuchsia-600 text-white px-1 py-0.2 rounded font-extrabold">{currentMonth}월 시즌</span>
                                </div>
                                <div className="text-[10px] text-fuchsia-300 truncate">
                                    도착 시 시즌 보스 <strong className="text-white">{bossName}</strong> (이)가 출현합니다.
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Black Market Arrival Notice */}
                {selectedCity && (() => {
                    const bm = getBlackMarketForCity(selectedCity, selectedNation || undefined);
                    if (!bm) return null;
                    return (
                        <div className="mb-3 p-2.5 rounded-xl bg-amber-950/80 border border-yellow-500/80 text-yellow-200 text-xs flex items-center gap-2 shadow-lg shadow-amber-950/50">
                            <span className="text-lg shrink-0">💰</span>
                            <div className="min-w-0 flex-1">
                                <div className="font-bold text-yellow-300">비밀 특별상점 개방 중!</div>
                                <div className="text-[10px] text-amber-200/90 truncate">
                                    도착 시 뒷골목에서 특별상점 상인을 이용할 수 있습니다.
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Instant Dungeon Arrival Notice */}
                {selectedCity && (() => {
                    const dungeons = getInstantDungeonsForCity(selectedCity, selectedNation || undefined);
                    if (dungeons.length === 0) return null;
                    return (
                        <div className="mb-3 p-2.5 rounded-xl bg-blue-950/80 border border-cyan-500/80 text-cyan-200 text-xs flex items-center gap-2 shadow-lg shadow-blue-950/50">
                            <Swords size={18} className="text-cyan-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <div className="font-bold text-cyan-300">
                                    인스턴트 던전 {dungeons.length}개 발견됨!
                                </div>
                                <div className="text-[10px] text-cyan-200/90 truncate">
                                    {dungeons.map(d => `${d.name}(${d.level}레벨)`).join(', ')}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {(() => {
                    const isDivineLocked = selectedRegion === '신계' && character.level < 500;
                    const isNotEnoughMoney = mode === 'travel' && character.money < travelInfo.cost;
                    return (
                        <button 
                            onClick={handleTravelClick}
                            disabled={isDivineLocked || isNotEnoughMoney}
                            className={`w-full py-2.5 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-98 ${
                                isDivineLocked
                                    ? 'bg-slate-800 text-red-400 cursor-not-allowed border border-red-900/60'
                                    : isNotEnoughMoney
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-900/30'
                            }`}
                        >
                            {isDivineLocked ? <Lock size={15} /> : <Footprints size={15} />}
                            <span>
                                {isDivineLocked 
                                    ? '신계 진입 불가 (500레벨 필요)' 
                                    : isNotEnoughMoney 
                                    ? '골드 부족' 
                                    : (mode === 'relocate' ? '기지 이사 시작' : '이동 시작')}
                            </span>
                        </button>
                    );
                })()}
            </div>
        )}
      </div>
    </div>
  );
};

export default MapModal;
