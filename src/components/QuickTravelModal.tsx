import React, { useMemo } from 'react';
import { Character, Location } from '../types';
import { WORLD_GEOGRAPHY } from '../constants';
import { Castle, Crown, Compass, Crosshair, Map as MapIcon, X, Navigation, Coins, Clock, Flame } from 'lucide-react';
import { calculateTravelCostAndDays, findRegionForNation } from '../services/travelCalculationService';
import { getValidRivalLocation } from '../services/rivalLocationService';

interface QuickTravelModalProps {
    isOpen: boolean;
    onClose: () => void;
    character: Character;
    onTravel?: (destination: Location, cost: number, days: number) => void;
    onOpenMap: () => void;
    onOpenDungeon: () => void;
    onOpenHunt: () => void;
    onOpenBase?: () => void;
}

export const QuickTravelModal: React.FC<QuickTravelModalProps> = ({
    isOpen,
    onClose,
    character,
    onTravel,
    onOpenMap,
    onOpenDungeon,
    onOpenHunt,
    onOpenBase
}) => {
    const loc = character.currentLocation || { region: "아시아", nation: "대한민국", city: "서울" };
    const baseLoc = character.base?.location;
    const isAtBase = Boolean(
        baseLoc && 
        baseLoc.city === loc.city && 
        (!baseLoc.nation || !loc.nation || baseLoc.nation === loc.nation)
    );

    // 현재 국가의 수도 찾기
    let capitalCity = '수도';
    let capitalNation = loc.nation || '대한민국';
    let capitalRegion = loc.region || '아시아';
    if (loc.nation) {
        for (const [r, nations] of Object.entries(WORLD_GEOGRAPHY)) {
            if (nations && nations[loc.nation]) {
                capitalCity = nations[loc.nation].capital;
                capitalNation = loc.nation;
                capitalRegion = r;
                break;
            }
        }
    }
    const isAtCapital = loc.city === capitalCity;

    const capitalLocation: Location = useMemo(() => ({
        region: capitalRegion,
        nation: capitalNation,
        city: capitalCity
    }), [capitalRegion, capitalNation, capitalCity]);

    // 기지까지의 이동 정보 (시간, 비용, 방식)
    const baseTravelInfo = useMemo(() => {
        if (!baseLoc) return null;
        return calculateTravelCostAndDays(loc, baseLoc, character);
    }, [loc, baseLoc, character]);

    // 수도까지의 이동 정보 (시간, 비용, 방식)
    const capitalTravelInfo = useMemo(() => {
        return calculateTravelCostAndDays(loc, capitalLocation, character);
    }, [loc, capitalLocation, character]);

    const handleTravelToBase = () => {
        if (!baseLoc) {
            if (onOpenBase) onOpenBase();
            onClose();
            return;
        }
        if (isAtBase) {
            if (onOpenBase) onOpenBase();
            onClose();
            return;
        }
        if (!baseTravelInfo) return;
        if (character.money < baseTravelInfo.cost) {
            alert(`골드가 부족합니다. (필요: ${baseTravelInfo.cost.toLocaleString()}골드)`);
            return;
        }
        if (onTravel) {
            onTravel(baseLoc, baseTravelInfo.cost, baseTravelInfo.days);
        }
        onClose();
    };

    const handleTravelToCapital = () => {
        if (isAtCapital) {
            onClose();
            return;
        }
        if (!capitalTravelInfo) return;
        if (character.money < capitalTravelInfo.cost) {
            alert(`골드가 부족합니다. (필요: ${capitalTravelInfo.cost.toLocaleString()}골드)`);
            return;
        }
        if (onTravel) {
            onTravel(capitalLocation, capitalTravelInfo.cost, capitalTravelInfo.days);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-sm bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <Navigation size={18} className="text-amber-400" />
                        <div>
                            <h3 className="text-sm font-bold text-slate-100">빠른 이동</h3>
                            <p className="text-[10px] text-slate-400">
                                현재: <span className="text-amber-300 font-semibold">{loc.nation} {loc.city}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-white transition-colors"
                        title="닫기"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* 이동 선택지 버튼 리스트 (모바일 터치 최적화) */}
                <div className="space-y-2 overflow-y-auto pr-0.5 custom-scrollbar">
                    {/* 1. 기지 이동 / 귀환 */}
                    <button
                        onClick={handleTravelToBase}
                        className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all text-left group active:scale-[0.98] ${
                            isAtBase 
                                ? 'bg-emerald-950/30 border-emerald-600/60 text-emerald-300' 
                                : baseLoc 
                                ? 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/60 hover:bg-emerald-950/20 text-slate-200' 
                                : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:border-slate-700'
                        }`}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                                <Castle size={18} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                                    <span>내 기지로 이동</span>
                                    {isAtBase && (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                                            체류 중
                                        </span>
                                    )}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate mt-0.5 flex items-center gap-2">
                                    <span>{baseLoc ? `${baseLoc.nation || ''} ${baseLoc.city}` : '기지 미건설'}</span>
                                    {!isAtBase && baseTravelInfo && (
                                        <span className="text-emerald-400 flex items-center gap-1 font-mono font-bold">
                                            <Clock size={10} /> {baseTravelInfo.days}일
                                            <span className="text-slate-600">|</span>
                                            <Coins size={10} className="text-amber-400" /> {baseTravelInfo.cost.toLocaleString()}골드
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 shrink-0 ml-2">
                            {isAtBase ? '기지 열기' : '이동'}
                        </span>
                    </button>

                    {/* 2. 현재 국가의 수도로 이동 */}
                    <button
                        onClick={handleTravelToCapital}
                        disabled={isAtCapital}
                        className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all text-left group active:scale-[0.98] ${
                            isAtCapital
                                ? 'bg-amber-950/20 border-amber-600/30 text-slate-400 opacity-60 cursor-default'
                                : 'bg-slate-900/80 border-slate-800 hover:border-yellow-500/60 hover:bg-yellow-950/20 text-slate-200 cursor-pointer'
                        }`}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-yellow-950/80 border border-yellow-500/40 flex items-center justify-center text-yellow-300 shrink-0">
                                <Crown size={18} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                                    <span>수도로 빠른 이동</span>
                                    {isAtCapital && (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-bold">
                                            현재 수도
                                        </span>
                                    )}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate mt-0.5 flex items-center gap-2">
                                    <span>{loc.nation} 수도: {capitalCity}</span>
                                    {!isAtCapital && capitalTravelInfo && (
                                        <span className="text-yellow-400 flex items-center gap-1 font-mono font-bold">
                                            <Clock size={10} /> {capitalTravelInfo.days}일
                                            <span className="text-slate-600">|</span>
                                            <Coins size={10} className="text-amber-400" /> {capitalTravelInfo.cost.toLocaleString()}골드
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {!isAtCapital && (
                            <span className="text-[10px] font-bold text-yellow-400 shrink-0 ml-2">
                                이동
                            </span>
                        )}
                    </button>



                    {/* 3. 인근 던전 공략 */}
                    <button
                        onClick={() => { onOpenDungeon(); onClose(); }}
                        className="w-full p-3 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-red-500/60 hover:bg-red-950/20 text-slate-200 flex items-center justify-between transition-all text-left active:scale-[0.98] cursor-pointer"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                                <Compass size={18} />
                            </div>
                            <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-100">던전 탐험</span>
                                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                    인근 지하 미궁 및 유적 탐색
                                </p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold text-red-400 shrink-0 ml-2">
                            입장
                        </span>
                    </button>

                    {/* 4. 도시 사냥터 탐색 */}
                    <button
                        onClick={() => { onOpenHunt(); onClose(); }}
                        className="w-full p-3 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-cyan-500/60 hover:bg-cyan-950/20 text-slate-200 flex items-center justify-between transition-all text-left active:scale-[0.98] cursor-pointer"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                                <Crosshair size={18} />
                            </div>
                            <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-100">사냥터 탐색</span>
                                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                    도시 외곽 및 마물 서식지 이동
                                </p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold text-cyan-400 shrink-0 ml-2">
                            사냥터
                        </span>
                    </button>

                    {/* 5. 대륙 전체 지도 */}
                    <button
                        onClick={() => { onOpenMap(); onClose(); }}
                        className="w-full p-3 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-teal-500/60 hover:bg-teal-950/20 text-slate-200 flex items-center justify-between transition-all text-left active:scale-[0.98] cursor-pointer"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-teal-950/80 border border-teal-500/40 flex items-center justify-center text-teal-400 shrink-0">
                                <MapIcon size={18} />
                            </div>
                            <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-100">대륙 전체 지도</span>
                                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                    다른 대륙 및 국가로 장거리 여행
                                </p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold text-teal-400 shrink-0 ml-2">
                            지도 열기
                        </span>
                    </button>
                </div>

                {/* 하단 닫기 */}
                <div className="mt-3 pt-3 border-t border-slate-850">
                    <button
                        onClick={onClose}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold text-xs rounded-xl transition-all active:scale-95 text-center"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuickTravelModal;
