import React, { useState, useEffect } from 'react';
import { 
    X, Sword, Shield, Map as MapIcon, ChevronLeft, Skull, Flame, 
    Star, Info, Target, AlertTriangle, Sparkles, Zap, Compass, ChevronRight, 
    Crosshair, Footprints, Eye, Layers, Backpack, ShieldAlert, Award
} from 'lucide-react';
import { Character } from '../types';
import { HUNT_LEVEL_BANDS, NATION_THEMES, getMonsterInfo, MonsterInfo, getHuntBandsForLocation, isDivineLocation } from '../monsterfield';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    character: Character;
    onEnterField: (bandId: string, minLvl: number, maxLvl: number) => void;
    initialBandId?: string;
}

// 지역 및 국가별 세부 고유 분위기 / 테마 셋업
const getRegionAtmosphere = (region: string, nation: string) => {
    if (region === '마계' || nation === '임페리얼 제국' || nation === '네크로디움 제국' || nation.includes('마계')) {
        return {
            regionBadge: '💀 심연 마계령',
            badgeBg: 'bg-red-950/90 border-red-700 text-red-300',
            bgGradients: 'from-slate-950 via-red-950/40 to-black',
            cardBorder: 'border-red-900/50 hover:border-red-500/80',
            selectedCard: 'bg-gradient-to-r from-red-950/70 via-slate-900/90 to-red-900/30 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.35)]',
            accentText: 'text-red-400',
            accentBg: 'bg-red-500/10 text-red-400 border-red-500/30',
            accentGlow: 'rgba(239,68,68,0.35)',
            ambientTag: '암흑 마기 • 차원 균열',
            ambientDesc: '타락한 마기와 암흑 에너지가 대기를 가득 채우고 있는 위험천만한 심연 영역입니다.',
            bgPattern: 'radial-gradient(ellipse at top, rgba(185, 28, 28, 0.18), transparent 70%)',
            bgIcon: <Skull className="text-red-950/30" size={160} />
        };
    }
    if (region === '신계' || nation.includes('신계')) {
        return {
            regionBadge: '✨ 성역 신계령',
            badgeBg: 'bg-amber-950/90 border-amber-500 text-amber-300',
            bgGradients: 'from-slate-950 via-indigo-950/40 to-amber-950/30',
            cardBorder: 'border-amber-700/50 hover:border-amber-400/80',
            selectedCard: 'bg-gradient-to-r from-amber-950/60 via-slate-900/90 to-indigo-950/50 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.35)]',
            accentText: 'text-amber-300',
            accentBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
            accentGlow: 'rgba(245,158,11,0.35)',
            ambientTag: '신성 오러 • 천상 결계',
            ambientDesc: '천상의 신성력과 태초의 오러가 은은하게 공명하는 고결한 신들의 안식처입니다.',
            bgPattern: 'radial-gradient(ellipse at top, rgba(245, 158, 11, 0.15), transparent 70%)',
            bgIcon: <Sparkles className="text-amber-950/30" size={160} />
        };
    }
    if (nation === '미르탈 숲연합' || nation === '엘프 연맹' || nation.includes('엘프') || nation.includes('숲')) {
        return {
            regionBadge: '🌿 엘프 세계수 숲',
            badgeBg: 'bg-emerald-950/90 border-emerald-600 text-emerald-300',
            bgGradients: 'from-slate-950 via-emerald-950/30 to-slate-950',
            cardBorder: 'border-emerald-800/50 hover:border-emerald-400/80',
            selectedCard: 'bg-gradient-to-r from-emerald-950/70 via-slate-900/90 to-emerald-900/30 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.35)]',
            accentText: 'text-emerald-400',
            accentBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
            accentGlow: 'rgba(16,185,129,0.35)',
            ambientTag: '정령의 숨결 • 세계수 맹약',
            ambientDesc: '고대 정령의 숨결과 태고의 풀잎 내음이 깃든 신비로운 엘프 영토입니다.',
            bgPattern: 'radial-gradient(ellipse at top, rgba(16, 185, 129, 0.18), transparent 70%)',
            bgIcon: <Layers className="text-emerald-950/30" size={160} />
        };
    }
    if (nation === '레오니스 투기국' || nation === '수호국' || region === '아프리카' || nation.includes('투기')) {
        return {
            regionBadge: '🦁 야수 대평원',
            badgeBg: 'bg-orange-950/90 border-orange-600 text-orange-300',
            bgGradients: 'from-slate-950 via-orange-950/30 to-slate-950',
            cardBorder: 'border-orange-800/50 hover:border-orange-400/80',
            selectedCard: 'bg-gradient-to-r from-orange-950/70 via-slate-900/90 to-amber-900/30 border-orange-400 shadow-[0_0_25px_rgba(249,115,22,0.35)]',
            accentText: 'text-orange-400',
            accentBg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
            accentGlow: 'rgba(249,115,22,0.35)',
            ambientTag: '야생 본능 • 약육강식',
            ambientDesc: '약육강식의 야생 본능과 거대한 맹수들이 지배하는 광활한 황야 대지입니다.',
            bgPattern: 'radial-gradient(ellipse at top, rgba(249, 115, 22, 0.18), transparent 70%)',
            bgIcon: <Flame className="text-orange-950/30" size={160} />
        };
    }
    if (['대한민국', '일본', '중국', '아시아', '태국', '베트남', '인도'].includes(nation)) {
        return {
            regionBadge: '⛩️ 동방 영맥지대',
            badgeBg: 'bg-indigo-950/90 border-indigo-500 text-indigo-300',
            bgGradients: 'from-slate-950 via-slate-900 to-indigo-950/40',
            cardBorder: 'border-slate-800 hover:border-indigo-500/80',
            selectedCard: 'bg-gradient-to-r from-indigo-950/70 via-slate-900/90 to-blue-900/30 border-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.35)]',
            accentText: 'text-indigo-400',
            accentBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
            accentGlow: 'rgba(99,102,241,0.35)',
            ambientTag: '영맥 공명 • 신비한 도술',
            ambientDesc: '천 년의 고대 영물들과 신비한 도술, 요괴들의 설화가 깃든 유서 깊은 동방의 영지입니다.',
            bgPattern: 'radial-gradient(ellipse at top, rgba(99, 102, 241, 0.18), transparent 70%)',
            bgIcon: <Compass className="text-indigo-950/30" size={160} />
        };
    }
    if (['영국', '프랑스', '독일', '이탈리아', '러시아', '유럽'].includes(nation)) {
        return {
            regionBadge: '🏰 서방 기사도 영지',
            badgeBg: 'bg-blue-950/90 border-blue-600 text-blue-300',
            bgGradients: 'from-slate-950 via-slate-900 to-blue-950/40',
            cardBorder: 'border-slate-800 hover:border-blue-500/80',
            selectedCard: 'bg-gradient-to-r from-blue-950/70 via-slate-900/90 to-slate-900 border-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.35)]',
            accentText: 'text-blue-400',
            accentBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
            accentGlow: 'rgba(59,130,246,0.35)',
            ambientTag: '기사단 요새 • 고대 비전',
            ambientDesc: '고대 마법 왕국과 기사단의 요새가 지켜온 울창한 숲과 신비의 산악 지대입니다.',
            bgPattern: 'radial-gradient(ellipse at top, rgba(59, 130, 246, 0.18), transparent 70%)',
            bgIcon: <Shield className="text-blue-950/30" size={160} />
        };
    }
    return {
        regionBadge: '🗺️ 대륙 미개척지',
        badgeBg: 'bg-slate-800/90 border-slate-600 text-slate-300',
        bgGradients: 'from-slate-950 via-slate-900 to-slate-950',
        cardBorder: 'border-slate-800 hover:border-slate-500',
        selectedCard: 'bg-gradient-to-r from-slate-800/90 via-slate-900 to-slate-800 border-slate-400 shadow-xl',
        accentText: 'text-amber-400',
        accentBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        accentGlow: 'rgba(245,158,11,0.25)',
        ambientTag: '미개척지 • 미지의 야생',
        ambientDesc: '미지의 마물들이 도사리는 위험하지만 기회가 가득한 필드 영역입니다.',
        bgPattern: 'radial-gradient(ellipse at top, rgba(100, 116, 139, 0.18), transparent 70%)',
        bgIcon: <MapIcon className="text-slate-800/20" size={160} />
    };
};

