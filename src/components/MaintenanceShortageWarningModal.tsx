import React from 'react';
import { AlertTriangle, Coins, ShieldAlert, Calendar, Users, Home, ArrowRight, X } from 'lucide-react';
import { MaintenanceProjectionResult } from '../services/maintenanceValidationService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    result: MaintenanceProjectionResult | null;
    activityTitle?: string;
}

export const MaintenanceShortageWarningModal: React.FC<Props> = ({
    isOpen,
    onClose,
    onConfirm,
    result,
    activityTitle = "시간 건너뛰기"
}) => {
    if (!isOpen || !result) return null;

    const {
        currentGold,
        totalRequiredGold,
        shortageAmount,
        totalDays,
        dailyMilitaryFee,
        totalMilitaryFee,
        totalSoldiers,
        monthlyBaseFee,
        passedFirstDays,
        totalBaseFee,
        unpaidMaintenance,
        warnings
    } = result;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="bg-slate-900 border border-amber-500/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="p-3.5 sm:p-4 bg-gradient-to-r from-red-950/80 via-amber-950/60 to-slate-900 border-b border-amber-500/30 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                            <AlertTriangle size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-sm sm:text-base font-bold text-amber-200 leading-tight">
                                유지비 잔액 부족 경고
                            </h2>
                            <p className="text-[11px] text-amber-400/80">
                                {activityTitle} 진행 시 골드 소진 위험
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                        title="닫기"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* 본문 스크롤 영역 */}
                <div className="p-3.5 sm:p-4 overflow-y-auto space-y-3.5 text-xs text-slate-300">
                    {/* 상단 요약 카드 */}
                    <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl space-y-2">
                        <div className="flex items-center justify-between font-bold">
                            <span className="text-red-300 flex items-center gap-1.5">
                                <ShieldAlert size={14} /> 예상 부족 골드
                            </span>
                            <span className="text-red-400 font-mono text-sm sm:text-base">
                                -{shortageAmount.toLocaleString()} G
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-red-900/50 text-[11px]">
                            <div>
                                <span className="text-slate-400 block">현재 보유 골드</span>
                                <span className="text-amber-300 font-mono font-bold">{currentGold.toLocaleString()} G</span>
                            </div>
                            <div className="text-right">
                                <span className="text-slate-400 block">필요 총 유지비</span>
                                <span className="text-red-300 font-mono font-bold">{totalRequiredGold.toLocaleString()} G</span>
                            </div>
                        </div>
                    </div>

                    {/* 건너뛰는 기간 및 포함 정산일 */}
                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 flex items-center gap-1">
                                <Calendar size={13} className="text-indigo-400" /> 경과 예정 기간
                            </span>
                            <span className="text-slate-200 font-bold font-mono">
                                {totalDays > 0 ? `${totalDays}일` : "당일 시간 경과"}
                            </span>
                        </div>

                        {passedFirstDays.length > 0 && (
                            <div className="p-2 bg-indigo-950/30 border border-indigo-500/30 rounded-lg">
                                <span className="text-[10px] text-indigo-300 font-bold block mb-1">
                                    기간 중 통과하는 월간 정산일 (매월 1일)
                                </span>
                                <div className="flex flex-wrap gap-1">
                                    {passedFirstDays.map(d => (
                                        <span key={d} className="px-2 py-0.5 bg-indigo-900/50 text-indigo-200 rounded text-[10px] font-mono font-semibold">
                                            {d}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 세부 유지비 분석 */}
                    <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-400 block px-0.5">
                            기간 내 예상 지출 상세
                        </span>

                        {totalSoldiers > 0 && (
                            <div className="p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users size={14} className="text-blue-400" />
                                    <div>
                                        <span className="text-slate-200 font-medium block">부대 유지비</span>
                                        <span className="text-[10px] text-slate-400">
                                            부대원 {totalSoldiers}명 × 하루 10,000G
                                        </span>
                                    </div>
                                </div>
                                <span className="font-mono text-slate-200 font-bold">
                                    {totalMilitaryFee.toLocaleString()} G
                                </span>
                            </div>
                        )}

                        {passedFirstDays.length > 0 && totalBaseFee > 0 && (
                            <div className="p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Home size={14} className="text-emerald-400" />
                                    <div>
                                        <span className="text-slate-200 font-medium block">기지 월간 유지비</span>
                                        <span className="text-[10px] text-slate-400">
                                            월 1회 정산 × {passedFirstDays.length}회차
                                        </span>
                                    </div>
                                </div>
                                <span className="font-mono text-slate-200 font-bold">
                                    {totalBaseFee.toLocaleString()} G
                                </span>
                            </div>
                        )}

                        {unpaidMaintenance > 0 && (
                            <div className="p-2.5 bg-red-950/30 border border-red-500/30 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Coins size={14} className="text-amber-400" />
                                    <div>
                                        <span className="text-red-300 font-medium block">기존 미납액</span>
                                        <span className="text-[10px] text-red-400/80">
                                            이전 체납 누적금
                                        </span>
                                    </div>
                                </div>
                                <span className="font-mono text-red-300 font-bold">
                                    {unpaidMaintenance.toLocaleString()} G
                                </span>
                            </div>
                        )}
                    </div>

                    {/* 체납 불이익 안내 경고문 */}
                    <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl space-y-1.5">
                        <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                            <ShieldAlert size={13} /> 발생 가능한 체납 불이익
                        </span>
                        <ul className="space-y-1 text-[11px] text-slate-300 pl-3 list-disc list-outside marker:text-amber-400">
                            {warnings.length > 0 ? (
                                warnings.map((w, idx) => (
                                    <li key={idx} className="leading-relaxed">{w}</li>
                                ))
                            ) : (
                                <li className="leading-relaxed">
                                    골드가 바닥나면 부대원들의 사기 및 충성도가 깎이고, 기지 시설의 생산량이 줄어들거나 가동이 일시 중단될 수 있습니다.
                                </li>
                            )}
                        </ul>
                    </div>
                </div>

                {/* 하단 버튼 (모바일 터치 최적화) */}
                <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-colors min-h-[44px] flex items-center justify-center gap-1.5 text-xs sm:text-sm order-1 sm:order-2"
                    >
                        취소하고 돌아가기
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onConfirm();
                        }}
                        className="py-2.5 px-4 rounded-xl font-bold bg-slate-800 hover:bg-red-950/80 hover:text-red-300 text-slate-400 border border-slate-700 hover:border-red-500/50 transition-colors min-h-[44px] flex items-center justify-center gap-1.5 text-xs order-2 sm:order-1"
                    >
                        그래도 계속 진행하기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MaintenanceShortageWarningModal;
