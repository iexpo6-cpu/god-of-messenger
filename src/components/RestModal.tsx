import React, { useState, useEffect } from 'react';
import { X, Moon, Calendar, Sparkles, AlertCircle, Plus, Minus, Heart, Clock, Sun } from 'lucide-react';
import { addDays } from '../utils';
import { formatDuration, calculateMinutesToTargetTime } from '../services/gameTimeService';
import { Character } from '../types';
import { checkMaintenanceShortageBeforeTimeSkip, MaintenanceProjectionResult } from '../services/maintenanceValidationService';
import MaintenanceShortageWarningModal from './MaintenanceShortageWarningModal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirmRest: (days: number, hours?: number) => void;
    currentDate: string;
    currentTime?: string;
    initialDays?: number;
    character?: Character;
}

const PRESET_HOURS = [
    { label: '1시간', sub: '짧은 휴식', hours: 1 },
    { label: '2시간', sub: '가벼운 휴식', hours: 2 },
    { label: '4시간', sub: '낮잠', hours: 4 },
    { label: '8시간', sub: '숙면', hours: 8 },
    { label: '12시간', sub: '반나절 휴식', hours: 12 },
];

const PRESET_DAYS = [
    { label: '하루', days: 1 },
    { label: '3일', days: 3 },
    { label: '일주일', days: 7 },
    { label: '보름', days: 15 },
    { label: '한 달', days: 30 },
];

