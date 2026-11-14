import React, { useState } from 'react';
import { Character, CityTier, DistrictType } from '../types';
import { WORLD_GEOGRAPHY, TIER_DISTRICTS, DISTRICT_CONFIG } from '../constants';
import { getBossByLocation } from '../bossMonsters';
import { isMythicSeasonalBoss, SEASONAL_BOSS_CONFIG, SEASONAL_BOSSES } from '../mythicbossmonsters';
import { getTimeOfDay } from '../services/gameTimeService';
import { isNightMarketActive } from '../services/facilityOperatingService';
import { getShingyeSanctuaryTheme } from '../services/shingyeSanctuaryTheme';
import { getCityBackgroundImage, getTimeAtmosphereFilter } from '../services/cityBackgroundManifest';
import QuickTravelModal from './QuickTravelModal';
import MidnightPenaltyModal from './MidnightPenaltyModal';
import MilitaryCityActionPanel from './MilitaryCityActionPanel';
import MilitaryInfiltrationModal from './MilitaryInfiltrationModal';
import { 
    Building2, Store, Users2, Clock, Shield, Tent, Crown, Home, Sword, 
    MapPin, BookOpen, Map, ShieldAlert, Compass, ChevronRight, HelpCircle, Calendar,
    Sparkles, Flame, TreePine, Moon, Sun, Sunrise, Sunset, Landmark, Zap, Trees, PawPrint, Gavel,
    AlertTriangle, Gem, Skull, Eye
} from 'lucide-react';

interface Props {
    character: Character;
    onEnterCity: (district?: DistrictType | 'Gate', openHuntMap?: boolean) => void;
    onOpenDungeon: () => void;
    onOpenMap: () => void;
    onOpenBase?: () => void;
    onOpenElfCity?: () => void;
    onOpenDemonCity?: () => void;
    onOpenBeastCity?: () => void;
    onTravel?: (destination: any, cost: number, days: number) => void;
    onUpdateCharacter?: (updatedChar: Character, logMessage: string) => void;
    onStartBattle?: (enemies: any[], battleType: string, sourceId?: string) => void;
}