const HuntMapModal: React.FC<Props> = ({ isOpen, onClose, character, onEnterField, initialBandId }) => {
    const defaultBandId = initialBandId || character.lastHuntingBandId || null;
    const [selectedBandId, setSelectedBandId] = useState<string | null>(defaultBandId);
    const [filterCategory, setFilterCategory] = useState<'all' | 'safe' | 'danger'>('all');
    // 모바일 탭 상태: 'list' (목록 보기) 또는 'detail' (상세 및 출격)
    const [mobileTab, setMobileTab] = useState<'list' | 'detail'>('list');

    useEffect(() => {
        if (initialBandId) {
            setSelectedBandId(initialBandId);
        } else if (character.lastHuntingBandId && !selectedBandId) {
            setSelectedBandId(character.lastHuntingBandId);
        }
    }, [initialBandId, character.lastHuntingBandId]);

    if (!isOpen) return null;

    const loc = character.currentLocation || { region: "아시아", nation: character.nation || "대한민국", city: "서울" };
    const nation = loc.nation || character.nation || "대한민국";
    const region = loc.region || "아시아";
    const city = loc.city || "수도";

    const theme = NATION_THEMES[nation] || NATION_THEMES["default"];
    const atmosphere = getRegionAtmosphere(region, nation);
    const bandsSource = getHuntBandsForLocation(nation, region, city);

    // 필터링된 밴드 리스트
    const availableBands = bandsSource.filter(band => {
        if (band.id === 'devil' || band.id === 'divine') {
            const monsters = theme.monsters[band.id] || NATION_THEMES.default.monsters[band.id] || [];
            return monsters.length > 0;
        }
        return true;
    });

    const displayBands = availableBands.filter(band => {
        if (filterCategory === 'safe') {
            return character.level >= band.levelRange[0] - 5;
        }
        if (filterCategory === 'danger') {
            return character.level < band.levelRange[0] - 5;
        }
        return true;
    });

    // 선택된 밴드 (우선순위: selectedBandId -> initialBandId -> lastHuntingBandId -> 첫 번째 밴드)
    const candidateBandId = selectedBandId || initialBandId || character.lastHuntingBandId;
    const effectiveSelectedId = (candidateBandId && availableBands.some(b => b.id === candidateBandId))
        ? candidateBandId
        : (displayBands.length > 0 ? displayBands[0].id : availableBands[0]?.id);
    const selectedBand = availableBands.find(b => b.id === effectiveSelectedId) || availableBands[0];

    const getIcon = (id: string) => {
        switch(id) {
            case 'beginner': return <Shield size={20} className="text-emerald-400" />;
            case 'lower': return <Sword size={20} className="text-cyan-400" />;
            case 'intermediate': return <Target size={20} className="text-blue-400" />;
            case 'advanced': return <Crosshair size={20} className="text-indigo-400" />;
            case 'elite': return <Flame size={20} className="text-amber-400" />;
            case 'disaster': return <AlertTriangle size={20} className="text-orange-500" />;
            case 'abyss': return <Skull size={20} className="text-rose-500" />;
            case 'mythic': return <Star size={20} className="text-purple-400 animate-pulse" />;
            case 'devil': return <Zap size={20} className="text-red-500 animate-pulse" />;
            case 'divine': return <Sparkles size={20} className="text-yellow-300 animate-bounce" />;
            default: return <MapIcon size={20} className="text-slate-400" />;
        }
    };

    const getDifficultyBadge = (diff: string, minLvl: number) => {
        const diffLevel = character.level - minLvl;
        
        if (diffLevel >= 15) {
            return { text: '매우 수월', color: 'bg-slate-900 text-slate-400 border-slate-700' };
        } else if (diffLevel >= 5) {
            return { text: '안정적', color: 'bg-cyan-950/80 text-cyan-300 border-cyan-700' };
        } else if (diffLevel >= -5) {
            return { text: '적정 난이도', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-700' };
        } else if (diffLevel >= -15) {
            return { text: '위험 (주의)', color: 'bg-amber-950/80 text-amber-300 border-amber-700 animate-pulse' };
        } else {
            return { text: '치명적 위험', color: 'bg-red-950/90 text-red-300 border-red-600 shadow-[0_0_10px_rgba(220,38,38,0.4)] animate-pulse' };
        }
    };

    // 출몰 몬스터 객체 리스트 파싱
    const monsterList = (theme.monsters[selectedBand.id] || NATION_THEMES.default.monsters[selectedBand.id] || []).map(m => getMonsterInfo(m));

    const handleSelectBand = (bandId: string) => {
        setSelectedBandId(bandId);
        setMobileTab('detail');
    };

    return (
        <div id="hunt-map-modal-backdrop" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
            {/* 메인 팝업 컨테이너 */}
            <div 
                id="hunt-map-modal-card"
                className={`w-full max-w-5xl h-[92vh] sm:h-[88vh] md:h-[84vh] bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden relative text-slate-100 ${atmosphere.bgGradients}`}
                style={{ backgroundImage: atmosphere.bgPattern }}
            >
                {/* 배경 워터마크 아이콘 */}
                <div className="absolute right-4 bottom-4 pointer-events-none opacity-10 hidden md:block">
                    {atmosphere.bgIcon}
                </div>

                {/* 모바일 상단 탭 전환 바 (모바일 전용) */}
                <div id="hunt-mobile-tab-nav" className="md:hidden flex border-b border-slate-800/80 bg-slate-950/95 shrink-0 z-20">
                    <button
                        id="hunt-mobile-tab-list-btn"
                        onClick={() => setMobileTab('list')}
                        className={`flex-1 py-3 text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
                            mobileTab === 'list' 
                                ? 'border-amber-400 text-white bg-slate-900/60' 
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Compass size={14} className={mobileTab === 'list' ? atmosphere.accentText : ''} />
                        <span>사냥터 목록 ({availableBands.length})</span>
                    </button>
                    <button
                        id="hunt-mobile-tab-detail-btn"
                        onClick={() => setMobileTab('detail')}
                        className={`flex-1 py-3 text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
                            mobileTab === 'detail' 
                                ? 'border-amber-400 text-white bg-slate-900/60' 
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Eye size={14} className={mobileTab === 'detail' ? atmosphere.accentText : ''} />
                        <span>선택 사냥터 상세</span>
                    </button>
                </div>

                {/* ========================================================================= */}
                {/* 왼쪽 사이드: 사냥터 목록 & 필터 (모바일에서는 탭 선택에 따라 전환) */}
                {/* ========================================================================= */}
                <div 
                    id="hunt-map-sidebar"
                    className={`w-full md:w-[42%] border-b md:border-b-0 md:border-r border-slate-800/80 bg-slate-950/80 flex flex-col shrink-0 z-10 h-full ${
                        mobileTab === 'list' ? 'flex' : 'hidden md:flex'
                    }`}
                >
                    {/* 상단 헤더 영역 */}
                    <div className="p-4 sm:p-5 border-b border-slate-800/80 flex justify-between items-start shrink-0 bg-slate-950/90">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${atmosphere.badgeBg}`}>
                                    {atmosphere.regionBadge}
                                </span>
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${atmosphere.accentBg}`}>
                                    {atmosphere.ambientTag}
                                </span>
                            </div>
                            <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-100 flex items-center gap-2">
                                <Compass className={atmosphere.accentText} size={20} />
                                <span>{nation} <span className="text-slate-400 text-xs sm:text-sm font-normal">({city} 인근)</span></span>
                            </h2>
                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                                {theme.fieldSuffix}
                            </p>
                        </div>
                        <button 
                            id="hunt-map-close-btn-desktop"
                            onClick={onClose} 
                            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors border border-slate-800 hover:border-slate-700 hidden md:block"
                        >
                            <X size={18} />
                        </button>
                        <button 
                            id="hunt-map-close-btn-mobile"
                            onClick={onClose} 
                            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors border border-slate-800 md:hidden"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* 난이도 필터 버튼 바 */}
                    <div className="px-4 py-2 border-b border-slate-800/60 bg-slate-900/50 flex items-center justify-between gap-1 shrink-0 text-xs">
                        <div className="flex items-center gap-1.5">
                            <button
                                id="filter-all-btn"
                                onClick={() => setFilterCategory('all')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${filterCategory === 'all' ? 'bg-slate-800 text-white border border-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                전체 ({availableBands.length})
                            </button>
                            <button
                                id="filter-safe-btn"
                                onClick={() => setFilterCategory('safe')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${filterCategory === 'safe' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                적정 권장
                            </button>
                            <button
                                id="filter-danger-btn"
                                onClick={() => setFilterCategory('danger')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${filterCategory === 'danger' ? 'bg-red-950 text-red-300 border border-red-700 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                고난도
                            </button>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">Lv.{character.level} 기준</span>
                    </div>

                    {/* 사냥터 리스트 스크롤 영역 */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-2.5 overscroll-contain">
                        {displayBands.map((band) => {
                            const isSelected = selectedBand.id === band.id;
                            const status = getDifficultyBadge(band.difficulty, band.levelRange[0]);
                            const isDanger = character.level < band.levelRange[0] - 5;
                            const isExtreme = character.level < band.levelRange[0] - 15;

                            return (
                                <button
                                    key={band.id}
                                    id={`hunt-band-item-${band.id}`}
                                    onClick={() => handleSelectBand(band.id)}
                                    className={`w-full p-3 sm:p-3.5 rounded-2xl border transition-all text-left group relative flex items-center justify-between cursor-pointer ${
                                        isSelected 
                                            ? atmosphere.selectedCard 
                                            : `bg-slate-900/60 ${atmosphere.cardBorder} hover:bg-slate-900/90`
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0 pr-2">
                                        <div className={`w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${isSelected ? 'border-amber-400/60 shadow-inner' : 'border-slate-800'}`}>
                                            {getIcon(band.id)}
                                        </div>
                                        <div className="truncate">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`font-bold text-xs sm:text-sm truncate ${isSelected ? 'text-white font-black' : 'text-slate-200'}`}>
                                                    {band.name}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                                                <span className="text-amber-400 font-semibold">Lv.{band.levelRange[0]}~{band.levelRange[1]}</span>
                                                <span className="text-slate-600">|</span>
                                                <span className="text-slate-400">{band.difficulty}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end shrink-0 gap-1">
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${status.color}`}>
                                            {status.text}
                                        </span>
                                        {isExtreme ? (
                                            <span className="text-[8px] font-black text-rose-500 flex items-center gap-0.5">
                                                <AlertTriangle size={10} /> 즉사위험
                                            </span>
                                        ) : isDanger ? (
                                            <span className="text-[8px] font-bold text-amber-400">주의</span>
                                        ) : (
                                            <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-300 md:hidden" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}

                        {displayBands.length === 0 && (
                            <div className="py-12 text-center text-slate-500">
                                <Compass size={32} className="mx-auto mb-2 opacity-40" />
                                <p className="text-xs">해당 조건에 만족하는 사냥터가 없습니다.</p>
                            </div>
                        )}
                    </div>

                    {/* 하단 내 정보 간이 요약 바 */}
                    <div className="p-3 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500 font-bold">플레이어:</span>
                            <span className="font-mono font-bold text-amber-400">Lv.{character.level} {character.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500 font-bold">탐색지:</span>
                            <span className="text-slate-300 font-medium">{nation}</span>
                        </div>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* 오른쪽: 선택된 사냥터 상세 정보, 몬스터 도감, 분위기 카드 & 진입 버튼 */}
                {/* ========================================================================= */}
                <div 
                    id="hunt-map-detail-panel"
                    className={`flex-1 flex flex-col bg-slate-950/40 z-10 h-full ${
                        mobileTab === 'detail' ? 'flex' : 'hidden md:flex'
                    }`}
                >
                    {/* 상단 네비게이션 헤더 */}
                    <div className="p-3.5 sm:p-4 border-b border-slate-800/80 bg-slate-950/90 flex justify-between items-center shrink-0">
                        <button 
                            id="hunt-back-to-list-btn"
                            onClick={() => setMobileTab('list')} 
                            className="md:hidden flex items-center text-xs font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 active:scale-95 transition-all"
                        >
                            <ChevronLeft size={16} className="mr-1 text-slate-400" /> 사냥터 목록 보기
                        </button>
                        <div className="hidden md:flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                <Eye size={14} className={atmosphere.accentText} /> 사냥터 상세 정보 및 출격 준비
                            </span>
                        </div>
                        <button 
                            id="hunt-detail-close-btn"
                            onClick={onClose} 
                            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* 메인 상세 본문 스크롤 영역 */}
                    <div className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col items-center justify-between overflow-y-auto custom-scrollbar overscroll-contain">
                        <div className="w-full max-w-xl space-y-4 sm:space-y-6">
                            
                            {/* 사냥터 엠블럼 & 타이틀 */}
                            <div className="text-center relative pt-1 sm:pt-2">
                                <div className="inline-flex relative mb-3">
                                    <div 
                                        className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-3xl bg-slate-950 border-2 flex items-center justify-center mx-auto shadow-2xl relative z-10 transition-transform hover:scale-105"
                                        style={{ borderColor: atmosphere.accentGlow }}
                                    >
                                        <div className="scale-125 sm:scale-150">
                                            {getIcon(selectedBand.id)}
                                        </div>
                                    </div>
                                    <div 
                                        className="absolute inset-0 rounded-3xl blur-xl opacity-35 animate-pulse pointer-events-none"
                                        style={{ backgroundColor: atmosphere.accentGlow }}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center justify-center gap-2 flex-wrap">
                                        <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border ${atmosphere.badgeBg}`}>
                                            {nation} 영지
                                        </span>
                                        <span className="text-[10px] sm:text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-amber-400">
                                            권장 Lv.{selectedBand.levelRange[0]} ~ {selectedBand.levelRange[1]}
                                        </span>
                                    </div>
                                    <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                                        {nation} {selectedBand.name}
                                    </h3>
                                    <p className={`text-xs sm:text-sm font-medium tracking-wide ${atmosphere.accentText}`}>
                                        "{theme.fieldSuffix}"
                                    </p>
                                </div>
                            </div>

                            {/* 지역 분위기 & 환경 설명 카드 */}
                            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-lg space-y-4">
                                
                                {/* 지형 설명 */}
                                <div>
                                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                        <Info size={13} className={atmosphere.accentText} />
                                        <span>지역 환경 및 서식지 정보</span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                                        "{selectedBand.description}"
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-2 px-1">
                                        {atmosphere.ambientDesc}
                                    </p>
                                </div>

                                {/* 출몰 몬스터 도감 미리보기 (아바타 포함) */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            <Skull size={13} className="text-rose-400" />
                                            <span>출몰 몬스터 생태계 ({monsterList.length}종 확인)</span>
                                        </span>
                                        <span className="text-[10px] text-slate-500">진입 시 마주침</span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {monsterList.map((m, idx) => (
                                            <div 
                                                key={idx} 
                                                className="flex items-center gap-2 bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 p-2 rounded-xl transition-all group/mon"
                                            >
                                                <img 
                                                    src={m.visualUrl} 
                                                    alt={m.name} 
                                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover bg-slate-900 border border-slate-800 shrink-0 group-hover/mon:scale-105 transition-transform"
                                                    referrerPolicy="no-referrer"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[11px] sm:text-xs font-bold text-slate-200 truncate group-hover/mon:text-amber-300 transition-colors">
                                                        {m.name}
                                                    </div>
                                                    <div className="text-[9px] text-slate-500">
                                                        {selectedBand.difficulty}급 마물
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 위험도 및 보상 가이드 */}
                                <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-left">
                                    <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                                        <span className="text-[10px] text-slate-400 block font-medium">전투 위험도 판정</span>
                                        <span className={`text-xs font-bold ${getDifficultyBadge(selectedBand.difficulty, selectedBand.levelRange[0]).color.split(' ')[1]}`}>
                                            {getDifficultyBadge(selectedBand.difficulty, selectedBand.levelRange[0]).text}
                                        </span>
                                    </div>
                                    <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                                        <span className="text-[10px] text-slate-400 block font-medium">주요 획득 전리품</span>
                                        <span className="text-xs font-bold text-slate-200">
                                            {selectedBand.id === 'beginner' || selectedBand.id === 'lower' ? '기초 가죽 / 고기 / 마석' : '고급 재료 / 고순도 마정석 / 비전서'}
                                        </span>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* 하단 진입 실행 버튼 */}
                        <div className="w-full max-w-xl mt-6 pt-2">
                            <button 
                                id="enter-field-departure-btn"
                                onClick={() => onEnterField(selectedBand.id, selectedBand.levelRange[0], selectedBand.levelRange[1])}
                                className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-red-800 via-red-600 to-amber-600 hover:from-red-700 hover:via-red-500 hover:to-amber-500 text-white font-black rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01] active:scale-[0.98] cursor-pointer border border-red-500/50"
                            >
                                <Sword size={20} className="animate-bounce" />
                                <span className="text-sm sm:text-base md:text-lg tracking-wide">{nation} {selectedBand.name} 탐색 출격</span>
                            </button>
                            <p className="text-[10px] sm:text-xs text-slate-400 text-center mt-2.5 flex items-center justify-center gap-1">
                                <Footprints size={12} className="text-slate-500" />
                                <span>진입 즉시 {selectedBand.name}의 야생 마물과 조우하여 사냥 전투가 진행됩니다.</span>
                            </p>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default HuntMapModal;
