import React from 'react';
import { SimpleStudent } from '../types';
import { getStudentProfileAnalysis, StudentProfileAnalysis, getMentoringCooldown } from '../services/studentMentoringService';
import { X, User, Heart, Sparkles, BookOpen, ShieldAlert, Award, Dumbbell, Brain, Compass, Wind } from 'lucide-react';

interface Props {
    student: SimpleStudent;
    currentDate?: string;
    onClose: () => void;
    onOpenAdvice: (student: SimpleStudent) => void;
    onOpenPraise: (student: SimpleStudent) => void;
    onOpenScold: (student: SimpleStudent) => void;
}

export const StudentDetailModal: React.FC<Props> = ({
    student,
    currentDate,
    onClose,
    onOpenAdvice,
    onOpenPraise,
    onOpenScold
}) => {
    const analysis: StudentProfileAnalysis = getStudentProfileAnalysis(student);
    const cd = getMentoringCooldown(student, currentDate);
    const stats = student.stats || {};
    const str = stats.str || 10;
    const def = stats.def || 10;
    const agi = stats.agi || 10;
    const int = stats.int || 10;
    const wis = stats.wis || 10;

    return (
        <div id="student-detail-overlay" className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div 
                id="student-detail-container"
                className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
                    <div className="flex items-center space-x-2">
                        <BookOpen size={18} className="text-amber-400" />
                        <h3 className="font-bold text-base text-slate-100">학생 상세 정보</h3>
                    </div>
                    <button
                        id="student-detail-close-btn"
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 본문 스크롤 영역 */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-300 text-xs sm:text-sm">
                    {/* 상단 기본 프로필 */}
                    <div className="flex items-center gap-4 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 shadow-inner">
                            <img
                                src={student.visualUrl}
                                alt={student.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                                <h4 className="font-bold text-base text-white truncate">{student.name}</h4>
                                <span className="text-[11px] font-bold text-amber-400 bg-amber-950/50 border border-amber-800/50 px-2 py-0.5 rounded-full">
                                    {student.age}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                {student.gender} • {student.race} • {student.nation}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[11px] text-pink-400 font-bold flex items-center bg-pink-950/40 px-2 py-0.5 rounded border border-pink-900/40">
                                    <Heart size={12} className="mr-1 fill-pink-400" /> {student.affection}
                                </span>
                                <span className="text-[11px] text-blue-400 font-bold bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/40">
                                    레벨 {student.level}
                                </span>
                                {student.isRival && (
                                    <span className="text-[11px] text-red-400 font-bold bg-red-950/40 px-2 py-0.5 rounded border border-red-900/40">
                                        라이벌
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 전투 계열 상태 배너 (유년기 학생이므로 미설정) */}
                    <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShieldAlert size={16} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-300">전투 계열</span>
                        </div>
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-1 rounded-full">
                            미설정 (유년기 수련생)
                        </span>
                    </div>

                    {/* 능력치 그리드 */}
                    <div className="bg-slate-950/50 border border-slate-800 p-3.5 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1 border-b border-slate-800/80 pb-1.5">
                            <span>기초 훈련 능력치</span>
                            <span className="text-[10px] text-slate-500">지속적인 교관 지도로 성장 가능</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center justify-between bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                <span className="flex items-center text-slate-400 text-xs font-medium"><Dumbbell size={13} className="mr-1.5 text-red-400"/>근력</span>
                                <span className="font-bold text-slate-200 text-xs">{str}</span>
                            </div>
                            <div className="flex items-center justify-between bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                <span className="flex items-center text-slate-400 text-xs font-medium"><ShieldAlert size={13} className="mr-1.5 text-blue-400"/>방어</span>
                                <span className="font-bold text-slate-200 text-xs">{def}</span>
                            </div>
                            <div className="flex items-center justify-between bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                <span className="flex items-center text-slate-400 text-xs font-medium"><Wind size={13} className="mr-1.5 text-emerald-400"/>민첩</span>
                                <span className="font-bold text-slate-200 text-xs">{agi}</span>
                            </div>
                            <div className="flex items-center justify-between bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                <span className="flex items-center text-slate-400 text-xs font-medium"><Brain size={13} className="mr-1.5 text-purple-400"/>지능</span>
                                <span className="font-bold text-slate-200 text-xs">{int}</span>
                            </div>
                            <div className="flex items-center justify-between bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800 col-span-2">
                                <span className="flex items-center text-slate-400 text-xs font-medium"><Compass size={13} className="mr-1.5 text-amber-400"/>지혜 & 직관</span>
                                <span className="font-bold text-slate-200 text-xs">{wis}</span>
                            </div>
                        </div>
                    </div>

                    {/* 학생의 성향 및 현재 고민 */}
                    <div className="bg-amber-950/20 border border-amber-800/40 p-3.5 rounded-xl space-y-2">
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                            <Sparkles size={14} />
                            <span>성향 및 훈련 고민</span>
                        </div>
                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-amber-900/30">
                            <span className="text-[11px] font-bold text-amber-300 block mb-1">
                                [{analysis.disposition}]
                            </span>
                            <p className="text-xs text-slate-200 font-medium leading-relaxed">
                                "{analysis.worryTitle}"
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                                {analysis.worryDetail}
                            </p>
                        </div>
                    </div>

                    {/* 교관 지도 가이드 / 추천 조언 */}
                    <div className="bg-blue-950/20 border border-blue-800/40 p-3.5 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs">
                            <Compass size={14} />
                            <span>추천 지도 방향: <span className="text-blue-300">{analysis.recommendedCategoryName}</span></span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-2.5 rounded-lg border border-blue-900/30">
                            💡 {analysis.adviceTip}
                        </p>
                    </div>
                </div>

                {/* 하단 액션 버튼 바 */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-col gap-2 shrink-0">
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            id="student-action-advice-btn"
                            disabled={!cd.canMentor}
                            onClick={() => {
                                onClose();
                                onOpenAdvice(student);
                            }}
                            className={`py-2.5 px-2 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1 ${
                                cd.canMentor
                                    ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                                    : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                            }`}
                        >
                            <Compass size={15} /> {cd.canMentor ? '조언하기' : `조언 (D-${cd.daysRemaining})`}
                        </button>
                        <button
                            id="student-action-praise-btn"
                            disabled={!cd.canMentor}
                            onClick={() => {
                                onClose();
                                onOpenPraise(student);
                            }}
                            className={`py-2.5 px-2 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1 ${
                                cd.canMentor
                                    ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
                                    : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                            }`}
                        >
                            <Award size={15} /> {cd.canMentor ? '칭찬하기' : `칭찬 (D-${cd.daysRemaining})`}
                        </button>
                        <button
                            id="student-action-scold-btn"
                            onClick={() => {
                                onClose();
                                onOpenScold(student);
                            }}
                            className="py-2.5 px-2 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                            <ShieldAlert size={15} /> 훈계하기
                        </button>
                    </div>
                    {!cd.canMentor && (
                        <p className="text-center text-[10px] text-amber-400/90 font-medium">
                            ※ 최근 지도 완료: 조언과 칭찬은 7일에 1회만 가능합니다. ({cd.daysRemaining}일 후 가능)
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