export const RestModal: React.FC<Props> = ({
    isOpen,
    onClose,
    onConfirmRest,
    currentDate,
    currentTime = '08:00',
    initialDays = 1,
    character
}) => {
    const [restMode, setRestMode] = useState<'hour' | 'day'>('hour');
    const [hours, setHours] = useState<number>(8);
    const [days, setDays] = useState<number>(initialDays);
    const [isWarningModalOpen, setIsWarningModalOpen] = useState<boolean>(false);

    // 오전 8시까지 이동에 필요한 시간(시간 단위)
    const morningTargetInfo = calculateMinutesToTargetTime(currentTime, 8, 0, true);
    const morningHours = Math.max(1, Math.round(morningTargetInfo.minutesToAdd / 60));

    useEffect(() => {
        if (isOpen) {
            setDays(Math.max(1, initialDays));
            setHours(8);
            setIsWarningModalOpen(false);
        }
    }, [isOpen, initialDays]);

    if (!isOpen) return null;

    const handleAdjustHours = (delta: number) => {
        setHours(prev => Math.max(1, Math.min(72, prev + delta)));
    };

    const handleAdjustDays = (delta: number) => {
        setDays(prev => Math.max(1, Math.min(365, prev + delta)));
    };

    // 시간 단위 휴식 후 예상 일시 계산
    const calculateProjectedTime = () => {
        const [curHour, curMin] = currentTime.split(':').map(Number);
        const totalMinutes = curHour * 60 + curMin + hours * 60;
        const addDaysCount = Math.floor(totalMinutes / 1440);
        const remMin = totalMinutes % 1440;
        const newHour = String(Math.floor(remMin / 60)).padStart(2, '0');
        const newMin = String(remMin % 60).padStart(2, '0');
        const projectedDate = addDaysCount > 0 ? addDays(currentDate, addDaysCount) : currentDate;
        return {
            date: projectedDate,
            time: `${newHour}:${newMin}`,
            addDaysCount
        };
    };

    const projectedTimeInfo = calculateProjectedTime();
    const projectedDate = addDays(currentDate, days);

    // 유지비 사전 예측 분석
    const maintenanceProjection: MaintenanceProjectionResult | null = character ? (
        restMode === 'hour'
            ? checkMaintenanceShortageBeforeTimeSkip(character, hours * 60, 0)
            : checkMaintenanceShortageBeforeTimeSkip(character, 0, days)
    ) : null;

    const executeRestDirectly = () => {
        if (restMode === 'hour') {
            onConfirmRest(0, hours);
        } else {
            onConfirmRest(days, 0);
        }
        onClose();
    };

    const handleConfirm = () => {
        // 골드 부족 사전 검증: 부족할 시 경고 팝업 먼저 띄움
        if (maintenanceProjection && maintenanceProjection.isShortage) {
            setIsWarningModalOpen(true);
            return;
        }
        executeRestDirectly();
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* 모달 상단 헤더 */}
                <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <Moon className="w-5 h-5 text-indigo-400 shrink-0" />
                        <div>
                            <h2 className="text-sm sm:text-base font-bold text-white leading-tight">휴식하기</h2>
                            <p className="text-[11px] text-slate-400">
                                현재: <span className="text-indigo-300 font-mono font-bold">{currentDate} {currentTime}</span>
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

                {/* 휴식 모드 탭 (시간 단위 vs 일 단위) */}
                <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 shrink-0 gap-1">
                    <button
                        type="button"
                        onClick={() => setRestMode('hour')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[38px] ${
                            restMode === 'hour'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Clock size={14} />
                        <span>시간 단위 휴식</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setRestMode('day')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[38px] ${
                            restMode === 'day'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Calendar size={14} />
                        <span>일 단위 장기 휴식</span>
                    </button>
                </div>

                {/* 메인 내용 영역 */}
                <div className="p-3.5 sm:p-4 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar">
                    {restMode === 'hour' ? (
                        <>
                            {/* 오전 8시 빠른 이동 버튼 */}
                            <div className="bg-gradient-to-r from-amber-950/40 to-indigo-950/40 p-2.5 sm:p-3 rounded-xl border border-amber-500/30 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sun className="w-5 h-5 text-amber-400 shrink-0" />
                                    <div>
                                        <div className="text-xs font-bold text-amber-200">
                                            오전 8시까지 이동 ({morningHours}시간)
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                            {morningTargetInfo.isNextDay ? '다음 날 아침 8시로 이동' : '당일 아침 8시로 이동'}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setHours(morningHours)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border ${
                                        hours === morningHours
                                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                                            : 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
                                    }`}
                                >
                                    선택
                                </button>
                            </div>

                            {/* 시간 프리셋 선택 */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-2">
                                    빠른 시간 선택
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {PRESET_HOURS.map(preset => (
                                        <button
                                            key={preset.hours}
                                            type="button"
                                            onClick={() => setHours(preset.hours)}
                                            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center min-h-[44px] ${
                                                hours === preset.hours
                                                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                                                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                                            }`}
                                        >
                                            <span>{preset.hours}시간</span>
                                            <span className="text-[9px] opacity-75 font-normal">{preset.sub}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 시간 직접 조절 */}
                            <div className="bg-slate-950/70 p-3 sm:p-3.5 rounded-xl border border-slate-800">
                                <label className="block text-xs font-semibold text-slate-300 mb-2">
                                    휴식할 시간 직접 조절
                                </label>
                                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleAdjustHours(-4)}
                                        className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 min-h-[38px]"
                                    >
                                        -4시간
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleAdjustHours(-1)}
                                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 min-h-[38px] min-w-[38px] flex items-center justify-center"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <div className="text-center font-mono font-black text-lg sm:text-xl text-indigo-300 min-w-[75px]">
                                        {formatDuration(hours * 60)}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleAdjustHours(1)}
                                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 min-h-[38px] min-w-[38px] flex items-center justify-center"
                                    >
                                        <Plus size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleAdjustHours(4)}
                                        className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 min-h-[38px]"
                                    >
                                        +4시간
                                    </button>
                                </div>
                            </div>

                            {/* 시간 경과 안내 */}
                            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 space-y-1 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">현재 시각</span>
                                    <span className="font-bold text-slate-200 font-mono">{currentDate} {currentTime}</span>
                                </div>
                                <div className="flex items-center justify-between text-indigo-300 font-bold">
                                    <span>휴식 후 시각</span>
                                    <span className="font-mono text-xs sm:text-sm">
                                        {projectedTimeInfo.date} {projectedTimeInfo.time}
                                        {projectedTimeInfo.addDaysCount > 0 && ` (+${projectedTimeInfo.addDaysCount}일)`}
                                    </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* 일수 프리셋 선택 */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-2">
                                    일수 빠른 선택
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {PRESET_DAYS.map(preset => (
                                        <button
                                            key={preset.days}
                                            type="button"
                                            onClick={() => setDays(preset.days)}
                                            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center min-h-[44px] ${
                                                days === preset.days
                                                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                                                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                                            }`}
                                        >
                                            <span>{preset.label}</span>
                                            <span className="text-[10px] opacity-75 font-normal">{preset.days}일</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 일수 직접 조절 */}
                            <div className="bg-slate-950/70 p-3 sm:p-3.5 rounded-xl border border-slate-800">
                                <label className="block text-xs font-semibold text-slate-300 mb-2">
                                    휴식할 일수 직접 조절
                                </label>
                                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleAdjustDays(-10)}
                                        className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 min-h-[38px]"
                                    >
                                        -10
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleAdjustDays(-1)}
                                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 min-h-[38px] min-w-[38px] flex items-center justify-center"
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <div className="text-center font-mono font-black text-lg sm:text-xl text-indigo-300 min-w-[75px]">
                                        {days}일
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleAdjustDays(1)}
                                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 min-h-[38px] min-w-[38px] flex items-center justify-center"
                                    >
                                        <Plus size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleAdjustDays(10)}
                                        className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 min-h-[38px]"
                                    >
                                        +10
                                    </button>
                                </div>
                            </div>

                            {/* 일자 경과 안내 */}
                            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 space-y-1 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">현재 일자</span>
                                    <span className="font-bold text-slate-200 font-mono">{currentDate}</span>
                                </div>
                                <div className="flex items-center justify-between text-indigo-300 font-bold">
                                    <span>휴식 후 일자</span>
                                    <span className="font-mono text-xs sm:text-sm">{projectedDate} (+{days}일)</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* 회복 및 효과 안내 */}
                    <div className="space-y-2 text-xs">
                        {restMode === 'hour' ? (
                            hours < 8 ? (
                                <div className="flex items-start gap-2 text-amber-300 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/40">
                                    <Heart size={16} className="shrink-0 mt-0.5 text-amber-400" />
                                    <div>
                                        <div className="font-bold">
                                            {hours <= 2 ? '전투불능 제외 파티원 20% 회복' : hours <= 4 ? '전투불능 제외 파티원 50% 회복' : '전투불능 제외 파티원 80% 회복'}
                                        </div>
                                        <div className="text-[10px] text-amber-400/80 mt-0.5">
                                            8시간 미만 휴식 시 전투불능 상태는 회복되지 않습니다.
                                        </div>
                                    </div>
                                </div>
                            ) : hours < 12 ? (
                                <div className="flex items-start gap-2 text-emerald-300 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/40">
                                    <Heart size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                                    <div>
                                        <div className="font-bold">전투불능 동료 포함 파티원 80% 회복 및 상태이상 해제</div>
                                        <div className="text-[10px] text-emerald-400/80 mt-0.5">
                                            8시간 이상 휴식을 취하여 전투불능 동료가 회복되고 상태이상이 해제됩니다. (12시간 이상 시 100% 완전 회복)
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start gap-2 text-emerald-300 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/40">
                                    <Heart size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                                    <div>
                                        <div className="font-bold">모든 파티원 100% 완전 회복 및 상태이상 해제</div>
                                        <div className="text-[10px] text-emerald-400/80 mt-0.5">
                                            12시간 이상 충분한 휴식을 취하여 모든 동료가 완전 회복되고 상태이상이 완치됩니다.
                                        </div>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="flex items-start gap-2 text-emerald-300 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/40">
                                <Heart size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                                <div>
                                    <div className="font-bold">모든 파티원 100% 완전 회복 및 상태이상 해제</div>
                                    <div className="text-[10px] text-emerald-400/80 mt-0.5">
                                        일 단위 장기 휴식을 통해 모든 파티원의 체력과 마력이 완전 회복되며 상태이상이 해제됩니다.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 유지비 지출 사전 알림 카드 (기지 또는 부대가 있는 경우) */}
                        {maintenanceProjection && (maintenanceProjection.totalMilitaryFee > 0 || maintenanceProjection.totalBaseFee > 0) && (
                            <div className={`p-2.5 rounded-xl border text-xs transition-all ${
                                maintenanceProjection.isShortage 
                                    ? 'bg-red-950/40 border-red-500/50 text-red-200' 
                                    : 'bg-slate-950/50 border-slate-800 text-slate-300'
                            }`}>
                                <div className="flex items-center justify-between font-bold text-[11px] mb-1">
                                    <span className="flex items-center gap-1">
                                        <AlertCircle size={13} className={maintenanceProjection.isShortage ? "text-red-400" : "text-indigo-400"} />
                                        예상 유지비 정산
                                    </span>
                                    <span className={maintenanceProjection.isShortage ? "text-red-400 font-mono font-bold" : "text-amber-300 font-mono"}>
                                        {maintenanceProjection.totalRequiredGold.toLocaleString()} G
                                        {maintenanceProjection.isShortage && ` (부족: -${maintenanceProjection.shortageAmount.toLocaleString()}G)`}
                                    </span>
                                </div>
                                <div className="text-[10px] space-y-0.5 text-slate-400">
                                    {maintenanceProjection.totalMilitaryFee > 0 && (
                                        <div>• 부대 유지비: {maintenanceProjection.totalMilitaryFee.toLocaleString()}G ({maintenanceProjection.totalSoldiers}명)</div>
                                    )}
                                    {maintenanceProjection.totalBaseFee > 0 && (
                                        <div>• 기지 유지비: {maintenanceProjection.totalBaseFee.toLocaleString()}G (1일 정산 {maintenanceProjection.passedFirstDays.length}회차)</div>
                                    )}
                                    {maintenanceProjection.isShortage && (
                                        <div className="text-red-300 font-bold pt-0.5">
                                            ⚠️ 소지 골드가 부족하여 진행 시 경고 팝업이 표시됩니다.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 하단 확인 버튼 */}
                <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950 flex items-center gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs sm:text-sm transition-all min-h-[44px]"
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-black text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
                    >
                        <Moon size={16} />
                        <span>{restMode === 'hour' ? `${formatDuration(hours * 60)} 휴식 시작` : `${days}일 휴식 시작`}</span>
                    </button>
                </div>
            </div>

            {/* 골드 부족 사전 검증 경고 모달 */}
            <MaintenanceShortageWarningModal
                isOpen={isWarningModalOpen}
                onClose={() => setIsWarningModalOpen(false)}
                onConfirm={executeRestDirectly}
                result={maintenanceProjection}
                activityTitle={restMode === 'hour' ? `${formatDuration(hours * 60)} 휴식` : `${days}일 장기 휴식`}
            />
        </div>
    );
};

export default RestModal;