const CityMapBoard: React.FC<Props> = ({ 
    character, 
    onEnterCity, 
    onOpenDungeon, 
    onOpenMap,
    onOpenBase,
    onOpenElfCity,
    onOpenDemonCity,
    onOpenBeastCity,
    onTravel,
    onUpdateCharacter,
    onStartBattle
}) => {
    const [isQuickTravelOpen, setIsQuickTravelOpen] = useState(false);
    const [isMidnightModalOpen, setIsMidnightModalOpen] = useState(false);
    const [isInfiltrationModalOpen, setIsInfiltrationModalOpen] = useState(false);
    const loc = character.currentLocation || { region: "아시아", nation: "대한민국", city: "서울" };

    // 군대 첩보 임무 판별
    const activeMilitaryMissions = character.militaryData?.activeMissions || [];
    const isMissionPending = (q?: any) => Boolean(q && (q.currentAmount || 0) < (q.targetAmount || 1));
    const infiltrationQuest = activeMilitaryMissions.find(m => m.type === 'MilitaryInfiltration' && isMissionPending(m));
    const infilReqNation = infiltrationQuest?.location?.nation || '';
    const infilReqCity = infiltrationQuest?.location?.city || '';
    const isAtInfiltrationTarget = Boolean(
        infiltrationQuest &&
        (!infilReqNation || infilReqNation.trim() === (loc.nation || '').trim()) &&
        (!infilReqCity || infilReqCity.trim() === (loc.city || '').trim())
    );
    
    // Check region and nation types
    const isMagye = loc.region === '마계' || loc.nation === '임페리얼 제국';
    const isShingye = loc.region === '신계';
    const isElfNation = loc.region === '실바나르' || loc.nation === '미르탈 숲연합';
    const isBeastNation = loc.region === '페랄디아' || loc.nation === '레오니스 투기국'; 
    const isDemonNation = loc.region === '아비살론' || loc.nation === '네크로디움 제국'; 
    const isKorea = loc.nation === '대한민국';
    const isEastAsia = ['일본', '중국', '북한', '몽골', '대만'].includes(loc.nation);
    const isEurope = loc.region === '유럽' || ['영국', '프랑스', '독일', '이탈리아', '스페인', '러시아', '스위스', '그리스', '체코', '오스트리아'].includes(loc.nation);
    const isMiddleEastOrAfrica = loc.region === '아프리카' || ['사우디아라비아', 'UAE', '이집트', '이란', '이스라엘', '모로코'].includes(loc.nation);
    const isAmericasOrOceania = ['북아메리카', '남아메리카', '오세아니아'].includes(loc.region) || ['미국', '캐나다', '호주', '뉴질랜드', '브라질'].includes(loc.nation);

    // Determine city tier
    let tier: CityTier = 'City';
    const regionData = WORLD_GEOGRAPHY[loc.region];
    const isCapital = regionData && regionData[loc.nation] && regionData[loc.nation].capital === loc.city;
    if (isCapital) {
        tier = 'Capital';
    } else {
        if (loc.city && ['부산', '오사카', '상하이', '뉴욕', 'LA', '시드니', '런던', '베를린', '파리'].includes(loc.city)) tier = 'City';
        else tier = 'Town';
    }

    const activeDistricts = TIER_DISTRICTS[tier] || [];

    // Check if current location has a Dimensional Rift (Mythic Boss)
    // 오직 해당 월의 시즌 보스 설정(SEASONAL_BOSS_CONFIG)에 국가와 도시가 정확하게 등록되어 있을 때만 시즌 보스로 감지합니다.
    const currentMonth = character.currentDate ? parseInt(character.currentDate.split('-')[1], 10) : 3;
    const currentSeasonalConfig = currentMonth && SEASONAL_BOSS_CONFIG[currentMonth]
        ? SEASONAL_BOSS_CONFIG[currentMonth].find(c => c.nation === loc.nation && c.city === loc.city)
        : null;
    const isMythicBoss = Boolean(currentSeasonalConfig);
    const currentBoss = currentSeasonalConfig ? SEASONAL_BOSSES[currentSeasonalConfig.bossKey] : null;

    // Base existence in current location
    const hasBaseInCurrentLocation = Boolean(
        character.base &&
        character.base.location &&
        loc.city === character.base.location.city &&
        (!character.base.location.nation || !loc.nation || loc.nation === character.base.location.nation)
    );

    // 시간대별 시각적 연동 및 심야 노동 패널티 상태 계산
    const timeOfDay = getTimeOfDay(character.currentTime);
    const [hStr, mStr] = (character.currentTime || "08:00").split(':');
    const currentHour = parseInt(hStr, 10) || 8;
    const currentMinute = parseInt(mStr, 10) || 0;
    const totalMinutes = currentHour * 60 + currentMinute; // 0 ~ 1439 분
    const isMidnightLabor = currentHour >= 0 && currentHour < 6;
    const isNightPrime = isNightMarketActive(character.currentTime);
    const isDayFacilityOpen = currentHour >= 8 && currentHour < 20;

    // 낮 시간: 06:00 (360분) ~ 19:00 (1140분) => 태양, 밤 시간 => 달
    const isDaytime = totalMinutes >= 360 && totalMinutes < 1140;

    // 신계(Shingye) 고유 성전 테마 (낮/밤에 상관없이 각 성전에 따른 고유 신성 천체 및 컨셉 적용)
    const shingyeTheme = isShingye ? getShingyeSanctuaryTheme(loc.city) : null;

    // 시간에 따라 동쪽에서 서쪽으로 호(포물선)를 그리며 이동하는 태양/달 위치 및 시각 연출 (신계는 성전 천체 고정)
    const celestialBody = (() => {
        // 신계인 경우: 지상의 시간대와 상관없이 해당 성전 고유의 신성 천체가 중앙 상단에 군림
        if (shingyeTheme) {
            return {
                type: 'shingye' as const,
                shingyeCelestial: shingyeTheme.celestial,
                left: '50%',
                top: '14%'
            };
        }

        if (isDaytime) {
            // 태양 궤적 (06:00 ~ 19:00, 780분간)
            const progress = Math.min(1, Math.max(0, (totalMinutes - 360) / 780));
            const leftPercent = 10 + progress * 80; // 10% ~ 90%
            const arcFactor = Math.sin(progress * Math.PI); // 포물선 고도 (0 -> 1 -> 0)
            const topPercent = 34 - arcFactor * 26; // 지평선(34%) -> 정오 최고도(8%) -> 지평선(34%)

            // 시간에 따른 태양 색상 및 오라 (아침, 한낮, 노을)
            let sunColors = {
                core: 'from-amber-200 via-amber-400 to-yellow-500',
                glow: 'shadow-[0_0_65px_22px_rgba(251,191,36,0.55)]',
                corona: 'bg-amber-400/30',
                flare: 'from-amber-300/40 via-yellow-400/20 to-transparent'
            };
            if (progress < 0.22) {
                // 아침 햇살 (따사로운 황금빛)
                sunColors = {
                    core: 'from-amber-100 via-orange-300 to-amber-500',
                    glow: 'shadow-[0_0_65px_22px_rgba(245,158,11,0.55)]',
                    corona: 'bg-orange-400/30',
                    flare: 'from-amber-400/40 via-orange-400/20 to-transparent'
                };
            } else if (progress > 0.78) {
                // 노을 태양 (붉은 석양빛)
                sunColors = {
                    core: 'from-orange-300 via-rose-500 to-red-600',
                    glow: 'shadow-[0_0_75px_26px_rgba(244,63,94,0.65)]',
                    corona: 'bg-rose-500/35',
                    flare: 'from-rose-500/40 via-orange-500/20 to-transparent'
                };
            } else {
                // 한낮의 찬란하고 밝은 태양
                sunColors = {
                    core: 'from-white via-amber-200 to-yellow-400',
                    glow: 'shadow-[0_0_85px_32px_rgba(253,224,71,0.7)]',
                    corona: 'bg-amber-300/35',
                    flare: 'from-yellow-300/40 via-amber-300/20 to-transparent'
                };
            }

            return {
                type: 'sun' as const,
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                sunColors
            };
        } else {
            // 달 궤적 (19:00 ~ 06:00, 660분간)
            const nightPassed = totalMinutes >= 1140 ? (totalMinutes - 1140) : (totalMinutes + 300);
            const progress = Math.min(1, Math.max(0, nightPassed / 660));
            const leftPercent = 10 + progress * 80;
            const arcFactor = Math.sin(progress * Math.PI);
            const topPercent = 35 - arcFactor * 25; // 35% -> 10% -> 35%

            return {
                type: 'moon' as const,
                left: `${leftPercent}%`,
                top: `${topPercent}%`
            };
        }
    })();

    // 시간대별 대기 및 하늘 시각 스타일
    const getTimeAtmosphere = () => {
        // 신계(Shingye)의 경우: 지상의 낮/밤과 무관하게 각 성전의 고유 신성 대기 배경 적용
        if (shingyeTheme) {
            return {
                label: '신계',
                period: 'shingye',
                bgGradient: shingyeTheme.bgGradient,
                orbGradient1: shingyeTheme.orbGradient1,
                orbGradient2: shingyeTheme.orbGradient2,
                sunbeam: shingyeTheme.sunbeam,
                ambientGlow: shingyeTheme.ambientGlow,
                gridPattern: shingyeTheme.gridPattern,
                badgeColor: shingyeTheme.badgeColor,
                badgeBg: shingyeTheme.badgeBg,
                badgeBorder: shingyeTheme.badgeBorder,
                timeTagline: shingyeTheme.sanctuaryTitle,
                celestialType: 'sun' as const
            };
        }

        if (isMidnightLabor) {
            // 새벽 (심야 노동 패널티)
            return {
                label: '새벽',
                period: 'dawn',
                bgGradient: 'from-slate-950 via-indigo-950/95 to-purple-950/90',
                orbGradient1: 'bg-indigo-500/35',
                orbGradient2: 'bg-purple-600/35',
                sunbeam: 'from-purple-500/20 via-indigo-400/10 to-transparent',
                ambientGlow: 'bg-indigo-500/20',
                gridPattern: 'radial-gradient(#818cf828 1.5px, transparent 1.5px)',
                badgeColor: 'text-indigo-300',
                badgeBg: 'bg-indigo-950/90',
                badgeBorder: 'border-indigo-500/60',
                timeTagline: '심야 시간대 (노동 패널티: 피로도 2배)',
                celestialType: 'midnight_moon' as const
            };
        }
        if (timeOfDay.period === 'morning') {
            // 아침 - 활기차고 상쾌한 햇살
            return {
                label: '아침',
                period: 'morning',
                bgGradient: 'from-amber-900/90 via-orange-950/70 to-slate-900',
                orbGradient1: 'bg-amber-400/35',
                orbGradient2: 'bg-rose-400/30',
                sunbeam: 'from-amber-300/30 via-orange-200/15 to-transparent',
                ambientGlow: 'bg-amber-400/20',
                gridPattern: 'radial-gradient(#fde68a35 1.5px, transparent 1.5px)',
                badgeColor: 'text-amber-300',
                badgeBg: 'bg-amber-950/90',
                badgeBorder: 'border-amber-500/60',
                timeTagline: '상쾌한 아침 햇살',
                celestialType: 'sunrise' as const
            };
        }
        if (timeOfDay.period === 'afternoon') {
            // 낮 - 기본의 짙은 어두움을 탈피하여 푸르고 밝고 화창한 대낮의 하늘 연출
            return {
                label: '낮',
                period: 'afternoon',
                bgGradient: 'from-sky-800 via-blue-900/90 to-slate-900',
                orbGradient1: 'bg-sky-400/40',
                orbGradient2: 'bg-amber-300/35',
                sunbeam: 'from-sky-300/35 via-amber-200/20 to-transparent',
                ambientGlow: 'bg-sky-400/25',
                gridPattern: 'radial-gradient(#7dd3fc40 1.5px, transparent 1.5px)',
                badgeColor: 'text-sky-300',
                badgeBg: 'bg-sky-950/90',
                badgeBorder: 'border-sky-500/60',
                timeTagline: '화창한 대낮',
                celestialType: 'sun' as const
            };
        }
        if (timeOfDay.period === 'sunset') {
            // 저녁 - 낭만적이고 붉은 석양 노을
            return {
                label: '저녁',
                period: 'sunset',
                bgGradient: 'from-purple-950 via-rose-950/90 to-slate-950',
                orbGradient1: 'bg-orange-500/40',
                orbGradient2: 'bg-rose-500/35',
                sunbeam: 'from-rose-500/25 via-orange-400/15 to-transparent',
                ambientGlow: 'bg-rose-500/20',
                gridPattern: 'radial-gradient(#fb923c35 1.5px, transparent 1.5px)',
                badgeColor: 'text-orange-300',
                badgeBg: 'bg-orange-950/90',
                badgeBorder: 'border-orange-500/60',
                timeTagline: '노을 지는 저녁',
                celestialType: 'sunset' as const
            };
        }
        // 밤 - 깊고 고요한 남색 밤하늘
        return {
            label: '밤',
            period: 'night',
            bgGradient: 'from-slate-950 via-slate-900 to-indigo-950',
            orbGradient1: 'bg-blue-600/35',
            orbGradient2: 'bg-indigo-600/30',
            sunbeam: 'from-blue-400/20 via-indigo-300/10 to-transparent',
            ambientGlow: 'bg-blue-500/15',
            gridPattern: 'radial-gradient(#93c5fd30 1.5px, transparent 1.5px)',
            badgeColor: 'text-blue-300',
            badgeBg: 'bg-blue-950/90',
            badgeBorder: 'border-blue-500/60',
            timeTagline: '고요한 밤하늘',
            celestialType: 'moon' as const
        };
    };

    const timeAtmosphere = getTimeAtmosphere();

    // Theme and subtle atmospheric styling
    const getThemeConfig = () => {
        if (isShingye) {
            return {
                bgGradient: timeAtmosphere.bgGradient,
                borderColor: isCapital ? 'border-amber-400/80 hover:border-amber-300' : 'border-amber-600/40 hover:border-amber-400',
                accentColor: 'text-amber-300',
                orbGradient1: 'bg-amber-500/10',
                orbGradient2: 'bg-indigo-400/10'
            };
        }
        if (isMagye || isDemonNation) {
            return {
                bgGradient: timeAtmosphere.bgGradient,
                borderColor: isCapital ? 'border-purple-500/80 hover:border-purple-400' : 'border-purple-800/40 hover:border-purple-500',
                accentColor: 'text-purple-300',
                orbGradient1: 'bg-purple-600/15',
                orbGradient2: 'bg-rose-600/10'
            };
        }
        if (isElfNation) {
            return {
                bgGradient: timeAtmosphere.bgGradient,
                borderColor: isCapital ? 'border-emerald-400/80 hover:border-emerald-300' : 'border-emerald-800/40 hover:border-emerald-500',
                accentColor: 'text-emerald-300',
                orbGradient1: 'bg-emerald-500/15',
                orbGradient2: 'bg-teal-400/10'
            };
        }
        if (isBeastNation) {
            return {
                bgGradient: timeAtmosphere.bgGradient,
                borderColor: isCapital ? 'border-orange-500/80 hover:border-amber-400' : 'border-orange-800/40 hover:border-orange-500',
                accentColor: 'text-orange-300',
                orbGradient1: 'bg-orange-600/15',
                orbGradient2: 'bg-amber-600/10'
            };
        }
        if (isKorea) {
            return {
                bgGradient: timeAtmosphere.bgGradient,
                borderColor: isCapital ? 'border-cyan-400/80 hover:border-cyan-300' : 'border-cyan-800/40 hover:border-cyan-400',
                accentColor: 'text-cyan-300',
                orbGradient1: 'bg-cyan-500/15',
                orbGradient2: 'bg-indigo-600/15'
            };
        }
        if (isEastAsia) {
            return {
                bgGradient: timeAtmosphere.bgGradient,
                borderColor: isCapital ? 'border-rose-500/70 hover:border-amber-400' : 'border-slate-700 hover:border-rose-400',
                accentColor: 'text-rose-300',
                orbGradient1: 'bg-rose-600/15',
                orbGradient2: 'bg-amber-500/10'
            };
        }
        if (isEurope) {
            return {
                bgGradient: timeAtmosphere.bgGradient,
                borderColor: isCapital ? 'border-amber-400/80 hover:border-blue-400' : 'border-slate-700 hover:border-amber-400',
                accentColor: 'text-amber-300',
                orbGradient1: 'bg-blue-600/10',
                orbGradient2: 'bg-amber-500/10'
            };
        }
        return {
            bgGradient: timeAtmosphere.bgGradient,
            borderColor: isCapital ? 'border-amber-500/80 hover:border-amber-400' : 'border-slate-800 hover:border-amber-500/50',
            accentColor: 'text-amber-300',
            orbGradient1: 'bg-amber-600/10',
            orbGradient2: 'bg-indigo-600/10'
        };
    };

    const theme = getThemeConfig();

    // 현재 위치 및 시간대에 대응하는 고화질 판타지 배경 및 대기 필터
    const cityBg = getCityBackgroundImage(loc);
    const timeFilter = getTimeAtmosphereFilter(timeAtmosphere.period, isMidnightLabor);

    // GitHub Pages 및 로컬 환경 동시 대응 서브패스 안전 경로 리졸버
    const getResolvedBackgroundUrl = (url?: string) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
            return url;
        }
        const clean = url.replace(/^\.?\//, '');
        if (typeof window !== 'undefined') {
            let pathname = window.location.pathname || '/';
            if (!pathname.endsWith('/') && !pathname.includes('.')) {
                pathname += '/';
            }
            const dir = pathname.substring(0, pathname.lastIndexOf('/') + 1);
            return `${window.location.origin}${dir}${clean}`;
        }
        return `./${clean}`;
    };

    // Helper to check if district is active/available in this city
    const isDistrictAvailable = (type: DistrictType | 'Gate') => {
        if (isShingye || isMagye) {
            return type === 'Imperial' || type === 'Outskirts';
        }
        if (type === 'Gate') return true;
        return activeDistricts.includes(type as DistrictType);
    };

    return (
        <div className="flex-1 relative overflow-hidden bg-slate-950 flex flex-col justify-between p-2.5 sm:p-4 md:p-6 lg:p-8 select-none">
            {/* 고화질 지역별 고유 판타지 일러스트 배경 레이어 & 시간대 색조 블렌딩 오버레이 */}
            <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
                {/* 1. 고화질 판타지 배경 이미지 (선명한 불투명도 75~90% + 신계 전용 광휘 보존/시간대별 필터 + 자동 상대/절대 경로 폴백) */}
                <img 
                    src={getResolvedBackgroundUrl(cityBg.url)} 
                    alt={cityBg.title}
                    onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.triedRelative) {
                            target.dataset.triedRelative = 'true';
                            target.src = `./${cityBg.url.replace(/^\.?\//, '')}`;
                        } else if (cityBg.fallbackUrl && target.src !== cityBg.fallbackUrl) {
                            target.src = cityBg.fallbackUrl;
                        }
                    }}
                    className={`w-full h-full object-cover object-center ${isShingye ? 'opacity-80 sm:opacity-90' : 'opacity-70 sm:opacity-80'} transition-all duration-700 ease-in-out scale-100 ${isShingye ? (isMidnightLabor ? 'brightness-90 contrast-110 saturate-120' : 'brightness-105 contrast-105 saturate-110') : timeFilter.filterClass}`}
                />

                {/* 2. 시간대 색조 블렌딩 오버레이 (신계는 은은한 신성 광휘 유지, 지상은 여명/낮/석양/야간/심야) */}
                <div className={`absolute inset-0 ${isShingye ? 'bg-amber-950/15' : timeFilter.blendOverlayColor} mix-blend-multiply opacity-40 transition-colors duration-700`} />

                {/* 3. 대기광(Ambient Glow) 방사형 그라데이션 */}
                <div 
                    className="absolute inset-0 opacity-35 mix-blend-screen transition-all duration-700"
                    style={{
                        background: `radial-gradient(circle at 50% 38%, ${isShingye ? (cityBg.accentTint || 'rgba(251, 191, 36, 0.4)') : timeFilter.ambientGlow} 0%, transparent 68%)`
                    }}
                />

                {/* 4. 지역 테마 고유 강조 틴트 (Shingye / Magye / Elf / Beast 등) */}
                <div 
                    className="absolute inset-0 opacity-20 mix-blend-color-dodge transition-all duration-700"
                    style={{
                        background: `radial-gradient(ellipse at 50% 50%, ${cityBg.accentTint} 0%, transparent 80%)`
                    }}
                />

                {/* 5. 천체(태양/달/신계 천체) 천공 궤적 및 은은한 광원 오라 */}
                {celestialBody && (
                    <div 
                        className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-out"
                        style={{ left: celestialBody.left, top: celestialBody.top }}
                    >
                        {celestialBody.type === 'shingye' ? (
                            <div className="relative flex items-center justify-center">
                                <div className="w-44 h-44 rounded-full bg-amber-400/20 blur-2xl animate-pulse" />
                                <div className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-500 opacity-50 blur-md" />
                            </div>
                        ) : celestialBody.type === 'sun' && celestialBody.sunColors ? (
                            <div className="relative flex items-center justify-center">
                                <div className={`w-40 h-40 rounded-full blur-2xl ${celestialBody.sunColors.corona}`} />
                                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${celestialBody.sunColors.core} opacity-40 blur-sm ${celestialBody.sunColors.glow}`} />
                            </div>
                        ) : (
                            <div className="relative flex items-center justify-center">
                                <div className="w-36 h-36 rounded-full bg-indigo-500/15 blur-2xl" />
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-100 via-indigo-200 to-blue-300 opacity-35 blur-sm shadow-[0_0_35px_8px_rgba(147,197,253,0.25)]" />
                            </div>
                        )}
                    </div>
                )}

                {/* 6. UI 가독성을 위한 상/하단 및 좌우 은은한 비네트 그라데이션 (배경을 가리지 않고 텍스트 대비만 보장) */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/50" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/40 via-transparent to-slate-950/40" />
            </div>
            {/* Header: Geographic status, Date, Time & Midnight Alert (Unobstructed top-left) */}
            <div className="z-10 flex items-start select-none">
                {/* Header Card: Location, Date, Time & Time-of-Day Badge */}
                <div 
                    onClick={() => setIsQuickTravelOpen(true)}
                    className="bg-slate-950/85 border border-slate-800/80 hover:border-amber-500/70 hover:bg-slate-900/90 cursor-pointer px-3 py-2 rounded-xl sm:rounded-2xl shadow-xl backdrop-blur-md min-w-[240px] max-w-[290px] sm:max-w-xs transition-all mt-1.5 sm:mt-2.5 group"
                    title="빠른 이동 메뉴 열기"
                >
                    {/* Row 1: Location and Capital status */}
                    <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin size={13} className={`${theme.accentColor} shrink-0 group-hover:scale-110 transition-transform`} />
                        <h1 className="text-xs sm:text-sm font-black text-slate-100 truncate flex items-center gap-1">
                            <span>{loc.nation}</span>
                            <span className="text-slate-500 font-normal">/</span>
                            <span className={theme.accentColor}>{loc.city}</span>
                        </h1>
                        {isCapital && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/50 rounded shrink-0">
                                수도
                            </span>
                        )}
                        <span className="text-[9px] text-amber-400/80 ml-auto hidden xs:inline opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                            이동 ▾
                        </span>
                    </div>

                    {/* Row 2: Date & Time placed cleanly in the header with animated Time-of-Day badge */}
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] sm:text-xs font-mono font-bold">
                        <div className="flex items-center gap-1 text-amber-300">
                            <Calendar size={12} className="text-amber-400 shrink-0" />
                            <span className="tracking-tight">{character.currentDate || '2000-03-02'}</span>
                        </div>
                        <span className="text-slate-600">|</span>
                        <div className="flex items-center gap-1 text-indigo-300">
                            <Clock size={12} className="text-indigo-400 shrink-0" />
                            <span className="tracking-tight">{character.currentTime || '08:00'}</span>
                        </div>
                        {/* Time of Day badge */}
                        <span className={`text-[8.5px] xs:text-[9px] px-1.5 py-0.5 rounded font-bold border ${timeAtmosphere.badgeBg} ${timeAtmosphere.badgeColor} ${timeAtmosphere.badgeBorder} flex items-center gap-0.5 shrink-0 ml-auto shadow-sm`}>
                            {timeAtmosphere.period === 'dawn' && <Moon size={9} className="shrink-0 text-indigo-300" />}
                            {timeAtmosphere.period === 'morning' && <Sunrise size={9} className="shrink-0 text-amber-300" />}
                            {timeAtmosphere.period === 'afternoon' && <Sun size={9} className="shrink-0 text-sky-300" />}
                            {timeAtmosphere.period === 'sunset' && <Sunset size={9} className="shrink-0 text-orange-300" />}
                            {timeAtmosphere.period === 'night' && <Moon size={9} className="shrink-0 text-blue-300" />}
                            <span>{timeAtmosphere.label}</span>
                        </span>
                    </div>

                    {/* Facility Operating Status badge */}
                    <div className="mt-1 flex items-center justify-between text-[8px] xs:text-[9px] font-bold">
                        {isNightPrime ? (
                            <div 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEnterCity('Residential');
                                }}
                                className="flex items-center gap-1 text-purple-300 bg-purple-950/80 border border-purple-500/50 hover:border-purple-400 px-2 py-0.5 rounded-md cursor-pointer transition-colors shadow-sm"
                                title="뒷골목 암시장 바로가기"
                            >
                                <Gem size={10} className="text-purple-400 animate-bounce" />
                                <span>심야 암시장 개장 중 (22:00~04:00)</span>
                            </div>
                        ) : isDayFacilityOpen ? (
                            <div className="flex items-center gap-1 text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-md shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span>주간 시설 정상 영업 (08:00~20:00)</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                                <Clock size={9} className="text-amber-400" />
                                <span>시설 영업 마감 (22시 암시장 개장)</span>
                            </div>
                        )}
                    </div>

                    {/* Row 3: If midnight, show clickable quick alert badge inside card */}
                    {isMidnightLabor && (
                        <div 
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMidnightModalOpen(true);
                            }}
                            className="flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-red-950/90 border border-red-500/70 hover:border-red-400 rounded-lg text-[9px] text-red-200 font-bold shadow-md transition-colors animate-pulse"
                            title="심야 노동 패널티 안내 보기"
                        >
                            <AlertTriangle size={10} className="text-red-400 shrink-0 animate-bounce" />
                            <span className="truncate">심야 패널티: 피로도 2배 (클릭)</span>
                        </div>
                    )}

                    {/* Row 4: Mythic Boss Dimensional Rift Detection Alert */}
                    {isMythicBoss && currentBoss && (
                        <div className="flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-gradient-to-r from-purple-950/90 via-fuchsia-950/80 to-slate-950 border border-purple-500/60 rounded-lg text-[9px] sm:text-[10px] text-purple-200 font-bold shadow-md animate-pulse">
                            <Zap size={10} className="text-fuchsia-300 shrink-0" />
                            <span className="truncate">차원의 틈새: <span className="text-amber-300 font-black">{currentBoss.name}</span></span>
                        </div>
                    )}
                </div>

                {/* 첩보 임무 알림 배너 (클릭 시 모달 열기) */}
                {infiltrationQuest && (
                    <div 
                        onClick={() => setIsInfiltrationModalOpen(true)}
                        className={`ml-2 mt-1.5 sm:mt-2.5 px-3 py-2 rounded-xl sm:rounded-2xl border shadow-xl backdrop-blur-md cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ${
                            isAtInfiltrationTarget
                                ? 'bg-amber-950/90 border-amber-400 text-amber-200 animate-pulse shadow-amber-950/70'
                                : 'bg-slate-950/85 border-amber-600/50 hover:border-amber-400 text-amber-300'
                        }`}
                        title="기밀 첩보 작전 모달 열기"
                    >
                        <div className={`p-1.5 rounded-lg ${isAtInfiltrationTarget ? 'bg-amber-500 text-slate-950' : 'bg-amber-950/60 text-amber-400'}`}>
                            <Eye size={16} />
                        </div>
                        <div className="text-left min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] sm:text-xs font-black text-amber-200">
                                    {isAtInfiltrationTarget ? '기밀 첩보 작전 구역' : '군대 첩보 임무'}
                                </span>
                                <span className={`text-[8.5px] px-1.5 py-0.2 rounded font-extrabold ${isAtInfiltrationTarget ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                                    {isAtInfiltrationTarget ? '작전 가능' : '이동 필요'}
                                </span>
                            </div>
                            <p className="text-[9px] sm:text-[10px] text-slate-400 truncate max-w-[140px] sm:max-w-[190px]">
                                {isAtInfiltrationTarget ? '클릭하여 침투 작전 개시' : `목표: ${infilReqNation} ${infilReqCity}`}
                            </p>
                        </div>
                    </div>
                )}
            </div>
 
            {/* Main Interactive Tactical City Map Visualizer */}
            <div className="z-10 flex-1 -mt-16 xs:-mt-24 sm:-mt-28 -translate-y-8 xs:-translate-y-12 sm:-translate-y-14 flex flex-col justify-center items-center relative min-h-[260px] xs:min-h-[300px] sm:min-h-[360px] max-h-[500px] w-full">
                
                {/* RADIAL MAP GRID */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {/* Ring 1 (Inner) */}
                    <div className={`w-[130px] h-[130px] xs:w-[170px] xs:h-[170px] sm:w-[220px] sm:h-[220px] rounded-full border border-dashed ${isCapital ? 'border-amber-500/30' : 'border-slate-800'} opacity-70`}></div>
                    {/* Ring 2 (Outer) */}
                    <div className={`w-[250px] h-[250px] xs:w-[310px] xs:h-[310px] sm:w-[420px] sm:h-[420px] rounded-full border border-dashed ${isCapital ? 'border-amber-500/20' : 'border-slate-850/40'} opacity-50`}></div>
                    {/* Crosshair lines */}
                    <div className="absolute w-[90%] border-t border-dashed border-slate-900/40"></div>
                    <div className="absolute h-[90%] border-l border-dashed border-slate-900/40"></div>
                </div>
 
                {/* CENTER NODE: CITY PLAZA / CENTRAL HUB */}
                <div className="relative z-20 flex flex-col items-center justify-center">
                    <button 
                        onClick={() => onEnterCity()} 
                        className={`w-16 h-16 xs:w-20 xs:h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 ${
                            isShingye ? 'border-amber-400/90 shadow-[0_0_28px_rgba(251,191,36,0.4)]' :
                            isMagye ? 'border-red-500/90 shadow-[0_0_28px_rgba(239,68,68,0.4)]' :
                            isCapital ? 'border-amber-400/80 shadow-[0_0_25px_rgba(251,191,36,0.35)]' : 'border-slate-800 hover:border-amber-500'
                        } flex flex-col items-center justify-center group transition-all duration-300 hover:scale-105 active:scale-95`}
                    >
                        <div className={`p-1.5 xs:p-2 sm:p-2.5 bg-slate-950 rounded-full border ${
                            isShingye ? 'border-amber-500/60 text-amber-300' :
                            isMagye ? 'border-red-500/60 text-red-400' :
                            isCapital ? 'border-amber-500/60 text-amber-400' : 'border-slate-800 text-amber-500'
                        } group-hover:text-amber-300 group-hover:rotate-12 transition-all`}>
                            {isShingye ? <Sun className="w-4 h-4 xs:w-5 xs:h-5 sm:w-7 sm:h-7 animate-pulse text-amber-300" /> :
                             isMagye ? <Skull className="w-4 h-4 xs:w-5 xs:h-5 sm:w-7 sm:h-7 animate-pulse text-red-400" /> :
                             <Compass className="w-4 h-4 xs:w-5 xs:h-5 sm:w-7 sm:h-7" />}
                        </div>
                        <span className="text-[8px] xs:text-[10px] sm:text-xs font-extrabold text-slate-100 mt-0.5 sm:mt-1.5 group-hover:text-amber-300 transition-colors">
                            {isShingye ? '신성 성전' : isMagye ? '심연의 중심부' : isCapital ? '수도 중앙광장' : '도시 중앙광장'}
                        </span>
                        <div className={`absolute -bottom-1 text-[7px] xs:text-[8px] bg-slate-950 border ${
                            isShingye ? 'border-amber-500/50 text-amber-300' :
                            isMagye ? 'border-red-500/50 text-red-400' :
                            isCapital ? 'border-amber-500/50 text-amber-300' : 'border-slate-800 text-slate-400'
                        } px-1.5 py-0.5 rounded-full font-bold`}>
                            {isShingye ? '성전 진입' : isMagye ? '심연 진입' : '광장 진입'}
                        </div>
                    </button>
                </div>
 
                {/* RADIAL SATELLITE NODES */}
                {/* 1. 일반 도시 구역 노드 (지상 인간계 및 이종족 도시 - 신계/마계 제외) */}
                {!isShingye && !isMagye && (
                    <>
                        {/* 1. Commercial (Left Middle) - [모바일 컴팩트 클러스터 배치] */}
                        <div className="absolute left-[6%] xs:left-[9%] sm:left-[14%] top-[45%] -translate-y-1/2 z-10">
                            <MapNode 
                                type="Commercial" 
                                available={isDistrictAvailable('Commercial')}
                                theme={theme}
                                isClosedAtNight={!isDayFacilityOpen}
                                onClick={() => onEnterCity('Commercial')}
                            />
                        </div>
         
                        {/* 2. Residential (Right Middle) - [모바일 컴팩트 클러스터 배치] */}
                        <div className="absolute right-[6%] xs:right-[9%] sm:right-[14%] top-[45%] -translate-y-1/2 z-10">
                            <MapNode 
                                type="Residential" 
                                available={isDistrictAvailable('Residential')}
                                theme={theme}
                                onClick={() => onEnterCity('Residential')}
                            />
                        </div>
         
                        {/* 3. Mercenary Guild (Top Left) - [모바일 컴팩트 클러스터 배치] */}
                        <div className="absolute left-[7%] xs:left-[11%] sm:left-[22%] top-[7%] sm:top-[12%] z-10">
                            <MapNode 
                                type="Mercenary" 
                                available={isDistrictAvailable('Mercenary')}
                                theme={theme}
                                isClosedAtNight={!isDayFacilityOpen}
                                onClick={() => onEnterCity('Mercenary')}
                            />
                        </div>
         
                        {/* 4. Regulus Academy (Top Right) - [모바일 컴팩트 클러스터 배치] */}
                        <div className="absolute right-[7%] xs:right-[11%] sm:right-[22%] top-[7%] sm:top-[12%] z-10">
                            <MapNode 
                                type="Academic" 
                                available={isDistrictAvailable('Academic')}
                                theme={theme}
                                isClosedAtNight={!isDayFacilityOpen}
                                onClick={() => onEnterCity('Academic')}
                            />
                        </div>
         
                        {/* 5. Military Base / Castle Gate (Lower Left) - [모바일 컴팩트 클러스터 배치] */}
                        <div className="absolute left-[7%] xs:left-[10%] sm:left-[20%] bottom-[24%] sm:bottom-[18%] z-10">
                            <MapNode 
                                type="Military" 
                                available={isDistrictAvailable('Military')}
                                theme={theme}
                                isClosedAtNight={!isDayFacilityOpen}
                                onClick={() => onEnterCity('Military')}
                            />
                        </div>

                        {/* 5.5 Night Market Node - [모바일 컴팩트 클러스터 배치] */}
                        <div className="absolute left-[5%] xs:left-[8%] sm:left-[13%] bottom-[7%] sm:bottom-[7%] z-10">
                            <button 
                                onClick={() => onEnterCity('Residential')}
                                className="w-[56px] xs:w-[68px] sm:w-[78px] flex flex-col items-center group cursor-pointer relative"
                            >
                                {isNightPrime ? (
                                    <>
                                        <div className="absolute -inset-1 rounded-full bg-purple-600/30 blur-sm animate-pulse pointer-events-none"></div>
                                        <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-11 sm:h-11 rounded-full bg-slate-950 hover:bg-purple-950 border-2 border-purple-400/90 flex items-center justify-center transition-all duration-300 relative shadow-[0_0_15px_rgba(168,85,247,0.7)] group-hover:scale-105 active:scale-95">
                                            <Gem size={14} className="text-purple-300 animate-pulse" />
                                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-purple-400 border border-slate-950 rounded-full animate-ping opacity-75"></span>
                                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-purple-400 border border-slate-950 rounded-full"></span>
                                        </div>
                                        <span className="text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] font-black text-purple-300 mt-0.5 xs:mt-1 text-center truncate w-full group-hover:text-purple-100 transition-colors leading-tight">
                                            심야 암시장
                                        </span>
                                        <span className="text-[6.5px] sm:text-[7px] text-purple-400 font-bold px-1 py-0.2 rounded-full bg-purple-950 border border-purple-800">
                                            심야 개장
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-11 sm:h-11 rounded-full bg-slate-950 hover:bg-slate-900 border border-slate-800 flex items-center justify-center transition-all duration-300 relative group-hover:scale-105 active:scale-95 opacity-60 group-hover:opacity-100">
                                            <Gem size={13} className="text-slate-500 group-hover:text-purple-400" />
                                        </div>
                                        <span className="text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] font-bold text-slate-400 mt-0.5 xs:mt-1 text-center truncate w-full leading-tight">
                                            어두운 뒷골목
                                        </span>
                                        <span className="text-[6.5px] sm:text-[7px] text-slate-500 font-medium">
                                            22시 개장
                                        </span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* 7. Gate Entrance (Top Center) */}
                        <div className="absolute top-[1%] sm:top-[4%] left-1/2 -translate-x-1/2 z-10">
                            <MapNode 
                                type="Gate" 
                                available={isDistrictAvailable('Gate')}
                                theme={theme}
                                onClick={() => onEnterCity('Gate')}
                            />
                        </div>
         
                        {/* 8. Royal Court / Imperial (Bottom Center) */}
                        {tier === 'Capital' && (
                            <div className="absolute bottom-[2%] sm:bottom-[4%] left-1/2 -translate-x-1/2 z-10">
                                <MapNode 
                                    type="RoyalCourt" 
                                    available={isDistrictAvailable('RoyalCourt')}
                                    theme={theme}
                                    onClick={() => onEnterCity('RoyalCourt')}
                                />
                            </div>
                        )}
                    </>
                )}

                {/* 2. 신계 전용 노드 구조 (중앙 성전, 상단 신의 사자 신전, 우측 성스러운 필드, 좌측 신성 던전) */}
                {isShingye && (
                    <>
                        {/* 신의 사자 신전 (상단 중앙) */}
                        <div className="absolute top-[1%] sm:top-[4%] left-1/2 -translate-x-1/2 z-10">
                            <button 
                                onClick={() => onEnterCity('Imperial')}
                                className="w-[62px] xs:w-[74px] sm:w-[86px] flex flex-col items-center group cursor-pointer"
                            >
                                <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-full bg-slate-950 hover:bg-amber-950/80 border-2 border-amber-400/90 hover:border-amber-300 flex items-center justify-center transition-all duration-300 relative shadow-[0_0_20px_rgba(251,191,36,0.4)] group-hover:scale-105 active:scale-95">
                                    <Crown size={15} className="text-amber-300 animate-pulse" />
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 border border-slate-950 rounded-full animate-ping opacity-80"></span>
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 border border-slate-950 rounded-full"></span>
                                </div>
                                <span className="text-[7.5px] xs:text-[8.5px] sm:text-[10px] font-black text-amber-300 mt-0.5 xs:mt-1 text-center truncate w-full group-hover:text-amber-100 transition-colors leading-tight">
                                    신의 사자 신전
                                </span>
                                <span className="text-[6.5px] sm:text-[7.5px] text-amber-400 font-bold px-1.5 py-0.2 rounded-full bg-amber-950/80 border border-amber-600/50 mt-0.5">
                                    신전 진입
                                </span>
                            </button>
                        </div>

                        {/* 성스러운 필드 (우측 중앙) */}
                        <div className="absolute right-[2%] xs:right-[5%] sm:right-[14%] top-[45%] -translate-y-1/2 z-10">
                            <button 
                                onClick={() => onEnterCity('Outskirts', true)}
                                className="w-[58px] xs:w-[70px] sm:w-[82px] flex flex-col items-center group cursor-pointer"
                            >
                                <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-full bg-slate-950 hover:bg-emerald-950/80 border border-emerald-400/80 hover:border-emerald-300 flex items-center justify-center transition-all duration-300 relative shadow-[0_0_15px_rgba(52,211,153,0.3)] group-hover:scale-105 active:scale-95">
                                    <Compass size={14} className="text-emerald-400" />
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 border border-slate-950 rounded-full animate-pulse"></span>
                                </div>
                                <span className="text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] font-black text-emerald-300 mt-0.5 xs:mt-1 text-center truncate w-full group-hover:text-emerald-100 transition-colors leading-tight">
                                    성스러운 필드
                                </span>
                                <span className="text-[6.5px] sm:text-[7.5px] text-emerald-400 font-bold px-1.5 py-0.2 rounded-full bg-emerald-950/80 border border-emerald-700/50 mt-0.5">
                                    구역 탐색
                                </span>
                            </button>
                        </div>

                        {/* 신성 던전 (좌측 중앙) */}
                        <div className="absolute left-[2%] xs:left-[5%] sm:left-[14%] top-[45%] -translate-y-1/2 z-10">
                            <button 
                                onClick={onOpenDungeon}
                                className="w-[58px] xs:w-[70px] sm:w-[82px] flex flex-col items-center group cursor-pointer"
                            >
                                <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-full bg-slate-950 hover:bg-indigo-950/80 border border-indigo-500/80 hover:border-indigo-400 flex items-center justify-center transition-all duration-300 relative shadow-[0_0_18px_rgba(99,102,241,0.35)] group-hover:scale-105 active:scale-95">
                                    <Sparkles size={14} className="text-indigo-300 animate-pulse" />
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-indigo-400 border border-slate-950 rounded-full animate-ping opacity-60"></span>
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-indigo-400 border border-slate-950 rounded-full"></span>
                                </div>
                                <span className="text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] font-black text-indigo-300 mt-0.5 xs:mt-1 text-center truncate w-full group-hover:text-indigo-100 transition-colors leading-tight">
                                    신성 던전
                                </span>
                                <span className="text-[6.5px] sm:text-[7.5px] text-indigo-400 font-bold px-1.5 py-0.2 rounded-full bg-indigo-950/80 border border-indigo-700/50 mt-0.5">
                                    보스 토벌
                                </span>
                            </button>
                        </div>
                    </>
                )}

                {/* 3. 마계 전용 노드 구조 (중앙 심연, 상단 마신황 궁궐, 우측 심연의 경계, 좌측 지옥의 나락) */}
                {isMagye && (
                    <>
                        {/* 마신황의 궁궐 (상단 중앙) */}
                        <div className="absolute top-[1%] sm:top-[4%] left-1/2 -translate-x-1/2 z-10">
                            <button 
                                onClick={() => onEnterCity('Imperial')}
                                className="w-[62px] xs:w-[74px] sm:w-[86px] flex flex-col items-center group cursor-pointer"
                            >
                                <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-full bg-slate-950 hover:bg-red-950/80 border-2 border-red-500/90 hover:border-red-400 flex items-center justify-center transition-all duration-300 relative shadow-[0_0_22px_rgba(239,68,68,0.5)] group-hover:scale-105 active:scale-95">
                                    <Crown size={15} className="text-red-400 animate-pulse" />
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 border border-slate-950 rounded-full animate-ping opacity-80"></span>
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 border border-slate-950 rounded-full"></span>
                                </div>
                                <span className="text-[7.5px] xs:text-[8.5px] sm:text-[10px] font-black text-red-300 mt-0.5 xs:mt-1 text-center truncate w-full group-hover:text-red-100 transition-colors leading-tight">
                                    마신황의 궁궐
                                </span>
                                <span className="text-[6.5px] sm:text-[7.5px] text-red-400 font-bold px-1.5 py-0.2 rounded-full bg-red-950/80 border border-red-700/50 mt-0.5">
                                    궁궐 진입
                                </span>
                            </button>
                        </div>

                        {/* 심연의 경계 (우측 중앙) */}
                        <div className="absolute right-[2%] xs:right-[5%] sm:right-[14%] top-[45%] -translate-y-1/2 z-10">
                            <button 
                                onClick={() => onEnterCity('Outskirts', true)}
                                className="w-[58px] xs:w-[70px] sm:w-[82px] flex flex-col items-center group cursor-pointer"
                            >
                                <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-full bg-slate-950 hover:bg-red-950/80 border border-red-500/70 hover:border-red-400 flex items-center justify-center transition-all duration-300 relative shadow-[0_0_15px_rgba(239,68,68,0.3)] group-hover:scale-105 active:scale-95">
                                    <Compass size={14} className="text-red-400" />
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 border border-slate-950 rounded-full animate-pulse"></span>
                                </div>
                                <span className="text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] font-black text-red-300 mt-0.5 xs:mt-1 text-center truncate w-full group-hover:text-red-100 transition-colors leading-tight">
                                    심연의 경계
                                </span>
                                <span className="text-[6.5px] sm:text-[7.5px] text-red-400 font-bold px-1.5 py-0.2 rounded-full bg-red-950/80 border border-red-700/50 mt-0.5">
                                    심연 탐색
                                </span>
                            </button>
                        </div>

                        {/* 지옥의 나락 (좌측 중앙) */}
                        <div className="absolute left-[2%] xs:left-[5%] sm:left-[14%] top-[45%] -translate-y-1/2 z-10">
                            <button 
                                onClick={onOpenDungeon}
                                className="w-[58px] xs:w-[70px] sm:w-[82px] flex flex-col items-center group cursor-pointer"
                            >
                                <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-full bg-slate-950 hover:bg-red-950/80 border border-red-600/80 hover:border-red-500 flex items-center justify-center transition-all duration-300 relative shadow-[0_0_18px_rgba(220,38,38,0.4)] group-hover:scale-105 active:scale-95">
                                    <Skull size={14} className="text-red-400 animate-pulse" />
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 border border-slate-950 rounded-full animate-ping opacity-60"></span>
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 border border-slate-950 rounded-full"></span>
                                </div>
                                <span className="text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] font-black text-red-300 mt-0.5 xs:mt-1 text-center truncate w-full group-hover:text-red-100 transition-colors leading-tight">
                                    지옥의 나락
                                </span>
                                <span className="text-[6.5px] sm:text-[7.5px] text-red-400 font-bold px-1.5 py-0.2 rounded-full bg-red-950/80 border border-red-700/50 mt-0.5">
                                    나락 공략
                                </span>
                            </button>
                        </div>
                    </>
                )}

                {/* 6. Player Base (Lower Right) - Only shown if base is located in current city */}
                {hasBaseInCurrentLocation && (
                    <div className="absolute right-[3%] xs:right-[6%] sm:right-[20%] bottom-[24%] sm:bottom-[18%] z-10">
                        <button 
                            onClick={() => onOpenBase?.()}
                            className="w-[56px] xs:w-[68px] sm:w-[76px] flex flex-col items-center group cursor-pointer"
                        >
                            <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-11 sm:h-11 rounded-full bg-slate-950 hover:bg-slate-900 border border-cyan-500/70 hover:border-cyan-400 flex items-center justify-center transition-all duration-300 relative shadow-lg shadow-cyan-500/20 group-hover:scale-105 active:scale-95">
                                <Landmark size={14} className="text-cyan-400 group-hover:text-cyan-300" />
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cyan-400 border border-slate-950 rounded-full animate-ping opacity-70"></span>
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cyan-400 border border-slate-950 rounded-full"></span>
                            </div>
                            <span className="text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] font-black text-cyan-300 mt-0.5 xs:mt-1 text-center truncate w-full group-hover:text-cyan-100 transition-colors leading-tight">
                                기지
                            </span>
                            <span className="text-[7px] text-cyan-400 font-bold scale-90 origin-top opacity-0 group-hover:opacity-100 transition-opacity hidden xs:inline">
                                기지 진입
                            </span>
                        </button>
                    </div>
                )}

                {/* 6.1 Racial Special Facility (Elf / Beast / Demon) */}
                {isElfNation && onOpenElfCity && !isShingye && !isMagye && (
                    <div className="absolute right-[3%] xs:right-[6%] sm:right-[20%] bottom-[24%] sm:bottom-[18%] z-10">
                        <button 
                            onClick={onOpenElfCity}
                            className="w-[56px] xs:w-[68px] sm:w-[76px] flex flex-col items-center group cursor-pointer"
                        >
                            <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-11 sm:h-11 rounded-full bg-slate-950 hover:bg-emerald-950/80 border border-emerald-500/70 hover:border-emerald-400 flex items-center justify-center transition-all duration-300 relative shadow-lg shadow-emerald-950/50 group-hover:scale-105 active:scale-95">
                                <Trees size={14} className="text-emerald-400 group-hover:text-emerald-300 animate-pulse" />
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 border border-slate-950 rounded-full animate-ping opacity-70"></span>
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 border border-slate-950 rounded-full"></span>
                            </div>
                            <span className="text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] font-black text-emerald-300 mt-0.5 xs:mt-1 text-center truncate w-full group-hover:text-emerald-100 transition-colors leading-tight">
                                엘프 교류소
                            </span>
                            <span className="text-[7px] text-emerald-400 font-bold scale-90 origin-top opacity-0 group-hover:opacity-100 transition-opacity hidden xs:inline">
                                고유 시설
                            </span>
                        </button>
                    </div>
                )}

                {isBeastNation && onOpenBeastCity && !isShingye && !isMagye && (
                    <div className="absolute right-[3%] xs:right-[6%] sm:right-[20%] bottom-[24%] sm:bottom-[18%] z-10">
                        <button 
                            onClick={onOpenBeastCity}
                            className="w-[56px] xs:w-[68px] sm:w-[76px] flex flex-col items-center group cursor-pointer"
                        >
                            <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-11 sm:h-11 rounded-full bg-slate-950 hover:bg-orange-950/80 border border-orange-500/70 hover:border-orange-400 flex items-center justify-center transition-all duration-300 relative shadow-lg shadow-orange-950/50 group-hover:scale-105 active:scale-95">
                                <PawPrint size={14} className="text-orange-400 group-hover:text-orange-300 animate-pulse" />
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-400 border border-slate-950 rounded-full animate-ping opacity-70"></span>
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-400 border border-slate-950 rounded-full"></span>
                            </div>
                            <span className="text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] font-black text-orange-300 mt-0.5 xs:mt-1 text-center truncate w-full group-hover:text-orange-100 transition-colors leading-tight">
                                수인 투기광장
                            </span>
                            <span className="text-[7px] text-orange-400 font-bold scale-90 origin-top opacity-0 group-hover:opacity-100 transition-opacity hidden xs:inline">
                                고유 시설
                            </span>
                        </button>
                    </div>
                )}

                {isDemonNation && onOpenDemonCity && !isShingye && !isMagye && (
                    <div className="absolute right-[3%] xs:right-[6%] sm:right-[20%] bottom-[24%] sm:bottom-[18%] z-10">
                        <button 
                            onClick={onOpenDemonCity}
                            className="w-[56px] xs:w-[68px] sm:w-[76px] flex flex-col items-center group cursor-pointer"
                        >
                            <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-11 sm:h-11 rounded-full bg-slate-950 hover:bg-purple-950/80 border border-purple-500/70 hover:border-purple-400 flex items-center justify-center transition-all duration-300 relative shadow-lg shadow-purple-950/50 group-hover:scale-105 active:scale-95">
                                <Gavel size={14} className="text-purple-400 group-hover:text-purple-300 animate-pulse" />
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-purple-400 border border-slate-950 rounded-full animate-ping opacity-75"></span>
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-purple-400 border border-slate-950 rounded-full"></span>
                            </div>
                            <span className="text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] font-black text-purple-300 mt-0.5 xs:mt-1 text-center truncate w-full group-hover:text-purple-100 transition-colors leading-tight">
                                마인 계약소
                            </span>
                            <span className="text-[7px] text-purple-400 font-bold scale-90 origin-top opacity-0 group-hover:opacity-100 transition-opacity hidden xs:inline">
                                고유 시설
                            </span>
                        </button>
                    </div>
                )}
 
                {/* 9. Outskirts / Hunt Field (Bottom Right Edge) - 지상 도시 전용 */}
                {!isShingye && !isMagye && (
                    <div className="absolute right-[2%] xs:right-[6%] sm:right-[12%] bottom-[2%] sm:bottom-[4%] z-10">
                        <button 
                            onClick={() => onEnterCity('Outskirts', true)}
                            className="w-[54px] xs:w-[70px] sm:w-[84px] flex flex-col items-center group cursor-pointer"
                        >
                            <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-full bg-slate-950 hover:bg-slate-900 border border-orange-500/50 hover:border-orange-400 flex items-center justify-center transition-all duration-300 relative shadow-lg group-hover:scale-105 active:scale-95">
                                <Tent size={14} className="text-orange-400" />
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 border border-slate-950 rounded-full animate-pulse"></span>
                            </div>
                            <span className="text-[8px] xs:text-[9px] sm:text-[10px] font-black text-orange-300 mt-0.5 text-center truncate w-full group-hover:text-orange-200 transition-colors leading-none">
                                야외 사냥터
                            </span>
                            <span className="text-[7px] text-slate-400 font-bold hidden xs:inline">
                                필드
                            </span>
                        </button>
                    </div>
                )}
 
                {/* 10. Test Dungeon / Dimensional Rift (Bottom Center-Left) - 차원의 틈새이거나 지상 도시일 때만 표시 */}
                {(isMythicBoss || (!isShingye && !isMagye)) && (
                    <div className="absolute left-[30%] xs:left-[32%] sm:left-[34%] bottom-[2%] sm:bottom-[4%] z-10">
                        <button 
                            onClick={onOpenDungeon}
                            className="w-[58px] xs:w-[72px] sm:w-[88px] flex flex-col items-center group cursor-pointer relative"
                        >
                            {isMythicBoss ? (
                                <>
                                    {/* 차원의 틈새 왜곡 오라 */}
                                    <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-purple-600/40 via-fuchsia-500/30 to-amber-500/30 blur-md animate-pulse pointer-events-none"></div>
                                    
                                    <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-full bg-slate-950 hover:bg-purple-950/90 border-2 border-purple-400/80 hover:border-fuchsia-300 flex items-center justify-center transition-all duration-300 relative shadow-[0_0_18px_rgba(168,85,247,0.6)] group-hover:shadow-[0_0_26px_rgba(217,70,239,0.9)] group-hover:scale-110 active:scale-95">
                                        {/* 회전하는 차원 균열 링 */}
                                        <div className="absolute inset-0.5 rounded-full border border-dashed border-fuchsia-400/50 animate-[spin_8s_linear_infinite]"></div>
                                        <Zap size={15} className="text-fuchsia-300 group-hover:text-amber-300 animate-pulse transition-colors" />
                                        
                                        {/* 이중 이상 현상 핑 */}
                                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-fuchsia-400 border border-slate-950 rounded-full animate-ping opacity-80"></span>
                                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-gradient-to-tr from-purple-500 to-amber-300 border border-slate-950 rounded-full shadow-sm"></span>
                                    </div>
                                    
                                    <span className="text-[8px] xs:text-[9.5px] sm:text-[10.5px] font-black bg-gradient-to-r from-purple-300 via-fuchsia-200 to-amber-300 bg-clip-text text-transparent mt-1 text-center truncate w-full group-hover:from-purple-200 group-hover:to-amber-100 transition-colors leading-none tracking-tight">
                                        차원의 틈새
                                    </span>
                                    
                                    <span className="text-[6.5px] xs:text-[7.5px] text-fuchsia-300 font-bold px-1.5 py-0.5 bg-purple-950/90 border border-purple-500/50 rounded-full mt-0.5 shadow-sm leading-none flex items-center gap-0.5">
                                        <Sparkles size={8} className="text-amber-300 animate-spin" />
                                        신화 강림
                                    </span>
                                </>
                            ) : (
                                <>
                                    <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-full bg-slate-950 hover:bg-slate-900 border border-red-500/50 hover:border-red-400 flex items-center justify-center transition-all duration-300 relative shadow-lg group-hover:scale-105 active:scale-95">
                                        <Building2 size={14} className="text-red-400 animate-pulse" />
                                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 border border-slate-950 rounded-full animate-ping opacity-60"></span>
                                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 border border-slate-950 rounded-full"></span>
                                    </div>
                                    <span className="text-[8px] xs:text-[9px] sm:text-[10px] font-black text-red-300 mt-0.5 text-center truncate w-full group-hover:text-red-200 transition-colors leading-none">
                                        시험 던전
                                    </span>
                                    <span className="text-[7px] text-slate-400 font-bold hidden xs:inline">
                                        던전
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                )}
 
            </div>

            {/* 하단 네비게이션 및 첩보 작전 버튼 바 (좌측 하단 고정 - 실시간 로그 위로 배치) */}
            <div className="absolute left-2.5 xs:left-4 bottom-[72px] sm:bottom-[64px] z-20 flex items-center gap-2 flex-wrap">
                {/* [모바일 최적화] 모바일에서는 하단 5대 네비게이션의 [지도] 탭이 있으므로 화면을 가리는 중복 버튼 숨김 */}
                <button
                    onClick={onOpenMap}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/90 border border-indigo-500/50 hover:border-indigo-400 text-indigo-300 hover:text-indigo-200 shadow-lg shadow-indigo-950/40 backdrop-blur-md text-[11px] sm:text-xs font-black transition-all hover:scale-105 active:scale-95"
                >
                    <Map size={13} className="animate-pulse" />
                    <span>다른 지역으로 이동</span>
                </button>

                {/* 적국 첩보 임무 버튼 (상시 클릭하여 모달 열람 가능, 목표 도착 시 강조) */}
                {infiltrationQuest && (
                    <button
                        onClick={() => setIsInfiltrationModalOpen(true)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border shadow-lg backdrop-blur-md text-[11px] sm:text-xs font-black transition-all hover:scale-105 active:scale-95 ${
                            isAtInfiltrationTarget
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 border-amber-300 shadow-amber-950/80 animate-bounce'
                                : 'bg-slate-950/90 border-amber-500/50 hover:border-amber-400 text-amber-300'
                        }`}
                        title="군대 적국 첩보 임무 모달 열기"
                    >
                        <Eye size={13} className={isAtInfiltrationTarget ? 'text-slate-950' : 'text-amber-400 animate-pulse'} />
                        <span>{isAtInfiltrationTarget ? '기밀 첩보 작전 개시' : `첩보 목표: ${infilReqNation} ${infilReqCity}`}</span>
                    </button>
                )}
            </div>

            {/* 군대 계급 보유 시 국경 정찰 / 첩보 / 방벽 복구 / 심야 순찰 패널 (지상 도시 및 첩보 목표 도시 전용) */}
            {character.militaryRank && !isShingye && (!isMagye || Boolean(infiltrationQuest)) && (
                <div className="z-20 px-4 max-w-4xl mx-auto w-full">
                    <MilitaryCityActionPanel
                        character={character}
                        onUpdateCharacter={onUpdateCharacter || (() => {})}
                        onStartBattle={onStartBattle}
                        onOpenInfiltrationModal={() => setIsInfiltrationModalOpen(true)}
                    />
                </div>
            )}

            {/* Quick Travel Modal (Mobile Optimized) */}
            {isQuickTravelOpen && (
                <QuickTravelModal
                    isOpen={isQuickTravelOpen}
                    onClose={() => setIsQuickTravelOpen(false)}
                    character={character}
                    onTravel={onTravel}
                    onOpenMap={onOpenMap}
                    onOpenDungeon={onOpenDungeon}
                    onOpenHunt={() => onEnterCity(undefined, true)}
                    onOpenBase={onOpenBase}
                />
            )}

            {/* Midnight Labor Penalty Info Modal (Mobile Optimized) */}
            <MidnightPenaltyModal
                isOpen={isMidnightModalOpen}
                onClose={() => setIsMidnightModalOpen(false)}
                currentTime={character.currentTime}
                currentDate={character.currentDate}
            />

            {/* Military Infiltration Modal (Mobile Optimized) */}
            {infiltrationQuest && isInfiltrationModalOpen && (
                <MilitaryInfiltrationModal
                    isOpen={isInfiltrationModalOpen}
                    onClose={() => setIsInfiltrationModalOpen(false)}
                    character={character}
                    quest={infiltrationQuest}
                    onUpdateCharacter={onUpdateCharacter || (() => {})}
                    onStartBattle={onStartBattle}
                />
            )}
        </div>
    );
};

/* INNER COMPONENT: INDIVIDUAL MAP NODE */
interface MapNodeProps {
    type: DistrictType | 'Gate';
    available: boolean;
    theme: any;
    isClosedAtNight?: boolean;
    onClick: () => void;
}

const MapNode: React.FC<MapNodeProps> = ({ type, available, theme, isClosedAtNight, onClick }) => {
    const config = DISTRICT_CONFIG[type as DistrictType] || { label: '구역', desc: '', icon: 'Home', color: 'text-slate-400' };
    
    const getIcon = () => {
        switch (type) {
            case 'Gate': return <Compass size={14} className="text-slate-400" />;
            case 'Commercial': return <Store size={14} className={isClosedAtNight ? 'text-amber-500/60' : 'text-amber-400'} />;
            case 'Residential': return <Home size={14} className="text-green-400" />;
            case 'Mercenary': return <Sword size={14} className={isClosedAtNight ? 'text-red-500/60' : 'text-red-400'} />;
            case 'Military': return <Shield size={14} className={isClosedAtNight ? 'text-slate-500' : 'text-slate-400'} />;
            case 'Academic': return <BookOpen size={14} className={isClosedAtNight ? 'text-cyan-500/60' : 'text-cyan-400'} />;
            case 'RoyalCourt': return <Crown size={14} className="text-amber-400" />;
            default: return <Building2 size={14} />;
        }
    };

    if (!available) {
        return (
            <div className="w-[56px] xs:w-[68px] sm:w-[76px] flex flex-col items-center opacity-25 cursor-not-allowed">
                <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-11 sm:h-11 rounded-full bg-slate-950 border border-slate-900 flex items-center justify-center text-slate-600">
                    {getIcon()}
                </div>
                <span className="text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] font-bold text-slate-600 mt-1 text-center truncate w-full">
                    {config.label}
                </span>
                <span className="text-[6.5px] sm:text-[7.5px] text-slate-700 font-bold">미개방</span>
            </div>
        );
    }

    return (
        <button 
            onClick={onClick}
            className="w-[56px] xs:w-[68px] sm:w-[76px] flex flex-col items-center group cursor-pointer"
        >
            <div className={`w-8 h-8 xs:w-10 xs:h-10 sm:w-11 sm:h-11 rounded-full bg-slate-950 hover:bg-slate-900 border ${
                isClosedAtNight ? 'border-slate-800' : (theme.borderColor || 'border-slate-800')
            } flex items-center justify-center transition-all duration-300 relative shadow-md group-hover:scale-105 active:scale-95`}>
                {getIcon()}
                {/* Active Indicator Pulse or Closed indicator */}
                {isClosedAtNight ? (
                    <span className="absolute -top-0.5 -right-0.5 text-[6.5px] font-bold px-1 py-0.2 bg-rose-950 border border-rose-800 text-rose-300 rounded-full scale-90 leading-none">
                        마감
                    </span>
                ) : (
                    <>
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-slate-950 rounded-full animate-ping opacity-60"></span>
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-slate-950 rounded-full"></span>
                    </>
                )}
            </div>
            <span className={`text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] font-black mt-0.5 xs:mt-1 text-center truncate w-full group-hover:text-white transition-colors leading-tight ${
                isClosedAtNight ? 'text-slate-400' : 'text-slate-200'
            }`}>
                {config.label}
            </span>
            <span className="text-[7px] text-slate-400 font-bold scale-90 origin-top opacity-0 group-hover:opacity-100 transition-opacity hidden xs:inline">
                진입하기
            </span>
        </button>
    );
};

export default CityMapBoard;
