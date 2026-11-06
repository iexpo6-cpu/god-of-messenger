import React from 'react';
import { Clock, Moon, ShieldAlert, ArrowRight, X, Sparkles, Store } from 'lucide-react';
import { StandardFacilityType, getFacilityOperatingState } from '../services/facilityOperatingService';

interface FacilityClosedModalProps {
    isOpen: boolean;
    onClose: () => void;
    facilityType: StandardFacilityType;
    currentTime?: string;
    onGoToBackAlley?: () => void;
}

export const FacilityClosedModal: React.FC<FacilityClosedModalProps> = ({
    isOpen,
    onClose,
    facilityType,
    currentTime,
    onGoToBackAlley
}) => {
    if (!isOpen) return null;

    const state = getFacilityOperatingState(facilityType, currentTime);

    let facilityTitle = '시설';
    switch (facilityType) {
        case 'Commercial': facilityTitle = '일반 상점 및 시장'; break;
        case 'Military': facilityTitle = '국가 군사 사령부'; break;
        case 'Mercenary': facilityTitle = '용병 길드 접수처'; break;
        case 'Academic': facilityTitle = '학교 및 학술원'; break;
        case 'Imperial': facilityTitle = '성전 및 공식 집무실'; break;
    }

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 xs:p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-slate-950 border-2 border-indigo-500/40 rounded-3xl shadow-[0_0_50px_rgba(30,27,75,0.7)] flex flex-col overflow-hidden text-slate-100">
                {/* 상단 헤더 */}
                <div className="relative p-5 bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border-b border-indigo-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-900/60 border border-indigo-400/50 flex items-center justify-center text-indigo-300 shadow-inner">
                            <Moon size={22} className="animate-pulse" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-600/60 inline-block mb-0.5">
                                {state.statusLabel}
                            </span>
                            <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                                {facilityTitle}
                            </h3>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                        aria-label="닫기"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* 본문 안내 */}
                <div className="p-5 space-y-4 text-xs sm:text-sm">
                    {/* 시간 현황 카드 */}
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-300 font-semibold">
                            <Clock size={16} className="text-amber-400" />
                            <span>현재 시각</span>
                        </div>
                        <span className="font-mono font-black text-amber-300 text-sm bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                            {currentTime || '22:00'}
                        </span>
                    </div>

                    {/* 영업 시간 비교 배너 */}
                    <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-850 space-y-2">
                        <div className="flex items-center justify-between text-[11px] sm:text-xs">
                            <span className="text-slate-400 font-medium">주간 정규 영업 시간</span>
                            <span className="font-bold text-emerald-400">08:00 ~ 20:00 (정상 영업)</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] sm:text-xs pt-1.5 border-t border-slate-800/80">
                            <span className="text-slate-400 font-medium">심야 폐쇄 시간대</span>
                            <span className="font-bold text-rose-400">22:00 ~ 04:00 (시설 마감)</span>
                        </div>
                    </div>

                    {/* 안내 메시지 문구 */}
                    <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-900/50 text-slate-300 leading-relaxed space-y-2">
                        <p className="flex items-start gap-2">
                            <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
                            <span>{state.guideMessage}</span>
                        </p>
                    </div>

                    {/* 심야 암시장 추천 배너 */}
                    {state.isNightPrime && (
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/60 via-slate-900 to-red-950/40 border border-purple-500/40 space-y-2">
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-amber-300 animate-spin" />
                                <span className="font-black text-white text-xs sm:text-sm">
                                    심야 특별 구역 활성화
                                </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-purple-200/90 leading-relaxed">
                                심야 시간대(22:00 ~ 04:00)에는 어두운 뒷골목에서 <strong className="text-amber-300">심야 암시장</strong>과 <strong className="text-amber-300">밀수꾼</strong>이 개장하여 전설의 잠재력 각성 영약, 칠흑의 만병통치약, 대량의 마정석 및 마석을 은밀히 판매합니다.
                            </p>
                        </div>
                    )}
                </div>

                {/* 하단 버튼 그룹 */}
                <div className="p-4 bg-slate-900/90 border-t border-slate-800/80 flex flex-col sm:flex-row gap-2">
                    {state.isNightPrime && onGoToBackAlley && (
                        <button
                            onClick={() => {
                                onClose();
                                onGoToBackAlley();
                            }}
                            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-700 hover:from-purple-600 to-red-700 hover:to-red-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-950/50 transition-all active:scale-95"
                        >
                            <span>뒷골목 암시장 바로가기</span>
                            <ArrowRight size={16} />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs sm:text-sm transition-colors"
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FacilityClosedModal;
