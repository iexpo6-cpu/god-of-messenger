import React from 'react';
import { X, Moon, AlertTriangle, Clock, BedDouble, ShieldAlert, Sparkles } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentTime?: string;
    currentDate?: string;
}

export const MidnightPenaltyModal: React.FC<Props> = ({
    isOpen,
    onClose,
    currentTime = '02:00',
    currentDate = '2000-03-02'
}) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="bg-slate-900 border border-red-500/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="p-3.5 sm:p-4 border-b border-red-500/30 bg-gradient-to-r from-red-950/80 via-slate-950 to-indigo-950/80 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400">
                            <AlertTriangle size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-sm sm:text-base font-black text-white leading-tight flex items-center gap-1.5">
                                <span>심야 노동 패널티 안내</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                                    새벽 00:00 ~ 06:00
                                </span>
                            </h2>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                현재 시각: <span className="text-red-300 font-mono font-bold">{currentDate} {currentTime}</span>
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                        title="닫기"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* 본문 내용 */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs sm:text-sm">
                    {/* 핵심 경고 배너 */}
                    <div className="p-3 rounded-xl bg-red-955/40 border border-red-500/40 bg-red-950/30 text-red-200">
                        <div className="font-bold flex items-center gap-1.5 text-red-300 mb-1">
                            <ShieldAlert size={16} className="text-red-400 shrink-0" />
                            <span>심야 시간대 피로도 2배 축적 주의</span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                            자정(00:00)부터 새벽 6시(06:00) 사이는 생체 리듬상 수면이 필요한 심야 시간대입니다. 
                            이 시간대에 사냥, 던전 탐색, 훈련, 채굴 등의 활동을 진행하면 <strong className="text-red-300">피로도가 일반 시간대의 2배(+10/시간)로 급증</strong>합니다.
                        </p>
                    </div>

                    {/* 주요 영향 및 패널티 상세 */}
                    <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                        <div className="text-[11px] font-bold text-slate-400">심야 시간대 규칙 비교</div>
                        
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                            <div className="flex items-center gap-2">
                                <Clock size={14} className="text-amber-400" />
                                <span className="text-slate-300">주간 일반 활동 (06:00 ~ 24:00)</span>
                            </div>
                            <span className="font-bold text-emerald-400 text-xs font-mono">+5 피로도 / 1시간</span>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-lg bg-red-950/30 border border-red-500/40">
                            <div className="flex items-center gap-2">
                                <Moon size={14} className="text-red-400 animate-pulse" />
                                <span className="text-red-200 font-bold">심야 활동 (00:00 ~ 06:00)</span>
                            </div>
                            <span className="font-bold text-red-400 text-xs font-mono">+10 피로도 / 1시간 (2배)</span>
                        </div>
                    </div>

                    {/* 과로 상태 위험 경고 */}
                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-amber-300 text-xs">
                            <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                            <span>과로 상태 (피로도 100 도달 시) 위험</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                            피로도가 80%에 도달하면 능력치 감소가 시작되며, 100% 도달 시 <strong className="text-amber-300">모든 능력치(최대 체력, 최대 마력, 공격력, 방어력 등)가 최대 50% 감소</strong>합니다.
                        </p>
                    </div>

                    {/* 추천 조치 가이드 */}
                    <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/40 text-indigo-200 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-indigo-300 text-xs">
                            <BedDouble size={14} className="text-indigo-400 shrink-0" />
                            <span>권장 대처법: 아침(08:00)까지 휴식 취하기</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                            심야 시간대에는 무리한 활동을 피하고, 상단 메뉴의 <strong className="text-indigo-300">휴식하기</strong>를 통해 아침 8시까지 수면을 취하면 피로도가 1시간당 10씩 말끔히 해소되며 심야 패널티를 완전히 회피할 수 있습니다.
                        </p>
                    </div>
                </div>

                {/* 하단 닫기 버튼 */}
                <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-red-950/50 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1.5"
                    >
                        <span>안내 확인 완료</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MidnightPenaltyModal;
