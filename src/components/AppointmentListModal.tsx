import React, { useState } from 'react';
import { Character, SocialAppointment } from '../types';
import { X, Calendar, MapPin, Heart, Swords, Coffee, Clock, Trash2, CheckCircle2, XCircle, AlertTriangle, Check, Mail } from 'lucide-react';

interface AppointmentListModalProps {
    character: Character;
    isOpen: boolean;
    onClose: () => void;
    onUpdateCharacter: (updatedChar: Character) => void;
    onOpenAppointmentModal?: (target: any) => void;
}

const AppointmentListModalComponent: React.FC<AppointmentListModalProps> = ({
    character,
    isOpen,
    onClose,
    onUpdateCharacter
}) => {
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'missed'>('all');

    if (!isOpen) return null;

    const appointments = character.socialAppointments || [];
    const currentDate = character.currentDate || '2000-03-02';

    // 필터링된 약속 목록
    const filteredAppointments = appointments.filter(appt => {
        if (filter === 'pending') return appt.status === 'pending';
        if (filter === 'completed') return appt.status === 'completed';
        if (filter === 'missed') return appt.status === 'missed' || appt.status === 'rejected' || appt.status === 'cancelled';
        return true;
    });

    // 약속 취소
    const handleCancelAppointment = (apptId: string) => {
        const updatedAppointments = (character.socialAppointments || []).map(a => 
            a.id === apptId ? { ...a, status: 'cancelled' as const } : a
        );
        onUpdateCharacter({
            ...character,
            socialAppointments: updatedAppointments
        });
    };

    // 완료/파기/거절된 약속 기록 삭제
    const handleDeleteRecord = (apptId: string) => {
        const updatedAppointments = (character.socialAppointments || []).filter(a => a.id !== apptId);
        onUpdateCharacter({
            ...character,
            socialAppointments: updatedAppointments
        });
    };

    // 완료/파기/거절/취소 약속 기록 전체 삭제
    const handleDeleteAllHistory = () => {
        const updatedAppointments = (character.socialAppointments || []).filter(a => a.status === 'pending');
        onUpdateCharacter({
            ...character,
            socialAppointments: updatedAppointments
        });
    };

    // NPC 제안 약속 수락
    const handleAcceptNpcProposal = (apptId: string) => {
        const updatedAppointments = (character.socialAppointments || []).map(a => 
            a.id === apptId ? { ...a, isAcceptedByPlayer: true } : a
        );
        onUpdateCharacter({
            ...character,
            socialAppointments: updatedAppointments
        });
    };

    // NPC 제안 약속 거절
    const handleDeclineNpcProposal = (apptId: string, targetId: string) => {
        const updatedAppointments = (character.socialAppointments || []).map(a => 
            a.id === apptId ? { ...a, status: 'rejected' as const } : a
        );
        let updatedNetwork = character.socialNetwork;
        if (updatedNetwork) {
            updatedNetwork = updatedNetwork.map(n => 
                n.id === targetId ? { ...n, affection: Math.max(-100, (n.affection || 0) - 3) } : n
            );
        }
        onUpdateCharacter({
            ...character,
            socialNetwork: updatedNetwork,
            socialAppointments: updatedAppointments
        });
    };

    // D-Day 계산
    const getDDayText = (appointmentDateStr: string) => {
        if (!appointmentDateStr) return '날짜 미정';
        if (appointmentDateStr === currentDate) return '오늘 약속';
        
        const currentMs = new Date(currentDate).getTime();
        const apptMs = new Date(appointmentDateStr).getTime();
        const diffDays = Math.ceil((apptMs - currentMs) / (1000 * 60 * 60 * 24));

        if (diffDays > 0) return `D-${diffDays}`;
        if (diffDays < 0) return `D+${Math.abs(diffDays)} (기한 지남)`;
        return '오늘 약속';
    };

    const getLocationTypeLabel = (type?: string) => {
        if (type === 'inyeon') return '인연의 위치';
        if (type === 'midpoint') return '중간 지점';
        if (type === 'player') return '자신의 위치';
        return '지정 장소';
    };

    const pendingCount = appointments.filter(a => a.status === 'pending').length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* 헤더 */}
                <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/80">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                            <Calendar size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base sm:text-lg font-black text-white">약속 현황 및 일정</h3>
                                {pendingCount > 0 && (
                                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                                        대기 {pendingCount}건
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-400">인연들과 약속한 일정을 확인하고 관리합니다.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 필터 탭 */}
                <div className="p-3 bg-slate-950 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                    {[
                        { id: 'all', label: '전체', count: appointments.length },
                        { id: 'pending', label: '대기 중', count: appointments.filter(a => a.status === 'pending').length },
                        { id: 'completed', label: '완료됨', count: appointments.filter(a => a.status === 'completed').length },
                        { id: 'missed', label: '파기 / 거절', count: appointments.filter(a => a.status !== 'pending' && a.status !== 'completed').length }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id as any)}
                            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                                filter === tab.id
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                                filter === tab.id ? 'bg-indigo-900 text-indigo-200' : 'bg-slate-800 text-slate-400'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* 본문 스크롤 영역 */}
                <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-3.5">
                    {filteredAppointments.length === 0 ? (
                        <div className="py-12 text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
                                <Calendar size={24} />
                            </div>
                            <p className="text-xs text-slate-400">해당 조건에 일치하는 약속 내역이 없습니다.</p>
                        </div>
                    ) : (
                        filteredAppointments.map(appt => {
                            const isPending = appt.status === 'pending';
                            const isCompleted = appt.status === 'completed';
                            const isMissed = appt.status === 'missed';
                            const isRejected = appt.status === 'rejected';
                            const isCancelled = appt.status === 'cancelled';
                            const isNpcProposal = appt.proposedBy === 'npc';
                            const isWaitingPlayerAcceptance = isPending && isNpcProposal && !appt.isAcceptedByPlayer;
                            const dDayText = getDDayText(appt.appointmentDate);

                            return (
                                <div
                                    key={appt.id}
                                    className={`p-4 rounded-2xl border transition-all space-y-3 relative overflow-hidden ${
                                        isWaitingPlayerAcceptance
                                            ? 'bg-gradient-to-r from-indigo-950/80 via-purple-950/60 to-slate-900 border-indigo-400 shadow-lg shadow-indigo-950/50'
                                            : isPending
                                            ? 'bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-indigo-500/50 shadow-md'
                                            : isCompleted
                                            ? 'bg-slate-950/60 border-slate-800/80 opacity-90'
                                            : 'bg-slate-950/40 border-rose-900/30 opacity-75'
                                    }`}
                                >
                                    {/* 상단: 인물 정보 & 상태 태그 */}
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-12 h-12 rounded-xl border border-slate-700 bg-slate-900 overflow-hidden flex-shrink-0 flex items-center justify-center text-xl">
                                                {appt.targetVisualUrl ? (
                                                    <img src={appt.targetVisualUrl} alt={appt.targetName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                ) : (
                                                    '👤'
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-black text-white truncate">{appt.targetName}</h4>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 shrink-0">
                                                        {appt.targetJob || appt.targetClassType || '인연'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                                    <span className="flex items-center gap-1 font-bold text-amber-400">
                                                        {appt.type === 'duel' ? <Swords size={12} /> : <Coffee size={12} />}
                                                        {appt.type === 'duel' ? '실력 겨루기 (결투)' : '차와 담소'}
                                                    </span>
                                                    {isNpcProposal && (
                                                        <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-800">
                                                            인연의 서신 제안
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 상태 뱃지 */}
                                        <div className="shrink-0 text-right">
                                            {isWaitingPlayerAcceptance ? (
                                                <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 flex items-center gap-1 shadow-sm animate-pulse">
                                                    <Mail size={12} /> 수락 대기 중
                                                </span>
                                            ) : isPending ? (
                                                <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-indigo-950 border border-indigo-500 text-indigo-300 flex items-center gap-1 shadow-sm">
                                                    <Clock size={12} /> {dDayText}
                                                </span>
                                            ) : isCompleted ? (
                                                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-950 border border-emerald-700 text-emerald-400 flex items-center gap-1">
                                                    <CheckCircle2 size={12} /> 만남 완료
                                                </span>
                                            ) : isMissed ? (
                                                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-rose-950 border border-rose-700 text-rose-400 flex items-center gap-1">
                                                    <AlertTriangle size={12} /> 약속 파기
                                                </span>
                                            ) : isRejected ? (
                                                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-950 border border-amber-800 text-amber-400 flex items-center gap-1">
                                                    <XCircle size={12} /> 거절됨
                                                </span>
                                            ) : (
                                                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-800 text-slate-400 flex items-center gap-1">
                                                    취소됨
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* 상세 세부 항목 카드 */}
                                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-slate-500 font-bold block">약속 날짜</span>
                                            <div className="flex items-center gap-1 text-slate-200 font-semibold">
                                                <Calendar size={13} className="text-indigo-400" />
                                                <span>{appt.appointmentDate || '즉시'}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-slate-500 font-bold block">약속 장소 ({getLocationTypeLabel(appt.locationType)})</span>
                                            <div className="flex items-center gap-1 text-slate-200 font-semibold truncate">
                                                <MapPin size={13} className="text-pink-400 shrink-0" />
                                                <span className="truncate">{appt.location.nation} {appt.location.city}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* NPC 수락 대기 약속 처리 영역 */}
                                    {isWaitingPlayerAcceptance ? (
                                        <div className="bg-indigo-950/70 border border-indigo-500/50 p-3 rounded-xl space-y-2">
                                            <p className="text-[11px] text-indigo-200 font-medium">
                                                {appt.targetName}님께서 약속을 먼저 제안하셨습니다. 제안을 수락하시겠습니까?
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleAcceptNpcProposal(appt.id)}
                                                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md transition-all"
                                                >
                                                    <Check size={14} /> 수락하기
                                                </button>
                                                <button
                                                    onClick={() => handleDeclineNpcProposal(appt.id, appt.targetId)}
                                                    className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500 text-slate-300 hover:text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                                                >
                                                    <X size={14} /> 거절하기
                                                </button>
                                            </div>
                                        </div>
                                    ) : isPending ? (
                                        /* 일반 대기 중 약속 */
                                        <div className="flex items-center justify-between gap-2 pt-1">
                                            <p className="text-[11px] text-indigo-300 font-medium">
                                                해당 도시 거주구역에서 조우 가능합니다.
                                            </p>
                                            <button
                                                onClick={() => handleCancelAppointment(appt.id)}
                                                className="py-1.5 px-3 rounded-xl border border-red-500/40 bg-red-950/30 hover:bg-red-900/50 text-red-300 text-xs font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer shrink-0"
                                            >
                                                <Trash2 size={13} /> 약속 취소
                                            </button>
                                        </div>
                                    ) : (
                                        /* 완료/파기/거절/취소 약속 삭제 버튼 */
                                        <div className="flex justify-end pt-1">
                                            <button
                                                onClick={() => handleDeleteRecord(appt.id)}
                                                className="py-1.5 px-3 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-300 hover:border-rose-900 text-xs font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer shrink-0"
                                            >
                                                <Trash2 size={13} /> 기록 삭제
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* 푸터 */}
                <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-2 flex-wrap">
                    {appointments.some(a => a.status !== 'pending') ? (
                        <button
                            onClick={handleDeleteAllHistory}
                            className="py-2 px-3 sm:px-3.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 hover:text-rose-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        >
                            <Trash2 size={13} />
                            <span>완료 및 파기 기록 전체 삭제</span>
                        </button>
                    ) : (
                        <div />
                    )}
                    <button
                        onClick={onClose}
                        className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer ml-auto"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};

export const AppointmentListModal = React.memo(AppointmentListModalComponent, (prev, next) => {
    // 닫혀 있는 동안에는 어떠한 상위 상태 변화(캐릭터 미세 변동 등)에도 리렌더링을 완전히 차단
    if (!prev.isOpen && !next.isOpen) return true;
    return false;
});
